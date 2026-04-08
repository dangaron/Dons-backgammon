/**
 * FreeCell board — 4 free cells, 4 foundations, 8 tableau columns.
 * All cards face-up. Click-to-select, click-to-move interaction.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useSolitaireStore } from '../store/gameStore';
import { getFreeCellLegalMoves } from '../engine/freecell';
import type { FreeCellMove } from '../engine/freecell';
import { Card, EmptyPile, CARD_W, CARD_H } from './CardRenderer';
import { suitSymbol } from '../engine/deck';
import type { Suit } from '../engine/types';
import { ArrowLeft, Undo2, Lightbulb, RotateCcw } from 'lucide-react';

// ── Layout constants ────────────────────────────────────────────────────────────
const PADDING = 12;
const GAP = 10;
const COLS = 8;
const BOARD_W = COLS * CARD_W + (COLS - 1) * GAP + 2 * PADDING;
const TOP_ROW_Y = PADDING;
const TABLEAU_Y = PADDING + CARD_H + 20;
const FACE_UP_OFFSET = 20;

const FOUNDATION_SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

interface FreeCellBoardProps {
  onQuit: () => void;
}

export function FreeCellBoard({ onQuit }: FreeCellBoardProps) {
  const { freecellState, makeMove, undo, undoStack, requestHint, hintMove, clearHint } = useSolitaireStore();
  const [selected, setSelected] = useState<{
    source: 'tableau' | 'freecell';
    index: number;        // column or free cell index
    cardIndex?: number;   // index within tableau column (for multi-card selection)
  } | null>(null);

  // Guard: if no state, render nothing
  if (!freecellState) return null;
  const gs = freecellState;

  const legalMoves = useMemo(() => getFreeCellLegalMoves(gs), [gs]);

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
    return Math.max(...gs.tableau.map(col => col.length * FACE_UP_OFFSET), CARD_H);
  }, [gs]);

  const boardH = TABLEAU_Y + maxTableauCards + CARD_H + PADDING;

  // ── Pile x positions ──────────────────────────────────────────────────────────
  const pileX = (i: number) => PADDING + i * (CARD_W + GAP);

  // ── Selection & move logic ────────────────────────────────────────────────────

  const findMovesForSelection = useCallback((
    source: 'tableau' | 'freecell', index: number, count?: number
  ): FreeCellMove[] => {
    return legalMoves.filter(m => {
      if (source === 'tableau') {
        if (m.type === 'tableau-to-tableau' && m.from === index) {
          if (count !== undefined) return m.count === count;
          return true;
        }
        if (m.type === 'tableau-to-freecell' && m.from === index) return count === undefined || count === 1;
        if (m.type === 'tableau-to-foundation' && m.from === index) return count === undefined || count === 1;
        return false;
      }
      if (source === 'freecell') {
        if (m.type === 'freecell-to-tableau' && m.from === index) return true;
        if (m.type === 'freecell-to-foundation' && m.from === index) return true;
        return false;
      }
      return false;
    });
  }, [legalMoves]);

  const handleTableauCardClick = useCallback((col: number, cardIndex: number) => {
    if (gs.gameOver) return;

    const count = gs.tableau[col].length - cardIndex;

    // Clicking same selection: deselect
    if (selected && selected.source === 'tableau' && selected.index === col && selected.cardIndex === cardIndex) {
      setSelected(null);
      return;
    }

    // If we have a selection, try to move to this column
    if (selected) {
      let targetMove: FreeCellMove | undefined;

      if (selected.source === 'tableau') {
        const selectedCount = gs.tableau[selected.index].length - (selected.cardIndex ?? gs.tableau[selected.index].length - 1);
        const possibleMoves = findMovesForSelection('tableau', selected.index, selectedCount);
        targetMove = possibleMoves.find(m =>
          m.type === 'tableau-to-tableau' && m.to === col
        );
      } else if (selected.source === 'freecell') {
        const possibleMoves = findMovesForSelection('freecell', selected.index);
        targetMove = possibleMoves.find(m =>
          m.type === 'freecell-to-tableau' && m.to === col
        );
      }

      if (targetMove) {
        makeMove(targetMove);
        setSelected(null);
        return;
      }
    }

    // Try selecting this card/run
    const moves = findMovesForSelection('tableau', col, count);
    if (moves.length > 0) {
      setSelected({ source: 'tableau', index: col, cardIndex });
    } else {
      setSelected(null);
    }
  }, [selected, gs.gameOver, gs.tableau, findMovesForSelection, makeMove]);

  const handleTableauDoubleClick = useCallback((col: number) => {
    if (gs.gameOver) return;

    // Auto-move top card to foundation
    const move = legalMoves.find(m =>
      m.type === 'tableau-to-foundation' && m.from === col
    );
    if (move) {
      makeMove(move);
      setSelected(null);
    }
  }, [gs.gameOver, legalMoves, makeMove]);

  const handleEmptyColumnClick = useCallback((col: number) => {
    if (gs.gameOver || !selected) return;

    let targetMove: FreeCellMove | undefined;

    if (selected.source === 'tableau') {
      const selectedCount = gs.tableau[selected.index].length - (selected.cardIndex ?? gs.tableau[selected.index].length - 1);
      const possibleMoves = findMovesForSelection('tableau', selected.index, selectedCount);
      targetMove = possibleMoves.find(m =>
        m.type === 'tableau-to-tableau' && m.to === col
      );
    } else if (selected.source === 'freecell') {
      const possibleMoves = findMovesForSelection('freecell', selected.index);
      targetMove = possibleMoves.find(m =>
        m.type === 'freecell-to-tableau' && m.to === col
      );
    }

    if (targetMove) {
      makeMove(targetMove);
      setSelected(null);
    }
  }, [gs.gameOver, gs.tableau, selected, findMovesForSelection, makeMove]);

  const handleFreeCellClick = useCallback((cellIndex: number) => {
    if (gs.gameOver) return;

    const card = gs.freeCells[cellIndex];

    // If clicking an occupied free cell
    if (card !== null) {
      // Same selection: deselect
      if (selected && selected.source === 'freecell' && selected.index === cellIndex) {
        setSelected(null);
        return;
      }

      // Try selecting it
      const moves = findMovesForSelection('freecell', cellIndex);
      if (moves.length > 0) {
        setSelected({ source: 'freecell', index: cellIndex });
      } else {
        setSelected(null);
      }
      return;
    }

    // Empty free cell: try moving selected card here
    if (selected && selected.source === 'tableau') {
      const possibleMoves = findMovesForSelection('tableau', selected.index, 1);
      const targetMove = possibleMoves.find(m =>
        m.type === 'tableau-to-freecell' && m.to === cellIndex
      );
      // Also check moves without specific count (just top card)
      const altMove = !targetMove ? legalMoves.find(m =>
        m.type === 'tableau-to-freecell' && m.from === selected.index
      ) : undefined;

      if (targetMove || altMove) {
        makeMove((targetMove || altMove)!);
        setSelected(null);
      }
    }
  }, [gs.gameOver, gs.freeCells, selected, findMovesForSelection, legalMoves, makeMove]);

  const handleFreeCellDoubleClick = useCallback((cellIndex: number) => {
    if (gs.gameOver) return;

    const move = legalMoves.find(m =>
      m.type === 'freecell-to-foundation' && m.from === cellIndex
    );
    if (move) {
      makeMove(move);
      setSelected(null);
    }
  }, [gs.gameOver, legalMoves, makeMove]);

  const handleFoundationClick = useCallback((foundationIndex: number) => {
    if (gs.gameOver || !selected) return;

    let targetMove: FreeCellMove | undefined;

    if (selected.source === 'tableau') {
      const possibleMoves = findMovesForSelection('tableau', selected.index, 1);
      targetMove = possibleMoves.find(m =>
        m.type === 'tableau-to-foundation' && m.to === foundationIndex
      );
      // Also check without count constraint
      if (!targetMove) {
        targetMove = legalMoves.find(m =>
          m.type === 'tableau-to-foundation' && m.from === selected.index && m.to === foundationIndex
        );
      }
    } else if (selected.source === 'freecell') {
      const possibleMoves = findMovesForSelection('freecell', selected.index);
      targetMove = possibleMoves.find(m =>
        m.type === 'freecell-to-foundation' && m.to === foundationIndex
      );
    }

    if (targetMove) {
      makeMove(targetMove);
      setSelected(null);
    }
  }, [gs.gameOver, selected, findMovesForSelection, legalMoves, makeMove]);

  // ── Destinations for highlighting ─────────────────────────────────────────────

  const destinations = useMemo(() => {
    if (!selected) return new Set<string>();

    let count: number | undefined;
    if (selected.source === 'tableau' && selected.cardIndex !== undefined) {
      count = gs.tableau[selected.index].length - selected.cardIndex;
    }

    const moves = findMovesForSelection(selected.source, selected.index, count);
    const dests = new Set<string>();

    for (const m of moves) {
      if (m.type === 'tableau-to-tableau' || m.type === 'freecell-to-tableau') {
        dests.add(`tableau-${m.to}`);
      }
      if (m.type === 'tableau-to-foundation' || m.type === 'freecell-to-foundation') {
        dests.add(`foundation-${m.to}`);
      }
      if (m.type === 'tableau-to-freecell') {
        dests.add(`freecell-${m.to}`);
      }
    }
    return dests;
  }, [selected, gs.tableau, findMovesForSelection]);

  // ── Hint highlighting ─────────────────────────────────────────────────────────

  const hintSource = useMemo(() => {
    if (!hintMove) return null;
    const h = hintMove as FreeCellMove;
    switch (h.type) {
      case 'tableau-to-tableau':
      case 'tableau-to-freecell':
      case 'tableau-to-foundation':
        return `tableau-${h.from}`;
      case 'freecell-to-tableau':
      case 'freecell-to-foundation':
        return `freecell-${h.from}`;
      default:
        return null;
    }
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
          <button onClick={() => useSolitaireStore.getState().startNewGame('freecell')} className="action-btn secondary" style={{
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

        {/* ── Top row: 4 Free Cells (left) + 4 Foundations (right) ────────── */}

        {/* Free cells (slots 0-3) */}
        {[0, 1, 2, 3].map(fc => {
          const x = pileX(fc);
          const card = gs.freeCells[fc];
          const isHighlighted = destinations.has(`freecell-${fc}`);
          const isHintSource = hintSource === `freecell-${fc}`;

          if (card === null) {
            return (
              <EmptyPile
                key={`freecell-${fc}`}
                x={x} y={TOP_ROW_Y}
                label="FC"
                onClick={() => handleFreeCellClick(fc)}
                highlighted={isHighlighted}
              />
            );
          }

          return (
            <Card
              key={`freecell-${fc}`}
              id={card}
              x={x} y={TOP_ROW_Y}
              faceUp
              selected={selected?.source === 'freecell' && selected?.index === fc}
              highlighted={isHighlighted || isHintSource}
              onClick={() => handleFreeCellClick(fc)}
              onDoubleClick={() => handleFreeCellDoubleClick(fc)}
            />
          );
        })}

        {/* Foundations (slots 4-7) */}
        {[0, 1, 2, 3].map(f => {
          const x = pileX(4 + f);
          const foundation = gs.foundations[f];
          const isHighlighted = destinations.has(`foundation-${f}`);

          if (foundation.length === 0) {
            return (
              <EmptyPile
                key={`foundation-${f}`}
                x={x} y={TOP_ROW_Y}
                label={suitSymbol(FOUNDATION_SUITS[f])}
                onClick={() => handleFoundationClick(f)}
                highlighted={isHighlighted}
              />
            );
          }

          const topCard = foundation[foundation.length - 1];
          return (
            <Card
              key={`foundation-${f}`}
              id={topCard}
              x={x} y={TOP_ROW_Y}
              faceUp
              highlighted={isHighlighted}
              onClick={() => handleFoundationClick(f)}
            />
          );
        })}

        {/* ── Tableau ─────────────────────────────────────────────── */}
        {gs.tableau.map((col, colIdx) => {
          const x = pileX(colIdx);
          const isDestination = destinations.has(`tableau-${colIdx}`);
          const isHintCol = hintSource === `tableau-${colIdx}`;

          if (col.length === 0) {
            return (
              <EmptyPile
                key={`tableau-${colIdx}`}
                x={x} y={TABLEAU_Y}
                onClick={() => handleEmptyColumnClick(colIdx)}
                highlighted={isDestination}
              />
            );
          }

          const elements: React.ReactNode[] = [];

          col.forEach((cardId, i) => {
            const y = TABLEAU_Y + i * FACE_UP_OFFSET;
            const isTop = i === col.length - 1;
            const isSelected = selected !== null &&
              selected.source === 'tableau' &&
              selected.index === colIdx &&
              selected.cardIndex !== undefined &&
              i >= selected.cardIndex;

            elements.push(
              <Card
                key={`t-${colIdx}-${i}`}
                id={cardId}
                x={x} y={y}
                faceUp
                selected={isSelected}
                highlighted={isDestination || isHintCol}
                onClick={() => handleTableauCardClick(colIdx, i)}
                onDoubleClick={isTop ? () => handleTableauDoubleClick(colIdx) : undefined}
              />
            );
          });

          return <g key={`tableau-${colIdx}`}>{elements}</g>;
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
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="action-btn primary"
                style={{ flex: 1 }}
                onClick={() => useSolitaireStore.getState().startNewGame('freecell')}
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
                onClick={() => useSolitaireStore.getState().startNewGame('freecell')}
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
