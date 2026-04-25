import Gun from 'gun';
import 'gun/sea';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { KeyPair } from '../types';

const SEA = (Gun as any).SEA;

const STORAGE_KEY_PAIR = '@hive_sea_keypair';

let cachedPair: KeyPair | null = null;

export async function getOrCreateKeyPair(): Promise<KeyPair> {
  if (cachedPair) return cachedPair;

  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY_PAIR);
    if (stored) {
      cachedPair = JSON.parse(stored) as KeyPair;
      return cachedPair;
    }
  } catch (_) {}

  const pair: KeyPair = await SEA.pair();
  cachedPair = pair;

  try {
    await AsyncStorage.setItem(STORAGE_KEY_PAIR, JSON.stringify(pair));
  } catch (_) {}

  return pair;
}

async function deriveRoomKey(roomId: string): Promise<string> {
  const raw = await SEA.work(roomId, 'hive-room-salt-v1', null, { name: 'PBKDF2', hash: 'SHA-256' });
  return typeof raw === 'string' ? raw : JSON.stringify(raw);
}

export async function encryptMessage(plaintext: string, roomId: string): Promise<string> {
  const key = await deriveRoomKey(roomId);
  const encrypted = await SEA.encrypt(plaintext, key);
  return typeof encrypted === 'string' ? encrypted : JSON.stringify(encrypted);
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

export async function signMessage(data: string, pair: KeyPair): Promise<string> {
  return SEA.sign(data, pair);
}

export async function verifyMessage(signed: string, pub: string): Promise<string | null> {
  try {
    const result = await SEA.verify(signed, pub);
    return result ?? null;
  } catch {
    return null;
  }
}

export type { KeyPair };
