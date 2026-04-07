import { useState, useEffect } from 'react';
import { Board } from './ui/Board';
import { ChallengeMode } from './ui/ChallengeMode';
import { Dashboard } from './ui/Dashboard';
import { AuthModal } from './ui/AuthModal';
import { useGameStore } from './store/gameStore';
import { useAuthStore } from './store/authStore';
import { isSupabaseConfigured } from './lib/supabase';

type AppView = 'dashboard' | 'game' | 'challenges' | 'online-game';

const MATCH_LENGTHS = [1, 3, 5, 7, 11, 15];

export default function App() {
  const [view, setView] = useState<AppView>('game'); // default to local game for backward compat
  const [showNewGame, setShowNewGame] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const { startNewGame, gameState } = useGameStore();
  const { initialize, initialized, user } = useAuthStore();

  // Initialize auth on mount
  useEffect(() => {
    initialize();
    // Register service worker for push notifications
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, [initialize]);

  const hasActiveGame = gameState.turnPhase !== 'game-over';

  const handleNewGameClick = () => {
    if (hasActiveGame && view === 'game') {
      setShowConfirm(true);
    } else {
      setShowNewGame(true);
    }
  };

  const handleConfirmNewGame = () => {
    setShowConfirm(false);
    setShowNewGame(true);
  };

  const handleStartGame = (matchLength: number, cubeEnabled: boolean) => {
    startNewGame('vs-ai', matchLength, cubeEnabled);
    setShowNewGame(false);
    setView('game');
  };

  // Show loading while auth initializes (only if Supabase is configured)
  if (!initialized && isSupabaseConfigured()) {
    return (
      <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="app">
      {view === 'dashboard' && (
        <Dashboard
          onPlayAI={() => setView('game')}
          onOpenGame={(_gameId) => {
            // TODO: open multiplayer game view
            setView('game');
          }}
          onSignIn={() => setShowAuth(true)}
        />
      )}

      {view === 'game' && (
        <Board
          onChallenges={() => setView('challenges')}
          onNewGame={handleNewGameClick}
          onDashboard={user ? () => setView('dashboard') : undefined}
        />
      )}

      {view === 'challenges' && (
        <ChallengeMode onBack={() => setView('game')} />
      )}

      {showConfirm && (
        <div className="overlay-backdrop" onClick={() => setShowConfirm(false)}>
          <div className="overlay-card" onClick={(e) => e.stopPropagation()}>
            <h2>End current game?</h2>
            <p>Your game in progress will be lost.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="action-btn primary" style={{ flex: 1 }}
                onClick={() => setShowConfirm(false)}>
                Return to Game
              </button>
              <button className="action-btn secondary" style={{ flex: 1 }}
                onClick={handleConfirmNewGame}>
                New Game
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewGame && (
        <NewGameModal
          onStart={handleStartGame}
          onCancel={() => setShowNewGame(false)}
        />
      )}

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onGuest={() => { setShowAuth(false); setView('game'); }}
        />
      )}
    </div>
  );
}

function NewGameModal({ onStart, onCancel }: {
  onStart: (matchLength: number, cubeEnabled: boolean) => void;
  onCancel: () => void;
}) {
  const [matchLength, setMatchLength] = useState(1);
  const [cubeEnabled, setCubeEnabled] = useState(true);

  return (
    <div className="overlay-backdrop" onClick={onCancel}>
      <div className="overlay-card" onClick={(e) => e.stopPropagation()}>
        <h2>New Game</h2>
        <p>Points needed to win the match</p>

        <div className="match-selector">
          {MATCH_LENGTHS.map((n) => (
            <button
              key={n}
              className={`match-option${matchLength === n ? ' active' : ''}`}
              onClick={() => setMatchLength(n)}
            >
              {n}
            </button>
          ))}
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 24, padding: '0 4px',
        }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>Doubling Cube</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
              Challenge your opponent to raise the stakes
            </div>
          </div>
          <button
            onClick={() => setCubeEnabled(!cubeEnabled)}
            style={{
              width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
              background: cubeEnabled ? 'var(--accent)' : 'var(--surface-2)',
              position: 'relative', transition: 'background 0.2s', flexShrink: 0,
            }}
          >
            <div style={{
              position: 'absolute', top: 3,
              left: cubeEnabled ? 24 : 3,
              width: 20, height: 20, borderRadius: '50%',
              background: 'white', transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }} />
          </button>
        </div>

        <button className="action-btn primary" style={{ width: '100%' }}
          onClick={() => onStart(matchLength, cubeEnabled)}>
          Start Game
        </button>
      </div>
    </div>
  );
}
