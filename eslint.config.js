import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', '.claude/worktrees/**']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  // Engine isolation rule: game engines must NOT import from UI or store.
  // This ensures the rules engine can run in Deno (Supabase Edge Functions) unchanged.
  {
    files: ['src/games/*/engine/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['../ui/*', '*/ui/*'], message: 'Engine must not import from UI — it must run in Deno too.' },
            { group: ['../store/*', '*/store/*'], message: 'Engine must not import from store — it must run in Deno too.' },
            { group: ['react', 'react-dom', 'zustand'], message: 'Engine must not import browser/React packages.' },
          ],
        },
      ],
    },
  },
])
