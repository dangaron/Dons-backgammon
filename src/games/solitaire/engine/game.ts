/**
 * Solitaire game state management. Pure functions, no side effects.
 */

import type { SolitaireState, SolitaireMove, DrawMode, TableauPile } from './types';
import { createDeck, shuffle, suitIndex, rankOf } from './deck';
import { hasWon } from './moves';
import { generateSeed } from '../../../prng/mulberry32';

// ── Scoring constants ──────────────────────────────────────────────────────────

const SCORE_WASTE_TO_TABLEAU = 5;
const SCORE_WASTE_TO_FOUNDATION = 10;
const SCORE_TABLEAU_TO_FOUNDATION = 15;
const SCORE_TURN_OVER_TABLEAU = 5;
const SCORE_FOUNDATION_TO_TABLEAU = -15;
const SCORE_RECYCLE_DRAW1 = -20;
const SCORE_RECYCLE_DRAW3 = -100;

// ── State creation ─────────────────────────────────────────────────────────────

/** Create initial game state: shuffle and deal. */
export function createInitialState(drawMode: DrawMode = 1, seed?: number): SolitaireState {
  const gameSeed = seed ?? generateSeed();
  const deck = shuffle(createDeck(), gameSeed);

  // Deal tableau: pile 0 gets 1 card, pile 1 gets 2, ..., pile 6 gets 7
  const tableau: SolitaireState['tableau'] = [
    emptyPile(), emptyPile(), emptyPile(), emptyPile(),
    emptyPile(), emptyPile(), emptyPile(),
  ];

  let cardIndex = 0;
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row < col; row++) {
      tableau[col].faceDown.push(deck[cardIndex++]);
    }
    tableau[col].faceUp.push(deck[cardIndex++]);
  }

  // Remaining cards go to stock (face-down draw pile)
  const stock = deck.slice(cardIndex);

  return {
    stock,
    waste: [],
    foundations: [[], [], [], []],
    tableau,
    moveCount: 0,
    score: 0,
    startTime: Date.now(),
    seed: gameSeed,
    drawMode,
    gameOver: false,
    won: false,
  };
}

function emptyPile(): TableauPile {
  return { faceDown: [], faceUp: [] };
}

// ── Move application ───────────────────────────────────────────────────────────

/** Apply a move to the state. Returns new state (immutable). */
export function applyMove(state: SolitaireState, move: SolitaireMove): SolitaireState {
  let next = cloneState(state);

  switch (move.type) {
    case 'draw':
      next = applyDraw(next);
      break;
    case 'recycle':
      next = applyRecycle(next);
      break;
    case 'waste-to-tableau':
      next = applyWasteToTableau(next, move.to!);
      break;
    case 'waste-to-foundation':
      next = applyWasteToFoundation(next, move.to!);
      break;
    case 'tableau-to-tableau':
      next = applyTableauToTableau(next, move.from!, move.to!, move.count!);
      break;
    case 'tableau-to-foundation':
      next = applyTableauToFoundation(next, move.from!, move.to!);
      break;
    case 'foundation-to-tableau':
      next = applyFoundationToTableau(next, move.from!, move.to!);
      break;
  }

  next.moveCount++;

  // Check win
  if (hasWon(next)) {
    next.won = true;
    next.gameOver = true;
    // Time bonus
    const elapsed = Math.max(1, (Date.now() - next.startTime) / 1000);
    next.score += Math.max(0, Math.round(700000 / elapsed));
  }

  return next;
}

function applyDraw(state: SolitaireState): SolitaireState {
  const count = Math.min(state.drawMode, state.stock.length);
  const drawn = state.stock.slice(state.stock.length - count);
  state.stock = state.stock.slice(0, state.stock.length - count);
  state.waste = [...state.waste, ...drawn];
  return state;
}

function applyRecycle(state: SolitaireState): SolitaireState {
  // Reverse waste back to stock
  state.stock = [...state.waste].reverse();
  state.waste = [];
  state.score += state.drawMode === 1 ? SCORE_RECYCLE_DRAW1 : SCORE_RECYCLE_DRAW3;
  return state;
}

function applyWasteToTableau(state: SolitaireState, to: number): SolitaireState {
  const card = state.waste.pop()!;
  state.tableau[to].faceUp.push(card);
  state.score += SCORE_WASTE_TO_TABLEAU;
  return state;
}

function applyWasteToFoundation(state: SolitaireState, to: number): SolitaireState {
  const card = state.waste.pop()!;
  state.foundations[to].push(card);
  state.score += SCORE_WASTE_TO_FOUNDATION;
  return state;
}

function applyTableauToTableau(state: SolitaireState, from: number, to: number, count: number): SolitaireState {
  const fromPile = state.tableau[from];
  const cards = fromPile.faceUp.splice(fromPile.faceUp.length - count, count);
  state.tableau[to].faceUp.push(...cards);
  // Flip top face-down card if exposed
  flipTopCard(state, from);
  return state;
}

function applyTableauToFoundation(state: SolitaireState, from: number, to: number): SolitaireState {
  const card = state.tableau[from].faceUp.pop()!;
  state.foundations[to].push(card);
  state.score += SCORE_TABLEAU_TO_FOUNDATION;
  // Flip top face-down card if exposed
  flipTopCard(state, from);
  return state;
}

function applyFoundationToTableau(state: SolitaireState, from: number, to: number): SolitaireState {
  const card = state.foundations[from].pop()!;
  state.tableau[to].faceUp.push(card);
  state.score += SCORE_FOUNDATION_TO_TABLEAU;
  return state;
}

/** If a tableau pile has no face-up cards but has face-down cards, flip the top one. */
function flipTopCard(state: SolitaireState, pileIndex: number): void {
  const pile = state.tableau[pileIndex];
  if (pile.faceUp.length === 0 && pile.faceDown.length > 0) {
    pile.faceUp.push(pile.faceDown.pop()!);
    state.score += SCORE_TURN_OVER_TABLEAU;
  }
}

// ── Auto-move ──────────────────────────────────────────────────────────────────

/**
 * Attempt to auto-move cards to foundations.
 * A card is safe to auto-move if both cards of rank-1 in the opposite color
 * are already on foundations (can't need this card for tableau building).
 */
export function autoMoveToFoundations(state: SolitaireState): SolitaireState {
  let changed = true;
  let current = state;

  while (changed) {
    changed = false;

    // Check waste top card
    if (current.waste.length > 0) {
      const card = current.waste[current.waste.length - 1];
      if (isSafeToAutoMove(card, current)) {
        const targetFoundation = findFoundationForCard(card, current);
        if (targetFoundation >= 0) {
          current = applyMove(current, { type: 'waste-to-foundation', to: targetFoundation });
          current.moveCount--; // Don't count auto-moves
          changed = true;
          continue;
        }
      }
    }

    // Check tableau top cards
    for (let t = 0; t < 7; t++) {
      const pile = current.tableau[t];
      if (pile.faceUp.length > 0) {
        const card = pile.faceUp[pile.faceUp.length - 1];
        if (isSafeToAutoMove(card, current)) {
          const targetFoundation = findFoundationForCard(card, current);
          if (targetFoundation >= 0) {
            current = applyMove(current, { type: 'tableau-to-foundation', from: t, to: targetFoundation });
            current.moveCount--; // Don't count auto-moves
            changed = true;
            break;
          }
        }
      }
    }
  }

  return current;
}

/** A card is safe to auto-move if both opposite-color cards of rank-1 are on foundations. */
function isSafeToAutoMove(cardId: number, state: SolitaireState): boolean {
  const rank = rankOf(cardId);
  // Aces and 2s are always safe
  if (rank <= 2) return true;

  const si = suitIndex(cardId);
  const isRed = si < 2;

  // Check opposite-color foundation heights
  const minOppositeRank = (isRed ? [2, 3] : [0, 1])
    .map(f => state.foundations[f].length)
    .reduce((min, len) => Math.min(min, len), 13);

  // Safe if opposite color foundations are at rank-1 or higher
  return minOppositeRank >= rank - 1;
}

function findFoundationForCard(cardId: number, state: SolitaireState): number {
  for (let f = 0; f < 4; f++) {
    const foundation = state.foundations[f];
    if (foundation.length === 0 && rankOf(cardId) === 1) {
      // Match by suit for empty foundations
      if (suitIndex(cardId) === f) return f;
    } else if (foundation.length > 0) {
      const top = foundation[foundation.length - 1];
      if (suitIndex(cardId) === suitIndex(top) && rankOf(cardId) === rankOf(top) + 1) {
        return f;
      }
    }
  }
  return -1;
}

// ── Serialization ──────────────────────────────────────────────────────────────

export function serializeState(state: SolitaireState): string {
  return JSON.stringify(state);
}

export function deserializeState(raw: string): SolitaireState | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.seed === 'number' && Array.isArray(parsed.stock)) {
      return parsed as SolitaireState;
    }
    return null;
  } catch {
    return null;
  }
}

// ── Clone ──────────────────────────────────────────────────────────────────────

function cloneState(state: SolitaireState): SolitaireState {
  return {
    ...state,
    stock: [...state.stock],
    waste: [...state.waste],
    foundations: state.foundations.map(f => [...f]) as SolitaireState['foundations'],
    tableau: state.tableau.map(p => ({
      faceDown: [...p.faceDown],
      faceUp: [...p.faceUp],
    })) as SolitaireState['tableau'],
  };
}
