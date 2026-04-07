/**
 * Yahtzee lobby — new game, continue, game mode selection.
 */

import { useYahtzeeStore } from '../store/gameStore';
import { SquareStack, ArrowLeft, Play, Swords, Users } from 'lucide-react';

interface YahtzeeLobbyProps {
  onPlay: () => void;
  onBack: () => void;
}

export function YahtzeeLobby({ onPlay, onBack }: YahtzeeLobbyProps) {
  const { startNewGame, resumeGame, hasSavedGame } = useYahtzeeStore();

  const handleNewGame = (mode: 'vs-ai' | 'vs-human-local') => {
    startNewGame(mode);
    onPlay();
  };

  const handleContinue = () => {
    resumeGame();
    onPlay();
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
          marginBottom: 12, color: 'var(--hit)',
          animation: 'float 3s ease-in-out infinite',
          filter: 'drop-shadow(0 4px 16px rgba(255, 159, 67, 0.3))',
        }}>
          <SquareStack size={48} />
        </div>
        <h1 style={{
          fontSize: 28, fontWeight: 900, letterSpacing: 2,
          color: 'var(--text)', margin: '0 0 6px',
        }}>
          Yahtzee
        </h1>
        <p style={{
          fontSize: 14, color: 'var(--text-muted)', margin: 0,
          fontWeight: 600, fontStyle: 'italic',
        }}>
          Roll five dice. Chase the combos.
        </p>
      </div>

      {/* Menu */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 10,
        width: '100%', maxWidth: 360,
      }}>
        {/* Continue */}
        {hasSavedGame && (
          <MenuCard
            icon={<Play size={22} />}
            title="Continue Game"
            subtitle="Resume where you left off"
            onClick={handleContinue}
            color="var(--player)"
            delay={0}
          />
        )}

        {/* VS AI */}
        <MenuCard
          icon={<Swords size={22} />}
          title="Play vs Computer"
          subtitle="Battle the AI"
          onClick={() => handleNewGame('vs-ai')}
          color="var(--hit)"
          delay={hasSavedGame ? 1 : 0}
        />

        {/* Local multiplayer */}
        <MenuCard
          icon={<Users size={22} />}
          title="Pass & Play"
          subtitle="Two players, one device"
          onClick={() => handleNewGame('vs-human-local')}
          color="var(--accent)"
          delay={hasSavedGame ? 2 : 1}
        />
      </div>
    </div>
  );
}

function MenuCard({ icon, title, subtitle, onClick, color, delay }: {
  icon: React.ReactNode; title: string; subtitle: string;
  onClick: () => void; color: string; delay: number;
}) {
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
        overflow: 'hidden',
        animation: `slide-up 0.5s ease-out ${delay * 0.08 + 0.1}s both`,
      }}
    >
      <div style={{
        width: 5, flexShrink: 0,
        background: `linear-gradient(180deg, ${color}, ${color}88)`,
      }} />
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '16px 16px 16px 14px', flex: 1,
      }}>
        <div style={{
          width: 46, height: 46, borderRadius: 14,
          background: color + '18', color: color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{title}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, fontWeight: 500 }}>{subtitle}</div>
        </div>
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: 'var(--text-dim)', marginLeft: 'auto' }}>
          <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </button>
  );
}
