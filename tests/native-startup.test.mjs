import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { webcrypto } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

test('native startup without owner-only markup registers navigation and begins loading the API', async () => {
  const markup = await readFile(new URL('../android/app/src/main/assets/public/index.html', import.meta.url), 'utf8');
  const nodes = new Map([...markup.matchAll(/\bid="([^"]+)"/g)].map(([, id]) => [id, { hidden: false }]));
  assert.equal(nodes.has('owner-link'), false, 'the packaged mobile page excludes owner access');
  const mocks = {
    '@capacitor/core': 'export const Capacitor={isNativePlatform:()=>true}; export const CapacitorHttp={};',
    '@capacitor/app': 'export const App={addListener(name){globalThis.nativeEvents.push(name);return Promise.resolve({remove(){}})},minimizeApp:()=>Promise.resolve()};',
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
  const requested = [], nativeEvents = [], storage = new Map();
  runInNewContext(compiled.outputFiles[0].text, {
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
