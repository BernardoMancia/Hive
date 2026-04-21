import * as FileSystem from 'expo-file-system/legacy';
import { sendMessage } from './gun';

const MAX_IMAGE_SIZE_BYTES = 200 * 1024;

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

  const fileInfo = await FileSystem.getInfoAsync(uri);

  if (!fileInfo.exists) {
    throw new Error('File not found.');
  }

  const fileSize: number = fileInfo.size ?? 0;
  if (fileSize > MAX_IMAGE_SIZE_BYTES) {
    const sizeKB = Math.round(fileSize / 1024);
    const limitKB = Math.round(MAX_IMAGE_SIZE_BYTES / 1024);
    throw new Error(
      `Image too large (${sizeKB}KB). Limit is ${limitKB}KB.\n` +
        'Please pick a smaller image or reduce quality.'
    );
  }

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const dataUri = `data:image/jpeg;base64,${base64}`;
  const messageId = `msg_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 9)}`;

  const messageData = {
    _id: messageId,
    text: '',
    createdAt: Date.now(),
    user,
    image: dataUri,
  };

  const sent = sendMessage(roomId, messageData);
  if (!sent) {
    throw new Error(
      'Failed to send through P2P network. Check your connection.'
    );
  }

  return messageData;
}

export function isBase64Media(uri?: string): boolean {
  if (!uri) return false;
  return uri.startsWith('data:');
}
