import Gun from 'gun';
import 'gun/sea';

const SEA = (Gun as any).SEA;

async function deriveRoomKey(roomId: string): Promise<string> {
  try {
    const raw = await SEA.work(roomId, 'hive-room-salt-v1');
    if (typeof raw === 'string' && raw.length > 0) return raw;
  } catch (_) {}
  return `hive-room-key-v2-${roomId}`;
}

export async function encryptMessage(plaintext: string, roomId: string): Promise<string> {
  try {
    const key = await deriveRoomKey(roomId);
    const encrypted = await SEA.encrypt(plaintext, key);
    if (typeof encrypted === 'string' && encrypted.length > 0) return encrypted;
  } catch (_) {}
  return plaintext;
}

export async function decryptMessage(
  ciphertext: string,
  roomId: string
): Promise<string | null> {
  try {
    const key = await deriveRoomKey(roomId);
    const result = await SEA.decrypt(ciphertext, key);
    if (result === undefined || result === null) return null;
    return typeof result === 'string' ? result : JSON.stringify(result);
  } catch {
    return null;
  }
}