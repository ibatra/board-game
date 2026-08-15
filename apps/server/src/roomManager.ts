import type { GameId } from '@bg/engine';
import { generateCode, normalizeCode } from './codes';
import { Room } from './room';

const EMPTY_ROOM_TTL_MS = 30 * 60 * 1000;

export class RoomManager {
  private rooms = new Map<string, Room>();

  constructor() {
    setInterval(() => this.sweep(), 60_000);
  }

  create(gameId: GameId): Room {
    const code = generateCode((c) => this.rooms.has(c));
    const room = new Room(code, gameId);
    this.rooms.set(code, room);
    return room;
  }

  get(rawCode: string): Room | undefined {
    return this.rooms.get(normalizeCode(rawCode));
  }

  private sweep(): void {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      if (room.emptySince !== null && now - room.emptySince > EMPTY_ROOM_TTL_MS) {
        room.destroy();
        this.rooms.delete(code);
      }
    }
  }
}
