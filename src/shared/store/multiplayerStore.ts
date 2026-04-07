/**
 * Multiplayer store — manages online game state, real-time sync, and game list.
 */

import { create } from 'zustand';
import type { Game, Profile } from '../lib/database.types';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  createOnlineGame, joinGameByCode, fetchPlayerGames, fetchGame,
  fetchOpponentProfile, updateGameState, recordMove, resignGame,
  subscribeToGame, unsubscribeFromGame, updatePlayerStats,
} from '../lib/gameService';

interface MultiplayerStore {
  // Game list
  games: Game[];
  loadingGames: boolean;

  // Active online game
  activeGame: Game | null;
  opponent: Profile | null;
  subscription: RealtimeChannel | null;
  myPlayerIndex: 0 | 1 | null; // am I white (0) or black (1)?

  // Actions
  loadGames: (playerId: string) => Promise<void>;
  createGame: (playerId: string, matchLength: number, cubeEnabled: boolean) => Promise<{ inviteCode?: string; error?: string }>;
  joinGame: (playerId: string, inviteCode: string) => Promise<{ error?: string }>;
  openGame: (gameId: string, myId: string) => Promise<void>;
  closeGame: () => void;
  syncMove: (
    gameId: string,
    playerId: string,
    moveNumber: number,
    dice: number[],
    dieMoves: { from: number; to: number; die: number }[],
    boardAfter: number[],
    gameUpdate: Parameters<typeof updateGameState>[1]
  ) => Promise<void>;
  resign: (gameId: string, myId: string, opponentId: string) => Promise<void>;
}

export const useMultiplayerStore = create<MultiplayerStore>((set, get) => ({
  games: [],
  loadingGames: false,
  activeGame: null,
  opponent: null,
  subscription: null,
  myPlayerIndex: null,

  loadGames: async (playerId) => {
    set({ loadingGames: true });
    const games = await fetchPlayerGames(playerId);
    set({ games, loadingGames: false });
  },

  createGame: async (playerId, matchLength, cubeEnabled) => {
    const { game, error } = await createOnlineGame(playerId, matchLength, cubeEnabled);
    if (error || !game) return { error: error || 'Failed to create game' };
    // Refresh game list
    await get().loadGames(playerId);
    return { inviteCode: game.invite_code || undefined };
  },

  joinGame: async (playerId, inviteCode) => {
    const { game, error } = await joinGameByCode(playerId, inviteCode);
    if (error || !game) return { error: error || 'Failed to join game' };
    await get().loadGames(playerId);
    return {};
  },

  openGame: async (gameId, myId) => {
    // Close existing subscription
    const { subscription: oldSub } = get();
    if (oldSub) unsubscribeFromGame(oldSub);

    const game = await fetchGame(gameId);
    if (!game) return;

    const myIndex = game.player_white === myId ? 0 : 1;
    const opp = await fetchOpponentProfile(game, myId);

    // Subscribe to real-time updates
    const channel = subscribeToGame(gameId, (updatedGame) => {
      set({ activeGame: updatedGame });
    });

    set({
      activeGame: game,
      opponent: opp,
      subscription: channel,
      myPlayerIndex: myIndex as 0 | 1,
    });
  },

  closeGame: () => {
    const { subscription } = get();
    if (subscription) unsubscribeFromGame(subscription);
    set({ activeGame: null, opponent: null, subscription: null, myPlayerIndex: null });
  },

  syncMove: async (gameId, playerId, moveNumber, dice, dieMoves, boardAfter, gameUpdate) => {
    await Promise.all([
      updateGameState(gameId, gameUpdate),
      recordMove(gameId, playerId, moveNumber, dice, dieMoves, boardAfter),
    ]);
  },

  resign: async (gameId, myId, opponentId) => {
    await resignGame(gameId, myId, opponentId);
    await Promise.all([
      updatePlayerStats(myId, false),
      updatePlayerStats(opponentId, true),
    ]);
    await get().loadGames(myId);
  },
}));
