import type { FastifyInstance } from 'fastify';
import { db } from '@embedo/db';
import { createLogger } from '@embedo/utils';

const log = createLogger('api:track');

// 1x1 transparent GIF
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
);

export async function trackRoutes(app: FastifyInstance): Promise<void> {
  app.get('/track/open/:pixelId', async (request, reply) => {
    const { pixelId } = request.params as { pixelId: string };

    // Fire-and-forget — don't block the pixel response
    setImmediate(async () => {
      try {
        const message = await db.outreachMessage.findUnique({
          where: { trackingPixelId: pixelId },
          select: { id: true, openedAt: true, prospectId: true },
        });

        if (!message || message.openedAt) return; // Already tracked or not found

        await db.outreachMessage.update({
          where: { id: message.id },
          data: { openedAt: new Date(), status: 'OPENED' },
        });

        await db.prospectBusiness.update({
          where: { id: message.prospectId },
          data: { status: 'OPENED' },
        });

        log.info({ pixelId, messageId: message.id }, 'Email open tracked');
      } catch (err) {
        log.error({ err, pixelId }, 'Failed to track email open');
      }
    });

    return reply
      .header('Content-Type', 'image/gif')
      .header('Cache-Control', 'no-store, no-cache, must-revalidate')
      .header('Pragma', 'no-cache')
      .send(TRANSPARENT_GIF);
  });
}
