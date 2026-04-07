# Don's Game Room — Project Overview

Multi-game platform. Currently includes Backgammon and Solitaire (Klondike), with Yahtzee and Bridge planned.

## What it does

### Backgammon
- Full backgammon vs AI (heuristic, runs in Web Worker)
- Click a piece to see all legal destinations highlighted (green = open, amber = hit)
- Adjustable animation speed (0.5x – 3x)
- Doubling cube with Offer/Accept modal
- Transparent dice: Mulberry32 seeded PRNG, seed displayed in UI
- Challenge mode: curated positions, "find the best move"
- Online multiplayer via Supabase (invite codes, real-time sync)

### Solitaire (Klondike)
- Classic Klondike solitaire with Draw-1 and Draw-3 modes
- SVG card rendering with click-to-select, click-to-move interaction
- Hint system (priority-based heuristic solver)
- Auto-move: safe cards auto-play to foundations
- Unlimited undo, scoring with time bonus
- Stats tracking (games played/won, best time, win streaks)

### Yahtzee
- 5 dice with click-to-hold interaction
- Full 13-category scorecard (upper section with 63+ bonus, lower section)
- Yahtzee bonus (100 points per extra Yahtzee)
- AI opponent with Monte Carlo simulation (Web Worker)
- Pass & Play local multiplayer
- Side-by-side scorecard with potential score preview
- localStorage persistence

### Coming Soon
- **Bridge**: Bidding, trick-taking, AI partners, 4-player multiplayer

## Architecture

```
src/
  games/
    backgammon/
      engine/       ← Pure TS game logic (board, moves, AI, challenges)
      store/        ← Zustand store (game + UI state)
      ui/           ← SVG board, challenge mode
      workers/      ← AI Web Worker
    solitaire/
      engine/       ← Pure TS (deck, moves, game state, solver/hints)
      store/        ← Zustand store (game state, undo, stats)
      ui/           ← SVG cards, board layout, lobby
    yahtzee/
      engine/       ← Pure TS (dice, scoring, game state, AI)
      store/        ← Zustand store (game state, AI worker integration)
      ui/           ← SVG dice, scorecard, board, lobby
      workers/      ← AI Web Worker (Monte Carlo evaluation)
  shared/
    engine/         ← GameType enum, shared interfaces
    store/          ← authStore, multiplayerStore (Supabase)
    ui/             ← GameSelector, Dashboard, AuthModal, Settings
    lib/            ← Supabase client, gameService, dailyChallenges, theme
  prng/
    mulberry32.ts   ← Seeded PRNG (used by backgammon dice + solitaire shuffles)
  App.tsx           ← Multi-game navigation shell
```

## Key constraints

- `src/games/*/engine/` must never import from UI or store — enforced by ESLint
- Each game engine is pure TypeScript, runs in browser, Web Worker, and Deno
- PRNG stores seed for reproducible games
- AI always runs in a Web Worker (backgammon); solitaire hints are single-frame

## Tech stack

- React 19 + TypeScript + Vite
- Zustand (per-game stores + shared auth/multiplayer stores)
- SVG rendering (no Canvas, no WebGL)
- Supabase (PostgreSQL + real-time + auth + storage)
- Mulberry32 PRNG
- localStorage for game persistence
- Vercel for hosting

## Database (Supabase)

- `profiles`: user info, stats
- `games`: game state with `game_type` column (backgammon, solitaire, etc.)
- `game_moves`: audit trail
- `avatars` storage bucket with RLS

## Development

```bash
npm install
npm run dev        # dev server at localhost:5173
npm run build      # production build
npx tsc --noEmit   # type check
npx eslint src/    # lint (enforces engine isolation)
npx vitest run     # run tests
```
