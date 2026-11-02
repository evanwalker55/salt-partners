import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { webcrypto } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

async function compileNativeClient() {
  const mocks = {
    '@capacitor/core': 'export const Capacitor={isNativePlatform:()=>true}; export const CapacitorHttp={};',
    '@capacitor/app': 'export const App={addListener(name,callback){globalThis.nativeEvents.push(name);globalThis.nativeListeners?.set(name,callback);return Promise.resolve({remove(){}})},minimizeApp:()=>Promise.resolve()};',
    '@capacitor/share': 'export const Share={share:()=>Promise.resolve()};',
    '@capacitor/haptics': 'export const Haptics={notification:()=>Promise.resolve()}; export const NotificationType={Success:"SUCCESS"};',
  };
  const compiled = await build({
    entryPoints: [fileURLToPath(new URL('../public/app.js', import.meta.url))],
    bundle: true, write: false, format: 'iife', platform: 'browser',
    plugins: [{ name: 'native-plugin-test-doubles', setup(builder) {
      builder.onResolve({ filter: /^@capacitor\// }, ({ path }) => ({ path, namespace: 'native-test' }));
      builder.onLoad({ filter: /.*/, namespace: 'native-test' }, ({ path }) => ({ contents: mocks[path], loader: 'js' }));
    } }],
  });
  return compiled.outputFiles[0].text;
}

test('native startup without owner-only markup registers navigation and begins loading the API', async () => {
  const markup = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  // Exercise the native DOM variant without requiring generated, untracked build output.
  const nodes = new Map([...markup.matchAll(/\bid="([^"]+)"/g)]
    .filter(([, id]) => id !== 'owner-link').map(([, id]) => [id, { hidden: false }]));
  const requested = [], nativeEvents = [], storage = new Map();
  runInNewContext(await compileNativeClient(), {
    document: { getElementById: id => nodes.get(id) || null, querySelectorAll: () => [] },
    window: { SALT_CONFIG: { apiOrigin: 'https://partners.example' }, addEventListener() {} },
    navigator: { onLine: true },
    location: { search: '', pathname: '/', origin: 'https://localhost' },
    sessionStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    crypto: webcrypto, URLSearchParams, URL, AbortController,
    setTimeout: () => 1, clearTimeout() {}, nativeEvents,
    fetch: url => { requested.push(url); return new Promise(() => {}); },
  });
  assert.deepEqual(nativeEvents, ['backButton', 'appStateChange']);
  assert.deepEqual(requested, ['https://partners.example/api/partners/config']);
});

test('native resume clears private fields and requests sign-in when the server revokes the session', async () => {
  const markup = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const node = (tagName = 'DIV') => ({
    tagName, hidden: true, textContent: '', value: '', children: [],
    classList: { toggle() {} }, setAttribute() {}, removeAttribute() {}, focus() {},
    append(...children) { this.children.push(...children); },
    replaceChildren(...children) { this.children = children; },
    reset() {},
  });
  const nodes = new Map([...markup.matchAll(/<([a-z][a-z0-9]*)\b[^>]*\bid="([^"]+)"/g)]
    .filter(([, , id]) => id !== 'owner-link').map(([, tag, id]) => [id, { ...node(tag.toUpperCase()), id }]));
  nodes.get('main').children = [...nodes.values()].filter(n => n.tagName === 'SECTION');
  for (const form of nodes.values()) if (form.tagName === 'FORM') form.reset = () => {
    // Model the profile inputs reset by the real settings form.
    if (form === nodes.get('settings-form')) for (const id of ['edit-name', 'payout-handle']) nodes.get(id).value = '';
  };
  const company = { id: 'prime', name: 'Prime Plumbing', kind: 'Plumbing', active: true, bountyCents: 2500 };
  const profile = { name: 'Session Test', phone: '+13175550199', companyId: 'prime', company, membership: 'active', payout: { method: 'venmo', handle: '@session-test-only' } };
  const nativeEvents = [], nativeListeners = new Map(), storage = new Map();
  let revoked = false;
  runInNewContext(await compileNativeClient(), {
    document: { getElementById: id => nodes.get(id) || null, querySelectorAll: () => [], createElement: tag => node(tag.toUpperCase()) },
    window: { SALT_CONFIG: { apiOrigin: 'https://partners.example' }, addEventListener() {}, scrollTo() {} },
    navigator: { onLine: true }, location: { search: '', pathname: '/', origin: 'https://localhost' },
    sessionStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    crypto: webcrypto, URLSearchParams, URL, AbortController, Intl,
    setTimeout: () => 1, clearTimeout() {}, nativeEvents, nativeListeners,
    fetch: async url => {
      if (url.endsWith('/config')) return { ok: true, json: async () => ({ companies: [company], verificationReady: true }) };
      assert.ok(url.endsWith('/me'));
      return revoked ? { ok: false, status: 401, json: async () => ({ error: 'Please sign in again.' }) }
        : { ok: true, json: async () => ({ profile, referrals: [], orders: [], totals: { pending: 0, earned: 0, paid: 0 }, historyReady: true, bookingEnabled: false }) };
    },
  });
  await new Promise(setImmediate);
  assert.equal(nodes.get('home').hidden, false);
  assert.equal(nodes.get('payout-handle').value, '@session-test-only');
  revoked = true;
  nativeListeners.get('appStateChange')({ isActive: true });
  await new Promise(setImmediate);
  assert.equal(nodes.get('welcome').hidden, false);
  assert.equal(nodes.get('account').hidden, true);
  assert.equal(nodes.get('home').hidden, true);
  assert.equal(nodes.get('tabs').hidden, true);
  assert.equal(nodes.get('edit-name').value, '');
  assert.equal(nodes.get('payout-handle').value, '');
  assert.equal(nodes.get('verified-phone').textContent, '');
  assert.match(nodes.get('auth-status').textContent, /session expired/i);
});
