/** Per-game illustrations + palette. Small enough to inline, sharp at any size. */

export type GameTheme = {
  /** Tailwind gradient stops for the card tile. */
  tile: string;
  /** Solid accent for rings, headers, and hovers. */
  accent: string;
};

export const GAME_THEME: Record<string, GameTheme> = {
  tictactoe: { tile: 'from-[#3b2f77] to-[#1b1740]', accent: '#a78bfa' },
  connect4: { tile: 'from-[#123a63] to-[#0d1f3d]', accent: '#38bdf8' },
  snakes: { tile: 'from-[#14503a] to-[#0c2a22]', accent: '#4ade9b' },
  ludo: { tile: 'from-[#5a2340] to-[#2a1128]', accent: '#f43f7a' },
  monopoly: { tile: 'from-[#6b3a12] to-[#2a1608]', accent: '#ff8a5b' },
};

export function gameTheme(id: string): GameTheme {
  return GAME_THEME[id] ?? { tile: 'from-ink-700 to-ink-850', accent: '#a78bfa' };
}

export function GameArt({ id, className = '' }: { id: string; className?: string }) {
  const common = { viewBox: '0 0 100 100', className, 'aria-hidden': true } as const;

  switch (id) {
    case 'tictactoe':
      return (
        <svg {...common}>
          <g stroke="#ffffff" strokeOpacity="0.25" strokeWidth="4" strokeLinecap="round">
            <path d="M35 14V86M65 14V86M14 35H86M14 65H86" />
          </g>
          <g stroke="#f43f7a" strokeWidth="9" strokeLinecap="round">
            <path d="M20 20L30 30M30 20L20 30" />
            <path d="M70 70L80 80M80 70L70 80" />
          </g>
          <circle cx="50" cy="50" r="10" fill="none" stroke="#38bdf8" strokeWidth="9" />
          <circle cx="80" cy="25" r="10" fill="none" stroke="#38bdf8" strokeWidth="9" />
        </svg>
      );

    case 'connect4':
      return (
        <svg {...common}>
          <defs>
            <mask id="c4holes">
              <rect x="8" y="18" width="84" height="70" rx="10" fill="white" />
              {[0, 1, 2, 3].map((c) =>
                [0, 1, 2].map((r) => (
                  <circle key={`${c}${r}`} cx={20 + c * 20} cy={31 + r * 21} r="8" fill="black" />
                )),
              )}
            </mask>
          </defs>
          <circle cx="40" cy="52" r="8" fill="#f43f7a" />
          <circle cx="60" cy="73" r="8" fill="#fbbf24" />
          <circle cx="40" cy="73" r="8" fill="#f43f7a" />
          <circle cx="80" cy="73" r="8" fill="#fbbf24" />
          <rect x="8" y="18" width="84" height="70" rx="10" fill="#2563eb" mask="url(#c4holes)" />
          <circle cx="20" cy="8" r="8" fill="#fbbf24" />
        </svg>
      );

    case 'snakes':
      return (
        <svg {...common}>
          <g stroke="#fbbf24" strokeWidth="5" strokeLinecap="round">
            <path d="M22 88L34 20M40 84L52 16" />
            <path d="M25 72L46 68M28 56L49 52M31 40L52 36" strokeWidth="4" />
          </g>
          <path
            d="M78 18C60 30 88 44 70 58C56 69 76 78 74 88"
            fill="none"
            stroke="#4ade9b"
            strokeWidth="9"
            strokeLinecap="round"
          />
          <circle cx="78" cy="16" r="7" fill="#4ade9b" />
          <circle cx="76" cy="14" r="1.8" fill="#08070f" />
        </svg>
      );

    case 'ludo':
      return (
        <svg {...common}>
          <rect x="8" y="8" width="34" height="34" rx="8" fill="#f43f7a" />
          <rect x="58" y="8" width="34" height="34" rx="8" fill="#38bdf8" />
          <rect x="8" y="58" width="34" height="34" rx="8" fill="#4ade9b" />
          <rect x="58" y="58" width="34" height="34" rx="8" fill="#fbbf24" />
          <path d="M42 8h16v84H42z" fill="#ffffff" fillOpacity="0.16" />
          <path d="M8 42h84v16H8z" fill="#ffffff" fillOpacity="0.16" />
          <circle cx="50" cy="50" r="11" fill="#ffffff" fillOpacity="0.9" />
          <circle cx="50" cy="50" r="4" fill="#1c1930" />
        </svg>
      );

    case 'monopoly':
      return (
        <svg {...common}>
          <rect x="10" y="30" width="80" height="24" rx="5" fill="#f8fafc" />
          <rect x="10" y="30" width="80" height="8" rx="4" fill="#dc2626" />
          <rect x="14" y="60" width="72" height="10" rx="5" fill="#ffffff" fillOpacity="0.35" />
          <rect x="14" y="76" width="46" height="10" rx="5" fill="#ffffff" fillOpacity="0.2" />
          <path d="M32 24h36v-14a4 4 0 00-4-4H36a4 4 0 00-4 4z" fill="#0e0c1a" />
          <rect x="22" y="20" width="56" height="7" rx="3.5" fill="#0e0c1a" />
          <rect x="32" y="12" width="36" height="5" fill="#f43f7a" />
          <circle cx="76" cy="80" r="12" fill="#d7f24e" />
          <text x="76" y="86" textAnchor="middle" fontSize="16" fontWeight="800" fill="#08070f">
            $
          </text>
        </svg>
      );

    default:
      return (
        <svg {...common}>
          <rect x="14" y="14" width="72" height="72" rx="14" fill="#ffffff" fillOpacity="0.15" />
        </svg>
      );
  }
}
