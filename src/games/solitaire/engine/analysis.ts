/**
 * AI move analysis for solitaire. Post-game review and coaching.
 * Evaluates whether moves were optimal and suggests better alternatives.
 */

import type { SolitaireState, SolitaireMove } from './types';
import { getLegalMoves } from './moves';
import { suggestMove } from './solver';

export interface MoveAnalysis {
  moveNumber: number;
  playerMove: SolitaireMove;
  bestMove: SolitaireMove | null;
  wasOptimal: boolean;
  explanation: string;
}

export interface GameAnalysis {
  totalMoves: number;
  optimalMoves: number;
  optimalPercentage: number;
  mistakes: MoveAnalysis[];
  rating: 'perfect' | 'excellent' | 'good' | 'average' | 'needs-practice';
  summary: string;
}

/** Analyze a completed game's move history. */
export function analyzeGame(
  moveHistory: { state: SolitaireState; move: SolitaireMove }[],
): GameAnalysis {
  const analyses: MoveAnalysis[] = [];
  let optimalCount = 0;

  for (let i = 0; i < moveHistory.length; i++) {
    const { state, move } = moveHistory[i];
    const best = suggestMove(state);

    const wasOptimal = !best || movesEqual(move, best);

    if (wasOptimal) {
      optimalCount++;
    } else {
      analyses.push({
        moveNumber: i + 1,
        playerMove: move,
        bestMove: best,
        wasOptimal: false,
        explanation: getMoveExplanation(move, best, state),
      });
    }
  }

  const total = moveHistory.length;
  const percentage = total > 0 ? Math.round((optimalCount / total) * 100) : 100;

  const rating = percentage >= 95 ? 'perfect' :
    percentage >= 85 ? 'excellent' :
    percentage >= 70 ? 'good' :
    percentage >= 50 ? 'average' : 'needs-practice';

  const ratingLabels = {
    'perfect': 'Perfect play! Every move was optimal.',
    'excellent': 'Excellent play with very few suboptimal moves.',
    'good': 'Good play. A few better moves were available.',
    'average': 'Average play. Several better alternatives existed.',
    'needs-practice': 'Keep practicing! Many moves could be improved.',
  };

  return {
    totalMoves: total,
    optimalMoves: optimalCount,
    optimalPercentage: percentage,
    mistakes: analyses.slice(0, 10), // Top 10 mistakes
    rating,
    summary: ratingLabels[rating],
  };
}

function movesEqual(a: SolitaireMove, b: SolitaireMove): boolean {
  return a.type === b.type && a.from === b.from && a.to === b.to && a.count === b.count;
}

function getMoveExplanation(
  playerMove: SolitaireMove,
  bestMove: SolitaireMove | null,
  _state: SolitaireState,
): string {
  if (!bestMove) return 'No better move available.';

  const moveDesc = describeMoveType(playerMove.type);
  const bestDesc = describeMoveType(bestMove.type);

  if (bestMove.type.includes('foundation')) {
    return `You played ${moveDesc}, but moving to the foundation (${bestDesc}) was safer.`;
  }

  if (playerMove.type === 'draw' && bestMove.type !== 'draw') {
    return `Drawing from stock wasn't necessary — a ${bestDesc} was available.`;
  }

  if (bestMove.type === 'tableau-to-tableau' && playerMove.type === 'tableau-to-tableau') {
    return `A different tableau move would have exposed more hidden cards.`;
  }

  return `A ${bestDesc} would have been slightly better here.`;
}

function describeMoveType(type: string): string {
  switch (type) {
    case 'draw': return 'draw from stock';
    case 'recycle': return 'recycle waste';
    case 'waste-to-tableau': return 'waste to tableau';
    case 'waste-to-foundation': return 'waste to foundation';
    case 'tableau-to-tableau': return 'tableau rearrangement';
    case 'tableau-to-foundation': return 'tableau to foundation';
    case 'foundation-to-tableau': return 'foundation to tableau';
    default: return type;
  }
}

/** Calculate win probability estimate based on current board state. */
export function estimateWinProbability(state: SolitaireState): number {
  const legalMoves = getLegalMoves(state);
  if (state.won) return 1;
  if (state.gameOver || legalMoves.length === 0) return 0;

  let score = 0.5; // Base probability

  // Foundation progress (biggest factor)
  const foundationCards = state.foundations.reduce((sum, f) => sum + f.length, 0);
  score += (foundationCards / 52) * 0.35;

  // Face-down cards remaining (fewer = better)
  const faceDown = state.tableau.reduce((sum, p) => sum + p.faceDown.length, 0);
  score -= (faceDown / 21) * 0.15; // 21 is max face-down cards

  // Available moves (more = better)
  score += Math.min(legalMoves.length / 20, 0.1);

  // Stock remaining (fewer = better late game)
  score -= (state.stock.length / 24) * 0.05;

  // Empty tableau columns (good for kings)
  const emptyColumns = state.tableau.filter(p => p.faceDown.length === 0 && p.faceUp.length === 0).length;
  score += emptyColumns * 0.02;

  return Math.max(0, Math.min(1, score));
}
