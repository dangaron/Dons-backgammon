/**
 * Solitaire board — Klondike layout with SVG rendering.
 * Click-to-select, click-to-move interaction (matching backgammon).
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useSolitaireStore } from '../store/gameStore';
import { getLegalMoves } from '../engine/moves';
import type { SolitaireMove } from '../engine/types';
import { Card, EmptyPile, CARD_W, CARD_H } from './CardRenderer';
import { suitSymbol } from '../engine/deck';
import type { Suit } from '../engine/types';
import { ArrowLeft, Undo2, Lightbulb, RotateCcw } from 'lucide-react';

// ── Layout constants ────────────────────────────────────────────────────────────
const PADDING = 12;
const GAP = 10;
const BOARD_W = 7 * CARD_W + 6 * GAP + 2 * PADDING;
const TOP_ROW_Y = PADDING;
const TABLEAU_Y = PADDING + CARD_H + 20;
const FACE_DOWN_OFFSET = 4;
const FACE_UP_OFFSET = 20;

const FOUNDATION_SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

interface SolitaireBoardProps {
  onQuit: () => void;
}

export function SolitaireBoard({ onQuit }: SolitaireBoardProps) {
  const { klondikeState, makeMove, undo, undoStack, requestHint, hintMove, clearHint } = useSolitaireStore();
  const gameState = klondikeState!;
  const [selected, setSelected] = useState<{ pile: string; index: number } | null>(null);

  const legalMoves = useMemo(() => getLegalMoves(gameState), [gameState]);

  // Clear selection when game state changes
  useEffect(() => { clearHint(); }, [gameState, clearHint]);

  // Elapsed time display
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (gameState.gameOver) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - gameState.startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState.startTime, gameState.gameOver]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Calculate max tableau height for dynamic SVG sizing
  const maxTableauCards = useMemo(() => {
    return Math.max(...gameState.tableau.map((p: { faceDown: unknown[]; faceUp: unknown[] }) =>
      p.faceDown.length * FACE_DOWN_OFFSET + p.faceUp.length * FACE_UP_OFFSET
    ), CARD_H);
  }, [gameState]);

  const boardH = TABLEAU_Y + maxTableauCards + CARD_H + PADDING;

  // ── Selection & move logic ─────────────────────────────────────────────────

  const findMovesForSelection = useCallback((pile: string, index: number): SolitaireMove[] => {
    return legalMoves.filter(m => {
      if (pile === 'waste' && (m.type === 'waste-to-tableau' || m.type === 'waste-to-foundation')) return true;
      if (pile.startsWith('tableau-') && m.type === 'tableau-to-tableau' && m.from === index) return true;
      if (pile.startsWith('tableau-') && m.type === 'tableau-to-foundation' && m.from === index) return true;
      if (pile.startsWith('foundation-') && m.type === 'foundation-to-tableau' && m.from === index) return true;
      return false;
    });
  }, [legalMoves]);

  const handleCardClick = useCallback((pile: string, index: number, cardCount?: number) => {
    if (gameState.gameOver) return;

    // If clicking the same selection, deselect
    if (selected && selected.pile === pile && selected.index === index) {
      setSelected(null);
      return;
    }

    // If we have a selection and clicking a valid destination
    if (selected) {
      const possibleMoves = findMovesForSelection(selected.pile, selected.index);

      // Find a move that targets this destination
      let targetMove: SolitaireMove | undefined;

      if (pile.startsWith('tableau-')) {
        const toIndex = parseInt(pile.split('-')[1]);
        targetMove = possibleMoves.find(m =>
          (m.type === 'waste-to-tableau' || m.type === 'tableau-to-tableau' || m.type === 'foundation-to-tableau')
          && m.to === toIndex
        );
        // For tableau-to-tableau, we might need to match the count
        if (targetMove && targetMove.type === 'tableau-to-tableau' && cardCount !== undefined) {
          targetMove = possibleMoves.find(m =>
            m.type === 'tableau-to-tableau' && m.to === toIndex && m.count === cardCount
          ) || targetMove;
        }
      } else if (pile.startsWith('foundation-')) {
        const toIndex = parseInt(pile.split('-')[1]);
        targetMove = possibleMoves.find(m =>
          (m.type === 'waste-to-foundation' || m.type === 'tableau-to-foundation')
          && m.to === toIndex
        );
      }

      if (targetMove) {
        makeMove(targetMove);
        setSelected(null);
        return;
      }
    }

    // Select this card if it has valid moves
    const moves = findMovesForSelection(pile, index);
    if (moves.length > 0) {
      setSelected({ pile, index });
    } else {
      setSelected(null);
    }
  }, [selected, gameState.gameOver, findMovesForSelection, makeMove]);

  const handleDoubleClick = useCallback((pile: string, index: number) => {
    if (gameState.gameOver) return;

    // Auto-move to foundation on double-click
    let move: SolitaireMove | undefined;
    if (pile === 'waste') {
      move = legalMoves.find(m => m.type === 'waste-to-foundation');
    } else if (pile.startsWith('tableau-')) {
      move = legalMoves.find(m => m.type === 'tableau-to-foundation' && m.from === index);
    }

    if (move) {
      makeMove(move);
      setSelected(null);
    }
  }, [gameState.gameOver, legalMoves, makeMove]);

  const handleStockClick = useCallback(() => {
    if (gameState.gameOver) return;
    setSelected(null);
    if (gameState.stock.length > 0) {
      makeMove({ type: 'draw' });
    } else if (gameState.waste.length > 0) {
      makeMove({ type: 'recycle' });
    }
  }, [gameState.stock.length, gameState.waste.length, gameState.gameOver, makeMove]);

  // ── Determine highlighted destinations ─────────────────────────────────────

  const destinations = useMemo(() => {
    if (!selected) return new Set<string>();
    const moves = findMovesForSelection(selected.pile, selected.index);
    const dests = new Set<string>();
    for (const m of moves) {
      if (m.type === 'waste-to-tableau' || m.type === 'tableau-to-tableau' || m.type === 'foundation-to-tableau') {
        dests.add(`tableau-${m.to}`);
      }
      if (m.type === 'waste-to-foundation' || m.type === 'tableau-to-foundation') {
        dests.add(`foundation-${m.to}`);
      }
    }
    return dests;
  }, [selected, findMovesForSelection]);

  // ── Hint highlight ─────────────────────────────────────────────────────────

  const hintSource = useMemo(() => {
    if (!hintMove) return null;
    const hint = hintMove as SolitaireMove;
    switch (hint.type) {
      case 'waste-to-tableau':
      case 'waste-to-foundation':
        return 'waste';
      case 'tableau-to-tableau':
      case 'tableau-to-foundation':
        return `tableau-${hint.from}`;
      case 'foundation-to-tableau':
        return `foundation-${hint.from}`;
      case 'draw':
        return 'stock';
      case 'recycle':
        return 'stock';
      default:
        return null;
    }
  }, [hintMove]);

  // ── Pile x positions ──────────────────────────────────────────────────────

  const pileX = (i: number) => PADDING + i * (CARD_W + GAP);

  // ── Render ─────────────────────────────────────────────────────────────────

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
          <span>Score: {Math.max(0, gameState.score)}</span>
          <span>{formatTime(elapsed)}</span>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Moves: {gameState.moveCount}</span>
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
          <button onClick={() => useSolitaireStore.getState().startNewGame('klondike', { drawMode: gameState.drawMode })} className="action-btn secondary" style={{
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

        {/* ── Top row: Stock, Waste, gap, Foundations ────────────── */}

        {/* Stock pile */}
        {gameState.stock.length > 0 ? (
          <Card
            id={0} x={pileX(0)} y={TOP_ROW_Y} faceUp={false}
            onClick={handleStockClick}
            highlighted={hintSource === 'stock'}
          />
        ) : (
          <EmptyPile
            x={pileX(0)} y={TOP_ROW_Y}
            label="↻"
            onClick={gameState.waste.length > 0 ? handleStockClick : undefined}
            highlighted={hintSource === 'stock'}
          />
        )}

        {/* Waste pile — show top 1-3 cards fanned */}
        {gameState.waste.length === 0 ? (
          <EmptyPile x={pileX(1)} y={TOP_ROW_Y} />
        ) : (
          (() => {
            const showCount = Math.min(gameState.drawMode === 3 ? 3 : 1, gameState.waste.length);
            const wasteCards = gameState.waste.slice(-showCount);
            return wasteCards.map((cardId, i) => {
              const isTop = i === wasteCards.length - 1;
              return (
                <Card
                  key={`waste-${cardId}`}
                  id={cardId}
                  x={pileX(1) + i * 15}
                  y={TOP_ROW_Y}
                  faceUp
                  selected={isTop && selected?.pile === 'waste'}
                  highlighted={isTop && hintSource === 'waste'}
                  onClick={isTop ? () => handleCardClick('waste', 0) : undefined}
                  onDoubleClick={isTop ? () => handleDoubleClick('waste', 0) : undefined}
                  dimmed={!isTop}
                />
              );
            });
          })()
        )}

        {/* Foundations (slots 3-6, right side) */}
        {[0, 1, 2, 3].map(f => {
          const foundation = gameState.foundations[f];
          const x = pileX(3 + f);
          const isHighlighted = destinations.has(`foundation-${f}`);

          if (foundation.length === 0) {
            return (
              <EmptyPile
                key={`foundation-${f}`}
                x={x} y={TOP_ROW_Y}
                label={suitSymbol(FOUNDATION_SUITS[f])}
                onClick={() => handleCardClick(`foundation-${f}`, f)}
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
              selected={selected?.pile === `foundation-${f}`}
              highlighted={isHighlighted || hintSource === `foundation-${f}`}
              onClick={() => handleCardClick(`foundation-${f}`, f)}
            />
          );
        })}

        {/* ── Tableau ─────────────────────────────────────────────── */}
        {gameState.tableau.map((pile, col) => {
          const x = pileX(col);
          let y = TABLEAU_Y;
          const isHighlighted = destinations.has(`tableau-${col}`);

          if (pile.faceDown.length === 0 && pile.faceUp.length === 0) {
            return (
              <EmptyPile
                key={`tableau-${col}`}
                x={x} y={y}
                onClick={() => handleCardClick(`tableau-${col}`, col)}
                highlighted={isHighlighted}
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
            const isTop = i === pile.faceUp.length - 1;
            const cardsFromTop = pile.faceUp.length - i;
            const isSelected = selected?.pile === `tableau-${col}` && selected?.index === col;
            // Highlight the card and all cards below it when part of a movable sequence
            const isPartOfHint = hintSource === `tableau-${col}`;

            elements.push(
              <Card
                key={`tu-${col}-${i}`}
                id={cardId}
                x={x} y={y}
                faceUp
                selected={isSelected}
                highlighted={isHighlighted || isPartOfHint}
                onClick={() => handleCardClick(`tableau-${col}`, col, cardsFromTop)}
                onDoubleClick={isTop ? () => handleDoubleClick(`tableau-${col}`, col) : undefined}
              />
            );
            y += FACE_UP_OFFSET;
          });

          return <g key={`tableau-${col}`}>{elements}</g>;
        })}
      </svg>

      {/* Win overlay */}
      {gameState.won && (
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
              <div>Score: <strong>{gameState.score}</strong></div>
              <div>Moves: <strong>{gameState.moveCount}</strong></div>
              <div>Time: <strong>{formatTime(elapsed)}</strong></div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="action-btn primary"
                style={{ flex: 1 }}
                onClick={() => useSolitaireStore.getState().startNewGame('klondike', { drawMode: gameState.drawMode })}
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
      {!gameState.won && gameState.gameOver && (
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
                onClick={() => useSolitaireStore.getState().startNewGame('klondike', { drawMode: gameState.drawMode })}
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
