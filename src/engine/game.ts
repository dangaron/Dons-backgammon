/**
 * Game state management. No UI imports.
 */
import type { GameState, Move, Player } from './types';
import { INITIAL_BOARD, HOME, cloneBoard, flipBoard, hasWon } from './board';
import { applyMove, hasLegalMoves } from './moves';

export function createInitialGameState(matchLength = 1): GameState {
  const board = cloneBoard(INITIAL_BOARD);
  board[HOME] = 0; // player 0 starts with 0 borne off
  return {
    board,
    currentPlayer: 0,
    dice: [],
    diceRolled: false,
    turnPhase: 'roll',
    winner: null,
    doublingCube: { value: 1, owner: null, offeredBy: null },
    borneOff: [0, 0],
    matchScore: [0, 0],
    matchLength,
  };
}

/** Roll dice, returning dice array (doubles = 4 copies). */
export function rollDice(d1: number, d2: number): number[] {
  if (d1 === d2) return [d1, d1, d1, d1];
  return [d1, d2];
}

/**
 * Apply a move to game state, advancing to next player when turn is done.
 * Immutable — returns new GameState.
 */
export function applyMoveToState(state: GameState, move: Move): GameState {
  const newBoard = applyMove(state.board, move);
  const diceUsed = move.length;
  const newDice = state.dice.slice(diceUsed);

  // Update live borne-off count in board[HOME] (applyMove tracks it)
  // borneOff persists in state.borneOff across turns

  // Check for win
  if (hasWon(newBoard)) {
    const cubeValue = state.doublingCube.value;
    const newMatchScore: [number, number] = [...state.matchScore];
    newMatchScore[state.currentPlayer] += cubeValue;
    return {
      ...state,
      board: newBoard,
      dice: [],
      turnPhase: 'game-over',
      winner: state.currentPlayer,
      matchScore: newMatchScore,
    };
  }

  // If dice remain and player can use them, continue their turn
  if (newDice.length > 0 && hasLegalMoves(newBoard, newDice)) {
    return { ...state, board: newBoard, dice: newDice, diceRolled: true };
  }

  // Turn over: switch to opponent
  return advanceToNextPlayer({ ...state, board: newBoard, dice: [], diceRolled: false });
}

/**
 * Advance to the next player's turn.
 * Saves current player's borne-off count, flips the board, restores next player's count.
 */
function advanceToNextPlayer(state: GameState): GameState {
  // Save current player's live borne-off count
  const newBorneOff: [number, number] = [state.borneOff[0], state.borneOff[1]];
  newBorneOff[state.currentPlayer] = state.board[HOME];

  // Flip board (points + bar), HOME becomes 0 temporarily
  const flipped = flipBoard(state.board);

  const nextPlayer: Player = state.currentPlayer === 0 ? 1 : 0;

  // Restore next player's borne-off count into board[HOME]
  flipped[HOME] = newBorneOff[nextPlayer];

  return {
    ...state,
    board: flipped,
    currentPlayer: nextPlayer,
    borneOff: newBorneOff,
    dice: [],
    diceRolled: false,
    turnPhase: 'roll',
  };
}

/** Forced pass: no legal moves available, skip to next player. */
export function forcedPass(state: GameState): GameState {
  return advanceToNextPlayer(state);
}

/** Offer the doubling cube. */
export function offerDouble(state: GameState): GameState {
  return {
    ...state,
    turnPhase: 'double-offered',
    doublingCube: { ...state.doublingCube, offeredBy: state.currentPlayer },
  };
}

/** Accept the double: stakes double, opponent now owns the cube. */
export function acceptDouble(state: GameState): GameState {
  return {
    ...state,
    turnPhase: 'roll',
    doublingCube: {
      value: state.doublingCube.value * 2,
      owner: state.currentPlayer,
      offeredBy: null,
    },
  };
}

/** Reject the double: offerer wins at current stake. */
export function rejectDouble(state: GameState): GameState {
  const offerer = state.doublingCube.offeredBy;
  const cubeValue = state.doublingCube.value;
  const newMatchScore: [number, number] = [...state.matchScore];
  if (offerer !== null) newMatchScore[offerer] += cubeValue;
  return {
    ...state,
    turnPhase: 'game-over',
    winner: offerer,
    matchScore: newMatchScore,
  };
}

/** Can current player offer the doubling cube? */
export function canOfferDouble(state: GameState): boolean {
  if (state.turnPhase !== 'roll') return false;
  const { owner } = state.doublingCube;
  return owner === null || owner === state.currentPlayer;
}

export function serializeState(state: GameState): string {
  return JSON.stringify(state);
}

export function deserializeState(raw: string): GameState | null {
  try {
    const parsed = JSON.parse(raw) as GameState;
    // Accept both 26-element (legacy) and 27-element boards
    if (!Array.isArray(parsed.board)) return null;
    if (parsed.board.length === 26) parsed.board.push(0); // add OPP_BAR
    if (parsed.board.length !== 27) return null;
    if (!Array.isArray(parsed.dice)) return null;
    // Ensure new fields exist (handle saved states from older versions)
    if (!Array.isArray(parsed.borneOff)) parsed.borneOff = [0, 0];
    if (!Array.isArray(parsed.matchScore)) parsed.matchScore = [0, 0];
    if (!parsed.matchLength) parsed.matchLength = 1;
    return parsed;
  } catch {
    return null;
  }
}
