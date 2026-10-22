import { AppError, ensure, text, phone, hash, secret, id, equal, audit, spendLimit, publicCompany, profile, payoutDetails, completed } from './state.mjs';

const DAY = 86400000;
const COOKIE = '__Host-salt_partner';
const ownerCookie = '__Host-salt_owner';
const cookieValue = (req, name) => req.headers.get('cookie')?.split(';').map(s => s.trim()).find(s => s.startsWith(name + '='))?.slice(name.length + 1) || '';
const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store', ...extra } });
const setCookie = (name, value, age = 30 * 86400) => `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
const activeTech = (s, session) => {
  const tech = s.techs.find(t => t.id === session.techId && !t.deletedAt);
  ensure(tech, 403, 'Finish setting up your account.');
  ensure(tech.membership === 'active' && s.companies.some(c => c.id === tech.companyId && c.active), 403, 'Your company membership needs owner approval.');
  return tech;
};
const ownTech = (s, session) => {
  const tech = s.techs.find(t => t.id === session.techId && !t.deletedAt);
  ensure(tech, 403, 'Finish setting up your account.');
  return tech;
};
const sessionFor = (s, req, now, role = 'tech') => {
  const token = cookieValue(req, role === 'owner' ? ownerCookie : COOKIE);
  const session = token && s.sessions.find(v => v.hash === hash(token) && v.role === role && v.expiresAt > now);
  ensure(session, 401, 'Please sign in again.');
  return session;
};
const recent = (session, now) => ensure(now - session.verifiedAt < 10 * 60000, 403, 'Verify your phone again before changing payout details or deleting your account.');
function matchingCompany(s, companyId) {
  const c = s.companies.find(c => c.id === companyId && c.active);
  ensure(c, 400, 'Choose an active partner company.');
  return c;
}
function summarize(s, techId) {
  const referrals = s.referrals.filter(r => r.techId === techId).map(r => ({ id: r.id, jobId: r.jobId, customerName: r.customerName, scheduledDate: r.scheduledDate, status: r.status, bountyCents: r.bountyCents, createdAt: r.createdAt, source: r.source, paidAt: r.paidAt }));
  const totals = { pending: 0, earned: 0, paid: 0 };
  for (const r of referrals) {
    if (['booked', 'creating', 'needs_review'].includes(r.status)) totals.pending += r.bountyCents;
    else if (r.status === 'earned') totals.earned += r.bountyCents;
    else if (r.status === 'paid') totals.paid += r.bountyCents;
  }
  return { referrals, totals };
}
function validAddress(value) {
  ensure(value && typeof value === 'object', 400, 'Enter the shipping address.');
  const a = { name: text(value.name, 100), street: text(value.street, 180), unit: value.unit ? text(value.unit, 50) : '', city: text(value.city, 80), state: text(value.state, 2).toUpperCase(), zip: text(value.zip, 10) };
  ensure(/^[A-Z]{2}$/.test(a.state) && /^\d{5}(-\d{4})?$/.test(a.zip), 400, 'Check the shipping state and ZIP.');
  return a;
}
function bookingFields(body) {
  const fields = { customerName: text(body.customerName, 100), customerPhone: phone(body.customerPhone), street: text(body.street, 180), city: text(body.city, 80), zip: text(body.zip, 5), email: body.email ? text(body.email, 180) : '', waterType: body.waterType, notes: body.notes ? text(body.notes, 500) : '' };
  ensure(/^\d{5}$/.test(fields.zip), 400, 'Enter a five-digit ZIP.');
  ensure(['city', 'well'].includes(fields.waterType), 400, 'Choose city or well water.');
  ensure(!fields.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email), 400, 'Check the customer email.');
  ensure(body.customerConsent === true, 400, 'Confirm the customer agreed to this booking and sharing their details with Simply Salt.');
  return fields;
}

export function createHandler({ repo, providers, assets, env = process.env, now = () => Date.now(), preview = false }) {
  return async function handler(req) {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api\/partners\/?/, '').replace(/\/$/, '');
    const origin = req.headers.get('origin');
    const native = ['capacitor://localhost', 'https://localhost', 'http://localhost'].includes(origin);
    const allowed = !origin || origin === url.origin || native;
    const cors = origin && allowed ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', Vary: 'Origin' } : {};
    const respond = (data, status = 200, extra = {}) => json(data, status, { ...cors, ...extra });
    try {
      ensure(allowed, 403, 'This origin is not allowed.');
      if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-Salt-Client' } });
      if (!['GET', 'HEAD'].includes(req.method)) ensure(origin === url.origin || native || (!origin && req.headers.get('x-salt-client') === 'native'), 403, 'Open the app and try again.');
      const at = now();
      const ip = hash(req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for')?.split(',')[0] || 'local');
      let body = {};
      if (req.method === 'POST' || req.method === 'DELETE') {
        ensure((req.headers.get('content-type') || '').startsWith('application/json'), 415, 'Send JSON data.');
        const raw = await req.text();
        ensure(Buffer.byteLength(raw) <= (['owner/design', 'owner/photo', 'owner/logo'].includes(path) ? 3000000 : 16000), 413, 'This request is too large.');
        try { body = JSON.parse(raw); } catch { throw new AppError(400, 'Check the request format.'); }
        ensure(body && !Array.isArray(body) && typeof body === 'object', 400, 'Check the request format.');
      }

      if (path === 'config' && req.method === 'GET') {
        const s = await repo.read();
        return respond({ companies: s.companies.filter(c => c.active).map(publicCompany), verificationReady: providers.verificationReady(), bookingEnabled: s.launch.bookingEnabled && (preview || env.PARTNER_BOOKING_ENABLED === 'true'), supportPhone: '3179690174', payoutMethods: ['venmo', 'zelle', 'applecash'], ...(preview ? { demo: true } : {}) });
      }
      if (path.startsWith('media/') && req.method === 'GET') {
        const s = await repo.read(), assetId = path.slice(6);
        ensure(s.companies.some(c => c.active && (c.photo?.id === assetId || c.logoAsset?.id === assetId)), 404, 'Image not found.');
        return await assets.response(assetId, cors);
      }
      if (path === 'auth/start' && req.method === 'POST') {
        ensure(providers.verificationReady(), 503, 'Phone verification is not activated yet. Please contact Evan.');
        const number = phone(body.phone);
        ensure(body.consent === true, 400, 'Agree to receive a sign-in code by text.');
        await repo.change(s => {
          spendLimit(s, `sms-ip-hour-${ip}`, 20, 3600000, at);
          spendLimit(s, `sms-ip-day-${ip}`, 100, DAY, at);
          spendLimit(s, `sms-phone-${hash(number)}`, 1, 60000, at);
          spendLimit(s, `sms-day-${hash(number)}`, 5, DAY, at);
          const budget = Math.max(1, Math.min(1000, Number(env.PARTNER_VERIFY_DAILY_LIMIT) || 40));
          spendLimit(s, 'sms-budget', budget, DAY, at);
          s.sessions = s.sessions.filter(v => v.expiresAt > at);
        });
        await providers.startVerification(number);
        return respond({ sent: true });
      }
      if (path === 'auth/check' && req.method === 'POST') {
        ensure(providers.verificationReady(), 503, 'Phone verification is not activated yet.');
        const number = phone(body.phone), code = text(body.code, 8);
        ensure(/^\d{6}$/.test(code), 400, 'Enter the six-digit code.');
        await repo.change(s => {
          ensure(s.limits[`sms-phone-${hash(number)}`]?.some(v => v > at - 10 * 60000), 400, 'Request a new sign-in code.');
          spendLimit(s, `check-phone-${hash(number)}`, 6, 10 * 60000, at);
          spendLimit(s, `check-ip-${ip}`, 20, 10 * 60000, at);
        });
        ensure(await providers.checkVerification(number, code), 400, 'That code is incorrect or expired.');
        const token = secret();
        const result = await repo.change(s => {
          const tech = s.techs.find(t => t.phone === number && !t.deletedAt);
          s.sessions = s.sessions.filter(v => v.expiresAt > at);
          s.sessions.push({ hash: hash(token), role: 'tech', phone: number, techId: tech?.id || null, verifiedAt: at, expiresAt: at + 30 * DAY });
          audit(s, 'phone_verified', tech?.id || 'new-technician', null, at);
          return { profile: tech ? profile(s, tech) : null, phone: number };
        });
        return respond(result, 200, { 'Set-Cookie': setCookie(COOKIE, token) });
      }
      if (path === 'owner/login' && req.method === 'POST') {
        ensure(env.PARTNER_OWNER_PASSWORD_HASH, 503, 'Owner access is not configured yet.');
        await repo.change(s => spendLimit(s, `owner-login-${ip}`, 8, 15 * 60000, at));
        ensure(equal(hash(text(body.password, 200)), env.PARTNER_OWNER_PASSWORD_HASH), 401, 'That owner password was not recognized.');
        const token = secret();
        await repo.change(s => { s.sessions.push({ hash: hash(token), role: 'owner', verifiedAt: at, expiresAt: at + DAY / 3 }); });
        return respond({ signedIn: true }, 200, { 'Set-Cookie': setCookie(ownerCookie, token, 8 * 3600) });
      }

      const s = await repo.read();
      const isOwner = path.startsWith('owner/');
      const session = sessionFor(s, req, at, isOwner ? 'owner' : 'tech');
      const actor = isOwner ? 'owner' : session.techId;
      if (path === 'auth/logout' && req.method === 'POST' || path === 'owner/logout' && req.method === 'POST') {
        await repo.change(d => { d.sessions = d.sessions.filter(v => v.hash !== session.hash); });
        return respond({ signedOut: true }, 200, { 'Set-Cookie': setCookie(isOwner ? ownerCookie : COOKIE, '', 0) });
      }
      if (path === 'me' && req.method === 'GET') {
        const tech = s.techs.find(t => t.id === session.techId && !t.deletedAt);
        if (!tech) return respond({ profile: null, phone: session.phone });
        return respond({ profile: profile(s, tech), ...summarize(s, tech.id), orders: s.orders.filter(o => o.techId === tech.id), lastSync: s.lastSync || null, bookingEnabled: s.launch.bookingEnabled && (preview || env.PARTNER_BOOKING_ENABLED === 'true') });
      }
      if (path === 'profile' && req.method === 'POST') {
        recent(session, at);
        const name = text(body.name, 100);
        const payout = body.payout ? payoutDetails(body.payout.method, body.payout.handle) : null;
        const result = await repo.change(d => {
          const currentSession = sessionFor(d, req, at);
          const existing = d.techs.find(t => t.id === currentSession.techId && !t.deletedAt);
          if (existing) {
            ensure(!body.companyId || body.companyId === existing.companyId, 400, 'Contact Evan to change companies.');
            existing.name = name;
            if (payout) existing.payout = { ...payout, version: id(), updatedAt: new Date(at).toISOString() };
            audit(d, 'profile_updated', existing.id, existing.id, at);
            return profile(d, existing);
          }
          ensure(!d.techs.some(t => t.phone === currentSession.phone && !t.deletedAt), 409, 'This account was created in another window. Sign in again.');
          const company = matchingCompany(d, body.companyId);
          let membership = 'pending';
          if (body.invite) {
            const invite = d.invites.find(i => i.hash === hash(text(body.invite, 120)) && i.companyId === company.id && i.expiresAt > at && !i.revokedAt && i.uses < i.maxUses);
            ensure(invite, 400, 'This invitation is invalid or expired. Ask Evan for a new link.');
            invite.uses++; membership = 'active';
          }
          const tech = { id: id(), name, phone: currentSession.phone, companyId: company.id, membership, payout: payout ? { ...payout, version: id(), updatedAt: new Date(at).toISOString() } : null, createdAt: new Date(at).toISOString() };
          d.techs.push(tech);
          currentSession.techId = tech.id;
          audit(d, 'technician_registered', tech.id, company.id, at, { membership });
          return profile(d, tech);
        });
        return respond({ profile: result });
      }
      if (path === 'availability' && req.method === 'POST') {
        const tech = activeTech(s, session);
        ensure(s.launch.bookingEnabled, 503, 'Bookings are not activated in this review version.');
        const address = text(body.address, 220), zip = text(body.zip, 5), name = text(body.customerName, 100);
        ensure(/^\d{5}$/.test(zip), 400, 'Enter a five-digit ZIP.');
        await repo.change(d => spendLimit(d, `availability-${tech.id}`, 20, 3600000, at));
        const data = await providers.availability({ customer_name: name, address, zip });
        ensure(Array.isArray(data.options) && data.options.length, 422, 'No delivery times are available. Contact Evan.');
        const quoteId = id();
        const slots = data.options.flatMap(o => [o.best, o.before_route, o.after_route].filter(Boolean).map(v => ({ date: o.date, time: v.scheduled_time, window: v.window })));
        await repo.change(d => {
          d.quotes = d.quotes.filter(q => q.expiresAt > at);
          d.quotes.push({ id: quoteId, techId: tech.id, address, zip, slots, expiresAt: at + 15 * 60000 });
        });
        return respond({ quoteId, options: data.options });
      }
      if (path === 'bookings' && req.method === 'POST') {
        activeTech(s, session);
        const fields = bookingFields(body), requestId = text(body.requestId, 80);
        ensure(/^[a-zA-Z0-9_-]{16,80}$/.test(requestId), 400, 'Restart this booking.');
        const fingerprint = hash(JSON.stringify({ ...fields, quoteId: body.quoteId, date: body.date, time: body.time }));
        const referralId = id();
        const claimed = await repo.change(d => {
          const tech = activeTech(d, sessionFor(d, req, at));
          ensure(d.launch.bookingEnabled, 503, 'Bookings are not activated in this review version.');
          const old = d.referrals.find(r => r.techId === tech.id && r.requestId === requestId);
          if (old) {
            ensure(old.fingerprint === fingerprint, 409, 'This booking reference was already used with different details.');
            return { existing: true, referral: old };
          }
          const quote = d.quotes.find(q => q.id === body.quoteId && q.techId === tech.id && q.expiresAt > at);
          ensure(quote && quote.address === `${fields.street}, ${fields.city}` && quote.zip === fields.zip && quote.slots.some(v => v.date === body.date && v.time === body.time), 409, 'Delivery times expired or the address changed. Check availability again.');
          ensure(!d.referrals.some(r => r.customerPhone === fields.customerPhone && ['creating', 'needs_review'].includes(r.status)), 409, 'An earlier booking for this customer still needs review. Contact Evan before booking another delivery.');
          ensure(!d.referrals.some(r => r.customerPhone === fields.customerPhone && r.scheduledDate === body.date && !['cancelled'].includes(r.status)), 409, 'A delivery request for this customer and date is already recorded. Contact Evan before trying again.');
          ensure(!d.referrals.some(r => r.scheduledDate === body.date && r.scheduledTime === body.time && !['cancelled'].includes(r.status)), 409, 'That delivery slot was just requested. Check delivery times again.');
          spendLimit(d, `booking-${tech.id}`, 10, 3600000, at);
          const company = matchingCompany(d, tech.companyId);
          const referral = { id: referralId, requestId, fingerprint, techId: tech.id, companyId: company.id, techName: tech.name, companyName: company.name, ...fields, scheduledDate: body.date, scheduledTime: body.time, bountyCents: company.bountyCents, source: 'technician_app', status: 'creating', createdAt: new Date(at).toISOString(), consentAt: new Date(at).toISOString() };
          d.referrals.push(referral);
          audit(d, 'booking_started', tech.id, referralId, at);
          return { existing: false, referral };
        });
        if (claimed.existing) {
          ensure(claimed.referral.jobId, 409, 'This booking is being checked. Do not book again; contact Evan with reference ' + claimed.referral.id + '.');
          return respond({ booked: true, referralId: claimed.referral.id, jobId: claimed.referral.jobId });
        }
        try {
          const job = await providers.createBooking(claimed.referral);
          ensure(job?.id, 502, 'The booking service did not return a job reference.');
          await repo.change(d => {
            const r = d.referrals.find(v => v.id === referralId);
            r.jobId = job.id; r.customerId = job.customer?.id || job.customer_id || null; r.status = 'booked';
            audit(d, 'booking_confirmed', actor, referralId, now(), { jobId: job.id });
          });
          return respond({ booked: true, referralId, jobId: job.id });
        } catch {
          await repo.change(d => { const r = d.referrals.find(v => v.id === referralId); r.status = 'needs_review'; audit(d, 'booking_needs_review', actor, referralId, now()); });
          throw new AppError(502, 'We could not confirm the booking. Do not book again. Contact Evan with reference ' + referralId + '.');
        }
      }
      if (path === 'stickers' && req.method === 'POST') {
        const shipping = validAddress(body.shipping);
        const quantity = Number(body.quantity), requestId = text(body.requestId, 80);
        ensure([25, 50, 100, 250].includes(quantity), 400, 'Choose 25, 50, 100, or 250 stickers.');
        ensure(/^[a-zA-Z0-9_-]{16,80}$/.test(requestId), 400, 'Restart this request.');
        const result = await repo.change(d => {
          const tech = activeTech(d, sessionFor(d, req, at));
          const company = matchingCompany(d, tech.companyId);
          const fingerprint = hash(JSON.stringify({ shipping, quantity, designId: body.designId }));
          const old = d.orders.find(o => o.techId === tech.id && o.requestId === requestId);
          if (old) { ensure(old.fingerprint === fingerprint, 409, 'This request reference was already used.'); return old; }
          ensure(company.design && company.design.id === body.designId, 409, 'The approved sticker design changed. Review it and try again.');
          spendLimit(d, `stickers-${tech.id}`, 3, DAY, at);
          const order = { id: id(), requestId, fingerprint, techId: tech.id, companyId: company.id, techName: tech.name, companyName: company.name, design: structuredClone(company.design), quantity, shipping, totalCents: 0, status: 'requested', createdAt: new Date(at).toISOString(), history: [{ status: 'requested', at: new Date(at).toISOString() }] };
          d.orders.push(order); audit(d, 'stickers_requested', tech.id, order.id, at);
          return order;
        });
        return respond({ order: result }, 201);
      }
      if (path.startsWith('design/') && req.method === 'GET') {
        const tech = ownTech(s, session), assetId = path.slice(7);
        ensure(s.companies.find(c => c.id === tech.companyId)?.design?.id === assetId || s.orders.some(o => o.techId === tech.id && o.design.id === assetId), 404, 'Design not found.');
        return await assets.response(assetId, cors);
      }
      if (path === 'account' && req.method === 'DELETE') {
        recent(session, at); ensure(body.confirm === 'DELETE', 400, 'Confirm account deletion.');
        await repo.change(d => {
          const tech = ownTech(d, sessionFor(d, req, at));
          const outstanding = d.referrals.some(r => r.techId === tech.id && !['paid', 'cancelled'].includes(r.status));
          if (outstanding && tech.payout) d.deletionRequests.push({ id: id(), techId: tech.id, name: tech.name, payout: tech.payout, at: new Date(at).toISOString(), status: 'settle_and_erase', reason: 'Outstanding referral payment' });
          tech.deletedAt = new Date(at).toISOString(); tech.name = 'Deleted technician'; tech.phone = null; tech.payout = null; tech.membership = 'deleted';
          for (const r of d.referrals.filter(r => r.techId === tech.id)) r.techName = 'Deleted technician';
          for (const o of d.orders.filter(o => o.techId === tech.id)) { o.techName = 'Deleted technician'; if (['fulfilled', 'cancelled'].includes(o.status)) o.shipping = null; }
          d.sessions = d.sessions.filter(v => v.techId !== tech.id && v.phone !== session.phone);
          d.quotes = d.quotes.filter(q => q.techId !== tech.id);
          audit(d, 'account_deleted', tech.id, tech.id, at, { paymentRetention: outstanding });
        });
        return respond({ deleted: true }, 200, { 'Set-Cookie': setCookie(COOKIE, '', 0) });
      }

      if (isOwner) {
        if (path === 'owner/overview' && req.method === 'GET') return respond({ ...s, sessions: undefined, limits: undefined, quotes: undefined, invites: s.invites.map(({ hash, ...v }) => v), techs: s.techs.filter(t => !t.deletedAt) });
        if (path === 'owner/company' && req.method === 'POST') {
          const name = text(body.name, 100), kind = text(body.kind, 60);
          const result = await repo.change(d => {
            const existing = body.id ? d.companies.find(c => c.id === body.id) : null;
            ensure(!body.id || existing, 404, 'Company not found.');
            ensure(!d.companies.some(c => c.id !== existing?.id && c.name.toLowerCase() === name.toLowerCase()), 409, 'This company already exists.');
            const c = existing || { id: id(), logo: '', bountyCents: 2500, active: true, design: null };
            c.name = name; c.kind = kind;
            if (existing && typeof body.active === 'boolean') c.active = body.active;
            if (!existing) d.companies.push(c);
            audit(d, existing ? 'company_updated' : 'company_added', 'owner', c.id, at);
            return c;
          });
          return respond({ company: result });
        }
        if (path === 'owner/invite' && req.method === 'POST') {
          const token = secret();
          const result = await repo.change(d => {
            matchingCompany(d, body.companyId);
            const invite = { id: id(), companyId: body.companyId, hash: hash(token), maxUses: 100, uses: 0, expiresAt: at + 30 * DAY, createdAt: new Date(at).toISOString() };
            d.invites.push(invite); audit(d, 'invitation_created', 'owner', invite.id, at);
            return invite;
          });
          return respond({ invite: token, companyId: body.companyId, expiresAt: result.expiresAt, url: `${env.PARTNER_PUBLIC_URL || url.origin}/?company=${encodeURIComponent(body.companyId)}&invite=${encodeURIComponent(token)}` });
        }
        if (path === 'owner/revoke-invite' && req.method === 'POST') {
          await repo.change(d => { const invite = d.invites.find(i => i.id === body.id); ensure(invite, 404, 'Invitation not found.'); invite.revokedAt = new Date(at).toISOString(); audit(d, 'invitation_revoked', 'owner', invite.id, at); });
          return respond({ revoked: true });
        }
        if (path === 'owner/membership' && req.method === 'POST') {
          ensure(['active', 'suspended'].includes(body.status), 400, 'Choose an account status.');
          await repo.change(d => { const tech = d.techs.find(t => t.id === body.techId && !t.deletedAt); ensure(tech, 404, 'Technician not found.'); tech.membership = body.status; audit(d, 'membership_updated', 'owner', tech.id, at, { status: body.status }); });
          return respond({ saved: true });
        }
        if (['owner/design', 'owner/photo', 'owner/logo'].includes(path) && req.method === 'POST') {
          const company = matchingCompany(s, body.companyId), name = text(body.name, 100);
          if (path === 'owner/design') ensure(body.approved === true, 400, 'Confirm this is the approved print design.');
          ensure(typeof body.base64 === 'string', 400, 'Choose a PNG or JPEG design.');
          const bytes = Buffer.from(body.base64, 'base64');
          const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
          const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
          ensure((png || jpg) && bytes.length >= 32 && bytes.length <= 2000000, 400, 'Choose a PNG or JPEG under 2 MB.');
          const design = { id: id(), name, version: (company.design?.version || 0) + 1, approvedAt: new Date(at).toISOString() };
          await assets.put(design.id, bytes, png ? 'image/png' : 'image/jpeg');
          await repo.change(d => {
            const c = matchingCompany(d, company.id);
            if (path === 'owner/design') c.design = design;
            else if (path === 'owner/photo') c.photo = { id: design.id, caption: body.illustrative === true ? 'Illustrative sticker mockup' : 'Partnership sticker photo' };
            else c.logoAsset = { id: design.id };
            audit(d, path === 'owner/design' ? 'design_approved' : 'company_image_updated', 'owner', company.id, at, { designId: design.id });
          });
          return respond({ design });
        }
        if (path.startsWith('owner/design/') && req.method === 'GET') return await assets.response(path.slice(13), cors);
        if (path === 'owner/order' && req.method === 'POST') {
          const statuses = ['requested', 'processing', 'shipped', 'fulfilled', 'cancelled'];
          ensure(statuses.includes(body.status), 400, 'Choose an order status.');
          const tracking = body.tracking ? text(body.tracking, 200) : '';
          await repo.change(d => {
            const order = d.orders.find(o => o.id === body.id);
            ensure(order, 404, 'Sticker request not found.');
            ensure(order.status === body.previousStatus, 409, 'This request changed. Refresh it before saving.');
            const transitions = { requested: ['processing', 'cancelled'], processing: ['shipped', 'fulfilled', 'cancelled'], shipped: ['fulfilled'], fulfilled: [], cancelled: [] };
            ensure(transitions[order.status].includes(body.status), 400, 'Choose the next fulfillment step.');
            order.status = body.status; order.tracking = tracking; order.history.push({ status: body.status, at: new Date(at).toISOString(), tracking });
            audit(d, 'sticker_status_updated', 'owner', order.id, at, { status: body.status });
          });
          return respond({ saved: true });
        }
        if (path === 'owner/paid' && req.method === 'POST') {
          const reference = text(body.reference, 160);
          const candidate = s.referrals.find(r => r.id === body.id);
          ensure(candidate?.status === 'earned' && candidate.jobId, 409, 'This referral is not ready for payment.');
          ensure(completed(await providers.getJob(candidate.jobId)), 409, 'Housecall Pro no longer shows a completed delivery. Review it before marking paid.');
          await repo.change(d => {
            const r = d.referrals.find(r => r.id === body.id), tech = d.techs.find(t => t.id === r.techId);
            ensure(r.status === 'earned', 409, 'This payment was already recorded or changed.');
            const retained = d.deletionRequests.find(v => v.techId === r.techId && v.status === 'settle_and_erase');
            const payout = tech?.payout || retained?.payout;
            ensure(payout && payout.version === body.payoutVersion, 409, 'Payout details changed. Refresh and check the recipient before recording payment.');
            r.status = 'paid'; r.paidAt = new Date(at).toISOString(); r.paymentReference = reference; r.paidTo = structuredClone(payout);
            if (retained && !d.referrals.some(v => v.techId === r.techId && !['paid', 'cancelled'].includes(v.status))) { retained.payout = null; retained.name = null; retained.status = 'settled'; }
            audit(d, 'payment_recorded', 'owner', r.id, at, { amountCents: r.bountyCents, reference });
          });
          return respond({ recorded: true });
        }
        if (path === 'owner/sync' && req.method === 'POST') return respond(await syncCompletions({ repo, providers, now }));
        if (path === 'owner/launch' && req.method === 'POST') {
          ensure(body.legacyReconciled === true, 400, 'Reconcile legacy referral records before enabling bookings.');
          ensure(providers.verificationReady(), 503, 'Activate phone verification first.');
          if (body.bookingEnabled === true) ensure(preview || env.PARTNER_BOOKING_ENABLED === 'true', 503, 'Live booking is still disabled in the deployment settings. Finish the launch review before enabling it.');
          await repo.change(d => { d.launch = { legacyReconciled: true, bookingEnabled: body.bookingEnabled === true }; audit(d, 'launch_settings_updated', 'owner', null, at, d.launch); });
          return respond({ saved: true });
        }
      }
      throw new AppError(404, 'This action was not found.');
    } catch (error) {
      return respond({ error: error instanceof AppError ? error.message : 'The service is temporarily unavailable. Please try again.' }, error instanceof AppError ? error.status : 503);
    }
  };
}

export async function syncCompletions({ repo, providers, now = () => Date.now(), maxJobs = 20, deadline = Date.now() + 20000 }) {
  const s = await repo.read();
  const candidates = s.referrals.filter(r => r.jobId && ['booked', 'earned'].includes(r.status));
  const start = candidates.length ? (s.syncCursor || 0) % candidates.length : 0;
  const ordered = [...candidates.slice(start), ...candidates.slice(0, start)];
  let checked = 0, failures = 0, attempted = 0;
  for (const candidate of ordered) {
    if (attempted >= maxJobs || Date.now() >= deadline) break;
    attempted++;
    try {
      const job = await providers.getJob(candidate.jobId);
      await repo.change(d => {
        const r = d.referrals.find(v => v.id === candidate.id);
        if (!['booked', 'earned'].includes(r.status)) return;
        const status = completed(job) ? 'earned' : job.canceled_at || job.deleted_at || /cancel/i.test(job.work_status || '') ? 'cancelled' : 'booked';
        if (r.status !== status) { r.status = status; audit(d, 'delivery_status_synced', 'system', r.id, now(), { status }); }
      });
      checked++;
    } catch { failures++; }
  }
  const partial = attempted < candidates.length;
  await repo.change(d => { d.syncCursor = candidates.length ? (start + attempted) % candidates.length : 0; d.lastSync = { at: new Date(now()).toISOString(), checked, failures, partial }; });
  return { checked, failures, partial };
}
