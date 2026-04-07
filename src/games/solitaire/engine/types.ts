/**
 * Core solitaire (Klondike) types. No browser or UI imports allowed.
 */

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
export type Color = 'red' | 'black';

/** Card ID: 0-51. Encodes suit and rank: id = suitIndex * 13 + (rank - 1). */
export type CardId = number;

export interface TableauPile {
  faceDown: CardId[];
  faceUp: CardId[];
}

/** Draw mode: how many cards are flipped from stock to waste. */
export type DrawMode = 1 | 3;

export interface SolitaireState {
  stock: CardId[];
  waste: CardId[];
  foundations: [CardId[], CardId[], CardId[], CardId[]];
  tableau: [TableauPile, TableauPile, TableauPile, TableauPile, TableauPile, TableauPile, TableauPile];
  moveCount: number;
  score: number;
  startTime: number;
  seed: number;
  drawMode: DrawMode;
  gameOver: boolean;
  won: boolean;
}

export type MoveType =
  | 'draw'
  | 'recycle'
  | 'waste-to-tableau'
  | 'waste-to-foundation'
  | 'tableau-to-tableau'
  | 'tableau-to-foundation'
  | 'foundation-to-tableau';

export interface SolitaireMove {
  type: MoveType;
  /** Source pile index (0-6 for tableau, 0-3 for foundation). */
  from?: number;
  /** Destination pile index. */
  to?: number;
  /** Number of face-up cards to move (tableau-to-tableau only). */
  count?: number;
}
