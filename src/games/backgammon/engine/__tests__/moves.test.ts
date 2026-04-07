import { describe, it, expect } from 'vitest';
import { BAR, HOME, OPP_BAR, cloneBoard, INITIAL_BOARD } from '../board';
import {
  getLegalMoves, applySingleDieMove, applyMove, hasLegalMoves, getValidSingleMoves,
} from '../moves';

/** Helper: create empty 27-element board */
function emptyBoard(): number[] {
  return new Array(27).fill(0);
}

describe('applySingleDieMove', () => {
  it('moves a checker from one point to another', () => {
    const board = emptyBoard();
    board[12] = 1;
    const result = applySingleDieMove(board, { from: 12, to: 8, die: 4 });
    expect(result[12]).toBe(0);
    expect(result[8]).toBe(1);
  });

  it('hits an opponent blot', () => {
    const board = emptyBoard();
    board[12] = 1;
    board[8] = -1; // opponent blot
    const result = applySingleDieMove(board, { from: 12, to: 8, die: 4 });
    expect(result[12]).toBe(0);
    expect(result[8]).toBe(1);     // our checker lands
    expect(result[OPP_BAR]).toBe(1); // opponent sent to bar
  });

  it('does not hit when opponent has 2+ checkers (blocked)', () => {
    // This shouldn't be called for a blocked point, but verify the move still works
    const board = emptyBoard();
    board[12] = 1;
    board[8] = -2; // opponent holds the point
    // The move engine wouldn't generate this move, but applySingleDieMove
    // just applies mechanically — it would add to the point
    const result = applySingleDieMove(board, { from: 12, to: 8, die: 4 });
    expect(result[8]).toBe(-1); // becomes -2 + 1 = -1 (not correct game logic, but mechanical)
  });

  it('enters from bar', () => {
    const board = emptyBoard();
    board[BAR] = 1;
    const result = applySingleDieMove(board, { from: BAR, to: 20, die: 4 }); // 24 - 4 = 20
    expect(result[BAR]).toBe(0);
    expect(result[20]).toBe(1);
  });

  it('bears off to HOME', () => {
    const board = emptyBoard();
    board[3] = 1;
    const result = applySingleDieMove(board, { from: 3, to: HOME, die: 4 });
    expect(result[3]).toBe(0);
    expect(result[HOME]).toBe(1);
  });

  it('enters from bar and hits opponent blot', () => {
    const board = emptyBoard();
    board[BAR] = 1;
    board[20] = -1; // opponent blot at entry point
    const result = applySingleDieMove(board, { from: BAR, to: 20, die: 4 });
    expect(result[BAR]).toBe(0);
    expect(result[20]).toBe(1);
    expect(result[OPP_BAR]).toBe(1);
  });
});

describe('getLegalMoves', () => {
  it('returns moves from the initial position', () => {
    const board = cloneBoard(INITIAL_BOARD);
    const moves = getLegalMoves(board, [3, 1]);
    expect(moves.length).toBeGreaterThan(0);
  });

  it('uses both dice when possible (must-use rule)', () => {
    const board = cloneBoard(INITIAL_BOARD);
    const moves = getLegalMoves(board, [6, 1]);
    // All moves should use 2 dice
    for (const m of moves) {
      expect(m.move.length).toBe(2);
    }
  });

  it('returns 4-move sequences for doubles', () => {
    const board = emptyBoard();
    board[23] = 2;
    board[12] = 5;
    board[7] = 3;
    board[5] = 5;
    const moves = getLegalMoves(board, [1, 1, 1, 1]);
    // Should be able to use all 4 dice
    expect(moves.length).toBeGreaterThan(0);
    expect(moves[0].move.length).toBe(4);
  });

  it('returns empty array when no legal moves', () => {
    const board = emptyBoard();
    board[BAR] = 1;
    // Opponent holds all entry points for dice [1,2]
    board[23] = -2; // die 1 entry
    board[22] = -2; // die 2 entry
    const moves = getLegalMoves(board, [1, 2]);
    expect(moves.length).toBe(0);
  });

  it('forces bar entry before other moves', () => {
    const board = emptyBoard();
    board[BAR] = 1;
    board[5] = 5; // other checkers
    const moves = getLegalMoves(board, [3, 1]);
    // Every move must start from BAR
    for (const m of moves) {
      expect(m.move[0].from).toBe(BAR);
    }
  });

  it('prefers the larger die when only one can be used', () => {
    // Scenario: only the 6 can be used, not the 1 (or vice versa)
    // The rule says: if you can only use one die, use the larger one
    const board = emptyBoard();
    board[6] = 1; // one checker at index 6
    // Block index 5 (die 1) and index 0 (die 6 would bear off, but not all home)
    // Actually let's make it simpler: all checkers home, one on index 5
    board[5] = 14;
    board[HOME] = 0;
    // dice [6, 1]: die 6 from index 5 = bear off (5-6 < 0, but it's the highest occupied)
    // die 1 from index 6 = index 5 (stacks on the 14)
    // Actually both are usable. Let me create a real constraint.
    const board2 = emptyBoard();
    board2[0] = 1; // checker at index 0, in home
    // Die 6 from index 0: to = 0-6 = -6, bearing off. All home? Check.
    // Need all 15 checkers accounted for.
    board2[HOME] = 14;
    // Die 6: bear off from index 0 (exact would be die 1, die 6 overshoots)
    // Overshoot from index 0 with die 6: highestOccupied = 0, from(0) >= highest(0), so legal
    // Die 1: bear off from index 0 exactly
    // Both dice usable but only 1 checker, so max 1 die used
    const moves = getLegalMoves(board2, [6, 1]);
    expect(moves.length).toBeGreaterThan(0);
    // Should use die 6 (larger) since only one can be used
    expect(moves[0].move[0].die).toBe(6);
  });
});

describe('applyMove', () => {
  it('applies multiple die moves sequentially', () => {
    const board = emptyBoard();
    board[12] = 1;
    const move = [
      { from: 12, to: 8, die: 4 },
      { from: 8, to: 5, die: 3 },
    ];
    const result = applyMove(board, move);
    expect(result[12]).toBe(0);
    expect(result[8]).toBe(0);
    expect(result[5]).toBe(1);
  });
});

describe('hasLegalMoves', () => {
  it('returns true for initial position', () => {
    expect(hasLegalMoves(INITIAL_BOARD, [3, 1])).toBe(true);
  });

  it('returns false when completely blocked on bar', () => {
    const board = emptyBoard();
    board[BAR] = 1;
    board[23] = -2;
    board[22] = -2;
    expect(hasLegalMoves(board, [1, 2])).toBe(false);
  });
});

describe('getValidSingleMoves', () => {
  it('returns destinations for a specific piece', () => {
    const board = cloneBoard(INITIAL_BOARD);
    // Point 24 (index 23) has 2 player checkers
    const moves = getValidSingleMoves(board, [3, 1], 23);
    expect(moves.length).toBeGreaterThan(0);
    // Should have moves for both die values
    const dieValues = moves.map(m => m.die).sort();
    expect(dieValues).toContain(3);
    expect(dieValues).toContain(1);
  });

  it('returns empty for opponent checkers', () => {
    const board = cloneBoard(INITIAL_BOARD);
    // Index 0 has opponent checkers (-2)
    const moves = getValidSingleMoves(board, [3, 1], 0);
    expect(moves.length).toBe(0);
  });

  it('returns empty for empty points', () => {
    const board = cloneBoard(INITIAL_BOARD);
    const moves = getValidSingleMoves(board, [3, 1], 1);
    expect(moves.length).toBe(0);
  });
});

describe('bearing off', () => {
  it('allows exact bear off', () => {
    const board = emptyBoard();
    board[2] = 5;
    board[1] = 5;
    board[0] = 5;
    const moves = getLegalMoves(board, [3, 1]);
    expect(moves.length).toBeGreaterThan(0);
    // Should have a move that bears off from index 2 with die 3
    const hasBearOff = moves.some(m =>
      m.move.some(dm => dm.to === HOME)
    );
    expect(hasBearOff).toBe(true);
  });

  it('allows overshoot bear off from highest point', () => {
    const board = emptyBoard();
    board[1] = 2; // 2 checkers so both dice can be used
    board[HOME] = 13;
    // Die 6 from index 1: to = 1-6 = -5 (overshoot)
    // highestOccupied = 1, from(1) >= highest(1) = true, so legal
    // Die 1 from index 1: exact bear off
    const moves = getLegalMoves(board, [6, 1]);
    expect(moves.length).toBeGreaterThan(0);
    // Should bear off with both dice (2 die moves)
    expect(moves[0].move.length).toBe(2);
    const hasBearOff6 = moves.some(m =>
      m.move.some(dm => dm.from === 1 && dm.to === HOME && dm.die === 6)
    );
    expect(hasBearOff6).toBe(true);
  });

  it('blocks overshoot when higher point is occupied', () => {
    const board = emptyBoard();
    board[1] = 1;
    board[4] = 1; // higher point occupied
    board[HOME] = 13;
    // Die 6 from index 1: overshoot, but index 4 has a checker (higher than 1)
    // So this should NOT be allowed
    const moves = getLegalMoves(board, [6, 2]);
    const illegalBearOff = moves.some(m =>
      m.move.some(dm => dm.from === 1 && dm.to === HOME && dm.die === 6)
    );
    expect(illegalBearOff).toBe(false);
  });

  it('blocks bearing off when checkers outside home', () => {
    const board = emptyBoard();
    board[0] = 5;
    board[1] = 5;
    board[10] = 5; // outside home board
    const moves = getLegalMoves(board, [1, 2]);
    const hasBearOff = moves.some(m =>
      m.move.some(dm => dm.to === HOME)
    );
    expect(hasBearOff).toBe(false);
  });
});

describe('bar entry', () => {
  it('must enter from bar before moving other checkers', () => {
    const board = emptyBoard();
    board[BAR] = 1;
    board[5] = 14;
    const moves = getLegalMoves(board, [3, 1]);
    for (const m of moves) {
      expect(m.move[0].from).toBe(BAR);
    }
  });

  it('enters at correct point (24 - die)', () => {
    const board = emptyBoard();
    board[BAR] = 1;
    board[5] = 14;
    const moves = getLegalMoves(board, [4, 2]);
    const entryPoints = new Set(
      moves.map(m => m.move[0].to)
    );
    // Die 4: 24-4 = 20, Die 2: 24-2 = 22
    expect(entryPoints.has(20) || entryPoints.has(22)).toBe(true);
  });

  it('cannot enter on blocked point', () => {
    const board = emptyBoard();
    board[BAR] = 1;
    board[5] = 14;
    board[20] = -2; // blocks die 4 entry (24-4=20)
    const moves = getLegalMoves(board, [4, 2]);
    // No move should enter at index 20
    for (const m of moves) {
      if (m.move[0].from === BAR) {
        expect(m.move[0].to).not.toBe(20);
      }
    }
  });

  it('can enter and hit an opponent blot', () => {
    const board = emptyBoard();
    board[BAR] = 1;
    board[5] = 14;
    board[20] = -1; // opponent blot at die 4 entry
    const moves = getLegalMoves(board, [4, 2]);
    const hitsOnEntry = moves.some(m =>
      m.move[0].from === BAR && m.move[0].to === 20
    );
    expect(hitsOnEntry).toBe(true);
  });
});
