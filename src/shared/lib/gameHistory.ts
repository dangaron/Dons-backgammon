/**
 * Local game history storage. Saves completed game move records
 * to localStorage for post-game analysis replay.
 */

const STORAGE_KEY = 'game-history';
const MAX_GAMES = 20;

export interface StoredGame {
  id: string;
  gameType: string;
  date: string; // ISO date
  moves: unknown[]; // game-specific move records
  result: 'win' | 'loss' | 'draw';
  metadata?: Record<string, unknown>;
}

function loadAll(): StoredGame[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveAll(games: StoredGame[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(games.slice(0, MAX_GAMES)));
  } catch { /* quota */ }
}

export function saveGameHistory(game: StoredGame) {
  const all = loadAll();
  all.unshift(game); // newest first
  saveAll(all);
}

export function loadGameHistory(gameType?: string): StoredGame[] {
  const all = loadAll();
  return gameType ? all.filter(g => g.gameType === gameType) : all;
}

export function loadSingleGame(id: string): StoredGame | null {
  return loadAll().find(g => g.id === id) ?? null;
}

export function deleteGameHistory(id: string) {
  const all = loadAll().filter(g => g.id !== id);
  saveAll(all);
}
