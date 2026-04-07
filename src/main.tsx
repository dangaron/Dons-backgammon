import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// If this page loaded inside an OAuth popup, close it and let the parent pick up the session
if (window.opener && window.location.hash.includes('access_token')) {
  window.close();
} else if (window.opener && window.location.search.includes('code=')) {
  // Some OAuth flows use query params instead of hash
  window.close();
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
