/**
 * Core Yahtzee types. No browser or UI imports allowed.
 */

export type DieValue = 1 | 2 | 3 | 4 | 5 | 6;

/** The 13 scoring categories. */
export type Category =
  // Upper section
  | 'ones' | 'twos' | 'threes' | 'fours' | 'fives' | 'sixes'
  // Lower section
  | 'three-of-a-kind' | 'four-of-a-kind' | 'full-house'
  | 'small-straight' | 'large-straight' | 'yahtzee' | 'chance';

export const UPPER_CATEGORIES: Category[] = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
export const LOWER_CATEGORIES: Category[] = [
  'three-of-a-kind', 'four-of-a-kind', 'full-house',
  'small-straight', 'large-straight', 'yahtzee', 'chance',
];
export const ALL_CATEGORIES: Category[] = [...UPPER_CATEGORIES, ...LOWER_CATEGORIES];

export const CATEGORY_LABELS: Record<Category, string> = {
  'ones': 'Ones',
  'twos': 'Twos',
  'threes': 'Threes',
  'fours': 'Fours',
  'fives': 'Fives',
  'sixes': 'Sixes',
  'three-of-a-kind': '3 of a Kind',
  'four-of-a-kind': '4 of a Kind',
  'full-house': 'Full House',
  'small-straight': 'Sm. Straight',
  'large-straight': 'Lg. Straight',
  'yahtzee': 'YAHTZEE',
  'chance': 'Chance',
};

export type Player = 0 | 1;

export interface PlayerState {
  scorecard: Partial<Record<Category, number>>;
  yahtzeeBonusCount: number; // extra Yahtzees after the first
}

export interface YahtzeeState {
  dice: [DieValue, DieValue, DieValue, DieValue, DieValue];
  held: [boolean, boolean, boolean, boolean, boolean];
  rollsLeft: number;          // 3 = haven't rolled yet, 2 = rolled once, 1 = rolled twice, 0 = must score
  currentPlayer: Player;
  players: [PlayerState, PlayerState];
  turn: number;               // 1-13, each player gets 13 turns
  gameOver: boolean;
  winner: Player | null;
  seed: number;
  rollIndex: number;          // PRNG position for reproducibility
  gameMode: 'vs-ai' | 'vs-human-local';
}

/** Upper section bonus threshold and value. */
export const UPPER_BONUS_THRESHOLD = 63;
export const UPPER_BONUS_VALUE = 35;

/** Yahtzee bonus for additional Yahtzees. */
export const YAHTZEE_BONUS_VALUE = 100;
