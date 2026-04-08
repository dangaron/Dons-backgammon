/**
 * TriPeaks Solitaire engine. Pure functions, immutable state.
 *
 * 28 cards in 3 peaks (18 face-down + 10 face-up), 24 in stock.
 * Remove peak cards that are +/- 1 rank from waste top (wrapping K<->A).
 * Chain combo scoring: consecutive removes score 1,2,3,4... resets on draw.
 * Win by clearing all 28 peak cards.
 */

import type { CardId } from './types';
import { createDeck, shuffle, rankOf } from './deck';
import { generateSeed } from '../../../prng/mulberry32';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TriPeaksState {
  /**
   * 28 peak slots. Cards are laid out as:
   *
   * Row 0 (3 peak tops):    indices 0, 1, 2
   * Row 1 (6 cards):        indices 3, 4, 5, 6, 7, 8
   * Row 2 (9 cards):        indices 9, 10, 11, 12, 13, 14, 15, 16, 17
   * Row 3 (10 cards):       indices 18, 19, 20, 21, 22, 23, 24, 25, 26, 27
   *
   * Row 0-2 start face-down; row 3 is face-up.
   * A card flips face-up when both children covering it are removed.
   */
  peaks: (CardId | null)[];
  /** Which peak indices have been removed. */
  removed: boolean[];
  /** Which peak indices are face-up (visible/playable when exposed). */
  faceUp: boolean[];
  stock: CardId[];
  waste: CardId[];
  /** Current chain combo counter (resets on draw). */
  chain: number;
  score: number;
  moveCount: number;
  seed: number;
  gameOver: boolean;
  won: boolean;
  /** Tracks which of the 3 peaks are fully cleared (for bonus scoring). */
  peaksCleared: [boolean, boolean, boolean];
}

export type TriPeaksMoveType =
  | 'remove'  // remove an exposed peak card to waste
  | 'draw';   // draw from stock to waste

export interface TriPeaksMove {
  type: TriPeaksMoveType;
  /** Peak index (remove only). */
  index?: number;
}

// ── Scoring ───────────────────────────────────────────────────────────────────

const SCORE_PEAK_CLEARED = 15;

// ── Layout helpers ────────────────────────────────────────────────────────────

/**
 * TriPeaks layout — 3 overlapping pyramids sharing a base row.
 *
 * The covering relationship (children that cover a parent):
 *
 * Row 0 → Row 1:
 *   0 → [3, 4]
 *   1 → [5, 6]
 *   2 → [7, 8]
 *
 * Row 1 → Row 2:
 *   3 → [9, 10]
 *   4 → [10, 11]
 *   5 → [12, 13]
 *   6 → [13, 14]
 *   7 → [15, 16]
 *   8 → [16, 17]
 *
 * Row 2 → Row 3:
 *   9  → [18, 19]
 *   10 → [19, 20]
 *   11 → [20, 21]
 *   12 → [21, 22]
 *   13 → [22, 23]
 *   14 → [23, 24]
 *   15 → [24, 25]
 *   16 → [25, 26]
 *   17 → [26, 27]
 */

const CHILDREN: number[][] = (() => {
  const c: number[][] = new Array(28).fill(null).map(() => []);

  // Row 0 → Row 1
  c[0] = [3, 4];
  c[1] = [5, 6];
  c[2] = [7, 8];

  // Row 1 → Row 2
  c[3] = [9, 10];
  c[4] = [10, 11];
  c[5] = [12, 13];
  c[6] = [13, 14];
  c[7] = [15, 16];
  c[8] = [16, 17];

  // Row 2 → Row 3
  c[9] = [18, 19];
  c[10] = [19, 20];
  c[11] = [20, 21];
  c[12] = [21, 22];
  c[13] = [22, 23];
  c[14] = [23, 24];
  c[15] = [24, 25];
  c[16] = [25, 26];
  c[17] = [26, 27];

  // Row 3: bottom row, no children
  return c;
})();

/** Which peak indices belong to each of the 3 peaks. */
const PEAK_INDICES: number[][] = [
  // Peak 0 (left)
  [0, 3, 4, 9, 10, 11, 18, 19, 20, 21],
  // Peak 1 (center)
  [1, 5, 6, 12, 13, 14, 21, 22, 23, 24],
  // Peak 2 (right)
  [2, 7, 8, 15, 16, 17, 24, 25, 26, 27],
];

/** A peak card is exposed when both its children are removed (or it has no children). */
function isExposed(index: number, removed: boolean[]): boolean {
  if (removed[index]) return false;
  return CHILDREN[index].every(c => removed[c]);
}

/** Check if ranks are adjacent (wrapping: K<->A). */
function isAdjacentRank(r1: number, r2: number): boolean {
  const diff = Math.abs(r1 - r2);
  return diff === 1 || diff === 12; // 12 = wrap (K=13, A=1)
}

// ── State creation ────────────────────────────────────────────────────────────

export function createTriPeaksState(seed?: number): TriPeaksState {
  const gameSeed = seed ?? generateSeed();
  const deck = shuffle(createDeck(), gameSeed);

  const peaks = deck.slice(0, 28);
  const remaining = deck.slice(28); // 24 cards

  // Stock is cards 1-23 of remaining, waste starts with card 0
  const waste = [remaining[0]];
  const stock = remaining.slice(1); // 23 cards in stock

  // Face-up: only row 3 (indices 18-27) starts face-up
  const faceUp = new Array(28).fill(false);
  for (let i = 18; i <= 27; i++) {
    faceUp[i] = true;
  }

  return {
    peaks,
    removed: new Array(28).fill(false),
    faceUp,
    stock,
    waste,
    chain: 0,
    score: 0,
    moveCount: 0,
    seed: gameSeed,
    gameOver: false,
    won: false,
    peaksCleared: [false, false, false],
  };
}

// ── Legal moves ───────────────────────────────────────────────────────────────

export function getTriPeaksLegalMoves(state: TriPeaksState): TriPeaksMove[] {
  const moves: TriPeaksMove[] = [];

  if (state.waste.length === 0) {
    // No waste card to match against, can only draw
    if (state.stock.length > 0) {
      moves.push({ type: 'draw' });
    }
    return moves;
  }

  const wasteTop = state.waste[state.waste.length - 1];
  const wasteRank = rankOf(wasteTop);

  // Check all exposed, face-up peak cards
  for (let i = 0; i < 28; i++) {
    if (isExposed(i, state.removed) && state.faceUp[i]) {
      const card = state.peaks[i];
      if (card !== null && isAdjacentRank(rankOf(card), wasteRank)) {
        moves.push({ type: 'remove', index: i });
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

export function applyTriPeaksMove(state: TriPeaksState, move: TriPeaksMove): TriPeaksState {
  const next = cloneTriPeaksState(state);

  switch (move.type) {
    case 'remove': {
      const idx = move.index!;
      const card = next.peaks[idx]!;
      next.removed[idx] = true;
      next.waste.push(card);
      next.chain++;
      next.score += next.chain; // chain combo: 1, 2, 3, 4...

      // Flip newly exposed parents face-up
      flipExposedCards(next);

      // Check peak bonuses
      checkPeakCleared(next);
      break;
    }
    case 'draw': {
      const card = next.stock.pop()!;
      next.waste.push(card);
      next.chain = 0; // reset chain on draw
      break;
    }
  }

  next.moveCount++;

  // Check win
  if (hasTriPeaksWon(next)) {
    next.won = true;
    next.gameOver = true;
  }

  return next;
}

/** Flip any cards that are now exposed and were face-down. */
function flipExposedCards(state: TriPeaksState): void {
  for (let i = 0; i < 18; i++) { // only rows 0-2 can be face-down
    if (!state.removed[i] && !state.faceUp[i]) {
      if (CHILDREN[i].every(c => state.removed[c])) {
        state.faceUp[i] = true;
      }
    }
  }
}

/** Check if any peak was just fully cleared and award bonus. */
function checkPeakCleared(state: TriPeaksState): void {
  for (let p = 0; p < 3; p++) {
    if (!state.peaksCleared[p] && PEAK_INDICES[p].every(i => state.removed[i])) {
      state.peaksCleared[p] = true;
      state.score += SCORE_PEAK_CLEARED;
    }
  }
}

// ── Win check ─────────────────────────────────────────────────────────────────

export function hasTriPeaksWon(state: TriPeaksState): boolean {
  return state.removed.every(r => r);
}

// ── Serialization ─────────────────────────────────────────────────────────────

export function serializeTriPeaksState(state: TriPeaksState): string {
  return JSON.stringify(state);
}

export function deserializeTriPeaksState(raw: string): TriPeaksState | null {
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.seed === 'number' &&
      Array.isArray(parsed.peaks) &&
      Array.isArray(parsed.removed)
    ) {
      return parsed as TriPeaksState;
    }
    return null;
  } catch {
    return null;
  }
}

// ── Clone ─────────────────────────────────────────────────────────────────────

function cloneTriPeaksState(state: TriPeaksState): TriPeaksState {
  return {
    ...state,
    peaks: [...state.peaks],
    removed: [...state.removed],
    faceUp: [...state.faceUp],
    stock: [...state.stock],
    waste: [...state.waste],
    peaksCleared: [...state.peaksCleared] as [boolean, boolean, boolean],
  };
}
