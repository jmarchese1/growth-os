import type { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => ({
    ok: true,
    service: 'embedo-api',
    timestamp: new Date().toISOString(),
    version: process.env['npm_package_version'] ?? '0.1.0',
  }));

  app.get('/health/ready', async (_request, reply) => {
    // Could check DB connectivity here
    return reply.code(200).send({ ready: true });
  });

  // Temporary debug: check which Stripe env vars are set (no values exposed)
  app.get('/health/stripe', async () => ({
    STRIPE_SECRET_KEY: !!process.env['STRIPE_SECRET_KEY'],
    STRIPE_WEBHOOK_SECRET: !!process.env['STRIPE_WEBHOOK_SECRET'],
    STRIPE_PRICE_SOLO: !!process.env['STRIPE_PRICE_SOLO'],
    STRIPE_PRICE_SMALL: !!process.env['STRIPE_PRICE_SMALL'],
    STRIPE_PRICE_MEDIUM: !!process.env['STRIPE_PRICE_MEDIUM'],
    STRIPE_PRICE_LARGE: !!process.env['STRIPE_PRICE_LARGE'],
  }));
}
