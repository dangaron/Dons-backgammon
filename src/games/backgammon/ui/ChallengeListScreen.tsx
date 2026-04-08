/**
 * Daily challenge selection screen — gamified UI.
 * Duolingo/Wordle energy: colored cards, animated progress, gem rewards.
 */

import { useState, useEffect, useRef } from 'react';
import {
  getDailyChallenges, loadDailyProgress, getMaxScore, WIN_SCORE,
  type DailyProgress,
} from '../../../shared/lib/dailyChallenges';
import { ArrowLeft, Trophy, Check } from 'lucide-react';

interface ChallengeListScreenProps {
  onBack: () => void;
  onPlayChallenge: (challengeId: string) => void;
}

/* ── Inline SVG icons ────────────────────────────────────────── */

function GemIcon({ size = 16, color = '#FFD700' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <polygon points="12,2 22,9 18,22 6,22 2,9" fill={color} opacity={0.9} />
      <polygon points="12,2 17,9 12,22 7,9" fill="white" opacity={0.25} />
      <polygon points="7,9 17,9 12,2" fill="white" opacity={0.15} />
    </svg>
  );
}


/* ── Animated counter hook ───────────────────────────────────── */

function useAnimatedNumber(target: number, duration = 600) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);

  useEffect(() => {
    const from = prev.current;
    if (from === target) return;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(Math.round(from + (target - from) * ease));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    prev.current = target;
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return display;
}

/* ── Confetti burst (lightweight CSS particles) ──────────────── */

function ConfettiBurst({ active }: { active: boolean }) {
  if (!active) return null;
  const particles = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * 360;
    const dist = 18 + Math.random() * 10;
    const dx = Math.cos((angle * Math.PI) / 180) * dist;
    const dy = Math.sin((angle * Math.PI) / 180) * dist;
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#FF9F43', '#A78BFA'];
    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          width: 5, height: 5,
          borderRadius: '50%',
          background: colors[i % colors.length],
          left: '50%', top: '50%',
          transform: `translate(${dx}px, ${dy}px)`,
          animation: 'confetti-pop 0.6s ease-out forwards',
          animationDelay: `${i * 30}ms`,
        }}
      />
    );
  });
  return <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>{particles}</div>;
}

/* ── Difficulty config ───────────────────────────────────────── */

const DIFF_CONFIG = {
  easy: {
    color: '#4A9EFF',
    gradient: 'linear-gradient(135deg, #4A9EFF 0%, #2D7DD2 100%)',
    label: 'EASY',
  },
  medium: {
    color: '#FF9F43',
    gradient: 'linear-gradient(135deg, #FF9F43 0%, #E67E22 100%)',
    label: 'MEDIUM',
  },
  hard: {
    color: '#FF5252',
    gradient: 'linear-gradient(135deg, #FF5252 0%, #D32F2F 100%)',
    label: 'HARD',
  },
  expert: {
    color: '#9C27B0',
    gradient: 'linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)',
    label: 'EXPERT',
  },
} as const;

/* ── Main screen ─────────────────────────────────────────────── */

const FILTER_OPTIONS = ['all', 'easy', 'medium', 'hard', 'expert'] as const;
type DiffFilter = typeof FILTER_OPTIONS[number];

export function ChallengeListScreen({ onBack, onPlayChallenge }: ChallengeListScreenProps) {
  const [dailyChallenges] = useState(() => getDailyChallenges());
  const [progress, setProgress] = useState<DailyProgress>(() => loadDailyProgress());
  const [filter, setFilter] = useState<DiffFilter>('all');
  const maxScore = getMaxScore();

  useEffect(() => {
    const handleFocus = () => setProgress(loadDailyProgress());
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  useEffect(() => setProgress(loadDailyProgress()), []);

  const solvedCount = Object.values(progress.scores).filter(s => s.solved).length;
  const winPercent = Math.min(100, Math.round((progress.totalScore / WIN_SCORE) * 100));
  const animatedScore = useAnimatedNumber(progress.totalScore);

  return (
    <>
      {/* Top bar */}
      <div className="top-bar">
        <button className="action-btn secondary" onClick={onBack}
          style={{ fontSize: 11, height: 28, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
          <ArrowLeft size={14} />
          Back
        </button>
        <div style={{
          fontSize: 15, fontWeight: 900, color: 'var(--text)',
          letterSpacing: 1.5, textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 18 }}>⚔️</span>
          DAILY CHALLENGES
          <span style={{ fontSize: 18 }}>⚔️</span>
        </div>
        <div style={{ width: 60 }} />
      </div>

      {/* Score & progress area */}
      <div style={{
        padding: '16px 20px 8px', flexShrink: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
      }}>
        {/* Quest objective */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 14px', borderRadius: 20,
          background: progress.completed
            ? 'linear-gradient(135deg, rgba(78, 205, 196, 0.2), rgba(78, 205, 196, 0.05))'
            : 'linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 159, 67, 0.08))',
          border: `1px solid ${progress.completed ? 'rgba(78, 205, 196, 0.3)' : 'rgba(255, 215, 0, 0.2)'}`,
        }}>
          {progress.completed ? (
            <Trophy size={15} style={{ color: 'var(--player)' }} />
          ) : (
            <span style={{ fontSize: 14 }}>🏆</span>
          )}
          <span style={{
            fontSize: 12, fontWeight: 800, letterSpacing: 0.5,
            color: progress.completed ? 'var(--player)' : '#FFD700',
          }}>
            {progress.completed ? 'QUEST COMPLETE!' : `SCORE ${WIN_SCORE}+ TO WIN TODAY`}
          </span>
        </div>

        {/* Progress bar — chunky, rounded, animated */}
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 6,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 0.5 }}>
              {solvedCount}/{dailyChallenges.length} SOLVED
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{
                animation: progress.totalScore > 0 ? 'count-up-pop 0.4s ease' : undefined,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <GemIcon size={14} />
                <span style={{
                  fontSize: 15, fontWeight: 900,
                  color: progress.completed ? 'var(--player)' : '#FFD700',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {animatedScore}
                </span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)' }}>
                / {WIN_SCORE}
              </span>
            </div>
          </div>

          {/* The bar itself */}
          <div style={{
            width: '100%', height: 14, borderRadius: 7,
            background: 'var(--surface-2)',
            overflow: 'hidden',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
            position: 'relative',
          }}>
            <div
              className="progress-bar-fill"
              style={{
                width: `${winPercent}%`, height: '100%', borderRadius: 7,
                background: progress.completed
                  ? 'linear-gradient(90deg, #4ECDC4, #2ECC71)'
                  : 'linear-gradient(90deg, #FFD700, #FF9F43, #FF6B6B)',
                transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                animation: winPercent > 0 ? 'progress-pulse 2.5s ease-in-out infinite' : undefined,
              }}
            />
            {/* Win threshold marker */}
            {!progress.completed && (
              <div style={{
                position: 'absolute',
                left: `${Math.min(95, Math.round((WIN_SCORE / maxScore) * 100))}%`,
                top: 0, bottom: 0, width: 2,
                background: 'rgba(255,255,255,0.3)',
                borderRadius: 1,
              }} />
            )}
          </div>
        </div>

        {/* Win celebration */}
        {progress.completed && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 18px', borderRadius: 12,
            background: 'linear-gradient(135deg, var(--player-dim), rgba(46, 204, 113, 0.15))',
            color: 'var(--player)', fontSize: 13, fontWeight: 800,
            animation: 'bounce-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
            letterSpacing: 0.5,
          }}>
            <span style={{ fontSize: 16 }}>🎉</span>
            Daily challenge complete!
            <span style={{ fontSize: 16 }}>🎉</span>
          </div>
        )}
      </div>

      {/* Difficulty filter tabs */}
      <div style={{
        display: 'flex', gap: 6, padding: '0 20px 8px',
        maxWidth: 440, margin: '0 auto', width: '100%',
        overflowX: 'auto',
      }}>
        {FILTER_OPTIONS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '4px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: filter === f ? 'var(--accent)' : 'var(--surface-2)',
              color: filter === f ? 'var(--bg)' : 'var(--text-muted)',
              fontSize: 11, fontWeight: 700, fontFamily: 'var(--font)',
              textTransform: 'uppercase', letterSpacing: 0.5,
              transition: 'all 0.15s', whiteSpace: 'nowrap',
              boxShadow: filter === f ? 'var(--btn-shadow-sm)' : 'none',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Challenge list */}
      <div style={{
        flex: 1, overflow: 'auto', padding: '8px 20px 20px',
        display: 'flex', flexDirection: 'column', gap: 10,
        maxWidth: 440, margin: '0 auto', width: '100%',
      }}>
        {dailyChallenges.filter(dc => filter === 'all' || dc.challenge.difficulty === filter).map((dc, i) => {
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
              animIndex={i}
              onClick={() => onPlayChallenge(dc.challenge.id)}
            />
          );
        })}

        {/* Bottom hint */}
        <div style={{
          textAlign: 'center', padding: '8px 0 4px',
          fontSize: 10, color: 'var(--text-dim)', fontWeight: 600,
          letterSpacing: 0.5,
        }}>
          ✨ BONUS POINTS FOR FIRST-TRY SOLVES ✨
        </div>
      </div>
    </>
  );
}

/* ── Challenge card ──────────────────────────────────────────── */

function ChallengeCard({
  index, title, description, difficulty, basePoints,
  earnedPoints, solved, attempted, attempts, animIndex, onClick,
}: {
  index: number; title: string; description: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  basePoints: number; earnedPoints: number;
  solved: boolean; attempted: boolean; attempts: number;
  animIndex: number;
  onClick: () => void;
}) {
  const diff = DIFF_CONFIG[difficulty];
  const [showConfetti, setShowConfetti] = useState(false);
  const prevSolved = useRef(solved);

  // Trigger confetti when a card becomes solved
  useEffect(() => {
    if (solved && !prevSolved.current) {
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 700);
      return () => clearTimeout(t);
    }
    prevSolved.current = solved;
  }, [solved]);

  return (
    <button
      className="challenge-card"
      onClick={onClick}
      style={{
        width: '100%', padding: '14px 14px 14px 0',
        background: 'var(--surface)',
        border: `1px solid ${solved ? 'var(--player)' + '30' : 'var(--glass-border)'}`,
        borderRadius: 16, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 12,
        textAlign: 'left', fontFamily: 'var(--font)',
        position: 'relative', overflow: 'hidden',
        animation: `card-enter 0.4s ease-out ${animIndex * 80}ms both`,
      }}
    >
      {/* Colored left border accent */}
      <div style={{
        width: 5, alignSelf: 'stretch', flexShrink: 0,
        borderRadius: '16px 0 0 16px',
        background: solved ? 'var(--player)' : diff.gradient,
      }} />

      {/* Number circle */}
      <div
        className={`number-circle${solved ? ' completed' : ''}`}
        style={{
          width: 38, height: 38, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          background: solved ? diff.gradient : 'var(--surface-2)',
          color: solved ? '#fff' : diff.color,
          border: `2px solid ${solved ? 'transparent' : diff.color + '40'}`,
          position: 'relative',
          fontSize: 15, fontWeight: 900,
        }}
      >
        {solved ? (
          <Check size={18} strokeWidth={3} />
        ) : (
          <span>{index}</span>
        )}
        <ConfettiBurst active={showConfetti} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{
            fontSize: 14, fontWeight: 800, color: 'var(--text)',
            textDecoration: solved ? 'line-through' : 'none',
            textDecorationColor: 'var(--player)',
            textDecorationThickness: 2,
          }}>
            {title}
          </span>
          <span
            className="difficulty-badge"
            style={{
              fontSize: 9, fontWeight: 800, textTransform: 'uppercase',
              padding: '2px 8px', borderRadius: 6,
              background: diff.gradient,
              color: '#fff',
              letterSpacing: 0.8,
              animationDelay: `${animIndex * 200}ms`,
            }}
          >
            {diff.label}
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
          {description}
        </div>
        {attempted && !solved && (
          <div style={{
            fontSize: 10, fontWeight: 700,
            color: 'var(--opponent)', marginTop: 3,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{ fontSize: 12 }}>💪</span>
            {attempts} attempt{attempts > 1 ? 's' : ''} — try again!
          </div>
        )}
      </div>

      {/* Points / gems */}
      <div style={{ textAlign: 'right', flexShrink: 0, position: 'relative' }}>
        {solved ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            animation: 'bounce-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}>
            <GemIcon size={16} color="var(--player)" />
            <span style={{
              fontSize: 16, fontWeight: 900, color: 'var(--player)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {earnedPoints}
            </span>
          </div>
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            opacity: 0.6,
          }}>
            <GemIcon size={14} color={diff.color} />
            <span style={{
              fontSize: 14, fontWeight: 700, color: diff.color,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {basePoints}
            </span>
          </div>
        )}
      </div>
    </button>
  );
}
