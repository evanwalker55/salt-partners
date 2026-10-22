import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { Repository, initialState, hash } from '../server/state.mjs';
import { createHandler } from '../server/api.mjs';
import { MemoryStore } from '../tests/helpers.mjs';

// Loopback-only sandbox. It never loads provider credentials or calls live services.
const store = new MemoryStore(), repo = new Repository(store), state = initialState();
state.launch = { bookingEnabled: true, legacyReconciled: true };
state.companies.find(c => c.id === 'prime').design = { id: '00000000-0000-4000-8000-000000000001', name: 'Preview company artwork', version: 1, approvedAt: new Date().toISOString() };
await store.setJSON('state', state);
let jobCount = 0;
const providers = {
  verificationReady: () => true,
  async startVerification() {},
  async checkVerification(number, code) { return code === '123456'; },
  async availability() { return { options: [
    { date: '2026-10-24', date_readable: 'Saturday, October 24', ideal: true, route_note: 'Your customer’s route day', best: { scheduled_time: '09:00', window: '9:00–10:00 AM', note: 'Near another stop' }, before_route: { scheduled_time: '08:00', window: '8:00–9:00 AM' }, after_route: { scheduled_time: '15:00', window: '3:00–4:00 PM' } },
    { date: '2026-10-31', date_readable: 'Saturday, October 31', ideal: false, open_day: true, best: { scheduled_time: '09:00', window: '9:00–10:00 AM' } }
  ] }; },
  async createBooking() { return { id: 'preview-job-' + ++jobCount, customer_id: 'preview-customer' }; },
  async getJob(id) { return { id, work_status: 'complete unrated' }; }
};
const assets = { async put() {}, async response() { return new Response(await readFile('public/logos/prime.png'), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' } }); } };
const handler = createHandler({ repo, providers, assets, env: { PARTNER_OWNER_PASSWORD_HASH: hash('preview-owner') }, preview: true });
const root = resolve('dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost:4391');
    if (url.pathname.startsWith('/api/partners/')) {
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      const request = new Request(url, { method: req.method, headers: req.headers, ...(!['GET', 'HEAD'].includes(req.method) ? { body: Buffer.concat(chunks) } : {}) });
      const response = await handler(request);
      res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer())); return;
    }
    const path = resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!path.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
    const file = await readFile(path);
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(file);
  } catch { if (!res.headersSent) res.writeHead(404); res.end('Not found'); }
}).listen(4391, '127.0.0.1', () => console.log('Local preview: http://localhost:4391 · code 123456 · owner password preview-owner · no live services'));
