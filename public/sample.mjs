// Public, explicitly labeled sample workspace. It has no network or provider access.
// It exercises the same screens with disposable, in-memory records.
export const sampleCompanies = [
  ['peterman', 'Peterman Brothers', 'Plumbing'], ['abode', 'Abode Home Concierge', 'Home care'],
  ['prime', 'Prime Plumbing & Drains', 'Plumbing'], ['simplywater', 'Simply Water', 'Water treatment']
].map(([id, name, kind]) => ({ id, name, kind, bountyCents: 2500, logo: `logos/${id}.png`, photo: { path: `mockups/${id}-v1.png`, caption: 'Illustrative sticker mockup' } }));

export function createSampleClient(companies = sampleCompanies, clock = () => new Date()) {
  const company = structuredClone(companies.find(c => c.id === 'prime') || sampleCompanies[2]);
  company.design = { id: 'sample-artwork', name: 'Sample sticker preview — not for printing', version: 1 };
  const day = offset => { const d = clock(); d.setUTCDate(d.getUTCDate() + offset); return d.toISOString().slice(0, 10); };
  const state = {
    profile: { id: 'sample-technician', name: 'Sample Technician', phone: '+13175550101', companyId: company.id, company, membership: 'active', payout: null },
    totals: {}, historyReady: true, bookingEnabled: true, orders: [],
    referrals: ['paid', 'earned', 'booked'].map((status, i) => ({ id: `sample-referral-${i}`, customerName: `Sample customer ${i + 1}`, scheduledDate: day(i - 7), status, bountyCents: 2500 }))
  };
  const seenBookings = new Map(), seenOrders = new Map();
  return async (path, body) => {
    if (path === 'me') {
      state.totals = { pending: 0, earned: 0, paid: 0 };
      for (const r of state.referrals) state.totals[r.status === 'booked' ? 'pending' : r.status] += r.bountyCents;
      return structuredClone(state);
    }
    if (path === 'profile') {
      state.profile.name = body.name;
      if (body.payout) state.profile.payout = structuredClone(body.payout);
      if (body.removePayout) state.profile.payout = null;
      return { profile: structuredClone(state.profile) };
    }
    if (path === 'availability') return { quoteId: 'sample-quote', options: [1, 3].map(i => ({ date: day(i), ideal: i === 1, route_note: 'Sample availability only', open_day: true, best: { scheduled_time: '09:00', window: '9:00–10:00 AM' } })) };
    if (path === 'bookings') {
      if (seenBookings.has(body.requestId)) return seenBookings.get(body.requestId);
      const id = `sample-referral-${state.referrals.length}`;
      state.referrals.push({ id, customerName: body.customerName, scheduledDate: body.date, status: 'booked', bountyCents: 2500 });
      const result = { booked: true, referralId: id }; seenBookings.set(body.requestId, result); return result;
    }
    if (path === 'stickers') {
      if (seenOrders.has(body.requestId)) return structuredClone(seenOrders.get(body.requestId));
      const order = { id: `sample-order-${state.orders.length}`, quantity: body.quantity, shipping: structuredClone(body.shipping), design: structuredClone(company.design), status: 'requested', history: [{ status: 'requested', at: clock().toISOString() }] };
      state.orders.push(order); const result = { order }; seenOrders.set(body.requestId, result); return structuredClone(result);
    }
    if (path === 'account') {
      if (body.confirm !== 'DELETE') throw new Error('Type DELETE to confirm.');
      state.profile = null; state.referrals = []; state.orders = []; return { deleted: true };
    }
    if (path === 'auth/logout') return { signedOut: true };
    throw new Error('This action is unavailable in the sample workspace.');
  };
}
