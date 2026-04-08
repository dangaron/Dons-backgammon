/**
 * Zustand store for Yahtzee.
 * Integrates game engine, stats, achievements, settings, and post-game analysis.
 */

import { create } from 'zustand';
import type { YahtzeeState, Category } from '../engine/types';
import { ALL_CATEGORIES, UPPER_CATEGORIES } from '../engine/types';
import {
  createInitialState,
  rollDice,
  toggleHold,
  scoreInCategory,
  serializeState,
  deserializeState,
} from '../engine/game';
import { getPotentialScores, totalScore, scoreCategory } from '../engine/scoring';
import { UPPER_BONUS_THRESHOLD } from '../engine/types';
import type { YahtzeeAIRequest, YahtzeeAIResponse } from '../workers/ai.worker';
import type {
  YahtzeeStats,
  YahtzeeSettings,
  Achievement,
  GameResult,
} from '../engine/stats';
import {
  loadStats,
  recordGameResult,
  loadSettings,
  saveSettings as persistSettings,
  getUnlockedAchievements,
  getNewAchievements,
} from '../engine/stats';
import type { MoveRecord } from '../engine/analysis';
import { analyzeGame } from '../engine/analysis';
import type { YahtzeeGameAnalysis } from '../engine/analysis';

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

// ── Helper: extract game result from final state ─────────────────────────────

function extractGameResult(
  state: YahtzeeState,
  _moveHistory: MoveRecord[],
  startTime: number,
  trailedAtTurn10: boolean,
): GameResult {
  const playerState = state.players[0];
  const opponentState = state.players[1];
  const playerTotal = totalScore(playerState);
  const opponentTotal = totalScore(opponentState);
  const won = state.winner === 0;

  // Count Yahtzees this game: the scorecard Yahtzee + bonus count
  const yahtzeeScore = playerState.scorecard['yahtzee'] ?? 0;
  const yahtzeesThisGame = (yahtzeeScore > 0 ? 1 : 0) + playerState.yahtzeeBonusCount;

  // Best single category score
  let bestCategory = 0;
  for (const val of Object.values(playerState.scorecard)) {
    if (val !== undefined && val > bestCategory) bestCategory = val;
  }

  // Perfect game: no zeros in scorecard
  const perfect = ALL_CATEGORIES.every(cat => {
    const val = playerState.scorecard[cat];
    return val !== undefined && val > 0;
  });

  // Upper bonus
  const upperTotal = UPPER_CATEGORIES.reduce(
    (sum, cat) => sum + (playerState.scorecard[cat] ?? 0),
    0,
  );
  const gotUpperBonus = upperTotal >= UPPER_BONUS_THRESHOLD;

  const durationSeconds = Math.round((Date.now() - startTime) / 1000);

  return {
    won,
    score: playerTotal,
    opponentScore: opponentTotal,
    yahtzeeCount: yahtzeesThisGame,
    bestCategory,
    perfect,
    durationSeconds,
    comeFromBehind: trailedAtTurn10 && won,
    gotUpperBonus,
    yahtzeesThisGame,
  };
}

// ── Store ──────────────────────────────────────────────────────────────────────

interface YahtzeeStore {
  // Game state
  gameState: YahtzeeState;
  potentialScores: Partial<Record<Category, number>>;
  isAIThinking: boolean;
  diceAnimating: boolean;
  hasSavedGame: boolean;

  // Stats and achievements
  stats: YahtzeeStats;
  settings: YahtzeeSettings;
  newAchievements: Achievement[];

  // Move history for post-game analysis
  moveHistory: MoveRecord[];
  gameStartTime: number;
  trailedAtTurn10: boolean;

  // Actions — game flow
  startNewGame: (gameMode?: 'vs-ai' | 'vs-human-local') => void;
  resumeGame: () => void;
  roll: () => void;
  toggleDieHold: (index: number) => void;
  score: (category: Category) => void;
  triggerAITurn: () => void;

  // Actions — stats and settings
  dismissAchievement: (id?: string) => void;
  updateSettings: (partial: Partial<YahtzeeSettings>) => void;
  getGameAnalysis: () => YahtzeeGameAnalysis | null;
}

export const useYahtzeeStore = create<YahtzeeStore>((set, get) => {
  const saved = loadSavedGame();
  const initialStats = loadStats();
  const initialSettings = loadSettings();

  return {
    // Game state
    gameState: saved ?? createInitialState(),
    potentialScores: {},
    isAIThinking: false,
    diceAnimating: false,
    hasSavedGame: saved !== null && !saved.gameOver,

    // Stats and achievements
    stats: initialStats,
    settings: initialSettings,
    newAchievements: [],

    // Move tracking
    moveHistory: [],
    gameStartTime: Date.now(),
    trailedAtTurn10: false,

    // ── Game flow actions ────────────────────────────────────────────────────

    startNewGame: (gameMode: 'vs-ai' | 'vs-human-local' = 'vs-ai') => {
      const state = createInitialState(gameMode);
      saveGame(state);
      set({
        gameState: state,
        potentialScores: {},
        isAIThinking: false,
        hasSavedGame: false,
        moveHistory: [],
        gameStartTime: Date.now(),
        trailedAtTurn10: false,
        newAchievements: [],
      });
    },

    resumeGame: () => {
      const saved = loadSavedGame();
      if (saved && !saved.gameOver) {
        const potentials = saved.rollsLeft < 3
          ? getPotentialScores(saved.players[saved.currentPlayer], saved.dice)
          : {};
        set({
          gameState: saved,
          potentialScores: potentials,
          hasSavedGame: false,
          moveHistory: [],
          gameStartTime: Date.now(),
          trailedAtTurn10: false,
        });
      }
    },

    roll: () => {
      const { gameState, settings } = get();
      if (gameState.rollsLeft <= 0 || gameState.gameOver) return;

      // Animate dice
      set({ diceAnimating: true });

      const newState = rollDice(gameState);
      const potentials = getPotentialScores(
        newState.players[newState.currentPlayer],
        newState.dice,
      );

      saveGame(newState);

      // Animation delay scales with setting
      const animDelay = settings.animationSpeed === 1 ? 500
        : settings.animationSpeed === 3 ? 150
        : 300;

      setTimeout(() => {
        set({ gameState: newState, potentialScores: potentials, diceAnimating: false });

        // If AI's turn after rolling, trigger AI
        if (newState.gameMode === 'vs-ai' && newState.currentPlayer === 1 && !newState.gameOver) {
          setTimeout(() => get().triggerAITurn(), 600);
        }
      }, animDelay);
    },

    toggleDieHold: (index: number) => {
      const { gameState } = get();
      const newState = toggleHold(gameState, index);
      set({ gameState: newState });
    },

    score: (category: Category) => {
      const { gameState, moveHistory, stats } = get();
      if (gameState.rollsLeft >= 3 || gameState.gameOver) return;

      const currentPlayer = gameState.currentPlayer;
      const playerState = gameState.players[currentPlayer];

      // Already scored
      if (category in playerState.scorecard) return;

      // Record move for player 0 (human) analysis
      let updatedMoveHistory = moveHistory;
      if (currentPlayer === 0) {
        const availableScores = getPotentialScores(playerState, gameState.dice);
        const score = scoreCategory(category, gameState.dice);
        const record: MoveRecord = {
          turn: gameState.turn,
          dice: [...gameState.dice],
          category,
          score,
          availableScores,
        };
        updatedMoveHistory = [...moveHistory, record];
      }

      const newState = scoreInCategory(gameState, category);
      saveGame(newState);

      // Check if trailing at turn 10
      let trailedAtTurn10 = get().trailedAtTurn10;
      if (newState.turn >= 10 && !trailedAtTurn10 && !newState.gameOver) {
        const p0Score = totalScore(newState.players[0]);
        const p1Score = totalScore(newState.players[1]);
        if (p0Score < p1Score) {
          trailedAtTurn10 = true;
        }
      }

      // Handle game over — record stats and check achievements
      if (newState.gameOver) {
        const { gameStartTime } = get();
        const result = extractGameResult(newState, updatedMoveHistory, gameStartTime, trailedAtTurn10);

        // Get previously unlocked achievements before updating stats
        const prevUnlocked = getUnlockedAchievements(stats);

        // Record game result
        const updatedStats = recordGameResult(stats, result);

        // Check for new achievements
        const newAchievements = getNewAchievements(prevUnlocked, updatedStats, result);

        set({
          gameState: newState,
          potentialScores: {},
          moveHistory: updatedMoveHistory,
          trailedAtTurn10,
          stats: updatedStats,
          newAchievements,
        });

        // Clear saved game on game over
        try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
        return;
      }

      set({
        gameState: newState,
        potentialScores: {},
        moveHistory: updatedMoveHistory,
        trailedAtTurn10,
      });

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

    // ── Stats and settings actions ───────────────────────────────────────────

    dismissAchievement: (id?: string) => {
      if (id) {
        set(state => ({
          newAchievements: state.newAchievements.filter(a => a.id !== id),
        }));
      } else {
        // Dismiss all
        set({ newAchievements: [] });
      }
    },

    updateSettings: (partial: Partial<YahtzeeSettings>) => {
      const { settings } = get();
      const updated = { ...settings, ...partial };
      persistSettings(updated);
      set({ settings: updated });
    },

    getGameAnalysis: (): YahtzeeGameAnalysis | null => {
      const { moveHistory } = get();
      if (moveHistory.length === 0) return null;
      return analyzeGame(moveHistory);
    },
  };
});
