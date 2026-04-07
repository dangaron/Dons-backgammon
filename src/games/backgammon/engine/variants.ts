/**
 * Backgammon game variants. Pure data, no UI imports.
 */

import type { Board } from './types';
import { HOME } from './board';

export type VariantType = 'standard' | 'nackgammon' | 'hypergammon';

export interface GameVariant {
  type: VariantType;
  name: string;
  description: string;
  initialBoard: Board;
  checkersPerPlayer: number;
}

// Standard backgammon: 15 checkers each
// Board indices: player moves from 23→0, opponent is negative
const STANDARD_BOARD: Board = new Array(27).fill(0);
STANDARD_BOARD[23] = 2;   // point 24
STANDARD_BOARD[12] = 5;   // point 13
STANDARD_BOARD[7] = 3;    // point 8
STANDARD_BOARD[5] = 5;    // point 6
// Opponent checkers (negative)
STANDARD_BOARD[0] = -2;   // point 1
STANDARD_BOARD[11] = -5;  // point 12
STANDARD_BOARD[16] = -3;  // point 17
STANDARD_BOARD[18] = -5;  // point 19

// Nackgammon: 17 checkers each — standard + 1 extra on 24-pt and 1 on 23-pt
const NACKGAMMON_BOARD: Board = [...STANDARD_BOARD];
NACKGAMMON_BOARD[23] = 3;  // point 24: was 2, now 3 (+1)
NACKGAMMON_BOARD[22] = 1;  // point 23: new, 1 checker
// Opponent also gets 2 extra
NACKGAMMON_BOARD[0] = -3;  // point 1: was -2, now -3 (+1)
NACKGAMMON_BOARD[1] = -1;  // point 2: new, 1 checker

// Hypergammon: 3 checkers each on points 24, 23, 22
const HYPERGAMMON_BOARD: Board = new Array(27).fill(0);
HYPERGAMMON_BOARD[23] = 1;  // point 24
HYPERGAMMON_BOARD[22] = 1;  // point 23
HYPERGAMMON_BOARD[21] = 1;  // point 22
HYPERGAMMON_BOARD[0] = -1;  // point 1
HYPERGAMMON_BOARD[1] = -1;  // point 2
HYPERGAMMON_BOARD[2] = -1;  // point 3

export const VARIANTS: Record<VariantType, GameVariant> = {
  standard: {
    type: 'standard',
    name: 'Standard',
    description: 'Classic backgammon — 15 checkers each',
    initialBoard: STANDARD_BOARD,
    checkersPerPlayer: 15,
  },
  nackgammon: {
    type: 'nackgammon',
    name: 'Nackgammon',
    description: '17 checkers — longer, more strategic games',
    initialBoard: NACKGAMMON_BOARD,
    checkersPerPlayer: 17,
  },
  hypergammon: {
    type: 'hypergammon',
    name: 'Hypergammon',
    description: '3 checkers — fast, tactical blitz games',
    initialBoard: HYPERGAMMON_BOARD,
    checkersPerPlayer: 3,
  },
};

/** Check if a player has won for the given variant. */
export function hasWonVariant(board: Board, variant: VariantType): boolean {
  return board[HOME] >= VARIANTS[variant].checkersPerPlayer;
}
