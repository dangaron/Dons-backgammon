/**
 * Tests for tournament bracket generation and advancement.
 */

import { describe, it, expect } from 'vitest';
import { generateBracket, advanceWinner, getBracketState } from '../tournament';

describe('generateBracket', () => {
  it('creates a bracket for 2 players', () => {
    const bracket = generateBracket(['p1', 'p2']);
    expect(bracket.rounds).toBe(1);
    expect(bracket.playerCount).toBe(2);
    expect(bracket.matches).toHaveLength(1);
    expect(bracket.matches[0].player1).toBe('p1');
    expect(bracket.matches[0].player2).toBe('p2');
  });

  it('creates a bracket for 4 players', () => {
    const bracket = generateBracket(['p1', 'p2', 'p3', 'p4']);
    expect(bracket.rounds).toBe(2);
    expect(bracket.matches).toHaveLength(3); // 2 semis + 1 final
  });

  it('creates a bracket for 8 players', () => {
    const bracket = generateBracket(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']);
    expect(bracket.rounds).toBe(3);
    expect(bracket.matches).toHaveLength(7); // 4 + 2 + 1
  });

  it('handles 3 players with a bye', () => {
    const bracket = generateBracket(['p1', 'p2', 'p3']);
    expect(bracket.rounds).toBe(2);
    // One player gets a bye (auto-advance in round 1)
    const byeMatches = bracket.matches.filter(m => m.round === 1 && m.winner != null);
    expect(byeMatches.length).toBeGreaterThanOrEqual(1);
  });

  it('throws for fewer than 2 players', () => {
    expect(() => generateBracket(['p1'])).toThrow();
    expect(() => generateBracket([])).toThrow();
  });

  it('assigns unique match IDs', () => {
    const bracket = generateBracket(['p1', 'p2', 'p3', 'p4']);
    const ids = bracket.matches.map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('advanceWinner', () => {
  it('sets winner on the match', () => {
    const bracket = generateBracket(['p1', 'p2', 'p3', 'p4']);
    const semi1 = bracket.matches.find(m => m.round === 1 && m.position === 0)!;
    const updated = advanceWinner(bracket, semi1.id, 'p1');
    const match = updated.matches.find(m => m.id === semi1.id)!;
    expect(match.winner).toBe('p1');
  });

  it('populates the next round match', () => {
    const bracket = generateBracket(['p1', 'p2', 'p3', 'p4']);
    const semi1 = bracket.matches.find(m => m.round === 1 && m.position === 0)!;
    const updated = advanceWinner(bracket, semi1.id, 'p1');
    const final = updated.matches.find(m => m.round === 2)!;
    expect(final.player1).toBe('p1');
  });

  it('both semis advance to final', () => {
    let bracket = generateBracket(['p1', 'p2', 'p3', 'p4']);
    const semi1 = bracket.matches.find(m => m.round === 1 && m.position === 0)!;
    const semi2 = bracket.matches.find(m => m.round === 1 && m.position === 1)!;
    bracket = advanceWinner(bracket, semi1.id, 'p1');
    bracket = advanceWinner(bracket, semi2.id, 'p4');
    const final = bracket.matches.find(m => m.round === 2)!;
    expect(final.player1).toBe('p1');
    expect(final.player2).toBe('p4');
  });
});

describe('getBracketState', () => {
  it('reports incomplete bracket', () => {
    const bracket = generateBracket(['p1', 'p2', 'p3', 'p4']);
    const state = getBracketState(bracket);
    expect(state.completed).toBe(false);
    expect(state.champion).toBeNull();
    expect(state.activeMatches.length).toBeGreaterThan(0);
  });

  it('reports completed bracket with champion', () => {
    let bracket = generateBracket(['p1', 'p2', 'p3', 'p4']);
    const semi1 = bracket.matches.find(m => m.round === 1 && m.position === 0)!;
    const semi2 = bracket.matches.find(m => m.round === 1 && m.position === 1)!;
    bracket = advanceWinner(bracket, semi1.id, 'p1');
    bracket = advanceWinner(bracket, semi2.id, 'p3');
    const final = bracket.matches.find(m => m.round === 2)!;
    bracket = advanceWinner(bracket, final.id, 'p1');

    const state = getBracketState(bracket);
    expect(state.completed).toBe(true);
    expect(state.champion).toBe('p1');
    expect(state.activeMatches).toHaveLength(0);
  });
});
