/**
 * Board utilities. No UI imports.
 */
import type { Board } from './types';

export const BAR = 24;
export const HOME = 25;
export const OPP_BAR = 26;

/**
 * Standard backgammon starting position from player 0's perspective.
 * Player 0 moves from high index (23) to low index (0). Home board = indices 0-5.
 *
 * Player 0 (positive): 2@idx23(pt24), 5@idx12(pt13), 3@idx7(pt8), 5@idx5(pt6)
 * Player 1 (negative): 2@idx0(pt1),   5@idx11(pt12), 3@idx16(pt17), 5@idx18(pt19)
 *
 * idx: 0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18  19  20  21  22  23  24  25
 */
/**
 * idx: 0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18  19  20  21  22  23  24  25  26
 *      pts 1-6                pts 7-12               pts 13-18              pts 19-24              BAR HOME OPP_BAR
 */
export const INITIAL_BOARD: Board = [
  -2,  0,  0,  0,  0,  5,   // pts 1-6:   opp@1, player@6
   0,  3,  0,  0,  0, -5,   // pts 7-12:  player@8, opp@12
   5,  0,  0,  0, -3,  0,   // pts 13-18: player@13, opp@17
  -5,  0,  0,  0,  0,  2,   // pts 19-24: opp@19, player@24
   0,  0,  0,               // bar=0, home=0, opp_bar=0
];

/** Deep clone a board. */
export function cloneBoard(board: Board): Board {
  return board.slice();
}

/**
 * Flip the board for the next player's turn.
 * Points 0-23 are mirrored and negated. Bar is negated.
 * HOME (25) is NOT flipped here — managed externally via GameState.borneOff.
 * The caller is responsible for setting board[HOME] to the next player's borne-off count.
 */
export function flipBoard(board: Board): Board {
  const flipped = new Array(27).fill(0);
  for (let i = 0; i < 24; i++) {
    flipped[23 - i] = -board[i];
  }
  // Swap BAR and OPP_BAR: current player's bar becomes opponent's, and vice versa
  flipped[BAR] = board[OPP_BAR];
  flipped[OPP_BAR] = board[BAR];
  // HOME (25) intentionally left as 0 — caller sets from borneOff
  return flipped;
}

/**
 * Check if current player has all 15 checkers in their home board (indices 0-5).
 * Required before bearing off is legal.
 */
export function allCheckersHome(board: Board): boolean {
  if (board[BAR] > 0) return false;
  // Any checker outside home board (indices 6-23) means not all home
  for (let i = 6; i <= 23; i++) {
    if (board[i] > 0) return false;
  }
  return true;
}

/** Pip count for current player (lower = closer to bearing off). */
export function pipCount(board: Board): number {
  let count = 0;
  for (let i = 0; i < 24; i++) {
    if (board[i] > 0) {
      // Distance to bear off: checker at index i needs (i+1) pips to reach home (indices 0-5)
      // Actually distance to bear off = index + 1 (since home = index 0 side)
      // Wait: player moves from high to low. Bearing off from index 0 costs 1 pip.
      // So distance = index + 1.
      count += board[i] * (i + 1);
    }
  }
  if (board[BAR] > 0) count += board[BAR] * 25;
  return count;
}

/** Serialize board to string for deduplication. */
export function boardKey(board: Board): string {
  return board.join(',');
}

/** Check if current player has won (board[HOME] >= 15). */
export function hasWon(board: Board): boolean {
  return board[HOME] >= 15;
}

/**
 * Un-flip a board from player 1's perspective back to player 0's perspective.
 * Used by the UI to always display from player 0's viewpoint.
 */
export function unflopBoard(board: Board): Board {
  const ub = new Array(27).fill(0);
  for (let i = 0; i < 24; i++) {
    ub[23 - i] = -board[i];
  }
  // When unflipping player 1's board back to player 0's perspective:
  // player 1's BAR (their checkers) becomes OPP_BAR, and vice versa
  ub[BAR] = board[OPP_BAR];
  ub[OPP_BAR] = board[BAR];
  ub[HOME] = board[HOME]; // HOME is context-dependent, kept as-is
  return ub;
}

/** Get opponent pip count (checkers are negative values in points 0-23). */
export function opponentPipCount(board: Board): number {
  let count = 0;
  for (let i = 0; i < 24; i++) {
    if (board[i] < 0) {
      // From opponent's perspective, their checker at our index i is at (23-i),
      // and their distance to bear off is (23-i+1) = 24-i
      count += (-board[i]) * (24 - i);
    }
  }
  if (board[OPP_BAR] > 0) count += board[OPP_BAR] * 25;
  return count;
}
