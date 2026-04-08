/**
 * Post-hand analysis screen for Bridge.
 * Shows bidding and play analysis with ratings and mistake breakdowns.
 */

import { ArrowLeft, RotateCcw } from 'lucide-react';
import type { BridgeHandAnalysis } from '../engine/analysis';

interface HandAnalysisProps {
  analysis: BridgeHandAnalysis;
  onNewHand: () => void;
  onBack: () => void;
}

const RATING_CONFIG: Record<BridgeHandAnalysis['rating'], { emoji: string; label: string; color: string }> = {
  excellent: { emoji: '🌟', label: 'Excellent', color: 'var(--accent)' },
  good: { emoji: '👍', label: 'Good', color: 'var(--player)' },
  average: { emoji: '😐', label: 'Average', color: 'var(--text-muted)' },
  poor: { emoji: '😔', label: 'Needs Work', color: 'var(--opponent)' },
};

export function HandAnalysis({ analysis, onNewHand, onBack }: HandAnalysisProps) {
  const ratingInfo = RATING_CONFIG[analysis.rating];
  const biddingMistakes = analysis.mistakes.filter(m => m.phase === 'bidding');
  const playMistakes = analysis.mistakes.filter(m => m.phase === 'play');

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      flex: 1, background: 'var(--bg)',
    }}>
      {/* Top bar */}
      <div className="top-bar">
        <button className="action-btn secondary" onClick={onBack}
          style={{ fontSize: 11, height: 28, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
          <ArrowLeft size={14} />
          Back
        </button>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', letterSpacing: 1 }}>
          HAND ANALYSIS
        </div>
        <div style={{ width: 60 }} />
      </div>

      {/* Content */}
      <div style={{
        flex: 1, overflow: 'auto', padding: '20px',
        display: 'flex', flexDirection: 'column', gap: 20,
        maxWidth: 440, margin: '0 auto', width: '100%',
      }}>
        {/* Overall rating */}
        <div style={{
          textAlign: 'center', padding: '20px 16px',
          background: 'var(--surface)',
          border: '1px solid var(--glass-border)',
          borderRadius: 16,
          animation: 'slide-up 0.4s ease-out',
        }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>{ratingInfo.emoji}</div>
          <div style={{
            fontSize: 22, fontWeight: 900, color: ratingInfo.color,
            marginBottom: 4,
          }}>
            {ratingInfo.label}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {analysis.optimalPlays} of {analysis.totalPlays} optimal plays ({analysis.optimalPercentage}%)
          </div>
        </div>

        {/* Score bars */}
        <div style={{
          display: 'flex', gap: 12,
          animation: 'slide-up 0.4s ease-out 0.1s both',
        }}>
          <ScoreBar label="Bidding" score={analysis.biddingScore} />
          <ScoreBar label="Play" score={analysis.playScore} />
        </div>

        {/* Bidding analysis */}
        {biddingMistakes.length > 0 && (
          <Section title="Bidding Analysis">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {biddingMistakes.map((mistake, i) => (
                <MistakeCard key={i} description={mistake.description} suggestion={mistake.suggestion} />
              ))}
            </div>
          </Section>
        )}

        {biddingMistakes.length === 0 && (
          <Section title="Bidding Analysis">
            <div style={{
              fontSize: 13, color: 'var(--accent)', fontWeight: 600,
              textAlign: 'center', padding: '8px 0',
            }}>
              No bidding mistakes detected. Nice job!
            </div>
          </Section>
        )}

        {/* Play analysis */}
        {playMistakes.length > 0 && (
          <Section title="Play Analysis">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {playMistakes.map((mistake, i) => (
                <MistakeCard key={i} description={mistake.description} suggestion={mistake.suggestion} />
              ))}
            </div>
          </Section>
        )}

        {playMistakes.length === 0 && (
          <Section title="Play Analysis">
            <div style={{
              fontSize: 13, color: 'var(--accent)', fontWeight: 600,
              textAlign: 'center', padding: '8px 0',
            }}>
              No play mistakes detected. Well played!
            </div>
          </Section>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, paddingBottom: 20 }}>
          <button className="action-btn primary" onClick={onNewHand}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <RotateCcw size={14} /> New Hand
          </button>
          <button className="action-btn secondary" onClick={onBack} style={{ flex: 1 }}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helper Components ────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
      }}>
        {title}
      </div>
      <div style={{
        background: 'var(--surface-2)', border: '1px solid var(--glass-border)',
        borderRadius: 14, padding: 16,
      }}>
        {children}
      </div>
    </div>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const barColor = score >= 80 ? 'var(--accent)' :
                   score >= 60 ? 'var(--player)' :
                   score >= 40 ? '#e6a817' :
                   'var(--opponent)';
  return (
    <div style={{
      flex: 1, padding: '14px 16px',
      background: 'var(--surface)', border: '1px solid var(--glass-border)',
      borderRadius: 14,
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: 8,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 900, color: barColor }}>{score}%</div>
      </div>
      <div style={{
        height: 6, borderRadius: 3, background: 'var(--surface-2)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', borderRadius: 3,
          background: barColor,
          width: `${score}%`,
          transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  );
}

function MistakeCard({ description, suggestion }: { description: string; suggestion: string }) {
  return (
    <div style={{
      padding: '10px 12px',
      background: 'var(--surface)',
      borderRadius: 10,
      borderLeft: '3px solid var(--opponent)',
    }}>
      <div style={{
        fontSize: 12, fontWeight: 600, color: 'var(--text)',
        marginBottom: 4, lineHeight: 1.4,
      }}>
        {description}
      </div>
      <div style={{
        fontSize: 11, color: 'var(--accent)', fontWeight: 600,
        lineHeight: 1.4,
      }}>
        {suggestion}
      </div>
    </div>
  );
}
