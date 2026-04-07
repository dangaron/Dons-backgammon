/**
 * AI Web Worker.
 * Receives: { board: number[], dice: number[] }
 * Responds: { move: Move[] } or { error: string }
 *
 * Runs on a separate thread — never blocks the main thread.
 */

import { chooseBestMove } from '../engine/ai';
import type { Board, Move } from '../engine/types';

export interface AIRequest {
  board: Board;
  dice: number[];
}

export interface AIResponse {
  move: Move | null;
  error?: string;
}

self.onmessage = (e: MessageEvent<AIRequest>) => {
  try {
    const { board, dice } = e.data;
    const result = chooseBestMove(board, dice, 50);
    const response: AIResponse = {
      move: result?.move ?? null,
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
