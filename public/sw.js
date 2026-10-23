const CACHE = 'salt-partners-shell-v4';
const SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'config.js', 'privacy.html', 'terms.html', 'support.html', 'delete-account.html', 'fonts/bungee.woff2', 'fonts/opensans.woff2', 'logos/simplysalt.png'];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('salt-partners-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  // Never cache customer data, private artwork, account responses or admin pages.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.endsWith('/admin.html') || !SHELL.some(path => new URL(path, self.registration.scope).pathname === url.pathname)) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) { const clone = response.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, clone))); }
    return response;
  }).catch(() => caches.match(event.request)));
});
