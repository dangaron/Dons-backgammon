/**
 * Leaderboard service. Queries Supabase profiles for rankings.
 */

import { supabase } from './supabase';

export type LeaderboardPeriod = 'weekly' | 'monthly' | 'all-time';

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  elo_rating: number;
  games_won: number;
  games_played: number;
}

export async function fetchGlobalLeaderboard(
  limit: number = 50,
): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, elo_rating, games_won, games_played')
    .gt('games_played', 0)
    .order('elo_rating', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row, i) => ({
    rank: i + 1,
    user_id: row.id,
    username: row.username,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    elo_rating: row.elo_rating ?? 1500,
    games_won: row.games_won,
    games_played: row.games_played,
  }));
}

export async function fetchFriendsLeaderboard(
  userId: string,
  friendIds: string[],
  limit: number = 50,
): Promise<LeaderboardEntry[]> {
  const allIds = [userId, ...friendIds];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, elo_rating, games_won, games_played')
    .in('id', allIds)
    .order('elo_rating', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row, i) => ({
    rank: i + 1,
    user_id: row.id,
    username: row.username,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    elo_rating: row.elo_rating ?? 1500,
    games_won: row.games_won,
    games_played: row.games_played,
  }));
}
