import { AppError, ensure, easternTime } from './state.mjs';

export function createProviders(env = process.env, fetcher = fetch) {
  async function call(url, options = {}) {
    const response = await fetcher(url, { ...options, signal: AbortSignal.timeout(22000) });
    const data = await response.json();
    if (!response.ok) throw new AppError(response.status === 429 ? 429 : 502, response.status === 429 ? 'Please wait before trying again.' : 'A connected service could not complete this request.');
    return data;
  }
  const hcp = (path, method = 'GET', body) => {
    ensure(env.HCP_API_KEY, 503, 'Housecall Pro is not configured.');
    return call('https://api.housecallpro.com' + path, { method, headers: { Authorization: 'Token ' + env.HCP_API_KEY, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  };
  const verify = (path, fields) => {
    ensure(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_VERIFY_SERVICE_SID, 503, 'Phone verification is not configured.');
    return call(`https://verify.twilio.com/v2/Services/${env.TWILIO_VERIFY_SERVICE_SID}/${path}`, { method: 'POST', headers: { Authorization: 'Basic ' + Buffer.from(env.TWILIO_ACCOUNT_SID + ':' + env.TWILIO_AUTH_TOKEN).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(fields).toString() });
  };
  return {
    verificationReady: () => Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_VERIFY_SERVICE_SID && env.PARTNER_VERIFICATION_ENABLED === 'true'),
    startVerification: number => verify('Verifications', { To: number, Channel: 'sms' }),
    async checkVerification(number, code) {
      try { return (await verify('VerificationCheck', { To: number, Code: code })).status === 'approved'; }
      catch (error) { if (error.status === 429) throw error; return false; }
    },
    async availability(fields) {
      ensure(env.PARTNER_AVAILABILITY_KEY, 503, 'Availability is not configured.');
      return call('https://primary-production-5c84.up.railway.app/webhook/partner_check_availability', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-partner-key': env.PARTNER_AVAILABILITY_KEY }, body: JSON.stringify(fields) });
    },
    getJob: jobId => hcp('/jobs/' + encodeURIComponent(jobId)),
    async createBooking(r) {
      ensure(env.PARTNER_BOOKING_ENABLED === 'true', 503, 'Live booking is not activated.');
      const note = `PARTNER REFERRAL | Ref: ${r.id} | Company ID: ${r.companyId} | Technician ID: ${r.techId} | Source: ${r.source} | Referred by: ${r.techName} (${r.companyName}) | Water: ${r.waterType} | Salt: ${r.waterType === 'well' ? 'Iron-Fighting Salt (Green Bag)' : 'Morton Pellets'}${r.notes ? ' | Driver notes: ' + r.notes : ''}`;
      const matches = [];
      const digits = value => String(value || '').replace(/\D/g, '').slice(-10);
      const norm = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      for (let page = 1; page <= 100; page++) {
        const data = await hcp('/customers?q=' + encodeURIComponent(digits(r.customerPhone)) + '&page_size=100&page=' + page);
        ensure(Array.isArray(data.customers), 502, 'Customer lookup did not complete.');
        matches.push(...data.customers.filter(c => [c.mobile_number, c.home_number, c.work_number].some(v => digits(v) === digits(r.customerPhone))));
        if (Number(data.total_pages) ? page >= Number(data.total_pages) : data.customers.length < 100) break;
        ensure(page < 100, 502, 'Customer lookup requires owner review.');
      }
      const unique = [...new Map(matches.map(c => [c.id, c])).values()];
      ensure(unique.length <= 1, 409, 'Multiple customer records match this phone. Contact Evan before booking.');
      let customer = unique[0], address;
      if (customer) {
        address = customer.addresses?.find(a => norm(a.street) === norm(r.street) && norm(a.city) === norm(r.city) && String(a.zip).slice(0, 5) === r.zip);
        ensure(address?.id, 409, 'An existing customer has a different service address. Contact Evan to verify the correct property.');
      } else {
        const names = r.customerName.split(/\s+/);
        customer = await hcp('/customers', 'POST', { first_name: names.shift(), last_name: names.join(' '), mobile_number: r.customerPhone, email: r.email, addresses: [{ street: r.street, city: r.city, state: 'IN', zip: r.zip }], tags: ['partner-referral'], notes: note });
        address = customer.addresses?.[0];
      }
      ensure(customer?.id && address?.id, 502, 'The customer address was not confirmed.');
      const start = easternTime(r.scheduledDate, r.scheduledTime);
      return hcp('/jobs', 'POST', { customer_id: customer.id, address_id: address.id, schedule: { scheduled_start: start, scheduled_end: new Date(Date.parse(start) + 3600000).toISOString() }, notes: note, tags: ['partner-referral'] });
    }
  };
}
