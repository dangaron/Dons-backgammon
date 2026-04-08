/**
 * Spider Solitaire engine. Pure functions, no side effects.
 *
 * Rules:
 * - 2 decks (104 cards). Suit count determines difficulty:
 *   1-suit: all spades, 2-suit: spades+hearts, 4-suit: all suits.
 * - 10 tableau columns: first 4 have 6 cards (5 face-down + 1 face-up),
 *   last 6 have 5 cards (4 face-down + 1 face-up). Total dealt: 54 cards.
 * - 50 remaining cards in stock, dealt 10 at a time (one per column).
 * - Move same-suit descending sequences between columns.
 * - Any card/sequence can go on a card one rank higher (any suit).
 * - Complete K-A same-suit sequences are auto-removed.
 * - Win when all 8 sequences are removed.
 * - Stock can only be dealt when every column has at least one card.
 * - Scoring: +100 per completed sequence, -1 per move.
 */

import type { CardId, Suit } from './types';
import { suitOf, rankOf, shuffle } from './deck';
import { generateSeed } from '../../../prng/mulberry32';

// ── Types ─────────────────────────────────────────────────────────────────────

export type SpiderSuitCount = 1 | 2 | 4;

export interface SpiderTableauPile {
  faceDown: CardId[];
  faceUp: CardId[];
}

export interface SpiderState {
  tableau: SpiderTableauPile[];   // 10 columns
  stock: CardId[];                // remaining cards dealt 10 at a time
  completedSequences: number;     // 0-8 completed K-A same-suit runs
  moveCount: number;
  score: number;
  startTime: number;
  seed: number;
  suitCount: SpiderSuitCount;
  gameOver: boolean;
  won: boolean;
}

export type SpiderMoveType =
  | 'tableau-to-tableau'
  | 'deal-stock';

export interface SpiderMove {
  type: SpiderMoveType;
  /** Source column index (0-9). */
  from?: number;
  /** Destination column index (0-9). */
  to?: number;
  /** Number of face-up cards to move (from the bottom of the run). */
  count?: number;
}

// ── Scoring constants ─────────────────────────────────────────────────────────

const SCORE_COMPLETED_SEQUENCE = 100;
const SCORE_PER_MOVE = -1;

// ── Deck creation for Spider ──────────────────────────────────────────────────

const SUIT_MAP: Record<number, Suit> = {
  0: 'hearts',
  1: 'diamonds',
  2: 'clubs',
  3: 'spades',
};

/**
 * Build a 104-card deck for Spider, remapping suits based on difficulty.
 *
 * CardIds still use the standard 0-51 encoding (suitIndex * 13 + rank - 1),
 * but we create two copies. For reduced-suit modes we remap suits so that
 * only the allowed suits appear:
 *   1-suit: all cards mapped to spades (suitIndex 3)
 *   2-suit: mapped to spades (3) or hearts (0)
 *   4-suit: standard mapping
 */
function createSpiderDeck(suitCount: SpiderSuitCount): CardId[] {
  const singleDeck: CardId[] = [];

  for (let rank = 1; rank <= 13; rank++) {
    for (let s = 0; s < 4; s++) {
      let mappedSuit: number;
      if (suitCount === 1) {
        // All spades
        mappedSuit = 3;
      } else if (suitCount === 2) {
        // Alternate: spades and hearts
        mappedSuit = s % 2 === 0 ? 3 : 0; // spades or hearts
      } else {
        mappedSuit = s;
      }
      singleDeck.push(mappedSuit * 13 + (rank - 1));
    }
  }

  // Two decks
  return [...singleDeck, ...singleDeck];
}

// ── State creation ────────────────────────────────────────────────────────────

/** Create the initial Spider Solitaire state. */
export function createSpiderState(suitCount: SpiderSuitCount, seed?: number): SpiderState {
  const gameSeed = seed ?? generateSeed();
  const deck = shuffle(createSpiderDeck(suitCount), gameSeed);

  const tableau: SpiderTableauPile[] = [];
  let cardIndex = 0;

  // First 4 columns: 6 cards each (5 face-down, 1 face-up)
  for (let col = 0; col < 4; col++) {
    const faceDown = deck.slice(cardIndex, cardIndex + 5);
    cardIndex += 5;
    const faceUp = [deck[cardIndex++]];
    tableau.push({ faceDown, faceUp });
  }

  // Last 6 columns: 5 cards each (4 face-down, 1 face-up)
  for (let col = 4; col < 10; col++) {
    const faceDown = deck.slice(cardIndex, cardIndex + 4);
    cardIndex += 4;
    const faceUp = [deck[cardIndex++]];
    tableau.push({ faceDown, faceUp });
  }

  // Remaining 50 cards go to stock
  const stock = deck.slice(cardIndex);

  return {
    tableau,
    stock,
    completedSequences: 0,
    moveCount: 0,
    score: 0,
    startTime: Date.now(),
    seed: gameSeed,
    suitCount,
    gameOver: false,
    won: false,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Get the length of the movable same-suit descending run at the bottom
 * of a pile's face-up cards. E.g. if face-up is [8♠, 5♥, 4♥, 3♥],
 * the run length is 3 (5,4,3 of hearts).
 */
function getSameSuitRunLength(faceUp: CardId[]): number {
  if (faceUp.length === 0) return 0;
  let runLen = 1;
  for (let i = faceUp.length - 2; i >= 0; i--) {
    const lower = faceUp[i + 1];
    const upper = faceUp[i];
    if (suitOf(upper) === suitOf(lower) && rankOf(upper) === rankOf(lower) + 1) {
      runLen++;
    } else {
      break;
    }
  }
  return runLen;
}

/**
 * Check if a complete K-A same-suit sequence exists at the bottom of a pile's
 * face-up cards and return true if one was found and removed.
 * Mutates the pile in place (caller has already cloned state).
 */
function removeCompleteSequence(pile: SpiderTableauPile): boolean {
  const faceUp = pile.faceUp;
  if (faceUp.length < 13) return false;

  // Check the bottom 13 cards for K(13) down to A(1), same suit
  const startIdx = faceUp.length - 13;
  const expectedSuit = suitOf(faceUp[startIdx]);

  for (let i = 0; i < 13; i++) {
    const card = faceUp[startIdx + i];
    if (rankOf(card) !== 13 - i || suitOf(card) !== expectedSuit) {
      return false;
    }
  }

  // Remove the 13 cards
  pile.faceUp = faceUp.slice(0, startIdx);
  return true;
}

/** Flip the top face-down card if face-up is empty. Mutates in place. */
function flipTopCard(pile: SpiderTableauPile): void {
  if (pile.faceUp.length === 0 && pile.faceDown.length > 0) {
    pile.faceUp.push(pile.faceDown.pop()!);
  }
}

// ── Legal moves ───────────────────────────────────────────────────────────────

/** Get all legal moves for the current state. */
export function getSpiderLegalMoves(state: SpiderState): SpiderMove[] {
  if (state.gameOver) return [];

  const moves: SpiderMove[] = [];

  // Tableau-to-tableau moves
  for (let from = 0; from < 10; from++) {
    const fromPile = state.tableau[from];
    if (fromPile.faceUp.length === 0) continue;

    const runLen = getSameSuitRunLength(fromPile.faceUp);

    // Try moving subsequences of the run (1 card, 2 cards, ..., runLen cards)
    for (let count = 1; count <= runLen; count++) {
      const bottomCardIdx = fromPile.faceUp.length - count;
      const bottomCard = fromPile.faceUp[bottomCardIdx];
      const bottomRank = rankOf(bottomCard);

      for (let to = 0; to < 10; to++) {
        if (to === from) continue;

        const toPile = state.tableau[to];

        if (toPile.faceUp.length === 0) {
          // Any card/sequence can go on an empty column.
          // Only allow moving to empty if we're not just shuffling
          // (skip if the source pile only has the cards we're moving
          // and no face-down cards — pointless move to empty)
          if (count === fromPile.faceUp.length && fromPile.faceDown.length === 0) {
            continue; // Skip pointless move of entire pile to empty column
          }
          moves.push({ type: 'tableau-to-tableau', from, to, count });
        } else {
          const topCard = toPile.faceUp[toPile.faceUp.length - 1];
          if (rankOf(topCard) === bottomRank + 1) {
            moves.push({ type: 'tableau-to-tableau', from, to, count });
          }
        }
      }
    }
  }

  // Deal from stock (only if all 10 columns have at least one card)
  if (state.stock.length > 0) {
    const allColumnsHaveCards = state.tableau.every(
      pile => pile.faceUp.length > 0 || pile.faceDown.length > 0
    );
    if (allColumnsHaveCards) {
      moves.push({ type: 'deal-stock' });
    }
  }

  return moves;
}

// ── Move application ──────────────────────────────────────────────────────────

/** Apply a move immutably. Returns a new state. */
export function applySpiderMove(state: SpiderState, move: SpiderMove): SpiderState {
  let next = cloneSpiderState(state);

  switch (move.type) {
    case 'tableau-to-tableau':
      next = applyTableauToTableau(next, move.from!, move.to!, move.count!);
      break;
    case 'deal-stock':
      next = applyDealStock(next);
      break;
  }

  next.moveCount++;
  next.score += SCORE_PER_MOVE;

  // Check for completed sequences after every move
  next = checkAndRemoveSequences(next);

  // Check win
  if (next.completedSequences >= 8) {
    next.won = true;
    next.gameOver = true;
  }

  // Check if no moves remain (game over without win)
  if (!next.gameOver && getSpiderLegalMoves(next).length === 0) {
    next.gameOver = true;
  }

  return next;
}

function applyTableauToTableau(
  state: SpiderState, from: number, to: number, count: number
): SpiderState {
  const fromPile = state.tableau[from];
  const toPile = state.tableau[to];

  const cards = fromPile.faceUp.splice(fromPile.faceUp.length - count, count);
  toPile.faceUp.push(...cards);

  // Flip top face-down card if exposed
  flipTopCard(fromPile);

  return state;
}

function applyDealStock(state: SpiderState): SpiderState {
  // Deal 10 cards, one to each column
  const dealCount = Math.min(10, state.stock.length);
  for (let i = 0; i < dealCount; i++) {
    state.tableau[i].faceUp.push(state.stock.pop()!);
  }
  return state;
}

/** Check all tableau piles for complete K-A same-suit sequences and remove them. */
function checkAndRemoveSequences(state: SpiderState): SpiderState {
  let changed = true;
  while (changed) {
    changed = false;
    for (let col = 0; col < 10; col++) {
      if (removeCompleteSequence(state.tableau[col])) {
        state.completedSequences++;
        state.score += SCORE_COMPLETED_SEQUENCE;
        // Flip top face-down card if needed
        flipTopCard(state.tableau[col]);
        changed = true;
      }
    }
  }
  return state;
}

// ── Win check ─────────────────────────────────────────────────────────────────

/** Check if the game has been won (all 8 sequences completed). */
export function hasSpiderWon(state: SpiderState): boolean {
  return state.completedSequences >= 8;
}

// ── Serialization ─────────────────────────────────────────────────────────────

export function serializeSpiderState(state: SpiderState): string {
  return JSON.stringify(state);
}

export function deserializeSpiderState(raw: string): SpiderState | null {
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.seed === 'number' &&
      Array.isArray(parsed.tableau) &&
      parsed.tableau.length === 10
    ) {
      return parsed as SpiderState;
    }
    return null;
  } catch {
    return null;
  }
}

// ── Clone ─────────────────────────────────────────────────────────────────────

function cloneSpiderState(state: SpiderState): SpiderState {
  return {
    ...state,
    stock: [...state.stock],
    tableau: state.tableau.map(pile => ({
      faceDown: [...pile.faceDown],
      faceUp: [...pile.faceUp],
    })),
  };
}
