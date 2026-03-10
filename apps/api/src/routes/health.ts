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
}
