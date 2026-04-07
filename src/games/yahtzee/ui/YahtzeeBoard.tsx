/**
 * Yahtzee game board — dice area + scorecard.
 */

import { useYahtzeeStore } from '../store/gameStore';
import { totalScore } from '../engine/scoring';
import { DiceRow } from './DiceRenderer';
import { Scorecard } from './Scorecard';
import { ArrowLeft, RotateCcw } from 'lucide-react';

interface YahtzeeBoardProps {
  onQuit: () => void;
}

export function YahtzeeBoard({ onQuit }: YahtzeeBoardProps) {
  const {
    gameState, potentialScores, isAIThinking, diceAnimating,
    roll, toggleDieHold, score, startNewGame,
  } = useYahtzeeStore();

  const isPlayerTurn = gameState.currentPlayer === 0;
  const canRoll = gameState.rollsLeft > 0 && !gameState.gameOver && isPlayerTurn && !isAIThinking;
  const canScore = gameState.rollsLeft < 3 && !gameState.gameOver && isPlayerTurn && !isAIThinking;
  const canHold = gameState.rollsLeft > 0 && gameState.rollsLeft < 3 && isPlayerTurn && !isAIThinking;

  const rollLabel = gameState.rollsLeft === 3 ? 'Roll Dice' :
    gameState.rollsLeft === 2 ? 'Roll Again (2 left)' :
    gameState.rollsLeft === 1 ? 'Last Roll' : 'Choose a Category';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      flex: 1, background: 'var(--bg)', padding: '8px 0',
      overflow: 'auto',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', maxWidth: 500, padding: '0 12px', marginBottom: 8,
      }}>
        <button onClick={onQuit} className="action-btn secondary" style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', fontSize: 12,
        }}>
          <ArrowLeft size={14} /> Back
        </button>

        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>
          Turn {Math.min(gameState.turn, 13)} / 13
        </div>

        <button
          onClick={() => startNewGame(gameState.gameMode)}
          className="action-btn secondary"
          style={{ padding: '6px 8px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 3 }}
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Current player indicator */}
      <div style={{
        fontSize: 12, fontWeight: 700, marginBottom: 8,
        color: isPlayerTurn ? 'var(--player)' : 'var(--opponent)',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        {isAIThinking ? (
          <>
            <span className="thinking-dot" style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--opponent)' }} />
            <span className="thinking-dot" style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--opponent)' }} />
            <span className="thinking-dot" style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--opponent)' }} />
            AI is thinking...
          </>
        ) : gameState.gameOver ? (
          ''
        ) : (
          isPlayerTurn ? 'Your Turn' : (gameState.gameMode === 'vs-ai' ? "AI's Turn" : "Player 2's Turn")
        )}
      </div>

      {/* Dice area */}
      <div style={{
        width: '100%', maxWidth: 380, padding: '0 12px', marginBottom: 12,
      }}>
        <DiceRow
          dice={gameState.dice}
          held={gameState.held}
          onToggleHold={toggleDieHold}
          animating={diceAnimating}
          disabled={!canHold}
        />

        {/* Roll button */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
          <button
            className="action-btn primary"
            onClick={roll}
            disabled={!canRoll}
            style={{
              padding: '10px 32px', fontSize: 14,
              opacity: canRoll ? 1 : 0.4,
              cursor: canRoll ? 'pointer' : 'default',
            }}
          >
            🎲 {rollLabel}
          </button>
        </div>

        {/* Hold hint */}
        {canHold && gameState.rollsLeft < 3 && (
          <div style={{
            textAlign: 'center', marginTop: 6,
            fontSize: 11, color: 'var(--text-dim)',
          }}>
            Tap dice to hold them
          </div>
        )}
      </div>

      {/* Scorecard */}
      <div style={{ width: '100%', maxWidth: 380, padding: '0 12px' }}>
        <Scorecard
          players={gameState.players}
          currentPlayer={gameState.currentPlayer}
          potentialScores={potentialScores}
          onScore={score}
          canScore={canScore}
          isAI={gameState.gameMode === 'vs-ai'}
        />
      </div>

      {/* Game over overlay */}
      {gameState.gameOver && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100,
        }}>
          <div style={{
            background: 'var(--surface)', borderRadius: 20, padding: '32px 40px',
            textAlign: 'center', animation: 'slide-up 0.4s ease-out',
            border: '1px solid var(--glass-border)',
            minWidth: 280,
          }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>
              {gameState.winner === 0 ? '🎉' : gameState.winner === 1 ? '😔' : '🤝'}
            </div>
            <h2 style={{ color: 'var(--text)', margin: '0 0 8px', fontSize: 24, fontWeight: 900 }}>
              {gameState.winner === 0 ? 'You Win!' :
               gameState.winner === 1 ? (gameState.gameMode === 'vs-ai' ? 'AI Wins' : 'Player 2 Wins') :
               "It's a Tie!"}
            </h2>
            <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>You</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--player)' }}>
                    {totalScore(gameState.players[0])}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{gameState.gameMode === 'vs-ai' ? 'AI' : 'P2'}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--opponent)' }}>
                    {totalScore(gameState.players[1])}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="action-btn primary"
                style={{ flex: 1 }}
                onClick={() => startNewGame(gameState.gameMode)}
              >
                Play Again
              </button>
              <button className="action-btn secondary" style={{ flex: 1 }} onClick={onQuit}>
                Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
