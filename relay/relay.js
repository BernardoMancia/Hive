'use strict';

require('gun/sea');
const Gun = require('gun');
const http = require('http');

process.env.GUN_ENV = 'false';

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      memory: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
      persistence: 'none',
    }));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hive Relay — RAM only, zero persistence, E2E encrypted');
});

Gun({
  web: server,
  file: false,
  localStorage: false,
  radisk: false,
  multicast: false,
  axe: false,
});

const PORT = parseInt(process.env.PORT || '8765', 10);

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[Hive Relay] Listening on 127.0.0.1:${PORT}`);
  console.log(`[Hive Relay] Persistence: NONE (RAM only)`);
  console.log(`[Hive Relay] All content is E2E encrypted — relay is blind`);
});

['SIGINT', 'SIGTERM'].forEach((sig) => {
  process.on(sig, () => {
    console.log(`[Hive Relay] Shutting down (${sig}) — all RAM data discarded`);
    server.close(() => process.exit(0));
  });
});

process.on('uncaughtException', (err) => {
  console.error('[Hive Relay] Uncaught exception:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Hive Relay] Unhandled rejection:', reason);
});
