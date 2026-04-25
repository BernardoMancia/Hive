import Gun from 'gun';
import 'gun/sea';
import { encryptMessage, decryptMessage } from './crypto';

export const NAMESPACE = 'hive_v2';
const TTL_MS = 60 * 60 * 1000;

const RELAY_PEERS = [
  'ws://82.112.245.99:8765/gun',
];

export type ConnectionState = 'connected' | 'disconnected' | 'reconnecting';
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
  statusListeners.forEach((fn) => { try { fn(status); } catch (_) {} });
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
    try { gunInstance.off(); } catch (_) {}
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

// Heartbeat: mantém conexão viva mesmo sem mensagens
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
function startHeartbeat(): void {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(() => {
    try { if (gunInstance && currentStatus === 'connected') gunInstance.get('_hb').put(Date.now()); }
    catch (_) {}
  }, 25000);
}

export function resetGun(): void {
  clearReconnectTimer();
  reconnectAttempts = 0;
  isInitializing = false;
  notifyStatus('reconnecting');
  createGunInstance();
  startHeartbeat();
}

export function onConnectionStatusChange(listener: StatusListener): () => void {
  statusListeners.add(listener);
  listener(currentStatus);
  return () => statusListeners.delete(listener);
}

export function getConnectionStatus(): ConnectionState { return currentStatus; }

createGunInstance();
startHeartbeat();

export interface MessageData {
  _id: string;
  text: string;
  createdAt: number;
  user: { _id: string; name: string };
  image?: string;
}

export async function sendMessage(roomId: string, data: MessageData): Promise<boolean> {
  try {
    const gun = getGun();
    if (!gun) return false;
    let encryptedText = '';
    if (data.text) encryptedText = await encryptMessage(data.text, roomId);
    const payload: Record<string, any> = {
      _id: data._id,
      text: encryptedText,
      enc: '1',
      createdAt: data.createdAt,
      user: JSON.stringify(data.user),
    };
    if (data.image) payload.image = data.image;
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
          // se decrypt falhar, mantém texto raw (pode ser versão antiga ou erro de chave)
        } catch (_) {}
      }

      let user: { _id: string; name: string } = { _id: 'unknown', name: 'Unknown' };
      try { user = typeof data.user === 'string' ? JSON.parse(data.user) : data.user; } catch (_) {}

      onMessage({ _id: data._id, text, createdAt: data.createdAt, user, image: data.image });
    });

    return () => {
      active = false;
      try { node.map().off(); } catch (_) {}
    };
  } catch (e) {
    console.warn('[Hive:gun] subscribeToMessages error:', e);
    return () => { active = false; };
  }
}
