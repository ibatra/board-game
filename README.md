# 🎲 Games Night

A mobile-first board games web app: **Monopoly (full classic rules)**, **Ludo**,
**Snakes & Ladders**, **Connect Four**, and **Tic-Tac-Toe** — playable
pass-and-play on one phone, against simple AI, or **online in private rooms**
where everyone at games night joins on their own phone with a 5-letter code.

Built with **Bun · TypeScript · Vite · React · Tailwind CSS v4 · Zustand**.

## Quick start

```sh
bun install

# terminal 1 — WebSocket game server (port 3001)
bun run dev:server

# terminal 2 — web app (port 5173, proxies /ws to the server)
bun run dev:web
```

Open http://localhost:5173. For phones on your LAN:
`bun run dev:web -- --host` and open `http://<your-ip>:5173`.

```sh
bun test           # engine test suite (rules, AI, invariants)
bun run typecheck  # strict TS across all packages
bun run build      # production build of the web app
```

## How it's put together

```
packages/engine   pure TypeScript game logic — no UI, no IO
apps/web          Vite + React + Tailwind mobile-first client
apps/server       Bun WebSocket server for online rooms
```

Every game implements one `GameDefinition` interface: `setup`, a pure
`reduce(state, action, actor)` that validates and applies actions,
`legalActions`, a per-player `view` (Monopoly hides card deck order), and an
optional `ai` move picker. Randomness lives *inside* game state as a PRNG
counter, so reducers are deterministic and replayable — the same engine runs
in the browser for pass-and-play/AI and authoritatively on the server for
online play, which syncs by broadcasting per-seat state snapshots.

### Online rooms

- Create a room, share the code (or invite link) — up to 6 seats, host can add
  server-side bots.
- Reconnect tokens are kept on-device for 2 hours: refreshing, locking your
  phone, or briefly dropping off WiFi rejoins the same seat automatically.
- If the player who must act stays disconnected for 45 s, the server's AI
  plays their move so the table never stalls. Empty rooms are removed after
  30 minutes.

### Monopoly rules included

Buying, always-auction on declined purchases (turn-based bidding), full rent
tables (sets double base rent, railroad ladder, utility dice multiples),
even-build houses/hotels limited by the bank's real 32/12 stock, mortgages
with 10 % interest, trading (cash, properties, jail cards, mortgage-transfer
fees), jail (bail, cards, doubles), all 32 Chance/Community Chest cards,
debt resolution, bankruptcy with asset transfer, and final rankings.

Small deliberate simplifications: bank-held properties after a bankruptcy
become purchasable again instead of being re-auctioned immediately;
"pay each player" shortfalls become a single bank debt; a broke player who
fails their third jail roll keeps trying rather than entering forced debt.
