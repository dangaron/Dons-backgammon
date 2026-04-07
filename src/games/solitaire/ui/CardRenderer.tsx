/**
 * SVG playing card renderer. Theme-aware via CSS variables.
 */

import { memo } from 'react';
import type { CardId } from '../engine/types';
import { rankOf, suitOf, colorOf, rankLabel, suitSymbol } from '../engine/deck';

export const CARD_W = 65;
export const CARD_H = 90;
const CORNER_R = 6;

interface CardProps {
  id: CardId;
  x: number;
  y: number;
  faceUp?: boolean;
  selected?: boolean;
  highlighted?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  dimmed?: boolean;
}

export const Card = memo(function Card({
  id, x, y, faceUp = true, selected = false, highlighted = false,
  onClick, onDoubleClick, dimmed = false,
}: CardProps) {
  if (!faceUp) {
    return (
      <g transform={`translate(${x},${y})`} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
        <rect
          width={CARD_W} height={CARD_H} rx={CORNER_R}
          fill="var(--card-back, #2563eb)"
          stroke="var(--card-back-border, #1d4ed8)"
          strokeWidth={1.5}
        />
        {/* Cross-hatch pattern */}
        <rect x={4} y={4} width={CARD_W - 8} height={CARD_H - 8} rx={3}
          fill="none" stroke="var(--card-back-pattern, rgba(255,255,255,0.15))" strokeWidth={0.8} />
        <line x1={10} y1={10} x2={CARD_W - 10} y2={CARD_H - 10} stroke="var(--card-back-pattern, rgba(255,255,255,0.1))" strokeWidth={0.5} />
        <line x1={CARD_W - 10} y1={10} x2={10} y2={CARD_H - 10} stroke="var(--card-back-pattern, rgba(255,255,255,0.1))" strokeWidth={0.5} />
      </g>
    );
  }

  const rank = rankOf(id);
  const suit = suitOf(id);
  const color = colorOf(id);
  const label = rankLabel(rank);
  const symbol = suitSymbol(suit);
  const textColor = color === 'red' ? 'var(--card-red, #dc2626)' : 'var(--card-black, #1e293b)';

  return (
    <g
      transform={`translate(${x},${y})`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      opacity={dimmed ? 0.5 : 1}
    >
      {/* Card background */}
      <rect
        width={CARD_W} height={CARD_H} rx={CORNER_R}
        fill="var(--card-face, #ffffff)"
        stroke={selected ? 'var(--accent, #4ecdc4)' : highlighted ? 'var(--card-highlight, #22c55e)' : 'var(--card-border, #cbd5e1)'}
        strokeWidth={selected || highlighted ? 2.5 : 1}
      />

      {/* Selection glow */}
      {selected && (
        <rect
          width={CARD_W} height={CARD_H} rx={CORNER_R}
          fill="none"
          stroke="var(--accent, #4ecdc4)"
          strokeWidth={3}
          opacity={0.4}
        />
      )}

      {/* Top-left rank + suit */}
      <text x={5} y={15} fontSize={12} fontWeight={800} fill={textColor} fontFamily="var(--font)">
        {label}
      </text>
      <text x={5} y={27} fontSize={11} fill={textColor}>
        {symbol}
      </text>

      {/* Center suit symbol */}
      <text
        x={CARD_W / 2} y={CARD_H / 2 + 6}
        fontSize={rank === 1 || rank >= 11 ? 28 : 22}
        fill={textColor}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {symbol}
      </text>

      {/* Face card label */}
      {rank >= 11 && (
        <text
          x={CARD_W / 2} y={CARD_H / 2 - 14}
          fontSize={16} fontWeight={900}
          fill={textColor}
          textAnchor="middle"
          fontFamily="var(--font)"
        >
          {label}
        </text>
      )}

      {/* Bottom-right rank + suit (rotated) */}
      <g transform={`translate(${CARD_W},${CARD_H}) rotate(180)`}>
        <text x={5} y={15} fontSize={12} fontWeight={800} fill={textColor} fontFamily="var(--font)">
          {label}
        </text>
        <text x={5} y={27} fontSize={11} fill={textColor}>
          {symbol}
        </text>
      </g>
    </g>
  );
});

/** Empty pile placeholder (dashed outline). */
export const EmptyPile = memo(function EmptyPile({
  x, y, label, onClick, highlighted = false,
}: {
  x: number; y: number; label?: string; onClick?: () => void; highlighted?: boolean;
}) {
  return (
    <g transform={`translate(${x},${y})`} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <rect
        width={CARD_W} height={CARD_H} rx={CORNER_R}
        fill="none"
        stroke={highlighted ? 'var(--card-highlight, #22c55e)' : 'var(--card-empty, rgba(255,255,255,0.15))'}
        strokeWidth={highlighted ? 2 : 1.5}
        strokeDasharray={highlighted ? 'none' : '4 3'}
      />
      {label && (
        <text
          x={CARD_W / 2} y={CARD_H / 2 + 5}
          fontSize={16} fill="var(--card-empty, rgba(255,255,255,0.2))"
          textAnchor="middle" fontFamily="var(--font)"
        >
          {label}
        </text>
      )}
    </g>
  );
});
