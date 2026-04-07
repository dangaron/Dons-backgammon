/**
 * Tests for ELO rating calculations.
 */

import { describe, it, expect } from 'vitest';
import { expectedScore, getKFactor, calculateElo } from '../elo';

describe('expectedScore', () => {
  it('returns 0.5 for equal ratings', () => {
    expect(expectedScore(1500, 1500)).toBeCloseTo(0.5);
  });

  it('returns higher expectation for higher-rated player', () => {
    expect(expectedScore(1800, 1500)).toBeGreaterThan(0.5);
  });

  it('returns lower expectation for lower-rated player', () => {
    expect(expectedScore(1200, 1500)).toBeLessThan(0.5);
  });

  it('returns value between 0 and 1', () => {
    expect(expectedScore(2500, 800)).toBeGreaterThan(0);
    expect(expectedScore(2500, 800)).toBeLessThan(1);
    expect(expectedScore(800, 2500)).toBeGreaterThan(0);
    expect(expectedScore(800, 2500)).toBeLessThan(1);
  });

  it('is symmetric: E(A vs B) + E(B vs A) = 1', () => {
    const ea = expectedScore(1600, 1400);
    const eb = expectedScore(1400, 1600);
    expect(ea + eb).toBeCloseTo(1);
  });
});

describe('getKFactor', () => {
  it('returns 40 for placement games (< 20 rated games)', () => {
    expect(getKFactor(0, 1500)).toBe(40);
    expect(getKFactor(19, 1500)).toBe(40);
  });

  it('returns 20 for established players below 2000', () => {
    expect(getKFactor(20, 1500)).toBe(20);
    expect(getKFactor(100, 1999)).toBe(20);
  });

  it('returns 10 for players at 2000+', () => {
    expect(getKFactor(20, 2000)).toBe(10);
    expect(getKFactor(100, 2500)).toBe(10);
  });

  it('multiplies by sqrt(matchLength)', () => {
    const k1 = getKFactor(20, 1500, 1);
    const k5 = getKFactor(20, 1500, 5);
    expect(k5).toBeCloseTo(k1 * Math.sqrt(5));
  });
});

describe('calculateElo', () => {
  it('winner gains rating, loser loses', () => {
    const winResult = calculateElo(1500, 1500, 1, 30);
    expect(winResult.change).toBeGreaterThan(0);
    expect(winResult.newRating).toBeGreaterThan(1500);

    const lossResult = calculateElo(1500, 1500, 0, 30);
    expect(lossResult.change).toBeLessThan(0);
    expect(lossResult.newRating).toBeLessThan(1500);
  });

  it('upset win gives more points than expected win', () => {
    const upset = calculateElo(1200, 1800, 1, 30);
    const expected = calculateElo(1800, 1200, 1, 30);
    expect(upset.change).toBeGreaterThan(expected.change);
  });

  it('rating never goes below 100', () => {
    const result = calculateElo(100, 2500, 0, 30);
    expect(result.newRating).toBe(100);
  });

  it('placement games (< 20) have larger swings', () => {
    const placement = calculateElo(1500, 1500, 1, 5);
    const established = calculateElo(1500, 1500, 1, 30);
    expect(placement.change).toBeGreaterThan(established.change);
  });

  it('longer matches produce larger rating changes', () => {
    const short = calculateElo(1500, 1500, 1, 30, 1);
    const long = calculateElo(1500, 1500, 1, 30, 7);
    expect(long.change).toBeGreaterThan(short.change);
  });

  it('draw keeps ratings close to original', () => {
    const result = calculateElo(1500, 1500, 0.5, 30);
    expect(result.change).toBe(0);
    expect(result.newRating).toBe(1500);
  });
});
