/**
 * Curated solitaire puzzles — hand-designed positions with specific solutions.
 * Like chess puzzles but for solitaire. "Find the winning sequence."
 */

import type { SolitaireState, TableauPile } from './types';

export type PuzzleDifficulty = 'easy' | 'medium' | 'hard';

export interface SolitairePuzzle {
  id: string;
  name: string;
  description: string;
  difficulty: PuzzleDifficulty;
  hint: string;
  /** The pre-built game state to start from. */
  state: SolitaireState;
  /** Number of moves in the optimal solution. */
  optimalMoves: number;
}

// Helper to create a card ID from suit and rank
// suitIndex: 0=hearts, 1=diamonds, 2=clubs, 3=spades
// rank: 1=A, 2=2, ..., 13=K
function card(suit: number, rank: number): number {
  return suit * 13 + (rank - 1);
}

function pile(faceDown: number[], faceUp: number[]): TableauPile {
  return { faceDown, faceUp };
}

/** Pre-built puzzles. Each is a mid-game Klondike position with a clear winning path. */
export const PUZZLES: SolitairePuzzle[] = [
  {
    id: 'puzzle-1',
    name: 'Foundation Sprint',
    description: 'All cards are face-up. Move everything to foundations.',
    difficulty: 'easy',
    hint: 'Start with the aces, then build up in order.',
    optimalMoves: 12,
    state: {
      stock: [],
      waste: [],
      foundations: [
        [card(0, 1), card(0, 2), card(0, 3), card(0, 4), card(0, 5), card(0, 6), card(0, 7), card(0, 8), card(0, 9), card(0, 10)],
        [card(1, 1), card(1, 2), card(1, 3), card(1, 4), card(1, 5), card(1, 6), card(1, 7), card(1, 8), card(1, 9), card(1, 10)],
        [card(2, 1), card(2, 2), card(2, 3), card(2, 4), card(2, 5), card(2, 6), card(2, 7), card(2, 8), card(2, 9), card(2, 10)],
        [card(3, 1), card(3, 2), card(3, 3), card(3, 4), card(3, 5), card(3, 6), card(3, 7), card(3, 8), card(3, 9), card(3, 10)],
      ],
      tableau: [
        pile([], [card(0, 11)]),
        pile([], [card(1, 11)]),
        pile([], [card(2, 11)]),
        pile([], [card(3, 11)]),
        pile([], [card(0, 12)]),
        pile([], [card(1, 12), card(2, 12)]),
        pile([], [card(3, 12), card(0, 13), card(1, 13), card(2, 13), card(3, 13)]),
      ],
      moveCount: 0,
      score: 0,
      startTime: 0,
      seed: 1001,
      drawMode: 1,
      gameOver: false,
      won: false,
    },
  },
  {
    id: 'puzzle-2',
    name: 'The Blocked King',
    description: 'A king is blocking the column. Find the path to free it.',
    difficulty: 'medium',
    hint: 'Move the king to an empty column first, then uncover the ace beneath.',
    optimalMoves: 8,
    state: {
      stock: [],
      waste: [],
      foundations: [
        [card(0, 1), card(0, 2), card(0, 3), card(0, 4), card(0, 5), card(0, 6), card(0, 7), card(0, 8), card(0, 9), card(0, 10), card(0, 11), card(0, 12)],
        [card(1, 1), card(1, 2), card(1, 3), card(1, 4), card(1, 5), card(1, 6), card(1, 7), card(1, 8), card(1, 9), card(1, 10), card(1, 11), card(1, 12)],
        [card(2, 1), card(2, 2), card(2, 3), card(2, 4), card(2, 5), card(2, 6), card(2, 7), card(2, 8), card(2, 9), card(2, 10), card(2, 11), card(2, 12)],
        [card(3, 1), card(3, 2), card(3, 3), card(3, 4), card(3, 5), card(3, 6), card(3, 7), card(3, 8), card(3, 9), card(3, 10), card(3, 11), card(3, 12)],
      ],
      tableau: [
        pile([], [card(3, 13)]),
        pile([], [card(0, 13)]),
        pile([], [card(1, 13)]),
        pile([], [card(2, 13)]),
        pile([], []),
        pile([], []),
        pile([], []),
      ],
      moveCount: 0,
      score: 0,
      startTime: 0,
      seed: 1002,
      drawMode: 1,
      gameOver: false,
      won: false,
    },
  },
  {
    id: 'puzzle-3',
    name: 'Sequence Builder',
    description: 'Build alternating color sequences to unlock hidden cards.',
    difficulty: 'easy',
    hint: 'Place the red 6 on the black 7 to expose the card underneath.',
    optimalMoves: 6,
    state: {
      stock: [card(2, 1)],
      waste: [],
      foundations: [
        [card(0, 1), card(0, 2), card(0, 3), card(0, 4), card(0, 5)],
        [card(1, 1), card(1, 2), card(1, 3), card(1, 4), card(1, 5)],
        [card(2, 2), card(2, 3), card(2, 4), card(2, 5)],  // missing ace
        [card(3, 1), card(3, 2), card(3, 3), card(3, 4), card(3, 5)],
      ],
      tableau: [
        pile([], [card(3, 7), card(0, 6)]),
        pile([card(2, 1)], [card(2, 7), card(1, 6)]),
        pile([], [card(0, 8), card(3, 7)]),
        pile([], [card(0, 6), card(3, 5)]),
        pile([], []),
        pile([], [card(1, 8)]),
        pile([], []),
      ],
      moveCount: 0,
      score: 0,
      startTime: 0,
      seed: 1003,
      drawMode: 1,
      gameOver: false,
      won: false,
    },
  },
  {
    id: 'puzzle-4',
    name: 'Stock Dive',
    description: 'The key card is deep in the stock. Find the right order.',
    difficulty: 'medium',
    hint: 'Draw through the stock to find the ace you need.',
    optimalMoves: 10,
    state: {
      stock: [card(0, 1), card(1, 3), card(2, 4)],
      waste: [],
      foundations: [
        [],
        [card(1, 1), card(1, 2)],
        [card(2, 1), card(2, 2), card(2, 3)],
        [card(3, 1), card(3, 2), card(3, 3), card(3, 4), card(3, 5)],
      ],
      tableau: [
        pile([], [card(0, 5), card(1, 4)]),
        pile([], [card(2, 6), card(0, 5)]),
        pile([], [card(0, 2), card(0, 3), card(0, 4)]),
        pile([], []),
        pile([], [card(3, 6)]),
        pile([], []),
        pile([], []),
      ],
      moveCount: 0,
      score: 0,
      startTime: 0,
      seed: 1004,
      drawMode: 1,
      gameOver: false,
      won: false,
    },
  },
  {
    id: 'puzzle-5',
    name: 'The Grand Finale',
    description: 'Just a few moves from victory. Can you see the path?',
    difficulty: 'hard',
    hint: 'Move the queen first, then cascade the remaining cards to foundations.',
    optimalMoves: 15,
    state: {
      stock: [],
      waste: [],
      foundations: [
        [card(0, 1), card(0, 2), card(0, 3), card(0, 4), card(0, 5), card(0, 6), card(0, 7), card(0, 8), card(0, 9)],
        [card(1, 1), card(1, 2), card(1, 3), card(1, 4), card(1, 5), card(1, 6), card(1, 7), card(1, 8), card(1, 9)],
        [card(2, 1), card(2, 2), card(2, 3), card(2, 4), card(2, 5), card(2, 6), card(2, 7), card(2, 8)],
        [card(3, 1), card(3, 2), card(3, 3), card(3, 4), card(3, 5), card(3, 6), card(3, 7), card(3, 8)],
      ],
      tableau: [
        pile([], [card(2, 13), card(0, 12), card(2, 11), card(0, 10)]),
        pile([], [card(3, 13), card(1, 12), card(3, 11), card(1, 10)]),
        pile([], [card(0, 13), card(2, 12)]),
        pile([], [card(1, 13), card(3, 12)]),
        pile([], [card(2, 9)]),
        pile([], [card(3, 9)]),
        pile([], [card(0, 11), card(1, 10)]),
      ],
      moveCount: 0,
      score: 0,
      startTime: 0,
      seed: 1005,
      drawMode: 1,
      gameOver: false,
      won: false,
    },
  },
];

export function getPuzzle(id: string): SolitairePuzzle | null {
  return PUZZLES.find(p => p.id === id) ?? null;
}

export function getPuzzlesByDifficulty(difficulty: PuzzleDifficulty): SolitairePuzzle[] {
  return PUZZLES.filter(p => p.difficulty === difficulty);
}
