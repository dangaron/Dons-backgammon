/**
 * Legal move enumeration for Klondike solitaire.
 * Pure functions, no side effects.
 */

import type { SolitaireState, SolitaireMove, TableauPile } from './types';
import { rankOf, colorOf, suitIndex } from './deck';

/** Check if a card can be placed on a tableau pile. */
function canPlaceOnTableau(cardId: number, pile: TableauPile): boolean {
  if (pile.faceUp.length === 0 && pile.faceDown.length === 0) {
    // Empty pile: only Kings allowed
    return rankOf(cardId) === 13;
  }
  if (pile.faceUp.length === 0) return false; // shouldn't happen with face-down cards
  const topCard = pile.faceUp[pile.faceUp.length - 1];
  return colorOf(cardId) !== colorOf(topCard) && rankOf(cardId) === rankOf(topCard) - 1;
}

/** Check if a card can be placed on a foundation pile. */
function canPlaceOnFoundation(cardId: number, foundation: number[]): boolean {
  if (foundation.length === 0) {
    return rankOf(cardId) === 1; // Only Aces on empty foundation
  }
  const topCard = foundation[foundation.length - 1];
  return suitIndex(cardId) === suitIndex(topCard) && rankOf(cardId) === rankOf(topCard) + 1;
}

/** Get all legal moves from the current state. */
export function getLegalMoves(state: SolitaireState): SolitaireMove[] {
  const moves: SolitaireMove[] = [];

  // Draw from stock
  if (state.stock.length > 0) {
    moves.push({ type: 'draw' });
  }

  // Recycle waste back to stock
  if (state.stock.length === 0 && state.waste.length > 0) {
    moves.push({ type: 'recycle' });
  }

  // Waste top card to foundation
  if (state.waste.length > 0) {
    const wasteTop = state.waste[state.waste.length - 1];
    for (let f = 0; f < 4; f++) {
      if (canPlaceOnFoundation(wasteTop, state.foundations[f])) {
        moves.push({ type: 'waste-to-foundation', to: f });
      }
    }
  }

  // Waste top card to tableau
  if (state.waste.length > 0) {
    const wasteTop = state.waste[state.waste.length - 1];
    for (let t = 0; t < 7; t++) {
      if (canPlaceOnTableau(wasteTop, state.tableau[t])) {
        moves.push({ type: 'waste-to-tableau', to: t });
      }
    }
  }

  // Tableau top card to foundation
  for (let t = 0; t < 7; t++) {
    const pile = state.tableau[t];
    if (pile.faceUp.length > 0) {
      const topCard = pile.faceUp[pile.faceUp.length - 1];
      for (let f = 0; f < 4; f++) {
        if (canPlaceOnFoundation(topCard, state.foundations[f])) {
          moves.push({ type: 'tableau-to-foundation', from: t, to: f });
        }
      }
    }
  }

  // Tableau to tableau (move face-up sequences)
  for (let from = 0; from < 7; from++) {
    const fromPile = state.tableau[from];
    if (fromPile.faceUp.length === 0) continue;

    for (let count = 1; count <= fromPile.faceUp.length; count++) {
      const bottomCard = fromPile.faceUp[fromPile.faceUp.length - count];
      for (let to = 0; to < 7; to++) {
        if (from === to) continue;
        if (canPlaceOnTableau(bottomCard, state.tableau[to])) {
          // Skip moves that move a King from an empty-below pile to another empty pile (no progress)
          if (rankOf(bottomCard) === 13 && count === fromPile.faceUp.length && fromPile.faceDown.length === 0
              && state.tableau[to].faceUp.length === 0 && state.tableau[to].faceDown.length === 0) {
            continue;
          }
          moves.push({ type: 'tableau-to-tableau', from, to, count });
        }
      }
    }
  }

  // Foundation to tableau (for unlocking moves)
  for (let f = 0; f < 4; f++) {
    const foundation = state.foundations[f];
    if (foundation.length === 0) continue;
    const topCard = foundation[foundation.length - 1];
    for (let t = 0; t < 7; t++) {
      if (canPlaceOnTableau(topCard, state.tableau[t])) {
        moves.push({ type: 'foundation-to-tableau', from: f, to: t });
      }
    }
  }

  return moves;
}

/** Check if the game is won (all 52 cards on foundations). */
export function hasWon(state: SolitaireState): boolean {
  return state.foundations.every(f => f.length === 13);
}

/** Check if any moves are available. */
export function hasAnyMoves(state: SolitaireState): boolean {
  return getLegalMoves(state).length > 0;
}
