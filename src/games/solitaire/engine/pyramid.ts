/**
 * Pyramid Solitaire engine. Pure functions, immutable state.
 *
 * 28 cards dealt in a pyramid (7 rows), 24 in stock/waste.
 * Remove pairs summing to 13; Kings (rank 13) removed alone.
 * Win by clearing all pyramid cards.
 */

import type { CardId } from './types';
import { createDeck, shuffle, rankOf } from './deck';
import { generateSeed } from '../../../prng/mulberry32';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PyramidState {
  /** 28 pyramid slots. null means the slot was never dealt (impossible here, but keeps typing clean). */
  pyramid: (CardId | null)[];
  /** Which pyramid indices have been removed. */
  removed: boolean[];
  stock: CardId[];
  waste: CardId[];
  moveCount: number;
  score: number;
  seed: number;
  gameOver: boolean;
  won: boolean;
}

export type PyramidMoveType =
  | 'pair-pyramid'        // two exposed pyramid cards summing to 13
  | 'pair-pyramid-waste'  // exposed pyramid card + waste top
  | 'pair-pyramid-stock'  // exposed pyramid card + stock top
  | 'remove-king'         // remove an exposed King (rank 13) alone
  | 'draw';               // draw from stock to waste

export interface PyramidMove {
  type: PyramidMoveType;
  /** First pyramid index (always present except for draw). */
  index?: number;
  /** Second pyramid index (pair-pyramid only). */
  index2?: number;
}

// ── Scoring ───────────────────────────────────────────────────────────────────

const SCORE_PAIR_REMOVED = 5;
const SCORE_PYRAMID_CLEARED = 50;

// ── Pyramid layout helpers ────────────────────────────────────────────────────

/**
 * Row start index for row r (0-indexed): r*(r+1)/2
 * Row r has (r+1) cards.
 * Card at index i in row r is covered by two cards in row r+1:
 *   child-left  = i + (r + 1)
 *   child-right = i + (r + 2)
 * Conversely, card at index j in row r is covered by cards in the row below
 * that overlap it.
 */

function rowOf(index: number): number {
  // row 0: 0, row 1: 1-2, row 2: 3-5, row 3: 6-9, row 4: 10-14, row 5: 15-20, row 6: 21-27
  let row = 0;
  let start = 0;
  while (start + row + 1 <= index) {
    start += row + 1;
    row++;
  }
  return row;
}

function rowStart(row: number): number {
  return (row * (row + 1)) / 2;
}

/** Get the two children (covering cards in the row below) for a given index. Returns [] for row 6. */
function childrenOf(index: number): number[] {
  const r = rowOf(index);
  if (r >= 6) return []; // bottom row has no children
  const posInRow = index - rowStart(r);
  const nextRowStart = rowStart(r + 1);
  return [nextRowStart + posInRow, nextRowStart + posInRow + 1];
}

/** A pyramid card is exposed if it hasn't been removed and both children are removed (or it's in the bottom row). */
function isExposed(index: number, removed: boolean[]): boolean {
  if (removed[index]) return false;
  const children = childrenOf(index);
  return children.every(c => removed[c]);
}

// ── State creation ────────────────────────────────────────────────────────────

export function createPyramidState(seed?: number): PyramidState {
  const gameSeed = seed ?? generateSeed();
  const deck = shuffle(createDeck(), gameSeed);

  const pyramid = deck.slice(0, 28);
  const stock = deck.slice(28); // 24 cards

  return {
    pyramid,
    removed: new Array(28).fill(false),
    stock,
    waste: [],
    moveCount: 0,
    score: 0,
    seed: gameSeed,
    gameOver: false,
    won: false,
  };
}

// ── Legal moves ───────────────────────────────────────────────────────────────

export function getPyramidLegalMoves(state: PyramidState): PyramidMove[] {
  const moves: PyramidMove[] = [];

  // Find all exposed pyramid indices
  const exposed: number[] = [];
  for (let i = 0; i < 28; i++) {
    if (isExposed(i, state.removed)) {
      exposed.push(i);
    }
  }

  // Remove-king: exposed Kings
  for (const i of exposed) {
    const card = state.pyramid[i];
    if (card !== null && rankOf(card) === 13) {
      moves.push({ type: 'remove-king', index: i });
    }
  }

  // Pair two exposed pyramid cards
  for (let a = 0; a < exposed.length; a++) {
    for (let b = a + 1; b < exposed.length; b++) {
      const cardA = state.pyramid[exposed[a]];
      const cardB = state.pyramid[exposed[b]];
      if (cardA !== null && cardB !== null && rankOf(cardA) + rankOf(cardB) === 13) {
        moves.push({ type: 'pair-pyramid', index: exposed[a], index2: exposed[b] });
      }
    }
  }

  // Pair exposed pyramid card with waste top
  if (state.waste.length > 0) {
    const wasteTop = state.waste[state.waste.length - 1];
    const wasteRank = rankOf(wasteTop);
    for (const i of exposed) {
      const card = state.pyramid[i];
      if (card !== null && rankOf(card) + wasteRank === 13) {
        moves.push({ type: 'pair-pyramid-waste', index: i });
      }
    }
  }

  // Pair exposed pyramid card with stock top
  if (state.stock.length > 0) {
    const stockTop = state.stock[state.stock.length - 1];
    const stockRank = rankOf(stockTop);
    for (const i of exposed) {
      const card = state.pyramid[i];
      if (card !== null && rankOf(card) + stockRank === 13) {
        moves.push({ type: 'pair-pyramid-stock', index: i });
      }
    }
  }

  // Draw from stock
  if (state.stock.length > 0) {
    moves.push({ type: 'draw' });
  }

  return moves;
}

// ── Move application ──────────────────────────────────────────────────────────

export function applyPyramidMove(state: PyramidState, move: PyramidMove): PyramidState {
  const next = clonePyramidState(state);

  switch (move.type) {
    case 'remove-king': {
      next.removed[move.index!] = true;
      next.score += SCORE_PAIR_REMOVED;
      break;
    }
    case 'pair-pyramid': {
      next.removed[move.index!] = true;
      next.removed[move.index2!] = true;
      next.score += SCORE_PAIR_REMOVED;
      break;
    }
    case 'pair-pyramid-waste': {
      next.removed[move.index!] = true;
      next.waste.pop();
      next.score += SCORE_PAIR_REMOVED;
      break;
    }
    case 'pair-pyramid-stock': {
      next.removed[move.index!] = true;
      next.stock.pop();
      next.score += SCORE_PAIR_REMOVED;
      break;
    }
    case 'draw': {
      const card = next.stock.pop()!;
      next.waste.push(card);
      break;
    }
  }

  next.moveCount++;

  // Check win
  if (hasPyramidWon(next)) {
    next.won = true;
    next.gameOver = true;
    next.score += SCORE_PYRAMID_CLEARED;
  }

  return next;
}

// ── Win check ─────────────────────────────────────────────────────────────────

export function hasPyramidWon(state: PyramidState): boolean {
  return state.removed.every(r => r);
}

// ── Serialization ─────────────────────────────────────────────────────────────

export function serializePyramidState(state: PyramidState): string {
  return JSON.stringify(state);
}

export function deserializePyramidState(raw: string): PyramidState | null {
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.seed === 'number' &&
      Array.isArray(parsed.pyramid) &&
      Array.isArray(parsed.removed)
    ) {
      return parsed as PyramidState;
    }
    return null;
  } catch {
    return null;
  }
}

// ── Clone ─────────────────────────────────────────────────────────────────────

function clonePyramidState(state: PyramidState): PyramidState {
  return {
    ...state,
    pyramid: [...state.pyramid],
    removed: [...state.removed],
    stock: [...state.stock],
    waste: [...state.waste],
  };
}
