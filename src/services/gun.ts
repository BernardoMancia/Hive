const Gun = require('gun');

const COMMUNITY_RELAYS = [
  'https://peer.wallie.io/gun',
  'https://relay.peer.ooo/gun',
];

export const NAMESPACE = 'hive_v2';
const MAX_MESSAGES_PER_ROOM = 200;
const RECONNECT_BASE_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 8;

type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

let gunInstance: any = null;
let connectionStatus: ConnectionStatus = 'disconnected';
let statusListeners: Array<(s: ConnectionStatus) => void> = [];
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;

function notifyStatus(status: ConnectionStatus) {
  if (connectionStatus === status) return;
  connectionStatus = status;
  statusListeners.forEach((cb) => cb(status));
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    notifyStatus('disconnected');
    return;
  }
  const delay = Math.min(
    RECONNECT_BASE_DELAY_MS * Math.pow(1.5, reconnectAttempts),
    30000
  );
  reconnectAttempts++;
  notifyStatus('reconnecting');
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    gunInstance = null;
    getGun();
  }, delay);
}

export function onConnectionStatusChange(
  cb: (status: ConnectionStatus) => void
): () => void {
  statusListeners.push(cb);
  cb(connectionStatus);
  return () => {
    statusListeners = statusListeners.filter((l) => l !== cb);
  };
}

export function getConnectionStatus(): ConnectionStatus {
  return connectionStatus;
}

export function getGun(): any {
  if (gunInstance) return gunInstance;

  try {
    gunInstance = Gun({
      peers: COMMUNITY_RELAYS,
      localStorage: false,
      file: false,
      radisk: false,
      retry: Infinity,
    });

    gunInstance.on('hi', () => {
      reconnectAttempts = 0;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      notifyStatus('connected');
    });

    gunInstance.on('bye', () => {
      if (connectionStatus === 'connected') {
        scheduleReconnect();
      }
    });
  } catch (e) {
    console.warn('[Hive] Gun init failed:', e);
    try {
      gunInstance = Gun({ peers: COMMUNITY_RELAYS });
    } catch (e2) {
      console.warn('[Hive] Gun fallback failed:', e2);
      gunInstance = Gun({});
      notifyStatus('disconnected');
      return gunInstance;
    }
  }

  return gunInstance;
}

export function resetGun(): any {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  reconnectAttempts = 0;

  if (gunInstance) {
    try {
      const peers = gunInstance._.opt?.peers || {};
      Object.values(peers).forEach((peer: any) => {
        peer?.wire?.close?.();
      });
    } catch (_) {}
    gunInstance = null;
  }

  notifyStatus('reconnecting');
  return getGun();
}

export function sendMessage(
  roomId: string,
  message: {
    _id: string;
    text: string;
    createdAt: number;
    user: { _id: string; name: string };
    image?: string;
  }
): boolean {
  try {
    const data: Record<string, any> = {
      _id: message._id,
      text: message.text || '',
      createdAt: message.createdAt,
      userId: message.user._id,
      userName: message.user.name,
    };
    if (message.image) data.image = message.image;

    getGun()
      .get(NAMESPACE)
      .get('rooms')
      .get(roomId)
      .get('messages')
      .get(message._id)
      .put(data);

    return true;
  } catch (e) {
    console.warn('[Hive] sendMessage failed:', e);
    return false;
  }
}

export function subscribeToMessages(
  roomId: string,
  callback: (message: any) => void
): () => void {
  const seenIds = new Set<string>();

  try {
    const node = getGun()
      .get(NAMESPACE)
      .get('rooms')
      .get(roomId)
      .get('messages');

    node.map().on((data: any) => {
      if (!data || !data._id || !data.userId) return;
      if (seenIds.has(data._id)) return;

      seenIds.add(data._id);

      if (seenIds.size > MAX_MESSAGES_PER_ROOM) {
        const oldest = seenIds.values().next().value;
        if (oldest) seenIds.delete(oldest);
      }

      callback({
        _id: data._id,
        text: data.text || '',
        createdAt: data.createdAt || Date.now(),
        user: {
          _id: data.userId,
          name: data.userName || 'Anonymous',
        },
        image: data.image || undefined,
      });
    });

    return () => {
      try { node.map().off(); } catch (_) {}
      seenIds.clear();
    };
  } catch (e) {
    console.warn('[Hive] subscribeToMessages failed:', e);
    return () => {};
  }
}

export function unsubscribeFromMessages(roomId: string) {
  try {
    getGun()
      .get(NAMESPACE)
      .get('rooms')
      .get(roomId)
      .get('messages')
      .map()
      .off();
  } catch (e) {
    console.warn('[Hive] unsubscribeFromMessages failed:', e);
  }
}
