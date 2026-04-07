/**
 * Multi-game dashboard — Words With Friends style.
 * Shows active games, completed games, and invite/join controls.
 */

import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useMultiplayerStore } from '../store/multiplayerStore';
import type { Game } from '../lib/database.types';

const MATCH_LENGTHS = [1, 3, 5, 7, 11, 15];

interface DashboardProps {
  onPlayAI: () => void;
  onOpenGame: (gameId: string) => void;
  onSignIn: () => void;
}

export function Dashboard({ onPlayAI, onOpenGame, onSignIn }: DashboardProps) {
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="avatar active" style={{ background: 'var(--player-dim)' }}>
            <span style={{ fontSize: 13 }}>
              {profile?.username?.[0]?.toUpperCase() || '?'}
            </span>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
              {profile?.display_name || profile?.username || 'Guest'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {profile ? `${profile.games_won}W / ${profile.games_played}G` : 'Not signed in'}
            </div>
          </div>
        </div>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', letterSpacing: 1 }}>
          DON'S BACKGAMMON
        </div>
        <div style={{ width: 60 }} />
      </div>

      {/* Content */}
      <div style={{
        flex: 1, overflow: 'auto', padding: '16px 20px',
        display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 600, margin: '0 auto', width: '100%',
      }}>
        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="action-btn primary" style={{ flex: 1 }} onClick={onPlayAI}>
            Play vs AI
          </button>
          {user ? (
            <>
              <button className="action-btn secondary" style={{ flex: 1 }}
                onClick={() => setShowCreate(true)}>
                Create Game
              </button>
              <button className="action-btn secondary" style={{ flex: 1 }}
                onClick={() => setShowJoin(true)}>
                Join Game
              </button>
            </>
          ) : (
            <button className="action-btn secondary" style={{ flex: 1 }} onClick={onSignIn}>
              Sign In for Multiplayer
            </button>
          )}
        </div>

        {/* Invite result */}
        {inviteResult && (
          <div style={{
            background: 'var(--player-dim)', borderRadius: 12, padding: '14px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>
                Share this code with your opponent
              </div>
              <div style={{
                fontSize: 24, fontWeight: 800, letterSpacing: 4, color: 'var(--player)',
                fontFamily: "'SF Mono', monospace",
              }}>
                {inviteResult}
              </div>
            </div>
            <button className="action-btn secondary" style={{ fontSize: 11, height: 30 }}
              onClick={() => {
                navigator.clipboard?.writeText(inviteResult);
              }}>
              Copy
            </button>
          </div>
        )}

        {/* Active games */}
        {activeGames.length > 0 && (
          <section>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              Your Games
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeGames.map(game => (
                <GameCard key={game.id} game={game} myId={user!.id} onClick={() => onOpenGame(game.id)} />
              ))}
            </div>
          </section>
        )}

        {/* Completed games */}
        {completedGames.length > 0 && (
          <section>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              Recent Games
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {completedGames.map(game => (
                <GameCard key={game.id} game={game} myId={user!.id} onClick={() => onOpenGame(game.id)} />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {!loadingGames && activeGames.length === 0 && completedGames.length === 0 && user && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎲</div>
            <div style={{ fontSize: 14 }}>No games yet</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Create a game or join one with a code</div>
          </div>
        )}

        {loadingGames && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)', fontSize: 13 }}>
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

function GameCard({ game, myId, onClick }: { game: Game; myId: string; onClick: () => void }) {
  const isMyTurn = (game.current_player === 0 && game.player_white === myId) ||
                   (game.current_player === 1 && game.player_black === myId);
  const isWaiting = game.status === 'waiting';
  const isCompleted = game.status === 'completed';
  const iWon = game.winner === myId;

  const statusColor = isWaiting ? 'var(--text-dim)' :
    isCompleted ? (iWon ? 'var(--player)' : 'var(--opponent)') :
    isMyTurn ? 'var(--player)' : 'var(--text-muted)';

  const statusText = isWaiting ? 'Waiting for opponent' :
    isCompleted ? (iWon ? 'You won' : 'You lost') :
    isMyTurn ? 'Your turn' : "Opponent's turn";

  const timeAgo = getTimeAgo(game.updated_at);

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--surface-2)', border: '1px solid var(--glass-border)',
        borderRadius: 12, padding: '12px 16px', cursor: 'pointer',
        width: '100%', textAlign: 'left', fontFamily: 'var(--font)',
        transition: 'background 0.2s',
      }}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
          {game.match_length > 1 ? `${game.match_length}-point match` : 'Single game'}
          <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 8 }}>
            {game.match_score[0]}-{game.match_score[1]}
          </span>
        </div>
        <div style={{ fontSize: 11, color: statusColor, marginTop: 2, fontWeight: 600 }}>
          {statusText}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{timeAgo}</div>
        {isWaiting && game.invite_code && (
          <div style={{
            fontSize: 11, fontWeight: 700, color: 'var(--player)',
            fontFamily: "'SF Mono', monospace", marginTop: 2,
          }}>
            {game.invite_code}
          </div>
        )}
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
        <h2>Create Online Game</h2>
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
          marginBottom: 24, padding: '0 4px',
        }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>Doubling Cube</div>
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
          Create Game
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
        <h2>Join Game</h2>
        <p>Enter the 6-character invite code from your opponent</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="text"
            placeholder="INVITE CODE"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
            className="auth-input"
            style={{
              textAlign: 'center', fontSize: 20, fontWeight: 800,
              letterSpacing: 6, fontFamily: "'SF Mono', monospace",
            }}
            autoFocus
          />

          {error && (
            <div style={{
              fontSize: 12, padding: '8px 12px', borderRadius: 8,
              background: 'var(--opponent-dim)', color: 'var(--opponent)',
            }}>
              {error}
            </div>
          )}

          <button className="action-btn primary" type="submit"
            disabled={loading || code.length < 4} style={{ width: '100%' }}>
            {loading ? 'Joining...' : 'Join Game'}
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
