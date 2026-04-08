/**
 * Daily challenge system.
 * Selects 5 challenges per day using the date as a seed.
 * Everyone gets the same challenges on the same day.
 * Scoring: easy=100, medium=200, hard=300. Bonus for first attempt.
 * Win the day by scoring 600+ out of max possible.
 */

import { CHALLENGES } from '../../games/backgammon/engine/challenges';
import type { Challenge } from '../../games/backgammon/engine/challenges';

export interface DailyChallenge {
  challenge: Challenge;
  index: number; // position in today's set (0-4)
  points: number; // base points for this challenge
}

export interface DailyProgress {
  date: string; // YYYY-MM-DD
  scores: Record<string, { points: number; attempts: number; solved: boolean }>;
  totalScore: number;
  completed: boolean; // scored enough to "win" the day
}

const DAILY_COUNT = 5;
const WIN_THRESHOLD = 600;
const STORAGE_KEY = 'bg-daily-progress';

const DIFFICULTY_POINTS: Record<string, number> = {
  easy: 100,
  medium: 200,
  hard: 300,
};

/** Get today's date string in YYYY-MM-DD */
export function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Simple hash from date string to get a deterministic seed */
function dateSeed(dateKey: string): number {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = ((hash << 5) - hash + dateKey.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Seeded shuffle (Fisher-Yates with deterministic PRNG) */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Get today's 5 challenges */
export function getDailyChallenges(dateKey?: string): DailyChallenge[] {
  const key = dateKey || getTodayKey();
  const seed = dateSeed(key);
  const shuffled = seededShuffle(CHALLENGES, seed);

  // Pick 5: try to get a mix of difficulties
  const easy = shuffled.filter(c => c.difficulty === 'easy');
  const medium = shuffled.filter(c => c.difficulty === 'medium');
  const hard = shuffled.filter(c => c.difficulty === 'hard');

  const selected: Challenge[] = [];
  // 1 easy, 3 medium, 1 hard (or fill from what's available)
  if (easy.length > 0) selected.push(easy[0]);
  for (const m of medium) { if (selected.length < 4) selected.push(m); }
  if (hard.length > 0) selected.push(hard[0]);
  // Fill remaining from shuffled pool
  for (const c of shuffled) {
    if (selected.length >= DAILY_COUNT) break;
    if (!selected.includes(c)) selected.push(c);
  }

  return selected.slice(0, DAILY_COUNT).map((challenge, index) => ({
    challenge,
    index,
    points: DIFFICULTY_POINTS[challenge.difficulty] || 100,
  }));
}

/** Load today's progress from localStorage */
export function loadDailyProgress(): DailyProgress {
  const key = getTodayKey();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as DailyProgress;
      if (data.date === key) return data;
    }
  } catch (error) {
    console.warn('Failed to load daily challenge progress:', error);
  }
  return { date: key, scores: {}, totalScore: 0, completed: false };
}

/** Save progress to localStorage */
export function saveDailyProgress(progress: DailyProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.warn('Failed to save daily challenge progress:', error);
  }
}

/** Record a challenge result */
export function recordChallengeResult(
  challengeId: string,
  basePoints: number,
  correct: boolean
): DailyProgress {
  const progress = loadDailyProgress();
  const existing = progress.scores[challengeId];

  if (existing?.solved) return progress; // already solved, no change

  const attempts = (existing?.attempts || 0) + 1;

  if (correct) {
    // First attempt bonus: full points. Each retry loses 25%.
    const multiplier = Math.max(0.25, 1 - (attempts - 1) * 0.25);
    const points = Math.round(basePoints * multiplier);
    progress.scores[challengeId] = { points, attempts, solved: true };
  } else {
    progress.scores[challengeId] = { points: 0, attempts, solved: false };
  }

  // Recalculate total
  progress.totalScore = Object.values(progress.scores)
    .reduce((sum, s) => sum + s.points, 0);
  progress.completed = progress.totalScore >= WIN_THRESHOLD;

  saveDailyProgress(progress);
  return progress;
}

/** Get the max possible score for today */
export function getMaxScore(): number {
  return getDailyChallenges().reduce((sum, dc) => sum + dc.points, 0);
}

export const WIN_SCORE = WIN_THRESHOLD;
