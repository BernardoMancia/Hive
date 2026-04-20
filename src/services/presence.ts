import { getGun } from './gun';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HEARTBEAT_INTERVAL = 15000;
const STALE_THRESHOLD = 45000;

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let localUserId: string | null = null;
let localUserName: string | null = null;
let currentRoomId: string = 'lobby';

export async function initPresence(userId: string, userName: string) {
  localUserId = userId;
  localUserName = userName;

  startHeartbeat();
}

export function setCurrentRoom(roomId: string | null) {
  currentRoomId = roomId || 'lobby';

  if (localUserId) {
    sendHeartbeat();
  }
}

function sendHeartbeat() {
  if (!localUserId || !localUserName) return;

  try {
    const gun = getGun();
    const presence = gun.get('hive').get('presence');

    presence.get(localUserId).put({
      id: localUserId,
      name: localUserName,
      lastSeen: Date.now(),
      roomId: currentRoomId,
    });
  } catch (e) {
    console.warn('[Hive] Heartbeat failed:', e);
  }
}

function startHeartbeat() {
  sendHeartbeat();

  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
  }

  heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
}

export function stopPresence() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  if (localUserId) {
    try {
      const gun = getGun();
      const presence = gun.get('hive').get('presence');
      presence.get(localUserId).put({
        id: localUserId,
        name: localUserName,
        lastSeen: 0,
        roomId: null,
      });
    } catch (e) {
      console.warn('[Hive] Stop presence failed:', e);
    }
  }
}

export function subscribeToPresence(
  callback: (onlineCount: number, roomCounts: Record<string, number>, peers: any[]) => void
) {
  try {
    const gun = getGun();
    const presence = gun.get('hive').get('presence');
    const peers: Record<string, any> = {};

    presence.map().on((data: any, key: string) => {
      if (!data || !data.id) return;

      const now = Date.now();
      const isOnline = data.lastSeen && (now - data.lastSeen) < STALE_THRESHOLD;

      if (isOnline) {
        peers[key] = data;
      } else {
        delete peers[key];
      }

      const onlinePeers = Object.values(peers);
      const onlineCount = onlinePeers.length;

      const roomCounts: Record<string, number> = {};
      onlinePeers.forEach((peer: any) => {
        if (peer.roomId) {
          roomCounts[peer.roomId] = (roomCounts[peer.roomId] || 0) + 1;
        }
      });

      callback(onlineCount, roomCounts, onlinePeers);
    });
  } catch (e) {
    console.warn('[Hive] Presence subscription failed:', e);
    callback(0, {}, []);
  }
}

export function unsubscribeFromPresence() {
  try {
    const gun = getGun();
    const presence = gun.get('hive').get('presence');
    presence.map().off();
  } catch (e) {
    console.warn('[Hive] Unsubscribe presence failed:', e);
  }
}

export async function getUserId(): Promise<string> {
  try {
    let userId = await AsyncStorage.getItem('@hive_user_id');
    if (!userId) {
      userId = 'peer_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      await AsyncStorage.setItem('@hive_user_id', userId);
    }
    return userId;
  } catch (e) {
    return 'peer_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
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
