import { getGame, type ClientMsg, type ServerMsg } from '@bg/engine';
import { RoomManager } from './roomManager';
import type { SocketData } from './room';

const manager = new RoomManager();

const server = Bun.serve<SocketData, never>({
  port: Number(process.env.PORT ?? 3001),
  fetch(req, srv) {
    const url = new URL(req.url);
    if (url.pathname === '/ws') {
      const upgraded = srv.upgrade(req, { data: { roomCode: null, seat: null } });
      return upgraded ? undefined : new Response('websocket upgrade failed', { status: 400 });
    }
    if (url.pathname === '/health') return new Response('ok');
    return new Response('board-game server', { status: 200 });
  },
  websocket: {
    message(ws, raw) {
      let msg: ClientMsg;
      try {
        msg = JSON.parse(String(raw));
      } catch {
        return send(ws, { t: 'error', code: 'BAD_MESSAGE', msg: 'Invalid JSON' });
      }

      // Joining/creating/rejoining are handled here; everything else is room-scoped.
      if (msg.t === 'createRoom') {
        if (!getGame(msg.gameId)) return send(ws, { t: 'error', code: 'BAD_MESSAGE', msg: 'Unknown game' });
        const room = manager.create(msg.gameId);
        const { seat, token } = room.addPlayer(msg.name, ws);
        send(ws, { t: 'roomJoined', code: room.code, token, seat, gameId: room.gameId });
        room.broadcastLobby();
        return;
      }
      if (msg.t === 'joinRoom') {
        const room = manager.get(msg.code);
        if (!room) return send(ws, { t: 'error', code: 'ROOM_NOT_FOUND', msg: 'No room with that code' });
        if (room.started) return send(ws, { t: 'error', code: 'GAME_STARTED', msg: 'Game already started — ask for a rejoin link' });
        if (room.isFull()) return send(ws, { t: 'error', code: 'ROOM_FULL', msg: 'Room is full' });
        const { seat, token } = room.addPlayer(msg.name, ws);
        send(ws, { t: 'roomJoined', code: room.code, token, seat, gameId: room.gameId });
        room.broadcastLobby();
        return;
      }
      if (msg.t === 'rejoin') {
        const room = manager.get(msg.code);
        if (!room) return send(ws, { t: 'error', code: 'ROOM_NOT_FOUND', msg: 'That room is gone' });
        const res = room.rejoin(msg.token, ws);
        if (!res) return send(ws, { t: 'error', code: 'BAD_TOKEN', msg: 'Could not rejoin with that token' });
        send(ws, { t: 'roomJoined', code: room.code, token: msg.token, seat: res.seat, gameId: room.gameId });
        room.broadcastLobby();
        room.sendSync(ws);
        return;
      }
      if (msg.t === 'leaveRoom') {
        const room = ws.data.roomCode ? manager.get(ws.data.roomCode) : undefined;
        room?.handleDisconnect(ws);
        ws.data.roomCode = null;
        ws.data.seat = null;
        return;
      }

      const room = ws.data.roomCode ? manager.get(ws.data.roomCode) : undefined;
      if (!room) return send(ws, { t: 'error', code: 'ROOM_NOT_FOUND', msg: 'Join a room first' });
      room.handleMessage(ws, msg);
    },
    close(ws) {
      const room = ws.data.roomCode ? manager.get(ws.data.roomCode) : undefined;
      room?.handleDisconnect(ws);
    },
  },
});

function send(ws: { send(data: string): void }, msg: ServerMsg): void {
  ws.send(JSON.stringify(msg));
}

console.log(`board-game server listening on :${server.port}`);
