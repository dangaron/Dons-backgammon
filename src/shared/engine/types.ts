/**
 * Shared game platform types. No browser or UI imports allowed.
 */

export type GameType = 'backgammon' | 'solitaire' | 'yahtzee' | 'bridge';

export interface GameMetadata {
  type: GameType;
  name: string;
  description: string;
  iconColor: string;
  supportsMultiplayer: boolean;
  minPlayers: number;
  maxPlayers: number;
}

export const GAMES: GameMetadata[] = [
  {
    type: 'backgammon',
    name: 'Backgammon',
    description: 'Roll the dice. Own the board.',
    iconColor: 'var(--player)',
    supportsMultiplayer: true,
    minPlayers: 2,
    maxPlayers: 2,
  },
  {
    type: 'solitaire',
    name: 'Solitaire',
    description: 'Classic Klondike card game.',
    iconColor: 'var(--accent)',
    supportsMultiplayer: false,
    minPlayers: 1,
    maxPlayers: 1,
  },
  {
    type: 'yahtzee',
    name: 'Yahtzee',
    description: 'Roll five dice. Chase the combos.',
    iconColor: 'var(--hit)',
    supportsMultiplayer: true,
    minPlayers: 1,
    maxPlayers: 4,
  },
  {
    type: 'bridge',
    name: 'Bridge',
    description: 'The ultimate card game of strategy.',
    iconColor: 'var(--purple)',
    supportsMultiplayer: true,
    minPlayers: 4,
    maxPlayers: 4,
  },
];
