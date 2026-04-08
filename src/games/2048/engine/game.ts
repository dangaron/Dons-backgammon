/**
 * 2048 engine. Pure TypeScript, no UI imports.
 */

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Game2048State {
  grid: number[][]; // 4x4, 0 = empty, otherwise power of 2
  score: number;
  bestScore: number;
  gameOver: boolean;
  won: boolean;
  moved: boolean; // whether last slide actually moved anything
}

function emptyGrid(): number[][] {
  return Array.from({ length: 4 }, () => Array(4).fill(0));
}

function cloneGrid(g: number[][]): number[][] {
  return g.map(row => [...row]);
}

function getEmptyCells(grid: number[][]): Array<[number, number]> {
  const empty: Array<[number, number]> = [];
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      if (grid[r][c] === 0) empty.push([r, c]);
  return empty;
}

function addRandomTile(grid: number[][]): number[][] {
  const empty = getEmptyCells(grid);
  if (empty.length === 0) return grid;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const g = cloneGrid(grid);
  g[r][c] = Math.random() < 0.9 ? 2 : 4;
  return g;
}

function slideRow(row: number[]): { result: number[]; score: number; moved: boolean } {
  // Remove zeros, merge adjacent equals, pad with zeros
  const filtered = row.filter(v => v !== 0);
  const result: number[] = [];
  let score = 0;
  let i = 0;
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      const merged = filtered[i] * 2;
      result.push(merged);
      score += merged;
      i += 2;
    } else {
      result.push(filtered[i]);
      i++;
    }
  }
  while (result.length < 4) result.push(0);
  const moved = row.some((v, idx) => v !== result[idx]);
  return { result, score, moved };
}

function rotateGrid(grid: number[][]): number[][] {
  // Rotate 90 degrees clockwise
  const n = grid.length;
  const result = emptyGrid();
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      result[c][n - 1 - r] = grid[r][c];
  return result;
}

export function createGame(): Game2048State {
  let grid = emptyGrid();
  grid = addRandomTile(grid);
  grid = addRandomTile(grid);
  const bestScore = loadBestScore();
  return { grid, score: 0, bestScore, gameOver: false, won: false, moved: false };
}

export function slide(state: Game2048State, direction: Direction): Game2048State {
  if (state.gameOver) return state;

  let grid = cloneGrid(state.grid);
  let totalScore = 0;
  let anyMoved = false;

  // Normalize: rotate so we always slide left, then rotate back
  const rotations: Record<Direction, number> = { left: 0, up: 1, right: 2, down: 3 };
  const rot = rotations[direction];

  for (let i = 0; i < rot; i++) grid = rotateGrid(grid);

  // Slide each row left
  for (let r = 0; r < 4; r++) {
    const { result, score, moved } = slideRow(grid[r]);
    grid[r] = result;
    totalScore += score;
    if (moved) anyMoved = true;
  }

  // Rotate back
  for (let i = 0; i < (4 - rot) % 4; i++) grid = rotateGrid(grid);

  if (!anyMoved) return { ...state, moved: false };

  grid = addRandomTile(grid);
  const newScore = state.score + totalScore;
  const bestScore = Math.max(state.bestScore, newScore);

  // Check for 2048 tile
  let won = state.won;
  for (const row of grid) for (const v of row) if (v >= 2048) won = true;

  // Check game over (no moves possible)
  const gameOver = !canMove(grid);

  if (bestScore > state.bestScore) saveBestScore(bestScore);

  return { grid, score: newScore, bestScore, gameOver, won, moved: true };
}

function canMove(grid: number[][]): boolean {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (grid[r][c] === 0) return true;
      if (c < 3 && grid[r][c] === grid[r][c + 1]) return true;
      if (r < 3 && grid[r][c] === grid[r + 1][c]) return true;
    }
  }
  return false;
}

const BEST_KEY = '2048-best-score';

function loadBestScore(): number {
  try { return parseInt(localStorage.getItem(BEST_KEY) || '0') || 0; } catch { return 0; }
}

function saveBestScore(score: number) {
  try { localStorage.setItem(BEST_KEY, String(score)); } catch { /* ignore */ }
}
