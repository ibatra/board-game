// 15x15-grid coordinates for the classic cross board. Cell units; the SVG
// scales them by CELL. Path index i is the engine's absolute track square i.

export const CELL = 40;
export const SIZE = CELL * 15;

export const TRACK_PATH: Array<[number, number]> = [
  [6, 13], [6, 12], [6, 11], [6, 10], [6, 9],
  [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  [0, 7],
  [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
  [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0],
  [7, 0],
  [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
  [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6],
  [14, 7],
  [14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8],
  [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14],
  [7, 14],
  [6, 14],
];

/** Home-run cells per seat, index 0..4 walking toward the center. */
export const HOME_RUNS: Array<Array<[number, number]>> = [
  [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
];

/** Yard quadrant origin (top-left cell) per seat; each yard is 6x6. */
export const YARDS: Array<[number, number]> = [
  [0, 9],   // seat 0: bottom-left
  [0, 0],   // seat 1: top-left
  [9, 0],   // seat 2: top-right
  [9, 9],   // seat 3: bottom-right
];

/** The four resting spots for tokens inside a yard, in cell coords. */
export function yardSpots(seat: number): Array<[number, number]> {
  const [ox, oy] = YARDS[seat]!;
  return [
    [ox + 1.5, oy + 1.5],
    [ox + 3.5, oy + 1.5],
    [ox + 1.5, oy + 3.5],
    [ox + 3.5, oy + 3.5],
  ];
}

/** Where finished tokens sit, fanned around the center per seat. */
export const HOME_SPOTS: Array<[number, number]> = [
  [7, 8.2],
  [6.2, 7],
  [7, 5.8],
  [7.8, 7],
];
