/**
 * Yahtzee game state management. Pure functions, no side effects.
 */

import type { YahtzeeState, DieValue, Category, Player, PlayerState } from './types';
import { ALL_CATEGORIES } from './types';
import { scoreCategory, isYahtzeeBonus, totalScore, getAvailableCategories } from './scoring';
import { Mulberry32, generateSeed } from '../../../prng/mulberry32';

// ── State creation ─────────────────────────────────────────────────────────────

export function createInitialState(
  gameMode: 'vs-ai' | 'vs-human-local' = 'vs-ai',
  seed?: number,
): YahtzeeState {
  const gameSeed = seed ?? generateSeed();

  return {
    dice: [1, 1, 1, 1, 1],
    held: [false, false, false, false, false],
    rollsLeft: 3,
    currentPlayer: 0,
    players: [
      { scorecard: {}, yahtzeeBonusCount: 0 },
      { scorecard: {}, yahtzeeBonusCount: 0 },
    ],
    turn: 1,
    gameOver: false,
    winner: null,
    seed: gameSeed,
    rollIndex: 0,
    gameMode,
  };
}

// ── Dice rolling ───────────────────────────────────────────────────────────────

/** Roll unheld dice. Returns new state. */
export function rollDice(state: YahtzeeState): YahtzeeState {
  if (state.rollsLeft <= 0 || state.gameOver) return state;

  const rng = new Mulberry32(state.seed, state.rollIndex);
  const newDice = [...state.dice] as YahtzeeState['dice'];

  for (let i = 0; i < 5; i++) {
    if (!state.held[i]) {
      newDice[i] = rng.rollDie() as DieValue;
    }
  }

  return {
    ...state,
    dice: newDice,
    rollsLeft: state.rollsLeft - 1,
    rollIndex: rng.rollIndex,
    // On first roll of a turn, clear holds
    held: state.rollsLeft === 3 ? [false, false, false, false, false] : state.held,
  };
}

/** Toggle hold on a die. */
export function toggleHold(state: YahtzeeState, index: number): YahtzeeState {
  if (state.rollsLeft >= 3 || state.rollsLeft <= 0 || state.gameOver) return state;

  const newHeld = [...state.held] as YahtzeeState['held'];
  newHeld[index] = !newHeld[index];

  return { ...state, held: newHeld };
}

// ── Scoring ────────────────────────────────────────────────────────────────────

/** Score the current dice in a category. Advances turn. */
export function scoreInCategory(state: YahtzeeState, category: Category): YahtzeeState {
  if (state.rollsLeft >= 3 || state.gameOver) return state;

  const playerIndex = state.currentPlayer;
  const player = state.players[playerIndex];

  // Already scored this category
  if (category in player.scorecard) return state;

  const newPlayers = [
    { ...state.players[0], scorecard: { ...state.players[0].scorecard }, yahtzeeBonusCount: state.players[0].yahtzeeBonusCount },
    { ...state.players[1], scorecard: { ...state.players[1].scorecard }, yahtzeeBonusCount: state.players[1].yahtzeeBonusCount },
  ] as [PlayerState, PlayerState];

  const score = scoreCategory(category, state.dice);
  newPlayers[playerIndex].scorecard[category] = score;

  // Yahtzee bonus check
  if (isYahtzeeBonus(player, state.dice)) {
    newPlayers[playerIndex].yahtzeeBonusCount++;
  }

  // Advance to next player/turn
  return advanceTurn({ ...state, players: newPlayers });
}

/** Advance to next player or next turn. */
function advanceTurn(state: YahtzeeState): YahtzeeState {
  const nextPlayer: Player = state.currentPlayer === 0 ? 1 : 0;

  // Check if the game is over (both players have scored all 13 categories)
  const allDone = state.players.every(p =>
    ALL_CATEGORIES.every(c => c in p.scorecard)
  );

  if (allDone) {
    const score0 = totalScore(state.players[0]);
    const score1 = totalScore(state.players[1]);
    return {
      ...state,
      gameOver: true,
      winner: score0 > score1 ? 0 : score1 > score0 ? 1 : null,
      rollsLeft: 0,
      held: [false, false, false, false, false],
    };
  }

  // If we're going back to player 0, it's a new turn
  const newTurn = nextPlayer === 0 ? state.turn + 1 : state.turn;

  return {
    ...state,
    currentPlayer: nextPlayer,
    turn: newTurn,
    rollsLeft: 3,
    held: [false, false, false, false, false],
    dice: state.dice, // Keep dice visible until next roll
  };
}

// ── Serialization ──────────────────────────────────────────────────────────────

export function serializeState(state: YahtzeeState): string {
  return JSON.stringify(state);
}

export function deserializeState(raw: string): YahtzeeState | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.seed === 'number' && Array.isArray(parsed.dice)) {
      return parsed as YahtzeeState;
    }
    return null;
  } catch {
    return null;
  }
}
