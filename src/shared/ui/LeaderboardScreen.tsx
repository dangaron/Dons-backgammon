/**
 * Leaderboard screen — global rankings by ELO.
 */

import { useState, useEffect } from 'react';
import { ArrowLeft, Medal, Crown } from 'lucide-react';
import { fetchGlobalLeaderboard, type LeaderboardEntry } from '../lib/leaderboardService';
import { useAuthStore } from '../store/authStore';

interface LeaderboardScreenProps {
  onBack: () => void;
}

export function LeaderboardScreen({ onBack }: LeaderboardScreenProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    fetchGlobalLeaderboard(50).then((data) => {
      setEntries(data);
      setLoading(false);
    });
  }, []);

  return (
    <>
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
          <span style={{ fontSize: 16 }}>🏆</span>
          LEADERBOARD
        </div>
        <div style={{ width: 60 }} />
      </div>

      <div style={{
        flex: 1, overflow: 'auto', padding: '16px 20px',
        maxWidth: 500, margin: '0 auto', width: '100%',
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)', fontSize: 14 }}>
            Loading rankings...
          </div>
        ) : entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
              No players ranked yet
            </div>
            <div style={{ fontSize: 13 }}>Play some games to appear on the leaderboard!</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {entries.map((entry) => {
              const isMe = user?.id === entry.user_id;
              const rankIcon = entry.rank === 1 ? <Crown size={16} style={{ color: '#FFD700' }} />
                : entry.rank === 2 ? <Medal size={16} style={{ color: '#C0C0C0' }} />
                : entry.rank === 3 ? <Medal size={16} style={{ color: '#CD7F32' }} />
                : null;

              return (
                <div
                  key={entry.user_id}
                  className="game-card"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 12,
                    background: isMe ? 'var(--player-dim)' : 'var(--surface)',
                    border: `1px solid ${isMe ? 'rgba(78,205,196,0.3)' : 'var(--glass-border)'}`,
                  }}
                >
                  {/* Rank */}
                  <div style={{
                    width: 32, textAlign: 'center',
                    fontSize: rankIcon ? 0 : 16, fontWeight: 900,
                    color: entry.rank <= 3 ? 'var(--gold)' : 'var(--text-dim)',
                  }}>
                    {rankIcon || `#${entry.rank}`}
                  </div>

                  {/* Avatar */}
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: entry.avatar_url ? `url(${entry.avatar_url}) center/cover` : 'var(--surface-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, color: 'var(--text-muted)',
                    flexShrink: 0,
                  }}>
                    {!entry.avatar_url && (entry.display_name || entry.username)[0].toUpperCase()}
                  </div>

                  {/* Name */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: isMe ? 'var(--player)' : 'var(--text)' }}>
                      {entry.display_name || entry.username}
                      {isMe && <span style={{ fontSize: 10, marginLeft: 6, color: 'var(--player)' }}>(you)</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                      {entry.games_won}W / {entry.games_played}G
                    </div>
                  </div>

                  {/* Rating */}
                  <div style={{
                    fontSize: 18, fontWeight: 900, color: 'var(--text)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {entry.elo_rating}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
