/**
 * Zustand store for Bridge.
 * Integrates game state, stats, achievements, settings, and tutorials.
 */

import { create } from 'zustand';
import type { BridgeState, Seat, CardId, BidAction } from '../engine/types';
import {
  createInitialState,
  placeBid,
  playCard,
  getLegalCards,
  serializeState,
  deserializeState,
} from '../engine/game';
import { getAIBid, getAICard } from '../engine/ai';
import type { BridgeStats, Achievement, BridgeSettings } from '../engine/stats';
import {
  loadStats,
  recordHandResult,
  getUnlockedAchievements,
  getNewAchievements,
  loadSettings,
  saveSettings as persistSettings,
} from '../engine/stats';
import type { PlayHistoryEntry } from '../engine/analysis';
import {
  getTutorial,
  isTutorialComplete,
  loadTutorialProgress,
  saveTutorialProgress,
} from '../engine/tutorial';

const STORAGE_KEY = 'bridge-game-v1';

function loadSavedGame(): BridgeState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return deserializeState(raw);
  } catch { /* ignore */ }
  return null;
}

function saveGame(state: BridgeState): void {
  localStorage.setItem(STORAGE_KEY, serializeState(state));
}

interface BridgeStore {
  // ── Game state ──
  gameState: BridgeState;
  legalCards: CardId[];
  lastTrick: { cards: { seat: Seat; card: CardId }[]; winner?: Seat } | null;
  hasSavedGame: boolean;
  playHistory: PlayHistoryEntry[];

  // ── Stats & achievements ──
  stats: BridgeStats;
  newAchievements: Achievement[];

  // ── Settings ──
  settings: BridgeSettings;

  // ── Tutorial ──
  activeTutorial: string | null;
  tutorialStep: number;

  // ── Game actions ──
  startNewGame: () => void;
  resumeGame: () => void;
  makeBid: (action: BidAction) => void;
  playCardAction: (card: CardId) => void;
  runAITurns: () => void;

  // ── Stats & achievement actions ──
  dismissAchievement: () => void;

  // ── Settings actions ──
  updateSettings: (partial: Partial<BridgeSettings>) => void;

  // ── Tutorial actions ──
  startTutorial: (id: string) => void;
  advanceTutorial: () => void;
  exitTutorial: () => void;
}

export const useBridgeStore = create<BridgeStore>((set, get) => {
  const saved = loadSavedGame();
  const initial = saved ?? createInitialState();
  const initialStats = loadStats();
  const initialSettings = loadSettings();
  const tutorialProgress = loadTutorialProgress();

  return {
    // ── Game state ──
    gameState: initial,
    legalCards: initial.phase === 'playing' ? getLegalCards(initial) : [],
    lastTrick: null,
    hasSavedGame: saved !== null && !saved.gameOver,
    playHistory: [],

    // ── Stats & achievements ──
    stats: initialStats,
    newAchievements: [],

    // ── Settings ──
    settings: initialSettings,

    // ── Tutorial ──
    activeTutorial: tutorialProgress.currentTutorial,
    tutorialStep: tutorialProgress.currentStep,

    // ── Game actions ──

    startNewGame: () => {
      const state = createInitialState();
      saveGame(state);
      set({
        gameState: state,
        legalCards: [],
        lastTrick: null,
        hasSavedGame: false,
        playHistory: [],
      });

      // If AI bids first
      if (state.currentBidder !== state.humanSeat) {
        setTimeout(() => get().runAITurns(), 500);
      }
    },

    resumeGame: () => {
      const saved = loadSavedGame();
      if (saved && !saved.gameOver) {
        const legal = saved.phase === 'playing' ? getLegalCards(saved) : [];
        set({ gameState: saved, legalCards: legal, hasSavedGame: false });
      }
    },

    makeBid: (action: BidAction) => {
      const { gameState } = get();
      if (gameState.phase !== 'bidding') return;
      if (gameState.currentBidder !== gameState.humanSeat) return;

      const newState = placeBid(gameState, action);
      saveGame(newState);

      const legal = newState.phase === 'playing' ? getLegalCards(newState) : [];
      set({ gameState: newState, legalCards: legal });

      // Check for all-pass game-over and record result
      if (newState.gameOver) {
        recordAndCheckAchievements(newState, get, set);
      }

      // Run AI turns
      if (!newState.gameOver && (
        (newState.phase === 'bidding' && newState.currentBidder !== newState.humanSeat) ||
        (newState.phase === 'playing' && newState.currentPlayer !== newState.humanSeat)
      )) {
        setTimeout(() => get().runAITurns(), 600);
      }
    },

    playCardAction: (card: CardId) => {
      const { gameState, playHistory } = get();
      if (gameState.phase !== 'playing') return;

      // Allow human to play, or play dummy's cards when human is declarer
      const isDeclarer = gameState.currentPlayer === gameState.humanSeat;
      const isPlayingDummy = gameState.currentPlayer === gameState.dummy && gameState.humanSeat === partnerOfDummy(gameState);
      if (!isDeclarer && !isPlayingDummy && gameState.currentPlayer !== gameState.humanSeat) return;

      // Record play in history
      const newPlayHistory: PlayHistoryEntry[] = [
        ...playHistory,
        { seat: gameState.currentPlayer, card },
      ];

      const newState = playCard(gameState, card);

      // Capture last trick if one was just completed
      let lastTrick = get().lastTrick;
      if (newState.tricks.length > gameState.tricks.length) {
        const completedTrick = newState.tricks[newState.tricks.length - 1];
        lastTrick = { cards: completedTrick.cards, winner: completedTrick.winner };
      }

      const legal = newState.phase === 'playing' ? getLegalCards(newState) : [];
      saveGame(newState);
      set({ gameState: newState, legalCards: legal, lastTrick, playHistory: newPlayHistory });

      // Record result on game over
      if (newState.gameOver) {
        recordAndCheckAchievements(newState, get, set);
      }

      // Run AI turns
      if (!newState.gameOver && newState.phase === 'playing' &&
          newState.currentPlayer !== newState.humanSeat &&
          !(newState.currentPlayer === newState.dummy && newState.humanSeat === partnerOfDummy(newState))) {
        setTimeout(() => get().runAITurns(), 800);
      }
    },

    runAITurns: () => {
      const { gameState, playHistory } = get();
      if (gameState.gameOver) return;

      if (gameState.phase === 'bidding' && gameState.currentBidder !== gameState.humanSeat) {
        const bid = getAIBid(gameState);
        const newState = placeBid(gameState, bid);
        const legal = newState.phase === 'playing' ? getLegalCards(newState) : [];
        saveGame(newState);
        set({ gameState: newState, legalCards: legal });

        // Check for all-pass game-over
        if (newState.gameOver) {
          recordAndCheckAchievements(newState, get, set);
        }

        // Continue AI bidding
        if (!newState.gameOver && newState.phase === 'bidding' && newState.currentBidder !== newState.humanSeat) {
          setTimeout(() => get().runAITurns(), 600);
        }
        // If bidding ended and AI plays first
        if (newState.phase === 'playing' && newState.currentPlayer !== newState.humanSeat &&
            !(newState.currentPlayer === newState.dummy && newState.humanSeat === partnerOfDummy(newState))) {
          setTimeout(() => get().runAITurns(), 800);
        }
        return;
      }

      if (gameState.phase === 'playing') {
        // Don't play for human or when human controls dummy
        if (gameState.currentPlayer === gameState.humanSeat) return;
        if (gameState.currentPlayer === gameState.dummy && gameState.humanSeat === partnerOfDummy(gameState)) return;

        const card = getAICard(gameState);

        // Record AI play in history
        const newPlayHistory: PlayHistoryEntry[] = [
          ...playHistory,
          { seat: gameState.currentPlayer, card },
        ];

        const newState = playCard(gameState, card);

        let lastTrick = get().lastTrick;
        if (newState.tricks.length > gameState.tricks.length) {
          const completedTrick = newState.tricks[newState.tricks.length - 1];
          lastTrick = { cards: completedTrick.cards, winner: completedTrick.winner };
        }

        const legal = newState.phase === 'playing' ? getLegalCards(newState) : [];
        saveGame(newState);
        set({ gameState: newState, legalCards: legal, lastTrick, playHistory: newPlayHistory });

        // Record result on game over
        if (newState.gameOver) {
          recordAndCheckAchievements(newState, get, set);
        }

        // Continue AI play
        if (!newState.gameOver && newState.phase === 'playing' &&
            newState.currentPlayer !== newState.humanSeat &&
            !(newState.currentPlayer === newState.dummy && newState.humanSeat === partnerOfDummy(newState))) {
          setTimeout(() => get().runAITurns(), 800);
        }
      }
    },

    // ── Stats & achievement actions ──

    dismissAchievement: () => {
      const { newAchievements } = get();
      if (newAchievements.length <= 1) {
        set({ newAchievements: [] });
      } else {
        set({ newAchievements: newAchievements.slice(1) });
      }
    },

    // ── Settings actions ──

    updateSettings: (partial: Partial<BridgeSettings>) => {
      const { settings } = get();
      const updated = { ...settings, ...partial };
      persistSettings(updated);
      set({ settings: updated });
    },

    // ── Tutorial actions ──

    startTutorial: (id: string) => {
      const tutorial = getTutorial(id);
      if (!tutorial) return;
      const progress = loadTutorialProgress();
      progress.currentTutorial = id;
      progress.currentStep = 0;
      saveTutorialProgress(progress);
      set({ activeTutorial: id, tutorialStep: 0 });
    },

    advanceTutorial: () => {
      const { activeTutorial, tutorialStep } = get();
      if (!activeTutorial) return;

      const nextStep = tutorialStep + 1;

      if (isTutorialComplete(activeTutorial, nextStep)) {
        // Tutorial complete
        const progress = loadTutorialProgress();
        if (!progress.completedTutorials.includes(activeTutorial)) {
          progress.completedTutorials.push(activeTutorial);
        }
        progress.currentTutorial = null;
        progress.currentStep = 0;
        saveTutorialProgress(progress);
        set({ activeTutorial: null, tutorialStep: 0 });
      } else {
        const progress = loadTutorialProgress();
        progress.currentStep = nextStep;
        saveTutorialProgress(progress);
        set({ tutorialStep: nextStep });
      }
    },

    exitTutorial: () => {
      const progress = loadTutorialProgress();
      progress.currentTutorial = null;
      progress.currentStep = 0;
      saveTutorialProgress(progress);
      set({ activeTutorial: null, tutorialStep: 0 });
    },
  };
});

// ── Helpers ────────────────────────────────────────────────────────────────────

function partnerOfDummy(state: BridgeState): Seat {
  if (!state.dummy) return 'south';
  if (!state.contract) return 'south';
  return state.contract.declarer;
}

type StoreGet = () => BridgeStore;
type StoreSet = (partial: Partial<BridgeStore>) => void;

function recordAndCheckAchievements(
  newState: BridgeState,
  get: StoreGet,
  set: StoreSet,
): void {
  const { stats } = get();
  const prevUnlocked = getUnlockedAchievements(stats);
  const updatedStats = recordHandResult(stats, newState);
  const freshAchievements = getNewAchievements(prevUnlocked, updatedStats);
  set({
    stats: updatedStats,
    newAchievements: freshAchievements.length > 0 ? freshAchievements : [],
  });
}
