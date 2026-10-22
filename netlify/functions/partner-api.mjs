import { getStore } from '@netlify/blobs';
import { Repository } from '../../server/state.mjs';
import { createHandler } from '../../server/api.mjs';
import { createProviders } from '../../server/providers.mjs';

const store = () => getStore({ name: 'salt-partners-v2', consistency: 'strong' });
const assets = {
  put: (id, bytes, contentType) => store().set('designs/' + id, bytes, { metadata: { contentType } }),
  async response(id, cors) {
    if (!/^[a-f0-9-]{36}$/.test(id)) return new Response('Not found', { status: 404 });
    const result = await store().getWithMetadata('designs/' + id, { type: 'arrayBuffer' });
    if (!result) return new Response('Not found', { status: 404 });
    return new Response(result.data, { headers: { ...cors, 'Content-Type': result.metadata.contentType, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  }
};
export default async function handler(req) {
  return createHandler({ repo: new Repository(store()), providers: createProviders(), assets })(req);
}
export const config = { path: ['/api/partners', '/api/partners/*'], rateLimit: { windowLimit: 100, windowSize: 60, aggregateBy: ['ip', 'domain'] } };
