/**
 * Post-game analysis screen for Yahtzee.
 * Shows rating, optimal play percentage, points left, and top mistakes.
 */

import { useYahtzeeStore } from '../store/gameStore';
import { CATEGORY_LABELS } from '../engine/types';
import type { GameRating } from '../engine/analysis';
import { ArrowLeft } from 'lucide-react';

interface GameAnalysisProps {
  onPlayAgain: () => void;
  onBack: () => void;
}

const RATING_CONFIG: Record<GameRating, { emoji: string; color: string }> = {
  'Perfect':    { emoji: '\u{1F31F}', color: '#ffd700' },  // star
  'Excellent':  { emoji: '\u{1F525}', color: '#ff6b35' },  // fire
  'Great':      { emoji: '\u{1F44D}', color: '#4ecdc4' },  // thumbs up
  'Good':       { emoji: '\u{1F60A}', color: '#95e1d3' },  // smile
  'Fair':       { emoji: '\u{1F914}', color: '#f9ca24' },  // thinking
  'Needs Work': { emoji: '\u{1F4AA}', color: '#e17055' },  // muscle
};

export function GameAnalysis({ onPlayAgain, onBack }: GameAnalysisProps) {
  const { getGameAnalysis, startNewGame, gameState } = useYahtzeeStore();
  const analysis = getGameAnalysis();

  if (!analysis) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', flex: 1, background: 'var(--bg)', padding: 20,
      }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>
          No analysis data available.
        </div>
        <button className="action-btn secondary" onClick={onBack}>
          <ArrowLeft size={14} /> Back
        </button>
      </div>
    );
  }

  const { emoji, color } = RATING_CONFIG[analysis.rating];
  const topMistakes = analysis.mistakes
    .sort((a, b) => b.difference - a.difference)
    .slice(0, 5);

  const handlePlayAgain = () => {
    startNewGame(gameState.gameMode);
    onPlayAgain();
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      flex: 1, background: 'var(--bg)', padding: '20px',
      overflow: 'auto',
    }}>
      <div style={{
        width: '100%', maxWidth: 400,
        display: 'flex', flexDirection: 'column', gap: 20,
        animation: 'slide-up 0.5s ease-out',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>{emoji}</div>
          <h2 style={{
            color, margin: '0 0 4px', fontSize: 24, fontWeight: 900,
          }}>
            {analysis.rating}
          </h2>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>
            Game Analysis
          </div>
        </div>

        {/* Optimal play percentage bar */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--glass-border)',
          borderRadius: 14, padding: 16,
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            marginBottom: 8,
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
              Optimal Play
            </span>
            <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)' }}>
              {analysis.optimalPercentage}%
            </span>
          </div>
          <div style={{
            height: 10, borderRadius: 5,
            background: 'var(--surface-2)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 5,
              width: `${analysis.optimalPercentage}%`,
              background: analysis.optimalPercentage >= 80
                ? 'var(--accent)'
                : analysis.optimalPercentage >= 50
                  ? 'var(--hit)'
                  : '#e17055',
              transition: 'width 0.8s ease-out',
            }} />
          </div>
          <div style={{
            fontSize: 11, color: 'var(--text-dim)', marginTop: 6, textAlign: 'center',
          }}>
            {analysis.optimalChoices} of {analysis.totalTurns} choices were optimal
          </div>
        </div>

        {/* Points left on table */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--glass-border)',
          borderRadius: 14, padding: 16, textAlign: 'center',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>
            Points Left on the Table
          </div>
          <div style={{
            fontSize: 32, fontWeight: 900,
            color: analysis.totalPointsLeft === 0 ? 'var(--accent)' : 'var(--hit)',
          }}>
            {analysis.totalPointsLeft}
          </div>
        </div>

        {/* Top mistakes */}
        {topMistakes.length > 0 && (
          <div>
            <div style={{
              fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
            }}>
              Top Mistakes
            </div>
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              {topMistakes.map((mistake, i) => (
                <div
                  key={i}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 12, padding: '12px 14px',
                  }}
                >
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: 6,
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-dim)' }}>
                      Turn {mistake.turn}
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 800, color: 'var(--hit)',
                      background: 'var(--hit)15',
                      padding: '2px 8px', borderRadius: 6,
                    }}>
                      -{mistake.difference} pts
                    </span>
                  </div>
                  <div style={{
                    display: 'flex', gap: 8, alignItems: 'center',
                    fontSize: 12, marginBottom: 6,
                  }}>
                    <span style={{ color: 'var(--text-dim)' }}>Chose:</span>
                    <span style={{ fontWeight: 700, color: 'var(--text)' }}>
                      {CATEGORY_LABELS[mistake.playerCategory]} ({mistake.playerScore})
                    </span>
                    <span style={{ color: 'var(--text-dim)' }}>vs</span>
                    <span style={{ fontWeight: 700, color: 'var(--accent)' }}>
                      {CATEGORY_LABELS[mistake.bestCategory]} ({mistake.bestScore})
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    {mistake.explanation}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4, marginBottom: 20 }}>
          <button
            className="action-btn primary"
            style={{ flex: 1 }}
            onClick={handlePlayAgain}
          >
            Play Again
          </button>
          <button className="action-btn secondary" style={{ flex: 1 }} onClick={onBack}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
