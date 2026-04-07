/**
 * Heuristic AI evaluation. No UI imports.
 * Runs in Web Worker via workers/ai.worker.ts.
 *
 * Heuristic: pip count + blot safety + anchor building + priming.
 * Plays at strong intermediate level.
 */

import type { Board, LegalMove } from './types';
import { BAR, HOME, OPP_BAR, pipCount, opponentPipCount } from './board';
import { getLegalMoves } from './moves';

/**
 * Evaluate a board position from current player's perspective.
 * Higher = better for current player.
 */
export function evaluateBoard(board: Board): number {
  let score = 0;

  // 1. Pip count advantage (lower pip count = better)
  const myPips = pipCount(board);
  // Opponent pips: from their perspective, each checker at index i is (24-i) pips away
  // But we store opponent as negative at index i, so their pip count is:
  const oppPips = opponentPipCount(board);
  score += (oppPips - myPips) * 1.5;

  // 2. Blot safety: exposed blots are dangerous
  for (let i = 0; i < 24; i++) {
    if (board[i] === 1) {
      // Exposed blot: penalty based on how many opponent checkers can hit it
      score -= 15;
      // Extra penalty in opponent's home board (they can hit easily)
      if (i > 17) score -= 10;
    }
  }

  // 3. Anchor building: having 2+ checkers on a point = safe
  for (let i = 0; i < 24; i++) {
    if (board[i] >= 2) {
      score += 5;
      // Bonus for anchors in opponent's home board (points 18-23 from their perspective)
      if (i < 6) score += 8; // our low points = deep in opponent territory
    }
  }

  // 4. Priming: consecutive points with 2+ checkers block opponent
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
  score += maxPrime * maxPrime * 3; // exponential bonus for longer primes

  // 5. Bearing off progress
  score += board[HOME] * 20;

  // 6. Checker on bar penalty
  if (board[BAR] > 0) score -= board[BAR] * 25;

  // 7. Hitting opponent checkers on bar is great
  if (board[OPP_BAR] > 0) score += board[OPP_BAR] * 20;

  return score;
}

/**
 * Choose the best legal move using heuristic evaluation.
 * time-limited: stops after maxMs milliseconds.
 */
export function chooseBestMove(board: Board, dice: number[], maxMs = 50): LegalMove | null {
  const start = Date.now();
  const moves = getLegalMoves(board, dice);

  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0];

  let bestMove = moves[0];
  let bestScore = -Infinity;

  for (const lm of moves) {
    if (Date.now() - start > maxMs) break;
    const score = evaluateBoard(lm.resultBoard);
    if (score > bestScore) {
      bestScore = score;
      bestMove = lm;
    }
  }

  return bestMove;
}
