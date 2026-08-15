// Room codes avoid ambiguous glyphs (0/O, 1/I/L) so they survive being
// shouted across a living room.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateCode(isTaken: (code: string) => boolean): string {
  for (let attempt = 0; attempt < 200; attempt++) {
    let code = '';
    const bytes = new Uint8Array(5);
    crypto.getRandomValues(bytes);
    for (const b of bytes) code += ALPHABET[b % ALPHABET.length];
    if (!isTaken(code)) return code;
  }
  throw new Error('could not allocate a room code');
}

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z2-9]/g, '');
}
