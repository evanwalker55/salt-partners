import test from 'node:test';
import assert from 'node:assert/strict';
import { createProviders } from '../server/providers.mjs';
import { fixture } from './helpers.mjs';
import { syncCompletions } from '../server/api.mjs';

const referral = { id: 'ref-1', companyId: 'prime', techId: 'tech-1', techName: 'Taylor', companyName: 'Prime Plumbing', source: 'technician_app', customerName: 'Alex Example', customerPhone: '+13175551234', street: '10 Main St', city: 'Carmel', zip: '46032', email: '', waterType: 'city', notes: '', scheduledDate: '2026-11-07', scheduledTime: '09:00' };
const env = { HCP_API_KEY: 'fake-test-key', PARTNER_BOOKING_ENABLED: 'true' };

test('existing exact phone/address match reuses HCP customer and writes trusted attribution on the job', async () => {
  const calls = [];
  const p = createProviders(env, async (url, options) => {
    calls.push({ url, method: options.method, body: options.body && JSON.parse(options.body) });
    if (url.includes('/customers?')) return Response.json({ customers: [{ id: 'existing-customer', mobile_number: '3175551234', addresses: [{ id: 'existing-address', street: '10 Main St', city: 'Carmel', zip: '46032' }] }], total_pages: 1 });
    return Response.json({ id: 'created-job' });
  });
  assert.equal((await p.createBooking(referral)).id, 'created-job');
  assert.equal(calls.filter(c => c.method === 'POST').length, 1);
  const job = calls.find(c => c.url.endsWith('/jobs')).body;
  assert.equal(job.customer_id, 'existing-customer'); assert.equal(job.address_id, 'existing-address');
  assert.match(job.notes, /Ref: ref-1.*Company ID: prime.*Technician ID: tech-1.*Source: technician_app/);
  assert.equal(job.schedule.scheduled_start, '2026-11-07T14:00:00.000Z');
});
test('new customer is created once before its HCP job', async () => {
  const calls = [];
  const p = createProviders(env, async (url, options) => {
    calls.push({ url, method: options.method });
    if (url.includes('/customers?')) return Response.json({ customers: [], total_pages: 1 });
    if (url.endsWith('/customers')) return Response.json({ id: 'new-customer', addresses: [{ id: 'new-address' }] });
    return Response.json({ id: 'new-job' });
  });
  await p.createBooking(referral);
  assert.equal(calls.filter(c => c.method === 'POST').length, 2);
});
test('ambiguous existing customers or mismatched properties fail before a write', async () => {
  for (const customers of [
    [{ id: 'a', mobile_number: '3175551234' }, { id: 'b', mobile_number: '3175551234' }],
    [{ id: 'a', mobile_number: '3175551234', addresses: [{ id: 'old-address', street: '99 Other St', city: 'Carmel', zip: '46032' }] }]
  ]) {
    let writes = 0;
    const p = createProviders(env, async (url, options) => { if (options.method === 'POST') writes++; return Response.json({ customers, total_pages: 1 }); });
    await assert.rejects(p.createBooking(referral)); assert.equal(writes, 0);
  }
});
test('deployment booking gate prevents every provider call', async () => {
  let calls = 0;
  const p = createProviders({ HCP_API_KEY: 'fake-test-key', PARTNER_BOOKING_ENABLED: 'false' }, async () => { calls++; });
  await assert.rejects(p.createBooking(referral)); assert.equal(calls, 0);
});
test('completion batches rotate so older incomplete jobs do not starve later referrals', async () => {
  const f = await fixture();
  await f.repo.change(s => { s.referrals = Array.from({ length: 5 }, (_, i) => ({ id: 'r' + i, jobId: 'j' + i, status: 'booked' })); });
  const read = [];
  const p = { getJob: async id => { read.push(id); return { work_status: 'scheduled' }; } };
  for (let i = 0; i < 3; i++) await syncCompletions({ repo: f.repo, providers: p, maxJobs: 2 });
  assert.deepEqual(read, ['j0', 'j1', 'j2', 'j3', 'j4', 'j0']);
});
test('company artwork does not become a public gallery asset without an explicit photo or logo assignment', async () => {
  const f = await fixture();
  await f.repo.change(s => { s.companies[0].design = { id: 'print-design', version: 1 }; });
  assert.equal((await f.call('media/print-design')).response.status, 404);
});
test('an account deletion can settle outstanding rewards without restoring the deleted profile', async () => {
  const f = await fixture(), cookie = await f.signin(); await f.register(cookie);
  await f.call('profile', { name: 'Taylor', payout: { method: 'venmo', handle: 'taylor-tech' } }, cookie);
  await f.call('bookings', await f.booking(cookie), cookie); await syncCompletions({ repo: f.repo, providers: f.providers });
  const before = await f.repo.read();
  await f.call('account', { confirm: 'DELETE' }, cookie, 'DELETE');
  const body = { id: before.referrals[0].id, reference: 'final-reward-payment', payoutVersion: before.techs[0].payout.version };
  assert.equal((await f.call('owner/paid', body, await f.owner())).response.status, 200);
  const after = await f.repo.read();
  assert.equal(after.techs[0].phone, null); assert.equal(after.deletionRequests[0].payout, null); assert.equal(after.deletionRequests[0].status, 'settled');
});
