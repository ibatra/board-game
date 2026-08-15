// mulberry32 — small, fast, deterministic PRNG kept as a plain number in game
// state so reducers stay pure and replays are exact.

export function seedRng(seed: number): number {
  return (seed >>> 0) || 0x9e3779b9;
}

function step(state: number): [number, number] {
  let a = (state + 0x6d2b79f5) >>> 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, a];
}

/** Returns [int in 0..maxExclusive-1, nextRngState]. */
export function nextInt(rngState: number, maxExclusive: number): [number, number] {
  const [value, next] = step(rngState);
  return [Math.floor(value * maxExclusive), next];
}

/** Returns [die 1..6, nextRngState]. */
export function rollDie(rngState: number): [number, number] {
  const [v, next] = nextInt(rngState, 6);
  return [v + 1, next];
}

/** Fisher-Yates shuffle. Returns [shuffledCopy, nextRngState]. */
export function shuffle<T>(items: readonly T[], rngState: number): [T[], number] {
  const arr = items.slice();
  let rng = rngState;
  for (let i = arr.length - 1; i > 0; i--) {
    const [j, next] = nextInt(rng, i + 1);
    rng = next;
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return [arr, rng];
}
