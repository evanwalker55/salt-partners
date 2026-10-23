import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './helpers.mjs';
import { createSampleClient } from '../public/sample.mjs';
import { fetchWithTimeout, requestId } from '../public/client-utils.mjs';
import { syncCompletions } from '../server/api.mjs';

test('sample workspace isolates writes and resets between independent sessions', async () => {
  const a = createSampleClient(), b = createSampleClient();
  await a('profile', { name: 'Sample changed', payout: { method: 'venmo', handle: '@sample-only' } });
  const request = { requestId: 'sample-request', date: '2026-10-24', customerName: 'Sample booking' };
  await a('bookings', request); await a('bookings', request);
  assert.equal((await a('me')).referrals.length, 4);
  assert.equal((await b('me')).referrals.length, 3);
  assert.equal((await b('me')).profile.name, 'Sample Technician');
  await a('account', { confirm: 'DELETE' });
  assert.equal((await a('me')).profile, null);
  assert.ok((await b('me')).profile);
});

test('older browser fallback creates safe request IDs without randomUUID', () => {
  const values = new Set(Array.from({ length: 20 }, () => requestId({ getRandomValues: x => crypto.getRandomValues(x) })));
  assert.equal(values.size, 20);
  for (const value of values) assert.match(value, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
});

test('network timeout uses AbortController and cancels the request', async () => {
  let signal;
  await assert.rejects(fetchWithTimeout('https://unused.test', {}, 5, (_, options) => {
    signal = options.signal;
    return new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Stopped', 'AbortError'))));
  }), { name: 'AbortError' });
  assert.equal(signal.aborted, true);
});

test('deployment pause prevents both availability transmission and booking claims', async () => {
  const f = await fixture({ PARTNER_BOOKING_ENABLED: 'false' }), cookie = await f.signin(); await f.register(cookie);
  await f.repo.change(s => { s.launch.bookingEnabled = true; });
  const result = await f.call('availability', { address: '100 Sample Street, Carmel', customerName: 'Sample', zip: '46032', customerConsent: true }, cookie);
  assert.equal(result.response.status, 503); assert.equal(f.calls.availability, 0);
  const body = { customerName: 'Sample', customerPhone: '3175550102', street: '100 Sample Street', city: 'Carmel', zip: '46032', waterType: 'city', customerConsent: true, requestId: 'sample-booking-reference' };
  assert.equal((await f.call('bookings', body, cookie)).response.status, 503);
  assert.equal((await f.repo.read()).referrals.length, 0);
});

test('customer consent is required before availability is sent to a provider', async () => {
  const f = await fixture(), cookie = await f.signin(); await f.register(cookie);
  await f.repo.change(s => { s.launch.bookingEnabled = true; });
  assert.equal((await f.call('availability', { address: '100 Sample Street, Carmel', customerName: 'Sample', zip: '46032' }, cookie)).response.status, 400);
  assert.equal(f.calls.availability, 0);
});

test('technicians can remove payout identifiers with recent verification', async () => {
  const f = await fixture(), cookie = await f.signin(); await f.register(cookie);
  await f.call('profile', { name: 'Sample Technician', payout: { method: 'venmo', handle: '@sample-tech' } }, cookie);
  f.advance(11 * 60000);
  assert.equal((await f.call('profile', { name: 'Sample Technician', removePayout: true }, cookie)).response.status, 403);
  assert.equal((await f.call('profile', { name: 'Updated Name' }, cookie)).response.status, 200);
  const fresh = await f.signin();
  assert.equal((await f.call('profile', { name: 'Sample Technician', removePayout: true }, fresh)).response.status, 200);
  assert.equal((await f.call('me', undefined, fresh)).data.profile.payout, null);
});

test('deletion removes closed customer details and later erases outstanding shipment addresses', async () => {
  const f = await fixture(), cookie = await f.signin(), owner = await f.owner(); const tech = await f.register(cookie);
  await f.repo.change(s => {
    s.referrals.push({ id: 'closed', techId: tech.id, status: 'paid', customerName: 'Sample Customer', customerPhone: '+13175550103', street: 'Sample Street', notes: 'Private access details', paidTo: { handle: '@sample-tech' } });
    s.orders.push({ id: 'shipment', techId: tech.id, status: 'processing', shipping: { street: 'Sample Street' }, history: [] });
  });
  assert.equal((await f.call('account', { confirm: 'DELETE' }, cookie, 'DELETE')).response.status, 200);
  let state = await f.repo.read();
  assert.equal(state.referrals[0].customerPhone, undefined); assert.equal(state.referrals[0].paidTo, undefined);
  assert.equal(state.referrals[0].notes, undefined); assert.ok(state.orders[0].shipping);
  await f.call('owner/order', { id: 'shipment', status: 'fulfilled', previousStatus: 'processing', tracking: 'Sample delivery note' }, owner);
  state = await f.repo.read(); assert.equal(state.orders[0].shipping, null); assert.equal(state.orders[0].tracking, '');
  assert.equal(state.orders[0].history[0].tracking, undefined);
});

test('deleted-account retained payout data is erased when an outstanding delivery cancels', async () => {
  const f = await fixture(), cookie = await f.signin(); const tech = await f.register(cookie);
  await f.call('profile', { name: tech.name, payout: { method: 'venmo', handle: '@sample-tech' } }, cookie);
  await f.call('bookings', await f.booking(cookie), cookie);
  await f.call('account', { confirm: 'DELETE' }, cookie, 'DELETE');
  assert.ok((await f.repo.read()).deletionRequests[0].payout);
  f.providers.getJob = async () => ({ work_status: 'cancelled', canceled_at: '2026-10-24' });
  await syncCompletions({ repo: f.repo, providers: f.providers, now: f.now });
  const state = await f.repo.read(); assert.equal(state.deletionRequests[0].payout, null);
  assert.equal(state.referrals[0].customerPhone, undefined);
});

test('normal multiline driver instructions are accepted without losing booking attribution', async () => {
  const f = await fixture(), cookie = await f.signin(); await f.register(cookie);
  const result = await f.call('bookings', await f.booking(cookie, { notes: 'Softener in basement\nUse side door' }), cookie);
  assert.equal(result.response.status, 200);
  const saved = (await f.repo.read()).referrals[0];
  assert.equal(saved.notes, 'Softener in basement Use side door'); assert.equal(saved.companyId, 'prime');
});

test('simultaneous artwork approvals keep distinct increasing design versions', async () => {
  const f = await fixture(), owner = await f.owner();
  const bytes = Buffer.alloc(40); Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes);
  const artwork = { companyId: 'prime', name: 'Sample print artwork', approved: true, base64: bytes.toString('base64') };
  const results = await Promise.all([f.call('owner/design', artwork, owner), f.call('owner/design', artwork, owner)]);
  assert.deepEqual(results.map(r => r.data.design.version).sort(), [1, 2]);
  assert.notEqual(results[0].data.design.id, results[1].data.design.id);
});
