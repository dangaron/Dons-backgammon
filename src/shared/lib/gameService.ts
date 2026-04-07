/**
 * Multiplayer game service — CRUD + real-time for online games.
 */

import { supabase } from './supabase';
import type { Game } from './database.types';
import { INITIAL_BOARD } from '../../games/backgammon/engine/board';
import { generateSeed } from '../../prng/mulberry32';
import type { RealtimeChannel } from '@supabase/supabase-js';

/** Generate a short invite code */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusing chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Create a new multiplayer game, waiting for opponent */
export async function createOnlineGame(
  playerId: string,
  matchLength: number,
  cubeEnabled: boolean
): Promise<{ game?: Game; error?: string }> {
  const { data, error } = await supabase
    .from('games')
    .insert({
      player_white: playerId,
      board: INITIAL_BOARD,
      match_length: matchLength,
      cube_enabled: cubeEnabled,
      seed: generateSeed(),
      invite_code: generateInviteCode(),
      status: 'waiting',
      turn_phase: 'opening-roll',
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { game: data as Game };
}

/** Join an existing game by invite code */
export async function joinGameByCode(
  playerId: string,
  inviteCode: string
): Promise<{ game?: Game; error?: string }> {
  // Find the game
  const { data: game, error: findError } = await supabase
    .from('games')
    .select('*')
    .eq('invite_code', inviteCode.toUpperCase())
    .eq('status', 'waiting')
    .single();

  if (findError || !game) return { error: 'Game not found or already started' };
  if (game.player_white === playerId) return { error: 'Cannot join your own game' };

  // Join as black
  const { data, error } = await supabase
    .from('games')
    .update({
      player_black: playerId,
      status: 'active',
    })
    .eq('id', game.id)
    .eq('status', 'waiting')
    .select()
    .single();

  if (error) return { error: error.message };
  return { game: data as Game };
}

/** Fetch all games for a player (active + recent completed) */
export async function fetchPlayerGames(playerId: string): Promise<Game[]> {
  const { data } = await supabase
    .from('games')
    .select('*')
    .or(`player_white.eq.${playerId},player_black.eq.${playerId}`)
    .order('updated_at', { ascending: false })
    .limit(50);

  return (data as Game[]) || [];
}

/** Fetch a single game by ID */
export async function fetchGame(gameId: string): Promise<Game | null> {
  const { data } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single();

  return data as Game | null;
}

/** Fetch opponent profile for a game */
export async function fetchOpponentProfile(game: Game, myId: string) {
  const oppId = game.player_white === myId ? game.player_black : game.player_white;
  if (!oppId) return null;

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', oppId)
    .single();

  return data;
}

/** Update game state after a move */
export async function updateGameState(
  gameId: string,
  updates: {
    board: number[];
    dice: number[];
    dice_rolled: boolean;
    current_player: 0 | 1;
    turn_phase: string;
    roll_index: number;
    move_count: number;
    borne_off: [number, number];
    match_score?: [number, number];
    winner?: string | null;
    status?: 'active' | 'completed';
    doubling_cube_value?: number;
    doubling_cube_owner?: number | null;
  }
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('games')
    .update({
      ...updates,
      last_move_at: new Date().toISOString(),
    })
    .eq('id', gameId);

  if (error) return { error: error.message };
  return {};
}

/** Record a move in the audit trail */
export async function recordMove(
  gameId: string,
  playerId: string,
  moveNumber: number,
  dice: number[],
  dieMoves: { from: number; to: number; die: number }[],
  boardAfter: number[]
): Promise<void> {
  await supabase.from('game_moves').insert({
    game_id: gameId,
    player_id: playerId,
    move_number: moveNumber,
    dice,
    die_moves: dieMoves,
    board_after: boardAfter,
  });
}

/** Resign from a game */
export async function resignGame(
  gameId: string,
  _resigningPlayerId: string,
  winnerPlayerId: string
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('games')
    .update({
      status: 'completed',
      turn_phase: 'game-over',
      winner: winnerPlayerId,
    })
    .eq('id', gameId);

  if (error) return { error: error.message };
  return {};
}

/** Subscribe to real-time game updates */
export function subscribeToGame(
  gameId: string,
  onUpdate: (game: Game) => void
): RealtimeChannel {
  return supabase
    .channel(`game:${gameId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${gameId}`,
      },
      (payload) => {
        onUpdate(payload.new as Game);
      }
    )
    .subscribe();
}

/** Unsubscribe from game updates */
export function unsubscribeFromGame(channel: RealtimeChannel): void {
  supabase.removeChannel(channel);
}

/** Update player stats after a game ends */
export async function updatePlayerStats(
  playerId: string,
  won: boolean
): Promise<void> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('games_played, games_won')
    .eq('id', playerId)
    .single();

  if (profile) {
    await supabase
      .from('profiles')
      .update({
        games_played: profile.games_played + 1,
        games_won: profile.games_won + (won ? 1 : 0),
      })
      .eq('id', playerId);
  }
}
