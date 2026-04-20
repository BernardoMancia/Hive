import * as FileSystem from 'expo-file-system';
import { sendMessage } from './gun';

const MAX_IMAGE_SIZE = 500 * 1024;
const MAX_VIDEO_SIZE = 5 * 1024 * 1024;

export async function sendMediaMessage(
  roomId: string,
  uri: string,
  type: 'image' | 'video',
  user: { _id: string; name: string }
) {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);

    if (!fileInfo.exists) {
      throw new Error('File not found');
    }

    const maxSize = type === 'image' ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;

    if (fileInfo.size && fileInfo.size > maxSize) {
      const sizeMB = (maxSize / (1024 * 1024)).toFixed(1);
      throw new Error(`File too large. Maximum: ${sizeMB}MB`);
    }

    let base64: string;
    try {
      base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType?.Base64 ?? ('base64' as any),
      });
    } catch (readErr) {
      base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64' as any,
      });
    }

    const mimeType = type === 'image' ? 'image/jpeg' : 'video/mp4';
    const dataUri = `data:${mimeType};base64,${base64}`;

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const messageData: any = {
      _id: messageId,
      text: '',
      createdAt: Date.now(),
      user,
    };

    if (type === 'image') {
      messageData.image = dataUri;
    } else {
      messageData.video = dataUri;
    }

    sendMessage(roomId, messageData);

    return messageData;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to send media');
  }
}

export function isBase64Media(uri?: string): boolean {
  if (!uri) return false;
  return uri.startsWith('data:');
}

export function getMediaType(uri?: string): 'image' | 'video' | null {
  if (!uri) return null;
  if (uri.startsWith('data:image/')) return 'image';
  if (uri.startsWith('data:video/')) return 'video';
  return null;
}
