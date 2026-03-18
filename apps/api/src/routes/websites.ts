import type { FastifyInstance } from 'fastify';

const WEBSITE_GEN_URL = process.env['WEBSITE_GEN_URL'] ?? 'http://localhost:3007';

export async function websiteRoutes(app: FastifyInstance) {
  // Proxy scrape
  app.post('/websites/scrape', async (req, reply) => {
    const res = await fetch(`${WEBSITE_GEN_URL}/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await res.json();
    return reply.code(res.status).send(data);
  });

  // Proxy generate
  app.post('/websites/generate', async (req, reply) => {
    const res = await fetch(`${WEBSITE_GEN_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await res.json();
    return reply.code(res.status).send(data);
  });

  // Proxy AI edit
  app.post<{ Params: { websiteId: string } }>('/websites/:websiteId/edit', async (req, reply) => {
    const res = await fetch(`${WEBSITE_GEN_URL}/websites/${req.params.websiteId}/edit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await res.json();
    return reply.code(res.status).send(data);
  });

  // Proxy get current website for a business
  app.get<{ Params: { businessId: string } }>('/websites/:businessId', async (req, reply) => {
    const res = await fetch(`${WEBSITE_GEN_URL}/websites/${req.params.businessId}`);
    const data = await res.json();
    return reply.code(res.status).send(data);
  });

  // Proxy preview HTML
  app.get<{ Params: { websiteId: string } }>('/websites/preview/:websiteId', async (req, reply) => {
    const res = await fetch(`${WEBSITE_GEN_URL}/preview/${req.params.websiteId}`);
    const html = await res.text();
    return reply.type('text/html').code(res.status).send(html);
  });
}
