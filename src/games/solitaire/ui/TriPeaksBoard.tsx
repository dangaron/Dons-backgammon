/**
 * TriPeaks Solitaire board — SVG rendering with click-to-remove interaction.
 * 3 peaks of cards; remove exposed face-up cards that are +/- 1 rank from waste top.
 * Chain combo scoring with multiplier display.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSolitaireStore } from '../store/gameStore';
import { getTriPeaksLegalMoves } from '../engine/tripeaks';
import type { TriPeaksMove } from '../engine/tripeaks';
import { Card, EmptyPile, CARD_W, CARD_H } from './CardRenderer';
import { ArrowLeft, Undo2, Lightbulb, RotateCcw } from 'lucide-react';

// ── Layout constants ────────────────────────────────────────────────────────────
const PADDING = 16;
const BOARD_W = 580;
const CENTER_X = BOARD_W / 2;
const PEAK_TOP_Y = PADDING + 10;
const CARD_OVERLAP_X = CARD_W * 0.55;
const CARD_OVERLAP_Y = CARD_H * 0.32;
const STOCK_Y = PEAK_TOP_Y + 4 * CARD_OVERLAP_Y + CARD_H + 24;
const BOARD_H = STOCK_Y + CARD_H + PADDING + 18;

// ── TriPeaks layout positions ───────────────────────────────────────────────────

/**
 * TriPeaks layout — 28 cards in 3 overlapping pyramids sharing a base row.
 *
 * Row 0 (3 peak tops):   indices 0, 1, 2
 * Row 1 (6 cards):       indices 3, 4, 5, 6, 7, 8
 * Row 2 (9 cards):       indices 9..17
 * Row 3 (10 cards):      indices 18..27
 *
 * Visual column positions for the 3 peaks:
 * Peak 0 centered around col 1.5
 * Peak 1 centered around col 4.5
 * Peak 2 centered around col 7.5
 */

// Column positions for each card index (in half-card-width units)
const CARD_COLUMNS: number[] = (() => {
  const cols = new Array(28).fill(0);

  // Row 0: 3 peak tops
  cols[0] = 1.5;   // Peak 0 top
  cols[1] = 4.5;   // Peak 1 top
  cols[2] = 7.5;   // Peak 2 top

  // Row 1: 6 cards (2 per peak)
  cols[3] = 1;   cols[4] = 2;     // Peak 0
  cols[5] = 4;   cols[6] = 5;     // Peak 1
  cols[7] = 7;   cols[8] = 8;     // Peak 2

  // Row 2: 9 cards (3 per peak)
  cols[9]  = 0.5; cols[10] = 1.5; cols[11] = 2.5;  // Peak 0
  cols[12] = 3.5; cols[13] = 4.5; cols[14] = 5.5;  // Peak 1
  cols[15] = 6.5; cols[16] = 7.5; cols[17] = 8.5;  // Peak 2

  // Row 3: 10 cards (continuous base)
  for (let i = 0; i < 10; i++) {
    cols[18 + i] = i;
  }

  return cols;
})();

const CARD_ROWS: number[] = (() => {
  const rows = new Array(28).fill(0);
  // Row 0: indices 0-2
  for (let i = 0; i <= 2; i++) rows[i] = 0;
  // Row 1: indices 3-8
  for (let i = 3; i <= 8; i++) rows[i] = 1;
  // Row 2: indices 9-17
  for (let i = 9; i <= 17; i++) rows[i] = 2;
  // Row 3: indices 18-27
  for (let i = 18; i <= 27; i++) rows[i] = 3;
  return rows;
})();

function peakCardPos(index: number): { x: number; y: number } {
  const col = CARD_COLUMNS[index];
  const row = CARD_ROWS[index];
  // Center the 10-card base row (cols 0-9) within the board
  const baseWidth = 9 * CARD_OVERLAP_X + CARD_W;
  const baseStartX = CENTER_X - baseWidth / 2;
  return {
    x: baseStartX + col * CARD_OVERLAP_X,
    y: PEAK_TOP_Y + row * CARD_OVERLAP_Y,
  };
}

// Children mapping (which cards cover a parent)
const CHILDREN: number[][] = (() => {
  const c: number[][] = new Array(28).fill(null).map(() => []);
  c[0] = [3, 4]; c[1] = [5, 6]; c[2] = [7, 8];
  c[3] = [9, 10]; c[4] = [10, 11]; c[5] = [12, 13];
  c[6] = [13, 14]; c[7] = [15, 16]; c[8] = [16, 17];
  c[9] = [18, 19]; c[10] = [19, 20]; c[11] = [20, 21];
  c[12] = [21, 22]; c[13] = [22, 23]; c[14] = [23, 24];
  c[15] = [24, 25]; c[16] = [25, 26]; c[17] = [26, 27];
  return c;
})();

/** Which peak (0, 1, 2) each card index belongs to. Cards can belong to multiple peaks. */
const PEAK_INDICES: number[][] = [
  [0, 3, 4, 9, 10, 11, 18, 19, 20, 21],
  [1, 5, 6, 12, 13, 14, 21, 22, 23, 24],
  [2, 7, 8, 15, 16, 17, 24, 25, 26, 27],
];

function isExposed(index: number, removed: boolean[]): boolean {
  if (removed[index]) return false;
  return CHILDREN[index].every(c => removed[c]);
}

// ── Component ───────────────────────────────────────────────────────────────────

interface TriPeaksBoardProps {
  onQuit: () => void;
}

export function TriPeaksBoard({ onQuit }: TriPeaksBoardProps) {
  const {
    tripeaksState,
    makeMove,
    undo,
    undoStack,
    requestHint,
    hintMove,
    clearHint,
    gameStartTime,
  } = useSolitaireStore();

  // If no state, show nothing
  if (!tripeaksState) return null;

  const state = tripeaksState;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const legalMoves = useMemo(() => getTriPeaksLegalMoves(state), [state]);

  // Clear hint on state change
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => { clearHint(); }, [state, clearHint]);

  // Elapsed time display
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [elapsed, setElapsed] = useState(0);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (state.gameOver) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - gameStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [gameStartTime, state.gameOver]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Count remaining peak cards
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const remainingCards = useMemo(
    () => state.removed.filter(r => !r).length,
    [state.removed],
  );

  // Peak clearance status
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const peakStatus = useMemo(() => {
    return PEAK_INDICES.map(indices => indices.every(i => state.removed[i]));
  }, [state.removed]);

  // ── Hint highlight ────────────────────────────────────────────────────────

  const hintTriPeaksMove = hintMove as TriPeaksMove | null;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const hintIndex = useMemo(() => {
    if (!hintTriPeaksMove || hintTriPeaksMove.type !== 'remove') return -1;
    return hintTriPeaksMove.index ?? -1;
  }, [hintTriPeaksMove]);

  const hintIsStock = hintTriPeaksMove?.type === 'draw';

  // ── Click handlers ────────────────────────────────────────────────────────

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handlePeakCardClick = useCallback((index: number) => {
    if (state.gameOver) return;
    if (!isExposed(index, state.removed)) return;
    if (!state.faceUp[index]) return;

    const move = legalMoves.find(m => m.type === 'remove' && m.index === index);
    if (move) {
      makeMove(move);
    }
  }, [state, legalMoves, makeMove]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handleStockClick = useCallback(() => {
    if (state.gameOver) return;
    if (state.stock.length > 0) {
      makeMove({ type: 'draw' } as TriPeaksMove);
    }
  }, [state, makeMove]);

  // ── Render ────────────────────────────────────────────────────────────────

  const stockX = CENTER_X - CARD_W - 10;
  const wasteX = CENTER_X + 10;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      flex: 1, background: 'var(--bg)', padding: '8px 0',
    }}>
      {/* Top controls */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', maxWidth: BOARD_W, padding: '0 12px', marginBottom: 8,
      }}>
        <button onClick={onQuit} className="action-btn secondary" style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', fontSize: 12,
        }}>
          <ArrowLeft size={14} /> Back
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
          <span>Score: {Math.max(0, state.score)}</span>
          <span>{formatTime(elapsed)}</span>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Moves: {state.moveCount}</span>
          {/* Chain combo counter */}
          {state.chain > 0 && (
            <span style={{
              fontSize: 12, fontWeight: 900,
              color: state.chain >= 5 ? '#f59e0b' : state.chain >= 3 ? '#22c55e' : 'var(--accent, #4ecdc4)',
              background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '2px 8px',
            }}>
              x{state.chain}
            </span>
          )}
          {/* Peak clearance indicators */}
          <span style={{ display: 'flex', gap: 3 }}>
            {peakStatus.map((cleared, i) => (
              <span
                key={i}
                style={{
                  display: 'inline-block', width: 10, height: 10,
                  borderRadius: '50%',
                  background: cleared ? '#22c55e' : 'rgba(255,255,255,0.2)',
                  border: cleared ? '1px solid #16a34a' : '1px solid rgba(255,255,255,0.1)',
                }}
                title={`Peak ${i + 1}: ${cleared ? 'Cleared' : 'Active'}`}
              />
            ))}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={requestHint} className="action-btn secondary" style={{
            padding: '6px 8px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 3,
          }} title="Hint">
            <Lightbulb size={14} />
          </button>
          <button onClick={undo} disabled={undoStack.length === 0} className="action-btn secondary" style={{
            padding: '6px 8px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 3,
            opacity: undoStack.length === 0 ? 0.4 : 1,
          }} title="Undo">
            <Undo2 size={14} />
          </button>
          <button onClick={() => useSolitaireStore.getState().startNewGame('tripeaks')} className="action-btn secondary" style={{
            padding: '6px 8px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 3,
          }} title="New Game">
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* SVG Board */}
      <svg
        viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
        style={{
          width: '100%', maxWidth: BOARD_W, height: 'auto',
          userSelect: 'none',
        }}
      >
        {/* Background */}
        <rect width={BOARD_W} height={BOARD_H} rx={12} fill="var(--board-bg, #0f5132)" />

        {/* ── Peak cards ─────────────────────────────────────────── */}
        {state.peaks.map((cardId, index) => {
          if (cardId === null) return null;

          // Removed cards are invisible
          if (state.removed[index]) return null;

          const { x, y } = peakCardPos(index);
          const exposed = isExposed(index, state.removed);
          const isFaceUp = state.faceUp[index];

          // Can this card be clicked to remove?
          const canRemove = exposed && isFaceUp &&
            legalMoves.some(m => m.type === 'remove' && m.index === index);

          return (
            <Card
              key={`peak-${index}`}
              id={cardId}
              x={x}
              y={y}
              faceUp={isFaceUp}
              highlighted={index === hintIndex}
              onClick={canRemove ? () => handlePeakCardClick(index) : undefined}
              dimmed={isFaceUp && exposed && !canRemove}
            />
          );
        })}

        {/* ── Stock pile ──────────────────────────────────────────── */}
        {state.stock.length > 0 ? (
          <Card
            id={0}
            x={stockX}
            y={STOCK_Y}
            faceUp={false}
            onClick={handleStockClick}
            highlighted={hintIsStock}
          />
        ) : (
          <EmptyPile
            x={stockX}
            y={STOCK_Y}
            label="empty"
          />
        )}

        {/* Stock count label */}
        <text
          x={stockX + CARD_W / 2}
          y={STOCK_Y + CARD_H + 14}
          fontSize={11}
          fill="rgba(255,255,255,0.5)"
          textAnchor="middle"
          fontFamily="var(--font)"
        >
          {state.stock.length}
        </text>

        {/* ── Waste pile ──────────────────────────────────────────── */}
        {state.waste.length > 0 ? (
          <Card
            id={state.waste[state.waste.length - 1]}
            x={wasteX}
            y={STOCK_Y}
            faceUp
          />
        ) : (
          <EmptyPile
            x={wasteX}
            y={STOCK_Y}
          />
        )}

        {/* Chain combo display on board */}
        {state.chain > 1 && (
          <text
            x={wasteX + CARD_W + 16}
            y={STOCK_Y + CARD_H / 2 + 4}
            fontSize={state.chain >= 5 ? 22 : 18}
            fontWeight={900}
            fill={state.chain >= 5 ? '#f59e0b' : state.chain >= 3 ? '#22c55e' : 'var(--accent, #4ecdc4)'}
            fontFamily="var(--font)"
            opacity={0.9}
          >
            {state.chain}x combo!
          </text>
        )}
      </svg>

      {/* Win overlay */}
      {state.won && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100,
        }}>
          <div style={{
            background: 'var(--surface)', borderRadius: 20, padding: '32px 40px',
            textAlign: 'center', animation: 'slide-up 0.4s ease-out',
            border: '1px solid var(--glass-border)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
            <h2 style={{ color: 'var(--text)', margin: '0 0 8px', fontSize: 24, fontWeight: 900 }}>
              All Peaks Cleared!
            </h2>
            <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>
              <div>Score: <strong>{state.score}</strong></div>
              <div>Moves: <strong>{state.moveCount}</strong></div>
              <div>Time: <strong>{formatTime(elapsed)}</strong></div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="action-btn primary"
                style={{ flex: 1 }}
                onClick={() => useSolitaireStore.getState().startNewGame('tripeaks')}
              >
                New Game
              </button>
              <button className="action-btn secondary" style={{ flex: 1 }} onClick={onQuit}>
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game over (no moves) overlay */}
      {!state.won && state.gameOver && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100,
        }}>
          <div style={{
            background: 'var(--surface)', borderRadius: 20, padding: '32px 40px',
            textAlign: 'center', animation: 'slide-up 0.4s ease-out',
            border: '1px solid var(--glass-border)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>😔</div>
            <h2 style={{ color: 'var(--text)', margin: '0 0 8px', fontSize: 24, fontWeight: 900 }}>
              No More Moves
            </h2>
            <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 8 }}>
              <div>Score: <strong>{state.score}</strong></div>
              <div>Cards remaining: <strong>{remainingCards}</strong></div>
              <div>Peaks cleared: <strong>{peakStatus.filter(Boolean).length}/3</strong></div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button
                className="action-btn primary"
                style={{ flex: 1 }}
                onClick={() => useSolitaireStore.getState().startNewGame('tripeaks')}
              >
                New Game
              </button>
              <button className="action-btn secondary" style={{ flex: 1 }} onClick={undo}>
                Undo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
