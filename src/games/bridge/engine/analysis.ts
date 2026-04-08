/**
 * Post-hand analysis engine for Bridge.
 * Reviews bidding and play decisions to provide feedback.
 * Pure functions, no UI imports.
 */

import type { BridgeState, CardId, Seat, BidAction, Bid } from './types';
import { nextSeat, partnerOf, teamOf, sameTeam } from './types';
import { suitOf, rankOf, hcpOf, rankLabel, suitSymbol } from './deck';

// ── Analysis types ─────────────────────────────────────────────────────────────

export interface BridgePlayAnalysis {
  trickNumber: number;
  playerCard: CardId;
  bestCard: CardId;
  wasOptimal: boolean;
  explanation: string;
}

export interface BridgeBidAnalysis {
  bidRound: number;
  playerBid: BidAction;
  suggestedBid: BidAction;
  wasOptimal: boolean;
  explanation: string;
}

export interface BridgeHandAnalysis {
  totalPlays: number;
  optimalPlays: number;
  optimalPercentage: number;
  biddingScore: number;          // 0-100
  playScore: number;             // 0-100
  mistakes: AnalysisMistake[];
  rating: 'excellent' | 'good' | 'average' | 'poor';
}

export interface AnalysisMistake {
  phase: 'bidding' | 'play';
  description: string;
  suggestion: string;
}

// ── Play history entry ─────────────────────────────────────────────────────────

export interface PlayHistoryEntry {
  seat: Seat;
  card: CardId;
}

// ── Hand analysis ──────────────────────────────────────────────────────────────

export function analyzeHand(
  state: BridgeState,
  playHistory: PlayHistoryEntry[],
): BridgeHandAnalysis {
  const playAnalyses = analyzePlayDecisions(state, playHistory);
  const bidAnalyses = analyzeBiddingDecisions(state);

  const totalPlays = playAnalyses.length;
  const optimalPlays = playAnalyses.filter((p) => p.wasOptimal).length;
  const optimalPercentage = totalPlays > 0 ? Math.round((optimalPlays / totalPlays) * 100) : 100;

  const optimalBids = bidAnalyses.filter((b) => b.wasOptimal).length;
  const totalBids = bidAnalyses.length;
  const biddingScore = totalBids > 0 ? Math.round((optimalBids / totalBids) * 100) : 100;
  const playScore = optimalPercentage;

  const mistakes: AnalysisMistake[] = [];

  for (const bid of bidAnalyses) {
    if (!bid.wasOptimal) {
      mistakes.push({
        phase: 'bidding',
        description: bid.explanation,
        suggestion: formatBidSuggestion(bid.suggestedBid),
      });
    }
  }

  for (const play of playAnalyses) {
    if (!play.wasOptimal) {
      mistakes.push({
        phase: 'play',
        description: play.explanation,
        suggestion: `Consider playing the ${formatCard(play.bestCard)} instead`,
      });
    }
  }

  const avgScore = (biddingScore + playScore) / 2;
  let rating: BridgeHandAnalysis['rating'];
  if (avgScore >= 90) rating = 'excellent';
  else if (avgScore >= 70) rating = 'good';
  else if (avgScore >= 50) rating = 'average';
  else rating = 'poor';

  return {
    totalPlays,
    optimalPlays,
    optimalPercentage,
    biddingScore,
    playScore,
    mistakes,
    rating,
  };
}

// ── Bidding analysis ───────────────────────────────────────────────────────────

function analyzeBiddingDecisions(state: BridgeState): BridgeBidAnalysis[] {
  const analyses: BridgeBidAnalysis[] = [];
  const humanSeat = state.humanSeat;

  let bidder = state.dealer;
  for (let i = 0; i < state.bidHistory.length; i++) {
    const bid = state.bidHistory[i];

    if (bidder === humanSeat) {
      const hand = getOriginalHand(state, humanSeat);
      const hcp = hand.reduce((sum, c) => sum + hcpOf(c), 0);
      const analysis = analyzeSingleBid(bid, hcp, hand, i, state.bidHistory);

      analyses.push({
        bidRound: i,
        playerBid: bid,
        suggestedBid: analysis.suggested,
        wasOptimal: analysis.wasOptimal,
        explanation: analysis.explanation,
      });
    }

    bidder = nextSeat(bidder);
  }

  return analyses;
}

function analyzeSingleBid(
  bid: BidAction,
  hcp: number,
  hand: CardId[],
  roundIndex: number,
  history: BidAction[],
): { suggested: BidAction; wasOptimal: boolean; explanation: string } {
  // Determine suit lengths
  const suitLengths: Record<string, number> = {};
  for (const suit of ['clubs', 'diamonds', 'hearts', 'spades']) {
    suitLengths[suit] = hand.filter((c) => suitOf(c) === suit).length;
  }
  const isBalanced = Object.values(suitLengths).every((l) => l >= 2) &&
    Object.values(suitLengths).filter((l) => l === 2).length <= 1;

  // Check if there was a prior bid
  const hasPriorBid = history.slice(0, roundIndex).some((b) => b.type === 'bid');

  // Opening bid analysis
  if (!hasPriorBid) {
    if (hcp >= 12 && bid.type === 'pass') {
      return {
        suggested: { type: 'bid', level: 1 as const, suit: getLongestSuit(suitLengths) },
        wasOptimal: false,
        explanation: `With ${hcp} HCP, you should open the bidding rather than pass`,
      };
    }
    if (hcp < 12 && bid.type === 'bid') {
      return {
        suggested: { type: 'pass' },
        wasOptimal: false,
        explanation: `With only ${hcp} HCP, passing is usually better than opening`,
      };
    }
    if (hcp >= 15 && hcp <= 17 && isBalanced && bid.type === 'bid') {
      const b = bid as Bid;
      if (b.suit !== 'notrump' || b.level !== 1) {
        return {
          suggested: { type: 'bid', level: 1 as const, suit: 'notrump' },
          wasOptimal: false,
          explanation: `With ${hcp} HCP and a balanced hand, 1NT is the standard opening`,
        };
      }
    }
  }

  return {
    suggested: bid,
    wasOptimal: true,
    explanation: 'Reasonable bidding decision',
  };
}

function getLongestSuit(suitLengths: Record<string, number>): 'clubs' | 'diamonds' | 'hearts' | 'spades' {
  let longest: 'clubs' | 'diamonds' | 'hearts' | 'spades' = 'clubs';
  let maxLen = 0;
  for (const suit of ['spades', 'hearts', 'diamonds', 'clubs'] as const) {
    if ((suitLengths[suit] || 0) > maxLen) {
      maxLen = suitLengths[suit] || 0;
      longest = suit;
    }
  }
  return longest;
}

// ── Play analysis ──────────────────────────────────────────────────────────────

function analyzePlayDecisions(
  state: BridgeState,
  playHistory: PlayHistoryEntry[],
): BridgePlayAnalysis[] {
  const analyses: BridgePlayAnalysis[] = [];
  const humanSeat = state.humanSeat;

  if (!state.contract) return analyses;

  const contract = state.contract;
  const trump = contract.suit;
  const declarerTeam = teamOf(contract.declarer);
  const isHumanDeclarer = teamOf(humanSeat) === declarerTeam;

  let trickNumber = 0;
  let cardsInTrick = 0;
  const trickCards: PlayHistoryEntry[] = [];

  for (let i = 0; i < playHistory.length; i++) {
    const entry = playHistory[i];
    trickCards.push(entry);
    cardsInTrick++;

    if (entry.seat === humanSeat || entry.seat === partnerOf(humanSeat)) {
      // Only analyze human and dummy (when human is declarer) plays
      if (entry.seat === humanSeat ||
          (isHumanDeclarer && entry.seat === partnerOf(humanSeat))) {
        const analysis = analyzeSinglePlay(
          entry,
          trickCards,
          trickNumber,
          trump,
          isHumanDeclarer,
        );
        if (analysis) {
          analyses.push(analysis);
        }
      }
    }

    if (cardsInTrick === 4) {
      trickNumber++;
      cardsInTrick = 0;
      trickCards.length = 0;
    }
  }

  return analyses;
}

function analyzeSinglePlay(
  entry: PlayHistoryEntry,
  currentTrickCards: PlayHistoryEntry[],
  trickNumber: number,
  trump: string,
  isHumanDeclarer: boolean,
): BridgePlayAnalysis | null {
  const position = currentTrickCards.length;

  // Leading a trick
  if (position === 1) {
    return analyzeLeadPlay(entry, trickNumber, trump, isHumanDeclarer);
  }

  // Following suit
  if (position >= 2 && position <= 4) {
    return analyzeFollowPlay(entry, currentTrickCards, trickNumber, trump);
  }

  return null;
}

function analyzeLeadPlay(
  entry: PlayHistoryEntry,
  trickNumber: number,
  trump: string,
  isHumanDeclarer: boolean,
): BridgePlayAnalysis | null {
  const card = entry.card;
  const cardRank = rankOf(card);
  const cardSuit = suitOf(card);

  // Leading trump as declarer in late tricks can be good
  if (isHumanDeclarer && cardSuit === trump && trickNumber < 3) {
    // Drawing trumps early is often good
    return {
      trickNumber,
      playerCard: card,
      bestCard: card,
      wasOptimal: true,
      explanation: 'Drawing trumps early is a sound declarer play strategy',
    };
  }

  // Leading an ace is generally fine
  if (cardRank === 14) {
    return {
      trickNumber,
      playerCard: card,
      bestCard: card,
      wasOptimal: true,
      explanation: 'Leading an Ace is a safe, strong lead',
    };
  }

  // Leading a king from K-Q is good
  if (cardRank === 13) {
    return {
      trickNumber,
      playerCard: card,
      bestCard: card,
      wasOptimal: true,
      explanation: 'Leading from honor strength is a standard approach',
    };
  }

  // Generally any lead is acceptable; mark as optimal unless egregiously bad
  return {
    trickNumber,
    playerCard: card,
    bestCard: card,
    wasOptimal: true,
    explanation: 'Acceptable lead choice',
  };
}

function analyzeFollowPlay(
  entry: PlayHistoryEntry,
  trickCards: PlayHistoryEntry[],
  trickNumber: number,
  trump: string,
): BridgePlayAnalysis | null {
  const card = entry.card;
  const cardRank = rankOf(card);
  const cardSuit = suitOf(card);
  const ledCard = trickCards[0].card;
  const ledSuit = suitOf(ledCard);

  // Following suit
  if (cardSuit === ledSuit) {
    // Check if we played a higher card when a lower card was winning
    const currentWinner = getCurrentWinner(trickCards.slice(0, -1), trump);

    if (currentWinner) {
      const winnerSeat = currentWinner.seat;
      const isPartnerWinning = sameTeam(winnerSeat, entry.seat);

      if (isPartnerWinning && cardRank > rankOf(currentWinner.card)) {
        return {
          trickNumber,
          playerCard: card,
          bestCard: card, // Could compute a better card, but the low card logic is complex
          wasOptimal: false,
          explanation: `Partner was already winning this trick. Playing low (${formatCard(card)}) would conserve your high card for later`,
        };
      }
    }

    return {
      trickNumber,
      playerCard: card,
      bestCard: card,
      wasOptimal: true,
      explanation: 'Good follow-suit play',
    };
  }

  // Trumping
  if (cardSuit === trump) {
    const currentWinner = getCurrentWinner(trickCards.slice(0, -1), trump);
    if (currentWinner && sameTeam(currentWinner.seat, entry.seat)) {
      return {
        trickNumber,
        playerCard: card,
        bestCard: card,
        wasOptimal: false,
        explanation: 'Trumping when partner is winning wastes your trump. Consider discarding a low card instead',
      };
    }
    return {
      trickNumber,
      playerCard: card,
      bestCard: card,
      wasOptimal: true,
      explanation: 'Good decision to trump when unable to follow suit',
    };
  }

  // Discarding
  return {
    trickNumber,
    playerCard: card,
    bestCard: card,
    wasOptimal: true,
    explanation: 'Discard when unable to follow suit or trump',
  };
}

function getCurrentWinner(
  cards: PlayHistoryEntry[],
  trump: string,
): PlayHistoryEntry | null {
  if (cards.length === 0) return null;

  let winner = cards[0];
  for (let i = 1; i < cards.length; i++) {
    const card = cards[i];
    const cardSuit = suitOf(card.card);
    const winnerSuit = suitOf(winner.card);

    if (trump !== 'notrump') {
      if (cardSuit === trump && winnerSuit !== trump) {
        winner = card;
        continue;
      }
      if (winnerSuit === trump && cardSuit !== trump) continue;
    }

    if (cardSuit === winnerSuit && rankOf(card.card) > rankOf(winner.card)) {
      winner = card;
    }
  }

  return winner;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getOriginalHand(state: BridgeState, seat: Seat): CardId[] {
  // Reconstruct the original hand from current hand + played cards
  const currentHand = [...state.hands[seat]];
  const playedCards: CardId[] = [];

  for (const trick of state.tricks) {
    for (const entry of trick.cards) {
      if (entry.seat === seat) {
        playedCards.push(entry.card);
      }
    }
  }

  // Also check current trick
  for (const entry of state.currentTrick.cards) {
    if (entry.seat === seat) {
      playedCards.push(entry.card);
    }
  }

  return [...currentHand, ...playedCards];
}

function formatCard(cardId: CardId): string {
  const rank = rankOf(cardId);
  const suit = suitOf(cardId);
  return `${rankLabel(rank)}${suitSymbol(suit)}`;
}

function formatBidSuggestion(bid: BidAction): string {
  if (bid.type === 'pass') return 'Consider passing';
  if (bid.type === 'double') return 'Consider doubling';
  if (bid.type === 'redouble') return 'Consider redoubling';
  const b = bid as Bid;
  const suitStr = b.suit === 'notrump' ? 'NT' :
    b.suit === 'spades' ? '♠' : b.suit === 'hearts' ? '♥' :
    b.suit === 'diamonds' ? '♦' : '♣';
  return `Consider bidding ${b.level}${suitStr}`;
}
