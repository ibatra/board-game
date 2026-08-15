import type { ServerWebSocket } from 'bun';
import {
  getGame,
  type BaseState,
  type ClientMsg,
  type GameDefinition,
  type GameId,
  type LobbySeat,
  type PlayerId,
  type ServerMsg,
} from '@bg/engine';

export interface SocketData {
  roomCode: string | null;
  seat: number | null;
}

type WS = ServerWebSocket<SocketData>;

interface Seat {
  name: string;
  token: string;
  isBot: boolean;
  ready: boolean;
  socket: WS | null;
}

const BOT_DELAY_MS = 900;
/** A disconnected (or stalled) human is auto-played after this long. */
const STALL_TIMEOUT_MS = 45_000;

export class Room {
  readonly code: string;
  readonly gameId: GameId;
  private readonly def: GameDefinition<any, any>;
  private seats: Seat[] = [];
  private hostSeat = 0;
  private state: BaseState | null = null;
  private seq = 0;
  private botTimer: ReturnType<typeof setTimeout> | null = null;
  private stallTimer: ReturnType<typeof setTimeout> | null = null;
  /** When every socket is gone, the manager may garbage-collect after a grace period. */
  emptySince: number | null = null;

  constructor(code: string, gameId: GameId) {
    const def = getGame(gameId);
    if (!def) throw new Error(`unknown game ${gameId}`);
    this.code = code;
    this.gameId = gameId;
    this.def = def;
  }

  get started(): boolean {
    return this.state !== null;
  }

  get playerCount(): number {
    return this.seats.length;
  }

  isFull(): boolean {
    return this.seats.length >= this.def.players.max;
  }

  addPlayer(name: string, socket: WS): { seat: number; token: string } {
    const token = crypto.randomUUID();
    const seat = this.seats.length;
    this.seats.push({ name: sanitizeName(name, seat), token, isBot: false, ready: false, socket });
    socket.data.roomCode = this.code;
    socket.data.seat = seat;
    this.emptySince = null;
    return { seat, token };
  }

  addBot(): void {
    const seat = this.seats.length;
    this.seats.push({ name: `Bot ${seat + 1}`, token: crypto.randomUUID(), isBot: true, ready: true, socket: null });
  }

  removeSeat(index: number): void {
    if (this.started) return;
    const seat = this.seats[index];
    if (!seat) return;
    seat.socket?.close();
    this.seats.splice(index, 1);
    this.seats.forEach((s, i) => {
      if (s.socket) s.socket.data.seat = i;
    });
    if (this.hostSeat >= this.seats.length) this.hostSeat = 0;
  }

  rejoin(token: string, socket: WS): { seat: number } | null {
    const seat = this.seats.findIndex((s) => s.token === token && !s.isBot);
    if (seat < 0) return null;
    this.seats[seat]!.socket?.close();
    this.seats[seat]!.socket = socket;
    socket.data.roomCode = this.code;
    socket.data.seat = seat;
    this.emptySince = null;
    return { seat };
  }

  handleDisconnect(socket: WS): void {
    const seat = socket.data.seat;
    if (seat === null || this.seats[seat]?.socket !== socket) return;
    this.seats[seat]!.socket = null;
    if (!this.started) {
      // In the lobby, departed players free their seat; the host role moves on.
      this.seats.splice(seat, 1);
      this.seats.forEach((s, i) => {
        if (s.socket) s.socket.data.seat = i;
      });
      if (this.hostSeat === seat) this.hostSeat = this.seats.findIndex((s) => !s.isBot && s.socket);
      if (this.hostSeat < 0) this.hostSeat = 0;
      this.broadcastLobby();
    } else {
      this.broadcastLobby();
      this.armStallTimer();
    }
    if (this.seats.every((s) => !s.socket)) this.emptySince = Date.now();
  }

  handleMessage(socket: WS, msg: ClientMsg): void {
    const seat = socket.data.seat;
    if (seat === null || !this.seats[seat]) return;

    switch (msg.t) {
      case 'setReady':
        if (this.started) return;
        this.seats[seat]!.ready = msg.ready;
        this.broadcastLobby();
        return;
      case 'addBot':
        if (this.started || seat !== this.hostSeat) return this.deny(socket, 'NOT_HOST', 'Only the host can add bots');
        if (this.isFull()) return this.deny(socket, 'ROOM_FULL', 'Room is full');
        this.addBot();
        this.broadcastLobby();
        return;
      case 'removeSeat':
        if (this.started || seat !== this.hostSeat) return this.deny(socket, 'NOT_HOST', 'Only the host can remove seats');
        if (msg.seat === this.hostSeat) return;
        this.removeSeat(msg.seat);
        this.broadcastLobby();
        return;
      case 'startGame': {
        if (this.started) return;
        if (seat !== this.hostSeat) return this.deny(socket, 'NOT_HOST', 'Only the host can start');
        const n = this.seats.length;
        if (n < this.def.players.min || n > this.def.players.max) {
          return this.deny(socket, 'BAD_MESSAGE', `${this.def.name} needs ${this.def.players.min}–${this.def.players.max} players`);
        }
        const seed = crypto.getRandomValues(new Uint32Array(1))[0]!;
        this.state = this.def.setup(n, seed);
        this.seq = 0;
        this.broadcastLobby();
        this.broadcastState();
        this.scheduleBots();
        return;
      }
      case 'action': {
        if (!this.state) return;
        const result = this.def.reduce(this.state, msg.action, seat as PlayerId);
        if (!result.ok) {
          this.send(socket, { t: 'actionRejected', seq: msg.seq, error: result.error });
          return;
        }
        this.state = result.state;
        this.seq++;
        this.broadcastState();
        this.afterAdvance();
        return;
      }
      case 'requestSync':
        this.sendSync(socket);
        return;
      default:
        return;
    }
  }

  sendSync(socket: WS): void {
    this.send(socket, this.lobbyMsg());
    const seat = socket.data.seat;
    if (this.state && seat !== null) {
      this.send(socket, {
        t: 'state',
        view: this.def.view(this.state, seat as PlayerId),
        seq: this.seq,
        yourSeat: seat,
      });
    }
  }

  broadcastLobby(): void {
    const msg = this.lobbyMsg();
    for (const seat of this.seats) if (seat.socket) this.send(seat.socket, msg);
  }

  private lobbyMsg(): ServerMsg {
    const seats: LobbySeat[] = this.seats.map((s) => ({
      name: s.name,
      connected: s.isBot || s.socket !== null,
      ready: s.ready,
      isBot: s.isBot,
    }));
    return { t: 'lobby', code: this.code, gameId: this.gameId, hostSeat: this.hostSeat, started: this.started, seats };
  }

  private broadcastState(): void {
    if (!this.state) return;
    for (let i = 0; i < this.seats.length; i++) {
      const socket = this.seats[i]!.socket;
      if (!socket) continue;
      this.send(socket, { t: 'state', view: this.def.view(this.state, i as PlayerId), seq: this.seq, yourSeat: i });
    }
    if (this.state.result) {
      for (const seat of this.seats) {
        if (seat.socket) this.send(seat.socket, { t: 'gameOver', result: this.state.result });
      }
    }
  }

  /** After any state change: run bots, and watch stalled/disconnected humans. */
  private afterAdvance(): void {
    this.scheduleBots();
    this.armStallTimer();
  }

  private actorToAct(): PlayerId | null {
    if (!this.state || this.state.result) return null;
    for (let i = 0; i < this.seats.length; i++) {
      if (this.def.legalActions(this.state, i).length > 0) return i as PlayerId;
    }
    return null;
  }

  private scheduleBots(): void {
    if (this.botTimer) clearTimeout(this.botTimer);
    if (!this.state || this.state.result || !this.def.ai) return;
    const actor = this.actorToAct();
    if (actor === null || !this.seats[actor]!.isBot) return;
    this.botTimer = setTimeout(() => {
      if (!this.state || this.state.result || !this.def.ai) return;
      const current = this.actorToAct();
      if (current === null || !this.seats[current]!.isBot) return;
      const result = this.def.reduce(this.state, this.def.ai(this.state, current), current);
      if (!result.ok) return; // AI bug — freeze rather than corrupt
      this.state = result.state;
      this.seq++;
      this.broadcastState();
      this.afterAdvance();
    }, BOT_DELAY_MS);
  }

  /** If the seat that must act is a disconnected human, auto-play them after a grace period. */
  private armStallTimer(): void {
    if (this.stallTimer) clearTimeout(this.stallTimer);
    if (!this.state || this.state.result || !this.def.ai) return;
    const actor = this.actorToAct();
    if (actor === null) return;
    const seat = this.seats[actor]!;
    if (seat.isBot || seat.socket !== null) return;
    this.stallTimer = setTimeout(() => {
      if (!this.state || this.state.result || !this.def.ai) return;
      const current = this.actorToAct();
      if (current === null) return;
      const cur = this.seats[current]!;
      if (cur.isBot || cur.socket !== null) return;
      const result = this.def.reduce(this.state, this.def.ai(this.state, current), current);
      if (!result.ok) return;
      this.state = result.state;
      this.seq++;
      this.broadcastState();
      this.afterAdvance();
    }, STALL_TIMEOUT_MS);
  }

  private deny(socket: WS, code: 'NOT_HOST' | 'ROOM_FULL' | 'BAD_MESSAGE', msg: string): void {
    this.send(socket, { t: 'error', code, msg });
  }

  private send(socket: WS, msg: ServerMsg): void {
    socket.send(JSON.stringify(msg));
  }

  destroy(): void {
    if (this.botTimer) clearTimeout(this.botTimer);
    if (this.stallTimer) clearTimeout(this.stallTimer);
    for (const seat of this.seats) seat.socket?.close();
  }
}

function sanitizeName(raw: string, seat: number): string {
  const name = raw.trim().slice(0, 16);
  return name.length > 0 ? name : `Player ${seat + 1}`;
}
