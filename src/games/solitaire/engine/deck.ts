/**
 * Card utilities. Pure functions, no side effects.
 */

import type { CardId, Suit, Rank, Color } from './types';
import { Mulberry32 } from '../../../prng/mulberry32';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const SUIT_COLORS: Record<Suit, Color> = {
  hearts: 'red',
  diamonds: 'red',
  clubs: 'black',
  spades: 'black',
};

/** Create a standard 52-card deck (CardId 0-51). */
export function createDeck(): CardId[] {
  return Array.from({ length: 52 }, (_, i) => i);
}

/** Get the suit of a card. */
export function suitOf(id: CardId): Suit {
  return SUITS[Math.floor(id / 13)];
}

/** Get the suit index (0-3) of a card. */
export function suitIndex(id: CardId): number {
  return Math.floor(id / 13);
}

/** Get the rank of a card (1=Ace, 13=King). */
export function rankOf(id: CardId): Rank {
  return ((id % 13) + 1) as Rank;
}

/** Get the color of a card. */
export function colorOf(id: CardId): Color {
  return SUIT_COLORS[suitOf(id)];
}

/** Get display label for a rank. */
export function rankLabel(rank: Rank): string {
  switch (rank) {
    case 1: return 'A';
    case 11: return 'J';
    case 12: return 'Q';
    case 13: return 'K';
    default: return String(rank);
  }
}

/** Get suit symbol. */
export function suitSymbol(suit: Suit): string {
  switch (suit) {
    case 'hearts': return '♥';
    case 'diamonds': return '♦';
    case 'clubs': return '♣';
    case 'spades': return '♠';
  }
}

/** Fisher-Yates shuffle using Mulberry32 PRNG for reproducibility. */
export function shuffle(deck: CardId[], seed: number): CardId[] {
  const result = [...deck];
  const rng = new Mulberry32(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng.nextFloat() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
