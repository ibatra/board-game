export type TileGroup =
  | 'brown' | 'lightblue' | 'pink' | 'orange' | 'red' | 'yellow' | 'green' | 'darkblue'
  | 'railroad' | 'utility';

export type Tile =
  | { kind: 'go' }
  | { kind: 'street'; name: string; group: TileGroup; price: number; rents: [number, number, number, number, number, number] }
  | { kind: 'railroad'; name: string; price: number }
  | { kind: 'utility'; name: string; price: number }
  | { kind: 'tax'; name: string; amount: number }
  | { kind: 'chance' }
  | { kind: 'chest' }
  | { kind: 'jail' }
  | { kind: 'freeParking' }
  | { kind: 'goToJail' };

const s = (
  name: string,
  group: TileGroup,
  price: number,
  rents: [number, number, number, number, number, number],
): Tile => ({ kind: 'street', name, group, price, rents });

export const TILES: Tile[] = [
  { kind: 'go' },
  s('Mediterranean Avenue', 'brown', 60, [2, 10, 30, 90, 160, 250]),
  { kind: 'chest' },
  s('Baltic Avenue', 'brown', 60, [4, 20, 60, 180, 320, 450]),
  { kind: 'tax', name: 'Income Tax', amount: 200 },
  { kind: 'railroad', name: 'Reading Railroad', price: 200 },
  s('Oriental Avenue', 'lightblue', 100, [6, 30, 90, 270, 400, 550]),
  { kind: 'chance' },
  s('Vermont Avenue', 'lightblue', 100, [6, 30, 90, 270, 400, 550]),
  s('Connecticut Avenue', 'lightblue', 120, [8, 40, 100, 300, 450, 600]),
  { kind: 'jail' },
  s('St. Charles Place', 'pink', 140, [10, 50, 150, 450, 625, 750]),
  { kind: 'utility', name: 'Electric Company', price: 150 },
  s('States Avenue', 'pink', 140, [10, 50, 150, 450, 625, 750]),
  s('Virginia Avenue', 'pink', 160, [12, 60, 180, 500, 700, 900]),
  { kind: 'railroad', name: 'Pennsylvania Railroad', price: 200 },
  s('St. James Place', 'orange', 180, [14, 70, 200, 550, 750, 950]),
  { kind: 'chest' },
  s('Tennessee Avenue', 'orange', 180, [14, 70, 200, 550, 750, 950]),
  s('New York Avenue', 'orange', 200, [16, 80, 220, 600, 800, 1000]),
  { kind: 'freeParking' },
  s('Kentucky Avenue', 'red', 220, [18, 90, 250, 700, 875, 1050]),
  { kind: 'chance' },
  s('Indiana Avenue', 'red', 220, [18, 90, 250, 700, 875, 1050]),
  s('Illinois Avenue', 'red', 240, [20, 100, 300, 750, 925, 1100]),
  { kind: 'railroad', name: 'B&O Railroad', price: 200 },
  s('Atlantic Avenue', 'yellow', 260, [22, 110, 330, 800, 975, 1150]),
  s('Ventnor Avenue', 'yellow', 260, [22, 110, 330, 800, 975, 1150]),
  { kind: 'utility', name: 'Water Works', price: 150 },
  s('Marvin Gardens', 'yellow', 280, [24, 120, 360, 850, 1025, 1200]),
  { kind: 'goToJail' },
  s('Pacific Avenue', 'green', 300, [26, 130, 390, 900, 1100, 1275]),
  s('North Carolina Avenue', 'green', 300, [26, 130, 390, 900, 1100, 1275]),
  { kind: 'chest' },
  s('Pennsylvania Avenue', 'green', 320, [28, 150, 450, 1000, 1200, 1400]),
  { kind: 'railroad', name: 'Short Line', price: 200 },
  { kind: 'chance' },
  s('Park Place', 'darkblue', 350, [35, 175, 500, 1100, 1300, 1500]),
  { kind: 'tax', name: 'Luxury Tax', amount: 100 },
  s('Boardwalk', 'darkblue', 400, [50, 200, 600, 1400, 1700, 2000]),
];

export const GO_SALARY = 200;
export const JAIL_TILE = 10;
export const JAIL_BAIL = 50;
export const TOTAL_HOUSES = 32;
export const TOTAL_HOTELS = 12;
export const STARTING_CASH = 1500;

export const HOUSE_COST: Record<string, number> = {
  brown: 50, lightblue: 50,
  pink: 100, orange: 100,
  red: 150, yellow: 150,
  green: 200, darkblue: 200,
};

export const RAILROAD_RENTS = [0, 25, 50, 100, 200];

/** Tile indices per group, derived from the board. */
export const GROUP_TILES: Record<string, number[]> = {};
TILES.forEach((tile, i) => {
  if (tile.kind === 'street') (GROUP_TILES[tile.group] ??= []).push(i);
  if (tile.kind === 'railroad') (GROUP_TILES['railroad'] ??= []).push(i);
  if (tile.kind === 'utility') (GROUP_TILES['utility'] ??= []).push(i);
});

/** Every purchasable tile index. */
export const PURCHASABLE: number[] = TILES.map((t, i) =>
  t.kind === 'street' || t.kind === 'railroad' || t.kind === 'utility' ? i : -1,
).filter((i) => i >= 0);

export function tileName(idx: number): string {
  const t = TILES[idx]!;
  switch (t.kind) {
    case 'go': return 'GO';
    case 'chance': return 'Chance';
    case 'chest': return 'Community Chest';
    case 'jail': return 'Jail';
    case 'freeParking': return 'Free Parking';
    case 'goToJail': return 'Go To Jail';
    case 'tax': return t.name;
    default: return t.name;
  }
}

export type CardEffect =
  | { kind: 'moveTo'; tile: number }
  | { kind: 'nearestRailroad' }
  | { kind: 'nearestUtility' }
  | { kind: 'moveBack'; n: number }
  | { kind: 'goToJail' }
  | { kind: 'jailFree' }
  | { kind: 'collect'; amount: number }
  | { kind: 'pay'; amount: number }
  | { kind: 'collectEach'; amount: number }
  | { kind: 'payEach'; amount: number }
  | { kind: 'repairs'; house: number; hotel: number };

export interface Card {
  text: string;
  effect: CardEffect;
}

export const CHANCE_CARDS: Card[] = [
  { text: 'Advance to GO. Collect $200.', effect: { kind: 'moveTo', tile: 0 } },
  { text: 'Advance to Illinois Avenue.', effect: { kind: 'moveTo', tile: 24 } },
  { text: 'Advance to St. Charles Place.', effect: { kind: 'moveTo', tile: 11 } },
  { text: 'Advance to the nearest Utility. If owned, pay 10× your dice roll.', effect: { kind: 'nearestUtility' } },
  { text: 'Advance to the nearest Railroad. Pay double rent if owned.', effect: { kind: 'nearestRailroad' } },
  { text: 'Advance to the nearest Railroad. Pay double rent if owned.', effect: { kind: 'nearestRailroad' } },
  { text: 'Bank pays you a dividend of $50.', effect: { kind: 'collect', amount: 50 } },
  { text: 'Get Out of Jail Free.', effect: { kind: 'jailFree' } },
  { text: 'Go back 3 spaces.', effect: { kind: 'moveBack', n: 3 } },
  { text: 'Go directly to Jail. Do not pass GO.', effect: { kind: 'goToJail' } },
  { text: 'Make general repairs: pay $25 per house and $100 per hotel.', effect: { kind: 'repairs', house: 25, hotel: 100 } },
  { text: 'Speeding fine. Pay $15.', effect: { kind: 'pay', amount: 15 } },
  { text: 'Take a trip to Reading Railroad.', effect: { kind: 'moveTo', tile: 5 } },
  { text: 'Take a walk on the Boardwalk.', effect: { kind: 'moveTo', tile: 39 } },
  { text: 'You have been elected chairman. Pay each player $50.', effect: { kind: 'payEach', amount: 50 } },
  { text: 'Your building loan matures. Collect $150.', effect: { kind: 'collect', amount: 150 } },
];

export const CHEST_CARDS: Card[] = [
  { text: 'Advance to GO. Collect $200.', effect: { kind: 'moveTo', tile: 0 } },
  { text: 'Bank error in your favor. Collect $200.', effect: { kind: 'collect', amount: 200 } },
  { text: "Doctor's fee. Pay $50.", effect: { kind: 'pay', amount: 50 } },
  { text: 'From sale of stock you get $50.', effect: { kind: 'collect', amount: 50 } },
  { text: 'Get Out of Jail Free.', effect: { kind: 'jailFree' } },
  { text: 'Go directly to Jail. Do not pass GO.', effect: { kind: 'goToJail' } },
  { text: 'Holiday fund matures. Collect $100.', effect: { kind: 'collect', amount: 100 } },
  { text: 'Income tax refund. Collect $20.', effect: { kind: 'collect', amount: 20 } },
  { text: 'It is your birthday. Collect $10 from every player.', effect: { kind: 'collectEach', amount: 10 } },
  { text: 'Life insurance matures. Collect $100.', effect: { kind: 'collect', amount: 100 } },
  { text: 'Pay hospital fees of $100.', effect: { kind: 'pay', amount: 100 } },
  { text: 'Pay school fees of $50.', effect: { kind: 'pay', amount: 50 } },
  { text: 'Receive $25 consultancy fee.', effect: { kind: 'collect', amount: 25 } },
  { text: 'Street repairs: pay $40 per house and $115 per hotel.', effect: { kind: 'repairs', house: 40, hotel: 115 } },
  { text: 'You won second prize in a beauty contest. Collect $10.', effect: { kind: 'collect', amount: 10 } },
  { text: 'You inherit $100.', effect: { kind: 'collect', amount: 100 } },
];
