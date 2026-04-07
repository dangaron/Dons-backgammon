/**
 * Zustand store for Yahtzee.
 */

import { create } from 'zustand';
import type { YahtzeeState, Category, DieValue } from '../engine/types';
import {
  createInitialState,
  rollDice,
  toggleHold,
  scoreInCategory,
  serializeState,
  deserializeState,
} from '../engine/game';
import { getPotentialScores, totalScore } from '../engine/scoring';
import type { YahtzeeAIRequest, YahtzeeAIResponse } from '../workers/ai.worker';

const STORAGE_KEY = 'yahtzee-game-v1';

function loadSavedGame(): YahtzeeState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return deserializeState(raw);
  } catch { /* ignore */ }
  return null;
}

function saveGame(state: YahtzeeState): void {
  localStorage.setItem(STORAGE_KEY, serializeState(state));
}

// ── AI Worker ──────────────────────────────────────────────────────────────────

let aiWorker: Worker | null = null;

function getAIWorker(): Worker {
  if (!aiWorker) {
    aiWorker = new Worker(new URL('../workers/ai.worker.ts', import.meta.url), { type: 'module' });
  }
  return aiWorker;
}

// ── Store ──────────────────────────────────────────────────────────────────────

interface YahtzeeStore {
  gameState: YahtzeeState;
  potentialScores: Partial<Record<Category, number>>;
  isAIThinking: boolean;
  diceAnimating: boolean;
  hasSavedGame: boolean;

  startNewGame: (gameMode?: 'vs-ai' | 'vs-human-local') => void;
  resumeGame: () => void;
  roll: () => void;
  toggleDieHold: (index: number) => void;
  score: (category: Category) => void;
  triggerAITurn: () => void;
}

export const useYahtzeeStore = create<YahtzeeStore>((set, get) => {
  const saved = loadSavedGame();

  return {
    gameState: saved ?? createInitialState(),
    potentialScores: {},
    isAIThinking: false,
    diceAnimating: false,
    hasSavedGame: saved !== null && !saved.gameOver,

    startNewGame: (gameMode: 'vs-ai' | 'vs-human-local' = 'vs-ai') => {
      const state = createInitialState(gameMode);
      saveGame(state);
      set({ gameState: state, potentialScores: {}, isAIThinking: false, hasSavedGame: false });
    },

    resumeGame: () => {
      const saved = loadSavedGame();
      if (saved && !saved.gameOver) {
        const potentials = saved.rollsLeft < 3
          ? getPotentialScores(saved.players[saved.currentPlayer], saved.dice)
          : {};
        set({ gameState: saved, potentialScores: potentials, hasSavedGame: false });
      }
    },

    roll: () => {
      const { gameState } = get();
      if (gameState.rollsLeft <= 0 || gameState.gameOver) return;

      // Animate dice
      set({ diceAnimating: true });

      const newState = rollDice(gameState);
      const potentials = getPotentialScores(
        newState.players[newState.currentPlayer],
        newState.dice,
      );

      saveGame(newState);

      // Brief animation delay
      setTimeout(() => {
        set({ gameState: newState, potentialScores: potentials, diceAnimating: false });

        // If AI's turn after rolling, trigger AI
        if (newState.gameMode === 'vs-ai' && newState.currentPlayer === 1 && !newState.gameOver) {
          setTimeout(() => get().triggerAITurn(), 600);
        }
      }, 300);
    },

    toggleDieHold: (index: number) => {
      const { gameState } = get();
      const newState = toggleHold(gameState, index);
      set({ gameState: newState });
    },

    score: (category: Category) => {
      const { gameState } = get();
      if (gameState.rollsLeft >= 3 || gameState.gameOver) return;

      const newState = scoreInCategory(gameState, category);
      saveGame(newState);
      set({ gameState: newState, potentialScores: {} });

      // If it's now the AI's turn, trigger AI after a delay
      if (newState.gameMode === 'vs-ai' && newState.currentPlayer === 1 && !newState.gameOver) {
        setTimeout(() => {
          // AI needs to roll first
          get().roll();
        }, 800);
      }
    },

    triggerAITurn: () => {
      const { gameState } = get();
      if (gameState.gameOver || gameState.currentPlayer !== 1) return;

      set({ isAIThinking: true });

      const worker = getAIWorker();

      worker.onmessage = (e: MessageEvent<YahtzeeAIResponse>) => {
        const { decision } = e.data;
        const store = get();

        if (decision.action === 'hold' && decision.hold) {
          // Apply hold pattern and reroll
          let state = store.gameState;
          for (let i = 0; i < 5; i++) {
            if (state.held[i] !== decision.hold[i]) {
              state = toggleHold(state, i);
            }
          }
          set({ gameState: state, isAIThinking: false });

          // Roll after showing holds briefly
          setTimeout(() => get().roll(), 500);
        } else if (decision.action === 'score' && decision.category) {
          set({ isAIThinking: false });
          setTimeout(() => get().score(decision.category!), 300);
        }
      };

      worker.postMessage({ state: gameState } satisfies YahtzeeAIRequest);
    },
  };
});
