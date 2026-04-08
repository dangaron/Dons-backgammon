import { useState, useEffect } from 'react';
import { Board } from './games/backgammon/ui/Board';
import { ChallengeMode } from './games/backgammon/ui/ChallengeMode';
import { ChallengeListScreen } from './games/backgammon/ui/ChallengeListScreen';
import { Dashboard } from './shared/ui/Dashboard';
import { AuthModal } from './shared/ui/AuthModal';
import { HomeScreen } from './shared/ui/HomeScreen';
import { SettingsScreen } from './shared/ui/SettingsScreen';
import { GameSelector } from './shared/ui/GameSelector';
import { SolitaireLobby } from './games/solitaire/ui/SolitaireLobby';
import { SolitaireRouter } from './games/solitaire/ui/SolitaireRouter';
import { SolitaireSettings } from './games/solitaire/ui/SolitaireSettings';
import { useSolitaireStore } from './games/solitaire/store/gameStore';
import { YahtzeeLobby } from './games/yahtzee/ui/YahtzeeLobby';
import { YahtzeeBoard } from './games/yahtzee/ui/YahtzeeBoard';
import { BridgeLobby } from './games/bridge/ui/BridgeLobby';
import { BridgeBoard } from './games/bridge/ui/BridgeBoard';
import { useGameStore } from './games/backgammon/store/gameStore';
import { useAuthStore } from './shared/store/authStore';
import { isSupabaseConfigured } from './shared/lib/supabase';
import { getDailyChallenges } from './shared/lib/dailyChallenges';
import type { GameType } from './shared/engine/types';

type AppView =
  | 'game-select'
  | 'settings'
  // Backgammon views
  | 'backgammon-lobby'
  | 'backgammon-play'
  | 'backgammon-dashboard'
  | 'backgammon-challenge-list'
  | 'backgammon-challenge-play'
  // Solitaire views
  | 'solitaire-lobby'
  | 'solitaire-play'
  | 'solitaire-settings'
  // Yahtzee views
  | 'yahtzee-lobby'
  | 'yahtzee-play'
  // Bridge views
  | 'bridge-lobby'
  | 'bridge-play';

const MATCH_LENGTHS = [1, 3, 5, 7, 11, 15];

export default function App() {
  const [view, setView] = useState<AppView>('game-select');
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

  const handleSelectGame = (game: GameType) => {
    switch (game) {
      case 'backgammon':
        setView('backgammon-lobby');
        break;
      case 'solitaire':
        setView('solitaire-lobby');
        break;
      case 'yahtzee':
        setView('yahtzee-lobby');
        break;
      case 'bridge':
        setView('bridge-lobby');
        break;
    }
  };

  const handleNewGameClick = () => {
    if (hasActiveGame && view === 'backgammon-play') {
      setShowConfirm(true);
    } else {
      setShowNewGame(true);
    }
  };

  const handleConfirmNewGame = () => {
    setShowConfirm(false);
    setShowNewGame(true);
  };

  const handleStartGame = (matchLength: number, cubeEnabled: boolean, difficulty?: 'easy' | 'medium' | 'hard' | 'expert', tutorEnabled?: boolean) => {
    if (difficulty) useGameStore.getState().setAIDifficulty(difficulty);
    useGameStore.getState().setTutorMode(tutorEnabled ?? false);
    startNewGame('vs-ai', matchLength, cubeEnabled);
    setShowNewGame(false);
    setView('backgammon-play');
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
      {view === 'game-select' && (
        <GameSelector
          onSelectGame={handleSelectGame}
          onSettings={() => setView('settings')}
          onSignIn={() => setShowAuth(true)}
        />
      )}

      {view === 'backgammon-lobby' && (
        <HomeScreen
          onPlayAI={() => setView('backgammon-play')}
          onNewMultiplayer={() => setView('backgammon-dashboard')}
          onChallenges={() => setView('backgammon-challenge-list')}
          onSignIn={() => setShowAuth(true)}
          onDashboard={() => setView('backgammon-dashboard')}
          onSettings={() => setView('settings')}
          onBack={() => setView('game-select')}
        />
      )}

      {view === 'settings' && (
        <SettingsScreen onBack={() => setView('game-select')} />
      )}

      {view === 'backgammon-dashboard' && (
        <Dashboard
          onBack={() => setView('backgammon-lobby')}
          onPlayAI={() => setView('backgammon-play')}
          onOpenGame={() => {
            setView('backgammon-play');
          }}
          onSignIn={() => setShowAuth(true)}
        />
      )}

      {view === 'backgammon-play' && (
        <Board
          onChallenges={() => setView('backgammon-challenge-list')}
          onNewGame={handleNewGameClick}
          onDashboard={() => {
            if (user) setView('backgammon-dashboard');
            else setView('backgammon-lobby');
          }}
          onQuit={() => setView('backgammon-lobby')}
        />
      )}

      {view === 'backgammon-challenge-list' && (
        <ChallengeListScreen
          onBack={() => setView('backgammon-lobby')}
          onPlayChallenge={(id) => {
            const daily = getDailyChallenges().find(dc => dc.challenge.id === id);
            setActiveChallengeId(id);
            setActiveChallengePoints(daily?.points || 100);
            setView('backgammon-challenge-play');
          }}
        />
      )}

      {view === 'backgammon-challenge-play' && activeChallengeId && (
        <ChallengeMode
          onBack={() => { setActiveChallengeId(null); setView('backgammon-challenge-list'); }}
          challengeId={activeChallengeId}
          basePoints={activeChallengePoints}
        />
      )}

      {/* ── Solitaire views ──────────────────────────────────────── */}

      {view === 'solitaire-lobby' && (
        <SolitaireLobby
          onPlay={(variant) => {
            useSolitaireStore.getState().startNewGame(variant);
            setView('solitaire-play');
          }}
          onBack={() => setView('game-select')}
          onSettings={() => setView('solitaire-settings')}
        />
      )}

      {view === 'solitaire-play' && (
        <SolitaireRouter onQuit={() => setView('solitaire-lobby')} />
      )}

      {view === 'solitaire-settings' && (
        <SolitaireSettings onBack={() => setView('solitaire-lobby')} />
      )}

      {/* ── Yahtzee views ────────────────────────────────────────── */}

      {view === 'yahtzee-lobby' && (
        <YahtzeeLobby
          onPlay={() => setView('yahtzee-play')}
          onBack={() => setView('game-select')}
        />
      )}

      {view === 'yahtzee-play' && (
        <YahtzeeBoard onQuit={() => setView('yahtzee-lobby')} />
      )}

      {/* ── Bridge views ─────────────────────────────────────────── */}

      {view === 'bridge-lobby' && (
        <BridgeLobby
          onPlay={() => setView('bridge-play')}
          onBack={() => setView('game-select')}
        />
      )}

      {view === 'bridge-play' && (
        <BridgeBoard onQuit={() => setView('bridge-lobby')} />
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
          onGuest={() => { setShowAuth(false); setView('backgammon-play'); }}
        />
      )}
    </div>
  );
}

const DIFFICULTIES = [
  { key: 'easy' as const, label: '😊 Easy', desc: 'Learning the ropes' },
  { key: 'medium' as const, label: '🎯 Medium', desc: 'Solid challenge' },
  { key: 'hard' as const, label: '🔥 Hard', desc: 'Tighter play' },
  { key: 'expert' as const, label: '🧠 Expert', desc: '2-ply lookahead' },
];

function NewGameModal({ onStart, onCancel }: {
  onStart: (matchLength: number, cubeEnabled: boolean, difficulty: 'easy' | 'medium' | 'hard' | 'expert', tutorEnabled: boolean) => void;
  onCancel: () => void;
}) {
  const [matchLength, setMatchLength] = useState(1);
  const [cubeEnabled, setCubeEnabled] = useState(true);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'expert'>('medium');
  const [tutorEnabled, setTutorEnabled] = useState(false);

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

        {/* AI Difficulty */}
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 11, fontWeight: 800, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
          }}>
            AI Difficulty
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {DIFFICULTIES.map((d) => (
              <button
                key={d.key}
                onClick={() => setDifficulty(d.key)}
                style={{
                  padding: '8px 10px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: difficulty === d.key
                    ? 'linear-gradient(180deg, var(--accent) 0%, #3ab5ad 100%)'
                    : 'var(--surface-2)',
                  color: difficulty === d.key ? 'var(--bg)' : 'var(--text-muted)',
                  fontFamily: 'var(--font)', fontWeight: 700, fontSize: 13,
                  textAlign: 'left',
                  transition: 'all 0.15s',
                  boxShadow: difficulty === d.key ? 'var(--btn-shadow-sm)' : 'none',
                }}
              >
                <div>{d.label}</div>
                <div style={{
                  fontSize: 9, fontWeight: 600, marginTop: 1,
                  opacity: difficulty === d.key ? 0.8 : 0.6,
                }}>
                  {d.desc}
                </div>
              </button>
            ))}
          </div>
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

        {/* Tutor Mode */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 24, padding: '8px 12px',
          background: 'var(--surface-2)', borderRadius: 12,
        }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>🎓 Tutor Mode</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
              Warns you about bad moves
            </div>
          </div>
          <button
            onClick={() => setTutorEnabled(!tutorEnabled)}
            style={{
              width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
              background: tutorEnabled ? 'var(--accent)' : 'var(--surface-2)',
              position: 'relative', transition: 'background 0.2s', flexShrink: 0,
            }}
          >
            <div style={{
              position: 'absolute', top: 3,
              left: tutorEnabled ? 24 : 3,
              width: 20, height: 20, borderRadius: '50%',
              background: 'white', transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }} />
          </button>
        </div>

        <button className="action-btn primary" style={{ width: '100%' }}
          onClick={() => onStart(matchLength, cubeEnabled, difficulty, tutorEnabled)}>
          🚀 Start Game
        </button>
      </div>
    </div>
  );
}
