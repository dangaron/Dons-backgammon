/**
 * FreeCell solitaire engine. Pure functions, no side effects.
 * All state transitions are immutable.
 */

import type { CardId } from './types';
import { createDeck, shuffle, suitIndex, rankOf, colorOf } from './deck';
import { generateSeed } from '../../../prng/mulberry32';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FreeCellState {
  tableau: [CardId[], CardId[], CardId[], CardId[], CardId[], CardId[], CardId[], CardId[]];
  freeCells: [CardId | null, CardId | null, CardId | null, CardId | null];
  foundations: [CardId[], CardId[], CardId[], CardId[]];
  moveCount: number;
  score: number;
  startTime: number;
  seed: number;
  gameOver: boolean;
  won: boolean;
}

export type FreeCellMoveType =
  | 'tableau-to-tableau'
  | 'tableau-to-freecell'
  | 'tableau-to-foundation'
  | 'freecell-to-tableau'
  | 'freecell-to-foundation';

export interface FreeCellMove {
  type: FreeCellMoveType;
  /** Source index: 0-7 for tableau, 0-3 for free cells. */
  from: number;
  /** Destination index: 0-7 for tableau, 0-3 for free cells/foundations. */
  to: number;
  /** Number of cards to move (tableau-to-tableau only, default 1). */
  count?: number;
}

// ── Scoring constants ─────────────────────────────────────────────────────────

const SCORE_TO_FOUNDATION = 10;
const SCORE_FROM_FREECELL = 2;

// ── State creation ────────────────────────────────────────────────────────────

/** Create initial FreeCell game state: shuffle and deal 52 cards into 8 columns. */
export function createFreeCellState(seed?: number): FreeCellState {
  const gameSeed = seed ?? generateSeed();
  const deck = shuffle(createDeck(), gameSeed);

  const tableau: FreeCellState['tableau'] = [[], [], [], [], [], [], [], []];

  // Deal: first 4 columns get 7 cards, last 4 get 6 cards
  let cardIndex = 0;
  for (let col = 0; col < 8; col++) {
    const count = col < 4 ? 7 : 6;
    for (let row = 0; row < count; row++) {
      tableau[col].push(deck[cardIndex++]);
    }
  }

  return {
    tableau,
    freeCells: [null, null, null, null],
    foundations: [[], [], [], []],
    moveCount: 0,
    score: 0,
    startTime: Date.now(),
    seed: gameSeed,
    gameOver: false,
    won: false,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Get the top card of a tableau column, or undefined if empty. */
function topOfColumn(col: CardId[]): CardId | undefined {
  return col.length > 0 ? col[col.length - 1] : undefined;
}

/** Check if a card can be placed on a tableau column (alternating color, descending rank). */
function canPlaceOnTableau(card: CardId, column: CardId[]): boolean {
  if (column.length === 0) return true; // any card on empty column
  const top = column[column.length - 1];
  return colorOf(card) !== colorOf(top) && rankOf(card) === rankOf(top) - 1;
}

/** Check if a card can be placed on a foundation pile (same suit, ascending rank). */
function canPlaceOnFoundation(card: CardId, pile: CardId[]): boolean {
  if (pile.length === 0) {
    return rankOf(card) === 1; // only Aces on empty foundation
  }
  const top = pile[pile.length - 1];
  return suitIndex(card) === suitIndex(top) && rankOf(card) === rankOf(top) + 1;
}

/** Count empty free cells. */
function countEmptyFreeCells(state: FreeCellState): number {
  return state.freeCells.filter(c => c === null).length;
}

/** Count empty tableau columns. */
function countEmptyColumns(state: FreeCellState): number {
  return state.tableau.filter(col => col.length === 0).length;
}

/**
 * Maximum number of cards that can be moved as a group.
 * Formula: (1 + empty_freecells) * (1 + empty_columns)
 * When moving to an empty column, that column doesn't count as empty.
 */
function maxMovableCards(state: FreeCellState, destColumnEmpty: boolean): number {
  const emptyFreeCells = countEmptyFreeCells(state);
  const emptyColumns = countEmptyColumns(state) - (destColumnEmpty ? 1 : 0);
  return (1 + emptyFreeCells) * (1 + Math.max(0, emptyColumns));
}

/**
 * Check if the bottom `count` cards of a tableau column form a valid
 * descending sequence of alternating colors (i.e., a legal run).
 */
function isValidRun(column: CardId[], count: number): boolean {
  if (count <= 1) return true;
  const start = column.length - count;
  for (let i = start; i < column.length - 1; i++) {
    if (colorOf(column[i]) === colorOf(column[i + 1])) return false;
    if (rankOf(column[i]) !== rankOf(column[i + 1]) + 1) return false;
  }
  return true;
}

// ── Legal moves ───────────────────────────────────────────────────────────────

/** Get all legal moves for the current state. */
export function getFreeCellLegalMoves(state: FreeCellState): FreeCellMove[] {
  if (state.gameOver) return [];

  const moves: FreeCellMove[] = [];

  // Foundation moves first (prioritized for auto-play)

  // Tableau top card -> foundation
  for (let from = 0; from < 8; from++) {
    const card = topOfColumn(state.tableau[from]);
    if (card === undefined) continue;
    for (let to = 0; to < 4; to++) {
      if (canPlaceOnFoundation(card, state.foundations[to])) {
        moves.push({ type: 'tableau-to-foundation', from, to });
      }
    }
  }

  // Free cell -> foundation
  for (let from = 0; from < 4; from++) {
    const card = state.freeCells[from];
    if (card === null) continue;
    for (let to = 0; to < 4; to++) {
      if (canPlaceOnFoundation(card, state.foundations[to])) {
        moves.push({ type: 'freecell-to-foundation', from, to });
      }
    }
  }

  // Tableau -> tableau (multi-card sequences)
  for (let from = 0; from < 8; from++) {
    const col = state.tableau[from];
    if (col.length === 0) continue;

    for (let to = 0; to < 8; to++) {
      if (from === to) continue;
      const destEmpty = state.tableau[to].length === 0;
      const maxCards = maxMovableCards(state, destEmpty);

      // Try moving sequences of increasing length
      for (let count = 1; count <= Math.min(col.length, maxCards); count++) {
        if (!isValidRun(col, count)) break; // can't extend further
        const bottomCard = col[col.length - count];
        if (canPlaceOnTableau(bottomCard, state.tableau[to])) {
          moves.push({ type: 'tableau-to-tableau', from, to, count });
        }
      }
    }
  }

  // Tableau top card -> free cell
  for (let from = 0; from < 8; from++) {
    if (state.tableau[from].length === 0) continue;
    for (let to = 0; to < 4; to++) {
      if (state.freeCells[to] === null) {
        moves.push({ type: 'tableau-to-freecell', from, to });
        break; // only need one empty free cell slot (they're interchangeable)
      }
    }
  }

  // Free cell -> tableau
  for (let from = 0; from < 4; from++) {
    const card = state.freeCells[from];
    if (card === null) continue;
    for (let to = 0; to < 8; to++) {
      if (canPlaceOnTableau(card, state.tableau[to])) {
        moves.push({ type: 'freecell-to-tableau', from, to });
      }
    }
  }

  return moves;
}

// ── Move application ──────────────────────────────────────────────────────────

/** Apply a move to the state. Returns new state (immutable). */
export function applyFreeCellMove(state: FreeCellState, move: FreeCellMove): FreeCellState {
  const next = cloneState(state);

  switch (move.type) {
    case 'tableau-to-tableau': {
      const count = move.count ?? 1;
      const fromCol = next.tableau[move.from];
      const cards = fromCol.splice(fromCol.length - count, count);
      next.tableau[move.to].push(...cards);
      break;
    }

    case 'tableau-to-freecell': {
      const card = next.tableau[move.from].pop()!;
      next.freeCells[move.to] = card;
      break;
    }

    case 'tableau-to-foundation': {
      const card = next.tableau[move.from].pop()!;
      next.foundations[move.to].push(card);
      next.score += SCORE_TO_FOUNDATION;
      break;
    }

    case 'freecell-to-tableau': {
      const card = next.freeCells[move.from]!;
      next.freeCells[move.from] = null;
      next.tableau[move.to].push(card);
      next.score += SCORE_FROM_FREECELL;
      break;
    }

    case 'freecell-to-foundation': {
      const card = next.freeCells[move.from]!;
      next.freeCells[move.from] = null;
      next.foundations[move.to].push(card);
      next.score += SCORE_TO_FOUNDATION;
      break;
    }
  }

  next.moveCount++;

  // Check win
  if (hasFreeCellWon(next)) {
    next.won = true;
    next.gameOver = true;
    // Time bonus
    const elapsed = Math.max(1, (Date.now() - next.startTime) / 1000);
    next.score += Math.max(0, Math.round(700000 / elapsed));
  }

  return next;
}

// ── Win detection ─────────────────────────────────────────────────────────────

/** Check if all 52 cards are on the foundations. */
export function hasFreeCellWon(state: FreeCellState): boolean {
  return state.foundations.every(pile => pile.length === 13);
}

// ── Auto-move ─────────────────────────────────────────────────────────────────

/**
 * Auto-move safe cards to foundations.
 * A card is safe if both opposite-color cards of rank-1 are already on foundations.
 */
export function autoMoveToFoundations(state: FreeCellState): FreeCellState {
  let current = state;
  let changed = true;

  while (changed) {
    changed = false;

    // Check tableau top cards
    for (let t = 0; t < 8; t++) {
      const card = topOfColumn(current.tableau[t]);
      if (card === undefined) continue;
      if (isSafeToAutoMove(card, current)) {
        const f = findFoundationForCard(card, current);
        if (f >= 0) {
          current = applyFreeCellMove(current, { type: 'tableau-to-foundation', from: t, to: f });
          current = { ...current, moveCount: current.moveCount - 1 }; // don't count auto-moves
          changed = true;
          break;
        }
      }
    }
    if (changed) continue;

    // Check free cells
    for (let fc = 0; fc < 4; fc++) {
      const card = current.freeCells[fc];
      if (card === null) continue;
      if (isSafeToAutoMove(card, current)) {
        const f = findFoundationForCard(card, current);
        if (f >= 0) {
          current = applyFreeCellMove(current, { type: 'freecell-to-foundation', from: fc, to: f });
          current = { ...current, moveCount: current.moveCount - 1 };
          changed = true;
          break;
        }
      }
    }
  }

  return current;
}

function isSafeToAutoMove(cardId: CardId, state: FreeCellState): boolean {
  const rank = rankOf(cardId);
  if (rank <= 2) return true;

  const si = suitIndex(cardId);
  const isRed = si < 2;

  const minOppositeRank = (isRed ? [2, 3] : [0, 1])
    .map(f => state.foundations[f].length)
    .reduce((min, len) => Math.min(min, len), 13);

  return minOppositeRank >= rank - 1;
}

function findFoundationForCard(cardId: CardId, state: FreeCellState): number {
  for (let f = 0; f < 4; f++) {
    if (canPlaceOnFoundation(cardId, state.foundations[f])) {
      // For empty foundations, match by suit index
      if (state.foundations[f].length === 0) {
        if (suitIndex(cardId) === f) return f;
      } else {
        return f;
      }
    }
  }
  return -1;
}

// ── Serialization ─────────────────────────────────────────────────────────────

export function serializeFreeCellState(state: FreeCellState): string {
  return JSON.stringify(state);
}

export function deserializeFreeCellState(raw: string): FreeCellState | null {
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.seed === 'number' &&
      Array.isArray(parsed.tableau) &&
      parsed.tableau.length === 8
    ) {
      return parsed as FreeCellState;
    }
    return null;
  } catch {
    return null;
  }
}

// ── Clone ─────────────────────────────────────────────────────────────────────

function cloneState(state: FreeCellState): FreeCellState {
  return {
    ...state,
    tableau: state.tableau.map(col => [...col]) as FreeCellState['tableau'],
    freeCells: [...state.freeCells] as FreeCellState['freeCells'],
    foundations: state.foundations.map(f => [...f]) as FreeCellState['foundations'],
  };
}
