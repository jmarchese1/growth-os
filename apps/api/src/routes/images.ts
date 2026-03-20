import type { FastifyInstance } from 'fastify';
import { db } from '@embedo/db';

const WEBSITE_GEN_URL = process.env['WEBSITE_GEN_URL'] ?? 'http://localhost:3007';

const PEXELS_API_KEY = process.env['PEXELS_API_KEY'] ?? '';

export async function imageRoutes(app: FastifyInstance) {
  // GET /images/search-pexels — search Pexels for free stock photos
  app.get<{ Querystring: { query: string } }>('/images/search-pexels', async (req, reply) => {
    const { query } = req.query;
    if (!query) return reply.code(400).send({ success: false, error: 'query required' });

    // Try Pexels API if key available
    if (PEXELS_API_KEY) {
      try {
        const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=12&orientation=landscape`, {
          headers: { Authorization: PEXELS_API_KEY },
        });
        if (res.ok) {
          const data = await res.json() as { photos: Array<{ src: { large: string; medium: string }; alt: string; photographer: string }> };
          return reply.send({
            success: true,
            images: data.photos.map(p => ({ url: p.src.large, alt: p.alt || query, photographer: p.photographer })),
          });
        }
      } catch { /* fall through */ }
    }

    // Fallback: proxy through website-gen which may have the key
    try {
      const res = await fetch(`${WEBSITE_GEN_URL}/search-pexels?query=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        return reply.send(data);
      }
    } catch { /* fall through */ }

    return reply.send({ success: true, images: [] });
  });

  // GET /images — list all images for a business
  app.get<{ Querystring: { businessId: string; category?: string; source?: string; favorite?: string } }>('/images', async (req, reply) => {
    const { businessId, category, source, favorite } = req.query;
    if (!businessId) return reply.code(400).send({ success: false, error: 'businessId required' });

    const where: Record<string, unknown> = { businessId };
    if (category) where['category'] = category;
    if (source) where['source'] = source;
    if (favorite === 'true') where['favorite'] = true;

    const images = await db.imageAsset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return reply.send({ success: true, images });
  });

  // POST /images/generate — generate an image with DALL-E 3 and save to library
  app.post<{ Body: { businessId: string; prompt: string; size?: string; quality?: string; category?: string } }>('/images/generate', async (req, reply) => {
    const { businessId, prompt, size = '1024x1024', quality = 'standard', category } = req.body;
    if (!businessId || !prompt?.trim()) return reply.code(400).send({ success: false, error: 'businessId and prompt required' });

    // Proxy to website-gen which has the OPENAI_API_KEY
    const genRes = await fetch(`${WEBSITE_GEN_URL}/generate-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, size, quality }),
    });
    const genData = await genRes.json() as { success: boolean; imageUrl?: string; revisedPrompt?: string; error?: string };

    if (!genData.success || !genData.imageUrl) {
      return reply.code(genRes.status).send({ success: false, error: genData.error ?? 'Image generation failed' });
    }

    // Save to image library
    const image = await db.imageAsset.create({
      data: {
        businessId,
        url: genData.imageUrl,
        prompt: genData.revisedPrompt ?? prompt,
        source: 'dalle',
        alt: prompt.slice(0, 200),
        category: category ?? 'general',
        width: parseInt(size.split('x')[0] ?? '1024'),
        height: parseInt(size.split('x')[1] ?? '1024'),
      },
    });

    return reply.send({ success: true, image });
  });

  // POST /images/save — save an external image URL to the library
  app.post<{ Body: { businessId: string; url: string; alt?: string; category?: string; source?: string } }>('/images/save', async (req, reply) => {
    const { businessId, url, alt, category, source = 'upload' } = req.body;
    if (!businessId || !url) return reply.code(400).send({ success: false, error: 'businessId and url required' });

    const image = await db.imageAsset.create({
      data: {
        businessId,
        url,
        source,
        alt: alt ?? '',
        category: category ?? 'general',
      },
    });

    return reply.send({ success: true, image });
  });

  // PATCH /images/:id — update image metadata (category, alt, favorite)
  app.patch<{ Params: { id: string }; Body: { alt?: string; category?: string; favorite?: boolean } }>('/images/:id', async (req, reply) => {
    const { id } = req.params;
    const { alt, category, favorite } = req.body;

    const image = await db.imageAsset.update({
      where: { id },
      data: {
        ...(alt !== undefined ? { alt } : {}),
        ...(category !== undefined ? { category } : {}),
        ...(favorite !== undefined ? { favorite } : {}),
      },
    });

    return reply.send({ success: true, image });
  });

  // DELETE /images/:id — delete an image
  app.delete<{ Params: { id: string } }>('/images/:id', async (req, reply) => {
    await db.imageAsset.delete({ where: { id: req.params.id } });
    return reply.send({ success: true });
  });
}
