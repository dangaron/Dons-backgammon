import React, { useRef, useEffect, useCallback } from 'react';
import { useBreakoutStore } from '../store/gameStore';

interface BreakoutBoardProps {
  onQuit: () => void;
}

const MAX_WIDTH = 400;
const CANVAS_HEIGHT = 500;

const BreakoutBoard: React.FC<BreakoutBoardProps> = ({ onQuit }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const { gameState, highScore, startGame, tick, movePaddle, launch, togglePause } =
    useBreakoutStore();

  // Measure container and start game at correct size
  useEffect(() => {
    const w = Math.min(
      containerRef.current?.clientWidth ?? MAX_WIDTH,
      MAX_WIDTH,
    );
    startGame(w, CANVAS_HEIGHT);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Game loop
  useEffect(() => {
    const loop = (time: number) => {
      if (lastTimeRef.current) {
        const dt = (time - lastTimeRef.current) / 1000;
        tick(dt);
      }
      lastTimeRef.current = time;
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [tick]);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gs = gameState;
    const w = gs.canvasWidth;
    const h = gs.canvasHeight;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);

    // Bricks
    for (const brick of gs.bricks) {
      if (!brick.alive) continue;
      ctx.fillStyle = brick.color;
      ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
      // Subtle highlight on top edge
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(brick.x, brick.y, brick.width, 2);
    }

    // Paddle (rounded rect)
    const p = gs.paddle;
    const pRadius = 4;
    ctx.fillStyle = '#ecf0f1';
    ctx.beginPath();
    ctx.moveTo(p.x + pRadius, p.y);
    ctx.lineTo(p.x + p.width - pRadius, p.y);
    ctx.quadraticCurveTo(p.x + p.width, p.y, p.x + p.width, p.y + pRadius);
    ctx.lineTo(p.x + p.width, p.y + p.height - pRadius);
    ctx.quadraticCurveTo(
      p.x + p.width,
      p.y + p.height,
      p.x + p.width - pRadius,
      p.y + p.height,
    );
    ctx.lineTo(p.x + pRadius, p.y + p.height);
    ctx.quadraticCurveTo(p.x, p.y + p.height, p.x, p.y + p.height - pRadius);
    ctx.lineTo(p.x, p.y + pRadius);
    ctx.quadraticCurveTo(p.x, p.y, p.x + pRadius, p.y);
    ctx.closePath();
    ctx.fill();

    // Ball with glow
    ctx.save();
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(gs.ball.x, gs.ball.y, gs.ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // HUD — score, level, lives
    ctx.fillStyle = '#fff';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${gs.score}`, 8, 18);
    ctx.textAlign = 'center';
    ctx.fillText(`Level ${gs.level}`, w / 2, 18);
    ctx.textAlign = 'right';
    // Lives as dots
    for (let i = 0; i < gs.lives; i++) {
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath();
      ctx.arc(w - 12 - i * 16, 14, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // High score
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Hi: ${Math.max(highScore, gs.score)}`, 8, 36);

    // Launch prompt
    if (!gs.launched && !gs.gameOver && !gs.won) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Click to launch', w / 2, h / 2 + 40);
    }

    // Paused overlay
    if (gs.paused && !gs.gameOver && !gs.won) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', w / 2, h / 2);
      ctx.font = '14px monospace';
      ctx.fillText('Press P to resume', w / 2, h / 2 + 30);
    }

    // Game over overlay
    if (gs.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#e74c3c';
      ctx.font = 'bold 32px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', w / 2, h / 2 - 10);
      ctx.fillStyle = '#fff';
      ctx.font = '16px monospace';
      ctx.fillText(`Final Score: ${gs.score}`, w / 2, h / 2 + 24);
      ctx.font = '14px monospace';
      ctx.fillText('Click to play again', w / 2, h / 2 + 54);
    }

    // Win overlay
    if (gs.won) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#2ecc71';
      ctx.font = 'bold 32px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('YOU WIN!', w / 2, h / 2 - 10);
      ctx.fillStyle = '#fff';
      ctx.font = '16px monospace';
      ctx.fillText(`Score: ${gs.score}`, w / 2, h / 2 + 24);
      ctx.font = '14px monospace';
      ctx.fillText('Click to play again', w / 2, h / 2 + 54);
    }
  }, [gameState, highScore]);

  // Mouse / touch handlers
  const getCanvasX = useCallback(
    (clientX: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return 0;
      const rect = canvas.getBoundingClientRect();
      const scaleX = gameState.canvasWidth / rect.width;
      return (clientX - rect.left) * scaleX;
    },
    [gameState.canvasWidth],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      movePaddle(getCanvasX(e.clientX));
    },
    [movePaddle, getCanvasX],
  );

  const handleClick = useCallback(() => {
    const gs = useBreakoutStore.getState().gameState;
    if (gs.gameOver || gs.won) {
      const w = gs.canvasWidth;
      startGame(w, CANVAS_HEIGHT);
      return;
    }
    if (!gs.launched) {
      launch();
    }
  }, [startGame, launch]);

  // Keyboard handlers
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const gs = useBreakoutStore.getState().gameState;
      if (e.key === 'ArrowLeft') {
        movePaddle(gs.paddle.x - 20);
      } else if (e.key === 'ArrowRight') {
        movePaddle(gs.paddle.x + gs.paddle.width + 20);
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleClick();
      } else if (e.key === 'p' || e.key === 'P') {
        togglePause();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [movePaddle, handleClick, togglePause]);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        maxWidth: MAX_WIDTH,
        margin: '0 auto',
        userSelect: 'none',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          padding: '8px 0',
        }}
      >
        <button
          onClick={onQuit}
          style={{
            background: 'none',
            border: '1px solid #555',
            color: '#ccc',
            padding: '4px 12px',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          Back
        </button>
        <span style={{ color: '#888', fontSize: 13, fontFamily: 'monospace' }}>
          Breakout
        </span>
        <button
          onClick={togglePause}
          style={{
            background: 'none',
            border: '1px solid #555',
            color: '#ccc',
            padding: '4px 12px',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          {gameState.paused ? 'Resume' : 'Pause'}
        </button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={gameState.canvasWidth}
        height={gameState.canvasHeight}
        onPointerMove={handlePointerMove}
        onClick={handleClick}
        style={{
          width: '100%',
          maxWidth: MAX_WIDTH,
          borderRadius: 6,
          cursor: 'none',
          touchAction: 'none',
        }}
      />
    </div>
  );
};

export default BreakoutBoard;
