/**
 * Tournament service. CRUD operations via Supabase.
 */

import { supabase } from './supabase';

export interface Tournament {
  id: string;
  name: string;
  type: 'sit-and-go' | 'scheduled';
  status: 'registering' | 'active' | 'completed';
  game_type: string;
  max_players: number;
  match_length: number;
  bracket: unknown;
  starts_at: string | null;
  created_by: string;
  created_at: string;
  participant_count?: number;
}

export async function createTournament(config: {
  name: string;
  type: 'sit-and-go' | 'scheduled';
  gameType: string;
  maxPlayers: number;
  matchLength: number;
  startsAt?: string;
  createdBy: string;
}): Promise<{ tournament?: Tournament; error?: string }> {
  const { data, error } = await supabase
    .from('tournaments')
    .insert({
      name: config.name,
      type: config.type,
      game_type: config.gameType,
      max_players: config.maxPlayers,
      match_length: config.matchLength,
      starts_at: config.startsAt ?? null,
      created_by: config.createdBy,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { tournament: data };
}

export async function joinTournament(
  tournamentId: string,
  playerId: string,
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('tournament_participants')
    .insert({ tournament_id: tournamentId, player_id: playerId });
  if (error) return { error: error.message };
  return {};
}

export async function leaveTournament(
  tournamentId: string,
  playerId: string,
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('tournament_participants')
    .delete()
    .eq('tournament_id', tournamentId)
    .eq('player_id', playerId);
  if (error) return { error: error.message };
  return {};
}

export async function fetchTournaments(
  gameType?: string,
  status?: string,
): Promise<Tournament[]> {
  let query = supabase.from('tournaments').select('*').order('created_at', { ascending: false });
  if (gameType) query = query.eq('game_type', gameType);
  if (status) query = query.eq('status', status);
  const { data } = await query;
  return data ?? [];
}

export async function fetchTournament(id: string): Promise<Tournament | null> {
  const { data } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single();
  return data;
}

export function subscribeTournament(id: string, onUpdate: (t: Tournament) => void) {
  return supabase
    .channel(`tournament-${id}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'tournaments',
      filter: `id=eq.${id}`,
    }, (payload) => {
      onUpdate(payload.new as Tournament);
    })
    .subscribe();
}
