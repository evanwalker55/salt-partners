import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

export const hash = value => createHash('sha256').update(String(value)).digest('hex');
export const secret = () => randomBytes(32).toString('base64url');
export const id = () => randomUUID();
export const equal = (a, b) => typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
export class AppError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const ensure = (condition, status, message) => { if (!condition) throw new AppError(status, message); };
export function text(value, max = 160) {
  ensure(typeof value === 'string', 400, 'Check the required fields.');
  const clean = value.trim();
  ensure(clean.length > 0 && clean.length <= max && !/[\u0000-\u001f\u007f]/.test(clean), 400, 'Check the required fields.');
  return clean;
}
export function phone(value) {
  const digits = String(value || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  ensure(/^[2-9]\d{2}[2-9]\d{6}$/.test(digits), 400, 'Enter a valid US phone number.');
  return '+1' + digits;
}
export function initialState() {
  return {
    schema: 1, revision: 0, companies: [
      { id: 'peterman', name: 'Peterman Brothers', kind: 'Plumbing', logo: 'logos/peterman.png', active: true },
      { id: 'abode', name: 'Abode Home Concierge', kind: 'Home care', logo: 'logos/abode.png', active: true },
      { id: 'prime', name: 'Prime Plumbing & Drains', kind: 'Plumbing', logo: 'logos/prime.png', active: true },
      { id: 'simplywater', name: 'Simply Water', kind: 'Water treatment', logo: 'logos/simplywater.png', active: true }
    ].map(c => ({ ...c, bountyCents: 2500, design: null, photo: { path: `mockups/${c.id}-v1.png`, caption: 'Illustrative sticker mockup' } })),
    techs: [], sessions: [], invites: [], referrals: [], orders: [], audit: [], limits: {}, quotes: [],
    launch: { legacyReconciled: false, bookingEnabled: false }, deletionRequests: []
  };
}

// A single optimistic transaction covers related records. No external side effects
// may run in a transaction callback: it can be retried after a competing write.
export class Repository {
  constructor(store, key = 'state') { this.store = store; this.key = key; }
  async read() { return (await this.store.getWithMetadata(this.key, { type: 'json', consistency: 'strong' }))?.data || initialState(); }
  async change(fn) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const current = await this.store.getWithMetadata(this.key, { type: 'json', consistency: 'strong' });
      const state = structuredClone(current?.data || initialState());
      const result = fn(state);
      state.revision++;
      const saved = await this.store.setJSON(this.key, state, current ? { onlyIfMatch: current.etag } : { onlyIfNew: true });
      if (saved.modified) return result;
    }
    throw new AppError(409, 'Another update is being saved. Please try again.');
  }
}
export function audit(state, action, actor, subject, now, details = {}) {
  state.audit.push({ id: id(), action, actor, subject, at: new Date(now).toISOString(), ...details });
}
export function spendLimit(state, key, limit, windowMs, now) {
  const entry = state.limits[key];
  const values = (entry || []).filter(at => at > now - windowMs);
  ensure(values.length < limit, 429, 'Too many attempts. Please try again later.');
  state.limits[key] = [...values, now];
  // Retain only bounded rate-limit metadata, never raw IPs or phone numbers.
  for (const [k, times] of Object.entries(state.limits)) if (times.at(-1) < now - 86400000) delete state.limits[k];
}
export function publicCompany(company) {
  return { id: company.id, name: company.name, kind: company.kind, active: company.active, logo: company.logoAsset ? `/api/partners/media/${company.logoAsset.id}` : company.logo, bountyCents: company.bountyCents, design: company.design, photo: company.photo };
}
export function eraseSettledDeletedAccounts(state) {
  for (const tech of state.techs.filter(t => t.deletedAt)) {
    for (const r of state.referrals.filter(r => r.techId === tech.id)) {
      r.techName = 'Deleted technician';
      if (['paid', 'cancelled'].includes(r.status)) {
        r.customerName = 'Removed customer';
        for (const key of ['customerPhone', 'street', 'city', 'zip', 'email', 'notes', 'waterType', 'customerId', 'paidTo', 'fingerprint']) delete r[key];
      }
    }
    for (const o of state.orders.filter(o => o.techId === tech.id && ['fulfilled', 'cancelled'].includes(o.status))) {
      o.shipping = null; o.tracking = '';
      for (const entry of o.history) delete entry.tracking;
      delete o.fingerprint;
    }
    if (!state.referrals.some(r => r.techId === tech.id && !['paid', 'cancelled'].includes(r.status))) {
      for (const request of state.deletionRequests.filter(r => r.techId === tech.id)) {
        request.name = null; request.payout = null; request.status = 'settled';
      }
    }
  }
}
export function profile(state, tech) {
  return { ...tech, company: publicCompany(state.companies.find(c => c.id === tech.companyId)), verified: true };
}
export const completed = job => /^complete(?:d)?(?:[ _]|$)/i.test(job.work_status || '') && !job.canceled_at && !job.deleted_at;
export function payoutDetails(method, handle) {
  ensure(['venmo', 'zelle', 'applecash'].includes(method), 400, 'Choose Venmo, Zelle, or Apple Cash.');
  handle = text(handle, 120);
  if (method === 'venmo') {
    handle = handle.replace(/^@/, '');
    ensure(/^[a-zA-Z0-9_-]{5,30}$/.test(handle), 400, 'Enter your Venmo username, not a payment link.');
    handle = '@' + handle;
  } else if (method === 'applecash' || !handle.includes('@')) handle = phone(handle);
  else ensure(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(handle), 400, 'Enter a valid Zelle email or phone number.');
  return { method, handle };
}

// Indianapolis observes DST. Calculate the actual offset on the selected date,
// including the March/November changeovers, rather than guessing by month.
export function easternTime(date, time) {
  ensure(/^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(time), 400, 'Select a delivery time again.');
  const utc = new Date(`${date}T${time}:00Z`);
  const name = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Indiana/Indianapolis', timeZoneName: 'longOffset' }).formatToParts(new Date(`${date}T12:00:00Z`)).find(p => p.type === 'timeZoneName').value;
  const offset = name.replace('GMT', '') || '+00:00';
  ensure(Number.isFinite(utc.valueOf()), 400, 'Select a valid delivery time.');
  return new Date(`${date}T${time}:00${offset}`).toISOString();
}
