import type { FastifyInstance } from 'fastify';
import { db } from '@embedo/db';
import { createLogger } from '@embedo/utils';

const log = createLogger('api:me');

export async function meRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /me?supabaseId=xxx
   * Resolves the current Supabase user to their User + Business record.
   * Auto-creates a User record on first login if one doesn't exist.
   */
  app.get('/me', async (request, reply) => {
    const { supabaseId, email } = request.query as { supabaseId?: string; email?: string };

    if (!supabaseId) {
      return reply.code(400).send({ success: false, error: 'supabaseId is required' });
    }

    // Look up existing user
    let user = await db.user.findUnique({
      where: { supabaseId },
      include: {
        business: {
          include: {
            _count: {
              select: {
                contacts: true,
                callLogs: true,
                chatSessions: true,
                appointments: true,
                leads: true,
              },
            },
          },
        },
      },
    });

    // Auto-create User record on first login
    if (!user && email) {
      log.info({ supabaseId, email }, 'Creating new User record for first-time login');
      user = await db.user.create({
        data: {
          supabaseId,
          email,
          role: 'ADMIN',
        },
        include: {
          business: {
            include: {
              _count: {
                select: {
                  contacts: true,
                  callLogs: true,
                  chatSessions: true,
                  appointments: true,
                  leads: true,
                },
              },
            },
          },
        },
      });
    }

    if (!user) {
      return reply.code(404).send({ success: false, error: 'User not found' });
    }

    // Update last login
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      success: true,
      user: {
        id: user.id,
        supabaseId: user.supabaseId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        businessId: user.businessId,
      },
      business: user.business
        ? {
            id: user.business.id,
            name: user.business.name,
            slug: user.business.slug,
            type: user.business.type,
            status: user.business.status,
            phone: user.business.phone,
            email: user.business.email,
            website: user.business.website,
            address: user.business.address,
            timezone: user.business.timezone,
            elevenLabsAgentId: user.business.elevenLabsAgentId,
            twilioPhoneNumber: user.business.twilioPhoneNumber,
            instagramPageId: user.business.instagramPageId,
            facebookPageId: user.business.facebookPageId,
            settings: user.business.settings,
            counts: user.business._count,
            createdAt: user.business.createdAt,
          }
        : null,
    };
  });

  /**
   * PATCH /me/business
   * Update the current user's business profile.
   */
  app.patch('/me/business', async (request, reply) => {
    const { supabaseId } = request.query as { supabaseId?: string };

    if (!supabaseId) {
      return reply.code(400).send({ success: false, error: 'supabaseId is required' });
    }

    const user = await db.user.findUnique({
      where: { supabaseId },
      select: { businessId: true },
    });

    if (!user?.businessId) {
      return reply.code(404).send({ success: false, error: 'No business associated with this user' });
    }

    const body = request.body as Record<string, unknown>;
    const allowedFields = ['name', 'phone', 'email', 'website', 'address', 'timezone', 'type'];
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return reply.code(400).send({ success: false, error: 'No valid fields to update' });
    }

    const updated = await db.business.update({
      where: { id: user.businessId },
      data: updateData,
    });

    log.info({ businessId: user.businessId, fields: Object.keys(updateData) }, 'Business profile updated');

    return { success: true, business: updated };
  });
}
