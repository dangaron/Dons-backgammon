/**
 * Backgammon board — modern digital-native aesthetic.
 * Drag-and-drop with spring physics. Click also works.
 *
 * Board layout (SVG):
 *   Top row:    pts 13-18 (top-left) | pts 19-24 (top-right)   [indices 12-17 | 18-23]
 *   Bottom row: pts 12-7  (bot-left) | pts 6-1   (bot-right)   [indices 11-6  | 5-0]
 *
 * Player (you) = teal checkers, moves top-right -> bottom-right.
 * Opponent (AI) = coral checkers, moves bottom-right -> top-right.
 */

import React, { memo, useCallback, useMemo, useState, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { BAR, HOME, OPP_BAR, pipCount, opponentPipCount, unflopBoard } from '../engine/board';
import { applySingleDieMove } from '../engine/moves';

import { useTheme } from '../../../shared/lib/useTheme';
import { loadBoardTheme, BOARD_THEMES } from '../lib/boardThemes';

// ── Dimensions ───────────────────────────────────────────────────────────────
const BW = 680;
const BH = 580;
const M = 14;
const BAR_W = 40;
const HALF_W = (BW - 2 * M - BAR_W) / 2;
const PT_W = HALF_W / 6;
const PT_H = BH / 2 - M - 12;
const CR = PT_W * 0.40;

// ── Colors (theme-dependent) ─────────────────────────────────────────────────
const THEMES = {
  dark: {
    boardBg: '#13151e', frameBg: '#0e1018', barBg: '#0c0e16',
    triA: '#1e2030', triB: '#282b3a',
    player: '#4ecdc4', playerDim: 'rgba(78,205,196,0.12)',
    opp: '#ff6b6b', oppDim: 'rgba(255,107,107,0.12)',
    destGlow: 'rgba(78,205,196,0.5)', destHitGlow: 'rgba(255,159,67,0.6)',
    dieBg: '#2a2d3a', dieStroke: 'rgba(255,255,255,0.1)', diePip: 'rgba(255,255,255,0.9)',
    centerLine: 'rgba(255,255,255,0.03)', checkerShadow: 'rgba(0,0,0,0.35)',
    cubeText: 'rgba(255,255,255,0.7)', thinkBg: 'rgba(255,107,107,0.12)',
  },
  light: {
    boardBg: '#dde0e8', frameBg: '#c8ccd6', barBg: '#bcc0cc',
    triA: '#d0d3dc', triB: '#c0c4d0',
    player: '#0ea5a0', playerDim: 'rgba(14,165,160,0.15)',
    opp: '#e84545', oppDim: 'rgba(232,69,69,0.15)',
    destGlow: 'rgba(14,165,160,0.5)', destHitGlow: 'rgba(255,159,67,0.6)',
    dieBg: '#ffffff', dieStroke: 'rgba(0,0,0,0.12)', diePip: '#1a1d2a',
    centerLine: 'rgba(0,0,0,0.06)', checkerShadow: 'rgba(0,0,0,0.15)',
    cubeText: '#1a1d2a', thinkBg: 'rgba(232,69,69,0.12)',
  },
} as const;

// ── Geometry ─────────────────────────────────────────────────────────────────
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

// Home tray position
const HOME_X = BW - M + 2;
const HOME_Y = BH - M - CR * 2;

// ── Dice Pips ────────────────────────────────────────────────────────────────
function DiePips({ value, cx, cy, size, color }: { value: number; cx: number; cy: number; size: number; color?: string }) {
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
        <circle key={i} cx={cx + dx} cy={cy + dy} r={pip} fill={color || 'rgba(255,255,255,0.9)'} />
      ))}
    </>
  );
}

// ── Triangle ─────────────────────────────────────────────────────────────────
const Triangle = memo(function Triangle({
  idx, destType, dieValue, blockedDie, onClick, triA, triB, destGlow, destHitGlow, checkerCount,
}: {
  idx: number;
  destType: 'open' | 'hit' | null;
  dieValue: number | null;
  blockedDie: number | null;
  onClick: (e: React.MouseEvent) => void;
  triA: string; triB: string; destGlow: string; destHitGlow: string;
  checkerCount: number;
}) {
  const cx = ptX(idx);
  const top = isTop(idx);
  const baseY = top ? M : BH - M;
  const tipY = top ? M + PT_H : BH - M - PT_H;
  const hw = PT_W / 2 - 1.5;
  const pts = `${cx - hw},${baseY} ${cx + hw},${baseY} ${cx},${tipY}`;
  const dark = idx % 2 === 0;

  // Position destination indicator where the next checker would land
  const nextN = Math.min(Math.abs(checkerCount), 5);
  const destCY = top
    ? M + CR + 4 + nextN * (CR * 2.05)
    : BH - M - CR - 4 - nextN * (CR * 2.05);

  return (
    <g onClick={onClick} style={{ cursor: destType ? 'pointer' : 'default' }}>
      <polygon points={pts} fill={dark ? triA : triB} />
      {destType && (
        <>
          <polygon points={pts} fill={destType === 'hit' ? 'rgba(255,159,67,0.08)' : 'rgba(78,205,196,0.06)'} />
          {/* Destination indicator — filled circle where the piece would land */}
          <circle
            cx={cx} cy={destCY}
            r={CR}
            fill={destType === 'hit' ? 'rgba(255,159,67,0.25)' : 'rgba(78,205,196,0.2)'}
            stroke={destType === 'hit' ? destHitGlow : destGlow}
            strokeWidth={2.5}
            className="dest-glow"
            style={{ cursor: 'pointer' }}
          />
          {/* Die value label inside the destination circle */}
          {dieValue && (
            <text
              x={cx} y={destCY + 1}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={CR * 0.9} fontWeight="700"
              fill={destType === 'hit' ? 'rgba(255,159,67,0.9)' : 'rgba(78,205,196,0.9)'}
              style={{ pointerEvents: 'none', fontFamily: 'var(--font)' }}
            >
              {dieValue}
            </text>
          )}
        </>
      )}
      {/* Blocked indicator — opponent has 2+ checkers, can't land here */}
      {blockedDie && !destType && (
        <>
          <circle
            cx={cx} cy={destCY}
            r={CR * 0.7}
            fill="rgba(255,60,60,0.12)"
            stroke="rgba(255,60,60,0.45)"
            strokeWidth={2}
            style={{ pointerEvents: 'none' }}
          />
          <line
            x1={cx - CR * 0.4} y1={destCY - CR * 0.4}
            x2={cx + CR * 0.4} y2={destCY + CR * 0.4}
            stroke="rgba(255,60,60,0.5)" strokeWidth={2} strokeLinecap="round"
            style={{ pointerEvents: 'none' }}
          />
          <line
            x1={cx + CR * 0.4} y1={destCY - CR * 0.4}
            x2={cx - CR * 0.4} y2={destCY + CR * 0.4}
            stroke="rgba(255,60,60,0.5)" strokeWidth={2} strokeLinecap="round"
            style={{ pointerEvents: 'none' }}
          />
          <text
            x={cx} y={destCY + CR + 10}
            textAnchor="middle" fontSize={9} fontWeight="600"
            fill="rgba(255,60,60,0.6)"
            style={{ pointerEvents: 'none', fontFamily: 'var(--font)' }}
          >
            {blockedDie}
          </text>
        </>
      )}
    </g>
  );
});

// ── Checker ──────────────────────────────────────────────────────────────────
const Checker = memo(function Checker({
  cx, cy, isPlayer, isSelected, label, isDraggable, onDragStart,
  playerCol, oppCol, playerDim, oppDim, shadow,
}: {
  cx: number; cy: number; isPlayer: boolean; isSelected?: boolean; label?: string;
  isDraggable?: boolean; onDragStart?: (e: React.PointerEvent) => void;
  playerCol?: string; oppCol?: string; playerDim?: string; oppDim?: string; shadow?: string;
}) {
  const fill = isPlayer ? (playerCol || '#4ecdc4') : (oppCol || '#ff6b6b');
  const dimFill = isPlayer ? (playerDim || 'rgba(78,205,196,0.12)') : (oppDim || 'rgba(255,107,107,0.12)');
  const shadowFill = shadow || 'rgba(0,0,0,0.35)';

  return (
    <g
      className={`checker-group${isSelected ? ' selected' : ''}`}
      style={{ pointerEvents: isDraggable ? 'auto' : 'none' }}
      onPointerDown={isDraggable ? onDragStart : undefined}
      onClick={isDraggable ? (e: React.MouseEvent) => e.stopPropagation() : undefined}
    >
      {/* Subtle shadow */}
      <circle cx={cx} cy={cy + 2} r={CR} fill={shadowFill} />
      {/* Selection glow ring */}
      {isSelected && (
        <circle cx={cx} cy={cy} r={CR + 5} fill="none"
          stroke={fill} strokeWidth={2}
          opacity={0.5} className="dest-glow" />
      )}
      {/* Body */}
      <circle className="checker-body" cx={cx} cy={cy} r={CR}
        fill={fill} opacity={0.92} />
      {/* Inner gradient overlay */}
      <circle cx={cx} cy={cy - CR * 0.15} r={CR * 0.65}
        fill="rgba(255,255,255,0.12)" />
      {/* Darker bottom edge */}
      <circle cx={cx} cy={cy} r={CR} fill="none"
        stroke={dimFill} strokeWidth={1.5} />
      {label && (
        <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
          fontSize={CR * 0.85} fontWeight="700" fill={isPlayer ? '#0a0b10' : '#fff'}
          style={{ userSelect: 'none', fontFamily: 'var(--font)' }}>
          {label}
        </text>
      )}
    </g>
  );
});

// ── Drag State ───────────────────────────────────────────────────────────────
interface DragState {
  fromPoint: number;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
}

// ── Main Board Component ─────────────────────────────────────────────────────
export function Board({ onChallenges, onNewGame: _onNewGame, onDashboard, onQuit }: {
  onChallenges?: () => void; onNewGame?: () => void; onDashboard?: () => void; onQuit?: () => void;
} = {}) {
  const { theme, toggle: toggleTheme } = useTheme();
  const boardThemeName = loadBoardTheme();
  const boardTheme = boardThemeName !== 'modern-dark' ? BOARD_THEMES[boardThemeName] : null;
  // Use board theme colors if set, otherwise fall back to light/dark theme
  const c = boardTheme ? boardTheme.colors : THEMES[theme];
  const {
    gameState, selectedPoint, legalDestinations, selectPoint, clearSelection,
    rollDiceAction, offerDoubleAction, acceptDoubleAction, rejectDoubleAction,
    isAIThinking, prng, rollHistory, setShowVerifyDialog, showVerifyDialog,
    startNewGame, makeSingleDieMove, aiHighlights, aiDice,
    turnUndoStack, turnComplete, undoMove, endTurn,
    openingRoll, openingWinner, performOpeningRoll,
    hintMove, showingHint, requestHint, clearHint,
    tutorWarning, confirmTutorWarning, dismissTutorWarning,
  } = useGameStore();

  const { board, dice, turnPhase, currentPlayer, winner, doublingCube, matchScore, matchLength } = gameState;

  const displayBoard = useMemo(() => {
    if (currentPlayer === 0) return board;
    return unflopBoard(board);
  }, [board, currentPlayer]);

  const destMap = new Map(legalDestinations.map((d) => [d.to, d]));

  // Compute blocked destinations — points where a die WOULD land but opponent has 2+ checkers
  const blockedDests = useMemo(() => {
    if (selectedPoint === null || turnPhase !== 'move' || currentPlayer !== 0) return new Map<number, number>();
    const blocked = new Map<number, number>(); // index → die value
    const uniqueDice = [...new Set(dice)];
    for (const die of uniqueDice) {
      let to: number;
      if (selectedPoint === BAR) {
        to = 24 - die;
      } else {
        to = selectedPoint - die;
      }
      if (to >= 0 && to <= 23 && board[to] <= -2 && !destMap.has(to)) {
        blocked.set(to, die);
      }
    }
    return blocked;
  }, [selectedPoint, dice, board, turnPhase, currentPlayer, destMap]);

  // Compute combined destinations — where the piece ends up using BOTH dice on the same piece
  const combinedDests = useMemo(() => {
    if (selectedPoint === null || turnPhase !== 'move' || currentPlayer !== 0) return new Map<number, string>();
    if (dice.length < 2) return new Map<number, string>();
    const combined = new Map<number, string>(); // display index → label (e.g. "4+2")
    // For each valid first-die move from selected piece, check if same piece can use second die
    for (const firstDest of legalDestinations) {
      const dm = { from: selectedPoint, to: firstDest.to, die: firstDest.die };
      const newBoard = applySingleDieMove(board, dm);
      const remainIdx = dice.indexOf(firstDest.die);
      const remaining = [...dice.slice(0, remainIdx), ...dice.slice(remainIdx + 1)];
      // Check each remaining die for a move from the same piece (now at firstDest.to)
      const triedSecond = new Set<number>();
      for (const die2 of remaining) {
        if (triedSecond.has(die2)) continue;
        triedSecond.add(die2);
        if (firstDest.to === HOME || firstDest.to === BAR) continue;
        const to2 = firstDest.to - die2;
        if (to2 >= 0 && to2 <= 23 && newBoard[to2] >= -1 && !destMap.has(to2)) {
          // Verify this combined move is part of a valid max-dice sequence
          const label = `${firstDest.die}+${die2}`;
          if (!combined.has(to2)) combined.set(to2, label);
        } else if (to2 < 0 && firstDest.to <= 5) {
          // Bearing off with second die — show at HOME
          if (!combined.has(HOME)) combined.set(HOME, `${firstDest.die}+${die2}`);
        }
      }
    }
    return combined;
  }, [selectedPoint, legalDestinations, dice, board, turnPhase, currentPlayer, destMap]);

  // ── Drag and Drop ──
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  const handleQuit = useCallback(() => {
    if (turnPhase !== 'game-over') {
      setShowQuitConfirm(true);
    } else if (onQuit) {
      onQuit();
    }
  }, [turnPhase, onQuit]);

  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);

  const svgPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: svgP.x, y: svgP.y };
  }, []);

  const handleDragStart = useCallback((fromPoint: number, e: React.PointerEvent) => {
    if (turnPhase !== 'move' || currentPlayer !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);

    const { x, y } = svgPoint(e.clientX, e.clientY);
    setDrag({ fromPoint, startX: x, startY: y, offsetX: 0, offsetY: 0 });
    setDragPos({ x, y });
    selectPoint(fromPoint);
  }, [turnPhase, currentPlayer, svgPoint, selectPoint]);

  const handleDragMove = useCallback((e: React.PointerEvent) => {
    if (!drag) return;
    const { x, y } = svgPoint(e.clientX, e.clientY);
    setDragPos({ x, y });
  }, [drag, svgPoint]);

  const handleDragEnd = useCallback((_e: React.PointerEvent) => {
    if (!drag || !dragPos) {
      setDrag(null);
      setDragPos(null);
      return;
    }

    // Check if we dragged far enough (not just a click)
    const dx = dragPos.x - drag.startX;
    const dy = dragPos.y - drag.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 15) {
      // Find closest destination point
      let closestDest: number | null = null;
      let closestDist = Infinity;

      for (const d of legalDestinations) {
        let tx: number, ty: number;
        if (d.to === HOME) {
          tx = HOME_X; ty = HOME_Y;
        } else {
          tx = ptX(d.to);
          ty = isTop(d.to) ? M + CR + 4 : BH - M - CR - 4;
        }
        const dist = Math.sqrt((dragPos.x - tx) ** 2 + (dragPos.y - ty) ** 2);
        if (dist < closestDist) {
          closestDist = dist;
          closestDest = d.to;
        }
      }

      if (closestDest !== null && closestDist < PT_W * 2.5) {
        const dest = legalDestinations.find(d => d.to === closestDest);
        if (dest) {
          makeSingleDieMove(drag.fromPoint, dest.to, dest.die);
        }
      }
    }
    // If distance <= 15, it was a click, which selectPoint already handled

    setDrag(null);
    setDragPos(null);
  }, [drag, dragPos, legalDestinations, makeSingleDieMove]);

  const handlePtClick = useCallback((e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    if (!drag) selectPoint(idx);
  }, [selectPoint, drag]);

  const handleBarClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!drag) selectPoint(BAR);
  }, [selectPoint, drag]);

  const isPlayerChecker = (count: number) => count > 0;
  const checkerColors = { playerCol: c.player, oppCol: c.opp, playerDim: c.playerDim, oppDim: c.oppDim, shadow: c.checkerShadow };

  const renderPointCheckers = (idx: number) => {
    const count = displayBoard[idx];
    if (count === 0) return null;
    const abs = Math.abs(count);
    const cx = ptX(idx);
    const player = isPlayerChecker(count);
    const isSel = selectedPoint === idx;
    const canDrag = player && turnPhase === 'move' && currentPlayer === 0;

    return Array.from({ length: Math.min(abs, 5) }, (_, n) => {
      const cy = checkerCY(idx, n);
      const isTopmost = n === Math.min(abs, 5) - 1;
      const label = abs > 5 && isTopmost ? String(abs) : undefined;
      const sel = isSel && isTopmost;
      const isDragging = drag?.fromPoint === idx && isTopmost;

      let renderCX = cx;
      let renderCY = cy;
      if (isDragging && dragPos) {
        renderCX = dragPos.x;
        renderCY = dragPos.y;
      }

      return (
        <Checker
          key={`${idx}-${n}`}
          cx={renderCX} cy={renderCY}
          isPlayer={player}
          isSelected={sel}
          label={label}
          isDraggable={canDrag && isTopmost}
          onDragStart={(e) => handleDragStart(idx, e)}
          {...checkerColors}
        />
      );
    });
  };

  // Bar
  const barCX = M + HALF_W + BAR_W / 2;
  const whiteBarCount = displayBoard[BAR];
  const blackBarCount = displayBoard[OPP_BAR];
  const myPips = pipCount(displayBoard);
  const oppPips = opponentPipCount(displayBoard);

  return (
    <>
      {/* ── Top Bar ── */}
      <div className="top-bar">
        <div className="player-info">
          <div className={`avatar${currentPlayer === 0 ? ' active' : ''}`}
            style={{ background: c.playerDim }}>
            <span style={{ fontSize: 18 }}>Y</span>
          </div>
          <div className="player-meta">
            <div className="player-name">You</div>
            <div className="player-score">{matchScore[0]}</div>
          </div>
        </div>

        <div className="match-info">
          <div className="match-label">
            {matchLength > 1 ? `First to ${matchLength}` : 'Single'}
          </div>
          <div className="pip-row">
            <span className="pip-count you">{myPips}</span>
            <span className="pip-count opp">{oppPips}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="player-info right">
            <div className={`avatar${currentPlayer === 1 ? ' active opp' : ''}`}
              style={{ background: c.oppDim }}>
              <span style={{ fontSize: 18 }}>AI</span>
            </div>
            <div className="player-meta">
              <div className="player-name">Opponent</div>
              <div className="player-score">{matchScore[1]}</div>
            </div>
          </div>
          {/* Quit button — top right */}
          {onQuit && (
            <button className="action-btn secondary" onClick={handleQuit}
              style={{ fontSize: 11, height: 28, padding: '0 10px', whiteSpace: 'nowrap' }}>
              Quit
            </button>
          )}
        </div>
      </div>

      {/* ── Controls centered above board ── */}
      {turnPhase !== 'game-over' && (
        <div style={{
          display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center',
          padding: '8px 0 0', flexShrink: 0, minHeight: 46,
        }}>
          {/* Opening roll */}
          {turnPhase === 'opening-roll' && !openingRoll && (
            <button className="action-btn primary" onClick={performOpeningRoll}>
              Roll for First Move
            </button>
          )}
          {turnPhase === 'opening-roll' && openingRoll && (
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
              {openingWinner === 'tie'
                ? 'Tie! Rolling again...'
                : openingWinner === 'you'
                  ? 'You go first!'
                  : 'Opponent goes first'}
            </span>
          )}

          {/* Roll button — always visible during normal play, disabled when not your roll */}
          {turnPhase !== 'opening-roll' && (() => {
            const canRoll = turnPhase === 'roll' && currentPlayer === 0;
            return (
              <button
                className={`action-btn ${canRoll ? 'primary' : 'secondary'}`}
                onClick={canRoll ? rollDiceAction : undefined}
                disabled={!canRoll}
                style={!canRoll ? { opacity: 0.35, cursor: 'default' } : undefined}
              >
                Roll
              </button>
            );
          })()}

          {/* Double button — only during roll phase */}
          {turnPhase === 'roll' && currentPlayer === 0 && doublingCube.owner !== 1 && (
            <button className="action-btn secondary" onClick={offerDoubleAction}>
              x{doublingCube.value * 2}
            </button>
          )}

          {/* Hint button — during move phase */}
          {turnPhase === 'move' && currentPlayer === 0 && !turnComplete && (
            <button className="action-btn secondary"
              onClick={showingHint ? clearHint : requestHint}
              style={{ fontSize: 12, padding: '0 12px' }}>
              {showingHint ? '✕ Hide' : '💡 Hint'}
            </button>
          )}

          {/* Undo button — during move phase when moves have been made */}
          {turnPhase === 'move' && currentPlayer === 0 && turnUndoStack.length > 0 && (
            <button className="action-btn secondary" onClick={undoMove}>
              Undo
            </button>
          )}

          {/* Dice remaining indicator */}
          {turnPhase === 'move' && currentPlayer === 0 && !turnComplete && dice.length > 0 && (
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              {dice.length === 1 ? '1 die left' : `${dice.length} dice left`}
            </span>
          )}

          {/* Done button — when turn is complete */}
          {turnPhase === 'move' && currentPlayer === 0 && turnComplete && !tutorWarning && (
            <button className="action-btn primary" onClick={endTurn}>
              Done
            </button>
          )}

          {/* Tutor warning — shown instead of Done when tutor detects a bad move */}
          {tutorWarning && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--opponent-dim)', borderRadius: 10, padding: '6px 12px',
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--opponent)' }}>
                ⚠️ {tutorWarning.message}
              </span>
              <button className="action-btn secondary" onClick={() => { dismissTutorWarning(); undoMove(); }}
                style={{ fontSize: 11, height: 26, padding: '0 8px' }}>
                ↩ Undo
              </button>
              <button className="action-btn primary" onClick={confirmTutorWarning}
                style={{ fontSize: 11, height: 26, padding: '0 8px' }}>
                Keep Move
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Dice (above board) ── */}
      {(() => {
        // Opening roll: show both dice side by side with labels
        if (openingRoll) {
          return (
            <div style={{
              display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'center',
              padding: '4px 0', flexShrink: 0,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--player)', textTransform: 'uppercase', letterSpacing: 0.5 }}>You</span>
                <svg width={44} height={44} viewBox="0 0 44 44" className="die-group">
                  <rect width={44} height={44} rx={10}
                    fill={c.dieBg}
                    stroke={openingRoll[0] > openingRoll[1] ? c.player : c.dieStroke}
                    strokeWidth={openingRoll[0] > openingRoll[1] ? 2.5 : 1} />
                  <DiePips value={openingRoll[0]} cx={22} cy={22} size={44} color={c.diePip} />
                </svg>
              </div>
              <span style={{ fontSize: 14, color: 'var(--text-dim)', fontWeight: 600 }}>vs</span>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--opponent)', textTransform: 'uppercase', letterSpacing: 0.5 }}>AI</span>
                <svg width={44} height={44} viewBox="0 0 44 44" className="die-group">
                  <rect width={44} height={44} rx={10}
                    fill={c.dieBg}
                    stroke={openingRoll[1] > openingRoll[0] ? c.opp : c.dieStroke}
                    strokeWidth={openingRoll[1] > openingRoll[0] ? 2.5 : 1} />
                  <DiePips value={openingRoll[1]} cx={22} cy={22} size={44} color={c.diePip} />
                </svg>
              </div>
            </div>
          );
        }

        // Normal dice display
        const showDice = aiDice.length > 0 ? aiDice : dice;
        const isAIDice = aiDice.length > 0;
        if (showDice.length === 0) return null;
        return (
          <div style={{
            display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center',
            padding: '4px 0', flexShrink: 0,
          }}>
            {isAIDice && (
              <span style={{ fontSize: 11, color: 'var(--opponent)', marginRight: 4, fontWeight: 600 }}>
                AI
              </span>
            )}
            {showDice.map((d, i) => (
              <svg key={i} width={36} height={36} viewBox="0 0 36 36" className="die-group">
                <rect width={36} height={36} rx={8}
                  fill={c.dieBg}
                  stroke={isAIDice ? 'rgba(255,107,107,0.3)' : c.dieStroke}
                  strokeWidth={isAIDice ? 2 : 1} />
                <DiePips value={d} cx={18} cy={18} size={36} color={c.diePip} />
              </svg>
            ))}
          </div>
        );
      })()}

      {/* ── Board ── */}
      <div className="board-area">
        <div className="board-wrap">
          <svg
            ref={svgRef}
            className="board-svg"
            viewBox={`0 0 ${BW} ${BH}`}
            preserveAspectRatio="xMidYMid meet"
            onClick={clearSelection}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
          >
            <defs>
              <linearGradient id="boardGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#15172200" />
                <stop offset="50%" stopColor="#0a0b1008" />
                <stop offset="100%" stopColor="#15172200" />
              </linearGradient>
              {/* Light mode: fade frame top edge into page background */}
              <linearGradient id="frameGradLight" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={theme === 'light' ? '#e8e9ee' : c.frameBg} />
                <stop offset="8%" stopColor={c.frameBg} />
                <stop offset="92%" stopColor={c.frameBg} />
                <stop offset="100%" stopColor={theme === 'light' ? '#e8e9ee' : c.frameBg} />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Frame */}
            <rect width={BW} height={BH} fill="url(#frameGradLight)" rx={16} />
            {/* Board surface */}
            <rect x={M} y={M} width={BW - 2 * M} height={BH - 2 * M}
              fill={c.boardBg} rx={8} />
            {/* Subtle gradient overlay */}
            <rect x={M} y={M} width={BW - 2 * M} height={BH - 2 * M}
              fill="url(#boardGrad)" rx={8} />

            {/* Center line */}
            <line x1={M} y1={BH / 2} x2={M + HALF_W} y2={BH / 2}
              stroke={c.centerLine} strokeWidth={1} />
            <line x1={M + HALF_W + BAR_W} y1={BH / 2} x2={BW - M} y2={BH / 2}
              stroke={c.centerLine} strokeWidth={1} />

            {/* Triangles */}
            {Array.from({ length: 24 }, (_, idx) => {
              const dest = destMap.get(idx);
              const blocked = blockedDests.get(idx);
              const destType = dest ? (displayBoard[idx] === -1 ? 'hit' : 'open') : null;
              return (
                <Triangle
                  key={idx} idx={idx} destType={destType}
                  dieValue={dest?.die ?? null}
                  blockedDie={blocked ?? null}
                  onClick={(e) => handlePtClick(e, idx)}
                  triA={c.triA} triB={c.triB} destGlow={c.destGlow} destHitGlow={c.destHitGlow}
                  checkerCount={displayBoard[idx]}
                />
              );
            })}

            {/* Bar */}
            <rect x={M + HALF_W} y={M} width={BAR_W} height={BH - 2 * M}
              fill={c.barBg} rx={4}
              onClick={handleBarClick}
              style={{ cursor: whiteBarCount > 0 ? 'pointer' : 'default' }} />
            {/* Bar divider */}
            <line x1={M + HALF_W + 8} y1={BH / 2} x2={M + HALF_W + BAR_W - 8} y2={BH / 2}
              stroke="rgba(255,255,255,0.06)" strokeWidth={1} />

            {/* Bar destination glow */}
            {destMap.has(BAR) && (
              <circle cx={barCX} cy={BH / 2} r={CR + 4}
                fill="none" stroke={c.destGlow} strokeWidth={2.5} className="dest-glow" />
            )}

            {/* Home tray destination glow */}
            {destMap.has(HOME) && (
              <g>
                <rect x={BW - M - 8} y={BH - M - CR * 4} width={16} height={CR * 4}
                  rx={4} fill="none" stroke={c.destGlow} strokeWidth={2} className="dest-glow" />
              </g>
            )}

            {/* Point checkers */}
            {Array.from({ length: 24 }, (_, idx) => renderPointCheckers(idx))}

            {/* Combined destination indicators — where piece ends up using both dice */}
            {Array.from(combinedDests.entries()).map(([idx, label]) => {
              if (idx === HOME || idx < 0 || idx > 23) return null;
              const cx = ptX(idx);
              const top = isTop(idx);
              const count = Math.abs(displayBoard[idx]);
              const nextN = Math.min(count, 5);
              const cy = top
                ? M + CR + 4 + nextN * (CR * 2.05)
                : BH - M - CR - 4 - nextN * (CR * 2.05);
              return (
                <g key={`combo-${idx}`}
                  onClick={(e) => { e.stopPropagation(); handlePtClick(e, idx); }}
                  style={{ cursor: 'default', opacity: 0.5 }}>
                  <circle cx={cx} cy={cy} r={CR * 0.75}
                    fill="none"
                    stroke={c.destGlow}
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                  />
                  <text x={cx} y={cy + 1}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={8} fontWeight="600"
                    fill={c.player}
                    style={{ pointerEvents: 'none', fontFamily: 'var(--font)' }}>
                    {label}
                  </text>
                </g>
              );
            })}

            {/* AI move highlights — glow on points where AI just moved */}
            {aiHighlights.map((displayIdx, i) => {
              if (displayIdx < 0 || displayIdx > 23) return null;
              const hx = ptX(displayIdx);
              const top = isTop(displayIdx);
              // Glow on the topmost checker position
              const count = Math.abs(displayBoard[displayIdx]);
              const hy = count > 0
                ? (top ? M + CR + 4 + (Math.min(count, 5) - 1) * (CR * 2.05) : BH - M - CR - 4 - (Math.min(count, 5) - 1) * (CR * 2.05))
                : (top ? M + CR + 4 : BH - M - CR - 4);
              return (
                <circle key={`ai-hl-${i}`} cx={hx} cy={hy} r={CR + 6}
                  fill="none" stroke={c.opp} strokeWidth={2.5}
                  opacity={0.7} className="dest-glow" />
              );
            })}

            {/* White bar checkers */}
            {Array.from({ length: whiteBarCount }, (_, n) => {
              const cy = BH / 2 + CR + 8 + n * (CR * 2.05);
              const canDrag = turnPhase === 'move' && currentPlayer === 0;
              const isDragging = drag?.fromPoint === BAR && n === 0;
              return (
                <Checker key={`bar-w-${n}`}
                  cx={isDragging && dragPos ? dragPos.x : barCX}
                  cy={isDragging && dragPos ? dragPos.y : cy}
                  isPlayer={true}
                  isSelected={selectedPoint === BAR && n === 0}
                  isDraggable={canDrag && n === 0}
                  onDragStart={(e) => handleDragStart(BAR, e)}
                  {...checkerColors}
                />
              );
            })}

            {/* Black bar checkers */}
            {Array.from({ length: blackBarCount }, (_, n) => {
              const cy = BH / 2 - CR - 8 - n * (CR * 2.05);
              return <Checker key={`bar-b-${n}`} cx={barCX} cy={cy} isPlayer={false} {...checkerColors} />;
            })}

            {/* Dice moved outside SVG */}

            {/* AI thinking indicator */}
            {isAIThinking && (
              <g>
                <rect x={BW / 2 - 40} y={BH / 2 - 14} width={80} height={28}
                  rx={14} fill={c.thinkBg} />
                <circle className="thinking-dot" cx={BW / 2 - 12} cy={BH / 2} r={3} fill={c.opp} />
                <circle className="thinking-dot" cx={BW / 2} cy={BH / 2} r={3} fill={c.opp} />
                <circle className="thinking-dot" cx={BW / 2 + 12} cy={BH / 2} r={3} fill={c.opp} />
              </g>
            )}

            {/* Doubling cube */}
            {doublingCube.value > 1 && (
              <g>
                <rect x={M + HALF_W + 8} y={BH / 2 - 14} width={24} height={24}
                  rx={6} fill={c.triB} stroke={c.dieStroke} strokeWidth={1} />
                <text x={M + HALF_W + 20} y={BH / 2 + 2} textAnchor="middle"
                  fontSize={12} fontWeight="700" fill={c.cubeText}
                  style={{ fontFamily: 'var(--font)' }}>
                  {doublingCube.value}
                </text>
              </g>
            )}

            {/* Double offered */}
            {turnPhase === 'double-offered' && currentPlayer !== doublingCube.offeredBy && (
              <g>
                <rect x={BW / 2 - 110} y={BH / 2 - 50} width={220} height={100}
                  rx={16} fill="rgba(10,11,16,0.95)"
                  stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
                <text x={BW / 2} y={BH / 2 - 18} textAnchor="middle"
                  fontSize={14} fill="rgba(255,255,255,0.8)" style={{ fontFamily: 'var(--font)' }}>
                  Double to {doublingCube.value * 2}?
                </text>
                <g onClick={(e) => { e.stopPropagation(); acceptDoubleAction(); }} style={{ cursor: 'pointer' }}>
                  <rect x={BW / 2 - 96} y={BH / 2 + 4} width={88} height={32} rx={16}
                    fill={c.player} />
                  <text x={BW / 2 - 52} y={BH / 2 + 25} textAnchor="middle"
                    fontSize={13} fontWeight="600" fill="#0a0b10"
                    style={{ fontFamily: 'var(--font)' }}>Accept</text>
                </g>
                <g onClick={(e) => { e.stopPropagation(); rejectDoubleAction(); }} style={{ cursor: 'pointer' }}>
                  <rect x={BW / 2 + 8} y={BH / 2 + 4} width={88} height={32} rx={16}
                    fill="rgba(255,107,107,0.2)" />
                  <text x={BW / 2 + 52} y={BH / 2 + 25} textAnchor="middle"
                    fontSize={13} fontWeight="600" fill={c.opp}
                    style={{ fontFamily: 'var(--font)' }}>Decline</text>
                </g>
              </g>
            )}

            {/* Hint overlay — ghost arrows showing AI's recommended move */}
            {showingHint && hintMove && hintMove.length > 0 && (() => {
              // Convert each die move to SVG coordinates for arrows
              const arrows = hintMove.map((dm: { from: number; to: number; die: number }) => {
                const fromPt = dm.from === BAR ? BW / 2 : (() => {
                  const fi = dm.from;
                  const col = fi < 12 ? (fi < 6 ? 5 - fi : fi - 6) : (fi < 18 ? 17 - fi : fi - 12);
                  const isRight = fi < 6 || (fi >= 12 && fi < 18);
                  return M + (isRight ? HALF_W + BAR_W : 0) + col * PT_W + PT_W / 2;
                })();
                const fromY = dm.from === BAR ? BH / 2 : (dm.from < 12 ? BH - M - 20 : M + 20);

                const toPt = dm.to === HOME ? BW - 6 : (() => {
                  const ti = dm.to;
                  const col = ti < 12 ? (ti < 6 ? 5 - ti : ti - 6) : (ti < 18 ? 17 - ti : ti - 12);
                  const isRight = ti < 6 || (ti >= 12 && ti < 18);
                  return M + (isRight ? HALF_W + BAR_W : 0) + col * PT_W + PT_W / 2;
                })();
                const toY = dm.to === HOME ? BH / 2 : (dm.to < 12 ? BH - M - 40 : M + 40);

                return { x1: fromPt, y1: fromY, x2: toPt, y2: toY };
              });

              return (
                <g opacity={0.6} style={{ pointerEvents: 'none' }}>
                  {arrows.map((a: { x1: number; y1: number; x2: number; y2: number }, i: number) => (
                    <g key={i}>
                      <line x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
                        stroke="#FFD700" strokeWidth={3} strokeLinecap="round"
                        strokeDasharray="8 4" className="dest-glow" />
                      <circle cx={a.x2} cy={a.y2} r={8}
                        fill="#FFD700" opacity={0.5} className="dest-glow" />
                    </g>
                  ))}
                </g>
              );
            })()}

            {/* Win overlay */}
            {turnPhase === 'game-over' && (
              <g>
                <rect width={BW} height={BH} fill="rgba(10,11,16,0.85)" rx={16} />
                <g className="win-overlay">
                  <text x={BW / 2} y={BH / 2 - 40} textAnchor="middle"
                    fontSize={48} fontWeight="800" fill={winner === 0 ? c.player : c.opp}
                    style={{ fontFamily: 'var(--font)' }}>
                    {winner === 0 ? 'Victory' : 'Defeat'}
                  </text>
                  <text x={BW / 2} y={BH / 2 + 5} textAnchor="middle"
                    fontSize={14} fill="rgba(255,255,255,0.5)" style={{ fontFamily: 'var(--font)' }}>
                    {winner === 0 ? 'You outplayed the AI' : 'Better luck next time'}
                  </text>
                  <g onClick={(e) => { e.stopPropagation(); startNewGame(); }} style={{ cursor: 'pointer' }}>
                    <rect x={BW / 2 - 70} y={BH / 2 + 30} width={140} height={44}
                      rx={22} fill={c.player} />
                    <text x={BW / 2} y={BH / 2 + 57} textAnchor="middle"
                      fontSize={14} fontWeight="700" fill="#0a0b10"
                      style={{ fontFamily: 'var(--font)' }}>Play Again</text>
                  </g>
                </g>
              </g>
            )}
          </svg>
        </div>
      </div>

      {/* ── Action Bar ── */}
      <div className="action-bar">
        {isAIThinking && (
          <span style={{ fontSize: 12, color: 'var(--opponent)', padding: '0 8px' }}>
            AI thinking...
          </span>
        )}

        <div style={{ flex: 1 }} />

        {onDashboard && (
          <button className="action-btn secondary" style={{ fontSize: 11, height: 30, padding: '0 10px' }}
            onClick={onDashboard}>Online</button>
        )}
        {onChallenges && (
          <button className="action-btn secondary" style={{ fontSize: 11, height: 30, padding: '0 10px' }}
            onClick={onChallenges}>Puzzles</button>
        )}

        <span className="seed-label" onClick={() => setShowVerifyDialog(true)}>
          {prng.seed.toString(16).toUpperCase().padStart(8, '0')}
        </span>

        <button className="action-btn secondary icon-only" onClick={toggleTheme}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'} style={{ width: 30, height: 30 }}>
          {theme === 'dark' ? (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M14 9.5A6.5 6.5 0 0 1 6.5 2 6.5 6.5 0 1 0 14 9.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>

      </div>

      {/* ── Verify Dialog ── */}
      {showVerifyDialog && (
        <div className="overlay-backdrop" onClick={() => setShowVerifyDialog(false)}>
          <div className="overlay-card" onClick={(e) => e.stopPropagation()}>
            <h2>Dice Verification</h2>
            <p>
              Seed: <code style={{
                background: c.playerDim, color: c.player,
                padding: '2px 8px', borderRadius: 4, fontSize: 12,
              }}>
                {prng.seed.toString(16).toUpperCase().padStart(8, '0')}
              </code>
              <br />All rolls are deterministic via Mulberry32.
            </p>
            <div style={{
              fontFamily: "'SF Mono', monospace", fontSize: 12,
              maxHeight: 200, overflowY: 'auto',
              background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '8px 12px',
              textAlign: 'left', color: 'var(--text-muted)',
            }}>
              {rollHistory.length === 0
                ? <div style={{ color: 'var(--text-dim)' }}>No rolls yet.</div>
                : rollHistory.map(([d1, d2], i) => (
                  <div key={i} style={{ padding: '2px 0' }}>
                    <span style={{ color: 'var(--text-dim)', marginRight: 8 }}>{i + 1}.</span>
                    {d1} + {d2}
                  </div>
                ))}
            </div>
            <button className="action-btn primary" style={{ marginTop: 16, width: '100%' }}
              onClick={() => setShowVerifyDialog(false)}>Done</button>
          </div>
        </div>
      )}

      {/* Quit confirmation dialog */}
      {showQuitConfirm && (
        <div className="overlay-backdrop" onClick={() => setShowQuitConfirm(false)}>
          <div className="overlay-card" onClick={(e) => e.stopPropagation()}>
            <h2>End current game?</h2>
            <p>Your game in progress will be lost.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="action-btn primary" style={{ flex: 1 }}
                onClick={() => setShowQuitConfirm(false)}>
                Return to Game
              </button>
              <button className="action-btn secondary" style={{ flex: 1 }}
                onClick={() => { setShowQuitConfirm(false); onQuit?.(); }}>
                Exit to Home
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
