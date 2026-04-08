/**
 * Solitaire lobby — variant selector with stats and continue support.
 */

import { useSolitaireStore } from '../store/gameStore';
import { VARIANTS, type SolitaireVariant } from '../engine/variants';
import { Spade, ArrowLeft, Settings, Play, Trophy } from 'lucide-react';

interface SolitaireLobbyProps {
  onPlay: (variant: SolitaireVariant) => void;
  onBack: () => void;
  onSettings: () => void;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#4ecdc4',
  medium: '#f7b731',
  hard: '#fc5c65',
};

export function SolitaireLobby({ onPlay, onBack, onSettings }: SolitaireLobbyProps) {
  const { hasSavedGame, resumeGame, stats } = useSolitaireStore();

  const totalWinRate = stats.global.totalGamesPlayed > 0
    ? Math.round((stats.global.totalGamesWon / stats.global.totalGamesPlayed) * 100)
    : 0;

  const handleContinue = () => {
    resumeGame('klondike');
    onPlay('klondike');
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      flex: 1, padding: 20, paddingTop: 56,
      background: 'var(--bg)',
      overflow: 'auto',
    }}>
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          position: 'absolute', top: 16, left: 16,
          background: 'var(--surface)', border: '1px solid var(--glass-border)',
          borderRadius: 10, padding: '6px 12px',
          color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12,
          fontFamily: 'var(--font)', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 5,
          zIndex: 10,
        }}
      >
        <ArrowLeft size={14} /> All Games
      </button>

      {/* Settings gear */}
      <button
        onClick={onSettings}
        style={{
          position: 'absolute', top: 16, right: 16,
          background: 'var(--surface)', border: '1px solid var(--glass-border)',
          borderRadius: 10, padding: '6px 10px',
          color: 'var(--text-muted)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10,
        }}
      >
        <Settings size={16} />
      </button>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24, animation: 'slide-up 0.6s ease-out' }}>
        <div style={{
          marginBottom: 12, color: 'var(--accent)',
          animation: 'float 3s ease-in-out infinite',
          filter: 'drop-shadow(0 4px 16px rgba(78, 205, 196, 0.3))',
        }}>
          <Spade size={48} />
        </div>
        <h1 style={{
          fontSize: 28, fontWeight: 900, letterSpacing: 2,
          color: 'var(--text)', margin: '0 0 6px',
        }}>
          Solitaire
        </h1>
        <p style={{
          fontSize: 14, color: 'var(--text-muted)', margin: 0,
          fontWeight: 600, fontStyle: 'italic',
        }}>
          Choose your variant
        </p>
      </div>

      {/* Continue button */}
      {hasSavedGame && (
        <div style={{
          width: '100%', maxWidth: 360, marginBottom: 12,
          animation: 'slide-up 0.5s ease-out 0.05s both',
        }}>
          <button
            className="game-card"
            onClick={handleContinue}
            style={{
              width: '100%', padding: 0,
              background: 'var(--surface)', border: '1px solid var(--glass-border)',
              borderRadius: 16, cursor: 'pointer',
              display: 'flex', alignItems: 'stretch',
              textAlign: 'left', fontFamily: 'var(--font)',
              overflow: 'hidden',
            }}
          >
            <div style={{
              width: 5, flexShrink: 0,
              background: 'linear-gradient(180deg, var(--player), var(--player)88)',
            }} />
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 16px 14px 14px', flex: 1,
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                background: 'var(--player)18', color: 'var(--player)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Play size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>Continue Game</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Resume where you left off</div>
              </div>
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: 'var(--text-dim)' }}>
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </button>
        </div>
      )}

      {/* Variant cards grid */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 10,
        width: '100%', maxWidth: 360,
      }}>
        {VARIANTS.map((variant, i) => (
          <VariantCard
            key={variant.id}
            variant={variant}
            index={i}
            stats={{ gamesPlayed: stats.global.totalGamesPlayed, gamesWon: stats.global.totalGamesWon }}
            onClick={() => onPlay(variant.id)}
          />
        ))}
      </div>

      {/* Overall stats */}
      {stats.global.totalGamesPlayed > 0 && (
        <div style={{
          marginTop: 28, animation: 'slide-up 0.5s ease-out 0.5s both',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
            marginBottom: 12, color: 'var(--text-muted)', fontSize: 12, fontWeight: 700,
          }}>
            <Trophy size={14} /> Overall Stats
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <StatBadge value={stats.global.totalGamesPlayed} label="Played" icon="🃏" />
            <StatBadge value={stats.global.totalGamesWon} label="Won" icon="🏆" />
            <StatBadge value={totalWinRate} label="Win %" suffix="%" icon="🔥" />
            <StatBadge value={stats.global.currentDailyStreak} label="Streak" icon="⚡" />
          </div>
        </div>
      )}
    </div>
  );
}

function VariantCard({ variant, index, stats, onClick }: {
  variant: typeof VARIANTS[number];
  index: number;
  stats: { gamesPlayed: number; gamesWon: number };
  onClick: () => void;
}) {
  const winRate = stats.gamesPlayed > 0
    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
    : null;

  return (
    <button
      className="game-card"
      onClick={onClick}
      style={{
        width: '100%', padding: 0,
        background: 'var(--surface)',
        border: '1px solid var(--glass-border)',
        borderRadius: 16, cursor: 'pointer',
        display: 'flex', alignItems: 'stretch',
        textAlign: 'left', fontFamily: 'var(--font)',
        position: 'relative', overflow: 'hidden',
        animation: `slide-up 0.5s ease-out ${index * 0.08 + 0.1}s both`,
      }}
    >
      {/* Left accent bar */}
      <div style={{
        width: 5, flexShrink: 0,
        background: `linear-gradient(180deg, ${variant.color}, ${variant.color}88)`,
      }} />

      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '16px 16px 16px 14px', flex: 1,
      }}>
        {/* Icon circle */}
        <div style={{
          width: 46, height: 46, borderRadius: 14,
          background: variant.color + '18',
          color: variant.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          fontSize: 22,
          boxShadow: `0 0 20px ${variant.color}15`,
        }}>
          {variant.icon}
        </div>

        {/* Text content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 15, fontWeight: 800, color: 'var(--text)', lineHeight: 1.2,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {variant.name}

            {/* Difficulty badge */}
            <span style={{
              fontSize: 9, fontWeight: 800, padding: '2px 7px',
              borderRadius: 6, letterSpacing: 0.8, textTransform: 'uppercase',
              background: DIFFICULTY_COLORS[variant.difficulty] + '20',
              color: DIFFICULTY_COLORS[variant.difficulty],
            }}>
              {variant.difficulty}
            </span>
          </div>

          <div style={{
            fontSize: 12, color: 'var(--text-muted)', marginTop: 3, fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {variant.description}

            {/* Win rate stat */}
            {winRate !== null && (
              <span style={{
                fontSize: 10, fontWeight: 700,
                color: 'var(--text-dim)',
                whiteSpace: 'nowrap',
              }}>
                {winRate}% win
              </span>
            )}
          </div>
        </div>

        {/* Chevron */}
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: 'var(--text-dim)' }}>
          <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </button>
  );
}

function StatBadge({ value, label, suffix, icon }: {
  value: number | string; label: string; suffix?: string; icon: string;
}) {
  return (
    <div
      className="stat-badge"
      style={{
        textAlign: 'center',
        background: 'var(--surface)', border: '1px solid var(--glass-border)',
        borderRadius: 14, padding: '10px 14px', minWidth: 60,
      }}
    >
      <div style={{ fontSize: 13, marginBottom: 2 }}>{icon}</div>
      <div style={{
        fontSize: 18, fontWeight: 900, color: 'var(--text)',
        fontVariantNumeric: 'tabular-nums', lineHeight: 1,
      }}>
        {value}{suffix}
      </div>
      <div style={{
        fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase',
        letterSpacing: 0.8, fontWeight: 700, marginTop: 2,
      }}>
        {label}
      </div>
    </div>
  );
}
