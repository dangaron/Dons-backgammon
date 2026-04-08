import { create } from 'zustand';
import {
  createGame,
  setDirection as engineSetDirection,
  tick as engineTick,
  type Direction,
  type SnakeState,
} from '../engine/game';

const LS_KEY = 'snake-highscore';

function loadHighScore(): number {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
}

function saveHighScore(score: number): void {
  try {
    localStorage.setItem(LS_KEY, String(score));
  } catch {
    // ignore
  }
}

export interface SnakeStore {
  gameState: SnakeState;
  isPlaying: boolean;
  startGame: (gridSize?: number) => void;
  setDirection: (dir: Direction) => void;
  tick: () => void;
  togglePause: () => void;
}

export const useSnakeStore = create<SnakeStore>((set) => ({
  gameState: createGame(20, loadHighScore()),
  isPlaying: false,

  startGame: (gridSize = 20) => {
    set({
      gameState: createGame(gridSize, loadHighScore()),
      isPlaying: true,
    });
  },

  setDirection: (dir: Direction) => {
    set((s) => ({ gameState: engineSetDirection(s.gameState, dir) }));
  },

  tick: () => {
    set((s) => {
      const next = engineTick(s.gameState);
      if (next.highScore > s.gameState.highScore) {
        saveHighScore(next.highScore);
      }
      return {
        gameState: next,
        isPlaying: next.gameOver ? false : s.isPlaying,
      };
    });
  },

  togglePause: () => {
    set((s) => ({
      gameState: { ...s.gameState, paused: !s.gameState.paused },
    }));
  },
}));
