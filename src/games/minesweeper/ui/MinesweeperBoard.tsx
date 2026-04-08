/**
 * Minesweeper board — CSS grid, click to reveal, right-click to flag.
 */

import { useEffect, useCallback } from 'react';
import { useMinesweeperStore } from '../store/gameStore';
import { ArrowLeft } from 'lucide-react';
import type { Difficulty } from '../engine/game';

const NUMBER_COLORS: Record<number, string> = {
  1: '#3b82f6', 2: '#22c55e', 3: '#ef4444', 4: '#7c3aed',
  5: '#b91c1c', 6: '#0891b2', 7: '#1e293b', 8: '#6b7280',
};

const DIFF_LABELS: Array<{ key: Difficulty; label: string; emoji: string }> = [
  { key: 'beginner', label: 'Beginner', emoji: '😊' },
  { key: 'intermediate', label: 'Intermediate', emoji: '🤔' },
  { key: 'expert', label: 'Expert', emoji: '💀' },
];

export function MinesweeperBoard({ onQuit }: { onQuit: () => void }) {
  const { gameState, difficulty, elapsed, highScores, startGame, revealCell, flagCell, updateTimer } = useMinesweeperStore();
  const { grid, width, mines, flagged, gameOver, won } = gameState;

  // Timer
  useEffect(() => {
    const id = setInterval(updateTimer, 1000);
    return () => clearInterval(id);
  }, [updateTimer]);

  const handleClick = useCallback((x: number, y: number) => {
    revealCell(x, y);
  }, [revealCell]);

  const handleRightClick = useCallback((e: React.MouseEvent, x: number, y: number) => {
    e.preventDefault();
    flagCell(x, y);
  }, [flagCell]);

  // Long-press for mobile flagging
  const handleTouchStart = useCallback((x: number, y: number) => {
    const timer = setTimeout(() => flagCell(x, y), 500);
    const el = document.getElementById(`cell-${x}-${y}`);
    const cancel = () => { clearTimeout(timer); el?.removeEventListener('touchend', cancel); el?.removeEventListener('touchmove', cancel); };
    el?.addEventListener('touchend', cancel, { once: true });
    el?.addEventListener('touchmove', cancel, { once: true });
  }, [flagCell]);

  const cellSize = Math.min(Math.floor((Math.min(window.innerWidth - 40, 500)) / width), 32);

  return (
    <>
      {/* Top bar */}
      <div className="top-bar">
        <button className="action-btn secondary" onClick={onQuit}
          style={{ fontSize: 11, height: 28, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--text)', letterSpacing: 1.5 }}>
          💣 MINESWEEPER
        </div>
        <div style={{ width: 60 }} />
      </div>

      <div style={{
        flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column',
        alignItems: 'center', padding: 16, gap: 12,
      }}>
        {/* Difficulty selector */}
        <div style={{ display: 'flex', gap: 6 }}>
          {DIFF_LABELS.map(d => (
            <button key={d.key} className="action-btn secondary"
              onClick={() => startGame(d.key)}
              style={{
                fontSize: 11, height: 30, padding: '0 10px',
                background: difficulty === d.key ? 'var(--accent)' : undefined,
                color: difficulty === d.key ? 'var(--bg)' : undefined,
              }}>
              {d.emoji} {d.label}
            </button>
          ))}
        </div>

        {/* HUD */}
        <div style={{
          display: 'flex', gap: 20, alignItems: 'center',
          fontSize: 16, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
        }}>
          <span style={{ color: 'var(--opponent)' }}>💣 {mines - flagged}</span>
          <button onClick={() => startGame(difficulty)}
            style={{
              background: 'none', border: 'none', fontSize: 24, cursor: 'pointer',
              filter: gameOver && !won ? 'none' : 'none',
            }}>
            {gameOver ? (won ? '😎' : '💀') : '🙂'}
          </button>
          <span style={{ color: 'var(--text-muted)' }}>⏱ {elapsed}s</span>
        </div>

        {/* Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${width}, ${cellSize}px)`,
            gap: 1,
            background: 'var(--surface-2)',
            border: '2px solid var(--glass-border)',
            borderRadius: 8,
            padding: 2,
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {grid.map((row, y) =>
            row.map((cell, x) => (
              <div
                key={`${x}-${y}`}
                id={`cell-${x}-${y}`}
                onClick={() => !cell.flagged && handleClick(x, y)}
                onContextMenu={(e) => handleRightClick(e, x, y)}
                onTouchStart={() => handleTouchStart(x, y)}
                style={{
                  width: cellSize, height: cellSize,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: cellSize > 24 ? 14 : 11, fontWeight: 800,
                  cursor: cell.revealed ? 'default' : 'pointer',
                  userSelect: 'none',
                  background: cell.revealed
                    ? (cell.mine ? 'var(--opponent-dim)' : 'var(--surface)')
                    : 'var(--surface-2)',
                  borderRadius: 3,
                  transition: 'background 0.1s',
                  boxShadow: cell.revealed ? 'none' : 'inset -1px -1px 0 rgba(0,0,0,0.15), inset 1px 1px 0 rgba(255,255,255,0.1)',
                  color: cell.revealed && cell.adjacent > 0 ? NUMBER_COLORS[cell.adjacent] : 'var(--text)',
                }}
              >
                {cell.revealed
                  ? cell.mine ? '💣'
                  : cell.adjacent > 0 ? cell.adjacent : ''
                  : cell.flagged ? '🚩' : ''}
              </div>
            ))
          )}
        </div>

        {/* High scores */}
        {highScores[difficulty] !== null && (
          <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600 }}>
            Best time: {highScores[difficulty]}s
          </div>
        )}

        {/* Game over overlay */}
        {gameOver && (
          <div style={{
            padding: '12px 20px', borderRadius: 12,
            background: won ? 'var(--player-dim)' : 'var(--opponent-dim)',
            color: won ? 'var(--player)' : 'var(--opponent)',
            fontSize: 16, fontWeight: 800,
            animation: 'bounce-in 0.4s ease-out',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {won ? '🎉 You won!' : '💥 Game over!'}
            <button className="action-btn primary" onClick={() => startGame(difficulty)}
              style={{ height: 30, fontSize: 12 }}>
              Play Again
            </button>
          </div>
        )}
      </div>
    </>
  );
}
