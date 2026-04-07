/**
 * Home screen — first thing users see.
 * Signed out: sign in or play anonymously.
 * Signed in: full menu with single/multiplayer/puzzles/settings.
 */

import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { isSupabaseConfigured } from '../lib/supabase';
import { isPushSupported, subscribeToPush, isPushSubscribed, unsubscribeFromPush } from '../lib/pushNotifications';

interface HomeScreenProps {
  onPlayAI: () => void;
  onNewMultiplayer: () => void;
  onChallenges: () => void;
  onDashboard: () => void;
  onSignIn: () => void;
}

export function HomeScreen({ onPlayAI, onNewMultiplayer, onChallenges, onDashboard, onSignIn }: HomeScreenProps) {
  const { user, profile } = useAuthStore();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', flex: 1, padding: 20,
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🎲</div>
        <h1 style={{
          fontSize: 24, fontWeight: 800, letterSpacing: 2,
          color: 'var(--text)', margin: '0 0 6px',
        }}>
          DON'S BACKGAMMON
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          The classic game of strategy and luck
        </p>
      </div>

      {/* Menu */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 10,
        width: '100%', maxWidth: 340,
      }}>
        {user ? (
          <>
            {/* Signed in menu */}
            <MenuButton icon="🤖" label="New Singleplayer Game" onClick={onPlayAI} primary />
            <MenuButton icon="🌐" label="New Multiplayer Game" onClick={onNewMultiplayer}
              accent />
            <MenuButton icon="🧩" label="Puzzles" onClick={onChallenges} />
            {/* My Games — only if they have any */}
            <MenuButton icon="📋" label="My Games" onClick={onDashboard} />
            <MenuButton icon="⚙️" label="Settings" onClick={() => setShowSettings(true)} />
          </>
        ) : (
          <>
            {/* Signed out menu */}
            <MenuButton icon="🤖" label="Play vs AI" onClick={onPlayAI} primary />
            <MenuButton icon="🧩" label="Puzzles" onClick={onChallenges} />
            {isSupabaseConfigured() && (
              <MenuButton icon="🌐" label="Sign In for Online Play" onClick={onSignIn} accent />
            )}
          </>
        )}
      </div>

      {/* Signed in user info */}
      {user && profile && (
        <div style={{
          marginTop: 32, textAlign: 'center',
          fontSize: 12, color: 'var(--text-muted)',
        }}>
          Signed in as <span style={{ color: 'var(--player)', fontWeight: 600 }}>
            {profile.display_name || profile.username}
          </span>
          <span style={{ marginLeft: 8, opacity: 0.7 }}>
            {profile.games_won}W / {profile.games_played}G
          </span>
        </div>
      )}

      {/* Settings modal */}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

function MenuButton({ icon, label, onClick, primary, accent }: {
  icon: string; label: string; onClick: () => void; primary?: boolean; accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        height: primary ? 52 : 46,
        fontSize: primary ? 15 : 14,
        fontWeight: 600,
        fontFamily: 'var(--font)',
        borderRadius: 14,
        border: accent ? '1px solid var(--accent)' : '1px solid var(--glass-border)',
        background: primary ? 'var(--accent)' : 'var(--surface-2)',
        color: primary ? '#0a0b10' : accent ? 'var(--accent)' : 'var(--text)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        transition: 'all 0.2s',
      }}
    >
      <span style={{ fontSize: primary ? 20 : 18 }}>{icon}</span>
      {label}
    </button>
  );
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const { user, profile, signOut, updateProfile } = useAuthStore();
  const [username, setUsername] = useState(profile?.username || '');
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [saving, setSaving] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  // Check push status on mount
  useState(() => {
    isPushSubscribed().then(setPushEnabled);
  });

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
        <p style={{ textAlign: 'center' }}>Manage your profile and preferences</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Username
            </label>
            <input
              className="auth-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Display Name
            </label>
            <input
              className="auth-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          {/* Push notifications toggle */}
          {isPushSupported() && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 0',
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                  Push Notifications
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                  Get notified when it's your turn
                </div>
              </div>
              <button
                onClick={handleTogglePush}
                style={{
                  width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
                  background: pushEnabled ? 'var(--accent)' : 'var(--surface-2)',
                  position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                }}
              >
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
            style={{ width: '100%', color: 'var(--opponent)' }}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
