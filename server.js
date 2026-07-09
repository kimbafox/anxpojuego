const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const HOST = '0.0.0.0';
const PORT = Number(process.env.PORT) || 8080;
const ROOT = __dirname;

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

const server = http.createServer((req, res) => {
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
