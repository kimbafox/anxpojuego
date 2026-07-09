(function () {
  'use strict';

  let ws = null;
  let playerId = -1;
  let myLobby = -1;
  let peerState = null;
  let cbs = {};

  function connect(handlers) {
    cbs = handlers || {};
    if (ws && ws.readyState < 2) { ws.close(); }
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    try {
      ws = new WebSocket(`${proto}//${location.host}`);
    } catch (_) {
      if (cbs.onError) cbs.onError('No se pudo conectar al servidor');
      return;
    }

    ws.onopen = () => {
      sendRaw({ type: 'lobby_status' });
      if (cbs.onConnected) cbs.onConnected();
    };

    ws.onmessage = (ev) => {
      let data;
      try { data = JSON.parse(ev.data); } catch { return; }
      switch (data.type) {
        case 'lobby_status':
          if (cbs.onLobbyStatus) cbs.onLobbyStatus(data.lobbies);
          break;
        case 'joined':
          playerId = data.playerId;
          myLobby = data.lobby;
          if (cbs.onJoined) cbs.onJoined(data.playerId, data.lobby, data.count);
          break;
        case 'peer_joined':
          if (cbs.onPeerJoined) cbs.onPeerJoined();
          break;
        case 'game_ready':
          if (cbs.onGameReady) cbs.onGameReady(data.playerId);
          break;
        case 'state':
          peerState = data;
          if (cbs.onPeerState) cbs.onPeerState(data);
          break;
        case 'peer_left':
          peerState = null;
          if (cbs.onPeerLeft) cbs.onPeerLeft();
          break;
        case 'lobby_full':
          if (cbs.onLobbyFull) cbs.onLobbyFull(data.lobby);
          break;
      }
    };

    ws.onclose = () => {
      playerId = -1;
      peerState = null;
      myLobby = -1;
      if (cbs.onDisconnect) cbs.onDisconnect();
    };

    ws.onerror = () => {
      if (cbs.onError) cbs.onError('Error de conexion');
    };
  }

  function sendRaw(obj) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(obj));
    }
  }

  function joinLobby(id) {
    sendRaw({ type: 'join', lobby: id });
  }

  function sendState(x, y, lives, score, wave) {
    sendRaw({ type: 'state', x, y, lives, score: score || 0, wave: wave || 1, ts: performance.now() });
  }

  function sendBullet(bx, by, bvx, bvy, br) {
    sendRaw({ type: 'bullet', x: bx, y: by, vx: bvx, vy: bvy, r: br });
  }

  function disconnect() {
    if (ws) { ws.close(); ws = null; }
    playerId = -1;
    peerState = null;
    myLobby = -1;
  }

  window.GameMultiplayer = {
    connect,
    disconnect,
    joinLobby,
    sendState,
    sendBullet,
    isConnected: () => !!(ws && ws.readyState === WebSocket.OPEN),
    getPlayerId: () => playerId,
    getLobby: () => myLobby,
    getPeerState: () => peerState
  };
})();
