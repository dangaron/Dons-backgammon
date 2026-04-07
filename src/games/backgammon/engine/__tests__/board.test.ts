import { describe, it, expect } from 'vitest';
import {
  INITIAL_BOARD, BAR, HOME, OPP_BAR,
  cloneBoard, flipBoard, unflopBoard, allCheckersHome,
  pipCount, opponentPipCount, boardKey, hasWon,
} from '../board';

describe('board utilities', () => {
  describe('INITIAL_BOARD', () => {
    it('has 27 elements', () => {
      expect(INITIAL_BOARD.length).toBe(27);
    });

    it('has 15 checkers per player', () => {
      let player = 0, opponent = 0;
      for (let i = 0; i < 24; i++) {
        if (INITIAL_BOARD[i] > 0) player += INITIAL_BOARD[i];
        if (INITIAL_BOARD[i] < 0) opponent -= INITIAL_BOARD[i];
      }
      expect(player).toBe(15);
      expect(opponent).toBe(15);
    });

    it('has empty bar and home', () => {
      expect(INITIAL_BOARD[BAR]).toBe(0);
      expect(INITIAL_BOARD[HOME]).toBe(0);
      expect(INITIAL_BOARD[OPP_BAR]).toBe(0);
    });
  });

  describe('cloneBoard', () => {
    it('creates a copy that does not share references', () => {
      const board = cloneBoard(INITIAL_BOARD);
      board[0] = 99;
      expect(INITIAL_BOARD[0]).toBe(-2);
    });
  });

  describe('flipBoard', () => {
    it('mirrors and negates points', () => {
      const board = new Array(27).fill(0);
      board[0] = 3;   // player has 3 at index 0
      board[23] = -2;  // opponent has 2 at index 23

      const flipped = flipBoard(board);
      // index 0 → index 23, negated: -3
      expect(flipped[23]).toBe(-3);
      // index 23 → index 0, negated: 2
      expect(flipped[0]).toBe(2);
    });

    it('swaps BAR and OPP_BAR', () => {
      const board = new Array(27).fill(0);
      board[BAR] = 2;     // current player has 2 on bar
      board[OPP_BAR] = 1; // opponent has 1 on bar

      const flipped = flipBoard(board);
      expect(flipped[BAR]).toBe(1);     // opponent's bar becomes current player's
      expect(flipped[OPP_BAR]).toBe(2); // current player's bar becomes opponent's
    });

    it('sets HOME to 0 (caller manages)', () => {
      const board = new Array(27).fill(0);
      board[HOME] = 5;
      const flipped = flipBoard(board);
      expect(flipped[HOME]).toBe(0);
    });

    it('double flip returns to original (for points)', () => {
      const original = cloneBoard(INITIAL_BOARD);
      const flipped = flipBoard(original);
      const back = flipBoard(flipped);
      // Points should match (HOME is zeroed by design, so skip that)
      for (let i = 0; i < 24; i++) {
        expect(back[i]).toBe(original[i]);
      }
    });
  });

  describe('unflopBoard', () => {
    it('reverses flipBoard for points', () => {
      const original = cloneBoard(INITIAL_BOARD);
      const flipped = flipBoard(original);
      const unflipped = unflopBoard(flipped);
      for (let i = 0; i < 24; i++) {
        expect(unflipped[i]).toBe(original[i]);
      }
    });
  });

  describe('allCheckersHome', () => {
    it('returns false for initial board', () => {
      expect(allCheckersHome(INITIAL_BOARD)).toBe(false);
    });

    it('returns true when all checkers in home board', () => {
      const board = new Array(27).fill(0);
      board[0] = 5;
      board[1] = 5;
      board[2] = 5;
      expect(allCheckersHome(board)).toBe(true);
    });

    it('returns false if a checker is on bar', () => {
      const board = new Array(27).fill(0);
      board[0] = 14;
      board[BAR] = 1;
      expect(allCheckersHome(board)).toBe(false);
    });

    it('returns false if a checker is outside home', () => {
      const board = new Array(27).fill(0);
      board[0] = 14;
      board[6] = 1; // outside home (index 6+)
      expect(allCheckersHome(board)).toBe(false);
    });
  });

  describe('pipCount', () => {
    it('counts distance for all player checkers', () => {
      const board = new Array(27).fill(0);
      board[0] = 1; // 1 checker at index 0 = 1 pip
      board[5] = 1; // 1 checker at index 5 = 6 pips
      expect(pipCount(board)).toBe(7);
    });

    it('includes bar checkers at 25 pips each', () => {
      const board = new Array(27).fill(0);
      board[BAR] = 2;
      expect(pipCount(board)).toBe(50);
    });
  });

  describe('opponentPipCount', () => {
    it('counts distance for opponent checkers', () => {
      const board = new Array(27).fill(0);
      board[23] = -1; // opponent at index 23 = 24-23 = 1 pip
      board[0] = -1;  // opponent at index 0 = 24-0 = 24 pips
      expect(opponentPipCount(board)).toBe(25);
    });

    it('includes OPP_BAR at 25 pips each', () => {
      const board = new Array(27).fill(0);
      board[OPP_BAR] = 3;
      expect(opponentPipCount(board)).toBe(75);
    });
  });

  describe('hasWon', () => {
    it('returns false when HOME < 15', () => {
      const board = new Array(27).fill(0);
      board[HOME] = 14;
      expect(hasWon(board)).toBe(false);
    });

    it('returns true when HOME >= 15', () => {
      const board = new Array(27).fill(0);
      board[HOME] = 15;
      expect(hasWon(board)).toBe(true);
    });
  });

  describe('boardKey', () => {
    it('produces same key for identical boards', () => {
      const a = cloneBoard(INITIAL_BOARD);
      const b = cloneBoard(INITIAL_BOARD);
      expect(boardKey(a)).toBe(boardKey(b));
    });

    it('produces different keys for different boards', () => {
      const a = cloneBoard(INITIAL_BOARD);
      const b = cloneBoard(INITIAL_BOARD);
      b[0] = 0;
      expect(boardKey(a)).not.toBe(boardKey(b));
    });
  });
});
