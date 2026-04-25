import * as FileSystem from 'expo-file-system/legacy';
import { sendMessage } from './gun';

const MAX_SIZE_BYTES = 200 * 1024;
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

function getExtension(uri: string): string {
  return uri.split('.').pop()?.toLowerCase().split('?')[0] ?? '';
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
  image: string;
}> {
  if (type === 'video') {
    throw new Error('Video sharing is not supported in P2P mode.');
  }

  const ext = getExtension(uri);
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`Unsupported image format: .${ext || 'unknown'}`);
  }

  const fileInfo = await FileSystem.getInfoAsync(uri);

  if (!fileInfo.exists) {
    throw new Error('File not found.');
  }

  if (typeof fileInfo.size !== 'number') {
    throw new Error('Could not determine file size. Please try a different image.');
  }

  if (fileInfo.size > MAX_SIZE_BYTES) {
    const sizeKB = Math.round(fileInfo.size / 1024);
    const limitKB = Math.round(MAX_SIZE_BYTES / 1024);
    throw new Error(`Image too large (${sizeKB}KB). Maximum allowed is ${limitKB}KB.`);
  }

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
  };

  const mime = mimeMap[ext] ?? 'image/jpeg';
  const dataUri = `data:${mime};base64,${base64}`;

  const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const messageData = {
    _id: messageId,
    text: '',
    createdAt: Date.now(),
    user,
    image: dataUri,
  };

  const success = await sendMessage(roomId, messageData);
  if (!success) {
    throw new Error('Failed to send through the P2P network. Check your connection.');
  }

  return messageData;
}

export function isBase64Media(uri?: string): boolean {
  return typeof uri === 'string' && uri.startsWith('data:');
}
