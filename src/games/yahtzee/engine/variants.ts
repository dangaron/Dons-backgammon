/**
 * Yahtzee game mode variants.
 * Defines different ways to play Yahtzee beyond the standard rules.
 */

// ── Types ──────────────────────────────────────────────────────────────────────

export type YahtzeeVariant = 'standard' | 'triple' | 'challenge' | 'speed';

export type VariantDifficulty = 'normal' | 'hard' | 'expert';

export interface YahtzeeVariantInfo {
  id: YahtzeeVariant;
  name: string;
  description: string;
  icon: string;
  difficulty: VariantDifficulty;
  /** How many columns/scorecards the player fills. */
  columns: number;
  /** Whether the variant uses a timer. */
  timed: boolean;
  /** Timer duration per turn in seconds (if timed). */
  timerSeconds: number | null;
  /** Score multipliers per column (e.g., Triple Yahtzee uses 1x, 2x, 3x). */
  columnMultipliers: number[];
  /** Whether this variant supports AI opponents. */
  supportsAI: boolean;
  /** Brief rules summary for the variant selection screen. */
  rules: string[];
}

// ── Challenge Scenario ─────────────────────────────────────────────────────────

import type { DieValue, Category } from './types';

export interface ChallengeScenario {
  id: string;
  name: string;
  description: string;
  difficulty: VariantDifficulty;
  /** Starting dice (what the player sees on their first roll). */
  startingDice: [DieValue, DieValue, DieValue, DieValue, DieValue];
  /** Turns remaining in the challenge. */
  turnsLeft: number;
  /** Categories already filled (and their scores). */
  filledCategories: Partial<Record<Category, number>>;
  /** Target score to beat for a "win". */
  targetScore: number;
  /** Par score (expected good play). */
  parScore: number;
}

export const CHALLENGE_SCENARIOS: ChallengeScenario[] = [
  {
    id: 'finish-strong',
    name: 'Finish Strong',
    description: 'Three turns left. Can you maximize your final score?',
    difficulty: 'normal',
    startingDice: [3, 3, 3, 5, 5],
    turnsLeft: 3,
    filledCategories: {
      'ones': 3, 'twos': 6, 'threes': 9, 'fours': 12, 'fives': 15, 'sixes': 18,
      'three-of-a-kind': 22, 'four-of-a-kind': 0, 'full-house': 25, 'yahtzee': 50,
    },
    targetScore: 220,
    parScore: 200,
  },
  {
    id: 'upper-bonus-chase',
    name: 'Upper Bonus Chase',
    description: 'You need 20 more points in the upper section for the bonus. Two turns remain.',
    difficulty: 'hard',
    startingDice: [5, 5, 6, 6, 2],
    turnsLeft: 2,
    filledCategories: {
      'ones': 2, 'twos': 4, 'threes': 9, 'fours': 8,
      'three-of-a-kind': 18, 'four-of-a-kind': 24, 'full-house': 25,
      'small-straight': 30, 'large-straight': 40, 'yahtzee': 0, 'chance': 22,
    },
    targetScore: 230,
    parScore: 210,
  },
  {
    id: 'yahtzee-or-bust',
    name: 'Yahtzee or Bust',
    description: 'One turn left. Yahtzee is open. Can you roll five of a kind?',
    difficulty: 'expert',
    startingDice: [4, 4, 4, 2, 6],
    turnsLeft: 1,
    filledCategories: {
      'ones': 3, 'twos': 6, 'threes': 12, 'fours': 16, 'fives': 10, 'sixes': 18,
      'three-of-a-kind': 25, 'four-of-a-kind': 28, 'full-house': 25,
      'small-straight': 30, 'large-straight': 40, 'chance': 24,
    },
    targetScore: 287,
    parScore: 237,
  },
  {
    id: 'clean-sweep',
    name: 'Clean Sweep',
    description: 'Five turns left with lower section wide open. Fill them all with non-zero scores.',
    difficulty: 'hard',
    startingDice: [1, 2, 3, 4, 5],
    turnsLeft: 5,
    filledCategories: {
      'ones': 4, 'twos': 8, 'threes': 9, 'fours': 16, 'fives': 15, 'sixes': 18,
      'three-of-a-kind': 24, 'chance': 26,
    },
    targetScore: 265,
    parScore: 240,
  },
  {
    id: 'last-chance',
    name: 'Last Chance',
    description: 'Down to the wire. Two categories left with tough dice.',
    difficulty: 'normal',
    startingDice: [1, 3, 3, 5, 6],
    turnsLeft: 2,
    filledCategories: {
      'ones': 2, 'twos': 6, 'threes': 12, 'fours': 12, 'fives': 15, 'sixes': 24,
      'three-of-a-kind': 20, 'four-of-a-kind': 26, 'full-house': 25,
      'small-straight': 30, 'yahtzee': 50,
    },
    targetScore: 270,
    parScore: 250,
  },
];

// ── Variant Definitions ────────────────────────────────────────────────────────

export const YAHTZEE_VARIANTS: YahtzeeVariantInfo[] = [
  {
    id: 'standard',
    name: 'Standard Yahtzee',
    description: 'Classic Yahtzee rules. Score the most points across 13 categories.',
    icon: '🎲',
    difficulty: 'normal',
    columns: 1,
    timed: false,
    timerSeconds: null,
    columnMultipliers: [1],
    supportsAI: true,
    rules: [
      'Roll up to 3 times per turn',
      'Score in one of 13 categories each turn',
      'Upper section bonus at 63+ points',
      'Yahtzee bonus for additional Yahtzees',
    ],
  },
  {
    id: 'triple',
    name: 'Triple Yahtzee',
    description: 'Play 3 scorecards simultaneously. Scores are multiplied: 1x, 2x, and 3x.',
    icon: '🎲🎲🎲',
    difficulty: 'hard',
    columns: 3,
    timed: false,
    timerSeconds: null,
    columnMultipliers: [1, 2, 3],
    supportsAI: false,
    rules: [
      'Same dice roll applies to all 3 columns',
      'Choose which column to score in each turn',
      'Column 1: 1x multiplier',
      'Column 2: 2x multiplier',
      'Column 3: 3x multiplier',
      'Strategy: save high-value rolls for the 3x column',
    ],
  },
  {
    id: 'challenge',
    name: 'Yahtzee Challenge',
    description: 'Curated puzzles. Given specific dice and open categories, maximize your score.',
    icon: '🧩',
    difficulty: 'hard',
    columns: 1,
    timed: false,
    timerSeconds: null,
    columnMultipliers: [1],
    supportsAI: false,
    rules: [
      'Start from a preset game position',
      'Limited turns remaining',
      'Beat the target score to win',
      'Earn stars based on how close to par you score',
    ],
  },
  {
    id: 'speed',
    name: 'Speed Yahtzee',
    description: 'Race the clock! 30 seconds per turn to roll and score.',
    icon: '⏱️',
    difficulty: 'expert',
    columns: 1,
    timed: true,
    timerSeconds: 30,
    columnMultipliers: [1],
    supportsAI: true,
    rules: [
      '30 seconds per turn',
      'If time runs out, lowest available category is auto-scored',
      'All other rules are standard Yahtzee',
      'Tests quick decision-making under pressure',
    ],
  },
];

/**
 * Get variant info by id.
 */
export function getVariantInfo(variant: YahtzeeVariant): YahtzeeVariantInfo {
  const info = YAHTZEE_VARIANTS.find(v => v.id === variant);
  if (!info) {
    return YAHTZEE_VARIANTS[0]; // fallback to standard
  }
  return info;
}

/**
 * Get a challenge scenario by id.
 */
export function getChallengeScenario(id: string): ChallengeScenario | undefined {
  return CHALLENGE_SCENARIOS.find(c => c.id === id);
}
