/**
 * Bridge statistics, achievements, and settings engine.
 * Pure data, no UI imports. Persisted to localStorage.
 */

import type { BridgeState } from './types';
import { teamOf } from './types';

// ── Stats ──────────────────────────────────────────────────────────────────────

export interface BridgeStats {
  handsPlayed: number;
  handsWon: number;              // won as declarer (N/S made contract)
  handsMade: number;             // contract was made (declarer side)
  handsSet: number;              // contract was defeated (defense side)
  totalScore: number;            // cumulative N/S score
  bestScore: number;             // best single-hand score
  contractsMade: Record<number, number>; // count by contract level (1-7)
  slamsMade: number;             // 6-level contracts made
  grandSlamsMade: number;        // 7-level contracts made
  avgTricksPerHand: number;
  totalTricks: number;           // used internally to compute avg
  perfectHands: number;          // made contract with zero overtricks
  overtricks: number;            // total overtricks accumulated
  currentStreak: number;         // consecutive wins as declarer
  bestStreak: number;
  recentResults: boolean[];      // last 20 hands (true = contract made when declarer)
  doubledAndMade: number;        // opponent doubled, declarer made it
  redoubledAndMade: number;      // redoubled and made
  allPassHands: number;          // hands that passed out
  vulnerableSlamsMade: number;   // slams made (counted for achievement)
}

const STATS_KEY = 'bridge-stats-v1';

function defaultStats(): BridgeStats {
  return {
    handsPlayed: 0,
    handsWon: 0,
    handsMade: 0,
    handsSet: 0,
    totalScore: 0,
    bestScore: 0,
    contractsMade: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 },
    slamsMade: 0,
    grandSlamsMade: 0,
    avgTricksPerHand: 0,
    totalTricks: 0,
    perfectHands: 0,
    overtricks: 0,
    currentStreak: 0,
    bestStreak: 0,
    recentResults: [],
    doubledAndMade: 0,
    redoubledAndMade: 0,
    allPassHands: 0,
    vulnerableSlamsMade: 0,
  };
}

export function loadStats(): BridgeStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const stats = defaultStats();
      Object.assign(stats, parsed);
      // Ensure contractsMade has all keys
      for (let i = 1; i <= 7; i++) {
        if (stats.contractsMade[i] === undefined) stats.contractsMade[i] = 0;
      }
      return stats;
    }
  } catch { /* ignore */ }
  return defaultStats();
}

export function saveStats(stats: BridgeStats): void {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

export function recordHandResult(
  stats: BridgeStats,
  state: BridgeState,
): BridgeStats {
  const next: BridgeStats = JSON.parse(JSON.stringify(stats));
  next.handsPlayed++;

  // All-pass hand
  if (!state.contract) {
    next.allPassHands++;
    next.recentResults = [...next.recentResults, false].slice(-20);
    next.currentStreak = 0;
    saveStats(next);
    return next;
  }

  const contract = state.contract;
  const declarerTeam = teamOf(contract.declarer);
  const humanTeam = teamOf(state.humanSeat);
  const tricksNeeded = contract.level + 6;
  const tricksMade = declarerTeam === 'ns' ? state.tricksWon.ns : state.tricksWon.ew;
  const overUnder = tricksMade - tricksNeeded;
  const contractMade = overUnder >= 0;

  // Track N/S score
  const nsScore = state.score.ns;
  next.totalScore = nsScore;
  if (nsScore > next.bestScore) next.bestScore = nsScore;

  // Track total tricks won by human's team
  const humanTricks = humanTeam === 'ns' ? state.tricksWon.ns : state.tricksWon.ew;
  next.totalTricks += humanTricks;
  next.avgTricksPerHand = Math.round((next.totalTricks / next.handsPlayed) * 10) / 10;

  // Determine if human was declarer
  const humanIsDeclarer = humanTeam === declarerTeam;

  if (contractMade) {
    next.handsMade++;
    next.contractsMade[contract.level] = (next.contractsMade[contract.level] || 0) + 1;

    if (humanIsDeclarer) {
      next.handsWon++;
      next.currentStreak++;
      next.bestStreak = Math.max(next.bestStreak, next.currentStreak);
      next.recentResults = [...next.recentResults, true].slice(-20);
    } else {
      // Defense failed to set the contract
      next.recentResults = [...next.recentResults, false].slice(-20);
      next.currentStreak = 0;
    }

    // Perfect hand (no overtricks)
    if (overUnder === 0) {
      next.perfectHands++;
    }

    // Overtricks
    if (overUnder > 0) {
      next.overtricks += overUnder;
    }

    // Slam tracking
    if (contract.level === 6) {
      next.slamsMade++;
      next.vulnerableSlamsMade++;
    }
    if (contract.level === 7) {
      next.grandSlamsMade++;
      next.slamsMade++;
      next.vulnerableSlamsMade++;
    }

    // Doubled/redoubled and made
    if (contract.doubled) {
      next.doubledAndMade++;
    }
    if (contract.redoubled) {
      next.redoubledAndMade++;
    }
  } else {
    // Contract set
    next.handsSet++;

    if (humanIsDeclarer) {
      // Declarer went down
      next.recentResults = [...next.recentResults, false].slice(-20);
      next.currentStreak = 0;
    } else {
      // Good defense
      next.handsWon++;
      next.currentStreak++;
      next.bestStreak = Math.max(next.bestStreak, next.currentStreak);
      next.recentResults = [...next.recentResults, true].slice(-20);
    }
  }

  saveStats(next);
  return next;
}

// ── Achievements ───────────────────────────────────────────────────────────────

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'beginner' | 'bidding' | 'play' | 'streak' | 'score' | 'special';
  check: (stats: BridgeStats) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  // ── Beginner ──
  {
    id: 'first-hand',
    name: 'First Hand',
    description: 'Play your first hand of Bridge',
    icon: '🃏',
    category: 'beginner',
    check: (s) => s.handsPlayed >= 1,
  },
  {
    id: 'ten-hands',
    name: 'Getting the Hang of It',
    description: 'Play 10 hands of Bridge',
    icon: '🔟',
    category: 'beginner',
    check: (s) => s.handsPlayed >= 10,
  },
  {
    id: 'fifty-hands',
    name: 'Seasoned Player',
    description: 'Play 50 hands of Bridge',
    icon: '🎓',
    category: 'beginner',
    check: (s) => s.handsPlayed >= 50,
  },
  {
    id: 'hundred-hands',
    name: 'Bridge Veteran',
    description: 'Play 100 hands of Bridge',
    icon: '💯',
    category: 'beginner',
    check: (s) => s.handsPlayed >= 100,
  },
  {
    id: 'first-contract-made',
    name: 'First Contract Made',
    description: 'Successfully make a contract as declarer',
    icon: '✅',
    category: 'beginner',
    check: (s) => s.handsMade >= 1,
  },
  {
    id: 'first-win',
    name: 'First Victory',
    description: 'Win your first hand (make contract or set opponents)',
    icon: '🏆',
    category: 'beginner',
    check: (s) => s.handsWon >= 1,
  },

  // ── Bidding ──
  {
    id: 'game-3nt',
    name: 'No Trump Game',
    description: 'Bid and make 3NT',
    icon: '🎯',
    category: 'bidding',
    check: (s) => (s.contractsMade[3] || 0) >= 1,
  },
  {
    id: 'game-4major',
    name: 'Major Game',
    description: 'Bid and make a 4-level contract',
    icon: '♠',
    category: 'bidding',
    check: (s) => (s.contractsMade[4] || 0) >= 1,
  },
  {
    id: 'game-5minor',
    name: 'Minor Game',
    description: 'Bid and make a 5-level contract',
    icon: '♣',
    category: 'bidding',
    check: (s) => (s.contractsMade[5] || 0) >= 1,
  },
  {
    id: 'small-slam',
    name: 'Slam Bidder',
    description: 'Bid and make a small slam (6-level)',
    icon: '🌟',
    category: 'bidding',
    check: (s) => s.slamsMade >= 1,
  },
  {
    id: 'grand-slam',
    name: 'Grand Slam!',
    description: 'Bid and make a grand slam (7-level)',
    icon: '👑',
    category: 'bidding',
    check: (s) => s.grandSlamsMade >= 1,
  },
  {
    id: 'precise-bid',
    name: 'Precise Bid',
    description: 'Make your contract exactly with no overtricks',
    icon: '🎯',
    category: 'bidding',
    check: (s) => s.perfectHands >= 1,
  },
  {
    id: 'five-precise',
    name: 'Precision Expert',
    description: 'Make 5 contracts with exactly zero overtricks',
    icon: '🎪',
    category: 'bidding',
    check: (s) => s.perfectHands >= 5,
  },
  {
    id: 'ten-contracts',
    name: 'Reliable Declarer',
    description: 'Make 10 contracts',
    icon: '📋',
    category: 'bidding',
    check: (s) => s.handsMade >= 10,
  },

  // ── Play ──
  {
    id: 'ten-tricks',
    name: 'Trick Master',
    description: 'Win 10 or more tricks in a single hand',
    icon: '🔥',
    category: 'play',
    check: (s) => s.avgTricksPerHand >= 10 || s.slamsMade >= 1,
  },
  {
    id: 'twelve-tricks',
    name: 'Small Slam Hand',
    description: 'Win 12 tricks in a single hand',
    icon: '⭐',
    category: 'play',
    check: (s) => s.slamsMade >= 1,
  },
  {
    id: 'thirteen-tricks',
    name: 'Clean Sweep',
    description: 'Win all 13 tricks in a single hand',
    icon: '💎',
    category: 'play',
    check: (s) => s.grandSlamsMade >= 1,
  },
  {
    id: 'perfect-defense',
    name: 'Perfect Defense',
    description: 'Set the opponents\' contract by 3 or more tricks',
    icon: '🛡️',
    category: 'play',
    check: (s) => s.handsSet >= 3,
  },
  {
    id: 'defensive-master',
    name: 'Defensive Master',
    description: 'Set 10 contracts as defense',
    icon: '🏰',
    category: 'play',
    check: (s) => s.handsSet >= 10,
  },
  {
    id: 'squeeze-play',
    name: 'Squeeze Play',
    description: 'Accumulate 50 total overtricks through careful endplay',
    icon: '🤏',
    category: 'play',
    check: (s) => s.overtricks >= 50,
  },

  // ── Streak ──
  {
    id: 'streak-3',
    name: 'Hot Streak',
    description: 'Win 3 hands in a row',
    icon: '🔥',
    category: 'streak',
    check: (s) => s.bestStreak >= 3,
  },
  {
    id: 'streak-5',
    name: 'On Fire',
    description: 'Win 5 hands in a row',
    icon: '🔥🔥',
    category: 'streak',
    check: (s) => s.bestStreak >= 5,
  },
  {
    id: 'streak-10',
    name: 'Unstoppable',
    description: 'Win 10 hands in a row',
    icon: '💪',
    category: 'streak',
    check: (s) => s.bestStreak >= 10,
  },

  // ── Score ──
  {
    id: 'score-1000',
    name: 'Big Score',
    description: 'Score 1000+ points on a single hand',
    icon: '💰',
    category: 'score',
    check: (s) => s.bestScore >= 1000,
  },
  {
    id: 'score-2000',
    name: 'Jackpot',
    description: 'Score 2000+ total points',
    icon: '💎',
    category: 'score',
    check: (s) => s.totalScore >= 2000,
  },
  {
    id: 'score-5000',
    name: 'High Roller',
    description: 'Accumulate 5000 total points',
    icon: '🏦',
    category: 'score',
    check: (s) => s.totalScore >= 5000,
  },
  {
    id: 'score-10000',
    name: 'Bridge Baron',
    description: 'Accumulate 10000 total points',
    icon: '🏰',
    category: 'score',
    check: (s) => s.totalScore >= 10000,
  },

  // ── Special ──
  {
    id: 'doubled-and-made',
    name: 'Doubled and Made',
    description: 'Make a contract after being doubled by opponents',
    icon: '😏',
    category: 'special',
    check: (s) => s.doubledAndMade >= 1,
  },
  {
    id: 'redoubled-and-made',
    name: 'Redoubled and Made',
    description: 'Make a contract after it was redoubled',
    icon: '😎',
    category: 'special',
    check: (s) => s.redoubledAndMade >= 1,
  },
  {
    id: 'all-pass',
    name: 'Passed Out',
    description: 'Experience a hand that passes out with no contract',
    icon: '🤷',
    category: 'special',
    check: (s) => s.allPassHands >= 1,
  },
  {
    id: 'vulnerable-slam',
    name: 'Vulnerable Slam',
    description: 'Make a slam contract',
    icon: '🎲',
    category: 'special',
    check: (s) => s.vulnerableSlamsMade >= 1,
  },
  {
    id: 'twenty-five-wins',
    name: 'Quarter Century',
    description: 'Win 25 hands',
    icon: '🥈',
    category: 'special',
    check: (s) => s.handsWon >= 25,
  },
  {
    id: 'fifty-wins',
    name: 'Half Century',
    description: 'Win 50 hands',
    icon: '🥇',
    category: 'special',
    check: (s) => s.handsWon >= 50,
  },
];

export function getUnlockedAchievements(stats: BridgeStats): string[] {
  return ACHIEVEMENTS.filter((a) => a.check(stats)).map((a) => a.id);
}

export function getNewAchievements(
  prevUnlocked: string[],
  stats: BridgeStats,
): Achievement[] {
  const currentUnlocked = getUnlockedAchievements(stats);
  return currentUnlocked
    .filter((id) => !prevUnlocked.includes(id))
    .map((id) => ACHIEVEMENTS.find((a) => a.id === id)!)
    .filter(Boolean);
}

// ── Settings ───────────────────────────────────────────────────────────────────

export interface BridgeSettings {
  animationSpeed: 1 | 2 | 3;           // 1=slow, 2=normal, 3=fast
  soundEnabled: boolean;
  showPlayableCards: boolean;           // highlight legal plays
  autoPlaySingletons: boolean;          // auto-play when only one legal card
  showBiddingHistory: boolean;          // display full bidding sequence
  showTrickCount: boolean;              // show tricks won overlay
  cardSortOrder: 'suit' | 'rank';      // how to sort cards in hand
  bidBoxPosition: 'bottom' | 'side';   // where the bid box appears
  showDummyAutoSort: boolean;           // auto-sort dummy's hand by suit
  tableColor: string;                   // CSS color for table background
}

const SETTINGS_KEY = 'bridge-settings-v1';

export const DEFAULT_SETTINGS: BridgeSettings = {
  animationSpeed: 2,
  soundEnabled: true,
  showPlayableCards: true,
  autoPlaySingletons: false,
  showBiddingHistory: true,
  showTrickCount: true,
  cardSortOrder: 'suit',
  bidBoxPosition: 'bottom',
  showDummyAutoSort: true,
  tableColor: '#0f5132',
};

export function loadSettings(): BridgeSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: BridgeSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
