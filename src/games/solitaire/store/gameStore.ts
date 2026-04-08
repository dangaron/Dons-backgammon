/**
 * Unified multi-variant Zustand store for Solitaire.
 * Manages game state for all 5 variants: Klondike, Spider, FreeCell, Pyramid, TriPeaks.
 */

import { create } from 'zustand';

// ── Types ─────────────────────────────────────────────────────────────────────

import type { SolitaireState, SolitaireMove, DrawMode } from '../engine/types';
import type { SpiderState, SpiderMove, SpiderSuitCount } from '../engine/spider';
import type { FreeCellState, FreeCellMove } from '../engine/freecell';
import type { PyramidState, PyramidMove } from '../engine/pyramid';
import type { TriPeaksState, TriPeaksMove } from '../engine/tripeaks';
import type { SolitaireVariant } from '../engine/variants';
import type {
  SolitaireStats,
  SolitaireSettings,
  Achievement,
} from '../engine/stats';

// ── Engine imports ────────────────────────────────────────────────────────────

// Klondike
import {
  createInitialState,
  applyMove,
  autoMoveToFoundations as autoMoveKlondikeFoundations,
  serializeState,
  deserializeState,
} from '../engine/game';
import { suggestMove } from '../engine/solver';
import { rankOf, colorOf } from '../engine/deck';

// Spider
import {
  createSpiderState,
  applySpiderMove,
  getSpiderLegalMoves,
  serializeSpiderState,
  deserializeSpiderState,
} from '../engine/spider';

// FreeCell
import {
  createFreeCellState,
  applyFreeCellMove,
  getFreeCellLegalMoves,
  autoMoveToFoundations as autoMoveFreeCellFoundations,
  serializeFreeCellState,
  deserializeFreeCellState,
} from '../engine/freecell';

// Pyramid
import {
  createPyramidState,
  applyPyramidMove,
  getPyramidLegalMoves,
  serializePyramidState,
  deserializePyramidState,
} from '../engine/pyramid';

// TriPeaks
import {
  createTriPeaksState,
  applyTriPeaksMove,
  getTriPeaksLegalMoves,
  serializeTriPeaksState,
  deserializeTriPeaksState,
} from '../engine/tripeaks';

// Stats & achievements
import {
  loadStats,
  recordGameResult,
  getUnlockedAchievements,
  getNewAchievements,
  loadSettings,
  saveSettings,
} from '../engine/stats';

// ── Storage keys (one per variant) ────────────────────────────────────────────

const STORAGE_KEYS: Record<SolitaireVariant, string> = {
  klondike: 'solitaire-klondike-v1',
  spider: 'solitaire-spider-v1',
  freecell: 'solitaire-freecell-v1',
  pyramid: 'solitaire-pyramid-v1',
  tripeaks: 'solitaire-tripeaks-v1',
};

// ── Per-variant localStorage helpers ──────────────────────────────────────────

function loadSavedKlondike(): SolitaireState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.klondike);
    if (raw) return deserializeState(raw);
  } catch { /* ignore */ }
  return null;
}

function loadSavedSpider(): SpiderState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.spider);
    if (raw) return deserializeSpiderState(raw);
  } catch { /* ignore */ }
  return null;
}

function loadSavedFreeCell(): FreeCellState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.freecell);
    if (raw) return deserializeFreeCellState(raw);
  } catch { /* ignore */ }
  return null;
}

function loadSavedPyramid(): PyramidState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.pyramid);
    if (raw) return deserializePyramidState(raw);
  } catch { /* ignore */ }
  return null;
}

function loadSavedTriPeaks(): TriPeaksState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.tripeaks);
    if (raw) return deserializeTriPeaksState(raw);
  } catch { /* ignore */ }
  return null;
}

function saveVariantState(variant: SolitaireVariant, state: unknown): void {
  switch (variant) {
    case 'klondike':
      localStorage.setItem(STORAGE_KEYS.klondike, serializeState(state as SolitaireState));
      break;
    case 'spider':
      localStorage.setItem(STORAGE_KEYS.spider, serializeSpiderState(state as SpiderState));
      break;
    case 'freecell':
      localStorage.setItem(STORAGE_KEYS.freecell, serializeFreeCellState(state as FreeCellState));
      break;
    case 'pyramid':
      localStorage.setItem(STORAGE_KEYS.pyramid, serializePyramidState(state as PyramidState));
      break;
    case 'tripeaks':
      localStorage.setItem(STORAGE_KEYS.tripeaks, serializeTriPeaksState(state as TriPeaksState));
      break;
  }
}

function clearSavedGame(variant: SolitaireVariant): void {
  localStorage.removeItem(STORAGE_KEYS[variant]);
}

/** Check which variants have a non-game-over saved game in localStorage. */
function detectSavedGames(): Record<SolitaireVariant, boolean> {
  const k = loadSavedKlondike();
  const s = loadSavedSpider();
  const f = loadSavedFreeCell();
  const p = loadSavedPyramid();
  const t = loadSavedTriPeaks();
  return {
    klondike: k !== null && !k.gameOver,
    spider: s !== null && !s.gameOver,
    freecell: f !== null && !f.gameOver,
    pyramid: p !== null && !p.gameOver,
    tripeaks: t !== null && !t.gameOver,
  };
}

// ── Auto-complete detection ───────────────────────────────────────────────────

/**
 * Klondike auto-complete: all face-down cards are revealed and all remaining
 * cards are either on foundations or in ordered tableau piles.
 */
function canAutoCompleteKlondike(state: SolitaireState): boolean {
  // All tableau face-down cards must be gone
  if (state.tableau.some(pile => pile.faceDown.length > 0)) return false;
  // Stock and waste must be empty (or waste has only foundation-ready cards)
  if (state.stock.length > 0) return false;
  // If waste is empty and all face-down are revealed, we can auto-complete
  return true;
}

/**
 * FreeCell auto-complete: all cards are face-up (always true in FreeCell)
 * and no blocked cards remain. Simplified: check that the game is "nearly won"
 * by verifying all tableau columns are in descending order with alternating colors.
 */
function canAutoCompleteFreeCell(state: FreeCellState): boolean {
  // Check that every tableau column is already sorted (descending, alternating colors)
  for (const col of state.tableau) {
    for (let i = 0; i < col.length - 1; i++) {
      const upper = col[i];
      const lower = col[i + 1];
      if (colorOf(upper) === colorOf(lower) || rankOf(upper) !== rankOf(lower) + 1) {
        return false;
      }
    }
  }
  // All free cells must be empty or the columns must be sorted
  return true;
}

/** Run Klondike auto-complete: repeatedly move foundation-eligible cards. */
function runAutoCompleteKlondike(state: SolitaireState): SolitaireState {
  let current = state;
  let changed = true;
  while (changed) {
    changed = false;
    const next = autoMoveKlondikeFoundations(current);
    if (next !== current) {
      current = next;
      changed = true;
    }
  }
  return current;
}

/** Run FreeCell auto-complete: repeatedly auto-move safe cards to foundations. */
function runAutoCompleteFreeCell(state: FreeCellState): FreeCellState {
  let current = state;
  let changed = true;
  while (changed) {
    changed = false;
    const next = autoMoveFreeCellFoundations(current);
    if (next !== current) {
      current = next;
      changed = true;
    }
  }
  return current;
}

// ── Hint helpers per variant ──────────────────────────────────────────────────

function getHintForVariant(store: SolitaireStore): unknown | null {
  switch (store.activeVariant) {
    case 'klondike': {
      if (!store.klondikeState) return null;
      return suggestMove(store.klondikeState);
    }
    case 'spider': {
      if (!store.spiderState) return null;
      const moves = getSpiderLegalMoves(store.spiderState);
      return moves.length > 0 ? moves[0] : null;
    }
    case 'freecell': {
      if (!store.freecellState) return null;
      const moves = getFreeCellLegalMoves(store.freecellState);
      // Prefer foundation moves, then tableau moves
      const foundationMove = moves.find(
        m => m.type === 'tableau-to-foundation' || m.type === 'freecell-to-foundation'
      );
      return foundationMove ?? (moves.length > 0 ? moves[0] : null);
    }
    case 'pyramid': {
      if (!store.pyramidState) return null;
      const moves = getPyramidLegalMoves(store.pyramidState);
      // Prefer pair/king removals over draw
      const removalMove = moves.find(m => m.type !== 'draw');
      return removalMove ?? (moves.length > 0 ? moves[0] : null);
    }
    case 'tripeaks': {
      if (!store.tripeaksState) return null;
      const moves = getTriPeaksLegalMoves(store.tripeaksState);
      // Prefer removes over draw
      const removeMove = moves.find(m => m.type === 'remove');
      return removeMove ?? (moves.length > 0 ? moves[0] : null);
    }
    default:
      return null;
  }
}

// ── Store options type ────────────────────────────────────────────────────────

export interface StartGameOptions {
  /** Klondike draw mode. */
  drawMode?: DrawMode;
  /** Spider suit count. */
  suitCount?: SpiderSuitCount;
  /** Explicit seed for reproducible games. */
  seed?: number;
}

// ── Store interface ───────────────────────────────────────────────────────────

interface SolitaireStore {
  activeVariant: SolitaireVariant;
  klondikeState: SolitaireState | null;
  spiderState: SpiderState | null;
  freecellState: FreeCellState | null;
  pyramidState: PyramidState | null;
  tripeaksState: TriPeaksState | null;
  /** Timestamp when the current game started (used for elapsed time calculation). */
  gameStartTime: number;
  undoStack: unknown[];
  hintMove: unknown | null;
  stats: SolitaireStats;
  settings: SolitaireSettings;
  newAchievements: Achievement[];
  hasSavedGame: Record<SolitaireVariant, boolean>;

  setActiveVariant: (v: SolitaireVariant) => void;
  startNewGame: (variant: SolitaireVariant, options?: StartGameOptions) => void;
  resumeGame: (variant: SolitaireVariant) => void;
  restartDeal: () => void;
  makeMove: (move: unknown) => void;
  undo: () => void;
  requestHint: () => void;
  clearHint: () => void;
  dismissAchievement: () => void;
  updateSettings: (partial: Partial<SolitaireSettings>) => void;
}

// ── Helper: get current seed for active variant ───────────────────────────────

function getActiveSeed(state: SolitaireStore): number | undefined {
  switch (state.activeVariant) {
    case 'klondike': return state.klondikeState?.seed;
    case 'spider': return state.spiderState?.seed;
    case 'freecell': return state.freecellState?.seed;
    case 'pyramid': return state.pyramidState?.seed;
    case 'tripeaks': return state.tripeaksState?.seed;
  }
}

// ── Create the store ──────────────────────────────────────────────────────────

export const useSolitaireStore = create<SolitaireStore>((set, get) => {
  const savedGames = detectSavedGames();

  return {
    activeVariant: 'klondike',
    klondikeState: null,
    spiderState: null,
    freecellState: null,
    pyramidState: null,
    tripeaksState: null,
    gameStartTime: Date.now(),
    undoStack: [],
    hintMove: null,
    stats: loadStats(),
    settings: loadSettings(),
    newAchievements: [],
    hasSavedGame: savedGames,

    // ── Set active variant ──────────────────────────────────────────────────

    setActiveVariant: (v: SolitaireVariant) => {
      set({ activeVariant: v, undoStack: [], hintMove: null });
    },

    // ── Start new game ──────────────────────────────────────────────────────

    startNewGame: (variant: SolitaireVariant, options?: StartGameOptions) => {
      switch (variant) {
        case 'klondike': {
          const drawMode = options?.drawMode ?? 1;
          const state = createInitialState(drawMode, options?.seed);
          saveVariantState('klondike', state);
          set({
            activeVariant: 'klondike',
            klondikeState: state,
            gameStartTime: Date.now(),
            undoStack: [],
            hintMove: null,
            hasSavedGame: { ...get().hasSavedGame, klondike: true },
          });
          break;
        }
        case 'spider': {
          const suitCount = options?.suitCount ?? 1;
          const state = createSpiderState(suitCount, options?.seed);
          saveVariantState('spider', state);
          set({
            activeVariant: 'spider',
            spiderState: state,
            gameStartTime: Date.now(),
            undoStack: [],
            hintMove: null,
            hasSavedGame: { ...get().hasSavedGame, spider: true },
          });
          break;
        }
        case 'freecell': {
          const state = createFreeCellState(options?.seed);
          saveVariantState('freecell', state);
          set({
            activeVariant: 'freecell',
            freecellState: state,
            gameStartTime: Date.now(),
            undoStack: [],
            hintMove: null,
            hasSavedGame: { ...get().hasSavedGame, freecell: true },
          });
          break;
        }
        case 'pyramid': {
          const state = createPyramidState(options?.seed);
          saveVariantState('pyramid', state);
          set({
            activeVariant: 'pyramid',
            pyramidState: state,
            gameStartTime: Date.now(),
            undoStack: [],
            hintMove: null,
            hasSavedGame: { ...get().hasSavedGame, pyramid: true },
          });
          break;
        }
        case 'tripeaks': {
          const state = createTriPeaksState(options?.seed);
          saveVariantState('tripeaks', state);
          set({
            activeVariant: 'tripeaks',
            tripeaksState: state,
            gameStartTime: Date.now(),
            undoStack: [],
            hintMove: null,
            hasSavedGame: { ...get().hasSavedGame, tripeaks: true },
          });
          break;
        }
      }
    },

    // ── Resume a saved game ─────────────────────────────────────────────────

    resumeGame: (variant: SolitaireVariant) => {
      switch (variant) {
        case 'klondike': {
          const saved = loadSavedKlondike();
          if (saved && !saved.gameOver) {
            set({
              activeVariant: 'klondike',
              klondikeState: saved,
              undoStack: [],
              hintMove: null,
            });
          }
          break;
        }
        case 'spider': {
          const saved = loadSavedSpider();
          if (saved && !saved.gameOver) {
            set({
              activeVariant: 'spider',
              spiderState: saved,
              undoStack: [],
              hintMove: null,
            });
          }
          break;
        }
        case 'freecell': {
          const saved = loadSavedFreeCell();
          if (saved && !saved.gameOver) {
            set({
              activeVariant: 'freecell',
              freecellState: saved,
              undoStack: [],
              hintMove: null,
            });
          }
          break;
        }
        case 'pyramid': {
          const saved = loadSavedPyramid();
          if (saved && !saved.gameOver) {
            set({
              activeVariant: 'pyramid',
              pyramidState: saved,
              undoStack: [],
              hintMove: null,
            });
          }
          break;
        }
        case 'tripeaks': {
          const saved = loadSavedTriPeaks();
          if (saved && !saved.gameOver) {
            set({
              activeVariant: 'tripeaks',
              tripeaksState: saved,
              undoStack: [],
              hintMove: null,
            });
          }
          break;
        }
      }
    },

    // ── Restart deal (same seed) ────────────────────────────────────────────

    restartDeal: () => {
      const state = get();
      const seed = getActiveSeed(state);
      if (seed === undefined) return;

      const variant = state.activeVariant;

      switch (variant) {
        case 'klondike': {
          const drawMode = state.klondikeState?.drawMode ?? 1;
          const fresh = createInitialState(drawMode, seed);
          saveVariantState('klondike', fresh);
          set({ klondikeState: fresh, gameStartTime: Date.now(), undoStack: [], hintMove: null });
          break;
        }
        case 'spider': {
          const suitCount = state.spiderState?.suitCount ?? 1;
          const fresh = createSpiderState(suitCount, seed);
          saveVariantState('spider', fresh);
          set({ spiderState: fresh, gameStartTime: Date.now(), undoStack: [], hintMove: null });
          break;
        }
        case 'freecell': {
          const fresh = createFreeCellState(seed);
          saveVariantState('freecell', fresh);
          set({ freecellState: fresh, gameStartTime: Date.now(), undoStack: [], hintMove: null });
          break;
        }
        case 'pyramid': {
          const fresh = createPyramidState(seed);
          saveVariantState('pyramid', fresh);
          set({ pyramidState: fresh, gameStartTime: Date.now(), undoStack: [], hintMove: null });
          break;
        }
        case 'tripeaks': {
          const fresh = createTriPeaksState(seed);
          saveVariantState('tripeaks', fresh);
          set({ tripeaksState: fresh, gameStartTime: Date.now(), undoStack: [], hintMove: null });
          break;
        }
      }
    },

    // ── Make a move ─────────────────────────────────────────────────────────

    makeMove: (move: unknown) => {
      const state = get();
      const variant = state.activeVariant;
      const prevStats = state.stats;
      const prevUnlocked = getUnlockedAchievements(prevStats);

      switch (variant) {
        case 'klondike': {
          const current = state.klondikeState;
          if (!current || current.gameOver) return;

          const prevState = current;
          let nextState = applyMove(current, move as SolitaireMove);

          // Auto-move safe cards to foundations (if setting enabled)
          if (!nextState.gameOver && state.settings.autoMoveToFoundation) {
            nextState = autoMoveKlondikeFoundations(nextState);
          }

          // Auto-complete detection
          if (!nextState.gameOver && state.settings.autoComplete && canAutoCompleteKlondike(nextState)) {
            nextState = runAutoCompleteKlondike(nextState);
          }

          // Handle win: record stats and check achievements
          let newStats = prevStats;
          let achievements: Achievement[] = [];
          if (nextState.won) {
            const elapsed = Math.round((Date.now() - nextState.startTime) / 1000);
            newStats = recordGameResult(prevStats, 'klondike', true, elapsed, nextState.score, nextState.moveCount);
            achievements = getNewAchievements(prevUnlocked, newStats);
            // Clear saved game on completion
            clearSavedGame('klondike');
          } else if (nextState.gameOver) {
            const elapsed = Math.round((Date.now() - nextState.startTime) / 1000);
            newStats = recordGameResult(prevStats, 'klondike', false, elapsed, nextState.score, nextState.moveCount);
            achievements = getNewAchievements(prevUnlocked, newStats);
            clearSavedGame('klondike');
          } else {
            saveVariantState('klondike', nextState);
          }

          set({
            klondikeState: nextState,
            undoStack: [...state.undoStack, prevState],
            hintMove: null,
            stats: newStats,
            newAchievements: [...state.newAchievements, ...achievements],
            hasSavedGame: {
              ...state.hasSavedGame,
              klondike: !nextState.gameOver,
            },
          });
          break;
        }

        case 'spider': {
          const current = state.spiderState;
          if (!current || current.gameOver) return;

          const prevState = current;
          const nextState = applySpiderMove(current, move as SpiderMove);

          let newStats = prevStats;
          let achievements: Achievement[] = [];
          if (nextState.won) {
            const elapsed = Math.round((Date.now() - nextState.startTime) / 1000);
            newStats = recordGameResult(prevStats, 'spider', true, elapsed, nextState.score, nextState.moveCount);
            achievements = getNewAchievements(prevUnlocked, newStats);
            clearSavedGame('spider');
          } else if (nextState.gameOver) {
            const elapsed = Math.round((Date.now() - nextState.startTime) / 1000);
            newStats = recordGameResult(prevStats, 'spider', false, elapsed, nextState.score, nextState.moveCount);
            achievements = getNewAchievements(prevUnlocked, newStats);
            clearSavedGame('spider');
          } else {
            saveVariantState('spider', nextState);
          }

          set({
            spiderState: nextState,
            undoStack: [...state.undoStack, prevState],
            hintMove: null,
            stats: newStats,
            newAchievements: [...state.newAchievements, ...achievements],
            hasSavedGame: {
              ...state.hasSavedGame,
              spider: !nextState.gameOver,
            },
          });
          break;
        }

        case 'freecell': {
          const current = state.freecellState;
          if (!current || current.gameOver) return;

          const prevState = current;
          let nextState = applyFreeCellMove(current, move as FreeCellMove);

          // Auto-move safe cards to foundations (if setting enabled)
          if (!nextState.gameOver && state.settings.autoMoveToFoundation) {
            nextState = autoMoveFreeCellFoundations(nextState);
          }

          // Auto-complete detection
          if (!nextState.gameOver && state.settings.autoComplete && canAutoCompleteFreeCell(nextState)) {
            nextState = runAutoCompleteFreeCell(nextState);
          }

          let newStats = prevStats;
          let achievements: Achievement[] = [];
          if (nextState.won) {
            const elapsed = Math.round((Date.now() - nextState.startTime) / 1000);
            newStats = recordGameResult(prevStats, 'freecell', true, elapsed, nextState.score, nextState.moveCount);
            achievements = getNewAchievements(prevUnlocked, newStats);
            clearSavedGame('freecell');
          } else if (nextState.gameOver) {
            const elapsed = Math.round((Date.now() - nextState.startTime) / 1000);
            newStats = recordGameResult(prevStats, 'freecell', false, elapsed, nextState.score, nextState.moveCount);
            achievements = getNewAchievements(prevUnlocked, newStats);
            clearSavedGame('freecell');
          } else {
            saveVariantState('freecell', nextState);
          }

          set({
            freecellState: nextState,
            undoStack: [...state.undoStack, prevState],
            hintMove: null,
            stats: newStats,
            newAchievements: [...state.newAchievements, ...achievements],
            hasSavedGame: {
              ...state.hasSavedGame,
              freecell: !nextState.gameOver,
            },
          });
          break;
        }

        case 'pyramid': {
          const current = state.pyramidState;
          if (!current || current.gameOver) return;

          const prevState = current;
          const nextState = applyPyramidMove(current, move as PyramidMove);

          let newStats = prevStats;
          let achievements: Achievement[] = [];
          if (nextState.won) {
            const elapsed = Math.round((Date.now() - state.gameStartTime) / 1000);
            newStats = recordGameResult(prevStats, 'pyramid', true, elapsed, nextState.score, nextState.moveCount);
            achievements = getNewAchievements(prevUnlocked, newStats);
            clearSavedGame('pyramid');
          } else if (nextState.gameOver) {
            const elapsed = Math.round((Date.now() - state.gameStartTime) / 1000);
            newStats = recordGameResult(prevStats, 'pyramid', false, elapsed, nextState.score, nextState.moveCount);
            achievements = getNewAchievements(prevUnlocked, newStats);
            clearSavedGame('pyramid');
          } else {
            saveVariantState('pyramid', nextState);
          }

          set({
            pyramidState: nextState,
            undoStack: [...state.undoStack, prevState],
            hintMove: null,
            stats: newStats,
            newAchievements: [...state.newAchievements, ...achievements],
            hasSavedGame: {
              ...state.hasSavedGame,
              pyramid: !nextState.gameOver,
            },
          });
          break;
        }

        case 'tripeaks': {
          const current = state.tripeaksState;
          if (!current || current.gameOver) return;

          const prevState = current;
          const nextState = applyTriPeaksMove(current, move as TriPeaksMove);

          let newStats = prevStats;
          let achievements: Achievement[] = [];
          if (nextState.won) {
            const elapsed = Math.round((Date.now() - state.gameStartTime) / 1000);
            newStats = recordGameResult(prevStats, 'tripeaks', true, elapsed, nextState.score, nextState.moveCount);
            achievements = getNewAchievements(prevUnlocked, newStats);
            clearSavedGame('tripeaks');
          } else if (nextState.gameOver) {
            const elapsed = Math.round((Date.now() - state.gameStartTime) / 1000);
            newStats = recordGameResult(prevStats, 'tripeaks', false, elapsed, nextState.score, nextState.moveCount);
            achievements = getNewAchievements(prevUnlocked, newStats);
            clearSavedGame('tripeaks');
          } else {
            saveVariantState('tripeaks', nextState);
          }

          set({
            tripeaksState: nextState,
            undoStack: [...state.undoStack, prevState],
            hintMove: null,
            stats: newStats,
            newAchievements: [...state.newAchievements, ...achievements],
            hasSavedGame: {
              ...state.hasSavedGame,
              tripeaks: !nextState.gameOver,
            },
          });
          break;
        }
      }
    },

    // ── Undo ────────────────────────────────────────────────────────────────

    undo: () => {
      const { undoStack, activeVariant } = get();
      if (undoStack.length === 0) return;

      const prev = undoStack[undoStack.length - 1];
      const newStack = undoStack.slice(0, -1);

      switch (activeVariant) {
        case 'klondike': {
          const prevState = prev as SolitaireState;
          saveVariantState('klondike', prevState);
          set({ klondikeState: prevState, undoStack: newStack, hintMove: null });
          break;
        }
        case 'spider': {
          const prevState = prev as SpiderState;
          saveVariantState('spider', prevState);
          set({ spiderState: prevState, undoStack: newStack, hintMove: null });
          break;
        }
        case 'freecell': {
          const prevState = prev as FreeCellState;
          saveVariantState('freecell', prevState);
          set({ freecellState: prevState, undoStack: newStack, hintMove: null });
          break;
        }
        case 'pyramid': {
          const prevState = prev as PyramidState;
          saveVariantState('pyramid', prevState);
          set({ pyramidState: prevState, undoStack: newStack, hintMove: null });
          break;
        }
        case 'tripeaks': {
          const prevState = prev as TriPeaksState;
          saveVariantState('tripeaks', prevState);
          set({ tripeaksState: prevState, undoStack: newStack, hintMove: null });
          break;
        }
      }
    },

    // ── Hints ───────────────────────────────────────────────────────────────

    requestHint: () => {
      const state = get();
      const hint = getHintForVariant(state);
      set({ hintMove: hint });
    },

    clearHint: () => set({ hintMove: null }),

    // ── Achievements ────────────────────────────────────────────────────────

    dismissAchievement: () => {
      const { newAchievements } = get();
      if (newAchievements.length <= 1) {
        set({ newAchievements: [] });
      } else {
        // Remove the first achievement (FIFO for toast display)
        set({ newAchievements: newAchievements.slice(1) });
      }
    },

    // ── Settings ────────────────────────────────────────────────────────────

    updateSettings: (partial: Partial<SolitaireSettings>) => {
      const current = get().settings;
      const updated = { ...current, ...partial };
      saveSettings(updated);
      set({ settings: updated });
    },
  };
});
