import React, { useCallback, useEffect, useRef } from 'react';
import { getSpeed } from '../engine/game';
import { useSnakeStore } from '../store/gameStore';
import type { Direction } from '../engine/game';

interface SnakeBoardProps {
  onQuit: () => void;
}

const SNAKE_HEAD_COLOR = '#3dbdb3';
const SNAKE_BODY_COLOR = '#4ecdc4';
const FOOD_COLOR = '#ff9f43';
const GRID_LINE_COLOR = 'rgba(255,255,255,0.06)';
const BG_COLOR = '#1a1a2e';

function canvasSize(): number {
  if (typeof window === 'undefined') return 400;
  return Math.min(window.innerWidth - 40, 400);
}

const SnakeBoard: React.FC<SnakeBoardProps> = ({ onQuit }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const sizeRef = useRef(canvasSize());

  const { gameState, isPlaying, startGame, setDirection, tick, togglePause } =
    useSnakeStore();

  // ---------- Drawing ----------
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const cell = size / gameState.gridSize;

    // Background
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, size, size);

    // Grid lines
    ctx.strokeStyle = GRID_LINE_COLOR;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= gameState.gridSize; i++) {
      const pos = i * cell;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(size, pos);
      ctx.stroke();
    }

    // Food
    ctx.fillStyle = 'var(--hit)' === 'var(--hit)' ? FOOD_COLOR : FOOD_COLOR;
    const fx = gameState.food.x * cell;
    const fy = gameState.food.y * cell;
    ctx.beginPath();
    ctx.arc(fx + cell / 2, fy + cell / 2, cell * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Snake
    gameState.snake.forEach((seg, i) => {
      const isHead = i === 0;
      ctx.fillStyle = isHead ? SNAKE_HEAD_COLOR : SNAKE_BODY_COLOR;
      const r = isHead ? 4 : 2;
      const x = seg.x * cell;
      const y = seg.y * cell;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + cell, y, x + cell, y + cell, r);
      ctx.arcTo(x + cell, y + cell, x, y + cell, r);
      ctx.arcTo(x, y + cell, x, y, r);
      ctx.arcTo(x, y, x + cell, y, r);
      ctx.closePath();
      ctx.fill();
    });
  }, [gameState]);

  useEffect(() => {
    draw();
  }, [draw]);

  // ---------- Responsive resize ----------
  useEffect(() => {
    const onResize = () => {
      sizeRef.current = canvasSize();
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = sizeRef.current;
        canvas.height = sizeRef.current;
        draw();
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [draw]);

  // ---------- Keyboard ----------
  useEffect(() => {
    const keyMap: Record<string, Direction> = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
      w: 'up',
      a: 'left',
      s: 'down',
      d: 'right',
      W: 'up',
      A: 'left',
      S: 'down',
      D: 'right',
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P') {
        if (isPlaying) togglePause();
        return;
      }
      const dir = keyMap[e.key];
      if (dir) {
        e.preventDefault();
        if (!isPlaying && !gameState.gameOver) {
          startGame(gameState.gridSize);
        }
        setDirection(dir);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isPlaying, gameState.gameOver, gameState.gridSize, setDirection, startGame, togglePause]);

  // ---------- Game loop ----------
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (isPlaying && !gameState.paused && !gameState.gameOver) {
      const speed = getSpeed(gameState.score);
      intervalRef.current = setInterval(() => {
        tick();
      }, speed);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, gameState.paused, gameState.gameOver, gameState.score, tick]);

  // ---------- Touch / swipe ----------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      touchStartRef.current = { x: t.clientX, y: t.clientY };
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartRef.current.x;
      const dy = t.clientY - touchStartRef.current.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (Math.max(absDx, absDy) < 20) return; // ignore taps

      let dir: Direction;
      if (absDx > absDy) {
        dir = dx > 0 ? 'right' : 'left';
      } else {
        dir = dy > 0 ? 'down' : 'up';
      }
      if (!isPlaying && !gameState.gameOver) {
        startGame(gameState.gridSize);
      }
      setDirection(dir);
      touchStartRef.current = null;
    };

    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [isPlaying, gameState.gameOver, gameState.gridSize, setDirection, startGame]);

  // ---------- Render ----------
  const size = sizeRef.current;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: 16,
        userSelect: 'none',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          width: size,
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 4,
        }}
      >
        <button
          onClick={onQuit}
          style={{
            background: 'none',
            border: '1px solid rgba(255,255,255,0.3)',
            color: '#fff',
            padding: '4px 12px',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          Back
        </button>
        <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>
          Score: {gameState.score} &nbsp;|&nbsp; Best: {gameState.highScore}
        </div>
        <button
          onClick={() => {
            if (isPlaying) togglePause();
          }}
          style={{
            background: 'none',
            border: '1px solid rgba(255,255,255,0.3)',
            color: '#fff',
            padding: '4px 12px',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
            visibility: isPlaying ? 'visible' : 'hidden',
          }}
        >
          {gameState.paused ? 'Resume' : 'Pause'}
        </button>
      </div>

      {/* Canvas container */}
      <div style={{ position: 'relative', width: size, height: size }}>
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          style={{
            display: 'block',
            borderRadius: 8,
            border: '2px solid rgba(255,255,255,0.1)',
          }}
        />

        {/* Start screen */}
        {!isPlaying && !gameState.gameOver && (
          <Overlay>
            <h2 style={{ margin: 0, fontSize: 28, color: SNAKE_BODY_COLOR }}>
              Snake
            </h2>
            <p style={{ margin: '8px 0', fontSize: 14, opacity: 0.7 }}>
              Arrow keys or WASD to move. P to pause.
            </p>
            <OverlayButton onClick={() => startGame(gameState.gridSize)}>
              Play
            </OverlayButton>
          </Overlay>
        )}

        {/* Game over overlay */}
        {gameState.gameOver && (
          <Overlay>
            <h2 style={{ margin: 0, fontSize: 28, color: FOOD_COLOR }}>
              Game Over
            </h2>
            <p style={{ margin: '8px 0', fontSize: 18 }}>
              Score: {gameState.score}
            </p>
            {gameState.score === gameState.highScore && gameState.score > 0 && (
              <p style={{ margin: 0, fontSize: 14, color: FOOD_COLOR }}>
                New High Score!
              </p>
            )}
            <OverlayButton onClick={() => startGame(gameState.gridSize)}>
              Play Again
            </OverlayButton>
          </Overlay>
        )}

        {/* Paused overlay */}
        {isPlaying && gameState.paused && (
          <Overlay>
            <h2 style={{ margin: 0, fontSize: 28, color: '#fff' }}>Paused</h2>
            <OverlayButton onClick={togglePause}>Resume</OverlayButton>
          </Overlay>
        )}
      </div>
    </div>
  );
};

// ---------- Helper components ----------

const Overlay: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)',
      borderRadius: 8,
      color: '#fff',
      gap: 12,
    }}
  >
    {children}
  </div>
);

const OverlayButton: React.FC<{
  onClick: () => void;
  children: React.ReactNode;
}> = ({ onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      padding: '10px 32px',
      fontSize: 16,
      fontWeight: 600,
      border: 'none',
      borderRadius: 8,
      background: SNAKE_BODY_COLOR,
      color: '#1a1a2e',
      cursor: 'pointer',
    }}
  >
    {children}
  </button>
);

export default SnakeBoard;
