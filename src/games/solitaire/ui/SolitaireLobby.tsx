/**
 * Solitaire lobby — new game, continue, stats, draw mode.
 */

import { useState } from 'react';
import { useSolitaireStore } from '../store/gameStore';
import type { DrawMode } from '../engine/types';
import { Spade, ArrowLeft, Play, RotateCcw, Trophy } from 'lucide-react';

interface SolitaireLobbyProps {
  onPlay: () => void;
  onBack: () => void;
}

export function SolitaireLobby({ onPlay, onBack }: SolitaireLobbyProps) {
  const { startNewGame, resumeGame, hasSavedGame, stats } = useSolitaireStore();
  const [drawMode, setDrawMode] = useState<DrawMode>(1);

  const handleNewGame = () => {
    startNewGame(drawMode);
    onPlay();
  };

  const handleContinue = () => {
    resumeGame();
    onPlay();
  };

  const winRate = stats.gamesPlayed > 0
    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
    : 0;

  const formatTime = (secs: number | null) => {
    if (secs === null) return '--:--';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', flex: 1, padding: 20,
      background: 'var(--bg)',
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
        }}
      >
        <ArrowLeft size={14} /> All Games
      </button>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 28, animation: 'slide-up 0.6s ease-out' }}>
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
          Classic Klondike
        </p>
      </div>

      {/* Menu */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 10,
        width: '100%', maxWidth: 360,
      }}>
        {/* Continue button */}
        {hasSavedGame && (
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
              animation: 'slide-up 0.5s ease-out 0.1s both',
            }}
          >
            <div style={{
              width: 5, flexShrink: 0,
              background: 'linear-gradient(180deg, var(--player), var(--player)88)',
            }} />
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '16px 16px 16px 14px', flex: 1,
            }}>
              <div style={{
                width: 46, height: 46, borderRadius: 14,
                background: 'var(--player)18', color: 'var(--player)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Play size={22} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>Continue Game</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>Resume where you left off</div>
              </div>
            </div>
          </button>
        )}

        {/* New Game button */}
        <button
          className="game-card"
          onClick={handleNewGame}
          style={{
            width: '100%', padding: 0,
            background: 'var(--surface)', border: '1px solid var(--glass-border)',
            borderRadius: 16, cursor: 'pointer',
            display: 'flex', alignItems: 'stretch',
            textAlign: 'left', fontFamily: 'var(--font)',
            overflow: 'hidden',
            animation: `slide-up 0.5s ease-out ${hasSavedGame ? 0.18 : 0.1}s both`,
          }}
        >
          <div style={{
            width: 5, flexShrink: 0,
            background: 'linear-gradient(180deg, var(--accent), var(--accent)88)',
          }} />
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '16px 16px 16px 14px', flex: 1,
          }}>
            <div style={{
              width: 46, height: 46, borderRadius: 14,
              background: 'var(--accent)18', color: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <RotateCcw size={22} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>New Game</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>Start a fresh deal</div>
            </div>
          </div>
        </button>

        {/* Draw mode toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'var(--surface)', border: '1px solid var(--glass-border)',
          borderRadius: 14,
          animation: 'slide-up 0.5s ease-out 0.26s both',
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Draw Mode</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
              {drawMode === 1 ? 'Easier — flip one card' : 'Harder — flip three cards'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {([1, 3] as DrawMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setDrawMode(mode)}
                style={{
                  padding: '6px 14px', borderRadius: 8, border: 'none',
                  background: drawMode === mode ? 'var(--accent)' : 'var(--surface-2)',
                  color: drawMode === mode ? '#fff' : 'var(--text-muted)',
                  fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  fontFamily: 'var(--font)',
                  transition: 'all 0.2s',
                }}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats.gamesPlayed > 0 && (
        <div style={{
          marginTop: 24, animation: 'slide-up 0.5s ease-out 0.34s both',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
            marginBottom: 12, color: 'var(--text-muted)', fontSize: 12, fontWeight: 700,
          }}>
            <Trophy size={14} /> Your Stats
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <StatBadge value={stats.gamesPlayed} label="Played" icon="🃏" />
            <StatBadge value={stats.gamesWon} label="Won" icon="🏆" />
            <StatBadge value={winRate} label="Win %" suffix="%" icon="🔥" />
            <StatBadge value={formatTime(stats.bestTime)} label="Best" icon="⏱" />
          </div>
        </div>
      )}
    </div>
  );
}

function StatBadge({ value, label, suffix, icon }: {
  value: number | string; label: string; suffix?: string; icon: string;
}) {
  return (
    <div style={{
      textAlign: 'center',
      background: 'var(--surface)', border: '1px solid var(--glass-border)',
      borderRadius: 14, padding: '10px 14px', minWidth: 60,
    }}>
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
