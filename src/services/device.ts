import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import { getGun, NAMESPACE } from './gun';

const DEVICE_ID_KEY = '@hive_device_id';
let cachedId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cachedId) return cachedId;

  if (Platform.OS === 'android') {
    try {
      const Application = require('expo-application');
      const androidId = Application.androidId;
      if (androidId) {
        cachedId = androidId;
        return cachedId;
      }
    } catch (e) { console.warn('[Hive:device] androidId unavailable:', e); }
  }

  const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (stored) {
    cachedId = stored;
    return cachedId;
  }

  const generated = uuidv4();
  await AsyncStorage.setItem(DEVICE_ID_KEY, generated);
  cachedId = generated;
  return cachedId;
}

export function checkPrivateAccess(deviceId: string): Promise<boolean> {
  const gun = getGun();
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(false), 4000);
    gun
      .get(NAMESPACE)
      .get('admin')
      .get('private_access')
      .get(deviceId)
      .once((data: any) => {
        clearTimeout(timeout);
        resolve(!!data && data.allowed === true);
      });
  });
}
