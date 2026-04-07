/**
 * Core Bridge types. No browser or UI imports allowed.
 */

export type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades';
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14; // 11=J, 12=Q, 13=K, 14=A

export type CardId = number; // 0-51: suitIndex * 13 + (rank - 2)

/** Seat positions at the table. N/S are partners, E/W are partners. */
export type Seat = 'north' | 'east' | 'south' | 'west';

export const SEATS: Seat[] = ['north', 'east', 'south', 'west'];
export const SUITS: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades'];

/** Bid suits + notrump, ordered by rank. */
export type BidSuit = Suit | 'notrump';
export const BID_SUITS: BidSuit[] = ['clubs', 'diamonds', 'hearts', 'spades', 'notrump'];

export type BidLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface Bid {
  type: 'bid';
  level: BidLevel;
  suit: BidSuit;
}

export interface SpecialBid {
  type: 'pass' | 'double' | 'redouble';
}

export type BidAction = Bid | SpecialBid;

export interface Contract {
  level: BidLevel;
  suit: BidSuit;
  doubled: boolean;
  redoubled: boolean;
  declarer: Seat;
}

export interface Trick {
  leader: Seat;
  cards: { seat: Seat; card: CardId }[];
  winner?: Seat;
}

export type GamePhase = 'bidding' | 'playing' | 'game-over';

export interface BridgeState {
  hands: Record<Seat, CardId[]>;
  dealer: Seat;
  currentBidder: Seat;
  bidHistory: BidAction[];
  contract: Contract | null;
  dummy: Seat | null;          // partner of declarer — hand is visible
  currentPlayer: Seat;
  tricks: Trick[];
  currentTrick: Trick;
  tricksWon: { ns: number; ew: number };
  phase: GamePhase;
  score: { ns: number; ew: number };
  seed: number;
  humanSeat: Seat;             // which seat the human plays
  gameOver: boolean;
  result: string | null;       // e.g. "Made 4♠" or "Down 2"
}

/** Partnership containing a seat. */
export function partnerOf(seat: Seat): Seat {
  switch (seat) {
    case 'north': return 'south';
    case 'south': return 'north';
    case 'east': return 'west';
    case 'west': return 'east';
  }
}

/** Next seat clockwise. */
export function nextSeat(seat: Seat): Seat {
  const idx = SEATS.indexOf(seat);
  return SEATS[(idx + 1) % 4];
}

/** Are two seats on the same partnership? */
export function sameTeam(a: Seat, b: Seat): boolean {
  return a === b || partnerOf(a) === b;
}

/** Team of a seat. */
export function teamOf(seat: Seat): 'ns' | 'ew' {
  return seat === 'north' || seat === 'south' ? 'ns' : 'ew';
}
