/**
 * Challenge mode: curated backgammon positions.
 * Each challenge has a FEN-like board state and one or more correct moves.
 * Target user already knows the game — no explanations, just correct/incorrect feedback.
 */

import type { Board } from './types';
import { getLegalMoves } from './moves';

export type ChallengeCategory = 'opening' | 'middlegame' | 'bearing-off' | 'backgame' | 'blitz' | 'general';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  category: ChallengeCategory;
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
    category: 'general',
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
    category: 'general',
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
    category: 'general',
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
    category: 'general',
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
    category: 'general',
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
    category: 'middlegame',
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
    category: 'middlegame',
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
    category: 'middlegame',
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
    category: 'middlegame',
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
    category: 'middlegame',
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
    category: 'middlegame',
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
    category: 'middlegame',
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
    category: 'middlegame',
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
    category: 'middlegame',
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
    category: 'middlegame',
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
    category: 'middlegame',
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
  // ---- NEW: OPENING ----
  {
    id: 'o1', title: 'Opening 31', description: 'Best opening move with 3-1.',
    difficulty: 'easy', category: 'opening',
    board: [0,0,0,0,0,5, 0,3,0,0,0,0, -5,0,0,0,0,0, 5,0,0,0,0,-2, 0,0],
    dice: [3, 1], correctResultKeys: [], par: 1,
  },
  {
    id: 'o2', title: 'Opening 64', description: 'Best opening move with 6-4.',
    difficulty: 'easy', category: 'opening',
    board: [0,0,0,0,0,5, 0,3,0,0,0,0, -5,0,0,0,0,0, 5,0,0,0,0,-2, 0,0],
    dice: [6, 4], correctResultKeys: [], par: 1,
  },
  {
    id: 'o3', title: 'Opening 55', description: 'Best opening move with double 5s.',
    difficulty: 'medium', category: 'opening',
    board: [0,0,0,0,0,5, 0,3,0,0,0,0, -5,0,0,0,0,0, 5,0,0,0,0,-2, 0,0],
    dice: [5, 5, 5, 5], correctResultKeys: [], par: 1,
  },
  {
    id: 'o4', title: 'Opening 21', description: 'Best opening with 2-1. Build or split?',
    difficulty: 'easy', category: 'opening',
    board: [0,0,0,0,0,5, 0,3,0,0,0,0, -5,0,0,0,0,0, 5,0,0,0,0,-2, 0,0],
    dice: [2, 1], correctResultKeys: [], par: 1,
  },
  {
    id: 'o5', title: 'Opening 65', description: 'The lovers\' leap. Run a back checker.',
    difficulty: 'easy', category: 'opening',
    board: [0,0,0,0,0,5, 0,3,0,0,0,0, -5,0,0,0,0,0, 5,0,0,0,0,-2, 0,0],
    dice: [6, 5], correctResultKeys: [], par: 1,
  },
  // ---- NEW: BEARING OFF ----
  {
    id: 'b1', title: 'Bear off efficiently', description: 'Use both dice to bear off checkers.',
    difficulty: 'easy', category: 'bearing-off',
    board: [2,2,2,2,2,5, 0,0,0,0,0,0, 0,0,0,0,0,0, 0,0,0,0,0,0, 0,0],
    dice: [6, 5], correctResultKeys: [], par: 1,
  },
  {
    id: 'b2', title: 'Wasteful bear off', description: 'Don\'t waste pips. Find the best play.',
    difficulty: 'medium', category: 'bearing-off',
    board: [0,1,2,1,3,3, 0,0,0,0,0,0, 0,0,0,0,0,0, 0,0,0,0,0,0, 0,5],
    dice: [6, 3], correctResultKeys: [], par: 1,
  },
  {
    id: 'b3', title: 'Bear off with contact', description: 'Bear off safely — opponent still has checkers.',
    difficulty: 'hard', category: 'bearing-off',
    board: [0,2,2,2,2,3, 0,0,0,0,0,-1, 0,0,0,0,0,0, -4,0,0,0,0,0, 0,4],
    dice: [5, 2], correctResultKeys: [], par: 1,
  },
  {
    id: 'b4', title: 'Exact bear off', description: 'You need exact numbers. Find the play.',
    difficulty: 'medium', category: 'bearing-off',
    board: [1,1,1,0,0,0, 0,0,0,0,0,0, 0,0,0,0,0,0, 0,0,0,0,0,0, 0,12],
    dice: [3, 2], correctResultKeys: [], par: 1,
  },
  {
    id: 'b5', title: 'Bear off doubles', description: 'Use double 4s to bear off optimally.',
    difficulty: 'easy', category: 'bearing-off',
    board: [0,0,2,3,3,2, 0,0,0,0,0,0, 0,0,0,0,0,0, 0,0,0,0,0,0, 0,5],
    dice: [4, 4, 4, 4], correctResultKeys: [], par: 1,
  },
  // ---- NEW: BLITZ ----
  {
    id: 'bl1', title: 'Attack the blot', description: 'Hit and keep the pressure on.',
    difficulty: 'medium', category: 'blitz',
    board: [0,0,0,2,3,4, 0,0,0,0,0,-2, 0,-1,0,0,0,0, -3,0,-1,0,0,2, 0,4],
    dice: [6, 1], correctResultKeys: [], par: 1,
  },
  {
    id: 'bl2', title: 'Double hit', description: 'Hit two blots in one turn.',
    difficulty: 'hard', category: 'blitz',
    board: [0,0,-1,2,3,4, -1,0,0,0,0,0, -3,0,0,0,0,0, 4,0,0,0,0,-2, 0,2],
    dice: [4, 3], correctResultKeys: [], par: 1,
  },
  {
    id: 'bl3', title: 'Blitz from bar', description: 'Re-enter from the bar and hit.',
    difficulty: 'hard', category: 'blitz',
    board: [0,-1,0,3,3,4, 0,0,0,0,0,-2, -3,0,0,0,0,0, 3,0,0,0,0,-2, 2,0],
    dice: [2, 5], correctResultKeys: [], par: 1,
  },
  // ---- NEW: BACKGAME ----
  {
    id: 'bg1', title: 'Hold the anchor', description: 'Keep your anchor and wait for a shot.',
    difficulty: 'hard', category: 'backgame',
    board: [0,0,0,0,0,-5, 0,0,0,0,0,0, 3,0,0,0,0,-3, -2,0,0,2,3,5, 0,2],
    dice: [3, 2], correctResultKeys: [], par: 1,
  },
  {
    id: 'bg2', title: 'Backgame timing', description: 'Maintain timing for your backgame.',
    difficulty: 'expert', category: 'backgame',
    board: [0,0,0,0,0,-5, 0,0,0,0,0,-3, 2,0,0,0,0,0, -2,0,0,2,2,4, 0,5],
    dice: [4, 1], correctResultKeys: [], par: 1,
  },
  // ---- NEW: MIDDLEGAME HARD ----
  {
    id: 'mh1', title: 'Prime vs prime', description: 'Extend your prime while trapping the opponent.',
    difficulty: 'hard', category: 'middlegame',
    board: [0,0,0,2,2,3, 2,2,0,0,0,0, -2,-2,-2,0,0,0, -3,0,0,0,0,2, 0,2],
    dice: [4, 3], correctResultKeys: [], par: 1,
  },
  {
    id: 'mh2', title: 'Safe or bold?', description: 'Play safe or go for the hit?',
    difficulty: 'hard', category: 'middlegame',
    board: [0,0,0,2,3,4, 0,0,-1,0,0,-2, -3,0,0,0,0,0, 4,0,0,0,0,-2, 0,2],
    dice: [3, 1], correctResultKeys: [], par: 1,
  },
  // ---- NEW: EXPERT ----
  {
    id: 'x1', title: 'Cube decision position', description: 'Should you double here? Find the best checker play.',
    difficulty: 'expert', category: 'middlegame',
    board: [0,0,0,2,3,3, 2,0,0,0,0,-3, -2,0,0,-2,0,0, 3,0,0,0,0,-2, 0,2],
    dice: [6, 4], correctResultKeys: [], par: 1,
  },
  {
    id: 'x2', title: 'Complex race', description: 'Deep in the race. Optimize pip usage.',
    difficulty: 'expert', category: 'bearing-off',
    board: [0,2,3,2,3,2, 0,0,0,0,0,0, 0,0,0,0,0,0, 0,0,0,0,0,0, 0,3],
    dice: [6, 6, 6, 6], correctResultKeys: [], par: 1,
  },
  {
    id: 'x3', title: 'Split or slot?', description: 'A critical early-game decision.',
    difficulty: 'expert', category: 'opening',
    board: [0,0,0,0,1,5, 0,3,0,0,0,-5, 0,0,0,0,-3,0, 5,0,0,0,1,-2, 0,0],
    dice: [5, 2], correctResultKeys: [], par: 1,
  },
  {
    id: 'x4', title: 'Anchor or run?', description: 'Build an anchor or escape?',
    difficulty: 'expert', category: 'backgame',
    board: [0,0,0,0,0,-4, 0,0,0,-3,0,0, 3,0,0,0,0,-3, 5,0,0,2,2,3, 0,0],
    dice: [6, 3], correctResultKeys: [], par: 1,
  },
  // ---- NEW: EASY MIDDLEGAME ----
  {
    id: 'em1', title: 'Make a point', description: 'Use your builders to make an important point.',
    difficulty: 'easy', category: 'middlegame',
    board: [0,0,0,1,1,5, 0,3,0,0,0,-5, 0,0,0,0,-3,0, 5,0,0,0,0,-2, 0,0],
    dice: [1, 1, 1, 1], correctResultKeys: [], par: 1,
  },
  {
    id: 'em2', title: 'Escape the backmen', description: 'Move your back checkers to safety.',
    difficulty: 'easy', category: 'middlegame',
    board: [0,0,0,0,0,5, 0,3,0,0,0,-5, 0,0,0,0,-3,0, 5,0,0,0,0,-2, 0,2],
    dice: [6, 6, 6, 6], correctResultKeys: [], par: 1,
  },
  // ---- NEW: MEDIUM BEARING OFF ----
  {
    id: 'mb1', title: 'Gammon save', description: 'Bear off at least one checker to avoid a gammon.',
    difficulty: 'medium', category: 'bearing-off',
    board: [0,0,0,1,2,2, 0,0,0,0,0,0, 0,0,0,0,0,0, 0,0,0,0,0,0, 0,10],
    dice: [1, 2], correctResultKeys: [], par: 1,
  },
  {
    id: 'mb2', title: 'Smooth bear off', description: 'Distribute checkers for future rolls.',
    difficulty: 'medium', category: 'bearing-off',
    board: [0,0,4,0,4,2, 0,0,0,0,0,0, 0,0,0,0,0,0, 0,0,0,0,0,0, 0,5],
    dice: [5, 3], correctResultKeys: [], par: 1,
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
