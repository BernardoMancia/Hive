'use strict';

require('gun/sea');
const Gun      = require('gun');
const http     = require('http');
const fs       = require('fs');
const path     = require('path');
const fetch    = require('node-fetch');
const FormData = require('form-data');
const crypto   = require('crypto');

process.env.GUN_ENV = 'false';

const NAMESPACE   = 'hive_v2';
const TTL_MS      = 60 * 60 * 1000;
const MAX_MSG_AGE = 60 * 1000;            // só envia ao Telegram se < 60s

const TG_TOKEN    = process.env.TG_TOKEN    || '';
const TG_GROUP_ID = process.env.TG_GROUP_ID || '';
const ADMIN_IDS   = (process.env.TG_ADMIN_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
const UPLOAD_TOKEN  = process.env.UPLOAD_TOKEN  || '';
const ADMIN_SECRET  = process.env.ADMIN_SECRET  || '';

const ADMIN_HTML = path.join(__dirname, 'admin', 'index.html');

const stats = { messages: 0, media: 0, uploads: 0, started: Date.now() };

const UPLOADS_DIR  = path.join(__dirname, 'uploads');
const MAX_UPLOAD   = 100 * 1024 * 1024;
try { fs.mkdirSync(UPLOADS_DIR, { recursive: true }); } catch (_) {}

// Room salts — persisted to disk for consistency
const SALTS_FILE = path.join(__dirname, 'room_salts.json');
let roomSalts = {};
try { roomSalts = JSON.parse(fs.readFileSync(SALTS_FILE, 'utf8')); } catch (_) {}
function saveRoomSalts() {
  try { fs.writeFileSync(SALTS_FILE, JSON.stringify(roomSalts, null, 2)); } catch (_) {}
}

// TTL timers (msgKey -> timeoutId)
const scheduled   = new Map();
// Telegram dedup (msgKey set — separado de scheduled)
const tgSeen      = new Set();
// Tracker de mensagens por sala para /clearchat
const msgTracker  = {};

// Controles de servidor
let maintenanceMode  = false;
let messagingPaused  = false;

// Online users via WebSocket connections
let onlineUsers = 0;

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const ct = req.headers['content-type'] || '';
    const match = ct.match(/boundary=(.+)/);
    if (!match) return reject(new Error('No boundary'));
    const boundary = match[1];
    const chunks = [];
    let totalSize = 0;
    req.on('data', (chunk) => {
      totalSize += chunk.length;
      if (totalSize > MAX_UPLOAD) { req.destroy(); reject(new Error('File too large')); return; }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks);
      const sep = Buffer.from(`--${boundary}`);
      let start = 0;
      let fileBuffer = null;
      let fileName = 'upload';
      let contentType = 'application/octet-stream';
      while (true) {
        const idx = raw.indexOf(sep, start);
        if (idx === -1) break;
        const nextIdx = raw.indexOf(sep, idx + sep.length);
        if (nextIdx === -1) break;
        const part = raw.slice(idx + sep.length, nextIdx);
        const headerEnd = part.indexOf('\r\n\r\n');
        if (headerEnd === -1) { start = nextIdx; continue; }
        const headers = part.slice(0, headerEnd).toString();
        if (headers.includes('filename=')) {
          const fnMatch = headers.match(/filename="([^"]+)"/);
          if (fnMatch) fileName = fnMatch[1];
          const ctMatch = headers.match(/Content-Type:\s*(.+)/i);
          if (ctMatch) contentType = ctMatch[1].trim();
          fileBuffer = part.slice(headerEnd + 4);
          if (fileBuffer.length >= 2 && fileBuffer[fileBuffer.length - 2] === 13 && fileBuffer[fileBuffer.length - 1] === 10) {
            fileBuffer = fileBuffer.slice(0, -2);
          }
        }
        start = nextIdx;
      }
      if (!fileBuffer) return reject(new Error('No file found'));
      resolve({ buffer: fileBuffer, fileName, contentType });
    });
    req.on('error', reject);
  });
}

function cleanupExpiredUploads() {
  try {
    const files = fs.readdirSync(UPLOADS_DIR);
    const now = Date.now();
    for (const f of files) {
      const fp = path.join(UPLOADS_DIR, f);
      try {
        const stat = fs.statSync(fp);
        if (now - stat.mtimeMs > TTL_MS) {
          fs.unlinkSync(fp);
          console.log(`[Upload] expired: ${f}`);
        }
      } catch (_) {}
    }
  } catch (_) {}
}
setInterval(cleanupExpiredUploads, 5 * 60 * 1000);

const MIME_EXT = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp',
  'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/x-msvideo': 'avi',
};

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Upload-Token');

  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  if (url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: maintenanceMode ? 'maintenance' : 'ok',
      uptime: Math.floor(process.uptime()),
      memoryRaw: Math.round(process.memoryUsage().rss / 1024 / 1024),
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      memory: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
      persistence: 'none', ttl: '1h',
      telegram: TG_TOKEN ? 'configured' : 'disabled',
      tracked: scheduled.size,
      maintenanceMode, messagingPaused,
      onlineUsers,
      stats,
    }));
  }

  if (url === '/admin' || url === '/admin/') {
    try {
      const html = fs.readFileSync(ADMIN_HTML, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      return res.end(html);
    } catch (_) {
      res.writeHead(404);
      return res.end('Admin panel not found');
    }
  }

  if (url === '/admin/test-telegram' && req.method === 'POST') {
    if (!TG_TOKEN || !TG_GROUP_ID) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'Telegram not configured' }));
    }
    const dt = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TG_GROUP_ID,
        text: `🧪 *Admin Panel Test*\n⏰ ${dt}\n✅ Relay online — uptime: ${Math.floor(process.uptime())}s\n📊 RAM: ${Math.round(process.memoryUsage().rss/1024/1024)}MB`,
        parse_mode: 'Markdown',
      }),
    }).then(r => r.json()).then(json => {
      res.writeHead(json.ok ? 200 : 502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: json.ok, msgId: json.result?.message_id }));
    }).catch(e => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    });
    return;
  }

  // ── Room salt endpoint (per-room random key component) ──────────
  const roomKeyMatch = url.match(/^\/room-key\/(.+)$/);
  if (roomKeyMatch && req.method === 'GET') {
    const roomId = decodeURIComponent(roomKeyMatch[1]);
    if (!roomSalts[roomId]) {
      roomSalts[roomId] = crypto.randomBytes(32).toString('hex');
      saveRoomSalts();
      console.log(`[RoomKey] Generated salt for room: ${roomId}`);
    }
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'private, max-age=3600' });
    return res.end(JSON.stringify({ salt: roomSalts[roomId] }));
  }

  if (url === '/upload' && req.method === 'POST') {
    if (maintenanceMode) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'Maintenance mode' }));
    }
    // Validate upload token
    if (UPLOAD_TOKEN) {
      const token = req.headers['x-upload-token'];
      if (token !== UPLOAD_TOKEN) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: 'Unauthorized' }));
      }
    }
    parseMultipart(req).then(({ buffer, fileName, contentType }) => {
      const id = crypto.randomBytes(16).toString('hex');
      const ext = MIME_EXT[contentType] || fileName.split('.').pop() || 'bin';
      const storedName = `${id}.${ext}`;
      const filePath = path.join(UPLOADS_DIR, storedName);
      fs.writeFileSync(filePath, buffer);
      stats.uploads++;
      const publicUrl = `https://fogoeluar.com.br/media/${storedName}`;
      console.log(`[Upload] ${storedName} (${(buffer.length / 1024 / 1024).toFixed(2)}MB)`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, url: publicUrl, id: storedName, size: buffer.length }));
    }).catch(e => {
      console.warn('[Upload] error:', e.message);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    });
    return;
  }

  const mediaMatch = url.match(/^\/media\/([a-f0-9]+\.\w+)$/);
  if (mediaMatch && req.method === 'GET') {
    const filePath = path.join(UPLOADS_DIR, mediaMatch[1]);
    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Not found or expired' }));
    }
    const ext = mediaMatch[1].split('.').pop();
    const mimeMap = { jpg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', mp4: 'video/mp4', mov: 'video/quicktime', avi: 'video/x-msvideo' };
    const mime = mimeMap[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': mime,
      'Cache-Control': 'public, max-age=3600',
      'Content-Length': fs.statSync(filePath).size,
    });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  if (maintenanceMode && url !== '/health') {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'maintenance', message: 'Relay under maintenance' }));
  }

  res.writeHead(200);
  res.end('Hive Relay | E2E | TTL 1h');
});

// ── WebSocket connection tracking ────────────────────────────────
server.on('upgrade', (_req, socket) => {
  onlineUsers++;
  socket.on('close', () => { onlineUsers = Math.max(0, onlineUsers - 1); });
  socket.on('error', () => { onlineUsers = Math.max(0, onlineUsers - 1); });
});

// ── Gun ──────────────────────────────────────────────────────────
try { process.chdir(__dirname); } catch (_) {}
const RADATA = path.join(__dirname, 'radata');
try { fs.mkdirSync(RADATA, { recursive: true }); } catch (_) {}

const gun = Gun({
  web: server,
  file: RADATA,
  localStorage: false,
  multicast: false,
  axe: false,
});

// Admin control listener (escrita pelo painel web)
let lastClearTs    = 0;
let lastDeleteChan = '';
let booting = true;
setTimeout(() => { booting = false; }, 5000);

gun.get(NAMESPACE).get('admin').get('ctrl').on((data) => {
  if (!data) return;

  // Validate admin secret for sensitive operations (if configured)
  if (ADMIN_SECRET && data.adminSecret && data.adminSecret !== ADMIN_SECRET) {
    console.warn('[Admin] Invalid admin secret — ignoring ctrl update');
    return;
  }

  maintenanceMode = !!data.maintenance;
  messagingPaused = !!data.pauseMessaging;

  const clearTs = Number(data.clearChat) || 0;
  const delChan = data.deleteChannel || '';

  if (booting) {
    lastClearTs = clearTs;
    lastDeleteChan = delChan;
    console.log(`[Boot] Ctrl state loaded: clearChat=${clearTs} deleteChannel=${delChan} maintenance=${maintenanceMode} pauseMsg=${messagingPaused}`);
    return;
  }

  if (clearTs && clearTs !== lastClearTs) {
    lastClearTs = clearTs;
    let total = 0;
    for (const [roomId, keys] of Object.entries(msgTracker)) {
      for (const msgKey of Object.keys(keys)) {
        gun.get(NAMESPACE).get('rooms').get(roomId).get(msgKey).put(null);
        const tid = scheduled.get(msgKey);
        if (tid) { clearTimeout(tid); scheduled.delete(msgKey); }
        total++;
      }
    }
    Object.keys(msgTracker).forEach(k => delete msgTracker[k]);
    console.log(`[Admin] clearChat: ${total} mensagens removidas`);
    if (TG_GROUP_ID) tgSend(TG_GROUP_ID, `🗑 *Chat limpo via painel web*\n${total} mensagens removidas.`);
  }

  if (delChan && delChan !== lastDeleteChan) {
    lastDeleteChan = delChan;
    const keys = msgTracker[delChan] ? Object.keys(msgTracker[delChan]) : [];
    keys.forEach(msgKey => {
      gun.get(NAMESPACE).get('rooms').get(delChan).get(msgKey).put(null);
      const tid = scheduled.get(msgKey);
      if (tid) { clearTimeout(tid); scheduled.delete(msgKey); }
    });
    if (msgTracker[delChan]) delete msgTracker[delChan];
    gun.get(NAMESPACE).get('admin').get('rooms').get(delChan).put({ id: delChan, deleted: true, name: delChan });
    console.log(`[Admin] deleteChannel: ${delChan} (${keys.length} msgs removed)`);
    if (TG_GROUP_ID) tgSend(TG_GROUP_ID, `🗑 *Canal deletado:* \`${delChan}\``);
  }

  console.log(`[Ctrl] maintenance=${maintenanceMode} pauseMsg=${messagingPaused}`);
});


// ── TTL ──────────────────────────────────────────────────────────
function scheduleExpiry(roomId, msgKey, createdAt) {
  if (scheduled.has(msgKey)) return;
  const ts    = Number(createdAt);
  if (!ts || isNaN(ts)) return;
  const delay = Math.max(2000, ts + TTL_MS - Date.now());
  const tid   = setTimeout(() => {
    gun.get(NAMESPACE).get('rooms').get(roomId).get(msgKey).put(null);
    scheduled.delete(msgKey);
    if (msgTracker[roomId]) delete msgTracker[roomId][msgKey];
    console.log(`[TTL] expired room=${roomId} key=${msgKey}`);
  }, delay);
  scheduled.set(msgKey, tid);
}

// ── Telegram helpers ─────────────────────────────────────────────
async function tgSend(chatId, text, extra = {}) {
  if (!TG_TOKEN || !chatId) return;
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
    const dt      = new Date(Number(createdAt)).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const caption = `📸 *Mídia enviada*\n👤 *De:* ${userName}\n💬 *Canal:* ${roomId}\n🕐 ${dt}`;
    const base64  = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer  = Buffer.from(base64, 'base64');
    const form    = new FormData();
    form.append('chat_id', TG_GROUP_ID);
    form.append('caption', caption);
    form.append('parse_mode', 'Markdown');
    form.append('photo', buffer, { filename: 'hive_media.jpg', contentType: 'image/jpeg' });
    const res  = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendPhoto`, {
      method: 'POST', body: form, headers: form.getHeaders(), timeout: 15000,
    });
    const json = await res.json();
    if (json.ok) { stats.media++; console.log(`[TG] image from ${userName} in ${roomId}`); }
    else console.warn('[TG] sendPhoto error:', json.description);
  } catch (e) { console.warn('[TG] sendPhoto failed:', e.message); }
}

async function sendVideoToTelegram(videoData, userName, roomId, createdAt) {
  if (!TG_TOKEN || !TG_GROUP_ID || !videoData) return;
  try {
    const dt      = new Date(Number(createdAt)).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const caption = `🎬 *Vídeo enviado*\n👤 *De:* ${userName}\n💬 *Canal:* ${roomId}\n🕐 ${dt}`;
    const base64  = videoData.replace(/^data:video\/\w+;base64,/, '');
    const buffer  = Buffer.from(base64, 'base64');
    const form    = new FormData();
    form.append('chat_id', TG_GROUP_ID);
    form.append('caption', caption);
    form.append('parse_mode', 'Markdown');
    form.append('video', buffer, { filename: 'hive_video.mp4', contentType: 'video/mp4' });
    const res  = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendVideo`, {
      method: 'POST', body: form, headers: form.getHeaders(), timeout: 30000,
    });
    const json = await res.json();
    if (json.ok) { stats.media++; console.log(`[TG] video from ${userName} in ${roomId}`); }
    else console.warn('[TG] sendVideo error:', json.description);
  } catch (e) { console.warn('[TG] sendVideo failed:', e.message); }
}

function formatUptime(ms) {
  const s = Math.floor(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h ${m % 60}m`;
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m ${s % 60}s`;
}

// ── Bot command handler ──────────────────────────────────────────
async function handleBotCommand(msg) {
  const chatId = msg.chat?.id;
  const userId = String(msg.from?.id || '');
  const text   = (msg.text || '').trim();

  const isAdmin = ADMIN_IDS.length === 0 || ADMIN_IDS.includes(userId);
  if (!isAdmin) { await tgSend(chatId, '⛔ Acesso negado.'); return; }

  const uptime = formatUptime(Date.now() - stats.started);
  const mem    = Math.round(process.memoryUsage().rss / 1024 / 1024);

  if (text.startsWith('/start') || text.startsWith('/menu') || text === '📋 Menu') {
    await tgSend(chatId,
      `🐝 *Hive Relay — Painel de Controle*\n\n` +
      `📡 *Status:* ${maintenanceMode ? '🔴 Manutenção' : messagingPaused ? '⏸ Msgs pausadas' : '🟢 Online'}\n` +
      `⏱ *Uptime:* ${uptime}\n💾 *RAM:* ${mem} MB\n\n` +
      `Escolha uma opção:`,
      {
        reply_markup: JSON.stringify({
          keyboard: [
            [{ text: '📊 Status' }, { text: '📈 Stats' }],
            [{ text: '⏱ Uptime' }, { text: '💾 Memória' }],
            [{ text: messagingPaused ? '▶️ Retomar Msgs' : '⏸ Pausar Msgs' }, { text: maintenanceMode ? '🟢 Desativar Manutenção' : '🔴 Ativar Manutenção' }],
            [{ text: '🗑 Limpar Chat' }],
          ],
          resize_keyboard: true, persistent: true,
        }),
      }
    );
    return;
  }

  if (text.includes('/status') || text.includes('📊 Status')) {
    await tgSend(chatId,
      `📊 *Status do Relay*\n\n` +
      `Status: ${maintenanceMode ? '🔴 Manutenção' : messagingPaused ? '⏸ Pausado' : '🟢 Online'}\n` +
      `⏱ *Uptime:* ${uptime}\n` +
      `💾 *RAM:* ${mem} MB\n` +
      `⏳ *TTL timers:* ${scheduled.size}\n` +
      `📡 *Endpoint:* \`0.0.0.0:8765\`\n` +
      `📲 *Telegram:* ${TG_TOKEN ? '✅ ON' : '❌ OFF'}`
    );
    return;
  }

  if (text.includes('/stats') || text.includes('📈 Stats')) {
    await tgSend(chatId,
      `📈 *Estatísticas*\n\n` +
      `💬 Mensagens: ${stats.messages}\n` +
      `📸 Mídias: ${stats.media}\n` +
      `⏱ Online há: ${uptime}`
    );
    return;
  }

  if (text.includes('/uptime') || text.includes('⏱ Uptime')) {
    await tgSend(chatId, `⏱ *Uptime:* ${uptime}`);
    return;
  }

  if (text.includes('/memory') || text.includes('/mem') || text.includes('💾 Memória')) {
    const full = process.memoryUsage();
    await tgSend(chatId,
      `💾 *Memória*\n\nRSS: \`${Math.round(full.rss/1024/1024)} MB\`\n` +
      `Heap usado: \`${Math.round(full.heapUsed/1024/1024)} MB\`\n` +
      `Heap total: \`${Math.round(full.heapTotal/1024/1024)} MB\``
    );
    return;
  }

  if (text.includes('⏸ Pausar Msgs') || text.includes('/pausemsgs')) {
    messagingPaused = true;
    gun.get(NAMESPACE).get('admin').get('ctrl').get('pauseMessaging').put(true);
    await tgSend(chatId, '⏸ *Troca de mensagens pausada.*\nNovos dados não serão processados.');
    await sendMenu(chatId);
    return;
  }

  if (text.includes('▶️ Retomar Msgs') || text.includes('/resumemsgs')) {
    messagingPaused = false;
    gun.get(NAMESPACE).get('admin').get('ctrl').get('pauseMessaging').put(false);
    await tgSend(chatId, '▶️ *Mensagens retomadas.*');
    await sendMenu(chatId);
    return;
  }

  if (text.includes('🔴 Ativar Manutenção') || text.includes('/maintenance')) {
    maintenanceMode = true;
    gun.get(NAMESPACE).get('admin').get('ctrl').get('maintenance').put(true);
    await tgSend(chatId, '🔴 *Modo manutenção ativado.*\nRelay retorna 503 para clientes.');
    await sendMenu(chatId);
    return;
  }

  if (text.includes('🟢 Desativar Manutenção') || text.includes('/resume')) {
    maintenanceMode = false;
    gun.get(NAMESPACE).get('admin').get('ctrl').get('maintenance').put(false);
    await tgSend(chatId, '🟢 *Relay voltou ao ar.*');
    await sendMenu(chatId);
    return;
  }

  if (text.includes('🗑 Limpar Chat') || text.includes('/clearchat')) {
    let total = 0;
    for (const [roomId, keys] of Object.entries(msgTracker)) {
      for (const msgKey of Object.keys(keys)) {
        gun.get(NAMESPACE).get('rooms').get(roomId).get(msgKey).put(null);
        const tid = scheduled.get(msgKey);
        if (tid) { clearTimeout(tid); scheduled.delete(msgKey); }
        total++;
      }
    }
    Object.keys(msgTracker).forEach(k => delete msgTracker[k]);
    await tgSend(chatId, `🗑 *Chat limpo!*\n${total} mensagem(ns) removidas de todos os canais.`);
    return;
  }
}

async function sendMenu(chatId) {
  await tgSend(chatId, '📋 Use /menu para ver os controles atualizados.');
}

// ── Gun message listener ─────────────────────────────────────────
const statsSeen = new Set();
gun.get(NAMESPACE).get('rooms').map().on((_roomData, roomId) => {
  if (!roomId || typeof roomId !== 'string') return;
  gun.get(NAMESPACE).get('rooms').get(roomId).map().on((msgData, msgKey) => {
    if (!msgData || !msgKey || !msgData.createdAt) return;
    if (typeof msgData !== 'object') return;
    if (messagingPaused) return;

    scheduleExpiry(roomId, msgKey, msgData.createdAt);

    if (!msgTracker[roomId]) msgTracker[roomId] = {};
    msgTracker[roomId][msgKey] = true;

    if (!statsSeen.has(msgKey)) { statsSeen.add(msgKey); stats.messages++; }

    if (!tgSeen.has(msgKey)) {
      tgSeen.add(msgKey);
      const age = Date.now() - Number(msgData.createdAt);
      if (age < MAX_MSG_AGE && TG_GROUP_ID) {
        let userName = 'Desconhecido';
        try {
          const u = typeof msgData.user === 'string' ? JSON.parse(msgData.user) : msgData.user;
          userName = u?.name || userName;
        } catch (_) {}
        if (msgData.image) {
          sendMediaToTelegram(msgData.image, userName, roomId, msgData.createdAt);
        } else if (msgData.video) {
          sendVideoToTelegram(msgData.video, userName, roomId, msgData.createdAt);
        } else if (msgData.text) {
          const dt = new Date(Number(msgData.createdAt)).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
          tgSend(TG_GROUP_ID, `💬 *Nova mensagem*\n👤 *De:* ${userName}\n💬 *Canal:* \`${roomId}\`\n📝 ${String(msgData.text).slice(0, 200)}\n🕐 ${dt}`);
        }
      }
    }
  });
});

setInterval(() => {
  if (tgSeen.size > 5000) { tgSeen.clear(); console.log('[GC] tgSeen cleared'); }
  if (statsSeen.size > 5000) { statsSeen.clear(); console.log('[GC] statsSeen cleared'); }
}, 60 * 60 * 1000);

// ── Bot polling ──────────────────────────────────────────────────
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
          { command: 'menu',       description: 'Menu principal' },
          { command: 'status',     description: 'Status do relay' },
          { command: 'stats',      description: 'Estatísticas' },
          { command: 'uptime',     description: 'Tempo online' },
          { command: 'memory',     description: 'Uso de memória' },
          { command: 'clearchat',  description: 'Limpar todos os chats' },
          { command: 'pausemsgs',  description: 'Pausar troca de mensagens' },
          { command: 'resumemsgs', description: 'Retomar mensagens' },
          { command: 'maintenance',description: 'Ativar modo manutenção' },
          { command: 'resume',     description: 'Desativar manutenção' },
        ],
      }),
      timeout: 10000,
    });
    console.log('[TG] Bot menu configured');

    if (TG_GROUP_ID) {
      const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      await tgSend(TG_GROUP_ID,
        `🟢 *Hive Relay iniciado*\n\n🕐 ${now}\n📡 Porta: \`8765\`\n🔐 RAM only | E2E | TTL 1h\n\nUse /menu para monitorar.`
      );
    }
  } catch (_) {}
}

// ── Start ────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '8765', 10);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Hive Relay] 0.0.0.0:${PORT} | RAM | E2E | TTL 1h | TG:${TG_TOKEN ? 'ON' : 'OFF'}`);
  setupBotMenu();
  pollUpdates();
});

['SIGINT', 'SIGTERM'].forEach(sig => {
  process.on(sig, () => {
    scheduled.forEach(tid => clearTimeout(tid));
    server.close(() => process.exit(0));
  });
});

process.on('uncaughtException', err => {
  console.error('[Hive Relay] uncaughtException:', err.message);
});
