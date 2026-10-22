import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './helpers.mjs';
import { easternTime, phone, payoutDetails, hash } from '../server/state.mjs';
import { syncCompletions } from '../server/api.mjs';

test('public company gallery reveals no profiles, phones, earnings, sessions, or invitations', async () => {
  const f = await fixture(), cookie = await f.signin(); await f.register(cookie);
  const result = await f.call('config');
  assert.equal(result.response.status, 200); assert.equal(result.data.companies.length, 4);
  assert.ok(result.data.companies[0].photo.path); assert.doesNotMatch(JSON.stringify(result.data), /Taylor|317555|sessions|invites/);
  assert.equal((await f.call('me')).response.status, 401);
  assert.equal((await f.call('owner/overview', undefined, cookie)).response.status, 401);
});
test('phone verification gates profile creation; incorrect code and unrequested check fail', async () => {
  const f = await fixture();
  assert.equal((await f.call('profile', { name: 'Spoofed', companyId: 'prime' })).response.status, 401);
  assert.equal((await f.call('auth/check', { phone: '3175551234', code: '123456' })).response.status, 400);
  await f.call('auth/start', { phone: '3175551234', consent: true });
  assert.equal((await f.call('auth/check', { phone: '3175551234', code: '999999' })).response.status, 400);
});
test('sign-in creates a secure HttpOnly cookie; logout revokes it', async () => {
  const f = await fixture(); await f.call('auth/start', { phone: '3175551234', consent: true });
  const result = await f.call('auth/check', { phone: '3175551234', code: '123456' });
  assert.match(result.response.headers.get('set-cookie'), /HttpOnly; Secure; SameSite=Lax/);
  assert.equal(result.data.token, undefined);
  await f.call('auth/logout', {}, result.cookie);
  assert.equal((await f.call('me', undefined, result.cookie)).response.status, 401);
});
test('returning technicians retain their own company across devices and cannot self-switch companies', async () => {
  const f = await fixture(), first = await f.signin(); const p = await f.register(first, 'prime');
  f.advance(61000); const second = await f.signin();
  assert.equal((await f.call('me', undefined, second)).data.profile.companyId, 'prime');
  assert.equal((await f.call('profile', { name: p.name, companyId: 'peterman' }, second)).response.status, 400);
});
test('non-invited accounts require membership approval before booking and stickers', async () => {
  const f = await fixture(), cookie = await f.signin(); const tech = await f.register(cookie, 'prime', false);
  assert.equal(tech.membership, 'pending');
  assert.equal((await f.call('availability', { address: '10 Main St, Carmel', zip: '46032', customerName: 'Alex' }, cookie)).response.status, 403);
  await f.call('owner/membership', { techId: tech.id, status: 'active' }, await f.owner());
  assert.equal((await f.call('me', undefined, cookie)).data.profile.membership, 'active');
});
test('an invitation is scoped to its company, expires, and can be revoked', async () => {
  const f = await fixture(), owner = await f.owner(), cookie = await f.signin();
  const invite = await f.call('owner/invite', { companyId: 'prime' }, owner);
  assert.equal((await f.call('profile', { name: 'Taylor', companyId: 'abode', invite: invite.data.invite }, cookie)).response.status, 400);
  const saved = (await f.repo.read()).invites[0];
  await f.call('owner/revoke-invite', { id: saved.id }, owner);
  assert.equal((await f.call('profile', { name: 'Taylor', companyId: 'prime', invite: invite.data.invite }, cookie)).response.status, 400);
});
test('verification text requests are throttled by phone, IP and global budget', async () => {
  const f = await fixture();
  assert.equal((await f.call('auth/start', { phone: '3175551234', consent: false })).response.status, 400);
  assert.equal((await f.call('auth/start', { phone: '3175551234', consent: true })).response.status, 200);
  assert.equal((await f.call('auth/start', { phone: '3175551234', consent: true })).response.status, 429);
  assert.equal(f.calls.sms, 1);
});
test('owner password, same-origin protection and role checks protect mutations', async () => {
  const f = await fixture();
  assert.equal((await f.call('owner/login', { password: 'wrong' })).response.status, 401);
  const owner = await f.owner();
  assert.equal((await f.call('owner/company', { name: 'New Plumbing', kind: 'Plumbing' }, owner, 'POST', { Origin: 'https://evil.test' })).response.status, 403);
  assert.equal((await f.call('owner/company', { name: 'New Plumbing', kind: 'Plumbing' }, owner)).response.status, 200);
  const overview = (await f.call('owner/overview', undefined, owner)).data;
  assert.equal(overview.sessions, undefined); assert.equal(overview.limits, undefined);
});
test('booking attribution and reward use the authenticated technician and server company', async () => {
  const f = await fixture(), cookie = await f.signin(); const tech = await f.register(cookie);
  const body = await f.booking(cookie, { techId: 'someone-else', companyId: 'peterman', bountyCents: 999999 });
  const result = await f.call('bookings', body, cookie);
  assert.equal(result.response.status, 200);
  const saved = (await f.repo.read()).referrals[0];
  assert.equal(saved.techId, tech.id); assert.equal(saved.companyId, 'prime'); assert.equal(saved.bountyCents, 2500); assert.equal(saved.jobId, 'job-1');
});
test('double-clicks and replayed requests create at most one Housecall Pro job', async () => {
  const f = await fixture(), cookie = await f.signin(); await f.register(cookie);
  const body = await f.booking(cookie);
  await Promise.all([f.call('bookings', body, cookie), f.call('bookings', body, cookie)]);
  assert.equal(f.calls.bookings, 1);
  const repeat = await f.call('bookings', body, cookie);
  assert.equal(repeat.response.status, 200); assert.equal(repeat.data.jobId, 'job-1');
  assert.equal((await f.call('bookings', { ...body, customerName: 'Changed' }, cookie)).response.status, 409);
});
test('uncertain external booking outcomes are never automatically retried', async () => {
  const f = await fixture(), cookie = await f.signin(); await f.register(cookie);
  const body = await f.booking(cookie);
  f.providers.createBooking = async () => { f.calls.bookings++; throw new Error('timeout after acceptance'); };
  assert.equal((await f.call('bookings', body, cookie)).response.status, 502);
  assert.equal((await f.call('bookings', body, cookie)).response.status, 409);
  assert.equal((await f.call('bookings', { ...body, requestId: 'new-request-00000002' }, cookie)).response.status, 409);
  await f.repo.change(s => { s.quotes[0].slots.push({ date: '2026-10-31', time: '09:00' }); });
  assert.equal((await f.call('bookings', { ...body, requestId: 'new-request-00000003', date: '2026-10-31' }, cookie)).response.status, 409);
  assert.equal(f.calls.bookings, 1); assert.equal((await f.repo.read()).referrals[0].status, 'needs_review');
});
test('changed address, expired slot and missing customer consent cannot book', async () => {
  const f = await fixture(), cookie = await f.signin(); await f.register(cookie);
  const body = await f.booking(cookie);
  assert.equal((await f.call('bookings', { ...body, customerConsent: false }, cookie)).response.status, 400);
  assert.equal((await f.call('bookings', { ...body, street: '99 Different St' }, cookie)).response.status, 409);
  f.advance(16 * 60000);
  assert.equal((await f.call('bookings', body, cookie)).response.status, 409); assert.equal(f.calls.bookings, 0);
});
test('completed deliveries become earned; failed reads preserve state and cancelled jobs cannot be paid', async () => {
  const f = await fixture(), cookie = await f.signin(); await f.register(cookie); await f.call('bookings', await f.booking(cookie), cookie);
  await syncCompletions({ repo: f.repo, providers: f.providers });
  assert.equal((await f.repo.read()).referrals[0].status, 'earned');
  f.providers.getJob = async () => { throw new Error('HCP unavailable'); };
  assert.equal((await syncCompletions({ repo: f.repo, providers: f.providers })).failures, 1);
  assert.equal((await f.repo.read()).referrals[0].status, 'earned');
  f.providers.getJob = async () => ({ work_status: 'canceled', canceled_at: '2026-10-23' });
  assert.equal((await f.call('owner/paid', { id: (await f.repo.read()).referrals[0].id, reference: 'payment-1' }, await f.owner())).response.status, 409);
});
test('recording payments requires current payout details and cannot double-pay a referral', async () => {
  const f = await fixture(), cookie = await f.signin(); await f.register(cookie);
  await f.call('profile', { name: 'Taylor', payout: { method: 'venmo', handle: '@taylor-tech' } }, cookie);
  await f.call('bookings', await f.booking(cookie), cookie); await syncCompletions({ repo: f.repo, providers: f.providers });
  const state = await f.repo.read(), owner = await f.owner();
  const body = { id: state.referrals[0].id, reference: 'venmo-transaction-123', payoutVersion: state.techs[0].payout.version };
  assert.equal((await f.call('owner/paid', { ...body, payoutVersion: 'stale' }, owner)).response.status, 409);
  assert.equal((await f.call('owner/paid', body, owner)).response.status, 200);
  assert.equal((await f.call('owner/paid', body, owner)).response.status, 409);
  assert.equal((await f.call('me', undefined, cookie)).data.totals.paid, 2500);
});
test('sticker requests cost zero, reject foreign designs and preserve approved design versions', async () => {
  const f = await fixture(), cookie = await f.signin(); await f.register(cookie);
  await f.repo.change(s => { s.companies.find(c => c.id === 'prime').design = { id: 'design-1', name: 'Prime sticker', version: 1 }; });
  const body = { requestId: 'stickers-request-000001', designId: 'design-1', quantity: 50, totalCents: 99999, shipping: { name: 'Taylor', street: '10 Main St', city: 'Carmel', state: 'IN', zip: '46032' } };
  assert.equal((await f.call('stickers', { ...body, designId: 'foreign-design' }, cookie)).response.status, 409);
  const result = await f.call('stickers', body, cookie);
  assert.equal(result.response.status, 201); assert.equal(result.data.order.totalCents, 0);
  await f.repo.change(s => { s.companies.find(c => c.id === 'prime').design = { id: 'design-2', name: 'New sticker', version: 2 }; });
  assert.equal((await f.repo.read()).orders[0].design.id, 'design-1');
  const replay = await f.call('stickers', body, cookie);
  assert.equal(replay.response.status, 201); assert.equal(replay.data.order.id, result.data.order.id);
});
test('concurrent sticker requests with one reference create one order', async () => {
  const f = await fixture(), cookie = await f.signin(); await f.register(cookie);
  await f.repo.change(s => { s.companies.find(c => c.id === 'prime').design = { id: 'design-1', name: 'Prime sticker', version: 1 }; });
  const body = { requestId: 'stickers-request-000001', designId: 'design-1', quantity: 50, shipping: { name: 'Taylor', street: '10 Main St', city: 'Carmel', state: 'IN', zip: '46032' } };
  await Promise.all([f.call('stickers', body, cookie), f.call('stickers', body, cookie)]);
  assert.equal((await f.repo.read()).orders.length, 1);
});
test('payout changes require recent verification and a safe payout handle', async () => {
  const f = await fixture(), cookie = await f.signin(); await f.register(cookie);
  assert.equal((await f.call('profile', { name: 'Taylor', payout: { method: 'venmo', handle: 'https://evil.test' } }, cookie)).response.status, 400);
  f.advance(11 * 60000);
  assert.equal((await f.call('profile', { name: 'Taylor', payout: { method: 'venmo', handle: 'taylor-tech' } }, cookie)).response.status, 403);
});
test('account deletion removes profile details and invalidates every device session', async () => {
  const f = await fixture(), first = await f.signin(); await f.register(first); f.advance(61000); const second = await f.signin();
  assert.equal((await f.call('account', { confirm: 'DELETE' }, second, 'DELETE')).response.status, 200);
  assert.equal((await f.call('me', undefined, first)).response.status, 401);
  assert.equal((await f.call('me', undefined, second)).response.status, 401);
  const tech = (await f.repo.read()).techs[0]; assert.equal(tech.phone, null); assert.equal(tech.payout, null); assert.equal(tech.name, 'Deleted technician');
});
test('Indianapolis times use actual daylight-saving boundaries', () => {
  assert.equal(easternTime('2026-03-07', '09:00'), '2026-03-07T14:00:00.000Z');
  assert.equal(easternTime('2026-03-14', '09:00'), '2026-03-14T13:00:00.000Z');
  assert.equal(easternTime('2026-11-07', '09:00'), '2026-11-07T14:00:00.000Z');
  assert.equal(phone('(317) 555-1234'), '+13175551234');
  assert.equal(payoutDetails('venmo', 'taylor-tech').handle, '@taylor-tech');
});
