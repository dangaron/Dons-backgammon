/**
 * Bridge AI — rule-based bidding and card play.
 * Designed for casual play, not tournament-level.
 */

import type { BridgeState, CardId, BidAction, Bid, BidSuit, BidLevel, Trick } from './types';
import { SUITS, nextSeat, partnerOf, sameTeam } from './types';
import { suitOf, rankOf, hcpOf } from './deck';
import { isLegalBid, getLegalCards } from './game';

// ── Bidding AI ─────────────────────────────────────────────────────────────────

interface HandEvaluation {
  hcp: number;
  suitLengths: Record<string, number>;
  longestSuit: BidSuit;
  longestLength: number;
  isBalanced: boolean;
}

function evaluateHand(hand: CardId[]): HandEvaluation {
  const hcp = hand.reduce((sum, c) => sum + hcpOf(c), 0);

  const suitLengths: Record<string, number> = {};
  for (const suit of SUITS) {
    suitLengths[suit] = hand.filter(c => suitOf(c) === suit).length;
  }

  let longestSuit: BidSuit = 'clubs';
  let longestLength = 0;
  // Prefer majors over minors
  for (const suit of ['spades', 'hearts', 'diamonds', 'clubs'] as BidSuit[]) {
    if ((suitLengths[suit] || 0) > longestLength) {
      longestLength = suitLengths[suit] || 0;
      longestSuit = suit;
    }
  }

  const lengths = Object.values(suitLengths);
  const isBalanced = lengths.every(l => l >= 2) && lengths.filter(l => l === 2).length <= 1;

  return { hcp, suitLengths, longestSuit, longestLength, isBalanced };
}

export function getAIBid(state: BridgeState): BidAction {
  const hand = state.hands[state.currentBidder];
  const eval_ = evaluateHand(hand);

  // Simple rule-based opening system
  const lastBid = findLastNonPassBid(state.bidHistory);

  // If no one has bid yet (or only passes)
  if (!lastBid) {
    return chooseOpeningBid(eval_, state);
  }

  // If partner has bid, consider supporting
  const partnerBid = findPartnersBid(state);
  if (partnerBid) {
    return chooseResponse(eval_, partnerBid, state);
  }

  // Opponent bid — compete or pass
  if (eval_.hcp >= 10) {
    return chooseCompetitiveBid(eval_, lastBid, state);
  }

  return { type: 'pass' };
}

function chooseOpeningBid(eval_: HandEvaluation, state: BridgeState): BidAction {
  // Too weak to open
  if (eval_.hcp < 12) return { type: 'pass' };

  // 1NT with 15-17 HCP and balanced
  if (eval_.hcp >= 15 && eval_.hcp <= 17 && eval_.isBalanced) {
    const bid: Bid = { type: 'bid', level: 1, suit: 'notrump' };
    if (isLegalBid(state, bid)) return bid;
  }

  // Open longest suit at 1-level
  const bid: Bid = { type: 'bid', level: 1, suit: eval_.longestSuit };
  if (isLegalBid(state, bid)) return bid;

  // If can't bid at 1, pass
  return { type: 'pass' };
}

function chooseResponse(eval_: HandEvaluation, partnerBid: Bid, state: BridgeState): BidAction {
  // Raise partner's suit with 3+ support and 6+ HCP
  if (partnerBid.suit !== 'notrump') {
    const support = eval_.suitLengths[partnerBid.suit] || 0;
    if (support >= 3 && eval_.hcp >= 6) {
      const raiseLevel = Math.min(partnerBid.level + 1, 4) as BidLevel;
      const bid: Bid = { type: 'bid', level: raiseLevel, suit: partnerBid.suit };
      if (isLegalBid(state, bid)) return bid;
    }
  }

  // Bid own long suit with 10+ HCP
  if (eval_.hcp >= 10 && eval_.longestLength >= 5) {
    const bid: Bid = { type: 'bid', level: 1, suit: eval_.longestSuit };
    if (isLegalBid(state, bid)) return bid;
    const bid2: Bid = { type: 'bid', level: 2, suit: eval_.longestSuit };
    if (isLegalBid(state, bid2)) return bid2;
  }

  // Bid 1NT with 6-9 HCP
  if (eval_.hcp >= 6 && eval_.hcp <= 9) {
    const bid: Bid = { type: 'bid', level: 1, suit: 'notrump' };
    if (isLegalBid(state, bid)) return bid;
  }

  return { type: 'pass' };
}

function chooseCompetitiveBid(eval_: HandEvaluation, _lastBid: Bid, state: BridgeState): BidAction {
  // Try to bid own suit
  if (eval_.longestLength >= 5) {
    for (let level = 1 as BidLevel; level <= 3; level++) {
      const bid: Bid = { type: 'bid', level: level as BidLevel, suit: eval_.longestSuit };
      if (isLegalBid(state, bid)) return bid;
    }
  }

  // Double with 12+ HCP if opponent bid
  if (eval_.hcp >= 12) {
    const dbl: BidAction = { type: 'double' };
    if (isLegalBid(state, dbl)) return dbl;
  }

  return { type: 'pass' };
}

function findLastNonPassBid(history: BidAction[]): Bid | null {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].type === 'bid') return history[i] as Bid;
  }
  return null;
}

function findPartnersBid(state: BridgeState): Bid | null {
  const partner = partnerOf(state.currentBidder);
  let seat = state.dealer;
  for (const action of state.bidHistory) {
    if (seat === partner && action.type === 'bid') return action as Bid;
    seat = nextSeat(seat);
  }
  return null;
}

// ── Card Play AI ───────────────────────────────────────────────────────────────

export function getAICard(state: BridgeState): CardId {
  const legalCards = getLegalCards(state);
  if (legalCards.length === 1) return legalCards[0];

  const trick = state.currentTrick;
  const contract = state.contract!;
  const trump = contract.suit;

  // Leading a trick
  if (trick.cards.length === 0) {
    return chooseLead(legalCards, state);
  }

  const ledSuit_ = suitOf(trick.cards[0].card);

  // Following suit
  if (legalCards.every(c => suitOf(c) === ledSuit_)) {
    return chooseFollowSuit(legalCards, trick, state);
  }

  // Can't follow suit — decide whether to trump
  if (trump !== 'notrump') {
    const trumpCards = legalCards.filter(c => suitOf(c) === trump);
    if (trumpCards.length > 0) {
      // Check if partner is winning the trick
      if (isPartnerWinning(trick, state)) {
        // Don't trump partner — play lowest
        return legalCards.reduce((low, c) => rankOf(c) < rankOf(low) ? c : low);
      }
      // Trump with lowest trump
      return trumpCards.reduce((low, c) => rankOf(c) < rankOf(low) ? c : low);
    }
  }

  // Discard lowest card
  return legalCards.reduce((low, c) => rankOf(c) < rankOf(low) ? c : low);
}

function chooseLead(cards: CardId[], state: BridgeState): CardId {
  const contract = state.contract!;

  // Lead partner's bid suit if possible
  // Lead top of a sequence
  // Lead 4th from longest suit
  // Simplified: lead highest card of longest suit
  const suitGroups: Record<string, CardId[]> = {};
  for (const c of cards) {
    const s = suitOf(c);
    if (!suitGroups[s]) suitGroups[s] = [];
    suitGroups[s].push(c);
  }

  // Avoid leading trump unless it's our best suit
  let bestSuit = '';
  let bestLength = 0;
  for (const [suit, group] of Object.entries(suitGroups)) {
    if (suit === contract.suit) continue; // avoid leading trump
    if (group.length > bestLength) {
      bestLength = group.length;
      bestSuit = suit;
    }
  }

  if (bestSuit && suitGroups[bestSuit]) {
    // Lead 4th highest if 4+ cards, otherwise highest
    const sorted = suitGroups[bestSuit].sort((a, b) => rankOf(b) - rankOf(a));
    return sorted.length >= 4 ? sorted[3] : sorted[0];
  }

  // Fallback: highest card
  return cards.reduce((high, c) => rankOf(c) > rankOf(high) ? c : high);
}

function chooseFollowSuit(cards: CardId[], trick: Trick, state: BridgeState): CardId {
  // If we can win the trick, play lowest winning card
  const currentHighest = getHighestInTrick(trick, state.contract!.suit);
  const winners = cards.filter(c => rankOf(c) > rankOf(currentHighest));

  if (isPartnerWinning(trick, state)) {
    // Partner is winning — play lowest
    return cards.reduce((low, c) => rankOf(c) < rankOf(low) ? c : low);
  }

  if (winners.length > 0) {
    // Play lowest winner
    return winners.reduce((low, c) => rankOf(c) < rankOf(low) ? c : low);
  }

  // Can't win — play lowest
  return cards.reduce((low, c) => rankOf(c) < rankOf(low) ? c : low);
}

function getHighestInTrick(trick: Trick, trump: BidSuit): CardId {
  let highest = trick.cards[0].card;

  for (const { card } of trick.cards) {
    if (trump !== 'notrump' && suitOf(card) === trump && suitOf(highest) !== trump) {
      highest = card;
    } else if (suitOf(card) === suitOf(highest) && rankOf(card) > rankOf(highest)) {
      highest = card;
    }
  }

  return highest;
}

function isPartnerWinning(trick: Trick, state: BridgeState): boolean {
  if (trick.cards.length === 0) return false;

  const trump = state.contract!.suit;
  let winnerSeat = trick.cards[0].seat;
  let winnerCard = trick.cards[0].card;

  for (const { seat, card } of trick.cards) {
    const cSuit = suitOf(card);
    const wSuit = suitOf(winnerCard);

    if (trump !== 'notrump' && cSuit === trump && wSuit !== trump) {
      winnerSeat = seat;
      winnerCard = card;
    } else if (cSuit === wSuit && rankOf(card) > rankOf(winnerCard)) {
      winnerSeat = seat;
      winnerCard = card;
    }
  }

  return sameTeam(winnerSeat, state.currentPlayer);
}
