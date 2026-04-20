const Gun = require('gun');

const PUBLIC_RELAYS = [
  'https://peer.wallie.io/gun',
  'https://relay.peer.ooo/gun',
  'https://gundb-relay-mlmbl.ondigitalocean.app/gun',
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
    console.warn('[Hive] Gun init failed:', e);
    try {
      gunInstance = Gun({ peers: PUBLIC_RELAYS });
    } catch (e2) {
      gunInstance = Gun({});
    }
  }

  return gunInstance;
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
    const data: Record<string, any> = {
      _id: message._id,
      text: message.text || '',
      createdAt: message.createdAt,
      userId: message.user._id,
      userName: message.user.name,
    };

    if (message.image) data.image = message.image;
    if (message.video) data.video = message.video;

    getGun()
      .get('hive_v1')
      .get('rooms')
      .get(roomId)
      .get('messages')
      .get(message._id)
      .put(data);
  } catch (e) {
    console.warn('[Hive] sendMessage failed:', e);
  }
}

export function subscribeToMessages(
  roomId: string,
  callback: (message: any) => void
) {
  try {
    getGun()
      .get('hive_v1')
      .get('rooms')
      .get(roomId)
      .get('messages')
      .map()
      .on((data: any) => {
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
    getGun()
      .get('hive_v1')
      .get('rooms')
      .get(roomId)
      .get('messages')
      .map()
      .off();
  } catch (e) {
    console.warn('[Hive] unsubscribeFromMessages failed:', e);
  }
}
