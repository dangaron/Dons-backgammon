/**
 * Yahtzee post-game analysis engine.
 * Compares player moves against optimal AI choices.
 */

import type { DieValue, Category } from './types';
import { CATEGORY_LABELS } from './types';

// ── Types ──────────────────────────────────────────────────────────────────────

/** Record of a single move made during the game. */
export interface MoveRecord {
  turn: number;
  dice: DieValue[];
  category: Category;
  score: number;
  /** Scores available in all open categories at the time of this move. */
  availableScores: Partial<Record<Category, number>>;
}

/** Analysis of a single move. */
export interface YahtzeeMoveAnalysis {
  turn: number;
  playerCategory: Category;
  bestCategory: Category;
  playerScore: number;
  bestScore: number;
  difference: number;
  wasOptimal: boolean;
  explanation: string;
}

/** Rating tier for overall game analysis. */
export type GameRating = 'Perfect' | 'Excellent' | 'Great' | 'Good' | 'Fair' | 'Needs Work';

/** Full game analysis result. */
export interface YahtzeeGameAnalysis {
  totalTurns: number;
  optimalChoices: number;
  optimalPercentage: number;
  totalPointsLeft: number;     // sum of all differences (points lost to suboptimal choices)
  rating: GameRating;
  mistakes: YahtzeeMoveAnalysis[];
}

// ── Analysis Logic ─────────────────────────────────────────────────────────────

/**
 * Determine the best category to score given the available categories and dice.
 * Uses a simple heuristic: pick the category that yields the highest score,
 * with strategic adjustments for upper bonus potential and category value.
 */
function findBestCategory(
  _dice: DieValue[],
  availableScores: Partial<Record<Category, number>>,
): { category: Category; score: number } {
  let bestCategory: Category | null = null;
  let bestValue = -Infinity;

  for (const [cat, score] of Object.entries(availableScores) as [Category, number][]) {
    let adjustedValue = score;

    // Strategic adjustments
    // Penalty for wasting Yahtzee on 0
    if (cat === 'yahtzee' && score === 0) {
      adjustedValue -= 25;
    }

    // Bonus for getting Yahtzee (very valuable due to bonus potential)
    if (cat === 'yahtzee' && score === 50) {
      adjustedValue += 30;
    }

    // Bonus for large straight (hard to get, high value)
    if (cat === 'large-straight' && score === 40) {
      adjustedValue += 10;
    }

    // Bonus for full house when scored
    if (cat === 'full-house' && score === 25) {
      adjustedValue += 5;
    }

    // Penalty for taking 0 in valuable lower section categories
    if (score === 0) {
      if (cat === 'large-straight') adjustedValue -= 15;
      if (cat === 'small-straight') adjustedValue -= 10;
      if (cat === 'full-house') adjustedValue -= 8;
    }

    // Slight preference for scoring upper section at or above target
    // (contributes to upper bonus)
    const upperTargets: Partial<Record<Category, number>> = {
      'ones': 3, 'twos': 6, 'threes': 9,
      'fours': 12, 'fives': 15, 'sixes': 18,
    };
    if (cat in upperTargets && score >= (upperTargets[cat] ?? 0)) {
      adjustedValue += 3;
    }

    if (adjustedValue > bestValue) {
      bestValue = adjustedValue;
      bestCategory = cat;
    }
  }

  // Fallback: if nothing found, take the first available
  if (bestCategory === null) {
    const firstCat = Object.keys(availableScores)[0] as Category;
    return { category: firstCat, score: availableScores[firstCat] ?? 0 };
  }

  return { category: bestCategory, score: availableScores[bestCategory] ?? 0 };
}

/**
 * Generate an explanation for why a move was suboptimal.
 */
function generateExplanation(
  playerCategory: Category,
  playerScore: number,
  bestCategory: Category,
  bestScore: number,
): string {
  const playerLabel = CATEGORY_LABELS[playerCategory];
  const bestLabel = CATEGORY_LABELS[bestCategory];
  const diff = bestScore - playerScore;

  // Wasting Yahtzee on 0
  if (playerCategory === 'yahtzee' && playerScore === 0) {
    return `Scored 0 in ${playerLabel}. ${bestLabel} was available for ${bestScore} points. ` +
      `Wasting the Yahtzee slot makes it impossible to earn Yahtzee bonuses later.`;
  }

  // Taking 0 when better options existed
  if (playerScore === 0 && bestScore > 0) {
    return `Took 0 in ${playerLabel} when ${bestLabel} was available for ${bestScore} points. ` +
      `Always try to score positive points when possible.`;
  }

  // Missing upper bonus opportunity
  const upperCats: Category[] = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
  if (upperCats.includes(bestCategory) && !upperCats.includes(playerCategory)) {
    return `${bestLabel} would have scored ${bestScore} (${diff} more than ${playerLabel}'s ${playerScore}). ` +
      `Scoring well in upper categories helps earn the 35-point upper bonus.`;
  }

  // General case
  return `${bestLabel} would have scored ${bestScore} instead of ${playerScore} in ${playerLabel}, ` +
    `a difference of ${diff} points.`;
}

/**
 * Analyze an entire game's worth of moves.
 */
export function analyzeGame(moveHistory: MoveRecord[]): YahtzeeGameAnalysis {
  const analyses: YahtzeeMoveAnalysis[] = [];
  const mistakes: YahtzeeMoveAnalysis[] = [];
  let optimalChoices = 0;
  let totalPointsLeft = 0;

  for (const move of moveHistory) {
    const best = findBestCategory(move.dice, move.availableScores);
    const wasOptimal = move.category === best.category || move.score >= best.score;

    const difference = wasOptimal ? 0 : best.score - move.score;

    const analysis: YahtzeeMoveAnalysis = {
      turn: move.turn,
      playerCategory: move.category,
      bestCategory: best.category,
      playerScore: move.score,
      bestScore: best.score,
      difference,
      wasOptimal,
      explanation: wasOptimal
        ? `Good choice! ${CATEGORY_LABELS[move.category]} for ${move.score} was optimal.`
        : generateExplanation(move.category, move.score, best.category, best.score),
    };

    analyses.push(analysis);

    if (wasOptimal) {
      optimalChoices++;
    } else {
      totalPointsLeft += difference;
      mistakes.push(analysis);
    }
  }

  const totalTurns = moveHistory.length;
  const optimalPercentage = totalTurns > 0 ? Math.round((optimalChoices / totalTurns) * 100) : 100;
  const rating = computeRating(optimalPercentage, totalPointsLeft);

  return {
    totalTurns,
    optimalChoices,
    optimalPercentage,
    totalPointsLeft,
    rating,
    mistakes,
  };
}

/**
 * Compute a letter-style rating based on play quality.
 */
function computeRating(optimalPercentage: number, totalPointsLeft: number): GameRating {
  if (optimalPercentage === 100) return 'Perfect';
  if (optimalPercentage >= 90 && totalPointsLeft <= 10) return 'Excellent';
  if (optimalPercentage >= 80 && totalPointsLeft <= 25) return 'Great';
  if (optimalPercentage >= 65 && totalPointsLeft <= 50) return 'Good';
  if (optimalPercentage >= 50) return 'Fair';
  return 'Needs Work';
}

/**
 * Generate a summary string for quick display.
 */
export function getAnalysisSummary(analysis: YahtzeeGameAnalysis): string {
  if (analysis.rating === 'Perfect') {
    return 'Perfect game! Every category choice was optimal.';
  }

  const parts: string[] = [];
  parts.push(`${analysis.rating} - ${analysis.optimalPercentage}% optimal choices`);

  if (analysis.totalPointsLeft > 0) {
    parts.push(`${analysis.totalPointsLeft} points left on the table`);
  }

  if (analysis.mistakes.length > 0) {
    const worstMistake = analysis.mistakes.reduce((worst, m) =>
      m.difference > worst.difference ? m : worst
    );
    parts.push(
      `Biggest miss: ${CATEGORY_LABELS[worstMistake.playerCategory]} ` +
      `(${worstMistake.playerScore}) vs ${CATEGORY_LABELS[worstMistake.bestCategory]} ` +
      `(${worstMistake.bestScore})`
    );
  }

  return parts.join('. ') + '.';
}
