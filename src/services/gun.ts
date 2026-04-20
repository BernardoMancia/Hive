const Gun = require('gun/gun');

import AsyncStorage from '@react-native-async-storage/async-storage';

const PUBLIC_RELAYS = [
  'https://gun-manhattan.herokuapp.com/gun',
  'https://gun-us.herokuapp.com/gun',
  'https://gun-eu.herokuapp.com/gun',
];

let gunInstance: any = null;

export function getGun() {
  if (gunInstance) return gunInstance;

  try {
    gunInstance = Gun({
      peers: PUBLIC_RELAYS,
      localStorage: false,
      file: false,
    });
  } catch (e) {
    gunInstance = Gun({ peers: PUBLIC_RELAYS });
  }

  return gunInstance;
}

export function getRoom(roomId: string) {
  const gun = getGun();
  return gun.get('hive').get('rooms').get(roomId);
}

export function getMessages(roomId: string) {
  return getRoom(roomId).get('messages');
}

export function getPresence() {
  const gun = getGun();
  return gun.get('hive').get('presence');
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
    const messages = getMessages(roomId);
    messages.get(message._id).put({
      _id: message._id,
      text: message.text,
      createdAt: message.createdAt,
      userId: message.user._id,
      userName: message.user.name,
      image: message.image || null,
      video: message.video || null,
    });
  } catch (e) {
    console.warn('[Hive] Failed to send message:', e);
  }
}

export function subscribeToMessages(
  roomId: string,
  callback: (message: any) => void
) {
  try {
    const messages = getMessages(roomId);

    messages.map().on((data: any, key: string) => {
      if (!data || !data._id) return;
      callback({
        _id: data._id,
        text: data.text || '',
        createdAt: data.createdAt || Date.now(),
        user: {
          _id: data.userId || 'unknown',
          name: data.userName || 'Anonymous',
        },
        image: data.image || undefined,
        video: data.video || undefined,
      });
    });
  } catch (e) {
    console.warn('[Hive] Failed to subscribe to messages:', e);
  }
}

export function unsubscribeFromMessages(roomId: string) {
  try {
    const messages = getMessages(roomId);
    messages.map().off();
  } catch (e) {
    console.warn('[Hive] Failed to unsubscribe:', e);
  }
}
