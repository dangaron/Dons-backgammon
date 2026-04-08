/**
 * Zustand game store.
 */

import { create } from 'zustand';
import type { GameState, Move } from '../engine/types';
import {
  createInitialGameState,
  rollDice,
  applyMoveToState,
  forcedPass,
  serializeState,
  deserializeState,
  offerDouble,
  acceptDouble,
  rejectDouble,
  canOfferDouble,
} from '../engine/game';
import { getLegalMoves, getValidSingleMoves, applySingleDieMove, hasLegalMoves } from '../engine/moves';
import { BAR, HOME, flipBoard } from '../engine/board';
import { Mulberry32, generateSeed } from '../../../prng/mulberry32';
import type { AIDifficulty } from '../engine/ai';
import type { VariantType } from '../engine/variants';
import { hasWonVariant } from '../engine/variants';
import type { AIRequest, AIResponse } from '../workers/ai.worker';
import { playSound } from '../../../shared/lib/sounds';
import type { MoveRecord } from '../engine/analysis';
import { analyzeMove } from '../engine/analysis';
import { saveGameHistory } from '../../../shared/lib/gameHistory';

const STORAGE_KEY = 'backgammon-game-v2';
const PRNG_STORAGE_KEY = 'backgammon-prng-v2';

export type GameMode = 'vs-ai' | 'vs-human-local';

interface PRNGState {
  seed: number;
  rollIndex: number;
}

interface GameStore {
  gameState: GameState;
  prng: PRNGState;

  // UI state
  selectedPoint: number | null;
  legalDestinations: Array<{ to: number; die: number }>;
  animationSpeed: number;
  isAIThinking: boolean;
  gameMode: GameMode;
  showVerifyDialog: boolean;
  rollHistory: [number, number][];
  matchLength: number;
  /** Display-coordinate points where AI just moved (for glow highlight) */
  aiHighlights: number[];
  /** AI's dice roll — persists through the entire animation so the player can study it */
  aiDice: number[];
  /** Opening roll result: [playerDie, opponentDie] */
  openingRoll: [number, number] | null;
  /** Who won the opening roll */
  openingWinner: 'you' | 'opponent' | 'tie' | null;
  /** Undo stack for player's die moves within a turn */
  turnUndoStack: Array<{ board: number[]; dice: number[] }>;
  /** Whether the player has finished moving (all dice used or no legal moves) */
  turnComplete: boolean;
  /** Move history for post-game analysis */
  moveHistory: MoveRecord[];
  /** Current turn's accumulated die moves (before endTurn) */
  currentTurnMoves: import('../engine/types').DieMove[];
  /** Board at start of current turn */
  turnStartBoard: number[] | null;
  /** Dice at start of current turn */
  turnStartDice: number[] | null;
  /** AI difficulty level */
  aiDifficulty: AIDifficulty;
  /** Hint: AI's recommended move */
  hintMove: import('../engine/types').Move | null;
  hintScore: number | null;
  showingHint: boolean;
  /** Tutor mode */
  tutorMode: boolean;
  tutorWarning: { message: string; error: number; aiMove: import('../engine/types').Move | null } | null;

  // Actions
  startNewGame: (mode?: GameMode, matchLength?: number, cubeEnabled?: boolean, variant?: VariantType) => void;
  setAIDifficulty: (difficulty: AIDifficulty) => void;
  requestHint: () => void;
  clearHint: () => void;
  setTutorMode: (enabled: boolean) => void;
  confirmTutorWarning: () => void;
  dismissTutorWarning: () => void;
  performOpeningRoll: () => void;
  rollDiceAction: () => void;
  selectPoint: (point: number) => void;
  makeMove: (move: Move) => void;
  makeSingleDieMove: (from: number, to: number, die: number) => void;
  undoMove: () => void;
  endTurn: () => void;
  animateAIMove: (move: Move) => void;
  offerDoubleAction: () => void;
  acceptDoubleAction: () => void;
  rejectDoubleAction: () => void;
  setAnimationSpeed: (speed: number) => void;
  clearSelection: () => void;
  setShowVerifyDialog: (show: boolean) => void;
  triggerAIMove: () => void;
}

let aiWorker: Worker | null = null;
function getAIWorker(): Worker {
  if (!aiWorker) {
    aiWorker = new Worker(new URL('../workers/ai.worker.ts', import.meta.url), { type: 'module' });
  }
  return aiWorker;
}

function loadSaved(): { gameState: GameState | null; prng: PRNGState | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const prngRaw = localStorage.getItem(PRNG_STORAGE_KEY);
    return {
      gameState: raw ? deserializeState(raw) : null,
      prng: prngRaw ? JSON.parse(prngRaw) : null,
    };
  } catch {
    return { gameState: null, prng: null };
  }
}

function save(gameState: GameState, prng: PRNGState) {
  try {
    if (gameState.turnPhase === 'game-over') {
      // Game is finished — clear saved state so it never recurs
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(PRNG_STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, serializeState(gameState));
      localStorage.setItem(PRNG_STORAGE_KEY, JSON.stringify(prng));
    }
  } catch { /* quota exceeded */ }
}

const { gameState: saved, prng: savedPrng } = loadSaved();
const initSeed = savedPrng?.seed ?? generateSeed();
const initRollIndex = savedPrng?.rollIndex ?? 0;

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: saved ?? createInitialGameState(),
  prng: { seed: initSeed, rollIndex: initRollIndex },
  selectedPoint: null,
  legalDestinations: [],
  animationSpeed: 1.5,
  isAIThinking: false,
  gameMode: 'vs-ai',
  showVerifyDialog: false,
  rollHistory: [],
  matchLength: 1,
  aiHighlights: [],
  aiDice: [],
  openingRoll: null,
  openingWinner: null,
  turnUndoStack: [],
  turnComplete: false,
  moveHistory: [],
  currentTurnMoves: [],
  turnStartBoard: null,
  turnStartDice: null,
  aiDifficulty: 'medium',
  hintMove: null,
  hintScore: null,
  showingHint: false,
  tutorMode: false,
  tutorWarning: null,

  setTutorMode: (enabled: boolean) => set({ tutorMode: enabled }),

  confirmTutorWarning: () => {
    // User chose to keep their move — proceed with endTurn
    set({ tutorWarning: null });
    get().endTurn();
  },

  dismissTutorWarning: () => {
    // User wants to undo — just dismiss the warning
    set({ tutorWarning: null });
  },

  setAIDifficulty: (difficulty: AIDifficulty) => set({ aiDifficulty: difficulty }),

  requestHint: () => {
    const { gameState, aiDifficulty } = get();
    if (gameState.turnPhase !== 'move' || gameState.currentPlayer !== 0) return;
    set({ showingHint: true });

    const worker = getAIWorker();
    const request: AIRequest = {
      type: 'hint',
      board: gameState.board,
      dice: gameState.dice,
      difficulty: aiDifficulty,
    };

    const handler = (e: MessageEvent<AIResponse>) => {
      worker.removeEventListener('message', handler);
      set({ hintMove: e.data.move, hintScore: e.data.score ?? null });
    };
    worker.addEventListener('message', handler);
    worker.postMessage(request);
  },

  clearHint: () => set({ hintMove: null, hintScore: null, showingHint: false }),

  startNewGame: (mode = 'vs-ai', matchLength = 1, cubeEnabled = true, variant = 'standard') => {
    const seed = generateSeed();
    const newState = createInitialGameState(matchLength, variant);
    if (!cubeEnabled) {
      // Disable doubling by setting owner to a dummy value that blocks both players
      newState.doublingCube = { value: 1, owner: 0, offeredBy: null };
    }
    const prng = { seed, rollIndex: 0 };
    save(newState, prng);
    set({
      gameState: newState,
      prng,
      selectedPoint: null,
      legalDestinations: [],
      isAIThinking: false,
      gameMode: mode,
      rollHistory: [],
      matchLength,
      turnUndoStack: [],
      turnComplete: false,
      aiHighlights: [],
      aiDice: [],
      openingRoll: null,
      openingWinner: null,
      moveHistory: [],
      currentTurnMoves: [],
      turnStartBoard: null,
      turnStartDice: null,
    });
  },

  performOpeningRoll: () => {
    const { gameState, prng, gameMode } = get();
    if (gameState.turnPhase !== 'opening-roll') return;

    const rng = new Mulberry32(prng.seed, prng.rollIndex);
    const playerDie = rng.rollDie();
    const oppDie = rng.rollDie();
    const newPrng = { seed: prng.seed, rollIndex: rng.rollIndex };

    set({
      prng: newPrng,
      openingRoll: [playerDie, oppDie],
      openingWinner: playerDie > oppDie ? 'you' : oppDie > playerDie ? 'opponent' : 'tie',
    });

    if (playerDie === oppDie) {
      // Tie — re-roll after a delay
      setTimeout(() => {
        set({ openingRoll: null, openingWinner: null });
        // Update the game state to trigger another opening roll
        setTimeout(() => get().performOpeningRoll(), 300);
      }, 1500);
      return;
    }

    // Determine first player and set dice to both opening roll values
    const openingDice = rollDice(playerDie, oppDie);

    setTimeout(() => {
      if (playerDie > oppDie) {
        // Player goes first with the opening dice
        const newState: GameState = {
          ...gameState, dice: openingDice, diceRolled: true, turnPhase: 'move',
          currentPlayer: 0,
        };
        save(newState, newPrng);
        set({
          gameState: newState,
          openingRoll: null,
          openingWinner: null,
          rollHistory: [[playerDie, oppDie]],
        });
      } else {
        // Opponent goes first — flip board for player 1's perspective
        const flipped = flipBoard(gameState.board);
        flipped[HOME] = 0; // opponent starts with 0 borne off
        const newState: GameState = {
          ...gameState,
          board: flipped,
          dice: openingDice,
          diceRolled: true,
          turnPhase: 'move',
          currentPlayer: 1,
          borneOff: [0, 0],
        };
        save(newState, newPrng);
        set({
          gameState: newState,
          openingRoll: null,
          openingWinner: null,
          rollHistory: [[playerDie, oppDie]],
        });

        // Trigger AI move
        if (gameMode === 'vs-ai') {
          get().triggerAIMove();
        }
      }
    }, 2000);
  },

  rollDiceAction: () => {
    const { gameState, prng, gameMode } = get();
    if (gameState.turnPhase !== 'roll') return;

    const rng = new Mulberry32(prng.seed, prng.rollIndex);
    const [d1, d2] = rng.rollTwoDice();
    const dice = rollDice(d1, d2);
    const newPrng = { seed: prng.seed, rollIndex: rng.rollIndex };
    playSound('diceRoll');

    const newState: GameState = { ...gameState, dice, diceRolled: true, turnPhase: 'move' };
    save(newState, newPrng);
    const isAI = gameMode === 'vs-ai' && newState.currentPlayer === 1;
    set((s) => ({
      gameState: newState,
      prng: newPrng,
      rollHistory: [...s.rollHistory, [d1, d2]],
      aiDice: isAI ? dice : [],
      turnStartBoard: gameState.board.slice(),
      turnStartDice: dice.slice(),
      currentTurnMoves: [],
    }));

    if (!hasLegalMoves(newState.board, dice)) {
      setTimeout(() => {
        const state = get().gameState;
        const passed = forcedPass(state);
        save(passed, newPrng);
        set({ gameState: passed });
        if (gameMode === 'vs-ai' && passed.currentPlayer === 1) {
          setTimeout(() => get().rollDiceAction(), 400);
        }
      }, 600);
      return;
    }

    if (gameMode === 'vs-ai' && newState.currentPlayer === 1) {
      get().triggerAIMove();
    }
  },

  selectPoint: (point: number) => {
    const { gameState } = get();
    if (gameState.turnPhase !== 'move') return;
    if (gameState.currentPlayer !== 0) return; // only human player

    // 1. Clicking same point = deselect
    if (get().selectedPoint === point) {
      set({ selectedPoint: null, legalDestinations: [] });
      return;
    }

    // 2. Check if it's a legal destination first (priority: execute move)
    const { legalDestinations, selectedPoint } = get();
    const dest = legalDestinations.find((d) => d.to === point);
    if (dest && selectedPoint !== null) {
      get().makeSingleDieMove(selectedPoint, dest.to, dest.die);
      return;
    }

    // 3. Check if the clicked point has current player's checkers → select it
    const hasMyChecker =
      point === BAR ? gameState.board[BAR] > 0 : (point >= 0 && point <= 23 && gameState.board[point] > 0);

    if (!hasMyChecker) {
      set({ selectedPoint: null, legalDestinations: [] });
      return;
    }

    // Compute valid single-die destinations from this piece
    const destinations = getValidSingleMoves(gameState.board, gameState.dice, point);
    set({
      selectedPoint: point,
      legalDestinations: destinations,
    });
  },

  makeSingleDieMove: (from: number, to: number, die: number) => {
    const { gameState, prng } = get();
    // Clear hint when player makes a move
    if (get().showingHint) set({ hintMove: null, hintScore: null, showingHint: false });
    const dieMove = { from, to, die };
    const newBoard = applySingleDieMove(gameState.board, dieMove);

    // Push current state onto undo stack
    const undoEntry = { board: gameState.board.slice(), dice: gameState.dice.slice() };

    // Remove the used die from remaining dice
    const dieIdx = gameState.dice.indexOf(die);
    const newDice = [...gameState.dice.slice(0, dieIdx), ...gameState.dice.slice(dieIdx + 1)];

    // Sound for checker placement (hit or normal)
    const wasHit = gameState.board[to] === -1;
    playSound(wasHit ? 'checkerHit' : 'checkerPlace');

    // Check for win
    if (hasWonVariant(newBoard, gameState.variant ?? 'standard')) {
      const cubeValue = gameState.doublingCube.value;
      const newMatchScore: [number, number] = [...gameState.matchScore];
      newMatchScore[gameState.currentPlayer] += cubeValue;
      const winState: GameState = {
        ...gameState,
        board: newBoard,
        dice: [],
        turnPhase: 'game-over',
        winner: gameState.currentPlayer,
        matchScore: newMatchScore,
      };
      save(winState, prng);
      playSound(gameState.currentPlayer === 0 ? 'win' : 'loss');

      // Save game history for analysis
      const finalHistory = [...get().moveHistory];
      if (get().turnStartBoard && get().turnStartDice) {
        finalHistory.push({
          turnNumber: finalHistory.length,
          player: gameState.currentPlayer,
          dice: get().turnStartDice!,
          move: [...get().currentTurnMoves, dieMove],
          boardBefore: get().turnStartBoard!,
          boardAfter: newBoard.slice(),
        });
      }
      if (finalHistory.length > 0) {
        saveGameHistory({
          id: `bg-${Date.now()}`,
          gameType: 'backgammon',
          date: new Date().toISOString(),
          moves: finalHistory,
          result: gameState.currentPlayer === 0 ? 'win' : 'loss',
        });
      }

      set({ gameState: winState, selectedPoint: null, legalDestinations: [], turnUndoStack: [], turnComplete: false });
      return;
    }

    // Check if turn is complete (no dice left or no legal moves)
    const complete = newDice.length === 0 || !hasLegalMoves(newBoard, newDice);

    const contState: GameState = { ...gameState, board: newBoard, dice: newDice };
    save(contState, prng);
    set({
      gameState: contState,
      selectedPoint: null,
      legalDestinations: [],
      turnUndoStack: [...get().turnUndoStack, undoEntry],
      turnComplete: complete,
      currentTurnMoves: [...get().currentTurnMoves, dieMove],
    });
  },

  undoMove: () => {
    const { turnUndoStack, gameState, prng } = get();
    if (turnUndoStack.length === 0) return;
    playSound('undo');

    const prev = turnUndoStack[turnUndoStack.length - 1];
    const restoredState: GameState = { ...gameState, board: prev.board, dice: prev.dice };
    save(restoredState, prng);
    set({
      gameState: restoredState,
      selectedPoint: null,
      legalDestinations: [],
      turnUndoStack: turnUndoStack.slice(0, -1),
      turnComplete: false,
    });
  },

  endTurn: () => {
    const { gameState, prng, gameMode, turnStartBoard, turnStartDice, currentTurnMoves, moveHistory, tutorMode, tutorWarning, aiDifficulty } = get();

    // Tutor mode check: compare player's move to AI best before ending turn
    if (tutorMode && !tutorWarning && turnStartBoard && turnStartDice && currentTurnMoves.length > 0 && gameState.currentPlayer === 0) {
      const analysis = analyzeMove(
        turnStartBoard as import('../engine/types').Board,
        turnStartDice,
        currentTurnMoves,
        gameState.board,
        moveHistory.length,
        0,
        aiDifficulty,
      );
      if (analysis.error >= 15) {
        set({
          tutorWarning: {
            message: analysis.rating === 'blunder'
              ? 'That was a blunder! The AI found a much better move.'
              : analysis.rating === 'mistake'
                ? 'The AI found a better move here.'
                : 'There might be a slightly better move.',
            error: analysis.error,
            aiMove: analysis.aiMove,
          },
        });
        return; // Don't end turn yet — wait for user to confirm or undo
      }
    }

    playSound('turnEnd');

    // Record this turn in move history
    if (turnStartBoard && turnStartDice && currentTurnMoves.length > 0) {
      const record: MoveRecord = {
        turnNumber: moveHistory.length,
        player: gameState.currentPlayer,
        dice: turnStartDice,
        move: currentTurnMoves,
        boardBefore: turnStartBoard,
        boardAfter: gameState.board.slice(),
      };
      set({ moveHistory: [...moveHistory, record] });
    }

    // Advance to next player
    const endState = forcedPass(gameState);
    save(endState, prng);
    set({
      gameState: endState,
      selectedPoint: null,
      legalDestinations: [],
      turnUndoStack: [],
      turnComplete: false,
      currentTurnMoves: [],
    });

    if (endState.turnPhase === 'game-over') return;

    if (gameMode === 'vs-ai' && endState.currentPlayer === 1 && endState.turnPhase === 'roll') {
      setTimeout(() => get().rollDiceAction(), 500);
    }
  },

  makeMove: (move: Move) => {
    const { gameState, prng, gameMode } = get();
    const newState = applyMoveToState(gameState, move);
    save(newState, prng);
    set({ gameState: newState, selectedPoint: null, legalDestinations: [] });

    if (newState.turnPhase === 'game-over') return;

    if (gameMode === 'vs-ai' && newState.currentPlayer === 1 && newState.turnPhase === 'roll') {
      setTimeout(() => get().rollDiceAction(), 500);
    }
  },

  animateAIMove: (move: Move) => {
    const originalState = get().gameState;
    const { prng, moveHistory } = get();
    let board = originalState.board.slice();
    let step = 0;
    const highlights: number[] = [];

    const applyStep = () => {
      if (step >= move.length) {
        // All steps animated. Apply the full move properly to advance turn.
        const finalState = applyMoveToState(originalState, move);
        save(finalState, prng);

        // Record AI turn in move history
        const aiRecord: MoveRecord = {
          turnNumber: moveHistory.length,
          player: originalState.currentPlayer,
          dice: originalState.dice.slice(),
          move,
          boardBefore: originalState.board.slice(),
          boardAfter: finalState.board.slice(),
        };
        set({ gameState: finalState, isAIThinking: false, moveHistory: [...moveHistory, aiRecord] });

        // Keep highlights + dice visible so the player can study what the AI did
        setTimeout(() => {
          set({ aiHighlights: [], aiDice: [] });

          if (finalState.turnPhase === 'game-over') return;
          if (get().gameMode === 'vs-ai' && finalState.currentPlayer === 1 && finalState.turnPhase === 'roll') {
            setTimeout(() => get().rollDiceAction(), 500);
          }
        }, 2500);
        return;
      }

      const dm = move[step];
      board = applySingleDieMove(board, dm);

      // Convert AI's destination from player 1's perspective to display (player 0's) perspective
      let displayTo: number;
      if (dm.to === HOME) {
        displayTo = HOME;
      } else if (dm.to >= 0 && dm.to <= 23) {
        displayTo = 23 - dm.to;
      } else {
        displayTo = dm.to;
      }
      highlights.push(displayTo);

      set({
        gameState: { ...originalState, board: board.slice(), dice: [] },
        aiHighlights: [...highlights],
      });

      step++;
      setTimeout(applyStep, 1000);
    };

    // Pause before first move so the player can see the dice roll
    setTimeout(applyStep, 800);
  },

  offerDoubleAction: () => {
    const { gameState } = get();
    if (!canOfferDouble(gameState)) return;
    set({ gameState: offerDouble(gameState) });
  },

  acceptDoubleAction: () => {
    const { gameState, prng } = get();
    const newState = acceptDouble(gameState);
    save(newState, prng);
    set({ gameState: newState });
    // AI's turn to roll after accepting
    if (get().gameMode === 'vs-ai' && newState.currentPlayer === 1) {
      setTimeout(() => get().rollDiceAction(), 400);
    }
  },

  rejectDoubleAction: () => {
    const { gameState, prng } = get();
    const newState = rejectDouble(gameState);
    save(newState, prng);
    set({ gameState: newState });
  },

  setAnimationSpeed: (speed: number) => {
    set({ animationSpeed: Math.max(0.5, Math.min(3.0, speed)) });
  },

  clearSelection: () => {
    set({ selectedPoint: null, legalDestinations: [] });
  },

  setShowVerifyDialog: (show: boolean) => {
    set({ showVerifyDialog: show });
  },

  triggerAIMove: () => {
    const { gameState, aiDifficulty } = get();
    set({ isAIThinking: true, hintMove: null, hintScore: null, showingHint: false });

    const worker = getAIWorker();
    const request: AIRequest = { board: gameState.board, dice: gameState.dice, difficulty: aiDifficulty };

    worker.onmessage = (e: MessageEvent<AIResponse>) => {
      const { move, error } = e.data;
      if (error || !move) {
        set({ isAIThinking: false });
        const moves = getLegalMoves(get().gameState.board, get().gameState.dice);
        if (moves.length > 0) get().makeMove(moves[0].move);
        return;
      }
      // Animate the AI's move step by step so the player can see what happened
      get().animateAIMove(move);
    };

    worker.onerror = () => {
      set({ isAIThinking: false });
      const moves = getLegalMoves(get().gameState.board, get().gameState.dice);
      if (moves.length > 0) get().makeMove(moves[0].move);
    };

    worker.postMessage(request);
  },
}));
