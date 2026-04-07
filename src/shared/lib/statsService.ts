/**
 * Player statistics tracking. Shared across all games.
 * Stores locally in localStorage and syncs to Supabase profiles when authenticated.
 */

const STORAGE_KEY = 'player-stats';

export interface LocalStats {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  streakCurrent: number;
  streakBest: number;
  lastGameDate: string | null;
  byGame: Record<string, {
    played: number;
    won: number;
    lost: number;
  }>;
}

function defaultStats(): LocalStats {
  return {
    gamesPlayed: 0, gamesWon: 0, gamesLost: 0,
    streakCurrent: 0, streakBest: 0,
    lastGameDate: null,
    byGame: {},
  };
}

export function loadLocalStats(): LocalStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultStats(), ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaultStats();
}

function saveLocalStats(stats: LocalStats) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stats)); } catch { /* ignore */ }
}

export function recordGameResult(gameType: string, won: boolean): LocalStats {
  const stats = loadLocalStats();

  stats.gamesPlayed++;
  if (won) {
    stats.gamesWon++;
    stats.streakCurrent++;
    if (stats.streakCurrent > stats.streakBest) stats.streakBest = stats.streakCurrent;
  } else {
    stats.gamesLost++;
    stats.streakCurrent = 0;
  }
  stats.lastGameDate = new Date().toISOString();

  // Per-game stats
  if (!stats.byGame[gameType]) stats.byGame[gameType] = { played: 0, won: 0, lost: 0 };
  stats.byGame[gameType].played++;
  if (won) stats.byGame[gameType].won++;
  else stats.byGame[gameType].lost++;

  saveLocalStats(stats);
  return stats;
}
