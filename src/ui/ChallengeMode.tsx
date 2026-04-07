/**
 * Challenge mode UI: curated positions, "find the best move".
 * Free and unlimited — no paywall.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { CHALLENGES } from '../engine/challenges';
import type { Challenge } from '../engine/challenges';
import { chooseBestMove } from '../engine/ai';
import { boardKey } from '../engine/board';
import { getValidSingleMoves, applySingleDieMove, hasLegalMoves } from '../engine/moves';
import type { DieMove } from '../engine/types';
import { BAR } from '../engine/board';

// Board dimensions (smaller than main board)
const W = 600;
const H = 420;
const MARGIN = 16;
const BAR_W = 32;
const POINT_W = (W - 2 * MARGIN - BAR_W) / 12;
const HALF_W = (W - 2 * MARGIN - BAR_W) / 2;
const PT_HEIGHT = H / 2 - MARGIN - 8;
const CR = (POINT_W / 2) * 0.85;

const BOARD_GREEN = '#2D5016';
const FRAME = '#1a0f00';
const TRI_DARK = '#8B1A1A';
const TRI_LIGHT = '#F5F5DC';
const P0_FILL = '#F0E68C';
const P1_FILL = '#1a1a1a';
const DEST_GREEN = 'rgba(100,220,100,0.75)';
const DEST_AMBER = 'rgba(255,165,0,0.85)';
const SEL_COLOR = 'rgba(255,255,100,0.5)';

function ptX(i: number): number {
  const L = MARGIN;
  const R = MARGIN + HALF_W + BAR_W;
  if (i < 6) return R + HALF_W - (i + 0.5) * POINT_W;
  if (i < 12) return L + HALF_W - (i - 6 + 0.5) * POINT_W;
  if (i < 18) return L + (i - 12 + 0.5) * POINT_W;
  return R + (i - 18 + 0.5) * POINT_W;
}

function isTop(i: number) { return i >= 12; }

function checkerY(i: number, n: number): number {
  const spacing = CR * 2 * 0.93;
  return isTop(i)
    ? MARGIN + CR + n * spacing
    : H - MARGIN - CR - n * spacing;
}

export function ChallengeMode({ onBack }: { onBack: () => void }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [filter, setFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [dests, setDests] = useState<Array<{ to: number; die: number }>>([]);
  // Track in-progress challenge: current board state, remaining dice, and accumulated moves
  const [challengeBoard, setChallengeBoard] = useState<number[] | null>(null);
  const [challengeDice, setChallengeDice] = useState<number[]>([]);
  const [accumulatedMoves, setAccumulatedMoves] = useState<DieMove[]>([]);
  const [solvedIds, setSolvedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('bg-solved-challenges');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  const filtered = CHALLENGES.filter(
    (c) => filter === 'all' || c.difficulty === filter
  );
  const challenge: Challenge | undefined = filtered[currentIdx];

  useEffect(() => {
    setResult(null);
    setSelected(null);
    setDests([]);
    setChallengeBoard(null);
    setChallengeDice([]);
    setAccumulatedMoves([]);
  }, [currentIdx, filter]);

  const checkFinalResult = useCallback((finalBoard: number[], ch: Challenge) => {
    const aiResult = chooseBestMove(ch.board, ch.dice, 100);
    if (!aiResult) return;

    const correct = boardKey(finalBoard) === boardKey(aiResult.resultBoard);
    setResult(correct ? 'correct' : 'incorrect');

    if (correct) {
      const newSolved = new Set(solvedIds);
      newSolved.add(ch.id);
      setSolvedIds(newSolved);
      try {
        localStorage.setItem('bg-solved-challenges', JSON.stringify([...newSolved]));
      } catch {}
    }
  }, [solvedIds]);

  const handlePointClick = useCallback((i: number) => {
    if (!challenge || result !== null) return;

    // Use in-progress board/dice or the challenge's original
    const board = challengeBoard ?? challenge.board;
    const dice = challengeBoard ? challengeDice : challenge.dice;

    if (selected === i) {
      setSelected(null);
      setDests([]);
      return;
    }

    // Check if clicking a destination
    const existing = dests.find((d) => d.to === i);
    if (existing && selected !== null) {
      const dieMove: DieMove = { from: selected, to: existing.to, die: existing.die };
      const newBoard = applySingleDieMove(board, dieMove);
      const dieIdx = dice.indexOf(existing.die);
      const newDice = [...dice.slice(0, dieIdx), ...dice.slice(dieIdx + 1)];
      const newMoves = [...accumulatedMoves, dieMove];

      setSelected(null);
      setDests([]);

      // If no more dice or no more legal moves, check result
      if (newDice.length === 0 || !hasLegalMoves(newBoard, newDice)) {
        setChallengeBoard(null);
        setChallengeDice([]);
        setAccumulatedMoves([]);
        checkFinalResult(newBoard, challenge);
      } else {
        setChallengeBoard(newBoard.slice());
        setChallengeDice(newDice);
        setAccumulatedMoves(newMoves);
      }
      return;
    }

    // Select if has checker
    const from = i === BAR ? BAR : i;
    const hasMine = from === BAR ? board[BAR] > 0 : (from >= 0 && from <= 23 && board[from] > 0);
    if (!hasMine) {
      setSelected(null);
      setDests([]);
      return;
    }

    const movesFrom = getValidSingleMoves(board, dice, from);
    setSelected(i);
    setDests(movesFrom);
  }, [challenge, result, selected, dests, challengeBoard, challengeDice, accumulatedMoves, checkFinalResult]);

  if (!challenge) {
    return (
      <div style={{ textAlign: 'center', color: '#ccc', padding: 32 }}>
        No challenges found.
        <br />
        <button onClick={onBack} style={btn('#333')}>Back</button>
      </div>
    );
  }

  const destSet = new Map(dests.map((d) => [d.to, d]));
  // Use in-progress board for rendering, or the challenge's original board
  const renderBoard = challengeBoard ?? challenge.board;
  const renderDice = challengeBoard ? challengeDice : challenge.dice;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: '#ddd' }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button onClick={onBack} style={btn('#333')}>← Back</button>
        <h2 style={{ margin: 0, color: '#FFD700', fontSize: 20 }}>Challenge Mode</h2>
        <span style={{ fontSize: 12, color: '#888' }}>
          {solvedIds.size}/{CHALLENGES.length} solved
        </span>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8 }}>
        {(['all', 'easy', 'medium', 'hard'] as const).map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setCurrentIdx(0); }}
            style={btn(filter === f ? '#445' : '#222')}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Challenge info */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 'bold', fontSize: 16 }}>
          {challenge.title}
          {solvedIds.has(challenge.id) && <span style={{ color: '#4CAF50', marginLeft: 8 }}>✓</span>}
        </div>
        <div style={{ fontSize: 13, color: '#aaa' }}>{challenge.description}</div>
        <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
          Dice: {challenge.dice.join(' + ')}
        </div>
      </div>

      {/* Mini board */}
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.5)' }}
        onClick={() => { setSelected(null); setDests([]); }}
      >
        <rect width={W} height={H} fill={FRAME} rx={6} />
        <rect x={MARGIN} y={MARGIN} width={W - 2 * MARGIN} height={H - 2 * MARGIN} fill={BOARD_GREEN} />

        {/* Triangles */}
        {Array.from({ length: 24 }, (_, i) => {
          const cx = ptX(i);
          const top = isTop(i);
          const bY = top ? MARGIN : H - MARGIN;
          const tY = top ? MARGIN + PT_HEIGHT : H - MARGIN - PT_HEIGHT;
          const pts = `${cx - POINT_W / 2},${bY} ${cx + POINT_W / 2},${bY} ${cx},${tY}`;
          const hasDest = destSet.has(i);
          const destType = hasDest && renderBoard[i] === -1 ? 'hit' : 'open';
          return (
            <g key={i} onClick={(e) => { e.stopPropagation(); handlePointClick(i); }} style={{ cursor: 'pointer' }}>
              <polygon points={pts} fill={i % 2 === 0 ? TRI_DARK : TRI_LIGHT} />
              {hasDest && (
                <polygon points={pts} fill={destType === 'hit' ? DEST_AMBER : DEST_GREEN} />
              )}
              {selected === i && (
                <polygon points={pts} fill={SEL_COLOR} />
              )}
              <text x={cx} y={top ? MARGIN + PT_HEIGHT + 12 : H - MARGIN - PT_HEIGHT - 4}
                textAnchor="middle" fontSize={8} fill="rgba(255,255,255,0.35)"
                style={{ pointerEvents: 'none' }}>
                {i + 1}
              </text>
            </g>
          );
        })}

        {/* Bar */}
        <rect x={MARGIN + HALF_W} y={MARGIN} width={BAR_W} height={H - 2 * MARGIN} fill="#1a0f00" />

        {/* Checkers */}
        {Array.from({ length: 24 }, (_, i) => {
          const cnt = renderBoard[i];
          if (cnt === 0) return null;
          const abs = Math.abs(cnt);
          const isP0 = cnt > 0;
          const cx = ptX(i);
          return Array.from({ length: Math.min(abs, 5) }, (_, j) => {
            const cy = checkerY(i, j);
            const isLast = j === Math.min(abs, 5) - 1;
            return (
              <g key={`${i}-${j}`}>
                {selected === i && isP0 && j === 0 && (
                  <circle cx={cx} cy={cy} r={CR + 3} fill={SEL_COLOR} />
                )}
                <circle cx={cx} cy={cy} r={CR} fill={isP0 ? P0_FILL : P1_FILL} stroke="#888" strokeWidth={1} />
                {abs > 5 && isLast && (
                  <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
                    fontSize={9} fill={isP0 ? '#333' : '#eee'} style={{ pointerEvents: 'none' }}>
                    {abs}
                  </text>
                )}
              </g>
            );
          });
        })}

        {/* Bar checker */}
        {renderBoard[BAR] > 0 && (
          <g onClick={(e) => { e.stopPropagation(); handlePointClick(BAR); }} style={{ cursor: 'pointer' }}>
            <circle cx={MARGIN + HALF_W + BAR_W / 2} cy={H / 2 + CR + 2} r={CR}
              fill={P0_FILL} stroke="#888" strokeWidth={1} />
          </g>
        )}

        {/* Dice — show remaining dice */}
        <g transform={`translate(${W / 2 - renderDice.length * 22}, ${H / 2 - 16})`}>
          {renderDice.map((d, i) => (
            <g key={i} transform={`translate(${i * 36}, 0)`}>
              <rect x={0} y={0} width={32} height={32} rx={5} fill="white" />
              <text x={16} y={22} textAnchor="middle" fontSize={20} fontWeight="bold" fill="#222">
                {'⚀⚁⚂⚃⚄⚅'[d - 1]}
              </text>
            </g>
          ))}
        </g>
      </svg>

      {/* Result feedback */}
      {result === 'correct' && (
        <div style={{ color: '#4CAF50', fontWeight: 'bold', fontSize: 18 }}>
          Correct!
        </div>
      )}
      {result === 'incorrect' && (
        <div style={{ color: '#f44336', fontWeight: 'bold', fontSize: 18 }}>
          Not quite — try again
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button
          onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
          disabled={currentIdx === 0}
          style={btn(currentIdx === 0 ? '#1a1a1a' : '#333')}
        >
          ← Prev
        </button>
        <span style={{ fontSize: 13, color: '#888' }}>
          {currentIdx + 1} / {filtered.length}
        </span>
        <button
          onClick={() => setCurrentIdx(Math.min(filtered.length - 1, currentIdx + 1))}
          disabled={currentIdx === filtered.length - 1}
          style={btn(currentIdx === filtered.length - 1 ? '#1a1a1a' : '#333')}
        >
          Next →
        </button>

        {result && (
          <button
            onClick={() => setCurrentIdx(Math.min(filtered.length - 1, currentIdx + 1))}
            style={btn('#2a6e1a')}
          >
            Next challenge
          </button>
        )}
      </div>

      {/* Share */}
      {result === 'correct' && (
        <button
          onClick={() => {
            const text = `I solved "${challenge.title}" in backgammon challenge mode! Can you beat me?`;
            if (navigator.share) {
              navigator.share({ title: 'Backgammon Challenge', text });
            } else {
              navigator.clipboard?.writeText(text);
              alert('Copied to clipboard!');
            }
          }}
          style={btn('#1a3a6e')}
        >
          Share this challenge
        </button>
      )}
    </div>
  );
}

function btn(bg: string): React.CSSProperties {
  return {
    background: bg,
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 6,
    padding: '6px 14px',
    cursor: 'pointer',
    fontSize: 13,
    fontFamily: 'inherit',
  };
}
