import * as FileSystem from 'expo-file-system/legacy';
import Constants from 'expo-constants';
import { sendMessage } from './gun';

const INLINE_THRESHOLD = 1 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi'];
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'avi'];
const MAX_RETRIES = 3;
const UPLOAD_URL = Constants.expoConfig?.extra?.mediaUploadUrl || 'https://fogoeluar.com.br/upload';

function getExtension(uri: string): string {
  return uri.split('.').pop()?.toLowerCase().split('?')[0] ?? '';
}

async function copyToCache(uri: string, ext: string): Promise<string> {
  const suffix = VIDEO_EXTENSIONS.includes(ext) ? ext : 'jpg';
  const tmpUri = `${FileSystem.cacheDirectory}hive_media_${Date.now()}.${suffix}`;
  await FileSystem.copyAsync({ from: uri, to: tmpUri });
  return tmpUri;
}

async function readWithRetry(uri: string): Promise<string> {
  let lastError: any;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      if (base64 && base64.length > 0) return base64;
    } catch (e) {
      lastError = e;
      await new Promise(r => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  throw lastError ?? new Error('Failed to read file after 3 retries.');
}

async function uploadToVPS(fileUri: string, mimeType: string): Promise<string> {
  let lastError: any;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await FileSystem.uploadAsync(UPLOAD_URL, fileUri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'file',
        mimeType,
        headers: { Accept: 'application/json' },
      });
      if (response.status === 200) {
        const data = JSON.parse(response.body);
        if (data.ok && data.url) return data.url;
        throw new Error(data.error || 'Upload failed');
      }
      throw new Error(`Upload HTTP ${response.status}`);
    } catch (e) {
      lastError = e;
      await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
    }
  }
  throw lastError ?? new Error('Failed to upload media to server.');
}

export async function sendMediaMessage(
  roomId: string,
  uri: string,
  type: 'image' | 'video',
  user: { _id: string; name: string }
): Promise<{
  _id: string;
  text: string;
  createdAt: number;
  user: { _id: string; name: string };
  image?: string;
  video?: string;
}> {
  const ext = getExtension(uri) || (type === 'video' ? 'mp4' : 'jpg');
  if (!ALLOWED_EXTENSIONS.includes(ext)) throw new Error(`Unsupported format: .${ext}`);

  const isVideo = type === 'video' || VIDEO_EXTENSIONS.includes(ext);

  let workUri = uri;
  let tmpCreated: string | null = null;

  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);

    if (!fileInfo.exists || typeof (fileInfo as any).size !== 'number') {
      workUri = await copyToCache(uri, ext);
      tmpCreated = workUri;
    }

    if (!tmpCreated) {
      tmpCreated = await copyToCache(workUri, ext);
      workUri = tmpCreated;
    }

    const copiedInfo = await FileSystem.getInfoAsync(workUri);
    if (!copiedInfo.exists) throw new Error('Failed to copy file to cache.');
    const fileSize = typeof (copiedInfo as any).size === 'number' ? (copiedInfo as any).size : 0;

    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg',
      png: 'image/png', gif: 'image/gif', webp: 'image/webp',
      mp4: 'video/mp4', mov: 'video/quicktime', avi: 'video/x-msvideo',
    };
    const mime = mimeMap[ext] ?? (isVideo ? 'video/mp4' : 'image/jpeg');

    let mediaUri: string;

    if (fileSize > INLINE_THRESHOLD) {
      mediaUri = await uploadToVPS(workUri, mime);
    } else {
      const base64 = await readWithRetry(workUri);
      mediaUri = `data:${mime};base64,${base64}`;
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const messageData: any = { _id: messageId, text: '', createdAt: Date.now(), user };

    if (isVideo) {
      messageData.video = mediaUri;
    } else {
      messageData.image = mediaUri;
    }

    let success = false;
    for (let i = 0; i < MAX_RETRIES; i++) {
      success = await sendMessage(roomId, messageData);
      if (success) break;
      await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }
    if (!success) throw new Error('Failed to send over P2P network. Check your connection.');

    return messageData;
  } finally {
    if (tmpCreated) {
      FileSystem.deleteAsync(tmpCreated, { idempotent: true }).catch(() => {});
    }
  }
}

export function isBase64Media(uri?: string): boolean {
  return typeof uri === 'string' && uri.startsWith('data:');
}

export function isVPSMedia(uri?: string): boolean {
  return typeof uri === 'string' && uri.startsWith('https://');
}
