/**
 * Web Push Notifications via VAPID.
 * Notifies players when it's their turn in an async multiplayer game.
 */

import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

/** Check if push notifications are supported and permitted */
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && !!VAPID_PUBLIC_KEY;
}

/** Request permission and subscribe to push notifications */
export async function subscribeToPush(userId: string): Promise<{ error?: string }> {
  if (!isPushSupported()) return { error: 'Push notifications not supported' };

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return { error: 'Permission denied' };

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    });

    // Save subscription to user's profile
    const { error } = await supabase
      .from('profiles')
      .update({ push_subscription: JSON.stringify(subscription) })
      .eq('id', userId);

    if (error) return { error: error.message };
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to subscribe' };
  }
}

/** Unsubscribe from push notifications */
export async function unsubscribeFromPush(userId: string): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe();

    await supabase
      .from('profiles')
      .update({ push_subscription: null })
      .eq('id', userId);
  } catch {
    // Silent fail
  }
}

/** Check if user is subscribed to push */
export async function isPushSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}

/** Convert VAPID key from base64 to Uint8Array */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
