import { supabase } from './supabase';

export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export const isIos = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
export const isStandalone = () =>
  typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true);

const b64 = (s: string) => {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

/** Call only from a button tap. Never on first load. */
export async function enablePush(userId: string): Promise<'ok' | 'denied' | 'unsupported' | 'error'> {
  if (!pushSupported()) return 'unsupported';
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return 'denied';
    const { key } = await (await fetch('/api/push/key')).json();
    if (!key) return 'error';
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) }));
    const j = sub.toJSON();
    const { error } = await supabase().from('push_subscriptions')
      .upsert({ user_id: userId, endpoint: sub.endpoint, keys: j.keys }, { onConflict: 'endpoint' });
    return error ? 'error' : 'ok';
  } catch { return 'error'; }
}

export async function disablePush() {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) { await supabase().from('push_subscriptions').delete().eq('endpoint', sub.endpoint); await sub.unsubscribe(); }
}
export async function pushEnabled() {
  if (!pushSupported() || Notification.permission !== 'granted') return false;
  const reg = await navigator.serviceWorker.ready;
  return Boolean(await reg.pushManager.getSubscription());
}
