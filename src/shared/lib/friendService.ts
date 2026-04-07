/**
 * Friends system service. Supabase-backed friend requests with bidirectional relationships.
 */

import { supabase } from './supabase';

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  // Joined profile data
  requester?: { username: string; display_name: string | null; avatar_url: string | null };
  addressee?: { username: string; display_name: string | null; avatar_url: string | null };
}

export async function sendFriendRequest(fromId: string, toId: string): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('friendships')
    .insert({ requester_id: fromId, addressee_id: toId });
  if (error) return { error: error.message };
  return {};
}

export async function acceptFriendRequest(requestId: string): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', requestId);
  if (error) return { error: error.message };
  return {};
}

export async function declineFriendRequest(requestId: string): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'declined' })
    .eq('id', requestId);
  if (error) return { error: error.message };
  return {};
}

export async function removeFriend(userId: string, friendId: string): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .or(`and(requester_id.eq.${userId},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${userId})`);
  if (error) return { error: error.message };
  return {};
}

export async function fetchFriends(userId: string): Promise<Friendship[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select('*')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data;
}

export async function fetchPendingRequests(userId: string): Promise<Friendship[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select('*')
    .eq('addressee_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data;
}

export function subscribeFriendRequests(userId: string, onUpdate: () => void) {
  return supabase
    .channel(`friend-requests-${userId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'friendships',
      filter: `addressee_id=eq.${userId}`,
    }, onUpdate)
    .subscribe();
}
