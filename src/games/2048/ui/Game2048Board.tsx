/**
 * 2048 board — CSS grid with tile animations.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useGame2048Store } from '../store/gameStore';
import { ArrowLeft, Undo2 } from 'lucide-react';

const TILE_COLORS: Record<number, { bg: string; text: string }> = {
  0:    { bg: 'var(--surface-2)', text: 'transparent' },
  2:    { bg: '#eee4da', text: '#776e65' },
  4:    { bg: '#ede0c8', text: '#776e65' },
  8:    { bg: '#f2b179', text: '#f9f6f2' },
  16:   { bg: '#f59563', text: '#f9f6f2' },
  32:   { bg: '#f67c5f', text: '#f9f6f2' },
  64:   { bg: '#f65e3b', text: '#f9f6f2' },
  128:  { bg: '#edcf72', text: '#f9f6f2' },
  256:  { bg: '#edcc61', text: '#f9f6f2' },
  512:  { bg: '#edc850', text: '#f9f6f2' },
  1024: { bg: '#edc53f', text: '#f9f6f2' },
  2048: { bg: '#edc22e', text: '#f9f6f2' },
};

function getTileStyle(value: number) {
  const colors = TILE_COLORS[value] || { bg: '#3c3a32', text: '#f9f6f2' };
  return colors;
}

export function Game2048Board({ onQuit }: { onQuit: () => void }) {
  const { gameState, startGame, move, undo, undoStack } = useGame2048Store();
  const { grid, score, bestScore, gameOver, won } = gameState;
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W': e.preventDefault(); move('up'); break;
        case 'ArrowDown': case 's': case 'S': e.preventDefault(); move('down'); break;
        case 'ArrowLeft': case 'a': case 'A': e.preventDefault(); move('left'); break;
        case 'ArrowRight': case 'd': case 'D': e.preventDefault(); move('right'); break;
        case 'z': if (e.ctrlKey || e.metaKey) { e.preventDefault(); undo(); } break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [move, undo]);

  // Swipe controls
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (Math.max(absDx, absDy) < 30) return; // Too short

    if (absDx > absDy) {
      move(dx > 0 ? 'right' : 'left');
    } else {
      move(dy > 0 ? 'down' : 'up');
    }
    touchStart.current = null;
  }, [move]);

  const tileSize = Math.min(Math.floor((Math.min(window.innerWidth - 48, 360)) / 4), 80);
  const gap = Math.max(6, Math.floor(tileSize * 0.08));

  return (
    <>
      {/* Top bar */}
      <div className="top-bar">
        <button className="action-btn secondary" onClick={onQuit}
          style={{ fontSize: 11, height: 28, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--text)', letterSpacing: 1.5 }}>
          🔢 2048
        </div>
        <div style={{ width: 60 }} />
      </div>

      <div style={{
        flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column',
        alignItems: 'center', padding: 16, gap: 12,
      }}>
        {/* Score display */}
        <div style={{ display: 'flex', gap: 12 }}>
          <ScoreBox label="SCORE" value={score} />
          <ScoreBox label="BEST" value={bestScore} />
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="action-btn primary" onClick={startGame}
            style={{ height: 32, fontSize: 12 }}>
            🔄 New Game
          </button>
          {undoStack.length > 0 && (
            <button className="action-btn secondary" onClick={undo}
              style={{ height: 32, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Undo2 size={13} /> Undo
            </button>
          )}
        </div>

        {/* Grid */}
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(4, ${tileSize}px)`,
            gap,
            background: 'var(--surface-2)',
            border: '2px solid var(--glass-border)',
            borderRadius: 12,
            padding: gap,
            position: 'relative',
          }}
        >
          {grid.map((row, r) =>
            row.map((value, c) => {
              const { bg, text } = getTileStyle(value);
              return (
                <div
                  key={`${r}-${c}`}
                  style={{
                    width: tileSize, height: tileSize,
                    borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: value >= 1024 ? tileSize * 0.25 : value >= 128 ? tileSize * 0.3 : tileSize * 0.38,
                    fontWeight: 900,
                    fontFamily: 'var(--font)',
                    background: bg,
                    color: text,
                    transition: 'all 0.12s ease',
                    transform: value > 0 ? 'scale(1)' : 'scale(0.8)',
                    boxShadow: value >= 128 ? `0 0 20px ${bg}60` : 'none',
                  }}
                >
                  {value > 0 ? value : ''}
                </div>
              );
            })
          )}

          {/* Game over / Win overlay */}
          {(gameOver || won) && (
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 12,
              background: 'rgba(0,0,0,0.6)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 8,
              animation: 'bounce-in 0.4s ease-out',
            }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: won ? '#edc22e' : '#fff' }}>
                {won ? '🎉 2048!' : '😵 Game Over'}
              </div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
                Score: {score}
              </div>
              <button className="action-btn primary" onClick={startGame}
                style={{ height: 36, fontSize: 13, marginTop: 4 }}>
                Play Again
              </button>
            </div>
          )}
        </div>

        {/* Controls hint */}
        <div style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center' }}>
          Arrow keys or swipe to move tiles
        </div>
      </div>
    </>
  );
}

function ScoreBox({ label, value }: { label: string; value: number }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--glass-border)',
      borderRadius: 10, padding: '6px 16px', textAlign: 'center', minWidth: 80,
    }}>
      <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-dim)', letterSpacing: 1, textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
    </div>
  );
}
