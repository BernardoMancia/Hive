'use strict';

require('gun/sea');
const Gun   = require('gun');
const http  = require('http');
const fetch = require('node-fetch');
const FormData = require('form-data');

process.env.GUN_ENV = 'false';

const NAMESPACE = 'hive_v2';
const TTL_MS    = 60 * 60 * 1000;

const TG_TOKEN    = process.env.TG_TOKEN    || '';
const TG_GROUP_ID = process.env.TG_GROUP_ID || '';

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      memory: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
      persistence: 'none',
      ttl: '1h',
      telegram: TG_TOKEN ? 'configured' : 'disabled',
      tracked: scheduled.size,
    }));
    return;
  }
  res.writeHead(200);
  res.end('Hive Relay | RAM only | E2E | TTL 1h');
});

const gun = Gun({
  web: server,
  file: false,
  localStorage: false,
  radisk: false,
  multicast: false,
  axe: false,
});

const scheduled = new Set();

function scheduleExpiry(roomId, msgKey, createdAt) {
  if (scheduled.has(msgKey)) return;
  const ts = Number(createdAt);
  if (!ts || isNaN(ts)) return;
  const delay = Math.max(2000, ts + TTL_MS - Date.now());
  const timer = setTimeout(() => {
    gun.get(NAMESPACE).get('rooms').get(roomId).get(msgKey).put(null);
    scheduled.delete(msgKey);
    console.log(`[TTL] expired room=${roomId} key=${msgKey}`);
  }, delay);
  scheduled.add(msgKey);
  return timer;
}

async function sendMediaToTelegram(imageData, userName, roomId, createdAt) {
  if (!TG_TOKEN || !TG_GROUP_ID || !imageData) return;
  try {
    const dt = new Date(Number(createdAt)).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const caption = `📸 *Mídia enviada*\n👤 *De:* ${userName}\n💬 *Canal:* ${roomId}\n🕐 ${dt}`;

    const base64 = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');

    const form = new FormData();
    form.append('chat_id', TG_GROUP_ID);
    form.append('caption', caption);
    form.append('parse_mode', 'Markdown');
    form.append('photo', buffer, { filename: 'hive_media.jpg', contentType: 'image/jpeg' });

    const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendPhoto`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
      timeout: 15000,
    });
    const json = await res.json();
    if (!json.ok) console.warn('[Telegram] API error:', json.description);
    else console.log(`[Telegram] Media sent from ${userName} in ${roomId}`);
  } catch (e) {
    console.warn('[Telegram] Failed:', e.message);
  }
}

gun.get(NAMESPACE).get('rooms').map().on((_roomData, roomId) => {
  if (!roomId || typeof roomId !== 'string') return;
  gun.get(NAMESPACE).get('rooms').get(roomId).map().on((msgData, msgKey) => {
    if (!msgData || !msgKey || !msgData.createdAt) return;
    scheduleExpiry(roomId, msgKey, msgData.createdAt);

    if (msgData.image && !scheduled.has(`tg_${msgKey}`)) {
      scheduled.add(`tg_${msgKey}`);
      let userName = 'Desconhecido';
      try { const u = typeof msgData.user === 'string' ? JSON.parse(msgData.user) : msgData.user; userName = u?.name || userName; } catch (_) {}
      sendMediaToTelegram(msgData.image, userName, roomId, msgData.createdAt);
    }
  });
});

const PORT = parseInt(process.env.PORT || '8765', 10);
server.listen(PORT, '127.0.0.1', () => {
  console.log(`[Hive Relay] 127.0.0.1:${PORT} | RAM | E2E | TTL 1h | Telegram:${TG_TOKEN ? 'ON' : 'OFF'}`);
});

['SIGINT', 'SIGTERM'].forEach((sig) => {
  process.on(sig, () => {
    scheduled.forEach(t => { if (typeof t === 'object') clearTimeout(t); });
    server.close(() => process.exit(0));
  });
});

process.on('uncaughtException', (err) => {
  console.error('[Hive Relay] uncaughtException:', err.message);
});
