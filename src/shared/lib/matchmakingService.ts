/**
 * Matchmaking queue service. Players join a queue, server matches them.
 * Uses Supabase table + realtime subscriptions.
 */

import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface QueueEntry {
  id: string;
  player_id: string;
  rating: number;
  match_length: number;
  game_type: string;
  joined_at: string;
  status: 'waiting' | 'matched';
}

let queueChannel: RealtimeChannel | null = null;

export async function joinMatchmakingQueue(
  userId: string,
  rating: number,
  matchLength: number,
  gameType: string = 'backgammon',
): Promise<{ error?: string }> {
  // Remove any existing entry first
  await supabase
    .from('matchmaking_queue')
    .delete()
    .eq('player_id', userId);

  const { error } = await supabase
    .from('matchmaking_queue')
    .insert({
      player_id: userId,
      rating,
      match_length: matchLength,
      game_type: gameType,
    });

  if (error) return { error: error.message };
  return {};
}

export async function leaveMatchmakingQueue(userId: string): Promise<void> {
  await supabase
    .from('matchmaking_queue')
    .delete()
    .eq('player_id', userId);

  if (queueChannel) {
    supabase.removeChannel(queueChannel);
    queueChannel = null;
  }
}

export function subscribeToMatchmaking(
  userId: string,
  onMatch: (gameId: string) => void,
): RealtimeChannel {
  if (queueChannel) supabase.removeChannel(queueChannel);

  queueChannel = supabase
    .channel(`matchmaking-${userId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'matchmaking_queue',
      filter: `player_id=eq.${userId}`,
    }, (payload) => {
      const entry = payload.new as QueueEntry & { matched_game_id?: string };
      if (entry.status === 'matched' && entry.matched_game_id) {
        onMatch(entry.matched_game_id);
      }
    })
    .subscribe();

  return queueChannel;
}

export async function fetchQueueStatus(userId: string): Promise<QueueEntry | null> {
  const { data } = await supabase
    .from('matchmaking_queue')
    .select('*')
    .eq('player_id', userId)
    .single();
  return data;
}
