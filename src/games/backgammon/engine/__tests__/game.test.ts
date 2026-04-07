import { describe, it, expect } from 'vitest';
import {
  createInitialGameState, rollDice, applyMoveToState,
  forcedPass, offerDouble, acceptDouble, rejectDouble,
  canOfferDouble, serializeState, deserializeState,
} from '../game';
import { HOME, OPP_BAR } from '../board';
import type { Player } from '../types';

describe('createInitialGameState', () => {
  it('creates a valid initial state', () => {
    const state = createInitialGameState();
    expect(state.board.length).toBe(27);
    expect(state.currentPlayer).toBe(0);
    expect(state.dice).toEqual([]);
    expect(state.turnPhase).toBe('opening-roll');
    expect(state.winner).toBeNull();
    expect(state.matchLength).toBe(1);
    expect(state.matchScore).toEqual([0, 0]);
    expect(state.borneOff).toEqual([0, 0]);
  });

  it('accepts custom match length', () => {
    const state = createInitialGameState(5);
    expect(state.matchLength).toBe(5);
  });
});

describe('rollDice', () => {
  it('returns two dice for non-doubles', () => {
    expect(rollDice(3, 5)).toEqual([3, 5]);
  });

  it('returns four dice for doubles', () => {
    expect(rollDice(4, 4)).toEqual([4, 4, 4, 4]);
  });
});

describe('applyMoveToState', () => {
  it('applies a move and continues turn if dice remain', () => {
    const state = createInitialGameState();
    const withDice = { ...state, dice: [3, 1], turnPhase: 'move' as const, diceRolled: true };
    // Move one checker from index 23 (point 24) by 3
    const move = [{ from: 23, to: 20, die: 3 }];
    const next = applyMoveToState(withDice, move);
    // Should still be player 0's turn with 1 die left
    expect(next.currentPlayer).toBe(0);
    expect(next.dice).toEqual([1]);
  });

  it('advances to next player when no dice remain', () => {
    const state = createInitialGameState();
    const withDice = { ...state, dice: [3, 1], turnPhase: 'move' as const, diceRolled: true };
    const move = [
      { from: 23, to: 20, die: 3 },
      { from: 20, to: 19, die: 1 },
    ];
    const next = applyMoveToState(withDice, move);
    expect(next.currentPlayer).toBe(1);
    expect(next.turnPhase).toBe('roll');
  });

  it('detects a win', () => {
    const state = createInitialGameState();
    // Set up a board where bearing off one checker wins
    const board = new Array(27).fill(0);
    board[0] = 1;
    board[HOME] = 14;
    const winState = {
      ...state,
      board,
      dice: [1],
      turnPhase: 'move' as const,
      diceRolled: true,
    };
    const move = [{ from: 0, to: HOME, die: 1 }];
    const next = applyMoveToState(winState, move);
    expect(next.turnPhase).toBe('game-over');
    expect(next.winner).toBe(0);
    expect(next.matchScore[0]).toBe(1); // won 1 point (cube value 1)
  });

  it('awards cube value on win', () => {
    const state = createInitialGameState();
    const board = new Array(27).fill(0);
    board[0] = 1;
    board[HOME] = 14;
    const winState = {
      ...state,
      board,
      dice: [1],
      turnPhase: 'move' as const,
      diceRolled: true,
      doublingCube: { value: 4, owner: 0 as Player, offeredBy: null },
    };
    const move = [{ from: 0, to: HOME, die: 1 }];
    const next = applyMoveToState(winState, move);
    expect(next.matchScore[0]).toBe(4); // cube value
  });
});

describe('forcedPass', () => {
  it('switches to the next player', () => {
    const state = createInitialGameState();
    const withDice = { ...state, dice: [3, 1], turnPhase: 'move' as const };
    const next = forcedPass(withDice);
    expect(next.currentPlayer).toBe(1);
    expect(next.turnPhase).toBe('roll');
  });
});

describe('doubling cube', () => {
  it('can offer double from roll phase', () => {
    const state = createInitialGameState();
    const rollState = { ...state, turnPhase: 'roll' as const };
    expect(canOfferDouble(rollState)).toBe(true);
  });

  it('cannot offer double from move phase', () => {
    const state = createInitialGameState();
    const moveState = { ...state, turnPhase: 'move' as const };
    expect(canOfferDouble(moveState)).toBe(false);
  });

  it('cannot offer double if opponent owns the cube', () => {
    const state = createInitialGameState();
    const cubeState = {
      ...state,
      turnPhase: 'roll' as const,
      doublingCube: { value: 2, owner: 1 as const, offeredBy: null },
    };
    expect(canOfferDouble(cubeState)).toBe(false);
  });

  it('offerDouble changes phase to double-offered', () => {
    const state = { ...createInitialGameState(), turnPhase: 'roll' as const };
    const offered = offerDouble(state);
    expect(offered.turnPhase).toBe('double-offered');
    expect(offered.doublingCube.offeredBy).toBe(0);
  });

  it('acceptDouble doubles the cube value', () => {
    const offered = {
      ...createInitialGameState(),
      turnPhase: 'double-offered' as const,
      doublingCube: { value: 2, owner: null, offeredBy: 0 as const },
    };
    const accepted = acceptDouble(offered);
    expect(accepted.doublingCube.value).toBe(4);
    expect(accepted.doublingCube.owner).toBe(0); // acceptor owns it
    expect(accepted.turnPhase).toBe('roll');
  });

  it('rejectDouble ends the game with offerer winning', () => {
    const offered = {
      ...createInitialGameState(),
      turnPhase: 'double-offered' as const,
      doublingCube: { value: 2, owner: null, offeredBy: 0 as const },
    };
    const rejected = rejectDouble(offered);
    expect(rejected.turnPhase).toBe('game-over');
    expect(rejected.winner).toBe(0);
    expect(rejected.matchScore[0]).toBe(2); // current cube value
  });
});

describe('serialize / deserialize', () => {
  it('round-trips a game state', () => {
    const state = createInitialGameState(3);
    const json = serializeState(state);
    const restored = deserializeState(json);
    expect(restored).not.toBeNull();
    expect(restored!.board.length).toBe(27);
    expect(restored!.matchLength).toBe(3);
    expect(restored!.currentPlayer).toBe(0);
  });

  it('handles legacy 26-element boards', () => {
    const state = createInitialGameState();
    state.board.pop(); // remove OPP_BAR to simulate legacy
    const json = serializeState(state);
    const restored = deserializeState(json);
    expect(restored).not.toBeNull();
    expect(restored!.board.length).toBe(27);
    expect(restored!.board[OPP_BAR]).toBe(0);
  });

  it('returns null for invalid JSON', () => {
    expect(deserializeState('not json')).toBeNull();
  });

  it('returns null for wrong board length', () => {
    const state = createInitialGameState();
    state.board.push(0, 0); // 29 elements
    expect(deserializeState(serializeState(state))).toBeNull();
  });
});

describe('turn advancement preserves borne-off counts', () => {
  it('saves and restores borne-off across turn flip', () => {
    const state = createInitialGameState();
    // Player 0 has borne off 3 checkers
    const board = new Array(27).fill(0);
    board[5] = 5;
    board[3] = 4;
    board[1] = 3;
    board[HOME] = 3;
    // Opponent setup (negative)
    board[18] = -5;
    board[20] = -5;
    board[22] = -5;

    const gameState = {
      ...state,
      board,
      dice: [],
      turnPhase: 'move' as const,
      borneOff: [3, 0] as [number, number],
    };

    const next = forcedPass(gameState);
    // After flip, it's player 1's turn
    expect(next.currentPlayer).toBe(1);
    // Player 0's borne-off should be saved
    expect(next.borneOff[0]).toBe(3);
    // Player 1's borne-off should be loaded into HOME
    expect(next.board[HOME]).toBe(0);
  });
});
