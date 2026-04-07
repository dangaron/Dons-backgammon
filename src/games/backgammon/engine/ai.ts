/**
 * Heuristic AI evaluation. No UI imports.
 * Runs in Web Worker via workers/ai.worker.ts.
 *
 * 4 difficulty levels:
 *   Easy   — picks randomly from top 60% of moves
 *   Medium — current heuristic (strong intermediate)
 *   Hard   — tightened heuristic weights (1.5x penalties/bonuses)
 *   Expert — 2-ply lookahead (evaluates opponent's best response for all 21 dice outcomes)
 */

import type { Board, LegalMove } from './types';
import { BAR, HOME, OPP_BAR, pipCount, opponentPipCount, flipBoard } from './board';
import { getLegalMoves } from './moves';

export type AIDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

/* ── Weight profiles per difficulty ─────────────────────────── */

interface HeuristicWeights {
  pipMultiplier: number;
  blotPenalty: number;
  blotHomePenalty: number;
  anchorBonus: number;
  deepAnchorBonus: number;
  primeMultiplier: number;
  homeBonus: number;
  barPenalty: number;
  hitBonus: number;
}

const WEIGHTS: Record<AIDifficulty, HeuristicWeights> = {
  easy: {
    pipMultiplier: 1.5, blotPenalty: 15, blotHomePenalty: 10,
    anchorBonus: 5, deepAnchorBonus: 8, primeMultiplier: 3,
    homeBonus: 20, barPenalty: 25, hitBonus: 20,
  },
  medium: {
    pipMultiplier: 1.5, blotPenalty: 15, blotHomePenalty: 10,
    anchorBonus: 5, deepAnchorBonus: 8, primeMultiplier: 3,
    homeBonus: 20, barPenalty: 25, hitBonus: 20,
  },
  hard: {
    pipMultiplier: 2.0, blotPenalty: 22, blotHomePenalty: 15,
    anchorBonus: 7, deepAnchorBonus: 12, primeMultiplier: 4.5,
    homeBonus: 25, barPenalty: 35, hitBonus: 25,
  },
  expert: {
    pipMultiplier: 2.0, blotPenalty: 22, blotHomePenalty: 15,
    anchorBonus: 7, deepAnchorBonus: 12, primeMultiplier: 4.5,
    homeBonus: 25, barPenalty: 35, hitBonus: 25,
  },
};

/**
 * Evaluate a board position from current player's perspective.
 * Higher = better for current player.
 */
export function evaluateBoard(board: Board, difficulty: AIDifficulty = 'medium'): number {
  const w = WEIGHTS[difficulty];
  let score = 0;

  // 1. Pip count advantage
  score += (opponentPipCount(board) - pipCount(board)) * w.pipMultiplier;

  // 2. Blot safety
  for (let i = 0; i < 24; i++) {
    if (board[i] === 1) {
      score -= w.blotPenalty;
      if (i > 17) score -= w.blotHomePenalty;
    }
  }

  // 3. Anchor building
  for (let i = 0; i < 24; i++) {
    if (board[i] >= 2) {
      score += w.anchorBonus;
      if (i < 6) score += w.deepAnchorBonus;
    }
  }

  // 4. Priming
  let primeLength = 0;
  let maxPrime = 0;
  for (let i = 0; i < 24; i++) {
    if (board[i] >= 2) {
      primeLength++;
      if (primeLength > maxPrime) maxPrime = primeLength;
    } else {
      primeLength = 0;
    }
  }
  score += maxPrime * maxPrime * w.primeMultiplier;

  // 5. Bearing off progress
  score += board[HOME] * w.homeBonus;

  // 6. Bar penalty
  if (board[BAR] > 0) score -= board[BAR] * w.barPenalty;

  // 7. Hitting opponent
  if (board[OPP_BAR] > 0) score += board[OPP_BAR] * w.hitBonus;

  return score;
}

/* ── All 21 distinct two-dice outcomes and their probabilities ── */

const DICE_OUTCOMES: Array<{ d1: number; d2: number; weight: number }> = [];
for (let a = 1; a <= 6; a++) {
  for (let b = a; b <= 6; b++) {
    DICE_OUTCOMES.push({ d1: a, d2: b, weight: a === b ? 1 : 2 });
  }
}
const TOTAL_OUTCOMES = 36; // sum of weights

/**
 * 2-ply evaluation: for a given result board, simulate the opponent's best
 * response across all 21 dice outcomes and return the expected score.
 */
function twoPlyScore(resultBoard: Board, difficulty: AIDifficulty, maxMs: number, start: number): number {
  // Flip board to opponent's perspective
  const oppBoard = flipBoard(resultBoard);
  let totalScore = 0;

  for (const { d1, d2, weight } of DICE_OUTCOMES) {
    if (Date.now() - start > maxMs) break;

    const dice = d1 === d2 ? [d1, d1, d1, d1] : [d1, d2];
    const oppMoves = getLegalMoves(oppBoard, dice);

    if (oppMoves.length === 0) {
      // Opponent has no moves — great for us. Evaluate current position.
      totalScore += evaluateBoard(resultBoard, difficulty) * weight;
      continue;
    }

    // Find opponent's best move (highest score from THEIR perspective)
    let bestOppScore = -Infinity;
    for (const lm of oppMoves) {
      const s = evaluateBoard(lm.resultBoard, difficulty);
      if (s > bestOppScore) bestOppScore = s;
    }

    // Their gain is our loss. Negate and use our board's base score minus their improvement.
    totalScore += (evaluateBoard(resultBoard, difficulty) - bestOppScore * 0.5) * weight;
  }

  return totalScore / TOTAL_OUTCOMES;
}

/**
 * Choose the best legal move for the given difficulty level.
 * Returns the move AND its score for hint/analysis use.
 */
export function chooseBestMove(
  board: Board,
  dice: number[],
  maxMs = 50,
  difficulty: AIDifficulty = 'medium',
): { move: LegalMove | null; score: number } {
  const start = Date.now();
  const moves = getLegalMoves(board, dice);

  if (moves.length === 0) return { move: null, score: 0 };
  if (moves.length === 1) return { move: moves[0], score: evaluateBoard(moves[0].resultBoard, difficulty) };

  // Score all moves
  const scored: Array<{ lm: LegalMove; score: number }> = [];
  for (const lm of moves) {
    if (Date.now() - start > maxMs) {
      scored.push({ lm, score: evaluateBoard(lm.resultBoard, difficulty) });
      continue;
    }

    const score = difficulty === 'expert'
      ? twoPlyScore(lm.resultBoard, difficulty, maxMs, start)
      : evaluateBoard(lm.resultBoard, difficulty);
    scored.push({ lm, score });
  }

  scored.sort((a, b) => b.score - a.score);

  if (difficulty === 'easy') {
    // Easy: pick randomly from the top 60% of moves
    const cutoff = Math.max(1, Math.ceil(scored.length * 0.6));
    const pick = Math.floor(Math.random() * cutoff);
    return { move: scored[pick].lm, score: scored[pick].score };
  }

  return { move: scored[0].lm, score: scored[0].score };
}
