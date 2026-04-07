/**
 * ELO rating calculations. Pure functions, no UI imports.
 *
 * Standard ELO with adaptive K-factor:
 *   K=40 for first 20 games (placement)
 *   K=20 below 2000 rating
 *   K=10 at 2000+ rating
 * Match length multiplier: K * sqrt(matchLength)
 */

export interface EloResult {
  newRating: number;
  change: number;
}

/**
 * Expected score (probability of winning) based on rating difference.
 */
export function expectedScore(myRating: number, oppRating: number): number {
  return 1 / (1 + Math.pow(10, (oppRating - myRating) / 400));
}

/**
 * Get K-factor based on games played and current rating.
 */
export function getKFactor(ratedGamesPlayed: number, rating: number, matchLength: number = 1): number {
  let k: number;
  if (ratedGamesPlayed < 20) {
    k = 40; // Placement: fast calibration
  } else if (rating < 2000) {
    k = 20;
  } else {
    k = 10;
  }
  // Match length multiplier: longer matches count more
  return k * Math.sqrt(matchLength);
}

/**
 * Calculate new ELO rating after a game.
 * @param won - 1 for win, 0 for loss, 0.5 for draw
 */
export function calculateElo(
  myRating: number,
  oppRating: number,
  won: number,
  ratedGamesPlayed: number,
  matchLength: number = 1,
): EloResult {
  const expected = expectedScore(myRating, oppRating);
  const k = getKFactor(ratedGamesPlayed, myRating, matchLength);
  const change = Math.round(k * (won - expected));
  return {
    newRating: Math.max(100, myRating + change), // Floor at 100
    change,
  };
}
