/**
 * Hint system for Klondike solitaire.
 * Priority-based heuristic — suggests the best available move.
 */

import type { SolitaireState, SolitaireMove } from './types';
import { getLegalMoves } from './moves';
import { rankOf, suitIndex } from './deck';

/**
 * Suggest the best move from the current state.
 * Priority order:
 * 1. Move Ace or 2 to foundation
 * 2. Expose face-down cards (prefer moves that reveal hidden cards)
 * 3. Safe foundation moves (both opposite-color rank-1 cards already on foundation)
 * 4. Build tableau sequences
 * 5. Draw from stock / recycle
 */
export function suggestMove(state: SolitaireState): SolitaireMove | null {
  const moves = getLegalMoves(state);
  if (moves.length === 0) return null;

  // Score each move
  let best: SolitaireMove | null = null;
  let bestScore = -Infinity;

  for (const move of moves) {
    const score = scoreMove(state, move);
    if (score > bestScore) {
      bestScore = score;
      best = move;
    }
  }

  return best;
}

function scoreMove(state: SolitaireState, move: SolitaireMove): number {
  switch (move.type) {
    case 'waste-to-foundation':
    case 'tableau-to-foundation': {
      const card = move.type === 'waste-to-foundation'
        ? state.waste[state.waste.length - 1]
        : state.tableau[move.from!].faceUp[state.tableau[move.from!].faceUp.length - 1];
      const rank = rankOf(card);
      // Aces and 2s: highest priority
      if (rank <= 2) return 1000 + (3 - rank);
      // Safe foundation moves
      if (isSafeFoundationMove(card, state)) return 800;
      // Other foundation moves: moderate priority
      return 400;
    }

    case 'tableau-to-tableau': {
      const fromPile = state.tableau[move.from!];
      // Moves that expose face-down cards are high priority
      if (move.count === fromPile.faceUp.length && fromPile.faceDown.length > 0) {
        return 700 + fromPile.faceDown.length; // More hidden cards = better
      }
      // Building sequences: moderate priority
      return 300 + (move.count ?? 1);
    }

    case 'waste-to-tableau':
      return 200;

    case 'foundation-to-tableau':
      return 50; // Low priority, only for unlocking

    case 'draw':
      return 100;

    case 'recycle':
      return 10; // Last resort

    default:
      return 0;
  }
}

function isSafeFoundationMove(cardId: number, state: SolitaireState): boolean {
  const rank = rankOf(cardId);
  if (rank <= 2) return true;

  const si = suitIndex(cardId);
  const isRed = si < 2;
  const oppositeFoundations = isRed ? [2, 3] : [0, 1];

  const minOppositeRank = Math.min(
    ...oppositeFoundations.map(f => state.foundations[f].length)
  );

  return minOppositeRank >= rank - 1;
}
