/**
 * Tests for game variants.
 */

import { describe, it, expect } from 'vitest';
import { VARIANTS, hasWonVariant } from '../variants';
import { HOME } from '../board';
import type { Board } from '../types';

function emptyBoard(): Board {
  return new Array(27).fill(0) as Board;
}

describe('VARIANTS', () => {
  it('defines standard, nackgammon, and hypergammon', () => {
    expect(VARIANTS.standard).toBeDefined();
    expect(VARIANTS.nackgammon).toBeDefined();
    expect(VARIANTS.hypergammon).toBeDefined();
  });

  it('standard has 15 checkers per player', () => {
    expect(VARIANTS.standard.checkersPerPlayer).toBe(15);
    const board = VARIANTS.standard.initialBoard;
    const playerCheckers = board.slice(0, 24).filter(v => v > 0).reduce((s, v) => s + v, 0);
    expect(playerCheckers).toBe(15);
  });

  it('nackgammon has 17 checkers per player', () => {
    expect(VARIANTS.nackgammon.checkersPerPlayer).toBe(17);
    const board = VARIANTS.nackgammon.initialBoard;
    const playerCheckers = board.slice(0, 24).filter(v => v > 0).reduce((s, v) => s + v, 0);
    expect(playerCheckers).toBe(17);
  });

  it('hypergammon has 3 checkers per player', () => {
    expect(VARIANTS.hypergammon.checkersPerPlayer).toBe(3);
    const board = VARIANTS.hypergammon.initialBoard;
    const playerCheckers = board.slice(0, 24).filter(v => v > 0).reduce((s, v) => s + v, 0);
    expect(playerCheckers).toBe(3);
  });

  it('opponent checkers match player checkers in each variant', () => {
    for (const variant of Object.values(VARIANTS)) {
      const board = variant.initialBoard;
      const oppCheckers = board.slice(0, 24).filter(v => v < 0).reduce((s, v) => s + Math.abs(v), 0);
      expect(oppCheckers).toBe(variant.checkersPerPlayer);
    }
  });
});

describe('hasWonVariant', () => {
  it('returns true when all checkers borne off for standard', () => {
    const b = emptyBoard();
    b[HOME] = 15;
    expect(hasWonVariant(b, 'standard')).toBe(true);
  });

  it('returns false when not all checkers borne off for standard', () => {
    const b = emptyBoard();
    b[HOME] = 14;
    b[5] = 1;
    expect(hasWonVariant(b, 'standard')).toBe(false);
  });

  it('returns true for hypergammon with 3 borne off', () => {
    const b = emptyBoard();
    b[HOME] = 3;
    expect(hasWonVariant(b, 'hypergammon')).toBe(true);
  });

  it('returns true for nackgammon with 17 borne off', () => {
    const b = emptyBoard();
    b[HOME] = 17;
    expect(hasWonVariant(b, 'nackgammon')).toBe(true);
  });
});
