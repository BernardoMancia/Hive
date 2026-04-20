const Gun = require('gun');

const PUBLIC_RELAYS = [
  'https://peer.wallie.io/gun',
  'https://relay.peer.ooo/gun',
  'wss://gun-manhattan.herokuapp.com/gun',
];

let gunInstance: any = null;

export function getGun() {
  if (gunInstance) return gunInstance;

  try {
    gunInstance = Gun({
      peers: PUBLIC_RELAYS,
      localStorage: false,
      file: false,
      radisk: false,
    });
  } catch (e) {
    console.warn('[Hive] Gun init failed, retrying bare:', e);
    gunInstance = Gun({ peers: PUBLIC_RELAYS });
  }

  return gunInstance;
}

export function getRoom(roomId: string) {
  return getGun().get('hive_v1').get('rooms').get(roomId);
}

export function getMessages(roomId: string) {
  return getRoom(roomId).get('messages');
}

export function getPresence() {
  return getGun().get('hive_v1').get('presence');
}

export function sendMessage(roomId: string, message: {
  _id: string;
  text: string;
  createdAt: number;
  user: { _id: string; name: string };
  image?: string;
  video?: string;
}) {
  try {
    getMessages(roomId).get(message._id).put({
      _id: message._id,
      text: message.text,
      createdAt: message.createdAt,
      userId: message.user._id,
      userName: message.user.name,
      image: message.image ?? null,
      video: message.video ?? null,
    });
  } catch (e) {
    console.warn('[Hive] sendMessage failed:', e);
  }
}

export function subscribeToMessages(
  roomId: string,
  callback: (message: any) => void
) {
  try {
    getMessages(roomId).map().on((data: any) => {
      if (!data || !data._id || !data.userId) return;
      callback({
        _id: data._id,
        text: data.text || '',
        createdAt: data.createdAt || Date.now(),
        user: {
          _id: data.userId,
          name: data.userName || 'Anonymous',
        },
        image: data.image || undefined,
        video: data.video || undefined,
      });
    });
  } catch (e) {
    console.warn('[Hive] subscribeToMessages failed:', e);
  }
}

export function unsubscribeFromMessages(roomId: string) {
  try {
    getMessages(roomId).map().off();
  } catch (e) {
    console.warn('[Hive] unsubscribeFromMessages failed:', e);
  }
}
