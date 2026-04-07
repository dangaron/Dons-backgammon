/**
 * In-game chat via Supabase Realtime Broadcast.
 * Ephemeral — messages are not persisted to database.
 */

import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: number;
}

export const QUICK_REPLIES = [
  'Good game!',
  'Nice move!',
  'Good luck!',
  'Well played!',
  'Oops!',
  'Thanks!',
] as const;

let chatChannel: RealtimeChannel | null = null;

export function subscribeToChatMessages(
  gameId: string,
  onMessage: (msg: ChatMessage) => void,
): RealtimeChannel {
  // Clean up any existing subscription
  if (chatChannel) {
    supabase.removeChannel(chatChannel);
  }

  chatChannel = supabase
    .channel(`chat-${gameId}`)
    .on('broadcast', { event: 'chat' }, (payload) => {
      onMessage(payload.payload as ChatMessage);
    })
    .subscribe();

  return chatChannel;
}

export function sendChatMessage(
  gameId: string,
  userId: string,
  username: string,
  text: string,
) {
  const msg: ChatMessage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    userId,
    username,
    text,
    timestamp: Date.now(),
  };

  supabase
    .channel(`chat-${gameId}`)
    .send({ type: 'broadcast', event: 'chat', payload: msg });
}

export function unsubscribeFromChat() {
  if (chatChannel) {
    supabase.removeChannel(chatChannel);
    chatChannel = null;
  }
}
