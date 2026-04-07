/**
 * Home screen — welcoming entry point.
 * Uses Lucide icons instead of emojis.
 */

import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { isSupabaseConfigured } from '../lib/supabase';
import { useTheme } from '../lib/useTheme';
import { isPushSupported, subscribeToPush, isPushSubscribed, unsubscribeFromPush } from '../lib/pushNotifications';
import {
  Cpu, Users, Globe, Puzzle, ClipboardList, Settings,
  LogIn, Sun, Moon, Dice5, LogOut,
} from 'lucide-react';

interface HomeScreenProps {
  onPlayAI: () => void;
  onNewMultiplayer: () => void;
  onChallenges: () => void;
  onDashboard: () => void;
  onSignIn: () => void;
}

export function HomeScreen({ onPlayAI, onNewMultiplayer, onChallenges, onDashboard, onSignIn }: HomeScreenProps) {
  const { user, profile, signOut } = useAuthStore();
  const { theme, toggle: toggleTheme } = useTheme();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', flex: 1, padding: 20,
      background: 'var(--bg)',
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          marginBottom: 12,
          color: 'var(--accent)',
          filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
        }}>
          <Dice5 size={56} strokeWidth={1.5} />
        </div>
        <h1 style={{
          fontSize: 24, fontWeight: 800, letterSpacing: 2,
          color: 'var(--text)', margin: '0 0 4px',
        }}>
          Don's Backgammon
        </h1>
        {user && profile ? (
          <p style={{ fontSize: 14, color: 'var(--player)', margin: 0, fontWeight: 600 }}>
            Welcome back, {profile.display_name || profile.username}!
          </p>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
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
              icon={<Cpu size={22} />}
              title="Play vs Computer"
              subtitle="Practice against the AI"
              onClick={onPlayAI}
              color="var(--player)"
            />
            <GameCard
              icon={<Users size={22} />}
              title="Play vs Friend"
              subtitle="Invite a friend with a code"
              onClick={onNewMultiplayer}
              color="var(--accent)"
            />
            <GameCard
              icon={<Globe size={22} />}
              title="Play vs Random Opponent"
              subtitle="Get matched with someone online"
              onClick={onNewMultiplayer}
              color="#8b5cf6"
            />
            <GameCard
              icon={<Puzzle size={22} />}
              title="Solo Challenges"
              subtitle="Find the best move in tricky positions"
              onClick={onChallenges}
              color="var(--hit)"
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <SmallCard icon={<ClipboardList size={16} />} label="My Games" onClick={onDashboard} />
              <SmallCard icon={<Settings size={16} />} label="Settings" onClick={() => setShowSettings(true)} />
            </div>
          </>
        ) : (
          <>
            <GameCard
              icon={<Cpu size={22} />}
              title="Play vs Computer"
              subtitle="Jump right in — no sign up needed"
              onClick={onPlayAI}
              color="var(--player)"
            />
            <GameCard
              icon={<Puzzle size={22} />}
              title="Challenges"
              subtitle="Test your backgammon skills"
              onClick={onChallenges}
              color="var(--hit)"
            />
            {isSupabaseConfigured() && (
              <button
                onClick={onSignIn}
                style={{
                  width: '100%', marginTop: 8, padding: '14px 0',
                  background: 'none', border: '1px solid var(--glass-border)',
                  borderRadius: 12, cursor: 'pointer',
                  color: 'var(--accent)', fontSize: 13, fontWeight: 600,
                  fontFamily: 'var(--font)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <LogIn size={16} />
                Sign in for online play
              </button>
            )}
          </>
        )}
      </div>

      {/* Stats bar for signed in users */}
      {user && profile && (
        <div style={{
          marginTop: 24, display: 'flex', gap: 20, justifyContent: 'center',
        }}>
          <StatBubble value={profile.games_played} label="Played" />
          <StatBubble value={profile.games_won} label="Won" />
          <StatBubble
            value={profile.games_played > 0 ? Math.round((profile.games_won / profile.games_played) * 100) : 0}
            label="Win %"
            suffix="%"
          />
        </div>
      )}

      {/* Bottom links */}
      <div style={{
        marginTop: 24, display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <button
          onClick={toggleTheme}
          style={{
            background: 'none', border: 'none',
            color: 'var(--text-dim)', cursor: 'pointer', fontSize: 12,
            fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
          {theme === 'light' ? 'Dark mode' : 'Light mode'}
        </button>

        {user && (
          <>
            <span style={{ color: 'var(--border)', fontSize: 12 }}>|</span>
            <button
              onClick={signOut}
              style={{
                background: 'none', border: 'none',
                color: 'var(--text-dim)', cursor: 'pointer', fontSize: 12,
                fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              <LogOut size={13} />
              Sign out
            </button>
          </>
        )}
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}

function GameCard({ icon, title, subtitle, onClick, color }: {
  icon: React.ReactNode; title: string; subtitle: string; onClick: () => void; color: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: '16px 20px',
        background: 'var(--surface-2)',
        border: '1px solid var(--glass-border)',
        borderRadius: 16, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 14,
        textAlign: 'left', fontFamily: 'var(--font)',
        transition: 'transform 0.15s',
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: color + '18',
        color: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
          {subtitle}
        </div>
      </div>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: 'var(--text-dim)' }}>
        <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}

function SmallCard({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: '12px 16px',
        background: 'var(--surface-2)',
        border: '1px solid var(--glass-border)',
        borderRadius: 12, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600,
        color: 'var(--text-muted)',
        transition: 'transform 0.15s',
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      {icon}
      {label}
    </button>
  );
}

function StatBubble({ value, label, suffix }: { value: number; label: string; suffix?: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
        {value}{suffix}
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
        {label}
      </div>
    </div>
  );
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const { user, profile, signOut, updateProfile } = useAuthStore();
  const [username, setUsername] = useState(profile?.username || '');
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [saving, setSaving] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  useState(() => { isPushSubscribed().then(setPushEnabled); });

  const handleSave = async () => {
    setSaving(true);
    await updateProfile({
      username: username.trim() || undefined,
      display_name: displayName.trim() || undefined,
    });
    setSaving(false);
    onClose();
  };

  const handleTogglePush = async () => {
    if (!user) return;
    if (pushEnabled) {
      await unsubscribeFromPush(user.id);
      setPushEnabled(false);
    } else {
      const result = await subscribeToPush(user.id);
      if (!result.error) setPushEnabled(true);
    }
  };

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="overlay-card" onClick={(e) => e.stopPropagation()}
        style={{ textAlign: 'left', maxWidth: 380 }}>
        <h2 style={{ textAlign: 'center' }}>Settings</h2>
        <p style={{ textAlign: 'center' }}>Manage your profile</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Username
            </label>
            <input className="auth-input" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Display Name
            </label>
            <input className="auth-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>

          {isPushSupported() && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Push Notifications</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Get notified on your turn</div>
              </div>
              <button onClick={handleTogglePush} style={{
                width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
                background: pushEnabled ? 'var(--accent)' : 'var(--surface-2)',
                position: 'relative', transition: 'background 0.2s', flexShrink: 0,
              }}>
                <div style={{
                  position: 'absolute', top: 3, left: pushEnabled ? 24 : 3,
                  width: 20, height: 20, borderRadius: '50%', background: 'white',
                  transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }} />
              </button>
            </div>
          )}

          <button className="action-btn primary" onClick={handleSave}
            disabled={saving} style={{ width: '100%', marginTop: 8 }}>
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button className="action-btn secondary" onClick={async () => { await signOut(); onClose(); }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <LogOut size={14} />
            <span style={{ color: 'var(--opponent)' }}>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
