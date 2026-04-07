/**
 * Settings screen — profile, avatar, theme, friends, notifications.
 */

import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../lib/useTheme';
import { supabase } from '../lib/supabase';
import { isPushSupported, subscribeToPush, isPushSubscribed, unsubscribeFromPush } from '../lib/pushNotifications';
import {
  ArrowLeft, Camera, Sun, Moon, Bell, BellOff,
  UserPlus, LogOut, Check, X, Search,
} from 'lucide-react';

interface SettingsScreenProps {
  onBack: () => void;
}

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const { user, profile, signOut, updateProfile, fetchProfile } = useAuthStore();
  const { theme, toggle: toggleTheme } = useTheme();

  const [username, setUsername] = useState(profile?.username || '');
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Friends state
  const [friends, setFriends] = useState<Array<{ id: string; username: string; display_name: string | null; avatar_url: string | null }>>([]);
  const [friendSearch, setFriendSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; username: string; display_name: string | null; avatar_url: string | null }>>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    isPushSubscribed().then(setPushEnabled);
    if (user) loadFriends();
  }, [user]);

  const loadFriends = async () => {
    if (!user) return;
    // Load friends from localStorage for now (Supabase friends table would be Phase 3)
    try {
      const raw = localStorage.getItem(`bg-friends-${user.id}`);
      if (raw) setFriends(JSON.parse(raw));
    } catch {}
  };

  const saveFriends = (list: typeof friends) => {
    if (!user) return;
    setFriends(list);
    try { localStorage.setItem(`bg-friends-${user.id}`, JSON.stringify(list)); } catch {}
  };

  const handleSave = async () => {
    setSaving(true);
    await updateProfile({
      username: username.trim() || undefined,
      display_name: displayName.trim() || undefined,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate
    if (!file.type.startsWith('image/')) return;
    if (file.size > 2 * 1024 * 1024) return; // 2MB limit

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `avatars/${user.id}.${ext}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        setUploading(false);
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);

      // Update profile
      await updateProfile({ avatar_url: publicUrl });
      await fetchProfile();
    } catch (err) {
      console.error('Avatar upload failed:', err);
    }
    setUploading(false);
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

  const handleSearchFriends = async () => {
    if (!friendSearch.trim() || !user) return;
    setSearching(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .or(`username.ilike.%${friendSearch}%,display_name.ilike.%${friendSearch}%`)
      .neq('id', user.id)
      .limit(10);
    setSearchResults((data || []) as typeof searchResults);
    setSearching(false);
  };

  const addFriend = (friend: typeof friends[0]) => {
    if (friends.some(f => f.id === friend.id)) return;
    saveFriends([...friends, friend]);
    setSearchResults([]);
    setFriendSearch('');
  };

  const removeFriend = (id: string) => {
    saveFriends(friends.filter(f => f.id !== id));
  };

  const avatarUrl = profile?.avatar_url;
  const initials = (profile?.display_name || profile?.username || '?')[0].toUpperCase();

  return (
    <>
      {/* Top bar */}
      <div className="top-bar">
        <button className="action-btn secondary" onClick={onBack}
          style={{ fontSize: 11, height: 28, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
          <ArrowLeft size={14} />
          Back
        </button>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', letterSpacing: 1 }}>
          SETTINGS
        </div>
        <div style={{ width: 60 }} />
      </div>

      {/* Content */}
      <div style={{
        flex: 1, overflow: 'auto', padding: '20px',
        display: 'flex', flexDirection: 'column', gap: 24,
        maxWidth: 440, margin: '0 auto', width: '100%',
      }}>
        {/* ── Profile Section ── */}
        <Section title="Profile">
          {/* Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: avatarUrl ? `url(${avatarUrl}) center/cover` : 'var(--player-dim)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: avatarUrl ? 0 : 28, fontWeight: 800,
                color: 'var(--player)', border: '3px solid var(--glass-border)',
              }}>
                {!avatarUrl && initials}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{
                  position: 'absolute', bottom: -2, right: -2,
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--accent)', border: '2px solid var(--bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#0a0b10',
                }}
              >
                <Camera size={13} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                style={{ display: 'none' }}
              />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                {profile?.display_name || profile?.username}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                @{profile?.username}
              </div>
              {uploading && (
                <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 4 }}>
                  Uploading...
                </div>
              )}
            </div>
          </div>

          {/* Username */}
          <FieldLabel label="Username">
            <input className="auth-input" value={username}
              onChange={(e) => setUsername(e.target.value)} />
          </FieldLabel>

          {/* Display name */}
          <FieldLabel label="Display Name">
            <input className="auth-input" value={displayName}
              onChange={(e) => setDisplayName(e.target.value)} />
          </FieldLabel>

          <button className="action-btn primary" onClick={handleSave}
            disabled={saving} style={{ width: '100%', marginTop: 4 }}>
            {saved ? <><Check size={14} /> Saved</> : saving ? 'Saving...' : 'Save Profile'}
          </button>
        </Section>

        {/* ── Appearance ── */}
        <Section title="Appearance">
          <div style={{ display: 'flex', gap: 8 }}>
            <ThemeOption
              icon={<Sun size={18} />}
              label="Light"
              active={theme === 'light'}
              onClick={() => { if (theme !== 'light') toggleTheme(); }}
            />
            <ThemeOption
              icon={<Moon size={18} />}
              label="Dark"
              active={theme === 'dark'}
              onClick={() => { if (theme !== 'dark') toggleTheme(); }}
            />
          </div>
        </Section>

        {/* ── Notifications ── */}
        {isPushSupported() && (
          <Section title="Notifications">
            <ToggleRow
              icon={pushEnabled ? <Bell size={18} /> : <BellOff size={18} />}
              label="Push Notifications"
              description="Get notified when it's your turn"
              enabled={pushEnabled}
              onToggle={handleTogglePush}
            />
          </Section>
        )}

        {/* ── Friends ── */}
        <Section title="Friends">
          {/* Search */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              className="auth-input"
              placeholder="Search by username..."
              value={friendSearch}
              onChange={(e) => setFriendSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchFriends()}
              style={{ flex: 1 }}
            />
            <button className="action-btn secondary icon-only"
              onClick={handleSearchFriends}
              disabled={searching}
              style={{ width: 40, height: 40, flexShrink: 0 }}>
              <Search size={16} />
            </button>
          </div>

          {/* Search results */}
          {searchResults.length > 0 && (
            <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {searchResults.map(p => (
                <FriendRow key={p.id} profile={p}
                  action={
                    friends.some(f => f.id === p.id)
                      ? <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Added</span>
                      : <button className="action-btn primary" style={{ height: 28, padding: '0 10px', fontSize: 11 }}
                          onClick={() => addFriend(p)}>
                          <UserPlus size={12} /> Add
                        </button>
                  }
                />
              ))}
            </div>
          )}

          {/* Friend list */}
          {friends.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', padding: '12px 0' }}>
              No friends added yet. Search to find players.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {friends.map(f => (
                <FriendRow key={f.id} profile={f}
                  action={
                    <button className="action-btn secondary icon-only"
                      onClick={() => removeFriend(f.id)}
                      style={{ width: 28, height: 28 }}>
                      <X size={13} />
                    </button>
                  }
                />
              ))}
            </div>
          )}
        </Section>

        {/* ── Sign Out ── */}
        <button className="action-btn secondary"
          onClick={async () => { await signOut(); onBack(); }}
          style={{
            width: '100%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 6, marginBottom: 20,
          }}>
          <LogOut size={14} />
          <span style={{ color: 'var(--opponent)' }}>Sign Out</span>
        </button>
      </div>
    </>
  );
}

// ── Helper Components ────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
      }}>
        {title}
      </div>
      <div style={{
        background: 'var(--surface-2)', border: '1px solid var(--glass-border)',
        borderRadius: 14, padding: 16,
      }}>
        {children}
      </div>
    </div>
  );
}

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{
        fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
        display: 'block', marginBottom: 4,
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function ThemeOption({ icon, label, active, onClick }: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: '12px 0',
        background: active ? 'var(--accent)' + '18' : 'transparent',
        border: `2px solid ${active ? 'var(--accent)' : 'var(--glass-border)'}`,
        borderRadius: 12, cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        fontFamily: 'var(--font)', fontSize: 12, fontWeight: 600,
        color: active ? 'var(--accent)' : 'var(--text-muted)',
        transition: 'all 0.2s',
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function ToggleRow({ icon, label, description, enabled, onToggle }: {
  icon: React.ReactNode; label: string; description: string;
  enabled: boolean; onToggle: () => void;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ color: enabled ? 'var(--accent)' : 'var(--text-dim)' }}>{icon}</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{label}</div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{description}</div>
        </div>
      </div>
      <button onClick={onToggle} style={{
        width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
        background: enabled ? 'var(--accent)' : 'var(--surface)',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', top: 3, left: enabled ? 24 : 3,
          width: 20, height: 20, borderRadius: '50%', background: 'white',
          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }} />
      </button>
    </div>
  );
}

function FriendRow({ profile, action }: {
  profile: { id: string; username: string; display_name: string | null; avatar_url: string | null };
  action: React.ReactNode;
}) {
  const initials = (profile.display_name || profile.username)[0].toUpperCase();
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 0',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: profile.avatar_url ? `url(${profile.avatar_url}) center/cover` : 'var(--player-dim)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: profile.avatar_url ? 0 : 13, fontWeight: 700,
        color: 'var(--player)', flexShrink: 0,
      }}>
        {!profile.avatar_url && initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
          {profile.display_name || profile.username}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>@{profile.username}</div>
      </div>
      {action}
    </div>
  );
}
