import { Repository, initialState, hash } from '../server/state.mjs';
import { createHandler } from '../server/api.mjs';

export class MemoryStore {
  constructor() { this.entries = new Map(); this.revision = 0; }
  async getWithMetadata(key) { const item = this.entries.get(key); return item ? structuredClone(item) : null; }
  async setJSON(key, data, options = {}) {
    const current = this.entries.get(key);
    if (options.onlyIfNew && current || options.onlyIfMatch && current?.etag !== options.onlyIfMatch) return { modified: false };
    const etag = String(++this.revision); this.entries.set(key, { data: structuredClone(data), etag }); return { modified: true, etag };
  }
}
export async function fixture(envOverrides = {}) {
  let time = Date.parse('2026-10-22T15:00:00Z');
  const store = new MemoryStore(), repo = new Repository(store);
  await store.setJSON('state', initialState());
  const calls = { sms: 0, bookings: 0, availability: 0 };
  const providers = {
    verificationReady: () => true,
    async startVerification() { calls.sms++; },
    async checkVerification(number, code) { return code === '123456'; },
    async availability() { calls.availability++; return { options: [{ date: '2026-10-24', date_readable: 'Saturday, October 24', ideal: true, open_day: true, best: { scheduled_time: '09:00', window: '9:00–10:00 AM' } }] }; },
    async createBooking() { calls.bookings++; return { id: 'job-' + calls.bookings, customer_id: 'customer-1' }; },
    async getJob(id) { return { id, work_status: 'complete unrated' }; }
  };
  const assets = { async put() {}, async response() { return new Response('image', { headers: { 'Content-Type': 'image/png' } }); } };
  const handler = createHandler({ repo, providers, assets, env: { PARTNER_OWNER_PASSWORD_HASH: hash('owner-password'), PARTNER_BOOKING_ENABLED: 'true', ...envOverrides }, now: () => time });
  const request = (path, body, cookie = '', method = body ? 'POST' : 'GET', headers = {}) => new Request('https://salt.test/api/partners/' + path, { method, headers: { Origin: 'https://salt.test', 'X-Nf-Client-Connection-Ip': '192.0.2.1', Cookie: cookie, ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers }, ...(body ? { body: JSON.stringify(body) } : {}) });
  async function call(path, body, cookie, method, headers) {
    const response = await handler(request(path, body, cookie, method, headers));
    let data; try { data = await response.clone().json(); } catch { data = null; }
    return { response, data, cookie: response.headers.get('set-cookie')?.split(';')[0] };
  }
  async function signin(number = '3175551234') {
    await call('auth/start', { phone: number, consent: true });
    const result = await call('auth/check', { phone: number, code: '123456' });
    if (result.response.status !== 200) throw new Error('Test sign-in failed: ' + JSON.stringify(result.data));
    return result.cookie;
  }
  async function owner() { return (await call('owner/login', { password: 'owner-password' })).cookie; }
  async function register(cookie, companyId = 'prime', active = true) {
    const ownerCookie = await owner();
    const invite = active ? (await call('owner/invite', { companyId }, ownerCookie)).data.invite : '';
    const result = await call('profile', { companyId, name: 'Taylor Technician', invite }, cookie);
    if (result.response.status !== 200) throw new Error(JSON.stringify(result.data));
    return result.data.profile;
  }
  async function booking(cookie, overrides = {}) {
    await repo.change(s => { s.launch = { bookingEnabled: true, legacyReconciled: true }; });
    const quote = await call('availability', { address: '10 Main St, Carmel', zip: '46032', customerName: 'Alex Customer', customerConsent: true }, cookie);
    return { requestId: 'booking-request-00000001', quoteId: quote.data.quoteId, date: '2026-10-24', time: '09:00', customerName: 'Alex Customer', customerPhone: '3175556789', street: '10 Main St', city: 'Carmel', zip: '46032', waterType: 'city', customerConsent: true, ...overrides };
  }
  return { store, repo, providers, calls, handler, request, call, signin, owner, register, booking, advance: ms => { time += ms; }, now: () => time };
}
