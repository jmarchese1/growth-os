// Website routes — proxies to website-gen service
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

  // Proxy generate — no timeout, AI generation can take a while
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
    // Allow iframe embedding from any origin
    return reply
      .header('X-Frame-Options', 'ALLOWALL')
      .header('Content-Security-Policy', "frame-ancestors *")
      .header('Access-Control-Allow-Origin', '*')
      .type('text/html')
      .code(res.status)
      .send(html);
  });

  // Proxy extract-menu
  app.post('/websites/extract-menu', async (req, reply) => {
    const res = await fetch(`${WEBSITE_GEN_URL}/extract-menu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await res.json();
    return reply.code(res.status).send(data);
  });

  // Proxy DALL-E 3 image generation
  app.post('/websites/generate-image', async (req, reply) => {
    const res = await fetch(`${WEBSITE_GEN_URL}/generate-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await res.json();
    return reply.code(res.status).send(data);
  });

  // Proxy version history
  app.get<{ Params: { websiteId: string } }>('/websites/:websiteId/versions', async (req, reply) => {
    const res = await fetch(`${WEBSITE_GEN_URL}/websites/${req.params.websiteId}/versions`);
    const data = await res.json();
    return reply.code(res.status).send(data);
  });

  // Proxy rename version
  app.patch<{ Params: { websiteId: string; versionId: string } }>('/websites/:websiteId/versions/:versionId', async (req, reply) => {
    const res = await fetch(`${WEBSITE_GEN_URL}/websites/${req.params.websiteId}/versions/${req.params.versionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await res.json();
    return reply.code(res.status).send(data);
  });

  // Proxy revert to version
  app.post<{ Params: { websiteId: string; versionId: string } }>('/websites/:websiteId/revert/:versionId', async (req, reply) => {
    const res = await fetch(`${WEBSITE_GEN_URL}/websites/${req.params.websiteId}/revert/${req.params.versionId}`, {
      method: 'POST',
    });
    const data = await res.json();
    return reply.code(res.status).send(data);
  });

  // Proxy custom domain
  app.post<{ Params: { websiteId: string } }>('/websites/:websiteId/domain', async (req, reply) => {
    const res = await fetch(`${WEBSITE_GEN_URL}/websites/${req.params.websiteId}/domain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await res.json();
    return reply.code(res.status).send(data);
  });

  // Proxy contact form submissions (public — called from generated websites)
  app.post('/websites/contact-form', async (req, reply) => {
    const res = await fetch(`${WEBSITE_GEN_URL}/contact-form`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await res.json();
    return reply.code(res.status).send(data);
  });
}
