/**
 * Bridge lobby — new game screen.
 */

import { useBridgeStore } from '../store/gameStore';
import { Heart, ArrowLeft, Swords } from 'lucide-react';

interface BridgeLobbyProps {
  onPlay: () => void;
  onBack: () => void;
}

export function BridgeLobby({ onPlay, onBack }: BridgeLobbyProps) {
  const { startNewGame, resumeGame, hasSavedGame } = useBridgeStore();

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
      justifyContent: 'center', flex: 1, padding: 20,
      background: 'var(--bg)',
    }}>
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

      <div style={{ textAlign: 'center', marginBottom: 28, animation: 'slide-up 0.6s ease-out' }}>
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

        <div style={{
          padding: '14px 16px',
          background: 'var(--surface)', border: '1px solid var(--glass-border)',
          borderRadius: 14, fontSize: 12, color: 'var(--text-muted)',
          lineHeight: 1.6,
          animation: 'slide-up 0.5s ease-out 0.26s both',
        }}>
          <strong style={{ color: 'var(--text)' }}>How it works:</strong><br/>
          You play South with 3 AI partners/opponents.<br/>
          North is your partner. Bid, then play tricks.<br/>
          Win more tricks than your contract requires!
        </div>
      </div>
    </div>
  );
}
