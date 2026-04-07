/**
 * Daily challenge selection screen.
 * Shows today's 5 challenges with difficulty, score, and completion status.
 */

import { useState, useEffect } from 'react';
import {
  getDailyChallenges, loadDailyProgress, getMaxScore, WIN_SCORE,
  type DailyProgress,
} from '../lib/dailyChallenges';
import { ArrowLeft, Trophy, Star, CheckCircle, Circle, Zap } from 'lucide-react';

interface ChallengeListScreenProps {
  onBack: () => void;
  onPlayChallenge: (challengeId: string) => void;
}

export function ChallengeListScreen({ onBack, onPlayChallenge }: ChallengeListScreenProps) {
  const [dailyChallenges] = useState(() => getDailyChallenges());
  const [progress, setProgress] = useState<DailyProgress>(() => loadDailyProgress());
  const maxScore = getMaxScore();

  // Refresh progress when returning from a challenge
  useEffect(() => {
    const handleFocus = () => setProgress(loadDailyProgress());
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Refresh on mount too
  useEffect(() => setProgress(loadDailyProgress()), []);

  const solvedCount = Object.values(progress.scores).filter(s => s.solved).length;
  const scorePercent = Math.min(100, Math.round((progress.totalScore / maxScore) * 100));

  return (
    <>
      {/* Top bar */}
      <div className="top-bar">
        <button className="action-btn secondary" onClick={onBack}
          style={{ fontSize: 11, height: 28, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
          <ArrowLeft size={14} />
          Back
        </button>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', letterSpacing: 1 }}>
          DAILY CHALLENGES
        </div>
        <div style={{ width: 60 }} />
      </div>

      {/* Score summary */}
      <div style={{
        padding: '16px 20px', flexShrink: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
      }}>
        {/* Progress bar */}
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 6,
          }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
              {solvedCount}/{dailyChallenges.length} solved
            </span>
            <span style={{
              fontSize: 13, fontWeight: 700,
              color: progress.completed ? 'var(--player)' : 'var(--text)',
            }}>
              {progress.totalScore} / {WIN_SCORE} pts
            </span>
          </div>
          <div style={{
            width: '100%', height: 8, borderRadius: 4,
            background: 'var(--surface-2)',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${scorePercent}%`, height: '100%', borderRadius: 4,
              background: progress.completed
                ? 'var(--player)'
                : `linear-gradient(90deg, var(--accent), var(--player))`,
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>

        {/* Win status */}
        {progress.completed && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', borderRadius: 10,
            background: 'var(--player-dim)',
            color: 'var(--player)', fontSize: 13, fontWeight: 700,
          }}>
            <Trophy size={16} />
            Daily challenge complete!
          </div>
        )}

        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
          Score {WIN_SCORE}+ points to win today. Bonus points for solving on first try.
        </div>
      </div>

      {/* Challenge list */}
      <div style={{
        flex: 1, overflow: 'auto', padding: '0 20px 20px',
        display: 'flex', flexDirection: 'column', gap: 10,
        maxWidth: 440, margin: '0 auto', width: '100%',
      }}>
        {dailyChallenges.map((dc, i) => {
          const score = progress.scores[dc.challenge.id];
          const solved = score?.solved || false;
          const attempted = (score?.attempts || 0) > 0;

          return (
            <ChallengeCard
              key={dc.challenge.id}
              index={i + 1}
              title={dc.challenge.title}
              description={dc.challenge.description}
              difficulty={dc.challenge.difficulty}
              basePoints={dc.points}
              earnedPoints={score?.points || 0}
              solved={solved}
              attempted={attempted}
              attempts={score?.attempts || 0}
              onClick={() => onPlayChallenge(dc.challenge.id)}
            />
          );
        })}
      </div>
    </>
  );
}

function ChallengeCard({
  index, title, description, difficulty, basePoints,
  earnedPoints, solved, attempted, attempts, onClick,
}: {
  index: number; title: string; description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  basePoints: number; earnedPoints: number;
  solved: boolean; attempted: boolean; attempts: number;
  onClick: () => void;
}) {
  const diffColor = difficulty === 'easy' ? 'var(--player)' :
    difficulty === 'medium' ? 'var(--hit)' : 'var(--opponent)';

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: '14px 16px',
        background: 'var(--surface-2)',
        border: `1px solid ${solved ? 'var(--player)' + '40' : 'var(--glass-border)'}`,
        borderRadius: 14, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 12,
        textAlign: 'left', fontFamily: 'var(--font)',
        transition: 'transform 0.15s',
        opacity: solved ? 0.85 : 1,
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      {/* Status icon */}
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: solved ? 'var(--player-dim)' : 'var(--surface)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        color: solved ? 'var(--player)' : 'var(--text-dim)',
      }}>
        {solved ? <CheckCircle size={20} /> :
         attempted ? <Circle size={20} /> :
         <span style={{ fontSize: 15, fontWeight: 800 }}>{index}</span>}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{title}</span>
          <span style={{
            fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
            padding: '1px 6px', borderRadius: 4,
            background: diffColor + '18', color: diffColor,
            letterSpacing: 0.5,
          }}>
            {difficulty}
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.3 }}>
          {description}
        </div>
        {attempted && !solved && (
          <div style={{ fontSize: 10, color: 'var(--opponent)', marginTop: 2 }}>
            {attempts} attempt{attempts > 1 ? 's' : ''} — try again
          </div>
        )}
      </div>

      {/* Points */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        {solved ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Zap size={12} style={{ color: 'var(--player)' }} />
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--player)' }}>
              {earnedPoints}
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Star size={12} style={{ color: 'var(--text-dim)' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dim)' }}>
              {basePoints}
            </span>
          </div>
        )}
      </div>
    </button>
  );
}
