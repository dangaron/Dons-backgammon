/**
 * Minesweeper Zustand store.
 */

import { create } from 'zustand';
import type { MinesweeperState, Difficulty } from '../engine/game';
import { createGame, reveal, toggleFlag } from '../engine/game';

const HIGHSCORE_KEY = 'minesweeper-highscores';

interface HighScores {
  beginner: number | null;
  intermediate: number | null;
  expert: number | null;
}

function loadHighScores(): HighScores {
  try {
    const raw = localStorage.getItem(HIGHSCORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { beginner: null, intermediate: null, expert: null };
}

function saveHighScores(hs: HighScores) {
  try { localStorage.setItem(HIGHSCORE_KEY, JSON.stringify(hs)); } catch { /* ignore */ }
}

interface MinesweeperStore {
  gameState: MinesweeperState;
  difficulty: Difficulty;
  elapsed: number;
  highScores: HighScores;

  startGame: (difficulty?: Difficulty) => void;
  revealCell: (x: number, y: number) => void;
  flagCell: (x: number, y: number) => void;
  updateTimer: () => void;
}

export const useMinesweeperStore = create<MinesweeperStore>((set, get) => ({
  gameState: createGame('beginner'),
  difficulty: 'beginner',
  elapsed: 0,
  highScores: loadHighScores(),

  startGame: (difficulty = 'beginner') => {
    set({
      gameState: createGame(difficulty),
      difficulty,
      elapsed: 0,
    });
  },

  revealCell: (x, y) => {
    const prev = get().gameState;
    const next = reveal(prev, x, y);
    set({ gameState: next });

    // Check for new high score on win
    if (next.won && next.startTime) {
      const time = Math.floor((Date.now() - next.startTime) / 1000);
      const hs = { ...get().highScores };
      const diff = get().difficulty;
      if (hs[diff] === null || time < hs[diff]!) {
        hs[diff] = time;
        saveHighScores(hs);
        set({ highScores: hs });
      }
    }
  },

  flagCell: (x, y) => {
    set({ gameState: toggleFlag(get().gameState, x, y) });
  },

  updateTimer: () => {
    const { gameState } = get();
    if (gameState.started && !gameState.gameOver) {
      set({ elapsed: Math.floor((Date.now() - gameState.startTime) / 1000) });
    }
  },
}));
