'use strict';

require('gun/sea');
const Gun      = require('gun');
const http     = require('http');
const fetch    = require('node-fetch');
const FormData = require('form-data');

process.env.GUN_ENV = 'false';

const NAMESPACE = 'hive_v2';
const TTL_MS    = 60 * 60 * 1000;

const TG_TOKEN    = process.env.TG_TOKEN    || '';
const TG_GROUP_ID = process.env.TG_GROUP_ID || '';

const ADMIN_IDS = (process.env.TG_ADMIN_IDS || '').split(',').map(s => s.trim()).filter(Boolean);

const stats = { messages: 0, media: 0, started: Date.now() };

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
      stats,
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
  setTimeout(() => {
    gun.get(NAMESPACE).get('rooms').get(roomId).get(msgKey).put(null);
    scheduled.delete(msgKey);
    console.log(`[TTL] expired room=${roomId} key=${msgKey}`);
  }, delay);
  scheduled.add(msgKey);
}

async function tgSend(chatId, text, extra = {}) {
  if (!TG_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown', ...extra }),
      timeout: 10000,
    });
  } catch (_) {}
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
      method: 'POST', body: form, headers: form.getHeaders(), timeout: 15000,
    });
    const json = await res.json();
    if (!json.ok) console.warn('[Telegram] API error:', json.description);
    else { console.log(`[Telegram] Media from ${userName} in ${roomId}`); stats.media++; }
  } catch (e) {
    console.warn('[Telegram] sendPhoto failed:', e.message);
  }
}

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h ${m % 60}m`;
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m ${s % 60}s`;
}

async function handleBotCommand(msg) {
  const chatId = msg.chat?.id;
  const userId = String(msg.from?.id || '');
  const text   = (msg.text || '').trim();

  const isAdmin = ADMIN_IDS.length === 0 || ADMIN_IDS.includes(userId);
  if (!isAdmin) {
    await tgSend(chatId, '⛔ Acesso negado.');
    return;
  }

  const uptime = formatUptime(Date.now() - stats.started);
  const mem    = Math.round(process.memoryUsage().rss / 1024 / 1024);

  if (text === '/start' || text === '/menu') {
    await tgSend(chatId,
      `🐝 *Hive Relay — Painel de Controle*\n\n` +
      `Escolha um comando:\n\n` +
      `/status — Status do servidor\n` +
      `/stats — Estatísticas de mensagens\n` +
      `/uptime — Tempo online\n` +
      `/memory — Uso de memória\n` +
      `/clear — Limpar timers expirados`,
      {
        reply_markup: JSON.stringify({
          keyboard: [
            [{ text: '📊 /status' }, { text: '📈 /stats' }],
            [{ text: '⏱ /uptime' }, { text: '💾 /memory' }],
            [{ text: '🗑 /clear' }],
          ],
          resize_keyboard: true,
          persistent: true,
        }),
      }
    );
  } else if (text.includes('/status') || text.includes('📊')) {
    await tgSend(chatId,
      `📊 *Status do Relay*\n\n` +
      `🟢 *Online:* ${uptime}\n` +
      `💾 *RAM:* ${mem} MB\n` +
      `⏱ *TTL timers ativos:* ${scheduled.size}\n` +
      `📡 *Endpoint:* \`0.0.0.0:8765\`\n` +
      `🔐 *Persistência:* Nenhuma (RAM only)\n` +
      `📲 *Telegram:* ${TG_TOKEN ? '✅ ON' : '❌ OFF'}`
    );
  } else if (text.includes('/stats') || text.includes('📈')) {
    await tgSend(chatId,
      `📈 *Estatísticas da Sessão*\n\n` +
      `💬 *Mensagens processadas:* ${stats.messages}\n` +
      `📸 *Mídias encaminhadas:* ${stats.media}\n` +
      `⏱ *Online há:* ${uptime}`
    );
  } else if (text.includes('/uptime') || text.includes('⏱')) {
    await tgSend(chatId, `⏱ *Uptime:* ${uptime}`);
  } else if (text.includes('/memory') || text.includes('💾')) {
    const full = process.memoryUsage();
    await tgSend(chatId,
      `💾 *Uso de Memória*\n\n` +
      `RSS: \`${Math.round(full.rss / 1024 / 1024)} MB\`\n` +
      `Heap usado: \`${Math.round(full.heapUsed / 1024 / 1024)} MB\`\n` +
      `Heap total: \`${Math.round(full.heapTotal / 1024 / 1024)} MB\``
    );
  } else if (text.includes('/clear') || text.includes('🗑')) {
    const before = scheduled.size;
    await tgSend(chatId, `🗑 *Limpeza concluída*\n${before} timers monitorados.`);
  }
}

let pollOffset = 0;
async function pollUpdates() {
  if (!TG_TOKEN) return;
  try {
    const res  = await fetch(
      `https://api.telegram.org/bot${TG_TOKEN}/getUpdates?offset=${pollOffset}&timeout=20&allowed_updates=["message"]`,
      { timeout: 25000 }
    );
    const data = await res.json();
    if (data.ok && data.result.length) {
      for (const upd of data.result) {
        pollOffset = upd.update_id + 1;
        if (upd.message) await handleBotCommand(upd.message);
      }
    }
  } catch (_) {}
  setTimeout(pollUpdates, 1000);
}

async function setupBotMenu() {
  if (!TG_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: [
          { command: 'start',  description: 'Abrir menu de controle' },
          { command: 'menu',   description: 'Menu principal' },
          { command: 'status', description: 'Status do relay' },
          { command: 'stats',  description: 'Estatísticas de mensagens' },
          { command: 'uptime', description: 'Tempo online' },
          { command: 'memory', description: 'Uso de memória' },
          { command: 'clear',  description: 'Limpar timers' },
        ],
      }),
      timeout: 10000,
    });
    console.log('[Telegram] Bot menu configured');

    if (TG_GROUP_ID) {
      const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      await tgSend(TG_GROUP_ID,
        `🟢 *Hive Relay iniciado*\n\n` +
        `🕐 *Horário:* ${now}\n` +
        `📡 *Porta:* \`8765\`\n` +
        `🔐 *Modo:* RAM only | E2E | TTL 1h\n` +
        `📲 *Telegram:* ativo\n\n` +
        `Use /menu para monitorar o relay.`
      );
    }
  } catch (_) {}
}

gun.get(NAMESPACE).get('rooms').map().on((_roomData, roomId) => {
  if (!roomId || typeof roomId !== 'string') return;
  gun.get(NAMESPACE).get('rooms').get(roomId).map().on((msgData, msgKey) => {
    if (!msgData || !msgKey || !msgData.createdAt) return;
    stats.messages++;
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
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Hive Relay] 0.0.0.0:${PORT} | RAM | E2E | TTL 1h | Telegram:${TG_TOKEN ? 'ON' : 'OFF'}`);
  setupBotMenu();
  pollUpdates();
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
