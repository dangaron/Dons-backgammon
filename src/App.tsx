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
import { YahtzeeSettings } from './games/yahtzee/ui/YahtzeeSettings';
import { BridgeLobby } from './games/bridge/ui/BridgeLobby';
import { BridgeBoard } from './games/bridge/ui/BridgeBoard';
import { BridgeSettings } from './games/bridge/ui/BridgeSettings';
import { TutorialScreen } from './games/bridge/ui/TutorialScreen';
import { useBridgeStore } from './games/bridge/store/gameStore';
import SnakeBoard from './games/snake/ui/SnakeBoard';
import TetrisBoard from './games/tetris/ui/TetrisBoard';
import BreakoutBoard from './games/breakout/ui/BreakoutBoard';
import { MinesweeperBoard } from './games/minesweeper/ui/MinesweeperBoard';
import { Game2048Board } from './games/2048/ui/Game2048Board';
import { useGameStore } from './games/backgammon/store/gameStore';
import { useAuthStore } from './shared/store/authStore';
import { isSupabaseConfigured } from './shared/lib/supabase';
import { getDailyChallenges } from './shared/lib/dailyChallenges';
import { LeaderboardScreen } from './shared/ui/LeaderboardScreen';
import type { GameType } from './shared/engine/types';
import type { VariantType } from './games/backgammon/engine/variants';

type AppView =
  | 'game-select'
  | 'settings'
  | 'leaderboard'
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
  | 'yahtzee-settings'
  // Bridge views
  | 'bridge-lobby'
  | 'bridge-play'
  | 'bridge-settings'
  | 'bridge-tutorial'
  // Arcade views
  | 'snake-play'
  | 'tetris-play'
  | 'breakout-play'
  | 'minesweeper-play'
  | '2048-play';

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
      // Arcade games go straight to play (no lobby needed)
      case 'snake': setView('snake-play'); break;
      case 'tetris': setView('tetris-play'); break;
      case 'breakout': setView('breakout-play'); break;
      case 'minesweeper': setView('minesweeper-play'); break;
      case '2048': setView('2048-play'); break;
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

  const handleStartGame = (
    matchLength: number,
    cubeEnabled: boolean,
    difficulty?: 'easy' | 'medium' | 'hard' | 'expert',
    tutorEnabled?: boolean,
    variant: VariantType = 'standard',
  ) => {
    if (difficulty) useGameStore.getState().setAIDifficulty(difficulty);
    useGameStore.getState().setTutorMode(tutorEnabled ?? false);
    startNewGame('vs-ai', matchLength, cubeEnabled, variant);
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
          onLeaderboard={() => setView('leaderboard')}
        />
      )}

      {view === 'leaderboard' && (
        <LeaderboardScreen onBack={() => setView('game-select')} />
      )}

      {view === 'backgammon-lobby' && (
        <HomeScreen
          onPlayAI={handleNewGameClick}
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
          onSettings={() => setView('yahtzee-settings')}
        />
      )}

      {view === 'yahtzee-play' && (
        <YahtzeeBoard onQuit={() => setView('yahtzee-lobby')} />
      )}

      {view === 'yahtzee-settings' && (
        <YahtzeeSettings onBack={() => setView('yahtzee-lobby')} />
      )}

      {/* ── Bridge views ─────────────────────────────────────────── */}

      {view === 'bridge-lobby' && (
        <BridgeLobby
          onPlay={() => setView('bridge-play')}
          onBack={() => setView('game-select')}
          onSettings={() => setView('bridge-settings')}
          onTutorial={() => setView('bridge-tutorial')}
        />
      )}

      {view === 'bridge-play' && (
        <BridgeBoard onQuit={() => setView('bridge-lobby')} />
      )}

      {view === 'bridge-settings' && (
        <BridgeSettings onBack={() => setView('bridge-lobby')} />
      )}

      {view === 'bridge-tutorial' && (
        <TutorialScreen
          onBack={() => setView('bridge-lobby')}
          onStartTutorial={(id) => {
            useBridgeStore.getState().startTutorial(id);
          }}
        />
      )}

      {/* ── Arcade Games ──────────────────────────────────────── */}

      {view === 'snake-play' && (
        <SnakeBoard onQuit={() => setView('game-select')} />
      )}

      {view === 'tetris-play' && (
        <TetrisBoard onQuit={() => setView('game-select')} />
      )}

      {view === 'breakout-play' && (
        <BreakoutBoard onQuit={() => setView('game-select')} />
      )}

      {view === 'minesweeper-play' && (
        <MinesweeperBoard onQuit={() => setView('game-select')} />
      )}

      {view === '2048-play' && (
        <Game2048Board onQuit={() => setView('game-select')} />
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

const VARIANT_OPTIONS = [
  { key: 'standard' as const, label: '🎲 Standard', desc: '15 checkers — classic rules' },
  { key: 'nackgammon' as const, label: '⚔️ Nackgammon', desc: '17 checkers — longer games' },
  { key: 'hypergammon' as const, label: '⚡ Hypergammon', desc: '3 checkers — blitz mode' },
];

const DIFFICULTIES = [
  { key: 'easy' as const, label: '😊 Easy', desc: 'Learning the ropes' },
  { key: 'medium' as const, label: '🎯 Medium', desc: 'Solid challenge' },
  { key: 'hard' as const, label: '🔥 Hard', desc: 'Tighter play' },
  { key: 'expert' as const, label: '🧠 Expert', desc: '2-ply lookahead' },
];

function NewGameModal({ onStart, onCancel }: {
  onStart: (
    matchLength: number,
    cubeEnabled: boolean,
    difficulty: 'easy' | 'medium' | 'hard' | 'expert',
    tutorEnabled: boolean,
    variant: VariantType,
  ) => void;
  onCancel: () => void;
}) {
  const [matchLength, setMatchLength] = useState(1);
  const [cubeEnabled, setCubeEnabled] = useState(true);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'expert'>('medium');
  const [tutorEnabled, setTutorEnabled] = useState(false);
  const [variant, setVariant] = useState<'standard' | 'nackgammon' | 'hypergammon'>('standard');
  const selectedVariant = VARIANT_OPTIONS.find((option) => option.key === variant)!;
  const selectedDifficulty = DIFFICULTIES.find((option) => option.key === difficulty)!;

  return (
    <div className="overlay-backdrop" onClick={onCancel}>
      <div className="overlay-card new-game-modal" onClick={(e) => e.stopPropagation()}>
        <div className="new-game-modal__header">
          <div className="new-game-modal__crest">🎲</div>
          <div className="new-game-modal__header-copy">
            <div className="new-game-modal__eyebrow">New Game</div>
            <h2>Start a Fresh Match</h2>
            <p>Pick your ruleset, choose an AI level, and roll into the next game.</p>
          </div>
        </div>

        <div className="new-game-modal__content">
          <section className="new-game-modal__panel">
            <div className="new-game-modal__section-title">Game Variant</div>
            <div className="new-game-modal__stack">
              {VARIANT_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  className={`new-game-option-card${variant === option.key ? ' active' : ''}`}
                  onClick={() => setVariant(option.key)}
                >
                  <div className="new-game-option-card__row">
                    <div className="new-game-option-card__title">{option.label}</div>
                    {variant === option.key && <span className="new-game-option-card__badge">Selected</span>}
                  </div>
                  <div className="new-game-option-card__desc">{option.desc}</div>
                </button>
              ))}
            </div>

            <div className="new-game-modal__section-title" style={{ marginTop: 18 }}>AI Difficulty</div>
            <div className="new-game-difficulty-grid">
              {DIFFICULTIES.map((option) => (
                <button
                  key={option.key}
                  className={`new-game-option-card compact${difficulty === option.key ? ' active' : ''}`}
                  onClick={() => setDifficulty(option.key)}
                >
                  <div className="new-game-option-card__row">
                    <div className="new-game-option-card__title">{option.label}</div>
                    {difficulty === option.key && <span className="new-game-option-card__badge">On</span>}
                  </div>
                  <div className="new-game-option-card__desc">{option.desc}</div>
                </button>
              ))}
            </div>
          </section>

          <section className="new-game-modal__panel new-game-modal__panel--accent">
            <div className="new-game-modal__section-title">Match Length</div>
            <div className="new-game-match-grid">
              {MATCH_LENGTHS.map((n) => (
                <button
                  key={n}
                  className={`new-game-match-pill${matchLength === n ? ' active' : ''}`}
                  onClick={() => setMatchLength(n)}
                >
                  <span className="new-game-match-pill__value">{n}</span>
                  <span className="new-game-match-pill__label">pts</span>
                </button>
              ))}
            </div>

            <div className="new-game-toggle-list">
              <button
                className={`new-game-toggle-card${cubeEnabled ? ' active' : ''}`}
                onClick={() => setCubeEnabled(!cubeEnabled)}
              >
                <div>
                  <div className="new-game-toggle-card__title">Doubling Cube</div>
                  <div className="new-game-toggle-card__desc">Raise the stakes mid-match.</div>
                </div>
                <div className={`new-game-toggle-switch${cubeEnabled ? ' active' : ''}`}>
                  <div className="new-game-toggle-switch__knob" />
                </div>
              </button>

              <button
                className={`new-game-toggle-card${tutorEnabled ? ' active' : ''}`}
                onClick={() => setTutorEnabled(!tutorEnabled)}
              >
                <div>
                  <div className="new-game-toggle-card__title">Tutor Mode</div>
                  <div className="new-game-toggle-card__desc">Warn me before obvious mistakes.</div>
                </div>
                <div className={`new-game-toggle-switch${tutorEnabled ? ' active' : ''}`}>
                  <div className="new-game-toggle-switch__knob" />
                </div>
              </button>
            </div>

            <div className="new-game-summary">
              <div className="new-game-summary__label">Selected Loadout</div>
              <div className="new-game-summary__headline">
                {selectedVariant.label} • {matchLength}-point match
              </div>
              <div className="new-game-summary__details">
                {selectedDifficulty.label} • {cubeEnabled ? 'Cube On' : 'Cube Off'} • {tutorEnabled ? 'Tutor On' : 'Tutor Off'}
              </div>
            </div>
          </section>
        </div>

        <div className="new-game-modal__footer">
          <button className="action-btn secondary new-game-modal__cancel" onClick={onCancel}>
            Back
          </button>
          <button
            className="action-btn primary new-game-modal__start"
            onClick={() => onStart(matchLength, cubeEnabled, difficulty, tutorEnabled, variant)}
          >
            Start Match
          </button>
        </div>
      </div>
    </div>
  );
}
