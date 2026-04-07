/**
 * Yahtzee scoring rules. Pure functions, no side effects.
 */

import type { DieValue, Category, PlayerState } from './types';
import { ALL_CATEGORIES, UPPER_CATEGORIES, UPPER_BONUS_THRESHOLD, UPPER_BONUS_VALUE, YAHTZEE_BONUS_VALUE } from './types';

/** Count occurrences of each die value. */
export function dieCounts(dice: DieValue[]): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const d of dice) {
    counts[d] = (counts[d] || 0) + 1;
  }
  return counts;
}

/** Calculate the score for a given category with the given dice. */
export function scoreCategory(category: Category, dice: DieValue[]): number {
  const counts = dieCounts(dice);
  const values = Object.values(counts);
  const sum = dice.reduce((a, b) => a + b, 0);

  switch (category) {
    // Upper section: sum of matching dice
    case 'ones': return (counts[1] || 0) * 1;
    case 'twos': return (counts[2] || 0) * 2;
    case 'threes': return (counts[3] || 0) * 3;
    case 'fours': return (counts[4] || 0) * 4;
    case 'fives': return (counts[5] || 0) * 5;
    case 'sixes': return (counts[6] || 0) * 6;

    // Lower section
    case 'three-of-a-kind':
      return values.some(c => c >= 3) ? sum : 0;

    case 'four-of-a-kind':
      return values.some(c => c >= 4) ? sum : 0;

    case 'full-house':
      return (values.includes(3) && values.includes(2)) ? 25 : 0;

    case 'small-straight':
      return hasConsecutive(dice, 4) ? 30 : 0;

    case 'large-straight':
      return hasConsecutive(dice, 5) ? 40 : 0;

    case 'yahtzee':
      return values.includes(5) ? 50 : 0;

    case 'chance':
      return sum;
  }
}

/** Check if dice contain at least `n` consecutive values. */
function hasConsecutive(dice: DieValue[], n: number): boolean {
  const unique = new Set(dice);
  const sequences = [
    [1, 2, 3, 4],
    [2, 3, 4, 5],
    [3, 4, 5, 6],
    [1, 2, 3, 4, 5],
    [2, 3, 4, 5, 6],
  ];

  for (const seq of sequences) {
    if (seq.length >= n && seq.every(v => unique.has(v as DieValue))) {
      return true;
    }
  }
  return false;
}

/** Get all available (unscored) categories for a player. */
export function getAvailableCategories(player: PlayerState): Category[] {
  return ALL_CATEGORIES.filter(c => !(c in player.scorecard));
}

/** Calculate potential score for each available category. */
export function getPotentialScores(
  player: PlayerState,
  dice: DieValue[]
): Partial<Record<Category, number>> {
  const result: Partial<Record<Category, number>> = {};
  const available = getAvailableCategories(player);

  for (const cat of available) {
    result[cat] = scoreCategory(cat, dice);
  }

  return result;
}

/** Calculate upper section subtotal. */
export function upperSubtotal(player: PlayerState): number {
  return UPPER_CATEGORIES.reduce((sum, cat) => sum + (player.scorecard[cat] ?? 0), 0);
}

/** Calculate upper section bonus. */
export function upperBonus(player: PlayerState): number {
  return upperSubtotal(player) >= UPPER_BONUS_THRESHOLD ? UPPER_BONUS_VALUE : 0;
}

/** Calculate total score for a player. */
export function totalScore(player: PlayerState): number {
  let total = 0;

  // Sum all scored categories
  for (const val of Object.values(player.scorecard)) {
    total += val ?? 0;
  }

  // Upper bonus
  total += upperBonus(player);

  // Yahtzee bonus (100 per extra Yahtzee)
  total += player.yahtzeeBonusCount * YAHTZEE_BONUS_VALUE;

  return total;
}

/** Check if a Yahtzee bonus applies (already scored Yahtzee > 0 and rolling another). */
export function isYahtzeeBonus(player: PlayerState, dice: DieValue[]): boolean {
  const counts = dieCounts(dice);
  const isYahtzee = Object.values(counts).includes(5);
  const previousYahtzeeScore = player.scorecard['yahtzee'];
  return isYahtzee && previousYahtzeeScore !== undefined && previousYahtzeeScore > 0;
}
