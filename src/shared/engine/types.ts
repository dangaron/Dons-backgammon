/**
 * Shared game platform types. No browser or UI imports allowed.
 */

export type GameType = 'backgammon' | 'solitaire' | 'yahtzee' | 'bridge'
  | 'snake' | 'tetris' | 'breakout' | 'minesweeper' | '2048';

export type GameCategory = 'board' | 'arcade';

export interface GameMetadata {
  type: GameType;
  name: string;
  description: string;
  iconColor: string;
  category: GameCategory;
  supportsMultiplayer: boolean;
  minPlayers: number;
  maxPlayers: number;
}

export const GAMES: GameMetadata[] = [
  // ── Board & Card Games ──
  {
    type: 'backgammon',
    name: 'Backgammon',
    description: 'Roll the dice. Own the board.',
    iconColor: 'var(--player)',
    category: 'board',
    supportsMultiplayer: true,
    minPlayers: 2,
    maxPlayers: 2,
  },
  {
    type: 'solitaire',
    name: 'Solitaire',
    description: 'Classic Klondike card game.',
    iconColor: 'var(--accent)',
    category: 'board',
    supportsMultiplayer: false,
    minPlayers: 1,
    maxPlayers: 1,
  },
  {
    type: 'yahtzee',
    name: 'Yahtzee',
    description: 'Roll five dice. Chase the combos.',
    iconColor: 'var(--hit)',
    category: 'board',
    supportsMultiplayer: true,
    minPlayers: 1,
    maxPlayers: 4,
  },
  {
    type: 'bridge',
    name: 'Bridge',
    description: 'The ultimate card game of strategy.',
    iconColor: 'var(--purple)',
    category: 'board',
    supportsMultiplayer: true,
    minPlayers: 4,
    maxPlayers: 4,
  },
  // ── Arcade Games ──
  {
    type: 'snake',
    name: 'Snake',
    description: 'Eat, grow, don\'t crash.',
    iconColor: '#22c55e',
    category: 'arcade',
    supportsMultiplayer: false,
    minPlayers: 1,
    maxPlayers: 1,
  },
  {
    type: 'tetris',
    name: 'Tetris',
    description: 'Stack blocks. Clear lines.',
    iconColor: '#a855f7',
    category: 'arcade',
    supportsMultiplayer: false,
    minPlayers: 1,
    maxPlayers: 1,
  },
  {
    type: 'breakout',
    name: 'Breakout',
    description: 'Bounce the ball. Break the bricks.',
    iconColor: '#f97316',
    category: 'arcade',
    supportsMultiplayer: false,
    minPlayers: 1,
    maxPlayers: 1,
  },
  {
    type: 'minesweeper',
    name: 'Minesweeper',
    description: 'Logic puzzle. Find the mines.',
    iconColor: '#ef4444',
    category: 'arcade',
    supportsMultiplayer: false,
    minPlayers: 1,
    maxPlayers: 1,
  },
  {
    type: '2048',
    name: '2048',
    description: 'Slide tiles. Reach 2048.',
    iconColor: '#eab308',
    category: 'arcade',
    supportsMultiplayer: false,
    minPlayers: 1,
    maxPlayers: 1,
  },
];
