/**
 * Bridge lobby — new game screen with stats, tutorials, and settings.
 */

import { useBridgeStore } from '../store/gameStore';
import { Heart, ArrowLeft, Swords, Settings, BookOpen, Trophy, Award } from 'lucide-react';
import { ACHIEVEMENTS, getUnlockedAchievements } from '../engine/stats';
import { TUTORIALS, loadTutorialProgress } from '../engine/tutorial';

interface BridgeLobbyProps {
  onPlay: () => void;
  onBack: () => void;
  onSettings: () => void;
  onTutorial: () => void;
}

const TUTORIAL_CATEGORIES = [
  { id: 'basics' as const, label: 'Basics', icon: '📖', color: 'var(--accent)' },
  { id: 'bidding' as const, label: 'Bidding', icon: '🗣️', color: 'var(--purple)' },
  { id: 'play' as const, label: 'Play', icon: '🃏', color: 'var(--player)' },
  { id: 'defense' as const, label: 'Defense', icon: '🛡️', color: 'var(--opponent)' },
];

export function BridgeLobby({ onPlay, onBack, onSettings, onTutorial }: BridgeLobbyProps) {
  const { startNewGame, resumeGame, hasSavedGame, stats } = useBridgeStore();
  const tutorialProgress = loadTutorialProgress();
  const unlockedAchievements = getUnlockedAchievements(stats);

  const handleNewGame = () => {
    startNewGame();
    onPlay();
  };

  const handleContinue = () => {
    resumeGame();
    onPlay();
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      flex: 1, padding: 20,
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
          fontFamily: 'var(--font)',
          display: 'flex', alignItems: 'center',
        }}
      >
        <Settings size={16} />
      </button>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 28, marginTop: 24, animation: 'slide-up 0.6s ease-out' }}>
        <div style={{
          marginBottom: 12, color: 'var(--purple)',
          animation: 'float 3s ease-in-out infinite',
          filter: 'drop-shadow(0 4px 16px rgba(139, 92, 246, 0.3))',
        }}>
          <Heart size={48} />
        </div>
        <h1 style={{
          fontSize: 28, fontWeight: 900, letterSpacing: 2,
          color: 'var(--text)', margin: '0 0 6px',
        }}>
          Bridge
        </h1>
        <p style={{
          fontSize: 14, color: 'var(--text-muted)', margin: 0,
          fontWeight: 600, fontStyle: 'italic',
        }}>
          The ultimate card game of strategy
        </p>
      </div>

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
            <div style={{ width: 5, flexShrink: 0, background: 'linear-gradient(180deg, var(--player), var(--player)88)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 16px 16px 14px', flex: 1 }}>
              <div style={{
                width: 46, height: 46, borderRadius: 14,
                background: 'var(--player)18', color: 'var(--player)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Swords size={22} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>Continue Hand</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>Resume where you left off</div>
              </div>
            </div>
          </button>
        )}

        {/* New hand button */}
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
          <div style={{ width: 5, flexShrink: 0, background: 'linear-gradient(180deg, var(--purple), var(--purple)88)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 16px 16px 14px', flex: 1 }}>
            <div style={{
              width: 46, height: 46, borderRadius: 14,
              background: 'var(--purple)18', color: 'var(--purple)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Swords size={22} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>New Hand</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>You + 3 AI players</div>
            </div>
          </div>
        </button>

        {/* Learn Bridge section */}
        <div style={{
          marginTop: 8,
          animation: 'slide-up 0.5s ease-out 0.26s both',
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <BookOpen size={12} /> Learn Bridge
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {TUTORIAL_CATEGORIES.map(cat => {
              const catTutorials = TUTORIALS.filter(t => t.category === cat.id);
              const completedCount = catTutorials.filter(t =>
                tutorialProgress.completedTutorials.includes(t.id)
              ).length;
              return (
                <button
                  key={cat.id}
                  onClick={onTutorial}
                  style={{
                    padding: '12px 10px', textAlign: 'left',
                    background: 'var(--surface)', border: '1px solid var(--glass-border)',
                    borderRadius: 12, cursor: 'pointer',
                    fontFamily: 'var(--font)',
                  }}
                >
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{cat.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{cat.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
                    {completedCount}/{catTutorials.length} done
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stats section */}
        {stats.handsPlayed > 0 && (
          <div style={{
            marginTop: 8,
            animation: 'slide-up 0.5s ease-out 0.34s both',
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <Trophy size={12} /> Stats
            </div>
            <div style={{
              padding: '14px 16px',
              background: 'var(--surface)', border: '1px solid var(--glass-border)',
              borderRadius: 14,
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12,
            }}>
              <StatItem label="Hands" value={stats.handsPlayed} />
              <StatItem label="Made" value={stats.handsMade} />
              <StatItem label="Best" value={stats.bestScore} />
              <StatItem label="Slams" value={stats.slamsMade} />
              <StatItem label="Streak" value={stats.bestStreak} />
              <StatItem label="Win %" value={
                stats.handsPlayed > 0
                  ? Math.round((stats.handsWon / stats.handsPlayed) * 100)
                  : 0
              } />
            </div>
          </div>
        )}

        {/* Achievement progress */}
        <div style={{
          marginTop: 8,
          animation: 'slide-up 0.5s ease-out 0.42s both',
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <Award size={12} /> Achievements
          </div>
          <div style={{
            padding: '14px 16px',
            background: 'var(--surface)', border: '1px solid var(--glass-border)',
            borderRadius: 14,
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              marginBottom: 8,
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                {unlockedAchievements.length} / {ACHIEVEMENTS.length} unlocked
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                {Math.round((unlockedAchievements.length / ACHIEVEMENTS.length) * 100)}%
              </div>
            </div>
            <div style={{
              height: 6, borderRadius: 3, background: 'var(--surface-2)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', borderRadius: 3,
                background: 'var(--accent)',
                width: `${(unlockedAchievements.length / ACHIEVEMENTS.length) * 100}%`,
                transition: 'width 0.6s ease',
              }} />
            </div>
            {/* Show last 5 unlocked achievement icons */}
            {unlockedAchievements.length > 0 && (
              <div style={{
                display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap',
              }}>
                {unlockedAchievements.slice(-5).map(id => {
                  const ach = ACHIEVEMENTS.find(a => a.id === id);
                  return ach ? (
                    <div key={id} title={ach.name} style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: 'var(--surface-2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14,
                    }}>
                      {ach.icon}
                    </div>
                  ) : null;
                })}
              </div>
            )}
          </div>
        </div>

        {/* Info box */}
        <div style={{
          padding: '14px 16px',
          background: 'var(--surface)', border: '1px solid var(--glass-border)',
          borderRadius: 14, fontSize: 12, color: 'var(--text-muted)',
          lineHeight: 1.6,
          animation: 'slide-up 0.5s ease-out 0.5s both',
        }}>
          <strong style={{ color: 'var(--text)' }}>How it works:</strong><br/>
          You play South with 3 AI partners/opponents.<br/>
          North is your partner. Bid, then play tricks.<br/>
          Win more tricks than your contract requires!
        </div>

        <div style={{ height: 20 }} />
      </div>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>{label}</div>
    </div>
  );
}
