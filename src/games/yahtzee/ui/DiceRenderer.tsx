/**
 * SVG dice renderer for Yahtzee. 5 dice with hold/unhold interaction.
 */

import { memo } from 'react';
import type { DieValue } from '../engine/types';

const DIE_SIZE = 56;
const DOT_R = 4.5;
const CORNER_R = 8;

/** Pip (dot) positions for each die face. */
const PIP_POSITIONS: Record<number, [number, number][]> = {
  1: [[28, 28]],
  2: [[16, 16], [40, 40]],
  3: [[16, 16], [28, 28], [40, 40]],
  4: [[16, 16], [40, 16], [16, 40], [40, 40]],
  5: [[16, 16], [40, 16], [28, 28], [16, 40], [40, 40]],
  6: [[16, 16], [40, 16], [16, 28], [40, 28], [16, 40], [40, 40]],
};

interface DieProps {
  value: DieValue;
  held: boolean;
  onClick: () => void;
  animating?: boolean;
  disabled?: boolean;
  x: number;
  y: number;
}

export const Die = memo(function Die({ value, held, onClick, animating, disabled, x, y }: DieProps) {
  const pips = PIP_POSITIONS[value] || [];

  return (
    <g
      transform={`translate(${x},${y})`}
      onClick={disabled ? undefined : onClick}
      style={{ cursor: disabled ? 'default' : 'pointer' }}
    >
      {/* Die background */}
      <rect
        width={DIE_SIZE} height={DIE_SIZE} rx={CORNER_R}
        fill={held ? 'var(--accent, #4ecdc4)' : 'var(--card-face, #ffffff)'}
        stroke={held ? 'var(--accent-hover, #3ab5ad)' : 'var(--card-border, #cbd5e1)'}
        strokeWidth={held ? 2.5 : 1.5}
        style={{
          filter: held ? 'drop-shadow(0 0 8px rgba(78, 205, 196, 0.4))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
          transition: 'all 0.2s',
        }}
      />

      {/* Hold indicator */}
      {held && (
        <text
          x={DIE_SIZE / 2} y={-6}
          fontSize={8} fontWeight={800}
          fill="var(--accent)"
          textAnchor="middle"
          fontFamily="var(--font)"
        >
          HELD
        </text>
      )}

      {/* Pips */}
      {!animating && pips.map(([px, py], i) => (
        <circle
          key={i}
          cx={px} cy={py} r={DOT_R}
          fill={held ? 'var(--bg, #0a0b10)' : 'var(--card-black, #1e293b)'}
        />
      ))}

      {/* Animating shimmer */}
      {animating && (
        <text
          x={DIE_SIZE / 2} y={DIE_SIZE / 2 + 6}
          fontSize={24} fontWeight={900}
          fill="var(--text-dim)"
          textAnchor="middle"
          fontFamily="var(--font)"
        >
          ?
        </text>
      )}
    </g>
  );
});

interface DiceRowProps {
  dice: [DieValue, DieValue, DieValue, DieValue, DieValue];
  held: [boolean, boolean, boolean, boolean, boolean];
  onToggleHold: (index: number) => void;
  animating: boolean;
  disabled: boolean;
}

export function DiceRow({ dice, held, onToggleHold, animating, disabled }: DiceRowProps) {
  const gap = 10;
  const totalWidth = 5 * DIE_SIZE + 4 * gap;
  const startX = 0;

  return (
    <svg
      viewBox={`-4 -12 ${totalWidth + 8} ${DIE_SIZE + 24}`}
      style={{ width: '100%', maxWidth: totalWidth + 8 }}
    >
      {dice.map((value, i) => (
        <Die
          key={i}
          value={value}
          held={held[i]}
          onClick={() => onToggleHold(i)}
          animating={animating}
          disabled={disabled}
          x={startX + i * (DIE_SIZE + gap)}
          y={0}
        />
      ))}
    </svg>
  );
}
