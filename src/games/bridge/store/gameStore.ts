/**
 * Zustand store for Bridge.
 */

import { create } from 'zustand';
import type { BridgeState, Seat, CardId, BidAction } from '../engine/types';
import { nextSeat } from '../engine/types';
import {
  createInitialState,
  placeBid,
  playCard,
  getLegalCards,
  serializeState,
  deserializeState,
} from '../engine/game';
import { getAIBid, getAICard } from '../engine/ai';

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
  gameState: BridgeState;
  legalCards: CardId[];
  lastTrick: { cards: { seat: Seat; card: CardId }[]; winner?: Seat } | null;
  hasSavedGame: boolean;

  startNewGame: () => void;
  resumeGame: () => void;
  makeBid: (action: BidAction) => void;
  playCardAction: (card: CardId) => void;
  runAITurns: () => void;
}

export const useBridgeStore = create<BridgeStore>((set, get) => {
  const saved = loadSavedGame();
  const initial = saved ?? createInitialState();

  return {
    gameState: initial,
    legalCards: initial.phase === 'playing' ? getLegalCards(initial) : [],
    lastTrick: null,
    hasSavedGame: saved !== null && !saved.gameOver,

    startNewGame: () => {
      const state = createInitialState();
      saveGame(state);
      set({ gameState: state, legalCards: [], lastTrick: null, hasSavedGame: false });

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

      // Run AI turns
      if (!newState.gameOver && (
        (newState.phase === 'bidding' && newState.currentBidder !== newState.humanSeat) ||
        (newState.phase === 'playing' && newState.currentPlayer !== newState.humanSeat)
      )) {
        setTimeout(() => get().runAITurns(), 600);
      }
    },

    playCardAction: (card: CardId) => {
      const { gameState } = get();
      if (gameState.phase !== 'playing') return;

      // Allow human to play, or play dummy's cards when human is declarer
      const isDeclarer = gameState.currentPlayer === gameState.humanSeat;
      const isPlayingDummy = gameState.currentPlayer === gameState.dummy && gameState.humanSeat === partnerOfDummy(gameState);
      if (!isDeclarer && !isPlayingDummy && gameState.currentPlayer !== gameState.humanSeat) return;

      const newState = playCard(gameState, card);

      // Capture last trick if one was just completed
      let lastTrick = get().lastTrick;
      if (newState.tricks.length > gameState.tricks.length) {
        const completedTrick = newState.tricks[newState.tricks.length - 1];
        lastTrick = { cards: completedTrick.cards, winner: completedTrick.winner };
      }

      const legal = newState.phase === 'playing' ? getLegalCards(newState) : [];
      saveGame(newState);
      set({ gameState: newState, legalCards: legal, lastTrick });

      // Run AI turns
      if (!newState.gameOver && newState.phase === 'playing' &&
          newState.currentPlayer !== newState.humanSeat &&
          !(newState.currentPlayer === newState.dummy && newState.humanSeat === partnerOfDummy(newState))) {
        setTimeout(() => get().runAITurns(), 800);
      }
    },

    runAITurns: () => {
      const { gameState } = get();
      if (gameState.gameOver) return;

      if (gameState.phase === 'bidding' && gameState.currentBidder !== gameState.humanSeat) {
        const bid = getAIBid(gameState);
        const newState = placeBid(gameState, bid);
        const legal = newState.phase === 'playing' ? getLegalCards(newState) : [];
        saveGame(newState);
        set({ gameState: newState, legalCards: legal });

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
        const newState = playCard(gameState, card);

        let lastTrick = get().lastTrick;
        if (newState.tricks.length > gameState.tricks.length) {
          const completedTrick = newState.tricks[newState.tricks.length - 1];
          lastTrick = { cards: completedTrick.cards, winner: completedTrick.winner };
        }

        const legal = newState.phase === 'playing' ? getLegalCards(newState) : [];
        saveGame(newState);
        set({ gameState: newState, legalCards: legal, lastTrick });

        // Continue AI play
        if (!newState.gameOver && newState.phase === 'playing' &&
            newState.currentPlayer !== newState.humanSeat &&
            !(newState.currentPlayer === newState.dummy && newState.humanSeat === partnerOfDummy(newState))) {
          setTimeout(() => get().runAITurns(), 800);
        }
      }
    },
  };
});

function partnerOfDummy(state: BridgeState): Seat {
  if (!state.dummy) return 'south';
  if (!state.contract) return 'south';
  return state.contract.declarer;
}
