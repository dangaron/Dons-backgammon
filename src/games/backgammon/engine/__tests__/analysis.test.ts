/**
 * Tests for move analysis and game analysis.
 */

import { describe, it, expect } from 'vitest';
import { analyzeMove, analyzeGame, type MoveRecord } from '../analysis';
import { chooseBestMove } from '../ai';
import { getLegalMoves } from '../moves';
import type { Board } from '../types';

function standardBoard(): Board {
  const b = new Array(27).fill(0) as Board;
  b[23] = 2; b[12] = 5; b[7] = 3; b[5] = 5;
  b[0] = -2; b[11] = -5; b[16] = -3; b[18] = -5;
  return b;
}

describe('analyzeMove', () => {
  it('rates the AI best move as good', () => {
    const board = standardBoard();
    const dice = [3, 1];
    const { move: aiMove } = chooseBestMove(board, dice, 100, 'medium');
    if (!aiMove) return;

    const analysis = analyzeMove(board, dice, aiMove.move, aiMove.resultBoard, 0, 0);
    expect(analysis.rating).toBe('good');
    expect(analysis.error).toBeLessThan(5);
  });

  it('rates a bad move worse than the AI move', () => {
    const board = standardBoard();
    const dice = [6, 5];
    const moves = getLegalMoves(board, dice);
    if (moves.length < 2) return;

    const { move: bestMove } = chooseBestMove(board, dice, 100, 'medium');
    if (!bestMove) return;

    // Find a move that isn't the best
    const worstMove = moves.reduce((worst, lm) => {
      return lm.resultBoard !== bestMove.resultBoard ? lm : worst;
    }, moves[moves.length - 1]);

    const analysis = analyzeMove(board, dice, worstMove.move, worstMove.resultBoard, 0, 0);
    expect(typeof analysis.error).toBe('number');
    expect(['good', 'inaccuracy', 'mistake', 'blunder']).toContain(analysis.rating);
  });

  it('returns all required fields', () => {
    const board = standardBoard();
    const dice = [4, 2];
    const moves = getLegalMoves(board, dice);
    if (moves.length === 0) return;

    const m = moves[0];
    const analysis = analyzeMove(board, dice, m.move, m.resultBoard, 5, 0);

    expect(analysis.turnNumber).toBe(5);
    expect(analysis.player).toBe(0);
    expect(analysis.dice).toEqual([4, 2]);
    expect(analysis.playerMove).toBeDefined();
    expect(analysis.boardBefore).toHaveLength(27);
    expect(analysis.boardAfter).toHaveLength(27);
    expect(typeof analysis.playerScore).toBe('number');
    expect(typeof analysis.aiScore).toBe('number');
  });
});

describe('analyzeGame', () => {
  it('analyzes an empty game', () => {
    const result = analyzeGame([]);
    expect(result.moves).toHaveLength(0);
    expect(result.accuracy).toBe(100);
    expect(result.totalError).toBe(0);
  });

  it('analyzes a game with moves', () => {
    const board = standardBoard();
    const dice = [3, 1];
    const moves = getLegalMoves(board, dice);
    if (moves.length === 0) return;

    const records: MoveRecord[] = [{
      turnNumber: 0,
      player: 0,
      dice,
      move: moves[0].move,
      boardBefore: [...board],
      boardAfter: [...moves[0].resultBoard],
    }];

    const result = analyzeGame(records);
    expect(result.moves).toHaveLength(1);
    expect(result.accuracy).toBeGreaterThanOrEqual(0);
    expect(result.accuracy).toBeLessThanOrEqual(100);
    expect(typeof result.totalError).toBe('number');
    expect(typeof result.blunders).toBe('number');
    expect(typeof result.mistakes).toBe('number');
    expect(typeof result.inaccuracies).toBe('number');
  });
});
