/**
 * 2048 Zustand store.
 */

import { create } from 'zustand';
import type { Game2048State, Direction } from '../engine/game';
import { createGame, slide } from '../engine/game';

interface Game2048Store {
  gameState: Game2048State;
  undoStack: Game2048State[];

  startGame: () => void;
  move: (direction: Direction) => void;
  undo: () => void;
}

export const useGame2048Store = create<Game2048Store>((set, get) => ({
  gameState: createGame(),
  undoStack: [],

  startGame: () => {
    set({ gameState: createGame(), undoStack: [] });
  },

  move: (direction: Direction) => {
    const prev = get().gameState;
    const next = slide(prev, direction);
    if (!next.moved) return; // No change
    set({
      gameState: next,
      undoStack: [...get().undoStack.slice(-10), prev], // Keep last 10 for undo
    });
  },

  undo: () => {
    const stack = get().undoStack;
    if (stack.length === 0) return;
    set({
      gameState: stack[stack.length - 1],
      undoStack: stack.slice(0, -1),
    });
  },
}));
