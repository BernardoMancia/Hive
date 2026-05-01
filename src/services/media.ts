import * as FileSystem from 'expo-file-system/legacy';
import { sendMessage } from './gun';

const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi'];
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'avi'];
const MAX_RETRIES = 3;

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
  throw lastError ?? new Error('Falha ao ler arquivo após 3 tentativas.');
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
  if (!ALLOWED_EXTENSIONS.includes(ext)) throw new Error(`Formato não suportado: .${ext}`);

  const isVideo = type === 'video' || VIDEO_EXTENSIONS.includes(ext);

  let workUri = uri;
  let tmpCreated: string | null = null;

  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);

    if (!fileInfo.exists || typeof (fileInfo as any).size !== 'number') {
      workUri = await copyToCache(uri, ext);
      tmpCreated = workUri;
    } else if ((fileInfo as any).size > MAX_SIZE_BYTES) {
      const sizeMB = ((fileInfo as any).size / 1024 / 1024).toFixed(1);
      const limitMB = (MAX_SIZE_BYTES / 1024 / 1024).toFixed(0);
      throw new Error(`Arquivo muito grande (${sizeMB}MB). Máximo: ${limitMB}MB.`);
    }

    if (!tmpCreated) {
      tmpCreated = await copyToCache(workUri, ext);
      workUri = tmpCreated;
    }

    const copiedInfo = await FileSystem.getInfoAsync(workUri);
    if (!copiedInfo.exists) throw new Error('Falha ao copiar arquivo para cache.');
    if (typeof (copiedInfo as any).size === 'number' && (copiedInfo as any).size > MAX_SIZE_BYTES) {
      const sizeMB = ((copiedInfo as any).size / 1024 / 1024).toFixed(1);
      throw new Error(`Arquivo muito grande após processamento (${sizeMB}MB).`);
    }

    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg',
      png: 'image/png', gif: 'image/gif', webp: 'image/webp',
      mp4: 'video/mp4', mov: 'video/quicktime', avi: 'video/x-msvideo',
    };
    const mime = mimeMap[ext] ?? (isVideo ? 'video/mp4' : 'image/jpeg');

    const base64 = await readWithRetry(workUri);
    const dataUri = `data:${mime};base64,${base64}`;

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const messageData: any = { _id: messageId, text: '', createdAt: Date.now(), user };

    if (isVideo) {
      messageData.video = dataUri;
    } else {
      messageData.image = dataUri;
    }

    let success = false;
    for (let i = 0; i < MAX_RETRIES; i++) {
      success = await sendMessage(roomId, messageData);
      if (success) break;
      await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }
    if (!success) throw new Error('Falha ao enviar pela rede P2P. Verifique sua conexão.');

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
