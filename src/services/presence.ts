import { getGun, NAMESPACE } from './gun';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';

const HEARTBEAT_INTERVAL_MS = 15000;
const STALE_THRESHOLD_MS = 50000;

const STORAGE_USER_ID = '@hive_user_id';
const STORAGE_USER_NAME = '@hive_user_name';
const STORAGE_AGE_VERIFIED = '@hive_age_verified';

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let appStateListener: any = null;
let localUserId: string | null = null;
let localUserName: string | null = null;
let currentRoomId: string = 'lobby';
let isPresenceActive = false;

function sendHeartbeat(): void {
  if (!localUserId || !localUserName || !isPresenceActive) return;

  try {
    getGun()
      .get(NAMESPACE)
      .get('presence')
      .get(localUserId)
      .put({
        id: localUserId,
        name: localUserName,
        lastSeen: Date.now(),
        roomId: currentRoomId,
      });
  } catch (e) {
    console.warn('[Hive:presence] Heartbeat failed:', e);
  }
}

function markOffline(): void {
  if (!localUserId) return;

  try {
    const gun = getGun();
    gun
      .get(NAMESPACE)
      .get('presence')
      .get(localUserId)
      .put({
        id: localUserId,
        name: localUserName || 'Anonymous',
        lastSeen: 0,
        roomId: null,
      });
  } catch (e) {
    console.warn('[Hive:presence] Mark offline failed:', e);
  }
}

function startHeartbeatTimer(): void {
  stopHeartbeatTimer();
  sendHeartbeat();
  heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
}

function stopHeartbeatTimer(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function handleAppState(nextState: AppStateStatus): void {
  if (!isPresenceActive) return;

  if (nextState === 'active') {
    startHeartbeatTimer();
  } else if (nextState === 'background' || nextState === 'inactive') {
    stopHeartbeatTimer();
    markOffline();
  }
}

export async function initPresence(userId: string, userName: string): Promise<void> {
  if (isPresenceActive && localUserId === userId) return;

  localUserId = userId;
  localUserName = userName;
  isPresenceActive = true;

  startHeartbeatTimer();

  if (!appStateListener) {
    appStateListener = AppState.addEventListener('change', handleAppState);
  }
}

export function stopPresence(): void {
  isPresenceActive = false;
  stopHeartbeatTimer();
  markOffline();

  if (appStateListener) {
    appStateListener.remove();
    appStateListener = null;
  }
}

export function setCurrentRoom(roomId: string | null): void {
  currentRoomId = roomId ?? 'lobby';
  if (isPresenceActive) {
    sendHeartbeat();
  }
}

export function subscribeToPresence(
  callback: (
    onlineCount: number,
    roomCounts: Record<string, number>,
    peers: Array<{ id: string; name: string; roomId: string | null }>
  ) => void
): () => void {
  const peersMap = new Map<string, { id: string; name: string; lastSeen: number; roomId: string | null }>();
  let active = true;

  try {
    const node = getGun().get(NAMESPACE).get('presence');

    node.map().on((data: any, key: string) => {
      if (!active) return;
      if (!data?.id) return;

      const isOnline =
        typeof data.lastSeen === 'number' &&
        data.lastSeen > 0 &&
        Date.now() - data.lastSeen < STALE_THRESHOLD_MS;

      if (isOnline) {
        peersMap.set(key, {
          id: data.id,
          name: data.name || 'Anonymous',
          lastSeen: data.lastSeen,
          roomId: data.roomId ?? null,
        });
      } else {
        peersMap.delete(key);
      }

      const peers = Array.from(peersMap.values());

      const roomCounts: Record<string, number> = {};
      peers.forEach((peer) => {
        if (peer.roomId) {
          roomCounts[peer.roomId] = (roomCounts[peer.roomId] || 0) + 1;
        }
      });

      callback(peers.length, roomCounts, peers);
    });

    return () => {
      active = false;
      peersMap.clear();
      try { node.map().off(); } catch (_) {}
    };
  } catch (e) {
    console.warn('[Hive:presence] subscribeToPresence error:', e);
    callback(0, {}, []);
    return () => {};
  }
}

export async function getUserId(): Promise<string> {
  try {
    let id = await AsyncStorage.getItem(STORAGE_USER_ID);
    if (!id) {
      id = `peer_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      await AsyncStorage.setItem(STORAGE_USER_ID, id);
    }
    return id;
  } catch (_) {
    const fallback = `peer_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    try { await AsyncStorage.setItem(STORAGE_USER_ID, fallback); } catch (__) {}
    return fallback;
  }
}

export async function getUserName(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_USER_NAME);
  } catch (_) {
    return null;
  }
}

export async function setUserName(name: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_USER_NAME, name);
  localUserName = name;
}

export async function isAgeVerified(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(STORAGE_AGE_VERIFIED)) === 'true';
  } catch (_) {
    return false;
  }
}

export async function setAgeVerified(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_AGE_VERIFIED, 'true');
}
