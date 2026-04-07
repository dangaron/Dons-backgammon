# Backgammon — Project Overview

World's best backgammon for serious players. Gameplay-first: speed control, click-to-see-all-moves, challenge mode, transparent dice.

## What it does

- Full backgammon vs AI (heuristic, runs in Web Worker)
- Click a piece to see all legal destinations highlighted (green = open, amber = hit)
- Adjustable animation speed (0.5x – 3x)
- Doubling cube with Offer/Accept modal
- Transparent dice: Mulberry32 seeded PRNG, seed displayed in UI, full roll history verifiable
- Challenge mode: curated positions, "find the best move" — free and unlimited
- localStorage persistence: game survives crash/refresh
- Play + challenges tabs in one app

## Architecture

```
src/
  engine/         ← Pure TS, no UI imports. Runs in browser AND Deno (Phase 2 edge functions).
    types.ts      ← Board, GameState, Move, DieMove, DoublingCube interfaces
    board.ts      ← Board utilities (flipBoard, pipCount, allCheckersHome, etc.)
    moves.ts      ← Legal move enumeration (getLegalMoves, getLegalMovesFrom, applyMove)
    game.ts       ← Game state transitions (roll, move, double, win detection)
    ai.ts         ← Heuristic AI evaluator (pip count + blot safety + anchors + priming)
    challenges.ts ← 15 curated challenge positions
  prng/
    mulberry32.ts ← Seeded PRNG, rollIndex tracking for crash recovery
  workers/
    ai.worker.ts  ← Web Worker wrapper for AI (postMessage interface)
  store/
    gameStore.ts  ← Zustand store (game state + UI state + AI triggering)
  ui/
    Board.tsx     ← SVG board, checkers, dice, controls
    ChallengeMode.tsx ← Challenge UI with mini board
  App.tsx         ← Navigation shell (Play / Challenges)
```

## Board model

26-element number array. Indices 0-23 = points. Index 24 = current player's bar (positive) + opponent bar (negative). Index 25 = current player's borne-off count. Positive = current player, negative = opponent. Flipped on each turn change.

## Key constraints

- `src/engine/` must never import from `src/ui/` or `src/store/` — enforced by ESLint `no-restricted-imports`
- PRNG stores `seed + rollIndex` in localStorage for crash-resume reproducibility
- AI always runs in a Web Worker — main thread never blocked

## Tech stack

- React + TypeScript + Vite
- Zustand (game + UI state)
- SVG board (no Canvas, no WebGL)
- Heuristic AI in Web Worker
- Mulberry32 PRNG
- localStorage for persistence
- Vercel for hosting (zero config)

## Phase 2 (planned)

- Supabase: auth, real-time postgres row subscriptions for async multiplayer
- Web push VAPID notifications
- Multi-game dashboard (Words with Friends style)
- Server-side move validation via Supabase Edge Functions using `src/engine/` directly

## Development

```bash
npm install
npm run dev      # dev server at localhost:5173
npm run build    # production build
npx tsc --noEmit # type check
npx eslint src/  # lint (enforces engine isolation)
```
