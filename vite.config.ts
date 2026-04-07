import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Map Vercel-Supabase integration env vars (non-prefixed) to VITE_ prefixed ones.
    // Only override if the VITE_ prefixed version is NOT already set (from .env).
    ...(!process.env.VITE_SUPABASE_URL && process.env.SUPABASE_URL
      ? { 'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL) }
      : {}),
    ...(!process.env.VITE_SUPABASE_ANON_KEY && process.env.SUPABASE_ANON_KEY
      ? { 'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.SUPABASE_ANON_KEY) }
      : {}),
  },
})
