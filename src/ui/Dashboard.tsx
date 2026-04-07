/**
 * Multi-game dashboard — game lobby style.
 * Shows active games, completed games, and invite/join controls.
 */

import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useMultiplayerStore } from '../store/multiplayerStore';
import type { Game } from '../lib/database.types';

const MATCH_LENGTHS = [1, 3, 5, 7, 11, 15];

interface DashboardProps {
  onBack: () => void;
  onPlayAI: () => void;
  onOpenGame: (gameId: string) => void;
  onSignIn: () => void;
}

export function Dashboard({ onBack, onPlayAI, onOpenGame, onSignIn }: DashboardProps) {
  const { user, profile } = useAuthStore();
  const { games, loadingGames, loadGames, createGame, joinGame } = useMultiplayerStore();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [inviteResult, setInviteResult] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadGames(user.id);
  }, [user, loadGames]);

  const activeGames = games.filter(g => g.status === 'active' || g.status === 'waiting');
  const completedGames = games.filter(g => g.status === 'completed').slice(0, 10);

  return (
    <>
      {/* Top bar */}
      <div className="top-bar">
        <button className="action-btn secondary" onClick={onBack}
          style={{ fontSize: 11, height: 28, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
          <ArrowLeft size={14} />
          Back
        </button>
        <div style={{
          fontSize: 14, fontWeight: 900, color: 'var(--text)',
          letterSpacing: 1.5, textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ fontSize: 16 }}>🎲</span>
          GAME LOBBY
        </div>
        <div style={{ width: 60 }} />
      </div>

      {/* Content */}
      <div style={{
        flex: 1, overflow: 'auto', padding: '16px 20px',
        display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 600, margin: '0 auto', width: '100%',
      }}>
        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, animation: 'slide-up 0.4s ease-out' }}>
          <button className="action-btn primary" style={{ flex: 1 }} onClick={onPlayAI}>
            ⚔️ Play vs AI
          </button>
          {user ? (
            <>
              <button className="action-btn secondary" style={{ flex: 1 }}
                onClick={() => setShowCreate(true)}>
                🎯 Create
              </button>
              <button className="action-btn secondary" style={{ flex: 1 }}
                onClick={() => setShowJoin(true)}>
                🔗 Join
              </button>
            </>
          ) : (
            <button className="action-btn secondary" style={{ flex: 1 }} onClick={onSignIn}>
              🔐 Sign In
            </button>
          )}
        </div>

        {/* Invite result */}
        {inviteResult && (
          <div style={{
            background: 'linear-gradient(135deg, var(--player-dim), rgba(78, 205, 196, 0.05))',
            border: '2px solid rgba(78, 205, 196, 0.2)',
            borderRadius: 16, padding: '16px 18px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            animation: 'bounce-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>
                📋 Share this code with your opponent
              </div>
              <div style={{
                fontSize: 28, fontWeight: 900, letterSpacing: 6, color: 'var(--player)',
                fontFamily: "'SF Mono', monospace",
              }}>
                {inviteResult}
              </div>
            </div>
            <button className="action-btn secondary" style={{ fontSize: 12, height: 34 }}
              onClick={() => {
                navigator.clipboard?.writeText(inviteResult);
              }}>
              📋 Copy
            </button>
          </div>
        )}

        {/* Active games */}
        {activeGames.length > 0 && (
          <section>
            <h3 style={{
              fontSize: 12, fontWeight: 800, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ fontSize: 14 }}>⚡</span> Your Games
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeGames.map((game, i) => (
                <GameCard key={game.id} game={game} myId={user!.id}
                  onClick={() => onOpenGame(game.id)} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* Completed games */}
        {completedGames.length > 0 && (
          <section>
            <h3 style={{
              fontSize: 12, fontWeight: 800, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ fontSize: 14 }}>📜</span> Recent Games
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {completedGames.map((game, i) => (
                <GameCard key={game.id} game={game} myId={user!.id}
                  onClick={() => onOpenGame(game.id)} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {!loadingGames && activeGames.length === 0 && completedGames.length === 0 && user && (
          <div style={{
            textAlign: 'center', padding: '48px 0', color: 'var(--text-dim)',
            animation: 'bounce-in 0.6s ease-out',
          }}>
            <div style={{ fontSize: 48, marginBottom: 12, animation: 'float 3s ease-in-out infinite' }}>🎲</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>No games yet!</div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Create a game or join one with a code</div>
          </div>
        )}

        {loadingGames && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)', fontSize: 14, fontWeight: 600 }}>
            <div style={{ marginBottom: 8, fontSize: 20, animation: 'float 1.5s ease-in-out infinite' }}>🎲</div>
            Loading games...
          </div>
        )}
      </div>

      {/* Create game modal */}
      {showCreate && user && (
        <CreateGameModal
          onClose={() => setShowCreate(false)}
          onCreate={async (matchLength, cubeEnabled) => {
            const result = await createGame(user.id, matchLength, cubeEnabled);
            setShowCreate(false);
            if (result.inviteCode) setInviteResult(result.inviteCode);
          }}
        />
      )}

      {/* Join game modal */}
      {showJoin && user && (
        <JoinGameModal
          onClose={() => setShowJoin(false)}
          onJoin={async (code) => {
            const result = await joinGame(user.id, code);
            if (result.error) return result.error;
            setShowJoin(false);
            return null;
          }}
        />
      )}
    </>
  );
}

function GameCard({ game, myId, onClick, index }: { game: Game; myId: string; onClick: () => void; index: number }) {
  const isMyTurn = (game.current_player === 0 && game.player_white === myId) ||
                   (game.current_player === 1 && game.player_black === myId);
  const isWaiting = game.status === 'waiting';
  const isCompleted = game.status === 'completed';
  const iWon = game.winner === myId;

  const statusColor = isWaiting ? 'var(--text-dim)' :
    isCompleted ? (iWon ? 'var(--player)' : 'var(--opponent)') :
    isMyTurn ? 'var(--player)' : 'var(--text-muted)';

  const statusText = isWaiting ? '⏳ Waiting for opponent' :
    isCompleted ? (iWon ? '🏆 You won' : '💀 You lost') :
    isMyTurn ? '🟢 Your turn' : "⏸️ Opponent's turn";

  const borderColor = isMyTurn ? 'var(--player)' :
    isCompleted && iWon ? 'var(--player)' :
    isCompleted && !iWon ? 'var(--opponent)' :
    'transparent';

  const timeAgo = getTimeAgo(game.updated_at);

  return (
    <button
      className="game-card"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'stretch',
        background: 'var(--surface)', border: '1px solid var(--glass-border)',
        borderRadius: 14, padding: 0, cursor: 'pointer',
        width: '100%', textAlign: 'left', fontFamily: 'var(--font)',
        overflow: 'hidden',
        animation: `card-enter 0.3s ease-out ${index * 60}ms both`,
      }}
    >
      {/* Left accent */}
      <div style={{
        width: 4, flexShrink: 0,
        background: borderColor,
      }} />

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px 12px 12px', flex: 1,
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
            {game.match_length > 1 ? `${game.match_length}-point match` : 'Single game'}
            <span style={{
              fontSize: 11, color: 'var(--text-dim)', marginLeft: 8,
              fontWeight: 800,
            }}>
              {game.match_score[0]}-{game.match_score[1]}
            </span>
          </div>
          <div style={{ fontSize: 12, color: statusColor, marginTop: 3, fontWeight: 700 }}>
            {statusText}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600 }}>{timeAgo}</div>
          {isWaiting && game.invite_code && (
            <div style={{
              fontSize: 12, fontWeight: 800, color: 'var(--player)',
              fontFamily: "'SF Mono', monospace", marginTop: 2,
              letterSpacing: 2,
            }}>
              {game.invite_code}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

function CreateGameModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (matchLength: number, cubeEnabled: boolean) => void;
}) {
  const [matchLength, setMatchLength] = useState(1);
  const [cubeEnabled, setCubeEnabled] = useState(true);

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="overlay-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 28, marginBottom: 4 }}>🎯</div>
        <h2>Create Game</h2>
        <p>Choose settings and share the invite code</p>

        <div className="match-selector">
          {MATCH_LENGTHS.map((n) => (
            <button key={n}
              className={`match-option${matchLength === n ? ' active' : ''}`}
              onClick={() => setMatchLength(n)}>
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
          </div>
          <button onClick={() => setCubeEnabled(!cubeEnabled)} style={{
            width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
            background: cubeEnabled ? 'var(--accent)' : 'var(--surface-2)',
            position: 'relative', transition: 'background 0.2s', flexShrink: 0,
          }}>
            <div style={{
              position: 'absolute', top: 3, left: cubeEnabled ? 24 : 3,
              width: 20, height: 20, borderRadius: '50%', background: 'white',
              transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }} />
          </button>
        </div>

        <button className="action-btn primary" style={{ width: '100%' }}
          onClick={() => onCreate(matchLength, cubeEnabled)}>
          🚀 Create Game
        </button>
      </div>
    </div>
  );
}

function JoinGameModal({ onClose, onJoin }: {
  onClose: () => void;
  onJoin: (code: string) => Promise<string | null>;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 4) { setError('Enter the invite code'); return; }
    setLoading(true);
    setError(null);
    const err = await onJoin(code.toUpperCase());
    setLoading(false);
    if (err) setError(err);
  };

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="overlay-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 28, marginBottom: 4 }}>🔗</div>
        <h2>Join Game</h2>
        <p>Enter the invite code from your opponent</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="text"
            placeholder="INVITE CODE"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
            className="auth-input"
            style={{
              textAlign: 'center', fontSize: 22, fontWeight: 900,
              letterSpacing: 6, fontFamily: "'SF Mono', monospace",
              height: 52,
            }}
            autoFocus
          />

          {error && (
            <div style={{
              fontSize: 12, padding: '10px 14px', borderRadius: 10, fontWeight: 600,
              background: 'var(--opponent-dim)', color: 'var(--opponent)',
            }}>
              ⚠️ {error}
            </div>
          )}

          <button className="action-btn primary" type="submit"
            disabled={loading || code.length < 4} style={{ width: '100%' }}>
            {loading ? '⏳ Joining...' : '🎮 Join Game'}
          </button>
        </form>
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}
