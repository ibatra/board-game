import { create } from 'zustand';
import type { BaseState, ClientMsg, GameId, LobbySeat, PlayerId, ServerMsg } from '@bg/engine';
import type { AnyAction, GameSession, SeatConfig } from './types';

const MAX_BACKOFF_MS = 8000;

interface StoredRoom {
  code: string;
  token: string;
  expires: number;
}

function storeToken(code: string, token: string): void {
  const record: StoredRoom = { code, token, expires: Date.now() + 2 * 60 * 60 * 1000 };
  try {
    sessionStorage.setItem(`room:${code}`, JSON.stringify(record));
    localStorage.setItem(`room:${code}`, JSON.stringify(record));
  } catch {
    // storage may be unavailable in private browsing; reconnect just won't survive
  }
}

export function storedToken(code: string): string | null {
  for (const storage of [sessionStorage, localStorage]) {
    try {
      const raw = storage.getItem(`room:${code}`);
      if (!raw) continue;
      const record = JSON.parse(raw) as StoredRoom;
      if (record.expires > Date.now()) return record.token;
    } catch {
      // fall through
    }
  }
  return null;
}

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error';

interface OnlineSessionStore extends GameSession {
  status: ConnectionStatus;
  errorMsg: string | null;
  roomCode: string | null;
  gameId: GameId | null;
  hostSeat: number;
  started: boolean;
  lobbySeats: LobbySeat[];
  gameResultSeen: boolean;

  connect(intent: ConnectIntent): void;
  leave(): void;
  setReady(ready: boolean): void;
  startGame(): void;
  addBot(): void;
  removeSeat(seat: number): void;
}

export type ConnectIntent =
  | { kind: 'create'; gameId: GameId; name: string }
  | { kind: 'join'; code: string; name: string }
  | { kind: 'rejoin'; code: string };

let ws: WebSocket | null = null;
let backoff = 500;
let closedByUs = false;
let seq = 0;
let visibilityHooked = false;

function wsUrl(): string {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}/ws`;
}

export const useOnlineSession = create<OnlineSessionStore>((set, get) => {
  function sendMsg(msg: ClientMsg): void {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }

  function openSocket(onOpen: () => void): void {
    closedByUs = false;
    const sock = new WebSocket(wsUrl());
    ws = sock;
    sock.onopen = () => {
      if (ws !== sock) return;
      backoff = 500;
      onOpen();
    };
    sock.onmessage = (event) => {
      if (ws !== sock) return;
      let msg: ServerMsg;
      try {
        msg = JSON.parse(String(event.data));
      } catch {
        return;
      }
      handleServer(msg);
    };
    sock.onclose = () => {
      // A socket we already replaced is not our problem.
      if (ws !== sock || closedByUs) return;
      const { roomCode, status } = get();
      if (roomCode && status !== 'error') {
        set({ status: 'reconnecting' });
        const delay = backoff;
        backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
        setTimeout(() => {
          if (!closedByUs && get().roomCode) get().connect({ kind: 'rejoin', code: get().roomCode! });
        }, delay);
      } else {
        set({ status: 'idle' });
      }
    };
  }

  function handleServer(msg: ServerMsg): void {
    switch (msg.t) {
      case 'roomJoined':
        storeToken(msg.code, msg.token);
        set({
          roomCode: msg.code,
          gameId: msg.gameId,
          myPlayerId: msg.seat as PlayerId,
          status: 'connected',
          errorMsg: null,
        });
        return;
      case 'lobby': {
        const seats: SeatConfig[] = msg.seats.map((s) => ({ name: s.name, isBot: s.isBot }));
        set({
          lobbySeats: msg.seats,
          seats,
          hostSeat: msg.hostSeat,
          started: msg.started,
          gameId: msg.gameId,
        });
        return;
      }
      case 'state':
        set({ state: msg.view as BaseState, myPlayerId: msg.yourSeat as PlayerId, started: true });
        return;
      case 'actionRejected':
        set({ lastError: msg.error });
        return;
      case 'gameOver':
        return; // result is inside the state view
      case 'error':
        if (msg.code === 'BAD_TOKEN' || msg.code === 'ROOM_NOT_FOUND') {
          set({ status: 'error', errorMsg: msg.msg });
        } else {
          set({ lastError: msg.msg });
        }
        return;
    }
  }

  function hookVisibility(): void {
    if (visibilityHooked) return;
    visibilityHooked = true;
    // Phones kill background sockets; resync the moment we're visible again.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      const { roomCode } = get();
      if (!roomCode) return;
      if (ws?.readyState === WebSocket.OPEN) sendMsg({ t: 'requestSync' });
      else get().connect({ kind: 'rejoin', code: roomCode });
    });
  }

  return {
    state: null as unknown as BaseState,
    seats: [],
    myPlayerId: null,
    lastError: null,
    status: 'idle',
    errorMsg: null,
    roomCode: null,
    gameId: null,
    hostSeat: 0,
    started: false,
    lobbySeats: [],
    gameResultSeen: false,

    connect(intent) {
      hookVisibility();
      ws?.close();
      set({ status: get().roomCode ? 'reconnecting' : 'connecting', errorMsg: null });
      if (intent.kind === 'rejoin') {
        const token = storedToken(intent.code);
        if (!token) {
          set({ status: 'error', errorMsg: 'No saved seat for this room on this device' });
          return;
        }
        openSocket(() => sendMsg({ t: 'rejoin', code: intent.code, token }));
      } else if (intent.kind === 'create') {
        openSocket(() => sendMsg({ t: 'createRoom', gameId: intent.gameId, name: intent.name }));
      } else {
        openSocket(() => sendMsg({ t: 'joinRoom', code: intent.code, name: intent.name }));
      }
    },

    leave() {
      closedByUs = true;
      sendMsg({ t: 'leaveRoom' });
      ws?.close();
      ws = null;
      set({
        status: 'idle',
        roomCode: null,
        gameId: null,
        started: false,
        lobbySeats: [],
        seats: [],
        myPlayerId: null,
        state: null as unknown as BaseState,
        errorMsg: null,
        lastError: null,
      });
    },

    setReady(ready) {
      sendMsg({ t: 'setReady', ready });
    },
    startGame() {
      sendMsg({ t: 'startGame' });
    },
    addBot() {
      sendMsg({ t: 'addBot' });
    },
    removeSeat(seat) {
      sendMsg({ t: 'removeSeat', seat });
    },

    dispatch(action: AnyAction) {
      sendMsg({ t: 'action', seq: ++seq, action });
    },
  };
});
