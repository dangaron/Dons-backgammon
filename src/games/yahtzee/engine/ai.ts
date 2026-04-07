/**
 * Yahtzee AI — evaluates all hold combinations and category choices.
 * Uses Monte Carlo simulation to estimate expected value of each hold pattern.
 */

import type { DieValue, Category, PlayerState, YahtzeeState } from './types';
import { scoreCategory, getAvailableCategories, upperSubtotal } from './scoring';
import { UPPER_CATEGORIES, UPPER_BONUS_THRESHOLD } from './types';

const SIMULATIONS_PER_HOLD = 100;

/** All 32 possible hold patterns (5 dice, each held or not). */
function allHoldPatterns(): boolean[][] {
  const patterns: boolean[][] = [];
  for (let mask = 0; mask < 32; mask++) {
    patterns.push([
      (mask & 1) !== 0,
      (mask & 2) !== 0,
      (mask & 4) !== 0,
      (mask & 8) !== 0,
      (mask & 16) !== 0,
    ]);
  }
  return patterns;
}

/** Simulate random rolls for unheld dice positions. */
function simulateRoll(dice: DieValue[], held: boolean[]): DieValue[] {
  const result = [...dice];
  for (let i = 0; i < 5; i++) {
    if (!held[i]) {
      result[i] = (Math.floor(Math.random() * 6) + 1) as DieValue;
    }
  }
  return result as DieValue[];
}

/** Evaluate the best possible score for a set of dice given available categories. */
function bestCategoryScore(dice: DieValue[], player: PlayerState): number {
  const available = getAvailableCategories(player);
  if (available.length === 0) return 0;

  let best = -Infinity;
  for (const cat of available) {
    let score = scoreCategory(cat, dice);

    // Factor in strategic value
    score += categoryBonus(cat, dice, player);

    if (score > best) best = score;
  }
  return best;
}

/** Strategic bonus to weight certain categories more heavily. */
function categoryBonus(category: Category, dice: DieValue[], player: PlayerState): number {
  let bonus = 0;

  // Bonus for Yahtzee (it's very valuable)
  if (category === 'yahtzee' && scoreCategory('yahtzee', dice) === 50) {
    bonus += 30;
  }

  // Bonus for upper section progress toward 63+ bonus
  if (UPPER_CATEGORIES.includes(category)) {
    const currentUpper = upperSubtotal(player);
    const categoryScore = scoreCategory(category, dice);
    const target = UPPER_CATEGORIES.indexOf(category) + 1; // expected per-category: 3 * face value
    const expectedPer = target * 3;
    if (categoryScore >= expectedPer) {
      bonus += 5; // On track for upper bonus
    }
    if (currentUpper + categoryScore >= UPPER_BONUS_THRESHOLD) {
      bonus += 15; // This would clinch the upper bonus
    }
  }

  // Penalty for wasting a category with 0
  if (scoreCategory(category, dice) === 0) {
    // Waste penalty depends on how valuable the category could be
    if (category === 'yahtzee') bonus -= 25;
    else if (category === 'large-straight') bonus -= 15;
    else if (category === 'full-house' || category === 'small-straight') bonus -= 8;
  }

  return bonus;
}

/** Evaluate expected value of a hold pattern with remaining rolls. */
function evaluateHold(
  dice: DieValue[],
  held: boolean[],
  rollsRemaining: number,
  player: PlayerState,
): number {
  if (rollsRemaining === 0) {
    return bestCategoryScore(dice, player);
  }

  let totalValue = 0;
  for (let sim = 0; sim < SIMULATIONS_PER_HOLD; sim++) {
    const rolled = simulateRoll(dice, held);
    totalValue += bestCategoryScore(rolled as DieValue[], player);
  }
  return totalValue / SIMULATIONS_PER_HOLD;
}

/** AI decision: which dice to hold. Returns the best hold pattern. */
export function chooseBestHold(
  dice: DieValue[],
  rollsRemaining: number,
  player: PlayerState,
): boolean[] {
  if (rollsRemaining <= 0) return [true, true, true, true, true]; // Must score

  const patterns = allHoldPatterns();
  let bestPattern = patterns[0];
  let bestValue = -Infinity;

  for (const pattern of patterns) {
    const value = evaluateHold(dice, pattern, rollsRemaining, player);
    if (value > bestValue) {
      bestValue = value;
      bestPattern = pattern;
    }
  }

  return bestPattern;
}

/** AI decision: which category to score. */
export function chooseBestCategory(
  dice: DieValue[],
  player: PlayerState,
): Category {
  const available = getAvailableCategories(player);

  let bestCategory = available[0];
  let bestValue = -Infinity;

  for (const cat of available) {
    let value = scoreCategory(cat, dice);
    value += categoryBonus(cat, dice, player);

    if (value > bestValue) {
      bestValue = value;
      bestCategory = cat;
    }
  }

  return bestCategory;
}

export interface AIDecision {
  action: 'hold' | 'score';
  hold?: boolean[];
  category?: Category;
}

/** Full AI turn decision: hold+reroll or score. */
export function getAIDecision(state: YahtzeeState): AIDecision {
  const player = state.players[state.currentPlayer];

  if (state.rollsLeft > 0 && state.rollsLeft < 3) {
    // Decide whether to reroll or score now
    const bestHold = chooseBestHold(state.dice, state.rollsLeft, player);
    const holdAll = bestHold.every(h => h);
    const currentBestScore = bestCategoryScore(state.dice, player);

    // If holding all dice or current score is very good, just score
    if (holdAll || currentBestScore >= 40) {
      return {
        action: 'score',
        category: chooseBestCategory(state.dice, player),
      };
    }

    return { action: 'hold', hold: bestHold };
  }

  // Must score (no rolls left)
  return {
    action: 'score',
    category: chooseBestCategory(state.dice, player),
  };
}
