import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { supabase } from './lib/supabase'

// Detect if we're in an OAuth popup callback
const isPopup = !!window.opener;
const hasAuthParams = window.location.hash.includes('access_token') ||
  window.location.search.includes('code=');

if (isPopup && hasAuthParams) {
  // Show loading state
  document.getElementById('root')!.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;
      font-family:system-ui;color:#6b7280;font-size:14px;background:#f0f1f5;">
      Signing in...
    </div>
  `;

  // Wait for Supabase to process the auth callback
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      // Tell the parent window auth succeeded
      window.opener.postMessage({ type: 'supabase-auth', session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      }}, window.location.origin);
      setTimeout(() => window.close(), 500);
    }
  });

  // Fallback close button after 15s
  setTimeout(() => {
    const root = document.getElementById('root');
    if (root) {
      root.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
          height:100vh;font-family:system-ui;color:#6b7280;font-size:14px;gap:16px;background:#f0f1f5;">
          <div>You can close this window</div>
          <button onclick="window.close()" style="padding:8px 24px;border-radius:8px;border:none;
            background:#4ecdc4;color:#0a0b10;font-weight:600;cursor:pointer;font-size:14px;">
            Close Window
          </button>
        </div>
      `;
    }
  }, 15000);
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
