import 'react-native-get-random-values';
import { Buffer } from 'buffer';
(global as any).Buffer = (global as any).Buffer || Buffer;

if (typeof (global as any).TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('text-encoding');
  (global as any).TextEncoder = TextEncoder;
  (global as any).TextDecoder = TextDecoder;
}

import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
