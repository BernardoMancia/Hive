import { getGun, onConnectionStatusChange, NAMESPACE } from './gun';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';

const HEARTBEAT_INTERVAL_MS = 15000;
const STALE_THRESHOLD_MS = 35000;

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let localUserId: string | null = null;
let localUserName: string | null = null;
let currentRoomId: string = 'lobby';
let appStateSubscription: any = null;
let presenceInitialized = false;

export async function initPresence(userId: string, userName: string): Promise<void> {
  localUserId = userId;
  localUserName = userName;
  presenceInitialized = true;

  startHeartbeat();

  if (!appStateSubscription) {
    appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
  }
}

function handleAppStateChange(nextState: AppStateStatus) {
  if (!presenceInitialized) return;

  if (nextState === 'active') {
    if (localUserId && localUserName) {
      startHeartbeat();
    }
  } else if (nextState === 'background' || nextState === 'inactive') {
    stopHeartbeat();
    markOfflineSafe();
  }
}

function sendHeartbeat() {
  if (!localUserId || !localUserName) return;

  try {
    const gun = getGun();
    gun
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
    console.warn('[Hive] Heartbeat failed:', e);
  }
}

function markOfflineSafe() {
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
    console.warn('[Hive] Mark offline failed:', e);
  }
}

function startHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
  }
  sendHeartbeat();
  heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

export function setCurrentRoom(roomId: string | null) {
  currentRoomId = roomId || 'lobby';
  if (localUserId) sendHeartbeat();
}

export function stopPresence() {
  presenceInitialized = false;
  stopHeartbeat();
  markOfflineSafe();

  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
}

export function subscribeToPresence(
  callback: (
    onlineCount: number,
    roomCounts: Record<string, number>,
    peers: any[]
  ) => void
): () => void {
  try {
    const gun = getGun();
    const presenceNode = gun.get(NAMESPACE).get('presence');
    const peersMap: Record<string, any> = {};

    presenceNode.map().on((data: any, key: string) => {
      if (!data || !data.id) return;

      const isOnline =
        data.lastSeen && Date.now() - data.lastSeen < STALE_THRESHOLD_MS;

      if (isOnline) {
        peersMap[key] = data;
      } else {
        delete peersMap[key];
      }

      const onlinePeers = Object.values(peersMap);
      const roomCounts: Record<string, number> = {};
      onlinePeers.forEach((peer: any) => {
        if (peer.roomId) {
          roomCounts[peer.roomId] = (roomCounts[peer.roomId] || 0) + 1;
        }
      });

      callback(onlinePeers.length, roomCounts, onlinePeers);
    });

    return () => {
      try { presenceNode.map().off(); } catch (_) {}
    };
  } catch (e) {
    console.warn('[Hive] Presence subscription failed:', e);
    callback(0, {}, []);
    return () => {};
  }
}

export function unsubscribeFromPresence() {
  try {
    getGun().get(NAMESPACE).get('presence').map().off();
  } catch (e) {
    console.warn('[Hive] Unsubscribe presence failed:', e);
  }
}

export async function getUserId(): Promise<string> {
  try {
    let userId = await AsyncStorage.getItem('@hive_user_id');
    if (!userId) {
      userId =
        'peer_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      await AsyncStorage.setItem('@hive_user_id', userId);
    }
    return userId;
  } catch (e) {
    const fallback =
      'peer_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    try {
      await AsyncStorage.setItem('@hive_user_id', fallback);
    } catch (_) {}
    return fallback;
  }
}

export async function getUserName(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem('@hive_user_name');
  } catch (e) {
    return null;
  }
}

export async function setUserName(name: string): Promise<void> {
  await AsyncStorage.setItem('@hive_user_name', name);
  localUserName = name;
}

export async function isAgeVerified(): Promise<boolean> {
  try {
    const verified = await AsyncStorage.getItem('@hive_age_verified');
    return verified === 'true';
  } catch (e) {
    return false;
  }
}

export async function setAgeVerified(): Promise<void> {
  await AsyncStorage.setItem('@hive_age_verified', 'true');
}
