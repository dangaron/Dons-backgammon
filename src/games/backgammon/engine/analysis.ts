/**
 * Move analysis engine. Pure functions, no UI imports.
 * Compares player moves to AI best move using heuristic evaluation.
 */

import type { Board, Move } from './types';
import { chooseBestMove, evaluateBoard } from './ai';
import type { AIDifficulty } from './ai';

export type MoveRating = 'good' | 'inaccuracy' | 'mistake' | 'blunder';

export interface MoveAnalysis {
  turnNumber: number;
  player: 0 | 1;
  dice: number[];
  playerMove: Move;
  aiMove: Move | null;
  playerScore: number;
  aiScore: number;
  error: number; // aiScore - playerScore (higher = worse for player)
  rating: MoveRating;
  boardBefore: Board;
  boardAfter: Board;
}

export interface GameAnalysis {
  moves: MoveAnalysis[];
  totalError: number;
  accuracy: number; // 0-100 percentage
  blunders: number;
  mistakes: number;
  inaccuracies: number;
}

export interface MoveRecord {
  turnNumber: number;
  player: 0 | 1;
  dice: number[];
  move: Move;
  boardBefore: number[];
  boardAfter: number[];
}

function rateError(error: number): MoveRating {
  if (error < 5) return 'good';
  if (error < 20) return 'inaccuracy';
  if (error < 50) return 'mistake';
  return 'blunder';
}

/**
 * Analyze a single move: compare player's move to AI's best.
 */
export function analyzeMove(
  boardBefore: Board,
  dice: number[],
  playerMove: Move,
  boardAfter: Board,
  turnNumber: number,
  player: 0 | 1,
  difficulty: AIDifficulty = 'medium',
): MoveAnalysis {
  const { move: aiLegalMove, score: aiScore } = chooseBestMove(boardBefore, dice, 100, difficulty);
  const playerScore = evaluateBoard(boardAfter, difficulty);
  const error = Math.max(0, aiScore - playerScore);

  return {
    turnNumber,
    player,
    dice: [...dice],
    playerMove,
    aiMove: aiLegalMove?.move ?? null,
    playerScore,
    aiScore,
    error,
    rating: rateError(error),
    boardBefore: [...boardBefore],
    boardAfter: [...boardAfter],
  };
}

/**
 * Analyze an entire game from move records.
 */
export function analyzeGame(
  moveRecords: MoveRecord[],
  difficulty: AIDifficulty = 'medium',
): GameAnalysis {
  const moves: MoveAnalysis[] = [];
  let totalError = 0;
  let blunders = 0;
  let mistakes = 0;
  let inaccuracies = 0;

  for (const record of moveRecords) {
    const analysis = analyzeMove(
      record.boardBefore as Board,
      record.dice,
      record.move,
      record.boardAfter as Board,
      record.turnNumber,
      record.player,
      difficulty,
    );
    moves.push(analysis);
    totalError += analysis.error;

    switch (analysis.rating) {
      case 'blunder': blunders++; break;
      case 'mistake': mistakes++; break;
      case 'inaccuracy': inaccuracies++; break;
    }
  }

  const goodMoves = moves.filter(m => m.rating === 'good').length;
  const accuracy = moves.length > 0 ? Math.round((goodMoves / moves.length) * 100) : 100;

  return { moves, totalError, accuracy, blunders, mistakes, inaccuracies };
}
