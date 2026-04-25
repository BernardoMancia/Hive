'use strict';

require('gun/sea');
const Gun = require('gun');
const http = require('http');

process.env.GUN_ENV = 'false';

const NAMESPACE = 'hive_v2';
const TTL_MS = 60 * 60 * 1000;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      memory: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
      persistence: 'none',
      ttl: '1h',
      trackedMessages: scheduled.size,
    }));
    return;
  }
  res.writeHead(200);
  res.end('Hive Relay — RAM only | E2E encrypted | TTL 1h');
});

const gun = Gun({
  web: server,
  file: false,
  localStorage: false,
  radisk: false,
  multicast: false,
  axe: false,
});

const scheduled = new Map();

function scheduleExpiry(roomId, msgKey, createdAt) {
  if (scheduled.has(msgKey)) return;
  const ts = Number(createdAt);
  if (!ts || isNaN(ts)) return;

  const delay = Math.max(2000, ts + TTL_MS - Date.now());

  const timer = setTimeout(() => {
    gun.get(NAMESPACE).get('rooms').get(roomId).get(msgKey).put(null);
    scheduled.delete(msgKey);
    console.log(`[TTL] Expired room=${roomId} key=${msgKey}`);
  }, delay);

  scheduled.set(msgKey, timer);
}

gun.get(NAMESPACE).get('rooms').map().on((_roomData, roomId) => {
  if (!roomId || typeof roomId !== 'string') return;
  gun.get(NAMESPACE).get('rooms').get(roomId).map().on((msgData, msgKey) => {
    if (!msgData || !msgKey || !msgData.createdAt) return;
    scheduleExpiry(roomId, msgKey, msgData.createdAt);
  });
});

const PORT = parseInt(process.env.PORT || '8765', 10);

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[Hive Relay] 127.0.0.1:${PORT} | RAM | E2E | TTL 1h`);
});

['SIGINT', 'SIGTERM'].forEach((sig) => {
  process.on(sig, () => {
    scheduled.forEach(clearTimeout);
    server.close(() => process.exit(0));
  });
});

process.on('uncaughtException', (err) => {
  console.error('[Hive Relay] uncaughtException:', err.message);
});
