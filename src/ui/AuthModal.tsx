/**
 * Auth modal — sign in, sign up, or continue as guest.
 */

import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { isSupabaseConfigured } from '../lib/supabase';

export function AuthModal({ onClose, onGuest }: { onClose: () => void; onGuest: () => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, loading } = useAuthStore();

  if (!isSupabaseConfigured()) {
    return (
      <div className="overlay-backdrop" onClick={onClose}>
        <div className="overlay-card" onClick={(e) => e.stopPropagation()}>
          <h2>Multiplayer</h2>
          <p>Supabase is not configured yet. Add your credentials to .env to enable multiplayer.</p>
          <button className="action-btn primary" style={{ width: '100%' }} onClick={onGuest}>
            Play Offline
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'signin') {
      const result = await signInWithEmail(email, password);
      if (result.error) setError(result.error);
      else onClose();
    } else {
      if (!username.trim()) { setError('Username is required'); return; }
      const result = await signUpWithEmail(email, password, username.trim());
      if (result.error) setError(result.error);
      else {
        setError(null);
        setMode('signin');
        // Show success message
        setError('Check your email to confirm your account');
      }
    }
  };

  const handleGoogle = async () => {
    setError(null);
    const result = await signInWithGoogle();
    if (result.error) setError(result.error);
  };

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="overlay-card" onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 380, textAlign: 'left' }}>
        <h2 style={{ textAlign: 'center' }}>
          {mode === 'signin' ? 'Sign In' : 'Create Account'}
        </h2>
        <p style={{ textAlign: 'center' }}>
          {mode === 'signin'
            ? 'Sign in to play against friends'
            : 'Create an account to save your stats'}
        </p>

        {/* Google OAuth */}
        <button
          className="action-btn secondary"
          onClick={handleGoogle}
          style={{
            width: '100%', marginBottom: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 16px',
          color: 'var(--text-dim)', fontSize: 12,
        }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          or
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'signup' && (
            <input
              type="text" placeholder="Username"
              value={username} onChange={(e) => setUsername(e.target.value)}
              className="auth-input"
            />
          )}
          <input
            type="email" placeholder="Email"
            value={email} onChange={(e) => setEmail(e.target.value)}
            className="auth-input"
          />
          <input
            type="password" placeholder="Password"
            value={password} onChange={(e) => setPassword(e.target.value)}
            className="auth-input"
          />

          {error && (
            <div style={{
              fontSize: 12, padding: '8px 12px', borderRadius: 8,
              background: error.includes('Check your email') ? 'var(--player-dim)' : 'var(--opponent-dim)',
              color: error.includes('Check your email') ? 'var(--player)' : 'var(--opponent)',
            }}>
              {error}
            </div>
          )}

          <button className="action-btn primary" type="submit"
            disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
          {mode === 'signin' ? (
            <>
              Don't have an account?{' '}
              <button onClick={() => { setMode('signup'); setError(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12 }}>
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button onClick={() => { setMode('signin'); setError(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12 }}>
                Sign in
              </button>
            </>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button className="action-btn secondary" onClick={onGuest}
            style={{ width: '100%', fontSize: 12 }}>
            Continue as Guest (offline only)
          </button>
        </div>
      </div>
    </div>
  );
}
