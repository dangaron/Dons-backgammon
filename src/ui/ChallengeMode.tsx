/**
 * Challenge mode — curated positions, "find the best move".
 * Uses the same board aesthetic as the main game.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { CHALLENGES } from '../engine/challenges';
import type { Challenge } from '../engine/challenges';
import { chooseBestMove } from '../engine/ai';
import { boardKey, BAR, OPP_BAR } from '../engine/board';
import { getValidSingleMoves, applySingleDieMove, hasLegalMoves } from '../engine/moves';
import type { DieMove } from '../engine/types';
import { recordChallengeResult } from '../lib/dailyChallenges';

// ── Reuse main board dimensions & geometry ───────────────────────────────────
const BW = 680;
const BH = 580;
const M = 14;
const BAR_W = 40;
const HALF_W = (BW - 2 * M - BAR_W) / 2;
const PT_W = HALF_W / 6;
const PT_H = BH / 2 - M - 12;
const CR = PT_W * 0.40;

function ptX(idx: number): number {
  const L = M;
  const R = M + HALF_W + BAR_W;
  if (idx < 6)  return R + HALF_W - (idx + 0.5) * PT_W;
  if (idx < 12) return L + HALF_W - (idx - 6 + 0.5) * PT_W;
  if (idx < 18) return L + (idx - 12 + 0.5) * PT_W;
  return R + (idx - 18 + 0.5) * PT_W;
}

function isTop(idx: number) { return idx >= 12; }

function checkerCY(idx: number, n: number): number {
  const spacing = CR * 2.05;
  return isTop(idx)
    ? M + CR + 4 + n * spacing
    : BH - M - CR - 4 - n * spacing;
}

// ── Theme colors (reads from document attribute set by main Board) ───────────
function getThemeColors() {
  const theme = document.documentElement.getAttribute('data-theme');
  const isDark = theme === 'dark';
  return isDark ? {
    boardBg: '#13151e', frameBg: '#0e1018', barBg: '#0c0e16',
    triA: '#1e2030', triB: '#282b3a',
    player: '#4ecdc4', playerDim: 'rgba(78,205,196,0.12)',
    opp: '#ff6b6b', oppDim: 'rgba(255,107,107,0.12)',
    destGlow: 'rgba(78,205,196,0.5)', destHitGlow: 'rgba(255,159,67,0.6)',
    dieBg: '#2a2d3a', dieStroke: 'rgba(255,255,255,0.1)', diePip: 'rgba(255,255,255,0.9)',
    centerLine: 'rgba(255,255,255,0.03)', checkerShadow: 'rgba(0,0,0,0.35)',
  } : {
    boardBg: '#dde0e8', frameBg: '#c8ccd6', barBg: '#bcc0cc',
    triA: '#d0d3dc', triB: '#c0c4d0',
    player: '#0ea5a0', playerDim: 'rgba(14,165,160,0.15)',
    opp: '#e84545', oppDim: 'rgba(232,69,69,0.15)',
    destGlow: 'rgba(14,165,160,0.5)', destHitGlow: 'rgba(255,159,67,0.6)',
    dieBg: '#ffffff', dieStroke: 'rgba(0,0,0,0.12)', diePip: '#1a1d2a',
    centerLine: 'rgba(0,0,0,0.06)', checkerShadow: 'rgba(0,0,0,0.15)',
  };
}

// ── Dice pips (same as main board) ───────────────────────────────────────────
function DiePips({ value, cx, cy, size, color }: { value: number; cx: number; cy: number; size: number; color: string }) {
  const pip = size * 0.09;
  const o = size * 0.26;
  const positions: [number, number][][] = [
    [], [[0, 0]], [[-o, -o], [o, o]], [[-o, -o], [0, 0], [o, o]],
    [[-o, -o], [o, -o], [-o, o], [o, o]], [[-o, -o], [o, -o], [0, 0], [-o, o], [o, o]],
    [[-o, -o], [o, -o], [-o, 0], [o, 0], [-o, o], [o, o]],
  ];
  return (
    <>
      {(positions[value] || []).map(([dx, dy], i) => (
        <circle key={i} cx={cx + dx} cy={cy + dy} r={pip} fill={color} />
      ))}
    </>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export function ChallengeMode({ onBack, challengeId, basePoints }: {
  onBack: () => void;
  challengeId?: string;
  basePoints?: number;
}) {
  // If a specific challenge is requested, find it
  const specificIdx = challengeId ? CHALLENGES.findIndex(c => c.id === challengeId) : -1;
  const [currentIdx, setCurrentIdx] = useState(specificIdx >= 0 ? specificIdx : 0);
  const [filter, setFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null);
  const [earnedPoints, setEarnedPoints] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [dests, setDests] = useState<Array<{ to: number; die: number }>>([]);
  const [challengeBoard, setChallengeBoard] = useState<number[] | null>(null);
  const [challengeDice, setChallengeDice] = useState<number[]>([]);
  const [accumulatedMoves, setAccumulatedMoves] = useState<DieMove[]>([]);
  const [solvedIds, setSolvedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('bg-solved-challenges');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  const c = useMemo(getThemeColors, []);

  const filtered = CHALLENGES.filter(
    (ch) => filter === 'all' || ch.difficulty === filter
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

    // Record in daily challenge system
    const pts = basePoints || (ch.difficulty === 'hard' ? 300 : ch.difficulty === 'medium' ? 200 : 100);
    const progress = recordChallengeResult(ch.id, pts, correct);
    if (correct) {
      setEarnedPoints(progress.scores[ch.id]?.points || 0);
      const newSolved = new Set(solvedIds);
      newSolved.add(ch.id);
      setSolvedIds(newSolved);
      try { localStorage.setItem('bg-solved-challenges', JSON.stringify([...newSolved])); } catch {}
    }
  }, [solvedIds, basePoints]);

  const handlePointClick = useCallback((i: number) => {
    if (!challenge || result !== null) return;
    const board = challengeBoard ?? challenge.board;
    const dice = challengeBoard ? challengeDice : challenge.dice;

    if (selected === i) { setSelected(null); setDests([]); return; }

    const existing = dests.find((d) => d.to === i);
    if (existing && selected !== null) {
      const dieMove: DieMove = { from: selected, to: existing.to, die: existing.die };
      const newBoard = applySingleDieMove(board, dieMove);
      const dieIdx = dice.indexOf(existing.die);
      const newDice = [...dice.slice(0, dieIdx), ...dice.slice(dieIdx + 1)];

      setSelected(null);
      setDests([]);

      if (newDice.length === 0 || !hasLegalMoves(newBoard, newDice)) {
        setChallengeBoard(null);
        setChallengeDice([]);
        setAccumulatedMoves([]);
        checkFinalResult(newBoard, challenge);
      } else {
        setChallengeBoard(newBoard.slice());
        setChallengeDice(newDice);
        setAccumulatedMoves([...accumulatedMoves, dieMove]);
      }
      return;
    }

    const from = i === BAR ? BAR : i;
    const hasMine = from === BAR ? board[BAR] > 0 : (from >= 0 && from <= 23 && board[from] > 0);
    if (!hasMine) { setSelected(null); setDests([]); return; }

    const movesFrom = getValidSingleMoves(board, dice, from);
    setSelected(i);
    setDests(movesFrom);
  }, [challenge, result, selected, dests, challengeBoard, challengeDice, accumulatedMoves, checkFinalResult]);

  if (!challenge) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <div className="overlay-card">
          <h2>No challenges found</h2>
          <button className="action-btn primary" onClick={onBack}>Back to game</button>
        </div>
      </div>
    );
  }

  const destSet = new Map(dests.map((d) => [d.to, d]));
  const renderBoard = challengeBoard ?? challenge.board;
  const renderDice = challengeBoard ? challengeDice : challenge.dice;

  return (
    <>
      {/* ── Top Bar ── */}
      <div className="top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="action-btn secondary" onClick={onBack}
            style={{ fontSize: 11, height: 28, padding: '0 10px' }}>
            Back
          </button>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
              {challenge.title}
              {solvedIds.has(challenge.id) && (
                <span style={{ color: c.player, marginLeft: 6, fontSize: 12 }}>Solved</span>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{challenge.description}</div>
          </div>
        </div>

        <div className="match-info">
          <div className="pip-count you" style={{ fontSize: 11 }}>
            {solvedIds.size}/{CHALLENGES.length}
          </div>
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['all', 'easy', 'medium', 'hard'] as const).map((f) => (
            <button
              key={f}
              className={`action-btn ${filter === f ? 'primary' : 'secondary'}`}
              onClick={() => { setFilter(f); setCurrentIdx(0); }}
              style={{ fontSize: 10, height: 26, padding: '0 8px', textTransform: 'capitalize' }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ── Dice above board ── */}
      <div style={{
        display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center',
        padding: '8px 0 4px', flexShrink: 0,
      }}>
        {renderDice.map((d, i) => (
          <svg key={i} width={36} height={36} viewBox="0 0 36 36" className="die-group">
            <rect width={36} height={36} rx={8}
              fill={c.dieBg} stroke={c.dieStroke} strokeWidth={1} />
            <DiePips value={d} cx={18} cy={18} size={36} color={c.diePip} />
          </svg>
        ))}
        {result === null && accumulatedMoves.length > 0 && (
          <span style={{ fontSize: 12, color: 'var(--text-dim)', marginLeft: 4 }}>
            {renderDice.length === 1 ? '1 die left' : `${renderDice.length} dice left`}
          </span>
        )}
      </div>

      {/* ── Board ── */}
      <div className="board-area">
        <div className="board-wrap">
          <svg
            className="board-svg"
            viewBox={`0 0 ${BW} ${BH}`}
            preserveAspectRatio="xMidYMid meet"
            onClick={() => { setSelected(null); setDests([]); }}
          >
            <rect width={BW} height={BH} fill={c.frameBg} rx={16} />
            <rect x={M} y={M} width={BW - 2 * M} height={BH - 2 * M} fill={c.boardBg} rx={8} />

            {/* Center lines */}
            <line x1={M} y1={BH / 2} x2={M + HALF_W} y2={BH / 2} stroke={c.centerLine} strokeWidth={1} />
            <line x1={M + HALF_W + BAR_W} y1={BH / 2} x2={BW - M} y2={BH / 2} stroke={c.centerLine} strokeWidth={1} />

            {/* Triangles */}
            {Array.from({ length: 24 }, (_, idx) => {
              const cx = ptX(idx);
              const top = isTop(idx);
              const baseY = top ? M : BH - M;
              const tipY = top ? M + PT_H : BH - M - PT_H;
              const hw = PT_W / 2 - 1.5;
              const pts = `${cx - hw},${baseY} ${cx + hw},${baseY} ${cx},${tipY}`;
              const dark = idx % 2 === 0;
              const dest = destSet.get(idx);
              const hasDest = !!dest;
              const destType = hasDest ? (renderBoard[idx] === -1 ? 'hit' : 'open') : null;

              // Destination circle position
              const nextN = Math.min(Math.abs(renderBoard[idx]), 5);
              const destCY = top
                ? M + CR + 4 + nextN * (CR * 2.05)
                : BH - M - CR - 4 - nextN * (CR * 2.05);

              return (
                <g key={idx}
                  onClick={(e) => { e.stopPropagation(); handlePointClick(idx); }}
                  style={{ cursor: hasDest || renderBoard[idx] > 0 ? 'pointer' : 'default' }}>
                  <polygon points={pts} fill={dark ? c.triA : c.triB} />
                  {destType && (
                    <>
                      <polygon points={pts} fill={destType === 'hit' ? 'rgba(255,159,67,0.08)' : 'rgba(78,205,196,0.06)'} />
                      <circle cx={cx} cy={destCY} r={CR}
                        fill={destType === 'hit' ? 'rgba(255,159,67,0.25)' : 'rgba(78,205,196,0.2)'}
                        stroke={destType === 'hit' ? c.destHitGlow : c.destGlow}
                        strokeWidth={2.5} className="dest-glow" style={{ cursor: 'pointer' }} />
                      {dest && (
                        <text x={cx} y={destCY + 1} textAnchor="middle" dominantBaseline="middle"
                          fontSize={CR * 0.9} fontWeight="700"
                          fill={destType === 'hit' ? 'rgba(255,159,67,0.9)' : 'rgba(78,205,196,0.9)'}
                          style={{ pointerEvents: 'none', fontFamily: 'var(--font)' }}>
                          {dest.die}
                        </text>
                      )}
                    </>
                  )}
                </g>
              );
            })}

            {/* Bar */}
            <rect x={M + HALF_W} y={M} width={BAR_W} height={BH - 2 * M}
              fill={c.barBg} rx={4}
              onClick={(e) => { e.stopPropagation(); handlePointClick(BAR); }}
              style={{ cursor: renderBoard[BAR] > 0 ? 'pointer' : 'default' }} />
            <line x1={M + HALF_W + 8} y1={BH / 2} x2={M + HALF_W + BAR_W - 8} y2={BH / 2}
              stroke={c.centerLine} strokeWidth={1} />

            {/* Checkers */}
            {Array.from({ length: 24 }, (_, idx) => {
              const count = renderBoard[idx];
              if (count === 0) return null;
              const abs = Math.abs(count);
              const cx = ptX(idx);
              const isPlayer = count > 0;
              const isSel = selected === idx;

              return Array.from({ length: Math.min(abs, 5) }, (_, n) => {
                const cy = checkerCY(idx, n);
                const isTopmost = n === Math.min(abs, 5) - 1;
                const label = abs > 5 && isTopmost ? String(abs) : undefined;
                const sel = isSel && isTopmost;
                const fill = isPlayer ? c.player : c.opp;

                return (
                  <g key={`${idx}-${n}`} style={{ pointerEvents: isPlayer && isTopmost ? 'auto' : 'none' }}
                    onClick={isPlayer && isTopmost ? (e: React.MouseEvent) => { e.stopPropagation(); handlePointClick(idx); } : undefined}>
                    <circle cx={cx} cy={cy + 2} r={CR} fill={c.checkerShadow} />
                    {sel && (
                      <circle cx={cx} cy={cy} r={CR + 5} fill="none"
                        stroke={fill} strokeWidth={2} opacity={0.5} className="dest-glow" />
                    )}
                    <circle cx={cx} cy={cy} r={CR} fill={fill} opacity={0.92} />
                    <circle cx={cx} cy={cy - CR * 0.15} r={CR * 0.65} fill="rgba(255,255,255,0.12)" />
                    <circle cx={cx} cy={cy} r={CR} fill="none"
                      stroke={isPlayer ? c.playerDim : c.oppDim} strokeWidth={1.5} />
                    {label && (
                      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
                        fontSize={CR * 0.85} fontWeight="700"
                        fill={isPlayer ? '#0a0b10' : '#fff'}
                        style={{ userSelect: 'none', fontFamily: 'var(--font)' }}>
                        {label}
                      </text>
                    )}
                  </g>
                );
              });
            })}

            {/* Bar checkers */}
            {renderBoard[BAR] > 0 && (() => {
              const barCX = M + HALF_W + BAR_W / 2;
              return Array.from({ length: renderBoard[BAR] }, (_, n) => {
                const cy = BH / 2 + CR + 8 + n * (CR * 2.05);
                return (
                  <g key={`bar-${n}`}>
                    <circle cx={barCX} cy={cy + 2} r={CR} fill={c.checkerShadow} />
                    {selected === BAR && n === 0 && (
                      <circle cx={barCX} cy={cy} r={CR + 5} fill="none"
                        stroke={c.player} strokeWidth={2} opacity={0.5} className="dest-glow" />
                    )}
                    <circle cx={barCX} cy={cy} r={CR} fill={c.player} opacity={0.92} />
                    <circle cx={barCX} cy={cy - CR * 0.15} r={CR * 0.65} fill="rgba(255,255,255,0.12)" />
                  </g>
                );
              });
            })()}

            {/* Opponent bar checkers */}
            {renderBoard[OPP_BAR] > 0 && (() => {
              const barCX = M + HALF_W + BAR_W / 2;
              return Array.from({ length: renderBoard[OPP_BAR] }, (_, n) => {
                const cy = BH / 2 - CR - 8 - n * (CR * 2.05);
                return (
                  <g key={`bar-opp-${n}`}>
                    <circle cx={barCX} cy={cy + 2} r={CR} fill={c.checkerShadow} />
                    <circle cx={barCX} cy={cy} r={CR} fill={c.opp} opacity={0.92} />
                  </g>
                );
              });
            })()}
          </svg>
        </div>
      </div>

      {/* ── Action Bar ── */}
      <div className="action-bar">
        {/* Result feedback */}
        {result === 'correct' && (
          <span style={{ color: c.player, fontWeight: 700, fontSize: 14 }}>
            Correct! {earnedPoints ? `+${earnedPoints} pts` : ''}
          </span>
        )}
        {result === 'incorrect' && (
          <span style={{ color: c.opp, fontWeight: 700, fontSize: 14 }}>
            Not quite
          </span>
        )}
        {result === 'incorrect' && (
          <button className="action-btn secondary" style={{ fontSize: 12, height: 32 }}
            onClick={() => {
              setResult(null); setSelected(null); setDests([]);
              setChallengeBoard(null); setChallengeDice([]); setAccumulatedMoves([]);
            }}>
            Retry
          </button>
        )}

        <div style={{ flex: 1 }} />

        {/* Navigation */}
        <button className="action-btn secondary icon-only" style={{ width: 32, height: 32 }}
          disabled={currentIdx === 0}
          onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <span style={{ fontSize: 12, color: 'var(--text-dim)', padding: '0 4px', fontVariantNumeric: 'tabular-nums' }}>
          {currentIdx + 1}/{filtered.length}
        </span>

        <button className="action-btn secondary icon-only" style={{ width: 32, height: 32 }}
          disabled={currentIdx >= filtered.length - 1}
          onClick={() => setCurrentIdx(Math.min(filtered.length - 1, currentIdx + 1))}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {result === 'correct' && (
          <button className="action-btn primary" style={{ fontSize: 12, height: 32, marginLeft: 4 }}
            onClick={() => setCurrentIdx(Math.min(filtered.length - 1, currentIdx + 1))}>
            Next
          </button>
        )}
      </div>
    </>
  );
}
