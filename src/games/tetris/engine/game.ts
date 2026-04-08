/**
 * Pure-function Tetris game engine.
 * All state transitions are immutable — every function returns a new TetrisState.
 */

import type { PieceType } from './pieces';
import { rotatePiece, randomPiece } from './pieces';

export interface TetrisPiece {
  type: PieceType;
  shape: number[][];
  color: string;
}

export interface Position {
  x: number;
  y: number;
}

export interface TetrisState {
  board: (string | 0)[][];
  currentPiece: TetrisPiece;
  nextPiece: TetrisPiece;
  position: Position;
  score: number;
  level: number;
  lines: number;
  gameOver: boolean;
  paused: boolean;
}

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

function emptyBoard(): (string | 0)[][] {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    Array(BOARD_WIDTH).fill(0),
  );
}

function spawnPosition(shape: number[][]): Position {
  return {
    x: Math.floor((BOARD_WIDTH - shape[0].length) / 2),
    y: 0,
  };
}

/** Check whether the piece at `pos` fits on the board without collision. */
export function canPlace(
  board: (string | 0)[][],
  shape: number[][],
  pos: Position,
): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c]) {
        const bx = pos.x + c;
        const by = pos.y + r;
        if (bx < 0 || bx >= BOARD_WIDTH || by >= BOARD_HEIGHT) return false;
        if (by < 0) continue; // allow spawning above top
        if (board[by][bx] !== 0) return false;
      }
    }
  }
  return true;
}

/** Lock the current piece onto the board, returning a new board. */
function lockPiece(
  board: (string | 0)[][],
  piece: TetrisPiece,
  pos: Position,
): (string | 0)[][] {
  const newBoard = board.map((row) => [...row]);
  const { shape, color } = piece;
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c]) {
        const bx = pos.x + c;
        const by = pos.y + r;
        if (by >= 0 && by < BOARD_HEIGHT && bx >= 0 && bx < BOARD_WIDTH) {
          newBoard[by][bx] = color;
        }
      }
    }
  }
  return newBoard;
}

/** Remove completed lines and return the updated board + count. */
export function clearLines(board: (string | 0)[][]): {
  board: (string | 0)[][];
  linesCleared: number;
} {
  const remaining = board.filter((row) => row.some((cell) => cell === 0));
  const linesCleared = BOARD_HEIGHT - remaining.length;
  const emptyRows: (string | 0)[][] = Array.from(
    { length: linesCleared },
    () => Array(BOARD_WIDTH).fill(0),
  );
  return { board: [...emptyRows, ...remaining], linesCleared };
}

function scoreForLines(n: number): number {
  switch (n) {
    case 1:
      return 100;
    case 2:
      return 300;
    case 3:
      return 500;
    case 4:
      return 800;
    default:
      return 0;
  }
}

/** Calculate the drop speed in ms for a given level. */
export function speedForLevel(level: number): number {
  return Math.max(100, 800 - level * 70);
}

/** Create a fresh game state. */
export function createGame(): TetrisState {
  const current = randomPiece();
  const next = randomPiece();
  return {
    board: emptyBoard(),
    currentPiece: current,
    nextPiece: next,
    position: spawnPosition(current.shape),
    score: 0,
    level: 0,
    lines: 0,
    gameOver: false,
    paused: false,
  };
}

/** Advance the game by one tick — drop piece, lock if needed, spawn next. */
export function tick(state: TetrisState): TetrisState {
  if (state.gameOver || state.paused) return state;

  const newPos: Position = { x: state.position.x, y: state.position.y + 1 };

  if (canPlace(state.board, state.currentPiece.shape, newPos)) {
    return { ...state, position: newPos };
  }

  // Lock piece
  const locked = lockPiece(state.board, state.currentPiece, state.position);
  const { board: clearedBoard, linesCleared } = clearLines(locked);

  const newLines = state.lines + linesCleared;
  const newLevel = Math.floor(newLines / 10);
  const newScore = state.score + scoreForLines(linesCleared);

  const next = state.nextPiece;
  const upcoming = randomPiece();
  const nextPos = spawnPosition(next.shape);

  if (!canPlace(clearedBoard, next.shape, nextPos)) {
    return {
      ...state,
      board: clearedBoard,
      score: newScore,
      level: newLevel,
      lines: newLines,
      gameOver: true,
    };
  }

  return {
    board: clearedBoard,
    currentPiece: next,
    nextPiece: upcoming,
    position: nextPos,
    score: newScore,
    level: newLevel,
    lines: newLines,
    gameOver: false,
    paused: false,
  };
}

/** Move the current piece horizontally. */
export function movePiece(state: TetrisState, dx: number): TetrisState {
  if (state.gameOver || state.paused) return state;

  const newPos: Position = { x: state.position.x + dx, y: state.position.y };
  if (canPlace(state.board, state.currentPiece.shape, newPos)) {
    return { ...state, position: newPos };
  }
  return state;
}

/** Rotate the current piece clockwise, with wall kick. */
export function rotateCurrent(state: TetrisState): TetrisState {
  if (state.gameOver || state.paused) return state;

  const rotated = rotatePiece(state.currentPiece.shape);

  // Try original position, then wall kicks: left 1, right 1, left 2, right 2
  const kicks = [0, -1, 1, -2, 2];
  for (const dx of kicks) {
    const tryPos: Position = { x: state.position.x + dx, y: state.position.y };
    if (canPlace(state.board, rotated, tryPos)) {
      return {
        ...state,
        currentPiece: { ...state.currentPiece, shape: rotated },
        position: tryPos,
      };
    }
  }

  return state; // rotation not possible
}

/** Hard drop — instantly place piece at the lowest valid position. */
export function hardDrop(state: TetrisState): TetrisState {
  if (state.gameOver || state.paused) return state;

  const ghost = getGhostPosition(state);
  const dropped: TetrisState = { ...state, position: ghost };

  // Lock immediately by calling tick (piece can't move further down)
  return tick(dropped);
}

/** Get the position where the piece would land (ghost preview). */
export function getGhostPosition(state: TetrisState): Position {
  let y = state.position.y;
  while (
    canPlace(state.board, state.currentPiece.shape, {
      x: state.position.x,
      y: y + 1,
    })
  ) {
    y++;
  }
  return { x: state.position.x, y };
}
