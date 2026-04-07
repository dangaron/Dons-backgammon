/**
 * Home screen — game title screen with playful, inviting energy.
 */

import type React from 'react';
import { useAuthStore } from '../store/authStore';
import { isSupabaseConfigured } from '../lib/supabase';
import { useTheme } from '../lib/useTheme';
import {
  Users, Globe, Puzzle, ClipboardList, Settings,
  LogIn, Sun, Moon, LogOut, Swords, Flame, ArrowLeft,
} from 'lucide-react';

interface HomeScreenProps {
  onPlayAI: () => void;
  onNewMultiplayer: () => void;
  onChallenges: () => void;
  onDashboard: () => void;
  onSignIn: () => void;
  onSettings?: () => void;
  onBack?: () => void;
}

export function HomeScreen({ onPlayAI, onNewMultiplayer, onChallenges, onDashboard, onSignIn, onSettings, onBack }: HomeScreenProps) {
  const { user, profile, signOut } = useAuthStore();
  const { theme, toggle: toggleTheme } = useTheme();

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', flex: 1, padding: 20,
      background: 'var(--bg)', position: 'relative',
    }}>
      {/* Back to game selector */}
      {onBack && (
        <button
          onClick={onBack}
          style={{
            position: 'absolute', top: 16, left: 16,
            background: 'var(--surface)', border: '1px solid var(--glass-border)',
            borderRadius: 10, padding: '6px 12px',
            color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12,
            fontFamily: 'var(--font)', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 5,
            transition: 'all 0.2s',
          }}
        >
          <ArrowLeft size={14} />
          All Games
        </button>
      )}
      {/* Logo area — game title screen feel */}
      <div style={{
        textAlign: 'center', marginBottom: 28,
        animation: 'slide-up 0.6s ease-out',
      }}>
        {/* Floating dice icon */}
        <div style={{
          marginBottom: 12,
          color: 'var(--accent)',
          animation: 'float 3s ease-in-out infinite',
          filter: 'drop-shadow(0 4px 16px rgba(78, 205, 196, 0.3))',
        }}>
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="4" />
            <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" />
            <circle cx="16" cy="8" r="1.2" fill="currentColor" stroke="none" />
            <circle cx="8" cy="16" r="1.2" fill="currentColor" stroke="none" />
            <circle cx="16" cy="16" r="1.2" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
          </svg>
        </div>
        <h1 style={{
          fontSize: 28, fontWeight: 900, letterSpacing: 2,
          color: 'var(--text)', margin: '0 0 6px',
          animation: 'title-glow 4s ease-in-out infinite',
        }}>
          Don's Backgammon
        </h1>
        {user && profile ? (
          <div style={{
            fontSize: 14, color: 'var(--player)', margin: 0, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <Flame size={14} />
            Welcome back, {profile.display_name || profile.username}!
          </div>
        ) : (
          <p style={{
            fontSize: 14, color: 'var(--text-muted)', margin: 0,
            fontWeight: 600, fontStyle: 'italic',
          }}>
            Roll the dice. Own the board.
          </p>
        )}
      </div>

      {/* Menu cards */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 10,
        width: '100%', maxWidth: 360,
      }}>
        {user ? (
          <>
            <GameCard
              icon={<Swords size={22} />}
              title="Play vs Computer"
              subtitle="Battle the AI"
              onClick={onPlayAI}
              color="var(--player)"
              delay={0}
            />
            <GameCard
              icon={<Users size={22} />}
              title="Play vs Friend"
              subtitle="Challenge a friend"
              onClick={onNewMultiplayer}
              color="var(--accent)"
              delay={1}
            />
            <GameCard
              icon={<Globe size={22} />}
              title="Play vs Random"
              subtitle="Find an opponent online"
              onClick={onNewMultiplayer}
              color="var(--purple)"
              delay={2}
            />
            <GameCard
              icon={<Puzzle size={22} />}
              title="Daily Challenges"
              subtitle="Solve puzzles, earn rewards"
              onClick={onChallenges}
              color="var(--hit)"
              delay={3}
              badge="NEW"
            />
            <div style={{ display: 'flex', gap: 10, animation: 'slide-up 0.5s ease-out 0.35s both' }}>
              <SmallCard icon={<ClipboardList size={16} />} label="My Games" onClick={onDashboard} />
              <SmallCard icon={<Settings size={16} />} label="Settings" onClick={() => onSettings?.()} />
            </div>
          </>
        ) : (
          <>
            <GameCard
              icon={<Swords size={22} />}
              title="Play vs Computer"
              subtitle="Jump right in — no sign up needed"
              onClick={onPlayAI}
              color="var(--player)"
              delay={0}
            />
            <GameCard
              icon={<Puzzle size={22} />}
              title="Daily Challenges"
              subtitle="Test your backgammon skills"
              onClick={onChallenges}
              color="var(--hit)"
              delay={1}
              badge="NEW"
            />
            {isSupabaseConfigured() && (
              <button
                className="game-card"
                onClick={onSignIn}
                style={{
                  width: '100%', marginTop: 4, padding: '14px 0',
                  background: 'none',
                  border: '2px dashed var(--glass-border)',
                  borderRadius: 16, cursor: 'pointer',
                  color: 'var(--accent)', fontSize: 14, fontWeight: 700,
                  fontFamily: 'var(--font)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  animation: 'slide-up 0.5s ease-out 0.2s both',
                }}
              >
                <LogIn size={16} />
                Sign in for online play
              </button>
            )}
          </>
        )}
      </div>

      {/* Stats bar — game achievement badges */}
      {user && profile && (
        <div style={{
          marginTop: 24, display: 'flex', gap: 16, justifyContent: 'center',
        }}>
          <StatBadge value={profile.games_played} label="Played" icon="🎮" delay={0.4} />
          <StatBadge value={profile.games_won} label="Won" icon="🏆" delay={0.5} />
          <StatBadge
            value={profile.games_played > 0 ? Math.round((profile.games_won / profile.games_played) * 100) : 0}
            label="Win %"
            suffix="%"
            icon="🔥"
            delay={0.6}
          />
        </div>
      )}

      {/* Bottom links */}
      <div style={{
        marginTop: 24, display: 'flex', alignItems: 'center', gap: 16,
        animation: 'slide-up 0.5s ease-out 0.5s both',
      }}>
        <button
          onClick={toggleTheme}
          style={{
            background: 'var(--surface-2)', border: '1px solid var(--glass-border)',
            borderRadius: 10, padding: '6px 12px',
            color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12,
            fontFamily: 'var(--font)', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6,
            transition: 'all 0.2s',
          }}
        >
          {theme === 'light' ? <Moon size={13} /> : <Sun size={13} />}
          {theme === 'light' ? 'Dark' : 'Light'}
        </button>

        {user && (
          <button
            onClick={signOut}
            style={{
              background: 'var(--surface-2)', border: '1px solid var(--glass-border)',
              borderRadius: 10, padding: '6px 12px',
              color: 'var(--text-dim)', cursor: 'pointer', fontSize: 12,
              fontFamily: 'var(--font)', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 5,
              transition: 'all 0.2s',
            }}
          >
            <LogOut size={13} />
            Sign out
          </button>
        )}
      </div>

    </div>
  );
}

function GameCard({ icon, title, subtitle, onClick, color, delay = 0, badge }: {
  icon: React.ReactNode; title: string; subtitle: string;
  onClick: () => void; color: string; delay?: number; badge?: string;
}) {
  return (
    <button
      className="game-card"
      onClick={onClick}
      style={{
        width: '100%', padding: 0,
        background: 'var(--surface)',
        border: '1px solid var(--glass-border)',
        borderRadius: 16, cursor: 'pointer',
        display: 'flex', alignItems: 'stretch',
        textAlign: 'left', fontFamily: 'var(--font)',
        position: 'relative', overflow: 'hidden',
        animation: `slide-up 0.5s ease-out ${delay * 0.08 + 0.1}s both`,
      }}
    >
      {/* Colored left accent */}
      <div style={{
        width: 5, flexShrink: 0,
        background: `linear-gradient(180deg, ${color}, ${color}88)`,
      }} />

      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '16px 16px 16px 14px', flex: 1,
      }}>
        <div style={{
          width: 46, height: 46, borderRadius: 14,
          background: color + '18',
          color: color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          boxShadow: `0 0 20px ${color}15`,
        }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 15, fontWeight: 800, color: 'var(--text)', lineHeight: 1.2,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {title}
            {badge && (
              <span style={{
                fontSize: 9, fontWeight: 800, padding: '2px 6px',
                borderRadius: 6, letterSpacing: 0.8,
                background: 'linear-gradient(135deg, var(--hit), #e67e22)',
                color: '#fff',
                animation: 'badge-pulse 2s ease-in-out infinite',
              }}>
                {badge}
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, fontWeight: 500 }}>
            {subtitle}
          </div>
        </div>
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: 'var(--text-dim)' }}>
          <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </button>
  );
}

function SmallCard({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      className="game-card"
      onClick={onClick}
      style={{
        flex: 1, padding: '12px 16px',
        background: 'var(--surface)',
        border: '1px solid var(--glass-border)',
        borderRadius: 14, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontFamily: 'var(--font)', fontSize: 13, fontWeight: 700,
        color: 'var(--text-muted)',
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function StatBadge({ value, label, suffix, icon, delay }: {
  value: number; label: string; suffix?: string; icon: string; delay: number;
}) {
  return (
    <div
      className="stat-badge"
      style={{
        textAlign: 'center',
        background: 'var(--surface)',
        border: '1px solid var(--glass-border)',
        borderRadius: 14, padding: '10px 16px',
        minWidth: 70,
        animationDelay: `${delay}s`,
      }}
    >
      <div style={{ fontSize: 14, marginBottom: 2 }}>{icon}</div>
      <div style={{
        fontSize: 22, fontWeight: 900, color: 'var(--text)',
        fontVariantNumeric: 'tabular-nums', lineHeight: 1,
      }}>
        {value}{suffix}
      </div>
      <div style={{
        fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase',
        letterSpacing: 0.8, fontWeight: 700, marginTop: 2,
      }}>
        {label}
      </div>
    </div>
  );
}

