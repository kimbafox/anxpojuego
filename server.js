const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL, URLSearchParams } = require('url');

const HOST = '0.0.0.0';
const PORT = Number(process.env.PORT) || 8080;
const ROOT = __dirname;
const RANKING_FILE = path.join(ROOT, 'ranking-data.json');
const SESSION_COOKIE = 'anxpo_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

const sessions = new Map();
const oauthStates = new Map();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

function safeResolve(requestPath) {
  const decoded = decodeURIComponent(requestPath.split('?')[0]);
  const cleanPath = decoded === '/' ? '/index.html' : decoded;
  const fullPath = path.normalize(path.join(ROOT, cleanPath));

  if (!fullPath.startsWith(ROOT)) {
    return null;
  }

  return fullPath;
}

function sendFile(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
        return;
      }

      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('500 Internal Server Error');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function sendJson(res, statusCode, payload, headers = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers
  });
  res.end(body);
}

function sendRedirect(res, location, headers = {}) {
  res.writeHead(302, {
    Location: location,
    'Cache-Control': 'no-store',
    ...headers
  });
  res.end();
}

function deriveOrigin(req) {
  const forwardedProto = (req.headers['x-forwarded-proto'] || '').toString().split(',')[0].trim();
  const proto = forwardedProto || 'http';
  const host = req.headers.host || `localhost:${PORT}`;
  return `${proto}://${host}`;
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i <= 0) return;
    const key = part.slice(0, i).trim();
    const value = part.slice(i + 1).trim();
    out[key] = decodeURIComponent(value);
  });
  return out;
}

function makeSessionCookie(req, value, maxAgeSec) {
  const forwardedProto = (req.headers['x-forwarded-proto'] || '').toString().split(',')[0].trim();
  const isSecure = forwardedProto === 'https';
  const attrs = [
    `${SESSION_COOKIE}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.max(0, maxAgeSec | 0)}`
  ];
  if (isSecure) attrs.push('Secure');
  return attrs.join('; ');
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > 100_000) {
        reject(new Error('Body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function readJsonBody(req) {
  const text = await readRequestBody(req);
  if (!text) return {};
  return JSON.parse(text);
}

function ensureRankingFile() {
  if (!fs.existsSync(RANKING_FILE)) {
    fs.writeFileSync(RANKING_FILE, '[]', 'utf8');
  }
}

function sortRanking(entries) {
  return entries.sort((a, b) => {
    if ((b.score || 0) !== (a.score || 0)) {
      return (b.score || 0) - (a.score || 0);
    }
    if ((a.elapsedMs || 0) !== (b.elapsedMs || 0)) {
      return (a.elapsedMs || 0) - (b.elapsedMs || 0);
    }
    return (a.updatedAt || 0) - (b.updatedAt || 0);
  });
}

function readRanking() {
  ensureRankingFile();
  try {
    const raw = fs.readFileSync(RANKING_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && item.discordId && typeof item.score === 'number' && typeof item.elapsedMs === 'number');
  } catch (_) {
    return [];
  }
}

function writeRanking(entries) {
  const safe = sortRanking(entries).slice(0, 20);
  fs.writeFileSync(RANKING_FILE, JSON.stringify(safe, null, 2), 'utf8');
  return safe;
}

function cleanupExpiredSessions(now = Date.now()) {
  for (const [sid, session] of sessions.entries()) {
    if (!session || session.expiresAt <= now) {
      sessions.delete(sid);
    }
  }
  for (const [state, item] of oauthStates.entries()) {
    if (!item || item.expiresAt <= now) {
      oauthStates.delete(state);
    }
  }
}

function getSession(req) {
  cleanupExpiredSessions();
  const cookies = parseCookies(req);
  const sid = cookies[SESSION_COOKIE];
  if (!sid) return null;
  const session = sessions.get(sid);
  if (!session || session.expiresAt <= Date.now()) {
    sessions.delete(sid);
    return null;
  }
  return { sid, session };
}

function discordAvatarUrl(user) {
  if (user && user.avatar) {
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
  }
  const fallback = Number(user?.id || 0) % 6;
  return `https://cdn.discordapp.com/embed/avatars/${fallback}.png`;
}

async function exchangeDiscordCode({ code, redirectUri }) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Faltan DISCORD_CLIENT_ID o DISCORD_CLIENT_SECRET');
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri
  });

  const tokenResp = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!tokenResp.ok) {
    const text = await tokenResp.text();
    throw new Error(`Discord token error: ${text}`);
  }

  const tokenData = await tokenResp.json();
  if (!tokenData.access_token) {
    throw new Error('Discord no devolvio access_token');
  }
  return tokenData.access_token;
}

async function fetchDiscordMe(accessToken) {
  const userResp = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!userResp.ok) {
    const text = await userResp.text();
    throw new Error(`Discord user error: ${text}`);
  }
  return userResp.json();
}

async function handleApi(req, res, urlObj) {
  const pathname = urlObj.pathname;

  if (pathname === '/api/ranking' && req.method === 'GET') {
    const ranking = sortRanking(readRanking()).slice(0, 20);
    sendJson(res, 200, { ranking });
    return true;
  }

  if (pathname === '/api/ranking' && req.method === 'POST') {
    const holder = getSession(req);
    if (!holder || !holder.session.user) {
      sendJson(res, 401, { error: 'Debes conectar Discord para registrar puntaje.' });
      return true;
    }

    let payload;
    try {
      payload = await readJsonBody(req);
    } catch (_) {
      sendJson(res, 400, { error: 'JSON invalido.' });
      return true;
    }

    const score = Math.max(0, Math.floor(Number(payload.score)));
    const elapsedMs = Math.max(0, Math.floor(Number(payload.elapsedMs)));
    if (!Number.isFinite(score) || !Number.isFinite(elapsedMs) || elapsedMs > 24 * 60 * 60 * 1000 || score > 10_000_000) {
      sendJson(res, 400, { error: 'Score o tiempo invalidos.' });
      return true;
    }

    const me = holder.session.user;
    const entries = readRanking();
    const now = Date.now();
    const incoming = {
      discordId: me.id,
      username: me.username,
      avatarUrl: me.avatarUrl,
      score,
      elapsedMs,
      updatedAt: now
    };

    const existingIndex = entries.findIndex((e) => e.discordId === incoming.discordId);
    if (existingIndex >= 0) {
      const current = entries[existingIndex];
      const isBetter =
        incoming.score > current.score ||
        (incoming.score === current.score && incoming.elapsedMs < current.elapsedMs);

      entries[existingIndex] = {
        ...current,
        username: incoming.username,
        avatarUrl: incoming.avatarUrl,
        ...(isBetter ? { score: incoming.score, elapsedMs: incoming.elapsedMs, updatedAt: incoming.updatedAt } : {})
      };
    } else {
      entries.push(incoming);
    }

    const ranking = writeRanking(entries);
    sendJson(res, 200, { ok: true, ranking });
    return true;
  }

  if (pathname === '/api/discord/me' && req.method === 'GET') {
    const holder = getSession(req);
    if (!holder || !holder.session.user) {
      sendJson(res, 200, { authenticated: false });
      return true;
    }
    sendJson(res, 200, { authenticated: true, user: holder.session.user });
    return true;
  }

  if (pathname === '/api/discord/logout' && req.method === 'POST') {
    const holder = getSession(req);
    if (holder) {
      sessions.delete(holder.sid);
    }
    sendJson(res, 200, { ok: true }, {
      'Set-Cookie': makeSessionCookie(req, '', 0)
    });
    return true;
  }

  if (pathname === '/api/discord/login' && req.method === 'GET') {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      sendJson(res, 500, { error: 'Configura DISCORD_CLIENT_ID y DISCORD_CLIENT_SECRET en Railway.' });
      return true;
    }

    const state = crypto.randomBytes(18).toString('hex');
    const redirectUri = process.env.DISCORD_REDIRECT_URI || `${deriveOrigin(req)}/api/discord/callback`;
    oauthStates.set(state, {
      expiresAt: Date.now() + OAUTH_STATE_TTL_MS,
      redirectUri
    });

    const authUrl = new URL('https://discord.com/oauth2/authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'identify');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('prompt', 'consent');

    sendRedirect(res, authUrl.toString());
    return true;
  }

  if (pathname === '/api/discord/callback' && req.method === 'GET') {
    const code = urlObj.searchParams.get('code');
    const state = urlObj.searchParams.get('state');
    const saved = state ? oauthStates.get(state) : null;

    if (!code || !saved || saved.expiresAt <= Date.now()) {
      if (state) oauthStates.delete(state);
      sendRedirect(res, '/?discord=error');
      return true;
    }

    oauthStates.delete(state);

    try {
      const accessToken = await exchangeDiscordCode({
        code,
        redirectUri: saved.redirectUri
      });
      const userData = await fetchDiscordMe(accessToken);
      const sid = crypto.randomBytes(24).toString('hex');
      sessions.set(sid, {
        expiresAt: Date.now() + SESSION_TTL_MS,
        user: {
          id: userData.id,
          username: userData.global_name || userData.username,
          avatarUrl: discordAvatarUrl(userData)
        }
      });

      sendRedirect(res, '/?discord=ok', {
        'Set-Cookie': makeSessionCookie(req, sid, Math.floor(SESSION_TTL_MS / 1000))
      });
    } catch (err) {
      sendRedirect(res, '/?discord=error');
    }
    return true;
  }

  return false;
}

const server = http.createServer((req, res) => {
  (async () => {
    const urlObj = new URL(req.url || '/', deriveOrigin(req));
    if (urlObj.pathname.startsWith('/api/')) {
      const handled = await handleApi(req, res, urlObj);
      if (handled) return;
    }

    const filePath = safeResolve(req.url || '/');
    if (!filePath) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('400 Bad Request');
      return;
    }

    fs.stat(filePath, (err, stats) => {
      if (!err && stats.isDirectory()) {
        sendFile(path.join(filePath, 'index.html'), res);
        return;
      }

      sendFile(filePath, res);
    });
  })().catch((err) => {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Error interno del servidor.' }));
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Servidor activo en http://localhost:${PORT}`);
  console.log(`Red local: http://<TU-IP-LOCAL>:${PORT}`);
});

// ── WebSocket multiplayer (3 lobbies, max 2 players each) ──────────────────
const WS_MAGIC = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const MAX_LOBBIES = 3;
const MAX_PER_LOBBY = 2;
const lobbies = Array.from({ length: MAX_LOBBIES }, () => []);

function wsHandshake(req, socket) {
  const key = req.headers['sec-websocket-key'];
  if (!key) return false;
  const accept = crypto.createHash('sha1').update(key + WS_MAGIC).digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
  );
  return true;
}

function parseWsFrames(buf) {
  const frames = [];
  let offset = 0;
  while (offset + 2 <= buf.length) {
    const opcode = buf[offset] & 0x0f;
    const masked = !!(buf[offset + 1] & 0x80);
    let payLen = buf[offset + 1] & 0x7f;
    let headLen = 2;
    if (payLen === 126) {
      if (offset + 4 > buf.length) break;
      payLen = buf.readUInt16BE(offset + 2);
      headLen = 4;
    } else if (payLen === 127) {
      if (offset + 10 > buf.length) break;
      payLen = Number(buf.readBigUInt64BE(offset + 2));
      headLen = 10;
    }
    const maskStart = offset + headLen;
    const dataStart = maskStart + (masked ? 4 : 0);
    if (dataStart + payLen > buf.length) break;
    const payload = Buffer.from(buf.slice(dataStart, dataStart + payLen));
    if (masked) {
      const mask = buf.slice(maskStart, maskStart + 4);
      for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
    }
    frames.push({ opcode, payload, end: dataStart + payLen });
    offset = dataStart + payLen;
  }
  return { frames, remaining: buf.slice(offset) };
}

function sendWs(socket, obj) {
  if (!socket || socket.destroyed) return;
  try {
    const payload = Buffer.from(JSON.stringify(obj), 'utf8');
    const len = payload.length;
    let header;
    if (len < 126) {
      header = Buffer.from([0x81, len]);
    } else if (len < 65536) {
      header = Buffer.alloc(4);
      header[0] = 0x81; header[1] = 126;
      header.writeUInt16BE(len, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x81; header[1] = 127;
      header.writeBigUInt64BE(BigInt(len), 2);
    }
    socket.write(Buffer.concat([header, payload]));
  } catch (_) {}
}

function lobbyStatusList() {
  return lobbies.map((l, i) => ({ id: i + 1, players: l.length }));
}

function removeFromLobby(socket) {
  const li = socket.wsLobby;
  if (li >= 0 && li < MAX_LOBBIES) {
    const lobby = lobbies[li];
    const idx = lobby.indexOf(socket);
    if (idx !== -1) {
      lobby.splice(idx, 1);
      lobby.forEach(peer => sendWs(peer, { type: 'peer_left' }));
    }
    socket.wsLobby = -1;
  }
}

function handleWsMsg(socket, text) {
  let data;
  try { data = JSON.parse(text); } catch { return; }

  switch (data.type) {
    case 'lobby_status':
      sendWs(socket, { type: 'lobby_status', lobbies: lobbyStatusList() });
      break;

    case 'join': {
      const li = Math.max(0, Math.min(MAX_LOBBIES - 1, Number(data.lobby) - 1));
      removeFromLobby(socket);
      const lobby = lobbies[li];
      if (lobby.length >= MAX_PER_LOBBY) {
        sendWs(socket, { type: 'lobby_full', lobby: li + 1 });
        return;
      }
      socket.wsLobby = li;
      socket.wsPlayerId = lobby.length === 0 ? 1 : 2;
      lobby.push(socket);
      sendWs(socket, { type: 'joined', playerId: socket.wsPlayerId, lobby: li + 1, count: lobby.length });
      lobby.forEach(s => { if (s !== socket) sendWs(s, { type: 'peer_joined' }); });
      if (lobby.length === MAX_PER_LOBBY) {
        lobby.forEach((s, i) => sendWs(s, { type: 'game_ready', playerId: i + 1 }));
      }
      break;
    }

    default:
      // Relay to peers in same lobby
      if (socket.wsLobby >= 0) {
        lobbies[socket.wsLobby].forEach(peer => {
          if (peer !== socket) sendWs(peer, data);
        });
      }
  }
}

server.on('upgrade', (req, socket) => {
  if (req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket') {
    if (!wsHandshake(req, socket)) { socket.destroy(); return; }
    socket.wsLobby = -1;
    socket.wsPlayerId = -1;
    socket.wsBuffer = Buffer.alloc(0);

    socket.on('data', (chunk) => {
      socket.wsBuffer = Buffer.concat([socket.wsBuffer, chunk]);
      const result = parseWsFrames(socket.wsBuffer);
      socket.wsBuffer = result.remaining;
      for (const frame of result.frames) {
        if (frame.opcode === 8) { removeFromLobby(socket); socket.destroy(); return; }
        if (frame.opcode === 9) { try { socket.write(Buffer.from([0x8a, 0])); } catch (_) {} }
        if (frame.opcode === 1) handleWsMsg(socket, frame.payload.toString('utf8'));
      }
    });

    socket.on('close', () => removeFromLobby(socket));
    socket.on('error', () => { removeFromLobby(socket); });
  } else {
    socket.destroy();
  }
});
