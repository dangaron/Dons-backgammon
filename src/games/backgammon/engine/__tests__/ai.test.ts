/**
 * Tests for AI difficulty levels, hints, and analysis.
 */

import { describe, it, expect } from 'vitest';
import { evaluateBoard, chooseBestMove, type AIDifficulty } from '../ai';
import type { Board } from '../types';
import { HOME, BAR } from '../board';

// Helper: create an empty board
function emptyBoard(): Board {
  return new Array(27).fill(0) as Board;
}

// Helper: standard opening position
function standardBoard(): Board {
  const b = emptyBoard();
  b[23] = 2; b[12] = 5; b[7] = 3; b[5] = 5;
  b[0] = -2; b[11] = -5; b[16] = -3; b[18] = -5;
  return b;
}

describe('evaluateBoard', () => {
  it('returns higher score when player has more borne off', () => {
    const b1 = emptyBoard();
    b1[HOME] = 10;
    b1[5] = 5;
    b1[0] = -15;

    const b2 = emptyBoard();
    b2[HOME] = 5;
    b2[5] = 10;
    b2[0] = -15;

    expect(evaluateBoard(b1)).toBeGreaterThan(evaluateBoard(b2));
  });

  it('penalizes blots', () => {
    const safe = emptyBoard();
    safe[5] = 2; safe[10] = 2; safe[0] = -4;

    const blotty = emptyBoard();
    blotty[5] = 1; blotty[10] = 1; blotty[15] = 2; blotty[0] = -4;

    expect(evaluateBoard(safe)).toBeGreaterThan(evaluateBoard(blotty));
  });

  it('rewards priming', () => {
    const prime = emptyBoard();
    prime[5] = 2; prime[6] = 2; prime[7] = 2; prime[8] = 2;
    prime[9] = 2; prime[10] = 2; prime[11] = 3;
    prime[0] = -15;

    const scattered = emptyBoard();
    scattered[0] = -15;
    scattered[5] = 3; scattered[10] = 3; scattered[15] = 3;
    scattered[20] = 3; scattered[22] = 3;

    expect(evaluateBoard(prime)).toBeGreaterThan(evaluateBoard(scattered));
  });

  it('penalizes checker on bar', () => {
    const normal = emptyBoard();
    normal[5] = 2; normal[0] = -2;

    const onBar = emptyBoard();
    onBar[BAR] = 1; onBar[5] = 1; onBar[0] = -2;

    expect(evaluateBoard(normal)).toBeGreaterThan(evaluateBoard(onBar));
  });

  it('accepts difficulty parameter', () => {
    const b = standardBoard();
    const difficulties: AIDifficulty[] = ['easy', 'medium', 'hard', 'expert'];
    for (const d of difficulties) {
      const score = evaluateBoard(b, d);
      expect(typeof score).toBe('number');
      expect(isFinite(score)).toBe(true);
    }
  });

  it('hard difficulty gives higher weights (more extreme scores)', () => {
    const b = emptyBoard();
    b[BAR] = 2; // Bad position with checkers on bar
    b[0] = -2;
    const medScore = evaluateBoard(b, 'medium');
    const hardScore = evaluateBoard(b, 'hard');
    // Hard should penalize bar more severely
    expect(hardScore).toBeLessThan(medScore);
  });
});

describe('chooseBestMove', () => {
  it('returns null for no legal moves', () => {
    const b = emptyBoard();
    b[HOME] = 15;
    const result = chooseBestMove(b, [3, 4]);
    expect(result.move).toBeNull();
  });

  it('returns a valid move with score', () => {
    const b = standardBoard();
    const result = chooseBestMove(b, [3, 1], 100, 'medium');
    expect(result.move).not.toBeNull();
    expect(typeof result.score).toBe('number');
    expect(result.move!.move.length).toBeGreaterThan(0);
  });

  it('easy mode returns a move (possibly suboptimal)', () => {
    const b = standardBoard();
    const result = chooseBestMove(b, [6, 5], 50, 'easy');
    expect(result.move).not.toBeNull();
  });

  it('expert mode returns a move (2-ply)', () => {
    const b = standardBoard();
    const result = chooseBestMove(b, [3, 1], 500, 'expert');
    expect(result.move).not.toBeNull();
    expect(typeof result.score).toBe('number');
  });

  it('all difficulties produce valid moves for standard opening', () => {
    const b = standardBoard();
    const dice = [6, 4];
    for (const d of ['easy', 'medium', 'hard', 'expert'] as AIDifficulty[]) {
      const result = chooseBestMove(b, dice, 200, d);
      expect(result.move).not.toBeNull();
      expect(result.move!.resultBoard).toBeDefined();
    }
  });
});
