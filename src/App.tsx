import { useState } from 'react';
import { Board } from './ui/Board';
import { ChallengeMode } from './ui/ChallengeMode';
import { useGameStore } from './store/gameStore';

type AppView = 'game' | 'challenges' | 'new-game-options';

const MATCH_LENGTHS = [1, 3, 5, 7, 11, 15];

export default function App() {
  const [view, setView] = useState<AppView>('game');
  const { startNewGame } = useGameStore();

  const handleStartGame = (matchLength: number) => {
    startNewGame('vs-ai', matchLength);
    setView('game');
  };

  if (view === 'challenges') {
    return (
      <div className="app">
        <ChallengeMode onBack={() => setView('game')} />
      </div>
    );
  }

  return (
    <div className="app">
      {view === 'game' && (
        <Board
          onChallenges={() => setView('challenges')}
          onNewGame={() => setView('new-game-options')}
        />
      )}

      {view === 'new-game-options' && (
        <NewGameModal
          onStart={handleStartGame}
          onCancel={() => setView('game')}
        />
      )}

    </div>
  );
}

function NewGameModal({ onStart, onCancel }: {
  onStart: (matchLength: number) => void;
  onCancel: () => void;
}) {
  const [matchLength, setMatchLength] = useState(1);

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

        <button className="action-btn primary" style={{ width: '100%' }}
          onClick={() => onStart(matchLength)}>
          Start Game
        </button>
      </div>
    </div>
  );
}
