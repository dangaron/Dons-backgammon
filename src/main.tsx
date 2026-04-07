import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { supabase } from './lib/supabase'

// If this page loaded inside an OAuth popup, let Supabase process the
// callback, then close the popup once the session is established.
if (window.opener) {
  // Supabase needs to process the URL hash/params to establish the session.
  // Wait for it, then close.
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN') {
      // Small delay to ensure session is persisted to storage
      setTimeout(() => window.close(), 300);
    }
  });

  // Show a minimal loading state in the popup
  document.getElementById('root')!.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;
      font-family:system-ui;color:#6b7280;font-size:14px;background:#f0f1f5;">
      Signing in...
    </div>
  `;

  // Fallback: if session doesn't establish within 10s, show a close button
  setTimeout(() => {
    document.getElementById('root')!.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
        height:100vh;font-family:system-ui;color:#6b7280;font-size:14px;gap:16px;background:#f0f1f5;">
        <div>Sign in complete</div>
        <button onclick="window.close()" style="padding:8px 24px;border-radius:8px;border:none;
          background:#4ecdc4;color:#0a0b10;font-weight:600;cursor:pointer;font-size:14px;">
          Close Window
        </button>
      </div>
    `;
  }, 10000);
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
