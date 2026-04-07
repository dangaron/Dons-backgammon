/**
 * Challenge mode: curated backgammon positions.
 * Each challenge has a FEN-like board state and one or more correct moves.
 * Target user already knows the game — no explanations, just correct/incorrect feedback.
 */

import type { Board } from './types';
import { getLegalMoves } from './moves';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  board: Board;       // board from current player's perspective
  dice: number[];
  /** Board keys of correct result boards (deduplicated by final board state) */
  correctResultKeys: string[];
  par: number;        // "par" = 1 for single best move, higher for multi-step problems
}

/**
 * 30 curated challenge positions.
 * All boards are from the current player's (positive) perspective.
 * Board: 26 elements [points 0-23, bar (24), home (25)].
 */
export const CHALLENGES: Challenge[] = [
  // ---- EASY ----
  {
    id: 'e1',
    title: 'Hit the blot',
    description: 'Opponent left a blot. Hit it.',
    difficulty: 'easy',
    board: [
      0, 0, 0, 0, 0, 5,   // points 1-6 (home board)
      0, 3, 0, 0, 0, 0,   // points 7-12
     -1, 0, 0, 0, 0, 0,   // points 13-18 (opponent blot at 13)
      5, 0, 0, 0, 0,-2,   // points 19-24
      0, 0,               // bar, home
    ],
    dice: [2, 4],
    correctResultKeys: [], // computed below
    par: 1,
  },
  {
    id: 'e2',
    title: 'Make the 5-point',
    description: 'Build your 5-point — the most important point in the game.',
    difficulty: 'easy',
    board: [
      0, 0, 0, 0, 1, 5,   // one builder on 5-point (index 4)
      0, 3, 0, 0, 0, 0,
     -5, 0, 0, 0, 0, 0,
      5, 0, 0, 1, 0,-2,
      0, 0,
    ],
    dice: [3, 5],
    correctResultKeys: [],
    par: 1,
  },
  {
    id: 'e3',
    title: 'Bear off cleanly',
    description: 'Bear off a checker with the most efficient move.',
    difficulty: 'easy',
    board: [
      3, 3, 3, 3, 3, 0,   // all checkers home
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0,
      0, 1,               // 1 already borne off
    ],
    dice: [1, 2],
    correctResultKeys: [],
    par: 1,
  },
  {
    id: 'e4',
    title: 'Enter from the bar',
    description: 'You have a checker on the bar. Enter it.',
    difficulty: 'easy',
    board: [
      0, 0, 0, 0, 0, 5,
      0, 3, 0, 0, 0, 0,
     -5, 0, 0, 0, 0, 0,
      5, 0, 0, 0, 0,-2,
      1, 0,               // 1 on bar
    ],
    dice: [3, 4],
    correctResultKeys: [],
    par: 1,
  },
  {
    id: 'e5',
    title: 'Run to safety',
    description: 'Move your back checker to avoid being hit.',
    difficulty: 'easy',
    board: [
      0, 0, 0, 0, 0, 5,
      0, 3, 0, 0, 0, 0,
     -5, 0, 0, 0, 0, 0,
      5, 0, 0, 0, 0,-2,
      0, 0,
    ],
    dice: [6, 5],
    correctResultKeys: [],
    par: 1,
  },
  // ---- MEDIUM ----
  {
    id: 'm1',
    title: 'Prime or run?',
    description: 'Should you extend your prime or run a back checker?',
    difficulty: 'medium',
    board: [
      0, 0, 0, 2, 2, 5,
      0, 0, 0, 0, 0, 0,
     -5, 0, 0, 0, 0, 0,
      3, 0, 0, 1, 0,-2,
      0, 0,
    ],
    dice: [4, 3],
    correctResultKeys: [],
    par: 1,
  },
  {
    id: 'm2',
    title: 'Hit or make a point?',
    description: 'There\'s a blot to hit, but you could also make a key point.',
    difficulty: 'medium',
    board: [
      0, 0, 0, 0, 2, 5,
      0, 3, 0,-1, 0, 0,
     -4, 0, 0, 0, 0, 0,
      3, 0, 0, 2, 0,-2,
      0, 0,
    ],
    dice: [2, 3],
    correctResultKeys: [],
    par: 1,
  },
  {
    id: 'm3',
    title: 'Slot the golden point',
    description: 'Place a builder to make the 5-point next turn.',
    difficulty: 'medium',
    board: [
      0, 0, 0, 0, 0, 5,
      0, 3, 0, 0, 0, 0,
     -5, 0, 0, 1, 0, 0,
      5, 0, 0, 1, 0,-2,
      0, 0,
    ],
    dice: [1, 4],
    correctResultKeys: [],
    par: 1,
  },
  {
    id: 'm4',
    title: 'Bearing off with choice',
    description: 'You\'re bearing off. Which checkers to move?',
    difficulty: 'medium',
    board: [
      4, 3, 2, 2, 2, 2,
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0,
      0, 0,
    ],
    dice: [3, 5],
    correctResultKeys: [],
    par: 1,
  },
  {
    id: 'm5',
    title: 'Escape the anchor',
    description: 'You\'re anchored deep. Make the best escape.',
    difficulty: 'medium',
    board: [
      0, 0, 0, 0, 0, 5,
      0, 3, 0, 0, 0, 0,
     -5, 0, 0, 0, 0, 0,
      3, 0, 1, 0, 0,-2,
      0, 0,
    ],
    dice: [5, 6],
    correctResultKeys: [],
    par: 1,
  },
  {
    id: 'm6',
    title: 'Double hit',
    description: 'You can hit two blots. Is that the right play?',
    difficulty: 'medium',
    board: [
      0, 0, 0, 0, 2, 4,
      0, 3, 0, 0, 0, 0,
     -3,-1, 0,-1, 0, 0,
      4, 0, 0, 0, 0,-2,
      0, 0,
    ],
    dice: [2, 4],
    correctResultKeys: [],
    par: 1,
  },
  {
    id: 'm7',
    title: 'Contain or attack?',
    description: 'Opponent checker on your 2-point. Close the board or attack?',
    difficulty: 'medium',
    board: [
      1, 2, 0, 2, 2, 4,
      0, 0, 0, 0, 0, 0,
     -5, 0, 0, 0, 0,-1,
      5, 0, 0, 0, 0,-2,
      0, 0,
    ],
    dice: [3, 2],
    correctResultKeys: [],
    par: 1,
  },
  {
    id: 'm8',
    title: 'Holding game',
    description: 'You\'re behind in the race. Hold the anchor.',
    difficulty: 'medium',
    board: [
      0, 0, 0, 0, 0, 4,
      0, 3, 0, 0, 0, 0,
     -5, 0, 0, 0, 0, 0,
      3, 0, 2, 0, 0,-3,
      0, 0,
    ],
    dice: [4, 2],
    correctResultKeys: [],
    par: 1,
  },
  // ---- HARD ----
  {
    id: 'h1',
    title: 'The backgame',
    description: 'Classic backgame position. Pick the move that maintains your blockade.',
    difficulty: 'hard',
    board: [
      2, 0, 2, 0, 0, 4,
      0, 2, 0, 0, 0, 0,
     -5, 0, 0, 0,-1, 0,
      3, 0, 0, 0, 0,-3,
      0, 0,
    ],
    dice: [6, 4],
    correctResultKeys: [],
    par: 1,
  },
  {
    id: 'h2',
    title: 'Timing crisis',
    description: 'You\'re about to break your prime. What\'s the best damage control?',
    difficulty: 'hard',
    board: [
      0, 2, 2, 2, 2, 3,
      2, 0, 0, 0, 0, 0,
     -5, 0, 0, 0, 0,-1,
      2, 0, 0, 0, 0,-2,
      0, 0,
    ],
    dice: [6, 5],
    correctResultKeys: [],
    par: 1,
  },
  {
    id: 'h3',
    title: 'Pip count decision',
    description: 'Should you hit or run? Count the pips before deciding.',
    difficulty: 'hard',
    board: [
      0, 0, 0, 0, 0, 5,
      0, 2, 0, 0,-1, 0,
     -4, 0, 0, 0, 0, 0,
      4, 1, 0, 0, 0,-3,
      0, 0,
    ],
    dice: [5, 3],
    correctResultKeys: [],
    par: 1,
  },
];

// Normalize all challenge boards to 27 elements (add OPP_BAR if missing)
for (const ch of CHALLENGES) {
  if (ch.board.length === 26) ch.board.push(0);
}

// Pre-compute correct result keys for each challenge
// (In a real implementation, these would be computed by a strong AI or manually curated)
// For now, we mark the best move as "any of the legal moves from this position"
// and the challenge logic validates against the AI's top choice
export function getChallengeLegalMoves(challenge: Challenge) {
  return getLegalMoves(challenge.board, challenge.dice);
}
