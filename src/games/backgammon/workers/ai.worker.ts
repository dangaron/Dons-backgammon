/**
 * AI Web Worker.
 * Receives: AIRequest with board, dice, difficulty, and optional type.
 * Responds: AIResponse with move, score, and optional error.
 *
 * Runs on a separate thread — never blocks the main thread.
 */

import { chooseBestMove, type AIDifficulty } from '../engine/ai';
import type { Board, Move } from '../engine/types';

export interface AIRequest {
  type?: 'move' | 'hint';
  board: Board;
  dice: number[];
  difficulty?: AIDifficulty;
}

export interface AIResponse {
  move: Move | null;
  score?: number;
  error?: string;
}

self.onmessage = (e: MessageEvent<AIRequest>) => {
  try {
    const { board, dice, difficulty = 'medium' } = e.data;
    const maxMs = difficulty === 'expert' ? 200 : 50;
    const result = chooseBestMove(board, dice, maxMs, difficulty);
    const response: AIResponse = {
      move: result.move?.move ?? null,
      score: result.score,
    };
    self.postMessage(response);
  } catch (err) {
    const response: AIResponse = {
      move: null,
      error: err instanceof Error ? err.message : 'Unknown AI error',
    };
    self.postMessage(response);
  }
};
