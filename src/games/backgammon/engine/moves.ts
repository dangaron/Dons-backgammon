/**
 * Legal move enumeration. No UI imports.
 *
 * Board convention: positive = current player, negative = opponent.
 * BAR = index 24, HOME = index 25.
 *
 * A checker moves from higher-index to lower-index points (toward home at 0-5).
 * Wait — standard backgammon: player moves from point 24 toward point 1.
 * In our array: index 23 = point 24 (start), index 0 = point 1 (near home).
 * So movement is from high index toward low index. Home board = indices 0-5.
 * Bearing off = moving to index 25 (HOME) from indices 0-5.
 */

import type { Board, DieMove, LegalMove, Move } from './types';
import { BAR, HOME, OPP_BAR, allCheckersHome, boardKey, cloneBoard } from './board';


/**
 * Get legal destinations for one die from a given position, on the given board.
 * Returns array of {from, to, die} that are legal single-die moves.
 */
function getLegalSingleMoves(board: Board, die: number): DieMove[] {
  const moves: DieMove[] = [];

  // If player has checker on bar, must enter first
  if (board[BAR] > 0) {
    // Enter from bar: destination is (24 - die) = index (24 - die)
    // Bar entry point: die 1 → index 23, die 2 → index 22, etc.
    const to = 24 - die;
    if (to >= 0 && to <= 23) {
      if (board[to] >= -1) { // open or blot
        moves.push({ from: BAR, to, die });
      }
    }
    return moves; // must use bar first
  }

  // Normal moves: find all current player checkers
  for (let from = 0; from <= 23; from++) {
    if (board[from] <= 0) continue; // no current player checker here

    const to = from - die;

    if (to >= 0) {
      // Normal move (not bearing off)
      if (board[to] >= -1) { // open or opponent blot
        moves.push({ from, to, die });
      }
    } else {
      // Potential bearing off (to < 0)
      if (!allCheckersHome(board)) continue; // can't bear off yet

      if (to === -die + from) {
        // Exact bear off or overshoot
        if (from - die < 0) {
          // Overshoot: only legal if no checker on a higher point
          let highestOccupied = -1;
          for (let p = 5; p >= 0; p--) {
            if (board[p] > 0) { highestOccupied = p; break; }
          }
          if (highestOccupied === -1 || from >= highestOccupied) {
            moves.push({ from, to: HOME, die });
          }
        } else {
          moves.push({ from, to: HOME, die });
        }
      }
    }
  }

  return moves;
}

/**
 * Enumerate ALL complete legal moves from current board state given dice.
 * Returns deduplicated by final board state.
 *
 * dice: array of remaining die values (e.g. [3,5] or [4,4,4,4]).
 */
export function getLegalMoves(board: Board, dice: number[]): LegalMove[] {
  const results = new Map<string, LegalMove>(); // key = final board state
  let maxDiceUsed = 0;

  function recurse(b: Board, remainingDice: number[], movesSoFar: Move) {
    // Try each unique die value
    const tried = new Set<number>();
    let anyLegal = false;

    for (let i = 0; i < remainingDice.length; i++) {
      const die = remainingDice[i];
      if (tried.has(die)) continue;
      tried.add(die);

      const singleMoves = getLegalSingleMoves(b, die);
      for (const sm of singleMoves) {
        anyLegal = true;
        const newBoard = applyDieMoveInternal(b, sm);
        const newMoves = [...movesSoFar, sm];
        const newRemaining = [...remainingDice.slice(0, i), ...remainingDice.slice(i + 1)];

        const diceUsed = dice.length - newRemaining.length;
        if (diceUsed > maxDiceUsed) maxDiceUsed = diceUsed;

        if (newRemaining.length === 0) {
          const key = boardKey(newBoard);
          if (!results.has(key)) {
            results.set(key, { move: newMoves, resultBoard: newBoard });
          }
        } else {
          recurse(newBoard, newRemaining, newMoves);
        }
      }
    }

    // If no further moves possible, record what we have
    if (!anyLegal && movesSoFar.length > 0) {
      const diceUsed = dice.length - remainingDice.length;
      if (diceUsed >= maxDiceUsed) {
        if (diceUsed > maxDiceUsed) {
          // Found a move using more dice — clear shorter results
          results.clear();
          maxDiceUsed = diceUsed;
        }
        const key = boardKey(b);
        if (!results.has(key)) {
          results.set(key, { move: movesSoFar, resultBoard: b });
        }
      }
    }
  }

  recurse(board, dice, []);

  // Filter: only keep moves that use maxDiceUsed dice (must use both dice rule)
  const filtered: LegalMove[] = [];
  for (const lm of results.values()) {
    if (lm.move.length === maxDiceUsed) {
      filtered.push(lm);
    }
  }

  return filtered;
}

/**
 * Apply a single die move. Handles hit logic.
 * Convention: board[BAR] = current player bar count (positive)
 * Opponent bar is tracked as negative values at BAR via flipBoard.
 */
export function applySingleDieMove(board: Board, move: DieMove): Board {
  return applyDieMoveInternal(board, move);
}

function applyDieMoveInternal(board: Board, move: DieMove): Board {
  const b = cloneBoard(board);
  const { from, to } = move;

  // Remove from source
  if (from === BAR) {
    b[BAR]--;
  } else {
    b[from]--;
  }

  if (to === HOME) {
    b[HOME]++;
    return b;
  }

  // Check for hit
  if (b[to] === -1) {
    // Hit opponent blot: send to opponent's bar
    b[OPP_BAR]++;
    b[to] = 1;
  } else {
    b[to]++;
  }

  return b;
}

/**
 * Apply a full move (sequence of die moves) to a board.
 */
export function applyMove(board: Board, move: Move): Board {
  let b = cloneBoard(board);
  for (const dm of move) {
    b = applyDieMoveInternal(b, dm);
  }
  return b;
}

/**
 * Get valid single-die destinations from a specific piece.
 * Only returns first-die moves that are part of a valid complete move
 * (ensures the player can't waste a die that would prevent using max dice).
 *
 * Enumerates all orderings to avoid deduplication hiding valid first moves.
 */
export function getValidSingleMoves(
  board: Board,
  dice: number[],
  from: number
): Array<{ to: number; die: number }> {
  const allMoves = getLegalMoves(board, dice);
  if (allMoves.length === 0) return [];

  const maxDice = allMoves[0].move.length; // all moves use the same max dice count
  const results = new Map<string, { to: number; die: number }>();

  // For each unique die value, check if using it first from `from` is part of a valid max-dice move
  const triedDice = new Set<number>();
  for (const die of dice) {
    if (triedDice.has(die)) continue;
    triedDice.add(die);

    // Can this die be used from `from`?
    const singleMoves = getLegalSingleMovesExported(board, die);
    const sm = singleMoves.find(m => m.from === from);
    if (!sm) continue;

    if (maxDice === 1) {
      // Only 1 die can be used total. Check if this die from this piece is one of the valid moves.
      const isValid = allMoves.some(lm => lm.move[0].from === from && lm.move[0].die === die);
      if (isValid) {
        const key = `${sm.to}-${sm.die}`;
        if (!results.has(key)) results.set(key, { to: sm.to, die: sm.die });
      }
    } else {
      // Multiple dice must be used. Check if using this die first still allows using remaining dice.
      const newBoard = applyDieMoveInternal(board, sm);
      const remainIdx = dice.indexOf(die);
      const remaining = [...dice.slice(0, remainIdx), ...dice.slice(remainIdx + 1)];
      // After this first move, can we use at least (maxDice - 1) more dice?
      const followUps = getLegalMoves(newBoard, remaining);
      if (followUps.length > 0 && followUps[0].move.length >= maxDice - 1) {
        const key = `${sm.to}-${sm.die}`;
        if (!results.has(key)) results.set(key, { to: sm.to, die: sm.die });
      }
    }
  }

  return Array.from(results.values());
}

/** Exported wrapper for getLegalSingleMoves (used by getValidSingleMoves). */
function getLegalSingleMovesExported(board: Board, die: number): DieMove[] {
  return getLegalSingleMoves(board, die);
}

/** Check if current player has any legal moves at all. */
export function hasLegalMoves(board: Board, dice: number[]): boolean {
  return getLegalMoves(board, dice).length > 0;
}
