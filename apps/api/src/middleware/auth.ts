import type { FastifyRequest, FastifyReply } from 'fastify';
import { createClient } from '@supabase/supabase-js';
import { createLogger, UnauthorizedError } from '@embedo/utils';
import { env } from '../config.js';

const log = createLogger('api:auth');

const supabase = createClient(env.SUPABASE_URL ?? '', env.SUPABASE_SERVICE_ROLE_KEY ?? '');

/**
 * Verify Supabase JWT from Authorization header.
 * Attaches `request.user` on success.
 */
export async function requireAuth(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const token = request.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    throw new UnauthorizedError('Authorization header required');
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    log.warn({ error }, 'Auth failed');
    throw new UnauthorizedError('Invalid or expired token');
  }

  (request as FastifyRequest & { user: typeof data.user }).user = data.user;
}

/**
 * Optional auth — does not throw if no token present.
 */
export async function optionalAuth(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const token = request.headers.authorization?.replace('Bearer ', '');
  if (!token) return;

  const { data } = await supabase.auth.getUser(token);
  if (data.user) {
    (request as FastifyRequest & { user: typeof data.user }).user = data.user;
  }
}
