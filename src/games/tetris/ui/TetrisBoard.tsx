/**
 * Tetris game board — canvas-rendered with keyboard + touch controls.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { useTetrisStore } from '../store/gameStore';
import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  getGhostPosition,
  speedForLevel,
} from '../engine/game';

interface TetrisBoardProps {
  onQuit: () => void;
}

const CELL_SIZE = 28;
const PREVIEW_CELL = 18;
const BORDER = 1;

const TetrisBoard: React.FC<TetrisBoardProps> = ({ onQuit }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const softDropRef = useRef(false);

  const {
    gameState,
    highScore,
    startGame,
    tick,
    moveLeft,
    moveRight,
    rotate,
    hardDrop,
    togglePause,
  } = useTetrisStore();

  // ----- game loop -----
  const startLoop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const speed = softDropRef.current
      ? Math.max(50, speedForLevel(gameState.level) / 4)
      : speedForLevel(gameState.level);
    intervalRef.current = setInterval(() => {
      useTetrisStore.getState().tick();
    }, speed);
  }, [gameState.level]);

  useEffect(() => {
    if (!gameState.gameOver && !gameState.paused) {
      startLoop();
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [gameState.gameOver, gameState.paused, gameState.level, startLoop]);

  // ----- keyboard -----
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.repeat && !['ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          moveLeft();
          break;
        case 'ArrowRight':
          e.preventDefault();
          moveRight();
          break;
        case 'ArrowUp':
          e.preventDefault();
          rotate();
          break;
        case 'ArrowDown':
          e.preventDefault();
          tick();
          break;
        case ' ':
          e.preventDefault();
          hardDrop();
          break;
        case 'p':
        case 'P':
          togglePause();
          break;
      }
    };

    const handleSoftDropStart = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' && !softDropRef.current) {
        softDropRef.current = true;
        startLoop();
      }
    };
    const handleSoftDropEnd = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' && softDropRef.current) {
        softDropRef.current = false;
        startLoop();
      }
    };

    window.addEventListener('keydown', handleKey);
    window.addEventListener('keydown', handleSoftDropStart);
    window.addEventListener('keyup', handleSoftDropEnd);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('keydown', handleSoftDropStart);
      window.removeEventListener('keyup', handleSoftDropEnd);
    };
  }, [moveLeft, moveRight, rotate, tick, hardDrop, togglePause, startLoop]);

  // ----- draw board -----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = BOARD_WIDTH * CELL_SIZE;
    const h = BOARD_HEIGHT * CELL_SIZE;
    canvas.width = w;
    canvas.height = h;

    // background
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, w, h);

    // grid lines
    ctx.strokeStyle = '#222';
    ctx.lineWidth = BORDER;
    for (let r = 0; r <= BOARD_HEIGHT; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * CELL_SIZE);
      ctx.lineTo(w, r * CELL_SIZE);
      ctx.stroke();
    }
    for (let c = 0; c <= BOARD_WIDTH; c++) {
      ctx.beginPath();
      ctx.moveTo(c * CELL_SIZE, 0);
      ctx.lineTo(c * CELL_SIZE, h);
      ctx.stroke();
    }

    // locked cells
    for (let r = 0; r < BOARD_HEIGHT; r++) {
      for (let c = 0; c < BOARD_WIDTH; c++) {
        const cell = gameState.board[r][c];
        if (cell !== 0) {
          drawCell(ctx, c, r, cell, 1);
        }
      }
    }

    // ghost piece
    const ghost = getGhostPosition(gameState);
    const { shape, color } = gameState.currentPiece;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          drawCell(ctx, ghost.x + c, ghost.y + r, color, 0.2);
        }
      }
    }

    // current piece
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          drawCell(
            ctx,
            gameState.position.x + c,
            gameState.position.y + r,
            color,
            1,
          );
        }
      }
    }
  }, [gameState]);

  // ----- draw preview -----
  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const nextShape = gameState.nextPiece.shape;
    const pw = nextShape[0].length * PREVIEW_CELL;
    const ph = nextShape.length * PREVIEW_CELL;
    canvas.width = pw;
    canvas.height = ph;

    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, pw, ph);

    for (let r = 0; r < nextShape.length; r++) {
      for (let c = 0; c < nextShape[r].length; c++) {
        if (nextShape[r][c]) {
          ctx.fillStyle = gameState.nextPiece.color;
          ctx.fillRect(
            c * PREVIEW_CELL + 1,
            r * PREVIEW_CELL + 1,
            PREVIEW_CELL - 2,
            PREVIEW_CELL - 2,
          );
        }
      }
    }
  }, [gameState.nextPiece]);

  // ----- auto-start on mount -----
  useEffect(() => {
    startGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function drawCell(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    color: string,
    alpha: number,
  ) {
    if (cy < 0) return;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(
      cx * CELL_SIZE + BORDER,
      cy * CELL_SIZE + BORDER,
      CELL_SIZE - 2 * BORDER,
      CELL_SIZE - 2 * BORDER,
    );
    // highlight edge
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(
      cx * CELL_SIZE + BORDER,
      cy * CELL_SIZE + BORDER,
      CELL_SIZE - 2 * BORDER,
      3,
    );
    ctx.globalAlpha = 1;
  }

  const boardW = BOARD_WIDTH * CELL_SIZE;

  return (
    <div style={styles.wrapper}>
      {/* top bar */}
      <div style={styles.topBar}>
        <button onClick={onQuit} style={styles.backBtn}>
          Back
        </button>
        <span style={styles.stat}>
          Score: <strong>{gameState.score}</strong>
        </span>
        <span style={styles.stat}>
          Level: <strong>{gameState.level}</strong>
        </span>
        <span style={styles.stat}>
          Lines: <strong>{gameState.lines}</strong>
        </span>
        <span style={styles.stat}>
          Hi: <strong>{highScore}</strong>
        </span>
      </div>

      <div style={styles.gameArea}>
        <div style={{ position: 'relative', width: boardW }}>
          <canvas ref={canvasRef} style={styles.canvas} />

          {/* pause overlay */}
          {gameState.paused && !gameState.gameOver && (
            <div style={styles.overlay}>
              <h2 style={{ margin: 0 }}>PAUSED</h2>
              <p>Press P to resume</p>
            </div>
          )}

          {/* game over overlay */}
          {gameState.gameOver && (
            <div style={styles.overlay}>
              <h2 style={{ margin: 0 }}>GAME OVER</h2>
              <p>Score: {gameState.score}</p>
              <button onClick={startGame} style={styles.restartBtn}>
                Play Again
              </button>
            </div>
          )}
        </div>

        {/* side panel */}
        <div style={styles.sidePanel}>
          <div style={styles.previewLabel}>NEXT</div>
          <canvas ref={previewRef} style={styles.previewCanvas} />
          <div style={{ marginTop: 16, fontSize: 12, color: '#999' }}>
            <div>Arrow keys: move</div>
            <div>Up: rotate</div>
            <div>Space: hard drop</div>
            <div>P: pause</div>
          </div>
        </div>
      </div>

      {/* mobile controls */}
      <div style={styles.mobileControls}>
        <button style={styles.mobileBtn} onPointerDown={moveLeft}>
          &#9664;
        </button>
        <button style={styles.mobileBtn} onPointerDown={rotate}>
          &#9650;
        </button>
        <button style={styles.mobileBtn} onPointerDown={moveRight}>
          &#9654;
        </button>
        <button
          style={{ ...styles.mobileBtn, minWidth: 80 }}
          onPointerDown={hardDrop}
        >
          DROP
        </button>
      </div>
    </div>
  );
};

export default TetrisBoard;

/* ---------- inline styles ---------- */

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: '#1a1a2e',
    minHeight: '100vh',
    color: '#eee',
    fontFamily: 'monospace',
    padding: 8,
    boxSizing: 'border-box',
  },
  topBar: {
    display: 'flex',
    gap: 16,
    alignItems: 'center',
    padding: '8px 0',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  backBtn: {
    background: '#333',
    color: '#eee',
    border: 'none',
    borderRadius: 4,
    padding: '6px 14px',
    cursor: 'pointer',
    fontSize: 14,
  },
  stat: {
    fontSize: 14,
  },
  gameArea: {
    display: 'flex',
    gap: 16,
    alignItems: 'flex-start',
    marginTop: 8,
  },
  canvas: {
    display: 'block',
    border: '2px solid #444',
    borderRadius: 4,
    maxWidth: '100%',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.75)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  restartBtn: {
    marginTop: 12,
    padding: '8px 24px',
    fontSize: 16,
    background: '#00f0f0',
    color: '#000',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  },
  sidePanel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: 90,
  },
  previewLabel: {
    fontSize: 12,
    marginBottom: 4,
    color: '#999',
  },
  previewCanvas: {
    border: '1px solid #444',
    borderRadius: 4,
  },
  mobileControls: {
    display: 'flex',
    gap: 10,
    marginTop: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  mobileBtn: {
    background: '#333',
    color: '#eee',
    border: 'none',
    borderRadius: 6,
    padding: '12px 18px',
    fontSize: 20,
    cursor: 'pointer',
    touchAction: 'manipulation',
    userSelect: 'none',
  },
};
