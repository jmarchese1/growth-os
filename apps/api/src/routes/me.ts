import type { FastifyInstance } from 'fastify';
import { db } from '@embedo/db';
import type { BusinessType } from '@embedo/db';
import { createLogger } from '@embedo/utils';

const log = createLogger('api:me');

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

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
            subscription: true,
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
              subscription: true,
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
            subscription: user.business.subscription,
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
      data: updateData as Record<string, unknown>,
    });

    log.info({ businessId: user.businessId, fields: Object.keys(updateData) }, 'Business profile updated');

    return { success: true, business: updated };
  });

  /**
   * GET /me/match-business?supabaseId=xxx
   * Checks if a business already exists in the CRM that matches the user's email.
   * Used to show "import existing business" prompt during onboarding.
   */
  app.get('/me/match-business', async (request, reply) => {
    const { supabaseId } = request.query as { supabaseId?: string };

    if (!supabaseId) {
      return reply.code(400).send({ success: false, error: 'supabaseId is required' });
    }

    const user = await db.user.findUnique({
      where: { supabaseId },
      select: { email: true, businessId: true },
    });

    if (!user) {
      return reply.code(404).send({ success: false, error: 'User not found' });
    }

    // Already has a business
    if (user.businessId) {
      return { success: true, match: null, alreadyLinked: true };
    }

    // Try to find a business with matching email
    const matchedBusiness = await db.business.findFirst({
      where: { email: user.email },
      select: {
        id: true,
        name: true,
        type: true,
        phone: true,
        email: true,
        website: true,
        address: true,
        status: true,
      },
    });

    return {
      success: true,
      match: matchedBusiness ?? null,
      alreadyLinked: false,
    };
  });

  /**
   * POST /me/business
   * Creates a new business and links it to the current user, or imports an existing one.
   */
  app.post('/me/business', async (request, reply) => {
    const { supabaseId } = request.query as { supabaseId?: string };

    if (!supabaseId) {
      return reply.code(400).send({ success: false, error: 'supabaseId is required' });
    }

    const user = await db.user.findUnique({
      where: { supabaseId },
      select: { id: true, businessId: true },
    });

    if (!user) {
      return reply.code(404).send({ success: false, error: 'User not found' });
    }

    if (user.businessId) {
      return reply.code(409).send({ success: false, error: 'User already has a business linked' });
    }

    const body = request.body as {
      importBusinessId?: string;
      name?: string;
      type?: string;
      phone?: string;
      email?: string;
      website?: string;
      address?: Record<string, string>;
      timezone?: string;
    };

    let businessId: string;

    if (body.importBusinessId) {
      // Import an existing business — link user to it
      const existing = await db.business.findUnique({
        where: { id: body.importBusinessId },
      });

      if (!existing) {
        return reply.code(404).send({ success: false, error: 'Business not found' });
      }

      businessId = existing.id;
      log.info({ userId: user.id, businessId }, 'User importing existing business profile');
    } else {
      // Create a new business
      if (!body.name?.trim()) {
        return reply.code(400).send({ success: false, error: 'Business name is required' });
      }

      // Generate unique slug
      let baseSlug = slugify(body.name);
      let slug = baseSlug;
      let attempt = 0;
      while (await db.business.findUnique({ where: { slug } })) {
        attempt++;
        slug = `${baseSlug}-${attempt}`;
      }

      const validTypes: string[] = ['RESTAURANT', 'SALON', 'RETAIL', 'FITNESS', 'MEDICAL', 'OTHER'];
      const businessType = (body.type && validTypes.includes(body.type))
        ? body.type as BusinessType
        : 'RESTAURANT' as BusinessType;

      const newBusiness = await db.business.create({
        data: {
          name: body.name.trim(),
          slug,
          type: businessType,
          phone: body.phone ?? null,
          email: body.email ?? null,
          website: body.website ?? null,
          ...(body.address ? { address: body.address as object } : {}),
          timezone: body.timezone ?? 'America/New_York',
        },
      });

      businessId = newBusiness.id;
      log.info({ userId: user.id, businessId, name: body.name }, 'New business created via self-service');
    }

    // Link user to business and set as ADMIN
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: { businessId, role: 'ADMIN' },
      include: {
        business: {
          include: {
            subscription: true,
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

    // Apply any additional edits on import
    if (body.importBusinessId && updatedUser.business) {
      const editFields: Record<string, unknown> = {};
      if (body.name?.trim()) editFields['name'] = body.name.trim();
      if (body.phone) editFields['phone'] = body.phone;
      if (body.email) editFields['email'] = body.email;
      if (body.website) editFields['website'] = body.website;
      if (body.address) editFields['address'] = body.address;
      if (body.timezone) editFields['timezone'] = body.timezone;

      if (Object.keys(editFields).length > 0) {
        await db.business.update({
          where: { id: businessId },
          data: editFields,
        });
      }
    }

    return {
      success: true,
      user: {
        id: updatedUser.id,
        supabaseId: updatedUser.supabaseId,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        businessId: updatedUser.businessId,
      },
      business: updatedUser.business
        ? {
            id: updatedUser.business.id,
            name: updatedUser.business.name,
            slug: updatedUser.business.slug,
            type: updatedUser.business.type,
            status: updatedUser.business.status,
            phone: updatedUser.business.phone,
            email: updatedUser.business.email,
            website: updatedUser.business.website,
            address: updatedUser.business.address,
            timezone: updatedUser.business.timezone,
            elevenLabsAgentId: updatedUser.business.elevenLabsAgentId,
            twilioPhoneNumber: updatedUser.business.twilioPhoneNumber,
            instagramPageId: updatedUser.business.instagramPageId,
            facebookPageId: updatedUser.business.facebookPageId,
            settings: updatedUser.business.settings,
            subscription: updatedUser.business.subscription,
            counts: updatedUser.business._count,
            createdAt: updatedUser.business.createdAt,
          }
        : null,
    };
  });
}
