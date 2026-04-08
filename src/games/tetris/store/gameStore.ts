/**
 * Zustand store for Tetris.
 * Wraps the pure game engine and persists high score to localStorage.
 */

import { create } from 'zustand';
import type { TetrisState } from '../engine/game';
import {
  createGame,
  tick as engineTick,
  movePiece,
  rotateCurrent,
  hardDrop as engineHardDrop,
} from '../engine/game';

const HIGH_SCORE_KEY = 'tetris-highscore';

function loadHighScore(): number {
  try {
    const raw = localStorage.getItem(HIGH_SCORE_KEY);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

function saveHighScore(score: number): void {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(score));
  } catch {
    // storage unavailable — ignore
  }
}

interface TetrisStore {
  gameState: TetrisState;
  highScore: number;
  startGame: () => void;
  tick: () => void;
  moveLeft: () => void;
  moveRight: () => void;
  rotate: () => void;
  hardDrop: () => void;
  togglePause: () => void;
}

export const useTetrisStore = create<TetrisStore>((set, get) => ({
  gameState: createGame(),
  highScore: loadHighScore(),

  startGame: () => {
    set({ gameState: createGame() });
  },

  tick: () => {
    const { gameState } = get();
    const next = engineTick(gameState);
    if (next.gameOver && next.score > get().highScore) {
      saveHighScore(next.score);
      set({ gameState: next, highScore: next.score });
    } else {
      set({ gameState: next });
    }
  },

  moveLeft: () => {
    set({ gameState: movePiece(get().gameState, -1) });
  },

  moveRight: () => {
    set({ gameState: movePiece(get().gameState, 1) });
  },

  rotate: () => {
    set({ gameState: rotateCurrent(get().gameState) });
  },

  hardDrop: () => {
    const next = engineHardDrop(get().gameState);
    if (next.gameOver && next.score > get().highScore) {
      saveHighScore(next.score);
      set({ gameState: next, highScore: next.score });
    } else {
      set({ gameState: next });
    }
  },

  togglePause: () => {
    const gs = get().gameState;
    if (gs.gameOver) return;
    set({ gameState: { ...gs, paused: !gs.paused } });
  },
}));
