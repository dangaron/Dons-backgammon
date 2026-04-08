/**
 * Pyramid Solitaire board — SVG rendering with click-to-pair interaction.
 * 7-row pyramid of cards; pair cards summing to 13 to remove them.
 * Kings (rank 13) auto-remove on single click.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSolitaireStore } from '../store/gameStore';
import { getPyramidLegalMoves } from '../engine/pyramid';
import type { PyramidMove } from '../engine/pyramid';
import { rankOf } from '../engine/deck';
import { Card, EmptyPile, CARD_W, CARD_H } from './CardRenderer';
import { ArrowLeft, Undo2, Lightbulb, RotateCcw } from 'lucide-react';

// ── Layout constants ────────────────────────────────────────────────────────────
const PADDING = 16;
const BOARD_W = 520;
const CENTER_X = BOARD_W / 2;
const PYRAMID_TOP_Y = PADDING + 10;
const CARD_OVERLAP_X = CARD_W * 0.6;
const CARD_OVERLAP_Y = CARD_H * 0.35;
const STOCK_Y = PYRAMID_TOP_Y + 7 * CARD_OVERLAP_Y + CARD_H + 20;
const BOARD_H = STOCK_Y + CARD_H + PADDING;

// ── Pyramid layout helpers ──────────────────────────────────────────────────────

function rowOf(index: number): number {
  let row = 0;
  let start = 0;
  while (start + row + 1 <= index) {
    start += row + 1;
    row++;
  }
  return row;
}

function colOf(index: number): number {
  const r = rowOf(index);
  const rowStart = (r * (r + 1)) / 2;
  return index - rowStart;
}

function childrenOf(index: number): number[] {
  const r = rowOf(index);
  if (r >= 6) return [];
  const posInRow = colOf(index);
  const nextRowStart = ((r + 1) * (r + 2)) / 2;
  return [nextRowStart + posInRow, nextRowStart + posInRow + 1];
}

function isExposed(index: number, removed: boolean[]): boolean {
  if (removed[index]) return false;
  const children = childrenOf(index);
  return children.every(c => removed[c]);
}

function pyramidCardPos(index: number): { x: number; y: number } {
  const r = rowOf(index);
  const c = colOf(index);
  return {
    x: CENTER_X - (CARD_W / 2) + (c - r / 2) * CARD_OVERLAP_X,
    y: PYRAMID_TOP_Y + r * CARD_OVERLAP_Y,
  };
}

// ── Component ───────────────────────────────────────────────────────────────────

interface PyramidBoardProps {
  onQuit: () => void;
}

export function PyramidBoard({ onQuit }: PyramidBoardProps) {
  const {
    pyramidState,
    makeMove,
    undo,
    undoStack,
    requestHint,
    hintMove,
    clearHint,
    gameStartTime,
  } = useSolitaireStore();

  const [selected, setSelected] = useState<number | null>(null);

  // If no state, show nothing
  if (!pyramidState) return null;

  const state = pyramidState;
  const legalMoves = useMemo(() => getPyramidLegalMoves(state), [state]);

  // Clear hint on state change
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => { clearHint(); setSelected(null); }, [state, clearHint]);

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

  // Count remaining pyramid cards
  const remainingCards = useMemo(
    () => state.removed.filter(r => !r).length,
    [state.removed],
  );

  // ── Hint highlight ────────────────────────────────────────────────────────

  const hintPyramidMove = hintMove as PyramidMove | null;
  const hintIndices = useMemo(() => {
    const s = new Set<number>();
    if (!hintPyramidMove) return s;
    if (hintPyramidMove.index !== undefined) s.add(hintPyramidMove.index);
    if (hintPyramidMove.index2 !== undefined) s.add(hintPyramidMove.index2);
    return s;
  }, [hintPyramidMove]);

  const hintIsStock = hintPyramidMove?.type === 'draw';
  const hintIsWaste = hintPyramidMove?.type === 'pair-pyramid-waste';

  // ── Click handlers ────────────────────────────────────────────────────────

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handlePyramidCardClick = useCallback((index: number) => {
    if (state.gameOver) return;
    if (!isExposed(index, state.removed)) return;

    const card = state.pyramid[index];
    if (card === null) return;

    // King auto-remove
    if (rankOf(card) === 13) {
      const move = legalMoves.find(m => m.type === 'remove-king' && m.index === index);
      if (move) {
        makeMove(move);
        setSelected(null);
        return;
      }
    }

    // If we already have a selection, try to pair
    if (selected !== null && selected !== index) {
      // Try pyramid-pyramid pair
      const pairMove = legalMoves.find(
        m => m.type === 'pair-pyramid' &&
          ((m.index === selected && m.index2 === index) ||
           (m.index === index && m.index2 === selected)),
      );
      if (pairMove) {
        makeMove(pairMove);
        setSelected(null);
        return;
      }
      // No valid pair; select this card instead
    }

    // Select/deselect
    if (selected === index) {
      setSelected(null);
    } else {
      setSelected(index);
    }
  }, [state, selected, legalMoves, makeMove]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handleWasteClick = useCallback(() => {
    if (state.gameOver || state.waste.length === 0) return;

    // King on waste top auto-remove is not a thing in pyramid; waste kings just sit there.
    // If we have a pyramid card selected, try to pair with waste
    if (selected !== null) {
      const move = legalMoves.find(
        m => m.type === 'pair-pyramid-waste' && m.index === selected,
      );
      if (move) {
        makeMove(move);
        setSelected(null);
        return;
      }
    }

    // Otherwise, if waste card is selected, try to pair with next clicked pyramid card
    // We use a special sentinel: selected = -1 means "waste is selected"
    if (selected === -1) {
      setSelected(null);
    } else {
      // Check if any pyramid card can pair with waste
      const canPairWithWaste = legalMoves.some(m => m.type === 'pair-pyramid-waste');
      if (canPairWithWaste) {
        setSelected(-1);
      }
    }
  }, [state, selected, legalMoves, makeMove]);

  // Handle clicking a pyramid card when waste is selected
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handlePyramidCardClickWithWaste = useCallback((index: number) => {
    if (state.gameOver) return;
    if (!isExposed(index, state.removed)) return;

    const card = state.pyramid[index];
    if (card === null) return;

    // King auto-remove (always takes priority)
    if (rankOf(card) === 13) {
      const move = legalMoves.find(m => m.type === 'remove-king' && m.index === index);
      if (move) {
        makeMove(move);
        setSelected(null);
        return;
      }
    }

    // If waste is selected (selected === -1), try pair-pyramid-waste
    if (selected === -1) {
      const move = legalMoves.find(m => m.type === 'pair-pyramid-waste' && m.index === index);
      if (move) {
        makeMove(move);
        setSelected(null);
        return;
      }
      // Can't pair; select this pyramid card instead
      setSelected(index);
      return;
    }

    // Delegate to normal handler
    handlePyramidCardClick(index);
  }, [state, selected, legalMoves, makeMove, handlePyramidCardClick]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handleStockClick = useCallback(() => {
    if (state.gameOver) return;
    setSelected(null);
    if (state.stock.length > 0) {
      makeMove({ type: 'draw' } as PyramidMove);
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
          <span>Score: {Math.max(0, state.score)}</span>
          <span>{formatTime(elapsed)}</span>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Moves: {state.moveCount}</span>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Left: {remainingCards}</span>
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
          <button onClick={() => useSolitaireStore.getState().startNewGame('pyramid')} className="action-btn secondary" style={{
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

        {/* ── Pyramid cards ──────────────────────────────────────── */}
        {state.pyramid.map((cardId, index) => {
          if (cardId === null) return null;

          // Removed cards are invisible
          if (state.removed[index]) return null;

          const { x, y } = pyramidCardPos(index);
          const exposed = isExposed(index, state.removed);

          return (
            <Card
              key={`pyr-${index}`}
              id={cardId}
              x={x}
              y={y}
              faceUp
              selected={selected === index}
              highlighted={hintIndices.has(index)}
              onClick={exposed ? () => handlePyramidCardClickWithWaste(index) : undefined}
              dimmed={!exposed}
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
            selected={selected === -1}
            highlighted={hintIsWaste}
            onClick={handleWasteClick}
          />
        ) : (
          <EmptyPile
            x={wasteX}
            y={STOCK_Y}
          />
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
              Pyramid Cleared!
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
                onClick={() => useSolitaireStore.getState().startNewGame('pyramid')}
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
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button
                className="action-btn primary"
                style={{ flex: 1 }}
                onClick={() => useSolitaireStore.getState().startNewGame('pyramid')}
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
