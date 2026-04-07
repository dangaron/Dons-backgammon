/**
 * Zustand store for Solitaire.
 */

import { create } from 'zustand';
import type { SolitaireState, SolitaireMove, DrawMode } from '../engine/types';
import {
  createInitialState,
  applyMove,
  autoMoveToFoundations,
  serializeState,
  deserializeState,
} from '../engine/game';
import { getLegalMoves } from '../engine/moves';
import { suggestMove } from '../engine/solver';

const STORAGE_KEY = 'solitaire-game-v1';
const STATS_KEY = 'solitaire-stats-v1';

export interface SolitaireStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  bestStreak: number;
  bestTime: number | null;  // seconds
  bestScore: number | null;
}

const DEFAULT_STATS: SolitaireStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  currentStreak: 0,
  bestStreak: 0,
  bestTime: null,
  bestScore: null,
};

function loadStats(): SolitaireStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) return { ...DEFAULT_STATS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_STATS };
}

function saveStats(stats: SolitaireStats): void {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

function loadSavedGame(): SolitaireState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return deserializeState(raw);
  } catch { /* ignore */ }
  return null;
}

function saveGame(state: SolitaireState): void {
  localStorage.setItem(STORAGE_KEY, serializeState(state));
}

interface SolitaireStore {
  gameState: SolitaireState;
  undoStack: SolitaireState[];
  hintMove: SolitaireMove | null;
  stats: SolitaireStats;
  hasSavedGame: boolean;

  startNewGame: (drawMode?: DrawMode, seed?: number) => void;
  resumeGame: () => void;
  makeMove: (move: SolitaireMove) => void;
  undo: () => void;
  requestHint: () => void;
  clearHint: () => void;
}

export const useSolitaireStore = create<SolitaireStore>((set, get) => {
  const saved = loadSavedGame();

  return {
    gameState: saved ?? createInitialState(),
    undoStack: [],
    hintMove: null,
    stats: loadStats(),
    hasSavedGame: saved !== null && !saved.gameOver,

    startNewGame: (drawMode: DrawMode = 1, seed?: number) => {
      const state = createInitialState(drawMode, seed);
      const stats = get().stats;
      stats.gamesPlayed++;
      saveStats(stats);
      saveGame(state);
      set({ gameState: state, undoStack: [], hintMove: null, stats: { ...stats }, hasSavedGame: false });
    },

    resumeGame: () => {
      const saved = loadSavedGame();
      if (saved && !saved.gameOver) {
        set({ gameState: saved, undoStack: [], hintMove: null, hasSavedGame: false });
      }
    },

    makeMove: (move: SolitaireMove) => {
      const { gameState, undoStack, stats } = get();
      if (gameState.gameOver) return;

      // Save current state to undo stack
      const newUndoStack = [...undoStack, gameState];

      let nextState = applyMove(gameState, move);

      // Auto-move safe cards to foundations
      if (!nextState.gameOver) {
        nextState = autoMoveToFoundations(nextState);
      }

      // Update stats on win
      const newStats = { ...stats };
      if (nextState.won) {
        newStats.gamesWon++;
        newStats.currentStreak++;
        newStats.bestStreak = Math.max(newStats.bestStreak, newStats.currentStreak);
        const elapsed = Math.round((Date.now() - nextState.startTime) / 1000);
        if (newStats.bestTime === null || elapsed < newStats.bestTime) {
          newStats.bestTime = elapsed;
        }
        if (newStats.bestScore === null || nextState.score > newStats.bestScore) {
          newStats.bestScore = nextState.score;
        }
        saveStats(newStats);
      }

      saveGame(nextState);
      set({ gameState: nextState, undoStack: newUndoStack, hintMove: null, stats: newStats });
    },

    undo: () => {
      const { undoStack } = get();
      if (undoStack.length === 0) return;
      const prev = undoStack[undoStack.length - 1];
      const newStack = undoStack.slice(0, -1);
      saveGame(prev);
      set({ gameState: prev, undoStack: newStack, hintMove: null });
    },

    requestHint: () => {
      const { gameState } = get();
      const hint = suggestMove(gameState);
      set({ hintMove: hint });
    },

    clearHint: () => set({ hintMove: null }),
  };
});
