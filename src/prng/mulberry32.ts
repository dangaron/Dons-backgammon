/**
 * Mulberry32 seeded PRNG for transparent, reproducible dice rolls.
 * Seed is displayed to the user and stored with game state.
 * rollIndex is stored alongside seed so crashed games can resume exactly.
 */

export class Mulberry32 {
  private state: number;
  rollIndex: number;

  constructor(seed: number, rollIndex = 0) {
    this.state = seed >>> 0; // ensure uint32
    this.rollIndex = 0;

    // Advance to the correct position for resume
    for (let i = 0; i < rollIndex; i++) {
      this.nextFloat(); // advance state, don't record
    }
    this.rollIndex = rollIndex;
  }

  /** Returns a float in [0, 1). */
  nextFloat(): number {
    let t = (this.state + 0x6d2b79f5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0;
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61) >>> 0;
    this.state = t >>> 0;
    this.rollIndex++;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns an integer in [1, 6] (die roll). */
  rollDie(): number {
    return Math.floor(this.nextFloat() * 6) + 1;
  }

  /** Roll two dice. Returns [d1, d2]. */
  rollTwoDice(): [number, number] {
    return [this.rollDie(), this.rollDie()];
  }
}

/** Generate a random seed for a new game. */
export function generateSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

/**
 * Reconstruct full roll sequence from a seed for the "Verify this game" feature.
 * Rolls `count` dice (pairs) and returns them as [d1, d2][] array.
 */
export function reconstructRolls(seed: number, count: number): [number, number][] {
  const prng = new Mulberry32(seed, 0);
  const rolls: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(prng.rollTwoDice());
  }
  return rolls;
}
