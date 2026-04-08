/**
 * Yahtzee statistics, achievements, and settings engine.
 * Pure data, no UI imports. Persisted to localStorage.
 */

// ── Stats ──────────────────────────────────────────────────────────────────────

export interface YahtzeeStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  bestStreak: number;
  highScore: number;
  averageScore: number;
  totalYahtzees: number;           // lifetime count of rolling Yahtzee
  bestSingleCategory: number;     // highest score in any one category
  perfectGames: number;           // games with 0 wasted categories (no zeros)
  recentScores: number[];         // last 20 game scores
}

const STATS_KEY = 'yahtzee-stats-v2';

function defaultStats(): YahtzeeStats {
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    currentStreak: 0,
    bestStreak: 0,
    highScore: 0,
    averageScore: 0,
    totalYahtzees: 0,
    bestSingleCategory: 0,
    perfectGames: 0,
    recentScores: [],
  };
}

export function loadStats(): YahtzeeStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Merge with defaults to handle new fields added over time
      return { ...defaultStats(), ...parsed };
    }
  } catch { /* ignore */ }
  return defaultStats();
}

export function saveStats(stats: YahtzeeStats): void {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

export interface GameResult {
  won: boolean;
  score: number;
  opponentScore: number;
  /** Number of Yahtzees scored this game (including the first). */
  yahtzeeCount: number;
  /** Highest score placed in any single category this game. */
  bestCategory: number;
  /** True if the player had no zero-score categories. */
  perfect: boolean;
  /** Game duration in seconds. */
  durationSeconds: number;
  /** True if the player trailed at turn 10 but won. */
  comeFromBehind: boolean;
  /** True if the player earned the upper bonus (63+). */
  gotUpperBonus: boolean;
  /** Number of Yahtzees in this single game (for bonus tracking). */
  yahtzeesThisGame: number;
}

export function recordGameResult(
  stats: YahtzeeStats,
  result: GameResult,
): YahtzeeStats {
  const next: YahtzeeStats = JSON.parse(JSON.stringify(stats));

  next.gamesPlayed++;

  if (result.won) {
    next.gamesWon++;
    next.currentStreak++;
    next.bestStreak = Math.max(next.bestStreak, next.currentStreak);
  } else {
    next.currentStreak = 0;
  }

  if (result.score > next.highScore) {
    next.highScore = result.score;
  }

  // Running average
  const totalPreviousScore = next.averageScore * (next.gamesPlayed - 1);
  next.averageScore = Math.round((totalPreviousScore + result.score) / next.gamesPlayed);

  next.totalYahtzees += result.yahtzeeCount;

  if (result.bestCategory > next.bestSingleCategory) {
    next.bestSingleCategory = result.bestCategory;
  }

  if (result.perfect) {
    next.perfectGames++;
  }

  // Track recent scores (last 20)
  next.recentScores = [...next.recentScores, result.score].slice(-20);

  saveStats(next);
  return next;
}

// ── Achievements ───────────────────────────────────────────────────────────────

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'beginner' | 'score' | 'yahtzee' | 'streak' | 'strategy' | 'speed' | 'special';
  check: (stats: YahtzeeStats, lastResult?: GameResult) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  // ── Beginner ───────────────────────────────────────────────────────────────
  {
    id: 'first-win',
    name: 'First Win',
    description: 'Win your first game of Yahtzee',
    icon: '🏆',
    category: 'beginner',
    check: (s) => s.gamesWon >= 1,
  },
  {
    id: 'ten-wins',
    name: 'Getting Warmed Up',
    description: 'Win 10 games',
    icon: '⭐',
    category: 'beginner',
    check: (s) => s.gamesWon >= 10,
  },
  {
    id: 'fifty-wins',
    name: 'Dice Veteran',
    description: 'Win 50 games',
    icon: '🎖️',
    category: 'beginner',
    check: (s) => s.gamesWon >= 50,
  },
  {
    id: 'hundred-wins',
    name: 'Centurion',
    description: 'Win 100 games',
    icon: '💯',
    category: 'beginner',
    check: (s) => s.gamesWon >= 100,
  },

  // ── Score ──────────────────────────────────────────────────────────────────
  {
    id: 'score-200',
    name: 'Double Century',
    description: 'Score 200 or more in a single game',
    icon: '📈',
    category: 'score',
    check: (s) => s.highScore >= 200,
  },
  {
    id: 'score-250',
    name: 'Quarter Grand',
    description: 'Score 250 or more in a single game',
    icon: '🔥',
    category: 'score',
    check: (s) => s.highScore >= 250,
  },
  {
    id: 'score-300',
    name: 'Triple Century',
    description: 'Score 300 or more in a single game',
    icon: '🌟',
    category: 'score',
    check: (s) => s.highScore >= 300,
  },
  {
    id: 'score-350',
    name: 'Legendary',
    description: 'Score 350 or more in a single game',
    icon: '👑',
    category: 'score',
    check: (s) => s.highScore >= 350,
  },

  // ── Yahtzee ────────────────────────────────────────────────────────────────
  {
    id: 'first-yahtzee',
    name: 'YAHTZEE!',
    description: 'Roll your first Yahtzee (five of a kind)',
    icon: '🎲',
    category: 'yahtzee',
    check: (s) => s.totalYahtzees >= 1,
  },
  {
    id: 'five-yahtzees',
    name: 'Yahtzee Enthusiast',
    description: 'Roll 5 Yahtzees across all games',
    icon: '🎯',
    category: 'yahtzee',
    check: (s) => s.totalYahtzees >= 5,
  },
  {
    id: 'ten-yahtzees',
    name: 'Yahtzee Master',
    description: 'Roll 10 Yahtzees across all games',
    icon: '🏅',
    category: 'yahtzee',
    check: (s) => s.totalYahtzees >= 10,
  },
  {
    id: 'yahtzee-bonus',
    name: 'Yahtzee Bonus',
    description: 'Score 2 or more Yahtzees in a single game',
    icon: '✨',
    category: 'yahtzee',
    check: (_s, r) => r !== undefined && r.yahtzeesThisGame >= 2,
  },
  {
    id: 'triple-yahtzee',
    name: 'Triple Yahtzee',
    description: 'Score 3 Yahtzees in a single game',
    icon: '💎',
    category: 'yahtzee',
    check: (_s, r) => r !== undefined && r.yahtzeesThisGame >= 3,
  },

  // ── Streak ─────────────────────────────────────────────────────────────────
  {
    id: 'streak-3',
    name: 'Hot Streak',
    description: 'Win 3 games in a row',
    icon: '🔥',
    category: 'streak',
    check: (s) => s.bestStreak >= 3,
  },
  {
    id: 'streak-5',
    name: 'On Fire',
    description: 'Win 5 games in a row',
    icon: '🔥🔥',
    category: 'streak',
    check: (s) => s.bestStreak >= 5,
  },
  {
    id: 'streak-10',
    name: 'Unstoppable',
    description: 'Win 10 games in a row',
    icon: '💪',
    category: 'streak',
    check: (s) => s.bestStreak >= 10,
  },

  // ── Strategy ───────────────────────────────────────────────────────────────
  {
    id: 'upper-bonus',
    name: 'Upper Bonus',
    description: 'Earn the upper section bonus (63+ points)',
    icon: '📊',
    category: 'strategy',
    check: (_s, r) => r !== undefined && r.gotUpperBonus,
  },
  {
    id: 'full-house-scored',
    name: 'Full House',
    description: 'Score 25 in Full House',
    icon: '🏠',
    category: 'strategy',
    check: (_s, r) => r !== undefined && r.bestCategory >= 25,
  },
  {
    id: 'large-straight-scored',
    name: 'Straight Shooter',
    description: 'Score 40 in Large Straight',
    icon: '🎳',
    category: 'strategy',
    check: (_s, r) => r !== undefined && r.bestCategory >= 40,
  },
  {
    id: 'all-categories-filled',
    name: 'No Waste',
    description: 'Complete a game with no zero-score categories',
    icon: '✅',
    category: 'strategy',
    check: (s) => s.perfectGames >= 1,
  },
  {
    id: 'perfect-upper-5',
    name: 'Perfect Upper',
    description: 'Score 63 or more in the upper section',
    icon: '🎯',
    category: 'strategy',
    check: (_s, r) => r !== undefined && r.gotUpperBonus,
  },
  {
    id: 'average-200',
    name: 'Consistent Performer',
    description: 'Maintain a 200+ average score (10+ games)',
    icon: '📈',
    category: 'strategy',
    check: (s) => s.gamesPlayed >= 10 && s.averageScore >= 200,
  },

  // ── Speed ──────────────────────────────────────────────────────────────────
  {
    id: 'speed-5min',
    name: 'Quick Game',
    description: 'Win a game in under 5 minutes',
    icon: '⏱️',
    category: 'speed',
    check: (_s, r) => r !== undefined && r.won && r.durationSeconds < 300,
  },
  {
    id: 'speed-3min',
    name: 'Speed Demon',
    description: 'Win a game in under 3 minutes',
    icon: '⚡',
    category: 'speed',
    check: (_s, r) => r !== undefined && r.won && r.durationSeconds < 180,
  },

  // ── Special ────────────────────────────────────────────────────────────────
  {
    id: 'shut-out',
    name: 'Shut Out',
    description: 'Win while opponent scores under 100',
    icon: '🚫',
    category: 'special',
    check: (_s, r) => r !== undefined && r.won && r.opponentScore < 100,
  },
  {
    id: 'come-from-behind',
    name: 'Come From Behind',
    description: 'Win after trailing at turn 10',
    icon: '🔄',
    category: 'special',
    check: (_s, r) => r !== undefined && r.won && r.comeFromBehind,
  },
  {
    id: 'close-game',
    name: 'Nail Biter',
    description: 'Win or lose a game decided by 5 points or fewer',
    icon: '😬',
    category: 'special',
    check: (_s, r) => r !== undefined && Math.abs(r.score - r.opponentScore) <= 5,
  },
  {
    id: 'blowout',
    name: 'Blowout',
    description: 'Win by 150 or more points',
    icon: '💥',
    category: 'special',
    check: (_s, r) => r !== undefined && r.won && (r.score - r.opponentScore) >= 150,
  },
  {
    id: 'high-roller',
    name: 'High Roller',
    description: 'Score 30 in Chance',
    icon: '🎰',
    category: 'special',
    check: (_s, r) => r !== undefined && r.bestCategory >= 30,
  },
  {
    id: 'dedicated',
    name: 'Dedicated',
    description: 'Play 100 total games',
    icon: '🎮',
    category: 'special',
    check: (s) => s.gamesPlayed >= 100,
  },
];

export function getUnlockedAchievements(stats: YahtzeeStats, lastResult?: GameResult): string[] {
  return ACHIEVEMENTS.filter(a => a.check(stats, lastResult)).map(a => a.id);
}

export function getNewAchievements(
  prevUnlocked: string[],
  stats: YahtzeeStats,
  lastResult?: GameResult,
): Achievement[] {
  const currentUnlocked = getUnlockedAchievements(stats, lastResult);
  return currentUnlocked
    .filter(id => !prevUnlocked.includes(id))
    .map(id => ACHIEVEMENTS.find(a => a.id === id)!)
    .filter(Boolean);
}

// ── Settings ───────────────────────────────────────────────────────────────────

export type DiceStyle = 'classic' | 'modern' | 'minimal';

export interface YahtzeeSettings {
  animationSpeed: 1 | 2 | 3;       // 1=slow, 2=normal, 3=fast
  soundEnabled: boolean;
  showPotentialScores: boolean;     // show what you'd score in each category
  autoSortDice: boolean;
  confirmEndTurn: boolean;
  showOpponentHolds: boolean;       // show which dice AI holds
  diceStyle: DiceStyle;
  tableColor: string;               // CSS color for table background
}

const SETTINGS_KEY = 'yahtzee-settings-v1';

export const DEFAULT_SETTINGS: YahtzeeSettings = {
  animationSpeed: 2,
  soundEnabled: true,
  showPotentialScores: true,
  autoSortDice: false,
  confirmEndTurn: false,
  showOpponentHolds: true,
  diceStyle: 'classic',
  tableColor: '#1a1a2e',
};

export function loadSettings(): YahtzeeSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: YahtzeeSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
