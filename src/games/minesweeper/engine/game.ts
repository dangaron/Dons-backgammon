/**
 * Minesweeper engine. Pure TypeScript, no UI imports.
 */

export interface Cell {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacent: number;
}

export interface MinesweeperState {
  grid: Cell[][];
  width: number;
  height: number;
  mines: number;
  revealed: number;
  flagged: number;
  gameOver: boolean;
  won: boolean;
  started: boolean;
  startTime: number;
}

export type Difficulty = 'beginner' | 'intermediate' | 'expert';

export const PRESETS: Record<Difficulty, { width: number; height: number; mines: number }> = {
  beginner: { width: 9, height: 9, mines: 10 },
  intermediate: { width: 16, height: 16, mines: 40 },
  expert: { width: 30, height: 16, mines: 99 },
};

function emptyGrid(w: number, h: number): Cell[][] {
  return Array.from({ length: h }, () =>
    Array.from({ length: w }, () => ({
      mine: false, revealed: false, flagged: false, adjacent: 0,
    }))
  );
}

function placeMines(grid: Cell[][], mines: number, safeX: number, safeY: number) {
  const h = grid.length;
  const w = grid[0].length;
  let placed = 0;
  while (placed < mines) {
    const x = Math.floor(Math.random() * w);
    const y = Math.floor(Math.random() * h);
    // Don't place on the first-click cell or its neighbors
    if (Math.abs(x - safeX) <= 1 && Math.abs(y - safeY) <= 1) continue;
    if (grid[y][x].mine) continue;
    grid[y][x].mine = true;
    placed++;
  }
}

function countAdjacent(grid: Cell[][]) {
  const h = grid.length;
  const w = grid[0].length;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (grid[y][x].mine) continue;
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dy === 0 && dx === 0) continue;
          const ny = y + dy, nx = x + dx;
          if (ny >= 0 && ny < h && nx >= 0 && nx < w && grid[ny][nx].mine) count++;
        }
      }
      grid[y][x].adjacent = count;
    }
  }
}

export function createGame(difficulty: Difficulty = 'beginner'): MinesweeperState {
  const { width, height, mines } = PRESETS[difficulty];
  return {
    grid: emptyGrid(width, height),
    width, height, mines,
    revealed: 0, flagged: 0,
    gameOver: false, won: false,
    started: false, startTime: 0,
  };
}

export function reveal(state: MinesweeperState, x: number, y: number): MinesweeperState {
  if (state.gameOver || state.won) return state;
  const grid = state.grid.map(row => row.map(c => ({ ...c })));
  let { revealed, started, startTime } = state;

  // First click: place mines (guaranteed safe first click)
  if (!started) {
    placeMines(grid, state.mines, x, y);
    countAdjacent(grid);
    started = true;
    startTime = Date.now();
  }

  const cell = grid[y][x];
  if (cell.revealed || cell.flagged) return state;

  // Hit a mine
  if (cell.mine) {
    // Reveal all mines
    for (const row of grid) for (const c of row) { if (c.mine) c.revealed = true; }
    return { ...state, grid, gameOver: true, started, startTime };
  }

  // Flood fill reveal
  const stack: Array<[number, number]> = [[x, y]];
  while (stack.length > 0) {
    const [cx, cy] = stack.pop()!;
    const c = grid[cy][cx];
    if (c.revealed || c.flagged || c.mine) continue;
    c.revealed = true;
    revealed++;
    if (c.adjacent === 0) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx, ny = cy + dy;
          if (nx >= 0 && nx < state.width && ny >= 0 && ny < state.height) {
            stack.push([nx, ny]);
          }
        }
      }
    }
  }

  // Check win
  const totalSafe = state.width * state.height - state.mines;
  const won = revealed >= totalSafe;

  return { ...state, grid, revealed, won, gameOver: won, started, startTime };
}

export function toggleFlag(state: MinesweeperState, x: number, y: number): MinesweeperState {
  if (state.gameOver || state.won) return state;
  const grid = state.grid.map(row => row.map(c => ({ ...c })));
  const cell = grid[y][x];
  if (cell.revealed) return state;

  cell.flagged = !cell.flagged;
  const flagged = state.flagged + (cell.flagged ? 1 : -1);
  return { ...state, grid, flagged };
}
