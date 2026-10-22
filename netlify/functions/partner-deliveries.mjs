import { getStore } from '@netlify/blobs';
import { Repository } from '../../server/state.mjs';
import { createProviders } from '../../server/providers.mjs';
import { syncCompletions } from '../../server/api.mjs';

export default async () => {
  if (process.env.PARTNER_BOOKING_ENABLED !== 'true') return new Response('Not activated');
  const result = await syncCompletions({ repo: new Repository(getStore({ name: 'salt-partners-v2', consistency: 'strong' })), providers: createProviders() });
  return Response.json(result);
};
export const config = { schedule: '*/5 * * * *' };
