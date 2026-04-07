import { useState, useEffect } from 'react';
import { Board } from './games/backgammon/ui/Board';
import { ChallengeMode } from './games/backgammon/ui/ChallengeMode';
import { ChallengeListScreen } from './games/backgammon/ui/ChallengeListScreen';
import { Dashboard } from './shared/ui/Dashboard';
import { AuthModal } from './shared/ui/AuthModal';
import { HomeScreen } from './shared/ui/HomeScreen';
import { SettingsScreen } from './shared/ui/SettingsScreen';
import { useGameStore } from './games/backgammon/store/gameStore';
import { useAuthStore } from './shared/store/authStore';
import { isSupabaseConfigured } from './shared/lib/supabase';
import { getDailyChallenges } from './shared/lib/dailyChallenges';

type AppView = 'home' | 'dashboard' | 'game' | 'challenge-list' | 'challenge-play' | 'settings';

const MATCH_LENGTHS = [1, 3, 5, 7, 11, 15];

export default function App() {
  const [view, setView] = useState<AppView>('home');
  const [showNewGame, setShowNewGame] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [activeChallengeId, setActiveChallengeId] = useState<string | null>(null);
  const [activeChallengePoints, setActiveChallengePoints] = useState<number>(0);
  const { startNewGame, gameState } = useGameStore();
  const { initialize, initialized, user } = useAuthStore();

  useEffect(() => {
    initialize();
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

  if (!initialized && isSupabaseConfigured()) {
    return (
      <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="app">
      {view === 'home' && (
        <HomeScreen
          onPlayAI={() => setView('game')}
          onNewMultiplayer={() => setView('dashboard')}
          onChallenges={() => setView('challenge-list')}
          onSignIn={() => setShowAuth(true)}
          onDashboard={() => setView('dashboard')}
          onSettings={() => setView('settings')}
        />
      )}

      {view === 'settings' && (
        <SettingsScreen onBack={() => setView('home')} />
      )}

      {view === 'dashboard' && (
        <Dashboard
          onBack={() => setView('home')}
          onPlayAI={() => setView('game')}
          onOpenGame={(_gameId) => {
            // TODO: open specific multiplayer game
            setView('game');
          }}
          onSignIn={() => setShowAuth(true)}
        />
      )}

      {view === 'game' && (
        <Board
          onChallenges={() => setView('challenge-list')}
          onNewGame={handleNewGameClick}
          onDashboard={() => {
            if (user) setView('dashboard');
            else setView('home');
          }}
          onQuit={() => setView('home')}
        />
      )}

      {view === 'challenge-list' && (
        <ChallengeListScreen
          onBack={() => setView('home')}
          onPlayChallenge={(id) => {
            const daily = getDailyChallenges().find(dc => dc.challenge.id === id);
            setActiveChallengeId(id);
            setActiveChallengePoints(daily?.points || 100);
            setView('challenge-play');
          }}
        />
      )}

      {view === 'challenge-play' && activeChallengeId && (
        <ChallengeMode
          onBack={() => { setActiveChallengeId(null); setView('challenge-list'); }}
          challengeId={activeChallengeId}
          basePoints={activeChallengePoints}
        />
      )}

      {showConfirm && (
        <div className="overlay-backdrop" onClick={() => setShowConfirm(false)}>
          <div className="overlay-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 28, marginBottom: 4 }}>⚠️</div>
            <h2>End current game?</h2>
            <p>Your game in progress will be lost.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="action-btn primary" style={{ flex: 1 }}
                onClick={() => setShowConfirm(false)}>
                ▶️ Keep Playing
              </button>
              <button className="action-btn secondary" style={{ flex: 1 }}
                onClick={handleConfirmNewGame}>
                🔄 New Game
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
        <div style={{ fontSize: 28, marginBottom: 4 }}>⚔️</div>
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
          marginBottom: 24, padding: '8px 12px',
          background: 'var(--surface-2)', borderRadius: 12,
        }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>🎲 Doubling Cube</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
              Raise the stakes mid-game
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
          🚀 Start Game
        </button>
      </div>
    </div>
  );
}
