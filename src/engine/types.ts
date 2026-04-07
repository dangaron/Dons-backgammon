/**
 * Core backgammon types. No browser or UI imports allowed in this directory.
 * This engine must run identically in browser main thread, Web Worker, and Deno (Supabase Edge Functions).
 */

/**
 * Board: 26-element number array.
 * Index 0-23: points (point 1 = index 0, point 24 = index 23, from current player's perspective).
 *   Player moves from high index (23) toward low index (0). Home board = indices 0-5.
 * Index 24: bar — positive = current player's checkers, negative = opponent's checkers.
 * Index 25: current player's borne-off count (always >= 0 for current player during their turn).
 *   Managed separately via GameState.borneOff across turns; board[25] is live during a turn.
 *
 * Positive = current player's checkers.
 * Negative = opponent's checkers.
 * 0 = empty point.
 */
export type Board = number[];

export type Player = 0 | 1;

export interface GameState {
  board: Board;
  currentPlayer: Player;
  dice: number[];          // remaining dice to play (e.g. [3, 5] or [4, 4, 4, 4] for doubles)
  diceRolled: boolean;
  turnPhase: 'roll' | 'move' | 'double-offered' | 'game-over';
  winner: Player | null;
  doublingCube: DoublingCube;
  /** Persistent borne-off counts by absolute player index. Survives board flips. */
  borneOff: [number, number];
  /** Match points scored by each player */
  matchScore: [number, number];
  /** Points needed to win the match */
  matchLength: number;
}

export interface DoublingCube {
  value: number;           // 1, 2, 4, 8, 16, 32, 64
  owner: Player | null;    // null = centered (either can double), Player = that player owns it
  offeredBy: Player | null; // set during double-offered phase
}

/** A single die move: move a checker from `from` to `to`. */
export interface DieMove {
  from: number; // 0-24 (24 = bar)
  to: number;   // 0-25 (25 = borne off)
  die: number;
}

/** A complete turn move: sequence of 1-4 die moves. */
export type Move = DieMove[];

/** Result of getLegalMoves — includes what the final board looks like after each move. */
export interface LegalMove {
  move: Move;
  resultBoard: Board;
}
