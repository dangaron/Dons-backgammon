/**
 * Yahtzee scorecard component. Shows both players' scores side by side.
 */

import type { Category, PlayerState } from '../engine/types';
import {
  UPPER_CATEGORIES, LOWER_CATEGORIES, ALL_CATEGORIES, CATEGORY_LABELS,
  UPPER_BONUS_THRESHOLD, UPPER_BONUS_VALUE,
} from '../engine/types';
import { upperSubtotal, upperBonus, totalScore } from '../engine/scoring';

interface ScorecardProps {
  players: [PlayerState, PlayerState];
  currentPlayer: 0 | 1;
  potentialScores: Partial<Record<Category, number>>;
  onScore: (category: Category) => void;
  canScore: boolean;
  isAI: boolean; // player 1 is AI
}

export function Scorecard({ players, currentPlayer, potentialScores, onScore, canScore, isAI }: ScorecardProps) {
  const p0 = players[0];
  const p1 = players[1];

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--glass-border)',
      borderRadius: 14,
      overflow: 'hidden',
      fontSize: 12,
      fontFamily: 'var(--font)',
    }}>
      {/* Header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 60px 60px',
        background: 'var(--surface-2)',
        borderBottom: '1px solid var(--glass-border)',
        fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8,
        color: 'var(--text-dim)',
      }}>
        <div style={{ padding: '8px 10px' }}>Category</div>
        <div style={{ padding: '8px 6px', textAlign: 'center', color: currentPlayer === 0 ? 'var(--player)' : 'var(--text-dim)' }}>
          You
        </div>
        <div style={{ padding: '8px 6px', textAlign: 'center', color: currentPlayer === 1 ? 'var(--opponent)' : 'var(--text-dim)' }}>
          {isAI ? 'AI' : 'P2'}
        </div>
      </div>

      {/* Upper section */}
      <div style={{ borderBottom: '1px solid var(--glass-border)' }}>
        {UPPER_CATEGORIES.map(cat => (
          <ScoreRow
            key={cat}
            category={cat}
            p0Score={p0.scorecard[cat]}
            p1Score={p1.scorecard[cat]}
            potential={canScore && currentPlayer === 0 ? potentialScores[cat] : undefined}
            onScore={() => onScore(cat)}
            canScore={canScore && currentPlayer === 0 && !(cat in p0.scorecard)}
          />
        ))}
        {/* Upper subtotal */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 60px 60px',
          borderTop: '1px solid var(--glass-border)',
          background: 'var(--surface-2)',
          fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
        }}>
          <div style={{ padding: '4px 10px' }}>Subtotal</div>
          <div style={{ padding: '4px 6px', textAlign: 'center' }}>{upperSubtotal(p0)}/63</div>
          <div style={{ padding: '4px 6px', textAlign: 'center' }}>{upperSubtotal(p1)}/63</div>
        </div>
        {/* Bonus */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 60px 60px',
          background: 'var(--surface-2)',
          fontSize: 10, fontWeight: 700,
          color: 'var(--text-dim)',
        }}>
          <div style={{ padding: '4px 10px' }}>Bonus (63+)</div>
          <div style={{ padding: '4px 6px', textAlign: 'center', color: upperBonus(p0) > 0 ? 'var(--accent)' : undefined }}>
            {upperBonus(p0) > 0 ? `+${UPPER_BONUS_VALUE}` : '-'}
          </div>
          <div style={{ padding: '4px 6px', textAlign: 'center', color: upperBonus(p1) > 0 ? 'var(--accent)' : undefined }}>
            {upperBonus(p1) > 0 ? `+${UPPER_BONUS_VALUE}` : '-'}
          </div>
        </div>
      </div>

      {/* Lower section */}
      <div>
        {LOWER_CATEGORIES.map(cat => (
          <ScoreRow
            key={cat}
            category={cat}
            p0Score={p0.scorecard[cat]}
            p1Score={p1.scorecard[cat]}
            potential={canScore && currentPlayer === 0 ? potentialScores[cat] : undefined}
            onScore={() => onScore(cat)}
            canScore={canScore && currentPlayer === 0 && !(cat in p0.scorecard)}
            highlight={cat === 'yahtzee'}
          />
        ))}
      </div>

      {/* Yahtzee bonus */}
      {(p0.yahtzeeBonusCount > 0 || p1.yahtzeeBonusCount > 0) && (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 60px 60px',
          borderTop: '1px solid var(--glass-border)',
          background: 'var(--surface-2)',
          fontSize: 10, fontWeight: 700, color: 'var(--hit)',
        }}>
          <div style={{ padding: '4px 10px' }}>Yahtzee Bonus</div>
          <div style={{ padding: '4px 6px', textAlign: 'center' }}>
            {p0.yahtzeeBonusCount > 0 ? `+${p0.yahtzeeBonusCount * 100}` : '-'}
          </div>
          <div style={{ padding: '4px 6px', textAlign: 'center' }}>
            {p1.yahtzeeBonusCount > 0 ? `+${p1.yahtzeeBonusCount * 100}` : '-'}
          </div>
        </div>
      )}

      {/* Total */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 60px 60px',
        borderTop: '2px solid var(--glass-border)',
        background: 'var(--surface-2)',
        fontWeight: 900, fontSize: 14,
      }}>
        <div style={{ padding: '10px 10px', color: 'var(--text)' }}>TOTAL</div>
        <div style={{ padding: '10px 6px', textAlign: 'center', color: 'var(--player)' }}>
          {totalScore(p0)}
        </div>
        <div style={{ padding: '10px 6px', textAlign: 'center', color: 'var(--opponent)' }}>
          {totalScore(p1)}
        </div>
      </div>
    </div>
  );
}

function ScoreRow({ category, p0Score, p1Score, potential, onScore, canScore, highlight }: {
  category: Category;
  p0Score: number | undefined;
  p1Score: number | undefined;
  potential: number | undefined;
  onScore: () => void;
  canScore: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      onClick={canScore ? onScore : undefined}
      style={{
        display: 'grid', gridTemplateColumns: '1fr 60px 60px',
        borderBottom: '1px solid var(--border)',
        cursor: canScore ? 'pointer' : 'default',
        background: canScore ? 'var(--surface)' : 'transparent',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => canScore && (e.currentTarget.style.background = 'var(--surface-2)')}
      onMouseLeave={(e) => canScore && (e.currentTarget.style.background = 'var(--surface)')}
    >
      <div style={{
        padding: '6px 10px',
        fontWeight: highlight ? 800 : 600,
        color: highlight ? 'var(--hit)' : 'var(--text)',
        fontSize: highlight ? 13 : 12,
      }}>
        {CATEGORY_LABELS[category]}
      </div>

      {/* Player 0 score */}
      <div style={{ padding: '6px', textAlign: 'center' }}>
        {p0Score !== undefined ? (
          <span style={{ fontWeight: 700, color: 'var(--text)' }}>{p0Score}</span>
        ) : canScore && potential !== undefined ? (
          <span style={{
            color: potential > 0 ? 'var(--accent)' : 'var(--text-dim)',
            fontWeight: 600, fontSize: 11, opacity: 0.8,
          }}>
            {potential}
          </span>
        ) : (
          <span style={{ color: 'var(--text-dim)' }}>-</span>
        )}
      </div>

      {/* Player 1 score */}
      <div style={{ padding: '6px', textAlign: 'center' }}>
        {p1Score !== undefined ? (
          <span style={{ fontWeight: 700, color: 'var(--text)' }}>{p1Score}</span>
        ) : (
          <span style={{ color: 'var(--text-dim)' }}>-</span>
        )}
      </div>
    </div>
  );
}
