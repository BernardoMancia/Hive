import Gun from 'gun';
import 'gun/sea';
import { encryptMessage, decryptMessage } from './crypto';
import Constants from 'expo-constants';
import { ConnectionState } from '../types';

export const NAMESPACE = 'hive_v2';
const TTL_MS = 60 * 60 * 1000;

const RELAY_PEERS = [
  Constants.expoConfig?.extra?.relayUrl || 'wss://fogoeluar.com.br/gun',
];

export type { ConnectionState } from '../types';
type StatusListener = (status: ConnectionState) => void;

let gunInstance: any = null;
let isInitializing = false;
let currentStatus: ConnectionState = 'disconnected';
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
const statusListeners = new Set<StatusListener>();

function notifyStatus(status: ConnectionState): void {
  if (status === currentStatus) return;
  currentStatus = status;
  statusListeners.forEach((fn) => { try { fn(status); } catch (e) { console.warn('[Hive:gun] Status listener error:', e); } });
}

function clearReconnectTimer(): void {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
}

function scheduleReconnect(): void {
  clearReconnectTimer();
  reconnectAttempts++;
  const delay = Math.min(1500 * Math.pow(1.5, reconnectAttempts - 1), 30000);
  reconnectTimer = setTimeout(() => {
    if (gunInstance) { notifyStatus('reconnecting'); createGunInstance(); }
  }, delay);
}

function createGunInstance(): void {
  if (isInitializing) return;
  isInitializing = true;
  if (gunInstance) {
    try { gunInstance.off(); } catch (e) { console.warn('[Hive:gun] Gun off() error:', e); }
    gunInstance = null;
  }
  try {
    const instance = (Gun as any)({
      peers: RELAY_PEERS,
      file: false,
      localStorage: false,
      radisk: false,
      axe: false,
    });
    instance.on('hi', () => {
      reconnectAttempts = 0;
      clearReconnectTimer();
      notifyStatus('connected');
    });
    instance.on('bye', () => {
      notifyStatus('disconnected');
      scheduleReconnect();
    });
    gunInstance = instance;
    notifyStatus('reconnecting');
  } catch (e) {
    console.warn('[Hive:gun] init failed:', e);
    notifyStatus('disconnected');
    scheduleReconnect();
  } finally {
    isInitializing = false;
  }
}

export function getGun(): any {
  if (!gunInstance) createGunInstance();
  return gunInstance!;
}


export function resetGun(): void {
  clearReconnectTimer();
  reconnectAttempts = 0;
  isInitializing = false;
  notifyStatus('reconnecting');
  createGunInstance();
}

export function onConnectionStatusChange(listener: StatusListener): () => void {
  statusListeners.add(listener);
  listener(currentStatus);
  return () => statusListeners.delete(listener);
}

export function getConnectionStatus(): ConnectionState { return currentStatus; }

createGunInstance();

export interface MessageData {
  _id: string;
  text: string;
  createdAt: number;
  user: { _id: string; name: string };
  image?: string;
  video?: string;
}

export async function sendMessage(roomId: string, data: MessageData): Promise<boolean> {
  try {
    const gun = getGun();
    if (!gun) return false;
    let encryptedText = '';
    let enc = '0';
    if (data.text) {
      try {
        const candidate = await encryptMessage(data.text, roomId);
        if (candidate !== data.text) {
          encryptedText = candidate;
          enc = '1';
        } else {
          encryptedText = data.text;
        }
      } catch (e) { console.warn('[Hive:gun] Encryption error:', e);
        encryptedText = data.text;
      }
    }
    const payload: Record<string, any> = {
      _id: data._id,
      text: encryptedText,
      enc,
      createdAt: data.createdAt,
      user: JSON.stringify(data.user),
    };
    if (data.image) payload.image = data.image;
    if (data.video) payload.video = data.video;
    gun.get(NAMESPACE).get('rooms').get(roomId).get(data._id).put(payload);
    return true;
  } catch (e) {
    console.warn('[Hive:gun] sendMessage error:', e);
    return false;
  }
}

export function subscribeToMessages(
  roomId: string,
  onMessage: (msg: MessageData) => void,
  onDelete?: (msgId: string) => void
): () => void {
  let active = true;
  try {
    const node = getGun().get(NAMESPACE).get('rooms').get(roomId);
    node.map().on(async (data: any, key: string) => {
      if (!active) return;

      if (data === null || data === undefined) {
        onDelete?.(key);
        return;
      }

      if (!data?._id || !data?.createdAt) return;

      const age = Date.now() - Number(data.createdAt);
      if (age > TTL_MS) return;

      let text = data.text || '';
      if (data.enc === '1' && text) {
        try {
          const dec = await decryptMessage(text, roomId);
          if (dec !== null && dec !== undefined) text = dec;
        } catch (e) { console.warn('[Hive:gun] Decryption error:', e); }
      }

      let user: { _id: string; name: string } = { _id: 'unknown', name: 'Unknown' };
      try { user = typeof data.user === 'string' ? JSON.parse(data.user) : data.user; } catch (e) { console.warn('[Hive:gun] User parse error:', e); }

      let image = data.image;
      let video = data.video;

      // Decrypt encrypted inline media
      if (image && typeof image === 'string' && image.startsWith('enc:')) {
        try {
          const dec = await decryptMessage(image.slice(4), roomId);
          if (dec) image = dec;
        } catch (e) { console.warn('[Hive:gun] Image decrypt error:', e); }
      }
      if (video && typeof video === 'string' && video.startsWith('enc:')) {
        try {
          const dec = await decryptMessage(video.slice(4), roomId);
          if (dec) video = dec;
        } catch (e) { console.warn('[Hive:gun] Video decrypt error:', e); }
      }

      onMessage({ _id: data._id, text, createdAt: data.createdAt, user, image, video });
    });

    return () => {
      active = false;
      try { node.map().off(); } catch (e) { console.warn('[Hive:gun] Unsub error:', e); }
    };
  } catch (e) {
    console.warn('[Hive:gun] subscribeToMessages error:', e);
    return () => { active = false; };
  }
}

export interface AdminRoom {
  id: string;
  name: string;
  icon: string;
  desc: string;
  archived: boolean;
  createdAt: number;
  order?: number;
}

export function subscribeToAdminRooms(
  onUpdate: (rooms: AdminRoom[]) => void
): () => void {
  let active = true;
  const cache: Record<string, AdminRoom> = {};

  const flush = () => {
    if (!active) return;
    onUpdate(Object.values(cache).filter(r => !r.archived && !(r as any).deleted).sort((a, b) => (a.order ?? 999) - (b.order ?? 999)));
  };

  try {
    const node = getGun().get(NAMESPACE).get('admin').get('rooms');
    node.map().on((data: any, key: string) => {
      if (!active) return;
      if (data === null || data === undefined || data.deleted === true) {
        delete cache[key];
      } else if (data && data.id) {
        cache[key] = data as AdminRoom;
      }
      flush();
    });

    return () => {
      active = false;
      try { node.map().off(); } catch (e) { console.warn('[Hive:gun] Unsub rooms error:', e); }
    };
  } catch (e) {
    console.warn('[Hive:gun] subscribeToAdminRooms error:', e);
    return () => { active = false; };
  }
}

export interface ServerCtrl {
  maintenance: boolean;
  pauseMessaging: boolean;
}

export function subscribeToServerCtrl(
  onUpdate: (ctrl: ServerCtrl) => void
): () => void {
  let active = true;
  try {
    const node = getGun().get(NAMESPACE).get('admin').get('ctrl');
    node.on((data: any) => {
      if (!active || !data) return;
      onUpdate({
        maintenance: !!data.maintenance,
        pauseMessaging: !!data.pauseMessaging,
      });
    });
    return () => {
      active = false;
      try { node.off(); } catch (e) { console.warn('[Hive:gun] Unsub ctrl error:', e); }
    };
  } catch (e) {
    console.warn('[Hive:gun] subscribeToServerCtrl error:', e);
    return () => { active = false; };
  }
}
