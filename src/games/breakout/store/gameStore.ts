import { create } from 'zustand';
import {
  type BreakoutState,
  createGame,
  tick as engineTick,
  movePaddle as engineMovePaddle,
  launch as engineLaunch,
} from '../engine/game';

const HIGH_SCORE_KEY = 'breakout-highscore';

function loadHighScore(): number {
  try {
    const v = localStorage.getItem(HIGH_SCORE_KEY);
    return v ? parseInt(v, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

function saveHighScore(score: number) {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(score));
  } catch {
    // ignore
  }
}

interface BreakoutStore {
  gameState: BreakoutState;
  highScore: number;
  startGame: (canvasWidth?: number, canvasHeight?: number) => void;
  tick: (dt: number) => void;
  movePaddle: (x: number) => void;
  launch: () => void;
  togglePause: () => void;
}

export const useBreakoutStore = create<BreakoutStore>((set, get) => ({
  gameState: createGame(),
  highScore: loadHighScore(),

  startGame: (canvasWidth?: number, canvasHeight?: number) => {
    set({ gameState: createGame(canvasWidth, canvasHeight) });
  },

  tick: (dt: number) => {
    const { gameState, highScore } = get();
    const next = engineTick(gameState, dt);
    const newHigh = Math.max(highScore, next.score);
    if (newHigh > highScore) {
      saveHighScore(newHigh);
    }
    set({ gameState: next, highScore: newHigh });
  },

  movePaddle: (x: number) => {
    set({ gameState: engineMovePaddle(get().gameState, x) });
  },

  launch: () => {
    set({ gameState: engineLaunch(get().gameState) });
  },

  togglePause: () => {
    const gs = get().gameState;
    set({ gameState: { ...gs, paused: !gs.paused } });
  },
}));
