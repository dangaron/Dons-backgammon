/**
 * Yahtzee AI Web Worker.
 * Receives game state, returns AI decision (hold pattern or category to score).
 */

import { getAIDecision, type AIDecision } from '../engine/ai';
import type { YahtzeeState } from '../engine/types';

export interface YahtzeeAIRequest {
  state: YahtzeeState;
}

export interface YahtzeeAIResponse {
  decision: AIDecision;
}

self.onmessage = (e: MessageEvent<YahtzeeAIRequest>) => {
  const { state } = e.data;
  const decision = getAIDecision(state);
  (self as unknown as Worker).postMessage({ decision } satisfies YahtzeeAIResponse);
};
