import { WebSocketServer, WebSocket } from 'ws';

type Role = 'client' | 'control';

type Room = {
  client?: WebSocket;
  control?: WebSocket;
};

const port = Number(process.env.WS_PORT || 4000);
const rooms = new Map<string, Room>();

function isSixDigit(code: unknown): code is string {
  return typeof code === 'string' && /^\d{6}$/.test(code);
}

const wss = new WebSocketServer({ port });

wss.on('connection', (ws: WebSocket) => {
  let joinedCode: string | null = null;
  let role: Role | null = null;

  ws.on('message', (data) => {
    let msg: any;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }

    if (msg?.type === 'join') {
      const { code, role: joinRole } = msg as { code: string; role: Role };
      if (!isSixDigit(code) || (joinRole !== 'client' && joinRole !== 'control')) {
        ws.send(JSON.stringify({ type: 'error', error: 'INVALID_JOIN' }));
        return;
      }

      joinedCode = code;
      role = joinRole;
      const room = rooms.get(code) || {};
      // Close existing same-role connection if any
      if (room[joinRole] && room[joinRole] !== ws) {
        try { room[joinRole]!.close(); } catch {}
      }
      room[joinRole] = ws;
      rooms.set(code, room);
      ws.send(JSON.stringify({ type: 'joined', code, role }));
      broadcastPeerStatus(code);
      return;
    }

    if (!joinedCode || !role) {
      ws.send(JSON.stringify({ type: 'error', error: 'NOT_JOINED' }));
      return;
    }

    if (msg?.type === 'play') {
      const { url } = msg as { url: string };
      const room = rooms.get(joinedCode);
      if (!room) return;
      const target = room.client;
      if (target && target.readyState === WebSocket.OPEN) {
        target.send(JSON.stringify({ type: 'play', url }));
        ws.send(JSON.stringify({ type: 'ack', action: 'play' }));
      } else {
        ws.send(JSON.stringify({ type: 'error', error: 'CLIENT_NOT_CONNECTED' }));
      }
      return;
    }

    if (msg?.type === 'pause' || msg?.type === 'resume') {
      const room = rooms.get(joinedCode);
      if (!room) return;
      const target = room.client;
      if (target && target.readyState === WebSocket.OPEN) {
        target.send(JSON.stringify({ type: 'control', action: msg.type }));
        ws.send(JSON.stringify({ type: 'ack', action: msg.type }));
      } else {
        ws.send(JSON.stringify({ type: 'error', error: 'CLIENT_NOT_CONNECTED' }));
      }
      return;
    }

    if (msg?.type === 'speed' && typeof msg.speed === 'number') {
      const room = rooms.get(joinedCode);
      if (!room) return;
      const target = room.client;
      if (target && target.readyState === WebSocket.OPEN) {
        // Clamp speed 0.25 - 2
        const speed = Math.max(0.25, Math.min(2, msg.speed));
        target.send(JSON.stringify({ type: 'control', action: 'speed', speed }));
        ws.send(JSON.stringify({ type: 'ack', action: 'speed', speed }));
      } else {
        ws.send(JSON.stringify({ type: 'error', error: 'CLIENT_NOT_CONNECTED' }));
      }
      return;
    }

    if (msg?.type === 'stop') {
      const room = rooms.get(joinedCode);
      if (!room) return;
      const target = room.client;
      if (target && target.readyState === WebSocket.OPEN) {
        target.send(JSON.stringify({ type: 'control', action: 'stop' }));
        ws.send(JSON.stringify({ type: 'ack', action: 'stop' }));
      } else {
        ws.send(JSON.stringify({ type: 'error', error: 'CLIENT_NOT_CONNECTED' }));
      }
      return;
    }

    if (msg?.type === 'seek' && typeof msg.seconds === 'number') {
      const room = rooms.get(joinedCode);
      if (!room) return;
      const target = room.client;
      if (target && target.readyState === WebSocket.OPEN) {
        const seconds = Number(msg.seconds);
        target.send(JSON.stringify({ type: 'control', action: 'seek', seconds }));
        ws.send(JSON.stringify({ type: 'ack', action: 'seek', seconds }));
      } else {
        ws.send(JSON.stringify({ type: 'error', error: 'CLIENT_NOT_CONNECTED' }));
      }
      return;
    }

    if (msg?.type === 'next' || msg?.type === 'previous') {
      const room = rooms.get(joinedCode);
      if (!room) return;
      const target = room.client;
      if (target && target.readyState === WebSocket.OPEN) {
        target.send(JSON.stringify({ type: 'control', action: msg.type }));
        ws.send(JSON.stringify({ type: 'ack', action: msg.type }));
      } else {
        ws.send(JSON.stringify({ type: 'error', error: 'CLIENT_NOT_CONNECTED' }));
      }
      return;
    }
  });

  ws.on('close', () => {
    if (!joinedCode || !role) return;
    const room = rooms.get(joinedCode);
    if (!room) return;
    if (room[role] === ws) {
      delete room[role];
    }
    if (!room.client && !room.control) {
      rooms.delete(joinedCode);
    } else {
      rooms.set(joinedCode, room);
    }
    broadcastPeerStatus(joinedCode);
  });
});

// eslint-disable-next-line no-console
console.log(`[ws-server] listening on ws://localhost:${port}`);

function broadcastPeerStatus(code: string) {
  const room = rooms.get(code);
  if (!room) return;
  const payload = JSON.stringify({
    type: 'peer_status',
    clientPresent: !!room.client && room.client.readyState === WebSocket.OPEN,
    controlPresent: !!room.control && room.control.readyState === WebSocket.OPEN,
  });
  try { room.client?.send(payload); } catch {}
  try { room.control?.send(payload); } catch {}
}


