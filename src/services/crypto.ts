import Gun from 'gun';
import 'gun/sea';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const SEA = (Gun as any).SEA;

const RELAY_BASE =
  Constants.expoConfig?.extra?.relayBaseUrl || 'https://fogoeluar.com.br';

const STATIC_SALT = 'hive-room-salt-v1';
const SALT_CACHE_PREFIX = '@hive_room_salt_';

// In-memory cache for room salts (avoids repeated async lookups)
const saltCache = new Map<string, string>();

/**
 * Fetch a per-room random salt from the relay server.
 * The relay persists the salt so every client receives the same value.
 * Falls back to the legacy static salt when the endpoint is unavailable.
 */
async function fetchRoomSalt(roomId: string): Promise<string> {
  // Check in-memory cache first
  const cached = saltCache.get(roomId);
  if (cached) return cached;

  // Check AsyncStorage cache
  try {
    const stored = await AsyncStorage.getItem(`${SALT_CACHE_PREFIX}${roomId}`);
    if (stored) {
      saltCache.set(roomId, stored);
      return stored;
    }
  } catch (e) {
    console.warn('[Hive:crypto] AsyncStorage read failed:', e);
  }

  // Fetch from relay
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${RELAY_BASE}/room-key/${encodeURIComponent(roomId)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.salt && typeof data.salt === 'string') {
        saltCache.set(roomId, data.salt);
        AsyncStorage.setItem(`${SALT_CACHE_PREFIX}${roomId}`, data.salt).catch(() => {});
        return data.salt;
      }
    }
  } catch (e) {
    console.warn('[Hive:crypto] Room salt fetch failed, using static salt:', e);
  }

  // Fallback to static salt (backward compatible)
  return STATIC_SALT;
}

async function deriveRoomKey(roomId: string): Promise<string> {
  try {
    const salt = await fetchRoomSalt(roomId);
    const raw = await SEA.work(roomId, salt);
    if (typeof raw === 'string' && raw.length > 0) return raw;
  } catch (e) {
    console.warn('[Hive:crypto] Key derivation failed:', e);
  }
  return `hive-room-key-v2-${roomId}`;
}

export async function encryptMessage(plaintext: string, roomId: string): Promise<string> {
  try {
    const key = await deriveRoomKey(roomId);
    const encrypted = await SEA.encrypt(plaintext, key);
    if (typeof encrypted === 'string' && encrypted.length > 0) return encrypted;
  } catch (e) {
    console.warn('[Hive:crypto] Encryption failed:', e);
  }
  return plaintext;
}

export async function decryptMessage(
  ciphertext: string,
  roomId: string
): Promise<string | null> {
  try {
    const key = await deriveRoomKey(roomId);
    const result = await SEA.decrypt(ciphertext, key);
    if (result === undefined || result === null) {
      // Try legacy static salt as fallback for old messages
      const legacyKey = await SEA.work(roomId, STATIC_SALT);
      if (legacyKey) {
        const legacyResult = await SEA.decrypt(ciphertext, legacyKey);
        if (legacyResult !== undefined && legacyResult !== null) {
          return typeof legacyResult === 'string' ? legacyResult : JSON.stringify(legacyResult);
        }
      }
      return null;
    }
    return typeof result === 'string' ? result : JSON.stringify(result);
  } catch (e) {
    console.warn('[Hive:crypto] Decryption failed:', e);
    return null;
  }
}

/** Clear cached salts (useful after reconnection) */
export function clearSaltCache(): void {
  saltCache.clear();
}