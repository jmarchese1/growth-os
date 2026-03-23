import type { FastifyInstance } from 'fastify';
import Anthropic from '@anthropic-ai/sdk';
import sgMail from '@sendgrid/mail';
import twilio from 'twilio';
import { db } from '@embedo/db';
import type { OnboardingStatus, SocialPlatform } from '@embedo/db';
import { createLogger, NotFoundError } from '@embedo/utils';

const log = createLogger('api:businesses');

export async function businessRoutes(app: FastifyInstance): Promise<void> {
  // GET /businesses
  app.get('/businesses', async (request) => {
    const { page = '1', pageSize = '20', status } = request.query as Record<string, string>;
    const where = status ? { status: status as OnboardingStatus } : {};

    const [items, total] = await Promise.all([
      db.business.findMany({
        where,
        skip: (parseInt(page) - 1) * parseInt(pageSize),
        take: parseInt(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      db.business.count({ where }),
    ]);

    return { items, total, page: parseInt(page), pageSize: parseInt(pageSize) };
  });

  // GET /businesses/:id
  app.get('/businesses/:id', async (request) => {
    const { id } = request.params as { id: string };
    const business = await db.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundError('Business', id);
    return business;
  });

  // GET /businesses/:id/contacts
  app.get('/businesses/:id/contacts', async (request) => {
    const { id } = request.params as { id: string };
    const { page = '1', pageSize = '20', search, status, source } = request.query as Record<string, string>;

    const business = await db.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundError('Business', id);

    const where = {
      businessId: id,
      ...(status ? { status: status as 'LEAD' | 'PROSPECT' | 'CUSTOMER' | 'CHURNED' } : {}),
      ...(source ? { source: source as 'VOICE' | 'CHATBOT' | 'SURVEY' | 'SOCIAL' | 'WEBSITE' | 'MANUAL' | 'CALENDLY' | 'OUTBOUND' | 'QR_CODE' } : {}),
      ...(search ? {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' as const } },
          { lastName: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { phone: { contains: search, mode: 'insensitive' as const } },
        ],
      } : {}),
    };

    const [items, total] = await Promise.all([
      db.contact.findMany({
        where,
        skip: (parseInt(page) - 1) * parseInt(pageSize),
        take: parseInt(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      db.contact.count({ where }),
    ]);

    return { items, total, page: parseInt(page), pageSize: parseInt(pageSize) };
  });

  // GET /contacts/:contactId — direct contact detail lookup (also accessible as /businesses/:id/contacts/:contactId)
  app.get<{ Params: { contactId: string } }>('/contacts/:contactId', async (request) => {
    const { contactId } = request.params;

    const contact = await db.contact.findUnique({
      where: { id: contactId },
      include: {
        activities: { orderBy: { createdAt: 'desc' }, take: 50 },
        surveyResponses: {
          include: { survey: { select: { id: true, title: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        qrScans: {
          include: { qrCode: { select: { id: true, label: true, purpose: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        appointments: { orderBy: { startTime: 'desc' }, take: 10 },
        chatSessions: { orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, channel: true, leadCaptured: true, createdAt: true } },
        callLogs: { orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, direction: true, duration: true, intent: true, sentiment: true, summary: true, createdAt: true } },
      },
    });

    if (!contact) throw new NotFoundError('Contact', contactId);
    return { success: true, contact };
  });

  // GET /businesses/:id/posts — content posts for social media page
  app.get('/businesses/:id/posts', async (request) => {
    const { id } = request.params as { id: string };
    const { page = '1', pageSize = '50' } = request.query as Record<string, string>;

    const business = await db.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundError('Business', id);

    const [items, total] = await Promise.all([
      db.contentPost.findMany({
        where: { businessId: id },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(pageSize),
        take: parseInt(pageSize),
      }),
      db.contentPost.count({ where: { businessId: id } }),
    ]);

    return { items, total, page: parseInt(page), pageSize: parseInt(pageSize) };
  });

  // GET /businesses/:id/website — latest generated website (kept for backward compat)
  app.get('/businesses/:id/website', async (request) => {
    const { id } = request.params as { id: string };
    const website = await db.generatedWebsite.findFirst({
      where: { businessId: id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, deployUrl: true, vercelProjectId: true, status: true, updatedAt: true, config: true },
    });
    return { success: true, website };
  });

  // GET /businesses/:id/websites — all generated websites for this business
  app.get('/businesses/:id/websites', async (request) => {
    const { id } = request.params as { id: string };
    const websites = await db.generatedWebsite.findMany({
      where: { businessId: id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, deployUrl: true, status: true, createdAt: true, updatedAt: true, config: true },
    });
    return { success: true, websites };
  });

  // DELETE /businesses/:id/websites/:websiteId — delete a generated website
  app.delete('/businesses/:id/websites/:websiteId', async (request) => {
    const { id, websiteId } = request.params as { id: string; websiteId: string };
    const website = await db.generatedWebsite.findUnique({ where: { id: websiteId } });
    if (!website) throw new NotFoundError('GeneratedWebsite', websiteId);
    if (website.businessId !== id) throw new NotFoundError('GeneratedWebsite', websiteId);
    await db.generatedWebsite.delete({ where: { id: websiteId } });
    return { success: true };
  });

  // GET /businesses/:id/dashboard — summary stats + recent activity
  app.get('/businesses/:id/dashboard', async (request) => {
    const { id } = request.params as { id: string };
    const business = await db.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundError('Business', id);

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      newContactsThisWeek,
      newContactsThisMonth,
      leadsCount,
      prospectsCount,
      customersCount,
      upcomingAppointments,
      recentActivities,
      recentSurveyResponses,
      recentQrScans,
    ] = await Promise.all([
      db.contact.count({ where: { businessId: id, createdAt: { gte: weekAgo } } }),
      db.contact.count({ where: { businessId: id, createdAt: { gte: monthStart } } }),
      db.contact.count({ where: { businessId: id, status: 'LEAD' } }),
      db.contact.count({ where: { businessId: id, status: 'PROSPECT' } }),
      db.contact.count({ where: { businessId: id, status: 'CUSTOMER' } }),
      db.appointment.findMany({
        where: { businessId: id, startTime: { gte: now }, status: { notIn: ['CANCELLED'] } },
        orderBy: { startTime: 'asc' },
        take: 5,
        select: { id: true, title: true, startTime: true, status: true, contactId: true },
      }),
      db.contactActivity.findMany({
        where: { businessId: id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { contact: { select: { id: true, firstName: true, lastName: true, email: true } } },
      }),
      db.surveyResponse.findMany({
        where: { survey: { businessId: id } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          survey: { select: { title: true } },
          contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      db.qrCodeScan.findMany({
        where: { qrCode: { businessId: id } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          qrCode: { select: { label: true, purpose: true } },
          contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
    ]);

    return {
      newContactsThisWeek,
      newContactsThisMonth,
      contactsByStatus: { leads: leadsCount, prospects: prospectsCount, customers: customersCount },
      upcomingAppointments,
      recentActivities,
      recentSurveyResponses,
      recentQrScans,
    };
  });

  // GET /businesses/:id/activities — paginated activity feed
  app.get('/businesses/:id/activities', async (request) => {
    const { id } = request.params as { id: string };
    const { page = '1', pageSize = '30' } = request.query as Record<string, string>;

    const business = await db.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundError('Business', id);

    const [items, total] = await Promise.all([
      db.contactActivity.findMany({
        where: { businessId: id },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(pageSize),
        take: parseInt(pageSize),
        include: { contact: { select: { id: true, firstName: true, lastName: true, email: true } } },
      }),
      db.contactActivity.count({ where: { businessId: id } }),
    ]);

    return { items, total, page: parseInt(page), pageSize: parseInt(pageSize) };
  });

  // POST /businesses/:id/contacts — manually create a contact
  app.post('/businesses/:id/contacts', async (request, reply) => {
    const { id } = request.params as { id: string };
    const business = await db.business.findUnique({ where: { id }, select: { id: true } });
    if (!business) throw new NotFoundError('Business', id);

    const body = request.body as {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      notes?: string;
    };

    if (!body.email && !body.phone) {
      return reply.code(400).send({ success: false, error: 'At least one of email or phone is required' });
    }

    // Upsert to avoid duplicates
    const contact = await db.contact.upsert({
      where: body.email
        ? { businessId_email: { businessId: id, email: body.email } }
        : { businessId_phone: { businessId: id, phone: body.phone! } },
      create: {
        businessId: id,
        source: 'MANUAL',
        ...(body.firstName ? { firstName: body.firstName.trim() } : {}),
        ...(body.lastName ? { lastName: body.lastName.trim() } : {}),
        ...(body.email ? { email: body.email.trim() } : {}),
        ...(body.phone ? { phone: body.phone.trim() } : {}),
        ...(body.notes ? { notes: body.notes.trim() } : {}),
      },
      update: {
        ...(body.firstName ? { firstName: body.firstName.trim() } : {}),
        ...(body.lastName ? { lastName: body.lastName.trim() } : {}),
        ...(body.notes ? { notes: body.notes.trim() } : {}),
      },
    });

    log.info({ businessId: id, contactId: contact.id }, 'Contact manually created');
    return { success: true, contact };
  });

  // POST /businesses/:id/posts/generate — AI content generation on demand
  app.post('/businesses/:id/posts/generate', async (request, reply) => {
    const { id } = request.params as { id: string };
    const business = await db.business.findUnique({ where: { id }, select: { id: true, name: true, type: true } });
    if (!business) throw new NotFoundError('Business', id);

    const { platform = 'INSTAGRAM', topic, scheduledAt } = request.body as { platform?: string; topic?: string; scheduledAt?: string };

    // Map client-side platform keys to Prisma enum values
    const platformMap: Record<string, string> = {
      INSTAGRAM: 'INSTAGRAM',
      FACEBOOK: 'FACEBOOK',
      GOOGLE: 'GOOGLE_MY_BUSINESS',
      TIKTOK: 'TIKTOK',
    };
    const prismaplatform = platformMap[platform] ?? 'INSTAGRAM';

    const platformGuidelines: Record<string, string> = {
      INSTAGRAM: 'Instagram post — engaging, visual storytelling. 150-200 character caption. Include 5-8 relevant hashtags at the end.',
      FACEBOOK: 'Facebook post — conversational, community-focused. 150-300 characters. Include 2-3 hashtags.',
      GOOGLE: 'Google Business post — professional, informative. 300-500 characters. Focus on specials or events.',
      TIKTOK: 'TikTok caption — punchy, energetic, trending. Under 150 characters. Include 3-5 trending hashtags.',
    };

    const guidelines = platformGuidelines[platform] ?? platformGuidelines['INSTAGRAM']!;
    const businessType = business.type.toLowerCase();

    const prompt = `Write social media content for ${business.name}, a ${businessType}.

Platform: ${platform}
Format: ${guidelines}
Tone: casual and authentic
${topic ? `Topic/Focus: ${topic}` : 'Create engaging general content about the business'}

Return ONLY a JSON object with:
- caption: the full post text including hashtags
- imagePrompt: a brief image description (under 40 words)`;

    try {
      const anthropic = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] ?? '' });
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content[0]?.type === 'text' ? response.content[0].text : '{}';
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned) as { caption: string; imagePrompt: string };

      const scheduledDate = scheduledAt ? new Date(scheduledAt) : undefined;
      const post = await db.contentPost.create({
        data: {
          businessId: id,
          platform: prismaplatform as SocialPlatform,
          caption: parsed.caption,
          hashtags: [],
          ...(scheduledDate ? { scheduledAt: scheduledDate, status: 'SCHEDULED' } : {}),
        },
      });

      log.info({ businessId: id, platform, postId: post.id }, 'AI content post generated');
      return { success: true, post };
    } catch (err) {
      log.error({ err, businessId: id }, 'Content generation failed');
      return reply.code(500).send({ success: false, error: 'Content generation failed' });
    }
  });

  // PATCH /contacts/:id — edit contact fields
  app.patch('/contacts/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const contact = await db.contact.findUnique({ where: { id }, select: { id: true } });
    if (!contact) return reply.code(404).send({ success: false, error: 'Contact not found' });

    const body = request.body as { firstName?: string; lastName?: string; email?: string; phone?: string; notes?: string; status?: string; tags?: string[] };
    const validStatuses = ['LEAD', 'PROSPECT', 'CUSTOMER', 'CHURNED'];
    const updated = await db.contact.update({
      where: { id },
      data: {
        ...(body.firstName !== undefined ? { firstName: body.firstName.trim() || null } : {}),
        ...(body.lastName !== undefined ? { lastName: body.lastName.trim() || null } : {}),
        ...(body.email !== undefined ? { email: body.email.trim() || null } : {}),
        ...(body.phone !== undefined ? { phone: body.phone.trim() || null } : {}),
        ...(body.notes !== undefined ? { notes: body.notes.trim() || null } : {}),
        ...(body.status && validStatuses.includes(body.status) ? { status: body.status as 'LEAD' | 'PROSPECT' | 'CUSTOMER' | 'CHURNED' } : {}),
        ...(body.tags !== undefined ? { tags: body.tags } : {}),
      },
    });
    log.info({ contactId: id }, 'Contact updated');
    return { success: true, contact: updated };
  });

  // POST /contacts/:id/notes — add a timestamped note to a contact
  app.post('/contacts/:id/notes', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { text: string };
    if (!body.text?.trim()) return reply.code(400).send({ success: false, error: 'text is required' });

    const contact = await db.contact.findUnique({ where: { id }, select: { id: true, businessId: true } });
    if (!contact) return reply.code(404).send({ success: false, error: 'Contact not found' });

    const activity = await db.contactActivity.create({
      data: {
        businessId: contact.businessId,
        contactId: id,
        type: 'NOTE',
        title: 'Note',
        description: body.text.trim(),
      },
    });
    log.info({ contactId: id }, 'Note added to contact');
    return { success: true, activity };
  });

  // POST /contacts/:id/send-survey — send a survey link via SMS or email
  app.post('/contacts/:id/send-survey', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { surveyId: string; channel: 'email' | 'sms'; surveyUrl: string };

    if (!body.surveyId || !body.channel || !body.surveyUrl) {
      return reply.code(400).send({ success: false, error: 'surveyId, channel, and surveyUrl are required' });
    }

    const contact = await db.contact.findUnique({
      where: { id },
      include: { business: { select: { name: true, twilioPhoneNumber: true } } },
    });
    if (!contact) return reply.code(404).send({ success: false, error: 'Contact not found' });

    const survey = await db.survey.findUnique({ where: { id: body.surveyId }, select: { title: true } });
    if (!survey) return reply.code(404).send({ success: false, error: 'Survey not found' });

    if (body.channel === 'email') {
      if (!contact.email) return reply.code(400).send({ success: false, error: 'Contact has no email address' });
      const sgKey = process.env['SENDGRID_API_KEY'];
      if (!sgKey) return reply.code(500).send({ success: false, error: 'Email not configured' });
      sgMail.setApiKey(sgKey);
      await sgMail.send({
        to: contact.email,
        from: { email: process.env['SENDGRID_FROM_EMAIL'] ?? 'jason@embedo.io', name: contact.business.name },
        subject: `We'd love your feedback — ${survey.title}`,
        html: `<p>Hi${contact.firstName ? ` ${contact.firstName}` : ''},</p><p>We'd love to hear your thoughts. Please take a moment to complete our short survey:</p><p><a href="${body.surveyUrl}" style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Take Survey</a></p><p style="margin-top:16px;font-size:12px;color:#888;">Or copy this link: ${body.surveyUrl}</p>`,
      });
    } else {
      if (!contact.phone) return reply.code(400).send({ success: false, error: 'Contact has no phone number' });
      const from = contact.business.twilioPhoneNumber ?? process.env['TWILIO_FROM_NUMBER'];
      if (!from) return reply.code(500).send({ success: false, error: 'No SMS number configured' });
      const tc = twilio(process.env['TWILIO_ACCOUNT_SID']!, process.env['TWILIO_AUTH_TOKEN']!);
      await tc.messages.create({
        to: contact.phone,
        from,
        body: `Hi${contact.firstName ? ` ${contact.firstName}` : ''}! ${contact.business.name} would love your feedback. Please take our short survey: ${body.surveyUrl}`,
      });
    }

    // Log activity
    await db.contactActivity.create({
      data: {
        businessId: contact.businessId,
        contactId: id,
        type: 'EMAIL',
        title: `Survey sent: ${survey.title}`,
        description: `Sent via ${body.channel.toUpperCase()}`,
      },
    });

    log.info({ contactId: id, surveyId: body.surveyId, channel: body.channel }, 'Survey sent to contact');
    return { success: true };
  });

  // PATCH /businesses/:id
  app.patch('/businesses/:id', async (request) => {
    const { id } = request.params as { id: string };
    const business = await db.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundError('Business', id);

    const data = request.body as Record<string, unknown>;
    const updated = await db.business.update({ where: { id }, data });
    log.info({ businessId: id }, 'Business updated');
    return updated;
  });

  // GET /businesses/:id/trends — daily counts for last N days (7, 30, or 90)
  app.get('/businesses/:id/trends', async (request) => {
    const { id } = request.params as { id: string };
    const query = request.query as { days?: string };
    const days = [7, 30, 90].includes(Number(query.days)) ? Number(query.days) : 30;
    const business = await db.business.findUnique({ where: { id }, select: { id: true } });
    if (!business) throw new NotFoundError('Business', id);

    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);

    // Build a complete array of date strings for the last N days
    const dateStrings: string[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      dateStrings.push(d.toISOString().slice(0, 10));
    }

    // Query daily counts in parallel using raw SQL for date grouping
    const [contactRows, callRows, chatRows, appointmentRows, qrScanRows] = await Promise.all([
      db.$queryRawUnsafe<Array<{ date: Date; count: bigint }>>(
        'SELECT DATE("createdAt") as date, COUNT(*)::bigint as count FROM "Contact" WHERE "businessId" = $1 AND "createdAt" >= $2 GROUP BY DATE("createdAt")',
        id, startDate,
      ),
      db.$queryRawUnsafe<Array<{ date: Date; count: bigint }>>(
        'SELECT DATE("createdAt") as date, COUNT(*)::bigint as count FROM "VoiceCallLog" WHERE "businessId" = $1 AND "createdAt" >= $2 GROUP BY DATE("createdAt")',
        id, startDate,
      ),
      db.$queryRawUnsafe<Array<{ date: Date; count: bigint }>>(
        'SELECT DATE("createdAt") as date, COUNT(*)::bigint as count FROM "ChatSession" WHERE "businessId" = $1 AND "createdAt" >= $2 GROUP BY DATE("createdAt")',
        id, startDate,
      ),
      db.$queryRawUnsafe<Array<{ date: Date; count: bigint }>>(
        'SELECT DATE("startTime") as date, COUNT(*)::bigint as count FROM "Appointment" WHERE "businessId" = $1 AND "startTime" >= $2 GROUP BY DATE("startTime")',
        id, startDate,
      ),
      db.$queryRawUnsafe<Array<{ date: Date; count: bigint }>>(
        'SELECT DATE(s."createdAt") as date, COUNT(*)::bigint as count FROM "QrCodeScan" s JOIN "QrCode" q ON s."qrCodeId" = q."id" WHERE q."businessId" = $1 AND s."createdAt" >= $2 GROUP BY DATE(s."createdAt")',
        id, startDate,
      ),
    ]);

    // Convert raw rows to a date->count map, then fill missing days with 0
    function fillDays(rows: Array<{ date: Date; count: bigint }>): Array<{ date: string; count: number }> {
      const map = new Map<string, number>();
      for (const row of rows) {
        const key = row.date instanceof Date ? row.date.toISOString().slice(0, 10) : String(row.date).slice(0, 10);
        map.set(key, Number(row.count));
      }
      return dateStrings.map((d) => ({ date: d, count: map.get(d) ?? 0 }));
    }

    return {
      success: true,
      trends: {
        contacts: fillDays(contactRows),
        calls: fillDays(callRows),
        chats: fillDays(chatRows),
        appointments: fillDays(appointmentRows),
        qrScans: fillDays(qrScanRows),
      },
    };
  });

}
