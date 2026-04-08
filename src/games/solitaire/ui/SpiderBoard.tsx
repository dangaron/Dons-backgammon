/**
 * Spider Solitaire board — 10-column tableau with stock pile.
 * Click-to-select, click-to-move interaction (matching Klondike pattern).
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useSolitaireStore } from '../store/gameStore';
import { getSpiderLegalMoves } from '../engine/spider';
import type { SpiderMove } from '../engine/spider';
import { Card, EmptyPile, CARD_W, CARD_H } from './CardRenderer';
import { ArrowLeft, Undo2, Lightbulb, RotateCcw } from 'lucide-react';

// ── Layout constants ────────────────────────────────────────────────────────────
const PADDING = 12;
const GAP = 8;
const COLS = 10;
const BOARD_W = COLS * CARD_W + (COLS - 1) * GAP + 2 * PADDING;
const TOP_ROW_Y = PADDING;
const TABLEAU_Y = PADDING + CARD_H + 20;
const FACE_DOWN_OFFSET = 4;
const FACE_UP_OFFSET = 20;

interface SpiderBoardProps {
  onQuit: () => void;
}

export function SpiderBoard({ onQuit }: SpiderBoardProps) {
  const { spiderState, makeMove, undo, undoStack, requestHint, hintMove, clearHint } = useSolitaireStore();
  const [selected, setSelected] = useState<{ col: number; cardIndex: number } | null>(null);

  // Guard: if no state, render nothing
  if (!spiderState) return null;
  const gs = spiderState;

  const legalMoves = useMemo(() => getSpiderLegalMoves(gs), [gs]);

  // Clear hint on state change
  useEffect(() => { clearHint(); }, [gs, clearHint]);

  // Elapsed time
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (gs.gameOver) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - gs.startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [gs.startTime, gs.gameOver]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Dynamic SVG height
  const maxTableauCards = useMemo(() => {
    return Math.max(...gs.tableau.map(p =>
      p.faceDown.length * FACE_DOWN_OFFSET + p.faceUp.length * FACE_UP_OFFSET
    ), CARD_H);
  }, [gs]);

  const boardH = TABLEAU_Y + maxTableauCards + CARD_H + PADDING;

  // Stock pile info
  const stockDealsRemaining = Math.ceil(gs.stock.length / 10);
  const allColumnsNonEmpty = gs.tableau.every(
    pile => pile.faceUp.length > 0 || pile.faceDown.length > 0
  );
  const canDealStock = gs.stock.length > 0 && allColumnsNonEmpty;

  // ── Pile x positions ──────────────────────────────────────────────────────────
  const pileX = (i: number) => PADDING + i * (CARD_W + GAP);

  // ── Selection & move logic ────────────────────────────────────────────────────

  /**
   * Given a face-up card index within a column, figure out how many cards
   * from the bottom of the run can be moved (same-suit descending).
   * `faceUpIdx` is the index within `pile.faceUp`.
   */
  const getRunCountFromIndex = useCallback((col: number, faceUpIdx: number): number => {
    const pile = gs.tableau[col];
    // count = number of cards from faceUpIdx to end of faceUp
    return pile.faceUp.length - faceUpIdx;
  }, [gs]);

  const findMovesForSelection = useCallback((col: number, count: number): SpiderMove[] => {
    return legalMoves.filter(m => {
      if (m.type === 'tableau-to-tableau' && m.from === col && m.count === count) return true;
      return false;
    });
  }, [legalMoves]);

  const handleCardClick = useCallback((col: number, faceUpIdx: number) => {
    if (gs.gameOver) return;

    const count = getRunCountFromIndex(col, faceUpIdx);

    // If clicking the same selection, deselect
    if (selected && selected.col === col && selected.cardIndex === faceUpIdx) {
      setSelected(null);
      return;
    }

    // If we have a selection and clicking a destination
    if (selected) {
      const selectedCount = getRunCountFromIndex(selected.col, selected.cardIndex);
      const possibleMoves = findMovesForSelection(selected.col, selectedCount);

      // Find a move targeting this column
      const targetMove = possibleMoves.find(m => m.to === col);
      if (targetMove) {
        makeMove(targetMove);
        setSelected(null);
        return;
      }
    }

    // Try to select this card if there are valid moves for the run starting here
    const moves = findMovesForSelection(col, count);
    if (moves.length > 0) {
      setSelected({ col, cardIndex: faceUpIdx });
    } else {
      setSelected(null);
    }
  }, [selected, gs.gameOver, getRunCountFromIndex, findMovesForSelection, makeMove]);

  const handleEmptyColumnClick = useCallback((col: number) => {
    if (gs.gameOver || !selected) return;

    const selectedCount = getRunCountFromIndex(selected.col, selected.cardIndex);
    const possibleMoves = findMovesForSelection(selected.col, selectedCount);
    const targetMove = possibleMoves.find(m => m.to === col);

    if (targetMove) {
      makeMove(targetMove);
      setSelected(null);
    }
  }, [gs.gameOver, selected, getRunCountFromIndex, findMovesForSelection, makeMove]);

  const handleStockClick = useCallback(() => {
    if (gs.gameOver || !canDealStock) return;
    setSelected(null);
    makeMove({ type: 'deal-stock' } as SpiderMove);
  }, [gs.gameOver, canDealStock, makeMove]);

  // ── Destinations for highlighting ─────────────────────────────────────────────

  const destinations = useMemo(() => {
    if (!selected) return new Set<number>();
    const count = getRunCountFromIndex(selected.col, selected.cardIndex);
    const moves = findMovesForSelection(selected.col, count);
    const dests = new Set<number>();
    for (const m of moves) {
      if (m.type === 'tableau-to-tableau' && m.to !== undefined) {
        dests.add(m.to);
      }
    }
    return dests;
  }, [selected, getRunCountFromIndex, findMovesForSelection]);

  // ── Hint highlighting ─────────────────────────────────────────────────────────

  const hintSource = useMemo(() => {
    if (!hintMove) return null;
    const h = hintMove as SpiderMove;
    if (h.type === 'tableau-to-tableau' && h.from !== undefined) {
      return { col: h.from, count: h.count ?? 1 };
    }
    if (h.type === 'deal-stock') return { stock: true };
    return null;
  }, [hintMove]);

  // ── Render ────────────────────────────────────────────────────────────────────

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
          <span>Score: {Math.max(0, gs.score)}</span>
          <span>{formatTime(elapsed)}</span>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Moves: {gs.moveCount}</span>
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
          <button onClick={() => useSolitaireStore.getState().startNewGame('spider', { suitCount: gs.suitCount })} className="action-btn secondary" style={{
            padding: '6px 8px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 3,
          }} title="New Game">
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* SVG Board */}
      <svg
        viewBox={`0 0 ${BOARD_W} ${boardH}`}
        style={{
          width: '100%', maxWidth: BOARD_W, height: 'auto',
          userSelect: 'none',
        }}
      >
        {/* Background */}
        <rect width={BOARD_W} height={boardH} rx={12} fill="var(--board-bg, #0f5132)" />

        {/* ── Top row: Completed sequences counter (left) + Stock pile (right) ── */}

        {/* Completed sequences counter */}
        <g transform={`translate(${pileX(0)},${TOP_ROW_Y})`}>
          <rect
            width={CARD_W * 2 + GAP} height={CARD_H} rx={6}
            fill="none"
            stroke="var(--card-empty, rgba(255,255,255,0.15))"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
          <text
            x={(CARD_W * 2 + GAP) / 2} y={CARD_H / 2 - 8}
            fontSize={14} fontWeight={900} fill="rgba(255,255,255,0.7)"
            textAnchor="middle" fontFamily="var(--font)"
          >
            Completed
          </text>
          <text
            x={(CARD_W * 2 + GAP) / 2} y={CARD_H / 2 + 16}
            fontSize={22} fontWeight={900} fill="rgba(255,255,255,0.9)"
            textAnchor="middle" fontFamily="var(--font)"
          >
            {gs.completedSequences} / 8
          </text>
        </g>

        {/* Stock pile (top right) */}
        {gs.stock.length > 0 ? (
          <g>
            <Card
              id={0} x={pileX(9)} y={TOP_ROW_Y} faceUp={false}
              onClick={canDealStock ? handleStockClick : undefined}
              highlighted={hintSource !== null && 'stock' in hintSource}
            />
            {/* Deals remaining label */}
            <text
              x={pileX(9) + CARD_W / 2} y={TOP_ROW_Y + CARD_H + 14}
              fontSize={11} fontWeight={700} fill="rgba(255,255,255,0.6)"
              textAnchor="middle" fontFamily="var(--font)"
            >
              {stockDealsRemaining} deal{stockDealsRemaining !== 1 ? 's' : ''} left
            </text>
            {!canDealStock && (
              <text
                x={pileX(9) + CARD_W / 2} y={TOP_ROW_Y + CARD_H + 26}
                fontSize={9} fill="rgba(255,200,200,0.6)"
                textAnchor="middle" fontFamily="var(--font)"
              >
                fill all columns first
              </text>
            )}
          </g>
        ) : (
          <EmptyPile x={pileX(9)} y={TOP_ROW_Y} />
        )}

        {/* ── Tableau ─────────────────────────────────────────────── */}
        {gs.tableau.map((pile, col) => {
          const x = pileX(col);
          let y = TABLEAU_Y;
          const isDestination = destinations.has(col);

          if (pile.faceDown.length === 0 && pile.faceUp.length === 0) {
            return (
              <EmptyPile
                key={`tableau-${col}`}
                x={x} y={y}
                onClick={() => handleEmptyColumnClick(col)}
                highlighted={isDestination}
              />
            );
          }

          const elements: React.ReactNode[] = [];

          // Face-down cards
          pile.faceDown.forEach((cardId, i) => {
            elements.push(
              <Card key={`td-${col}-${i}`} id={cardId} x={x} y={y} faceUp={false} />
            );
            y += FACE_DOWN_OFFSET;
          });

          // Face-up cards
          pile.faceUp.forEach((cardId, i) => {
            const isSelected = selected !== null && selected.col === col && i >= selected.cardIndex;
            const isHintCard = hintSource !== null && !('stock' in hintSource) &&
              hintSource.col === col && i >= pile.faceUp.length - hintSource.count;

            elements.push(
              <Card
                key={`tu-${col}-${i}`}
                id={cardId}
                x={x} y={y}
                faceUp
                selected={isSelected}
                highlighted={isDestination || isHintCard}
                onClick={() => handleCardClick(col, i)}
              />
            );
            y += FACE_UP_OFFSET;
          });

          return <g key={`tableau-${col}`}>{elements}</g>;
        })}
      </svg>

      {/* Win overlay */}
      {gs.won && (
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
              You Win!
            </h2>
            <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>
              <div>Score: <strong>{gs.score}</strong></div>
              <div>Moves: <strong>{gs.moveCount}</strong></div>
              <div>Time: <strong>{formatTime(elapsed)}</strong></div>
              <div>Sequences: <strong>{gs.completedSequences}/8</strong></div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="action-btn primary"
                style={{ flex: 1 }}
                onClick={() => useSolitaireStore.getState().startNewGame('spider', { suitCount: gs.suitCount })}
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

      {/* No moves overlay */}
      {!gs.won && gs.gameOver && (
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
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button
                className="action-btn primary"
                style={{ flex: 1 }}
                onClick={() => useSolitaireStore.getState().startNewGame('spider', { suitCount: gs.suitCount })}
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
