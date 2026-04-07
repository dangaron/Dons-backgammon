/**
 * Bridge game state management. Pure functions, no side effects.
 */

import type {
  BridgeState, Seat, CardId, BidAction, Bid, Contract, Trick, BidSuit,
} from './types';
import { SEATS, BID_SUITS, nextSeat, partnerOf, teamOf, sameTeam } from './types';
import { createDeck, shuffle, sortHand, suitOf, rankOf } from './deck';
import { generateSeed } from '../../../prng/mulberry32';

// ── State creation ─────────────────────────────────────────────────────────────

export function createInitialState(humanSeat: Seat = 'south', seed?: number): BridgeState {
  const gameSeed = seed ?? generateSeed();
  const deck = shuffle(createDeck(), gameSeed);

  // Deal 13 cards to each player
  const hands: Record<Seat, CardId[]> = {
    north: sortHand(deck.slice(0, 13)),
    east: sortHand(deck.slice(13, 26)),
    south: sortHand(deck.slice(26, 39)),
    west: sortHand(deck.slice(39, 52)),
  };

  // Dealer is random-ish based on seed
  const dealer = SEATS[gameSeed % 4];

  return {
    hands,
    dealer,
    currentBidder: dealer,
    bidHistory: [],
    contract: null,
    dummy: null,
    currentPlayer: dealer,
    tricks: [],
    currentTrick: { leader: dealer, cards: [] },
    tricksWon: { ns: 0, ew: 0 },
    phase: 'bidding',
    score: { ns: 0, ew: 0 },
    seed: gameSeed,
    humanSeat,
    gameOver: false,
    result: null,
  };
}

// ── Bidding ────────────────────────────────────────────────────────────────────

/** Check if a bid is legal. */
export function isLegalBid(state: BridgeState, action: BidAction): boolean {
  if (state.phase !== 'bidding') return false;

  const history = state.bidHistory;

  if (action.type === 'pass') return true;

  if (action.type === 'double') {
    // Can only double the last non-pass bid, and it must be from the opposing team
    const lastBid = findLastBid(history);
    if (!lastBid) return false;
    const lastBidder = findLastBidder(state);
    if (!lastBidder) return false;
    if (sameTeam(state.currentBidder, lastBidder)) return false;
    // Check no double/redouble already
    const afterLastBid = history.slice(history.lastIndexOf(lastBid));
    return !afterLastBid.some(b => b.type === 'double');
  }

  if (action.type === 'redouble') {
    const afterLastBid = getActionsAfterLastBid(history);
    const hasDouble = afterLastBid.some(b => b.type === 'double');
    if (!hasDouble) return false;
    const hasRedouble = afterLastBid.some(b => b.type === 'redouble');
    if (hasRedouble) return false;
    // Must be the team that was doubled
    const lastBidder = findLastBidder(state);
    return lastBidder !== null && sameTeam(state.currentBidder, lastBidder);
  }

  // Regular bid: must be higher than the last bid
  const lastBid = findLastBid(history);
  if (!lastBid) return true; // First bid

  return compareBids(action as Bid, lastBid) > 0;
}

/** Compare two bids. Returns positive if a > b. */
function compareBids(a: Bid, b: Bid): number {
  if (a.level !== b.level) return a.level - b.level;
  return BID_SUITS.indexOf(a.suit) - BID_SUITS.indexOf(b.suit);
}

function findLastBid(history: BidAction[]): Bid | null {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].type === 'bid') return history[i] as Bid;
  }
  return null;
}

function findLastBidder(state: BridgeState): Seat | null {
  let seat = state.dealer;
  let lastBidSeat: Seat | null = null;
  for (const action of state.bidHistory) {
    if (action.type === 'bid') lastBidSeat = seat;
    seat = nextSeat(seat);
  }
  return lastBidSeat;
}

function getActionsAfterLastBid(history: BidAction[]): BidAction[] {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].type === 'bid') return history.slice(i + 1);
  }
  return history;
}

/** Place a bid. Returns new state. */
export function placeBid(state: BridgeState, action: BidAction): BridgeState {
  if (!isLegalBid(state, action)) return state;

  const newHistory = [...state.bidHistory, action];
  const newBidder = nextSeat(state.currentBidder);

  // Check if bidding is over: 3 consecutive passes after at least one bid
  if (isBiddingOver(newHistory)) {
    const lastBid = findLastBid(newHistory);

    // All pass — no contract, deal again
    if (!lastBid) {
      return {
        ...state,
        bidHistory: newHistory,
        phase: 'game-over',
        gameOver: true,
        result: 'All Pass — no contract',
      };
    }

    // Determine contract
    const contract = determineContract(state, newHistory, lastBid);
    const declarer = contract.declarer;
    const dummy = partnerOf(declarer);
    const leader = nextSeat(declarer); // Left of declarer leads

    return {
      ...state,
      bidHistory: newHistory,
      contract,
      dummy,
      phase: 'playing',
      currentPlayer: leader,
      currentTrick: { leader, cards: [] },
    };
  }

  return {
    ...state,
    bidHistory: newHistory,
    currentBidder: newBidder,
  };
}

function isBiddingOver(history: BidAction[]): boolean {
  if (history.length < 4) return false;
  const hasBid = history.some(b => b.type === 'bid');
  if (!hasBid) {
    // 4 passes with no bids = all pass
    return history.length >= 4 && history.slice(-4).every(b => b.type === 'pass');
  }
  // 3 consecutive passes after at least one bid
  return history.length >= 4 && history.slice(-3).every(b => b.type === 'pass');
}

function determineContract(state: BridgeState, history: BidAction[], lastBid: Bid): Contract {
  // Find who first bid the contract suit for the declaring team
  const lastBidder = (() => {
    let seat = state.dealer;
    let found: Seat = state.dealer;
    for (const action of history) {
      if (action.type === 'bid') found = seat;
      seat = nextSeat(seat);
    }
    return found;
  })();

  // The declarer is the first player on the declaring team who bid the contract suit
  const declaringTeam = teamOf(lastBidder);
  let declarer = lastBidder;
  let seat = state.dealer;
  for (const action of history) {
    if (action.type === 'bid' && (action as Bid).suit === lastBid.suit && teamOf(seat) === declaringTeam) {
      declarer = seat;
      break;
    }
    seat = nextSeat(seat);
  }

  const afterLastBid = getActionsAfterLastBid(history);
  const doubled = afterLastBid.some(b => b.type === 'double');
  const redoubled = afterLastBid.some(b => b.type === 'redouble');

  return {
    level: lastBid.level,
    suit: lastBid.suit,
    doubled: doubled && !redoubled,
    redoubled,
    declarer,
  };
}

// ── Trick play ─────────────────────────────────────────────────────────────────

/** Get legal cards to play from hand. */
export function getLegalCards(state: BridgeState): CardId[] {
  const hand = state.hands[state.currentPlayer];
  const trick = state.currentTrick;

  // First card of trick: any card is legal
  if (trick.cards.length === 0) return hand;

  // Must follow suit if possible
  const ledSuit = suitOf(trick.cards[0].card);
  const sameSuit = hand.filter(c => suitOf(c) === ledSuit);
  return sameSuit.length > 0 ? sameSuit : hand;
}

/** Play a card. Returns new state. */
export function playCard(state: BridgeState, card: CardId): BridgeState {
  if (state.phase !== 'playing') return state;

  const legalCards = getLegalCards(state);
  if (!legalCards.includes(card)) return state;

  // Remove card from hand
  const newHands = { ...state.hands };
  newHands[state.currentPlayer] = newHands[state.currentPlayer].filter(c => c !== card);

  // Add card to current trick
  const newTrickCards = [...state.currentTrick.cards, { seat: state.currentPlayer, card }];

  // If trick is complete (4 cards played)
  if (newTrickCards.length === 4) {
    const winner = determineTrickWinner(newTrickCards, state.contract!.suit);
    const completedTrick: Trick = {
      leader: state.currentTrick.leader,
      cards: newTrickCards,
      winner,
    };

    const newTricks = [...state.tricks, completedTrick];
    const newTricksWon = { ...state.tricksWon };
    if (teamOf(winner) === 'ns') newTricksWon.ns++;
    else newTricksWon.ew++;

    // Check if all 13 tricks have been played
    if (newTricks.length === 13) {
      return finishGame({
        ...state,
        hands: newHands,
        tricks: newTricks,
        tricksWon: newTricksWon,
        currentTrick: { leader: winner, cards: [] },
      });
    }

    // Winner leads next trick
    return {
      ...state,
      hands: newHands,
      tricks: newTricks,
      tricksWon: newTricksWon,
      currentPlayer: winner,
      currentTrick: { leader: winner, cards: [] },
    };
  }

  // Next player
  return {
    ...state,
    hands: newHands,
    currentPlayer: nextSeat(state.currentPlayer),
    currentTrick: { ...state.currentTrick, cards: newTrickCards },
  };
}

/** Determine who wins a trick. */
function determineTrickWinner(cards: { seat: Seat; card: CardId }[], trump: BidSuit): Seat {
  let winner = cards[0];

  for (let i = 1; i < cards.length; i++) {
    const card = cards[i];
    const cardSuit = suitOf(card.card);
    const winnerSuit = suitOf(winner.card);

    if (trump !== 'notrump') {
      // Trump beats non-trump
      if (cardSuit === trump && winnerSuit !== trump) {
        winner = card;
        continue;
      }
      if (winnerSuit === trump && cardSuit !== trump) continue;
    }

    // Same suit: higher rank wins
    if (cardSuit === winnerSuit && rankOf(card.card) > rankOf(winner.card)) {
      winner = card;
    }
  }

  return winner.seat;
}

/** Finish the game and calculate result. */
function finishGame(state: BridgeState): BridgeState {
  const contract = state.contract!;
  const declarerTeam = teamOf(contract.declarer);
  const tricksNeeded = contract.level + 6;
  const tricksMade = declarerTeam === 'ns' ? state.tricksWon.ns : state.tricksWon.ew;
  const overUnder = tricksMade - tricksNeeded;

  const suitSym = contract.suit === 'notrump' ? 'NT' :
    contract.suit === 'spades' ? '♠' : contract.suit === 'hearts' ? '♥' :
    contract.suit === 'diamonds' ? '♦' : '♣';

  let result: string;
  if (overUnder >= 0) {
    result = overUnder === 0
      ? `Made ${contract.level}${suitSym}`
      : `Made ${contract.level}${suitSym} +${overUnder}`;
  } else {
    result = `Down ${Math.abs(overUnder)}`;
  }

  // Simple scoring (not full rubber/duplicate scoring)
  const score = calculateScore(contract, tricksMade);
  const newScore = { ...state.score };
  if (declarerTeam === 'ns') {
    newScore.ns += score;
  } else {
    newScore.ew += score;
  }

  return {
    ...state,
    phase: 'game-over',
    gameOver: true,
    result,
    score: newScore,
  };
}

/** Simplified bridge scoring. */
function calculateScore(contract: Contract, tricksMade: number): number {
  const tricksNeeded = contract.level + 6;
  const overUnder = tricksMade - tricksNeeded;

  if (overUnder < 0) {
    // Undertricks: -50 per trick (non-vulnerable simplified)
    const penalty = contract.redoubled ? 200 : contract.doubled ? 100 : 50;
    return overUnder * penalty;
  }

  // Contract tricks
  let perTrick: number;
  if (contract.suit === 'notrump') {
    perTrick = 30; // first trick is 40, but simplified
  } else if (contract.suit === 'hearts' || contract.suit === 'spades') {
    perTrick = 30; // major suits
  } else {
    perTrick = 20; // minor suits
  }

  let score = contract.level * perTrick;
  if (contract.suit === 'notrump') score += 10; // first trick bonus

  if (contract.doubled) score *= 2;
  if (contract.redoubled) score *= 4;

  // Game bonus
  if (score >= 100) score += 300;
  // Slam bonuses
  if (contract.level === 6) score += 500;
  if (contract.level === 7) score += 1000;

  // Overtricks
  score += overUnder * (contract.doubled ? 100 : contract.redoubled ? 200 : perTrick);

  return score;
}

// ── Serialization ──────────────────────────────────────────────────────────────

export function serializeState(state: BridgeState): string {
  return JSON.stringify(state);
}

export function deserializeState(raw: string): BridgeState | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.seed === 'number' && parsed.hands) {
      return parsed as BridgeState;
    }
    return null;
  } catch {
    return null;
  }
}
