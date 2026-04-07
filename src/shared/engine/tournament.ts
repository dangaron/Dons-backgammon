/**
 * Tournament bracket generation. Pure functions, no UI imports.
 * Supports single-elimination brackets for any number of players.
 */

export interface BracketMatch {
  id: string;
  round: number;
  position: number;
  player1: string | null; // player ID or null (bye/TBD)
  player2: string | null;
  winner: string | null;
  gameId: string | null;
}

export interface Bracket {
  matches: BracketMatch[];
  rounds: number;
  playerCount: number;
}

/**
 * Generate a single-elimination bracket for N players.
 * Handles byes when player count isn't a power of 2.
 */
export function generateBracket(playerIds: string[]): Bracket {
  const n = playerIds.length;
  if (n < 2) throw new Error('Need at least 2 players');

  // Next power of 2
  const slots = Math.pow(2, Math.ceil(Math.log2(n)));
  const rounds = Math.log2(slots);
  /* const byes = slots - n; // available for future seeding logic */

  // Seed players (higher seeds get byes)
  const seeded = [...playerIds];
  const matches: BracketMatch[] = [];
  let matchId = 0;

  // Round 1
  const round1: BracketMatch[] = [];
  let playerIdx = 0;
  for (let i = 0; i < slots / 2; i++) {
    const p1 = playerIdx < seeded.length ? seeded[playerIdx++] : null;
    const p2 = playerIdx < seeded.length ? seeded[playerIdx++] : null;

    const match: BracketMatch = {
      id: `m${matchId++}`,
      round: 1,
      position: i,
      player1: p1,
      player2: p2,
      winner: p2 === null ? p1 : null, // Auto-advance byes
      gameId: null,
    };
    round1.push(match);
    matches.push(match);
  }

  // Subsequent rounds
  let prevRound = round1;
  for (let r = 2; r <= rounds; r++) {
    const thisRound: BracketMatch[] = [];
    for (let i = 0; i < prevRound.length / 2; i++) {
      const match: BracketMatch = {
        id: `m${matchId++}`,
        round: r,
        position: i,
        player1: null, // Filled when previous round winners are determined
        player2: null,
        winner: null,
        gameId: null,
      };
      thisRound.push(match);
      matches.push(match);
    }
    prevRound = thisRound;
  }

  return { matches, rounds, playerCount: n };
}

/**
 * Advance a winner in the bracket, updating the next round.
 */
export function advanceWinner(bracket: Bracket, matchId: string, winnerId: string): Bracket {
  const newMatches = bracket.matches.map(m => ({ ...m }));
  const match = newMatches.find(m => m.id === matchId);
  if (!match) return bracket;

  match.winner = winnerId;

  // Find the next match for this winner
  const nextRound = match.round + 1;
  if (nextRound <= bracket.rounds) {
    const nextPosition = Math.floor(match.position / 2);
    const nextMatch = newMatches.find(m => m.round === nextRound && m.position === nextPosition);
    if (nextMatch) {
      if (match.position % 2 === 0) {
        nextMatch.player1 = winnerId;
      } else {
        nextMatch.player2 = winnerId;
      }
    }
  }

  return { ...bracket, matches: newMatches };
}

/**
 * Get the current state of the bracket — who is playing, who is waiting.
 */
export function getBracketState(bracket: Bracket): {
  completed: boolean;
  champion: string | null;
  activeMatches: BracketMatch[];
  pendingMatches: BracketMatch[];
} {
  const finalMatch = bracket.matches.find(m => m.round === bracket.rounds);
  const completed = finalMatch?.winner != null;
  const champion = finalMatch?.winner ?? null;

  const activeMatches = bracket.matches.filter(
    m => m.player1 != null && m.player2 != null && m.winner == null
  );
  const pendingMatches = bracket.matches.filter(
    m => (m.player1 == null || m.player2 == null) && m.winner == null
  );

  return { completed, champion, activeMatches, pendingMatches };
}
