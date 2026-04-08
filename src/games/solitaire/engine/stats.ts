/**
 * Solitaire statistics and achievements engine.
 * Pure data, no UI imports. Persisted to localStorage.
 */

import type { SolitaireVariant } from './variants';

// ── Stats ──────────────────────────────────────────────────────────────────────

export interface VariantStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  bestStreak: number;
  bestTime: number | null;     // seconds
  bestScore: number | null;
  totalMoves: number;
  averageMoves: number | null;
  recentResults: boolean[];    // last 20 games (true=win)
  dailyChallengesCompleted: number;
}

export interface GlobalStats {
  totalGamesPlayed: number;
  totalGamesWon: number;
  longestDailyStreak: number;
  currentDailyStreak: number;
  lastPlayedDate: string | null;     // ISO date string
  favoriteVariant: SolitaireVariant | null;
  totalPlayTimeSeconds: number;
}

export interface SolitaireStats {
  global: GlobalStats;
  variants: Record<SolitaireVariant, VariantStats>;
}

const STATS_KEY = 'solitaire-stats-v2';

function defaultVariantStats(): VariantStats {
  return {
    gamesPlayed: 0, gamesWon: 0,
    currentStreak: 0, bestStreak: 0,
    bestTime: null, bestScore: null,
    totalMoves: 0, averageMoves: null,
    recentResults: [],
    dailyChallengesCompleted: 0,
  };
}

function defaultStats(): SolitaireStats {
  return {
    global: {
      totalGamesPlayed: 0, totalGamesWon: 0,
      longestDailyStreak: 0, currentDailyStreak: 0,
      lastPlayedDate: null, favoriteVariant: null,
      totalPlayTimeSeconds: 0,
    },
    variants: {
      klondike: defaultVariantStats(),
      spider: defaultVariantStats(),
      freecell: defaultVariantStats(),
      pyramid: defaultVariantStats(),
      tripeaks: defaultVariantStats(),
    },
  };
}

export function loadStats(): SolitaireStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Merge with defaults to handle new fields
      const stats = defaultStats();
      if (parsed.global) Object.assign(stats.global, parsed.global);
      for (const v of ['klondike', 'spider', 'freecell', 'pyramid', 'tripeaks'] as SolitaireVariant[]) {
        if (parsed.variants?.[v]) Object.assign(stats.variants[v], parsed.variants[v]);
      }
      return stats;
    }
  } catch { /* ignore */ }
  return defaultStats();
}

export function saveStats(stats: SolitaireStats): void {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

export function recordGameResult(
  stats: SolitaireStats,
  variant: SolitaireVariant,
  won: boolean,
  timeSeconds: number,
  score: number,
  moves: number,
): SolitaireStats {
  const next = JSON.parse(JSON.stringify(stats)) as SolitaireStats;
  const vs = next.variants[variant];

  vs.gamesPlayed++;
  vs.totalMoves += moves;
  vs.averageMoves = Math.round(vs.totalMoves / vs.gamesPlayed);

  if (won) {
    vs.gamesWon++;
    vs.currentStreak++;
    vs.bestStreak = Math.max(vs.bestStreak, vs.currentStreak);
    if (vs.bestTime === null || timeSeconds < vs.bestTime) vs.bestTime = timeSeconds;
    if (vs.bestScore === null || score > vs.bestScore) vs.bestScore = score;
  } else {
    vs.currentStreak = 0;
  }

  // Track recent results (last 20)
  vs.recentResults = [...vs.recentResults, won].slice(-20);

  // Global stats
  next.global.totalGamesPlayed++;
  if (won) next.global.totalGamesWon++;
  next.global.totalPlayTimeSeconds += timeSeconds;

  // Daily streak
  const today = new Date().toISOString().split('T')[0];
  if (next.global.lastPlayedDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (next.global.lastPlayedDate === yesterday) {
      next.global.currentDailyStreak++;
    } else {
      next.global.currentDailyStreak = 1;
    }
    next.global.longestDailyStreak = Math.max(next.global.longestDailyStreak, next.global.currentDailyStreak);
    next.global.lastPlayedDate = today;
  }

  // Favorite variant (most played)
  let maxPlayed = 0;
  for (const [v, s] of Object.entries(next.variants)) {
    if (s.gamesPlayed > maxPlayed) {
      maxPlayed = s.gamesPlayed;
      next.global.favoriteVariant = v as SolitaireVariant;
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
  category: 'beginner' | 'intermediate' | 'expert' | 'variant' | 'streak' | 'speed' | 'special';
  check: (stats: SolitaireStats) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  // Beginner
  { id: 'first-win', name: 'First Victory', description: 'Win your first game', icon: '🏆', category: 'beginner',
    check: s => s.global.totalGamesWon >= 1 },
  { id: 'ten-wins', name: 'Getting Started', description: 'Win 10 games', icon: '⭐', category: 'beginner',
    check: s => s.global.totalGamesWon >= 10 },
  { id: 'fifty-wins', name: 'Card Shark', description: 'Win 50 games', icon: '🦈', category: 'beginner',
    check: s => s.global.totalGamesWon >= 50 },
  { id: 'hundred-wins', name: 'Centurion', description: 'Win 100 games', icon: '💯', category: 'beginner',
    check: s => s.global.totalGamesWon >= 100 },
  { id: 'five-hundred-wins', name: 'Card Master', description: 'Win 500 games', icon: '👑', category: 'beginner',
    check: s => s.global.totalGamesWon >= 500 },

  // Streak
  { id: 'streak-3', name: 'Hot Streak', description: 'Win 3 games in a row', icon: '🔥', category: 'streak',
    check: s => Object.values(s.variants).some(v => v.bestStreak >= 3) },
  { id: 'streak-5', name: 'On Fire', description: 'Win 5 games in a row', icon: '🔥🔥', category: 'streak',
    check: s => Object.values(s.variants).some(v => v.bestStreak >= 5) },
  { id: 'streak-10', name: 'Unstoppable', description: 'Win 10 games in a row', icon: '💪', category: 'streak',
    check: s => Object.values(s.variants).some(v => v.bestStreak >= 10) },
  { id: 'daily-7', name: 'Weekly Warrior', description: 'Play 7 days in a row', icon: '📅', category: 'streak',
    check: s => s.global.longestDailyStreak >= 7 },
  { id: 'daily-30', name: 'Monthly Master', description: 'Play 30 days in a row', icon: '🗓️', category: 'streak',
    check: s => s.global.longestDailyStreak >= 30 },

  // Speed
  { id: 'speed-3min', name: 'Quick Draw', description: 'Win Klondike in under 3 minutes', icon: '⚡', category: 'speed',
    check: s => s.variants.klondike.bestTime !== null && s.variants.klondike.bestTime < 180 },
  { id: 'speed-2min', name: 'Lightning', description: 'Win Klondike in under 2 minutes', icon: '⚡⚡', category: 'speed',
    check: s => s.variants.klondike.bestTime !== null && s.variants.klondike.bestTime < 120 },
  { id: 'speed-1min', name: 'Blitz', description: 'Win Klondike in under 1 minute', icon: '💨', category: 'speed',
    check: s => s.variants.klondike.bestTime !== null && s.variants.klondike.bestTime < 60 },

  // Variant-specific
  { id: 'klondike-win', name: 'Classic', description: 'Win a Klondike game', icon: '🃏', category: 'variant',
    check: s => s.variants.klondike.gamesWon >= 1 },
  { id: 'spider-win', name: 'Spider Slayer', description: 'Win a Spider game', icon: '🕷️', category: 'variant',
    check: s => s.variants.spider.gamesWon >= 1 },
  { id: 'freecell-win', name: 'Free Thinker', description: 'Win a FreeCell game', icon: '🧩', category: 'variant',
    check: s => s.variants.freecell.gamesWon >= 1 },
  { id: 'pyramid-win', name: 'Pharaoh', description: 'Win a Pyramid game', icon: '🔺', category: 'variant',
    check: s => s.variants.pyramid.gamesWon >= 1 },
  { id: 'tripeaks-win', name: 'Mountaineer', description: 'Win a TriPeaks game', icon: '⛰️', category: 'variant',
    check: s => s.variants.tripeaks.gamesWon >= 1 },
  { id: 'all-variants', name: 'Renaissance', description: 'Win at least one game of every variant', icon: '🌟', category: 'variant',
    check: s => Object.values(s.variants).every(v => v.gamesWon >= 1) },
  { id: 'spider-4suit', name: 'Arachnophile', description: 'Win Spider with 4 suits', icon: '🕸️', category: 'variant',
    check: s => s.variants.spider.gamesWon >= 1 }, // We track suit count separately if needed
  { id: 'klondike-draw3', name: 'Hard Mode', description: 'Win Klondike on Draw-3', icon: '🎯', category: 'variant',
    check: s => s.variants.klondike.gamesWon >= 1 }, // Tracked separately

  // Expert
  { id: 'win-rate-50', name: 'Better Than Average', description: 'Achieve 50% win rate (20+ games)', icon: '📊', category: 'expert',
    check: s => {
      for (const v of Object.values(s.variants)) {
        if (v.gamesPlayed >= 20 && v.gamesWon / v.gamesPlayed >= 0.5) return true;
      }
      return false;
    }},
  { id: 'win-rate-75', name: 'Elite Player', description: 'Achieve 75% win rate (20+ games)', icon: '🏅', category: 'expert',
    check: s => {
      for (const v of Object.values(s.variants)) {
        if (v.gamesPlayed >= 20 && v.gamesWon / v.gamesPlayed >= 0.75) return true;
      }
      return false;
    }},
  { id: 'thousand-games', name: 'Dedicated', description: 'Play 1000 total games', icon: '🎮', category: 'expert',
    check: s => s.global.totalGamesPlayed >= 1000 },
  { id: 'ten-hours', name: 'Time Well Spent', description: 'Play for 10 total hours', icon: '⏰', category: 'expert',
    check: s => s.global.totalPlayTimeSeconds >= 36000 },

  // Special
  { id: 'perfect-pyramid', name: 'Perfect Pyramid', description: 'Clear the entire pyramid in Pyramid', icon: '✨', category: 'special',
    check: s => s.variants.pyramid.gamesWon >= 1 },
  { id: 'chain-10', name: 'Combo King', description: 'Get a 10+ chain in TriPeaks', icon: '🔗', category: 'special',
    check: s => s.variants.tripeaks.bestScore !== null && s.variants.tripeaks.bestScore >= 200 },
  { id: 'no-stock', name: 'Stockless', description: 'Win Klondike without drawing from stock', icon: '🚫', category: 'special',
    check: () => false }, // Special tracking needed
  { id: 'speed-freecell', name: 'Speed Cell', description: 'Win FreeCell in under 5 minutes', icon: '⏱️', category: 'special',
    check: s => s.variants.freecell.bestTime !== null && s.variants.freecell.bestTime < 300 },
];

export function getUnlockedAchievements(stats: SolitaireStats): string[] {
  return ACHIEVEMENTS.filter(a => a.check(stats)).map(a => a.id);
}

export function getNewAchievements(prevUnlocked: string[], stats: SolitaireStats): Achievement[] {
  const currentUnlocked = getUnlockedAchievements(stats);
  return currentUnlocked
    .filter(id => !prevUnlocked.includes(id))
    .map(id => ACHIEVEMENTS.find(a => a.id === id)!)
    .filter(Boolean);
}

// ── Settings ───────────────────────────────────────────────────────────────────

export interface SolitaireSettings {
  fourColorDeck: boolean;
  autoComplete: boolean;
  autoMoveToFoundation: boolean;
  showTimer: boolean;
  showMoveCount: boolean;
  animationSpeed: 1 | 2 | 3;  // 1=slow, 2=normal, 3=fast
  cardBack: string;            // card back style id
  tableColor: string;          // CSS color for table background
  zenMode: boolean;            // no score, no timer, ambient
  winnableDealsOnly: boolean;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  largeCards: boolean;
  leftHanded: boolean;
}

const SETTINGS_KEY = 'solitaire-settings-v1';

export const DEFAULT_SETTINGS: SolitaireSettings = {
  fourColorDeck: false,
  autoComplete: true,
  autoMoveToFoundation: true,
  showTimer: true,
  showMoveCount: true,
  animationSpeed: 2,
  cardBack: 'classic-blue',
  tableColor: '#0f5132',
  zenMode: false,
  winnableDealsOnly: false,
  soundEnabled: true,
  hapticsEnabled: true,
  largeCards: false,
  leftHanded: false,
};

export function loadSettings(): SolitaireSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: SolitaireSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
