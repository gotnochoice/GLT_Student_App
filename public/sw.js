// Small service worker: caches the app shell so it opens on weak data, and shows push notifications.
const CACHE = 'glt-v1';
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/offline.html', '/icon.svg'])).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return; // data calls go straight to the network
  if (url.pathname.startsWith('/_next/static/') || url.pathname.match(/\.(png|svg|webmanifest|ico)$/)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => { const c = r.clone(); caches.open(CACHE).then((x) => x.put(req, c)); return r; })));
    return;
  }
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => { const c = r.clone(); caches.open(CACHE).then((x) => x.put(req, c)); return r; })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('/offline.html'))));
  }
});
self.addEventListener('push', (e) => {
  let d = {}; try { d = e.data.json(); } catch { d = { title: 'GLT Academic Unit', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'GLT Academic Unit', { body: d.body, icon: '/icon-192.png', badge: '/icon-192.png', data: { url: d.url || '/' } }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
    for (const c of cs) if ('focus' in c) { c.navigate(url); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
