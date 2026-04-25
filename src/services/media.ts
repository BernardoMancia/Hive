import * as FileSystem from 'expo-file-system/legacy';
import { sendMessage } from './gun';

const MAX_SIZE_BYTES = 400 * 1024;
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const MAX_RETRIES = 3;

function getExtension(uri: string): string {
  return uri.split('.').pop()?.toLowerCase().split('?')[0] ?? '';
}

async function copyToCache(uri: string): Promise<string> {
  const tmpUri = `${FileSystem.cacheDirectory}hive_img_${Date.now()}.jpg`;
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
  throw lastError ?? new Error('Falha ao ler imagem após 3 tentativas.');
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
  if (type === 'video') throw new Error('Vídeo não suportado no modo P2P.');

  const ext = getExtension(uri) || 'jpg';
  if (!ALLOWED_EXTENSIONS.includes(ext)) throw new Error(`Formato não suportado: .${ext}`);

  let workUri = uri;
  let tmpCreated: string | null = null;

  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);

    if (!fileInfo.exists || typeof (fileInfo as any).size !== 'number') {
      workUri = await copyToCache(uri);
      tmpCreated = workUri;
    } else if ((fileInfo as any).size > MAX_SIZE_BYTES) {
      const sizeKB = Math.round((fileInfo as any).size / 1024);
      const limitKB = Math.round(MAX_SIZE_BYTES / 1024);
      throw new Error(`Imagem muito grande (${sizeKB}KB). Máximo: ${limitKB}KB.`);
    }

    if (!tmpCreated) {
      tmpCreated = await copyToCache(workUri);
      workUri = tmpCreated;
    }

    const copiedInfo = await FileSystem.getInfoAsync(workUri);
    if (!copiedInfo.exists) throw new Error('Falha ao copiar imagem para cache.');
    if (typeof (copiedInfo as any).size === 'number' && (copiedInfo as any).size > MAX_SIZE_BYTES) {
      const sizeKB = Math.round((copiedInfo as any).size / 1024);
      throw new Error(`Imagem muito grande após processamento (${sizeKB}KB).`);
    }

    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg',
      png: 'image/png', gif: 'image/gif', webp: 'image/webp',
    };
    const mime = mimeMap[ext] ?? 'image/jpeg';

    const base64 = await readWithRetry(workUri);
    const dataUri = `data:${mime};base64,${base64}`;

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const messageData = { _id: messageId, text: '', createdAt: Date.now(), user, image: dataUri };

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
