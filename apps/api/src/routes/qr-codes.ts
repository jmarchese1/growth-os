import type { FastifyInstance } from 'fastify';
import { db } from '@embedo/db';
import { createLogger, NotFoundError } from '@embedo/utils';
import type { QrPurpose } from '@embedo/db';

const log = createLogger('api:qr-codes');

const VALID_PURPOSES: QrPurpose[] = ['SURVEY', 'DISCOUNT', 'SPIN_WHEEL', 'SIGNUP', 'MENU', 'REVIEW', 'CUSTOM'];

export async function qrCodeRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /qr-codes?businessId=xxx
   * List all QR codes for a business.
   */
  app.get('/qr-codes', async (request, reply) => {
    const { businessId } = request.query as { businessId?: string };
    if (!businessId) return reply.code(400).send({ success: false, error: 'businessId is required' });

    const qrCodes = await db.qrCode.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      include: {
        survey: { select: { id: true, title: true, slug: true } },
        _count: { select: { scans: true } },
      },
    });

    return {
      success: true,
      qrCodes: qrCodes.map((q) => ({
        ...q,
        scanCount: q._count.scans,
      })),
    };
  });

  /**
   * GET /qr-codes/:id
   * Get a single QR code with scan history and collected contacts.
   */
  app.get<{ Params: { id: string } }>('/qr-codes/:id', async (request) => {
    const { id } = request.params;

    const qrCode = await db.qrCode.findUnique({
      where: { id },
      include: {
        survey: { select: { id: true, title: true, slug: true } },
        scans: {
          orderBy: { createdAt: 'desc' },
          take: 100,
          include: {
            contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          },
        },
      },
    });

    if (!qrCode) throw new NotFoundError('QrCode', id);

    return { success: true, qrCode };
  });

  /**
   * PATCH /qr-codes/:id
   * Update a QR code (toggle active, update fields).
   */
  app.patch<{ Params: { id: string } }>('/qr-codes/:id', async (request) => {
    const { id } = request.params;
    const body = request.body as { active?: boolean; label?: string; expiresAt?: string | null; cooldownPeriod?: string | null };

    const qrCode = await db.qrCode.findUnique({ where: { id } });
    if (!qrCode) throw new NotFoundError('QrCode', id);

    const updated = await db.qrCode.update({
      where: { id },
      data: {
        ...(body.active !== undefined ? { active: body.active } : {}),
        ...(body.label ? { label: body.label.trim() } : {}),
        ...(body.expiresAt !== undefined ? { expiresAt: body.expiresAt ? new Date(body.expiresAt) : null } : {}),
        ...(body.cooldownPeriod !== undefined ? { cooldownPeriod: body.cooldownPeriod } : {}),
      },
      include: {
        survey: { select: { id: true, title: true, slug: true } },
        _count: { select: { scans: true } },
      },
    });

    log.info({ qrCodeId: id }, 'QR code updated');
    return { success: true, qrCode: { ...updated, scanCount: updated._count.scans } };
  });

  /**
   * POST /qr-codes
   * Create a QR code.
   */
  app.post('/qr-codes', async (request, reply) => {
    const body = request.body as {
      businessId?: string;
      label?: string;
      purpose?: string;
      surveyId?: string;
      discountValue?: string;
      discountCode?: string;
      spinPrizes?: { label: string; probability: number }[];
      surveyReward?: string;
      destinationUrl?: string;
      expiresAt?: string;
      metadata?: Record<string, unknown>;
      cooldownPeriod?: string;
    };

    if (!body.businessId) return reply.code(400).send({ success: false, error: 'businessId is required' });
    if (!body.label?.trim()) return reply.code(400).send({ success: false, error: 'label is required' });

    const purpose = (body.purpose && VALID_PURPOSES.includes(body.purpose as QrPurpose))
      ? body.purpose as QrPurpose
      : 'CUSTOM' as QrPurpose;

    // Validate survey exists if linking one
    if (body.surveyId) {
      const survey = await db.survey.findUnique({ where: { id: body.surveyId } });
      if (!survey) return reply.code(404).send({ success: false, error: 'Survey not found' });
    }

    const qrCode = await db.qrCode.create({
      data: {
        businessId: body.businessId,
        label: body.label.trim(),
        purpose,
        ...(body.surveyId ? { surveyId: body.surveyId } : {}),
        discountValue: body.discountValue ?? null,
        discountCode: body.discountCode ?? null,
        ...(body.spinPrizes ? { spinPrizes: body.spinPrizes } : {}),
        surveyReward: body.surveyReward ?? null,
        destinationUrl: body.destinationUrl ?? null,
        ...(body.expiresAt ? { expiresAt: new Date(body.expiresAt) } : {}),
        ...(body.metadata ? { metadata: body.metadata as object } : {}),
        ...(body.cooldownPeriod ? { cooldownPeriod: body.cooldownPeriod } : {}),
        active: true,
      },
      include: {
        survey: { select: { id: true, title: true, slug: true } },
      },
    });

    log.info({ businessId: body.businessId, qrCodeId: qrCode.id, purpose }, 'QR code created');
    return { success: true, qrCode };
  });

  /**
   * DELETE /qr-codes/:id
   */
  app.delete<{ Params: { id: string } }>('/qr-codes/:id', async (request) => {
    const { id } = request.params;
    const qrCode = await db.qrCode.findUnique({ where: { id } });
    if (!qrCode) throw new NotFoundError('QrCode', id);
    await db.qrCode.delete({ where: { id } });
    log.info({ qrCodeId: id }, 'QR code deleted');
    return { success: true };
  });

  /**
   * GET /qr-codes/public/:token
   * Public endpoint — scan a QR code. Returns QR data and records the scan.
   * Called by the customer-facing /qr/[token] page on first load.
   */
  app.get<{ Params: { token: string }; Querystring: { fp?: string } }>('/qr-codes/public/:token', async (request, reply) => {
    const { token } = request.params;
    const fp = (request.query as { fp?: string }).fp;
    const ip = (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? request.ip;

    const qrCode = await db.qrCode.findUnique({
      where: { token },
      include: {
        survey: { select: { id: true, title: true, description: true, schema: true } },
        business: { select: { name: true, type: true } },
      },
    });

    if (!qrCode) return reply.code(404).send({ success: false, error: 'QR code not found' });
    if (!qrCode.active) return reply.code(410).send({ success: false, error: 'This QR code is no longer active' });
    if (qrCode.expiresAt && qrCode.expiresAt < new Date()) {
      return reply.code(410).send({ success: false, error: 'This QR code has expired' });
    }

    // Cooldown check — find last scan from this device (any scan counts, not just claims)
    let cooldownUntil: string | null = null;
    const isCooldownPurpose = ['SPIN_WHEEL', 'DISCOUNT'].includes(qrCode.purpose);
    if (qrCode.cooldownPeriod && isCooldownPurpose) {
      const cooldownMs: Record<string, number> = {
        ONCE: Infinity,
        DAILY: 24 * 60 * 60 * 1000,
        WEEKLY: 7 * 24 * 60 * 60 * 1000,
        MONTHLY: 30 * 24 * 60 * 60 * 1000,
      };
      const window = cooldownMs[qrCode.cooldownPeriod];

      if (window !== undefined) {
        // Match by fingerprint (per-device). Only fall back to IP if no fingerprint provided.
        // Using OR would block all devices on the same WiFi (shared IP).
        const lastScan = await db.qrCodeScan.findFirst({
          where: {
            qrCodeId: qrCode.id,
            ...(fp ? { deviceFingerprint: fp } : { ipAddress: ip }),
          },
          orderBy: { createdAt: 'desc' },
        });

        if (lastScan) {
          if (window === Infinity) {
            cooldownUntil = 'forever';
          } else {
            const expiresAt = new Date(lastScan.createdAt.getTime() + window);
            if (expiresAt > new Date()) {
              cooldownUntil = expiresAt.toISOString();
            }
          }
        }
      }
    }

    // Record scan (fire-and-forget) — only if NOT in cooldown (avoid inflating scan count on blocked revisits)
    if (!cooldownUntil) {
      db.qrCode.update({
        where: { token },
        data: {
          scanCount: { increment: 1 },
          scans: { create: { ipAddress: ip, ...(fp ? { deviceFingerprint: fp } : {}) } },
        },
      }).catch(() => {});
    }

    return {
      success: true,
      qr: {
        id: qrCode.id,
        label: qrCode.label,
        purpose: qrCode.purpose,
        businessName: qrCode.business.name,
        expiresAt: qrCode.expiresAt,
        cooldownPeriod: qrCode.cooldownPeriod,
        cooldownUntil,
        // Survey
        survey: qrCode.survey ? {
          id: qrCode.survey.id,
          title: qrCode.survey.title,
          description: qrCode.survey.description,
          questions: qrCode.survey.schema,
        } : null,
        surveyReward: qrCode.surveyReward,
        // Discount
        discountValue: qrCode.discountValue,
        discountCode: qrCode.discountCode,
        // Spin wheel
        spinPrizes: qrCode.spinPrizes,
        // Redirect
        destinationUrl: qrCode.destinationUrl,
        // Page style metadata
        metadata: qrCode.metadata ?? null,
      },
    };
  });

  /**
   * POST /qr-codes/public/:token/signup
   * Customer signs up via QR code (purpose = SIGNUP or after spin/survey).
   * Creates a Contact and records scan outcome.
   */
  app.post<{ Params: { token: string } }>('/qr-codes/public/:token/signup', async (request, reply) => {
    const { token } = request.params;
    const body = request.body as {
      name?: string;
      email?: string;
      phone?: string;
      outcome?: string;
      deviceFingerprint?: string;
    };

    const qrCode = await db.qrCode.findUnique({ where: { token }, select: { id: true, businessId: true, active: true, expiresAt: true } });
    if (!qrCode) return reply.code(404).send({ success: false, error: 'QR code not found' });
    if (!qrCode.active) return reply.code(410).send({ success: false, error: 'QR code is inactive' });
    if (qrCode.expiresAt && qrCode.expiresAt < new Date()) return reply.code(410).send({ success: false, error: 'QR code has expired' });

    if (!body.email && !body.phone) {
      return reply.code(400).send({ success: false, error: 'Email or phone is required' });
    }

    const firstName = body.name?.split(' ')[0] ?? undefined;
    const lastName = body.name?.split(' ').slice(1).join(' ') || undefined;

    let contactId: string | undefined;
    try {
      const contact = await db.contact.upsert({
        where: body.email
          ? { businessId_email: { businessId: qrCode.businessId, email: body.email } }
          : { businessId_phone: { businessId: qrCode.businessId, phone: body.phone! } },
        create: {
          businessId: qrCode.businessId,
          source: 'QR_CODE',
          ...(firstName ? { firstName } : {}),
          ...(lastName ? { lastName } : {}),
          ...(body.email ? { email: body.email } : {}),
          ...(body.phone ? { phone: body.phone } : {}),
        },
        update: {
          ...(firstName ? { firstName } : {}),
          ...(lastName ? { lastName } : {}),
        },
      });
      contactId = contact.id;
    } catch {
      // contact might already exist — still record the scan
    }

    // Record scan outcome
    const ip = (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? request.ip;
    await db.qrCodeScan.create({
      data: {
        qrCodeId: qrCode.id,
        ...(contactId ? { contactId } : {}),
        outcome: body.outcome ?? 'signup',
        ipAddress: ip,
        ...(body.deviceFingerprint ? { deviceFingerprint: body.deviceFingerprint } : {}),
      },
    });

    log.info({ qrCodeId: qrCode.id, contactId }, 'QR code signup captured');
    return { success: true, contactId };
  });
}
