const Gun = require('gun');

const COMMUNITY_RELAYS = [
  'https://peer.wallie.io/gun',
  'https://relay.peer.ooo/gun',
];

export const NAMESPACE = 'hive_v2';

const MAX_MESSAGES_PER_ROOM = 200;
const RECONNECT_BASE_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 8;

type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

let gunInstance: any = null;
let isInitializing = false;
let connectionStatus: ConnectionStatus = 'disconnected';
let statusListeners: Array<(s: ConnectionStatus) => void> = [];
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;

function notifyStatus(next: ConnectionStatus): void {
  if (connectionStatus === next) return;
  connectionStatus = next;
  statusListeners.forEach((cb) => cb(next));
}

function clearReconnectTimer(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function scheduleReconnect(): void {
  if (reconnectTimer) return;
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    notifyStatus('disconnected');
    return;
  }

  const delay = Math.min(
    RECONNECT_BASE_MS * Math.pow(1.5, reconnectAttempts),
    30000
  );
  reconnectAttempts++;
  notifyStatus('reconnecting');

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (!gunInstance) {
      createGunInstance();
    }
  }, delay);
}

function createGunInstance(): void {
  if (isInitializing) return;
  isInitializing = true;

  try {
    const instance = Gun({
      peers: COMMUNITY_RELAYS,
      localStorage: false,
      file: false,
      radisk: false,
      retry: Infinity,
    });

    instance.on('hi', () => {
      reconnectAttempts = 0;
      clearReconnectTimer();
      notifyStatus('connected');
    });

    instance.on('bye', () => {
      if (connectionStatus === 'connected') {
        scheduleReconnect();
      }
    });

    gunInstance = instance;
  } catch (e) {
    console.warn('[Hive:gun] Init failed, fallback:', e);
    try {
      gunInstance = Gun({ peers: COMMUNITY_RELAYS });
    } catch (e2) {
      console.warn('[Hive:gun] Fallback failed:', e2);
      gunInstance = Gun({});
      notifyStatus('disconnected');
    }
  } finally {
    isInitializing = false;
  }
}

export function getGun(): any {
  if (!gunInstance) {
    createGunInstance();
  }
  return gunInstance;
}

export function resetGun(): void {
  clearReconnectTimer();
  reconnectAttempts = 0;

  if (gunInstance) {
    try {
      const peers = gunInstance._.opt?.peers || {};
      Object.values(peers).forEach((peer: any) => {
        try { peer?.wire?.close?.(); } catch (_) {}
      });
    } catch (_) {}
    gunInstance = null;
  }

  createGunInstance();
  notifyStatus('reconnecting');
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
  if (!message._id || !message.user._id) return false;

  try {
    const payload: Record<string, any> = {
      _id: message._id,
      text: message.text || '',
      createdAt: message.createdAt,
      userId: message.user._id,
      userName: message.user.name || 'Anonymous',
    };

    if (message.image) {
      payload.image = message.image;
    }

    getGun()
      .get(NAMESPACE)
      .get('rooms')
      .get(roomId)
      .get('messages')
      .get(message._id)
      .put(payload);

    return true;
  } catch (e) {
    console.warn('[Hive:gun] sendMessage error:', e);
    return false;
  }
}

export function subscribeToMessages(
  roomId: string,
  callback: (message: {
    _id: string;
    text: string;
    createdAt: number;
    user: { _id: string; name: string };
    image?: string;
  }) => void
): () => void {
  const seenIds = new Set<string>();
  let active = true;

  try {
    const node = getGun()
      .get(NAMESPACE)
      .get('rooms')
      .get(roomId)
      .get('messages');

    node.map().on((data: any) => {
      if (!active) return;
      if (!data?._id || !data?.userId) return;
      if (seenIds.has(data._id)) return;

      seenIds.add(data._id);

      if (seenIds.size > MAX_MESSAGES_PER_ROOM) {
        const oldest = seenIds.values().next().value;
        if (oldest) seenIds.delete(oldest);
      }

      callback({
        _id: data._id,
        text: data.text || '',
        createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
        user: {
          _id: data.userId,
          name: data.userName || 'Anonymous',
        },
        image: data.image || undefined,
      });
    });

    return () => {
      active = false;
      seenIds.clear();
      try { node.map().off(); } catch (_) {}
    };
  } catch (e) {
    console.warn('[Hive:gun] subscribeToMessages error:', e);
    return () => {};
  }
}
