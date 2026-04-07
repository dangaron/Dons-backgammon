/**
 * Card utilities for Bridge. Reuses solitaire's PRNG shuffle pattern.
 */

import type { CardId, Suit, Rank } from './types';
import { SUITS } from './types';
import { Mulberry32 } from '../../../prng/mulberry32';

/** Suit of a card. */
export function suitOf(id: CardId): Suit {
  return SUITS[Math.floor(id / 13)];
}

/** Suit index (0-3). */
export function suitIndex(id: CardId): number {
  return Math.floor(id / 13);
}

/** Rank of a card (2-14, where 14=Ace). */
export function rankOf(id: CardId): Rank {
  return (id % 13) + 2 as Rank;
}

/** High Card Points for a card. A=4, K=3, Q=2, J=1, else 0. */
export function hcpOf(id: CardId): number {
  const rank = rankOf(id);
  if (rank === 14) return 4;
  if (rank === 13) return 3;
  if (rank === 12) return 2;
  if (rank === 11) return 1;
  return 0;
}

/** Display rank label. */
export function rankLabel(rank: Rank): string {
  switch (rank) {
    case 14: return 'A';
    case 13: return 'K';
    case 12: return 'Q';
    case 11: return 'J';
    default: return String(rank);
  }
}

/** Suit symbol. */
export function suitSymbol(suit: Suit): string {
  switch (suit) {
    case 'clubs': return '♣';
    case 'diamonds': return '♦';
    case 'hearts': return '♥';
    case 'spades': return '♠';
  }
}

/** Suit color. */
export function suitColor(suit: Suit): 'red' | 'black' {
  return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
}

/** Create deck 0-51. */
export function createDeck(): CardId[] {
  return Array.from({ length: 52 }, (_, i) => i);
}

/** Fisher-Yates shuffle with Mulberry32. */
export function shuffle(deck: CardId[], seed: number): CardId[] {
  const result = [...deck];
  const rng = new Mulberry32(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng.nextFloat() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Sort a hand by suit (spades, hearts, diamonds, clubs) then rank descending. */
export function sortHand(hand: CardId[]): CardId[] {
  return [...hand].sort((a, b) => {
    const suitOrder = [3, 2, 1, 0]; // spades, hearts, diamonds, clubs
    const sa = suitOrder[suitIndex(a)];
    const sb = suitOrder[suitIndex(b)];
    if (sa !== sb) return sb - sa;
    return rankOf(b) - rankOf(a);
  });
}

/** Bid suit symbol. */
export function bidSuitSymbol(suit: string): string {
  switch (suit) {
    case 'clubs': return '♣';
    case 'diamonds': return '♦';
    case 'hearts': return '♥';
    case 'spades': return '♠';
    case 'notrump': return 'NT';
    default: return suit;
  }
}
