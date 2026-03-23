import type { FastifyInstance } from 'fastify';
import { db } from '@embedo/db';
import { createLogger, NotFoundError } from '@embedo/utils';
import { checkAvailability, bookReservation, cancelReservation } from '../services/opentable.js';
interface OpenTableConfig {
  enabled: boolean;
  restaurantId?: string;
}

const log = createLogger('api:reservations');

export async function reservationRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /reservations
   * Create a reservation — used by voice agent, chatbot, or manual entry.
   * If OpenTable is configured for the business, attempts to book via OpenTable stub.
   */
  app.post('/reservations', async (request, reply) => {
    const body = request.body as any;

    if (!body.businessId) return reply.code(400).send({ success: false, error: 'businessId is required' });
    if (!body.guestName?.trim()) return reply.code(400).send({ success: false, error: 'guestName is required' });
    if (!body.partySize || body.partySize < 1) return reply.code(400).send({ success: false, error: 'partySize must be at least 1' });
    if (!body.date) return reply.code(400).send({ success: false, error: 'date is required' });
    if (!body.time) return reply.code(400).send({ success: false, error: 'time is required' });

    const business = await db.business.findUnique({ where: { id: body.businessId } });
    if (!business) throw new NotFoundError('Business', body.businessId);

    // Create or find a Contact from guest info
    let contactId: string | undefined;
    if (body.guestEmail || body.guestPhone) {
      const firstName = body.guestName.trim().split(' ')[0];
      const lastName = body.guestName.trim().split(' ').slice(1).join(' ') || undefined;

      try {
        const contact = await db.contact.upsert({
          where: body.guestEmail
            ? { businessId_email: { businessId: body.businessId, email: body.guestEmail } }
            : { businessId_phone: { businessId: body.businessId, phone: body.guestPhone! } },
          create: {
            businessId: body.businessId,
            source: body.source === 'VOICE_AGENT' ? 'VOICE' : body.source === 'CHATBOT' ? 'CHATBOT' : 'MANUAL',
            ...(firstName ? { firstName } : {}),
            ...(lastName ? { lastName } : {}),
            ...(body.guestEmail ? { email: body.guestEmail } : {}),
            ...(body.guestPhone ? { phone: body.guestPhone } : {}),
          },
          update: {
            ...(firstName ? { firstName } : {}),
            ...(lastName ? { lastName } : {}),
          },
        });
        contactId = contact.id;
      } catch {
        // ignore unique constraint conflict if both email+phone provided
      }
    }

    // Check if OpenTable is configured for this business
    const settings = (business.settings as Record<string, unknown>) ?? {};
    const openTableConfig = settings['openTable'] as OpenTableConfig | undefined;
    let openTableConfirmation: string | undefined;
    let openTableRestaurantId: string | undefined;
    let status: 'PENDING' | 'CONFIRMED' = 'PENDING';

    if (openTableConfig?.enabled && openTableConfig.restaurantId) {
      openTableRestaurantId = openTableConfig.restaurantId;
      try {
        const booking = await bookReservation({
          restaurantId: openTableConfig.restaurantId,
          date: body.date,
          time: body.time,
          partySize: body.partySize,
          guestName: body.guestName.trim(),
          guestPhone: body.guestPhone ?? '',
          guestEmail: body.guestEmail ?? '',
          ...(body.specialRequests != null ? { specialRequests: body.specialRequests } : {}),
        });
        openTableConfirmation = booking.confirmationNumber;
        status = 'CONFIRMED';
        log.info({ businessId: body.businessId, confirmation: booking.confirmationNumber }, 'OpenTable booking created');
      } catch (err) {
        log.warn({ err, businessId: body.businessId }, 'OpenTable booking failed, creating local reservation');
      }
    }

    const reservation = await db.reservation.create({
      data: {
        businessId: body.businessId,
        contactId: contactId ?? null,
        guestName: body.guestName.trim(),
        guestPhone: body.guestPhone ?? null,
        guestEmail: body.guestEmail ?? null,
        partySize: body.partySize,
        date: new Date(body.date),
        time: body.time,
        timezone: body.timezone ?? business.timezone,
        specialRequests: body.specialRequests ?? null,
        source: body.source ?? 'MANUAL',
        status,
        openTableConfirmation: openTableConfirmation ?? null,
        openTableRestaurantId: openTableRestaurantId ?? null,
        voiceCallLogId: body.voiceCallLogId ?? null,
        chatSessionId: body.chatSessionId ?? null,
      },
    });

    log.info({ businessId: body.businessId, reservationId: reservation.id, source: body.source }, 'Reservation created');

    return {
      success: true,
      reservation: {
        id: reservation.id,
        businessId: reservation.businessId,
        guestName: reservation.guestName,
        guestPhone: reservation.guestPhone,
        guestEmail: reservation.guestEmail,
        partySize: reservation.partySize,
        date: reservation.date.toISOString(),
        time: reservation.time,
        timezone: reservation.timezone,
        specialRequests: reservation.specialRequests,
        status: reservation.status,
        source: reservation.source,
        openTableConfirmation: reservation.openTableConfirmation,
        createdAt: reservation.createdAt.toISOString(),
      },
    };
  });

  /**
   * GET /reservations/:businessId
   * List reservations for a business, with optional date filtering.
   * Query params: date (ISO string), status, page, pageSize
   */
  app.get<{ Params: { businessId: string }; Querystring: { date?: string; status?: string; page?: string; pageSize?: string } }>(
    '/reservations/:businessId',
    async (request) => {
      const { businessId } = request.params;
      const { date, status, page: pageStr, pageSize: pageSizeStr } = request.query;

      const page = parseInt(pageStr ?? '1');
      const pageSize = parseInt(pageSizeStr ?? '20');

      const where: Record<string, unknown> = { businessId };
      if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        where['date'] = { gte: startOfDay, lte: endOfDay };
      }
      if (status) {
        where['status'] = status;
      }

      const [items, total] = await Promise.all([
        db.reservation.findMany({
          where,
          orderBy: [{ date: 'asc' }, { time: 'asc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            contact: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
          },
        }),
        db.reservation.count({ where }),
      ]);

      return {
        success: true,
        reservations: items.map((r) => ({
          id: r.id,
          businessId: r.businessId,
          contactId: r.contactId,
          contact: r.contact,
          guestName: r.guestName,
          guestPhone: r.guestPhone,
          guestEmail: r.guestEmail,
          partySize: r.partySize,
          date: r.date.toISOString(),
          time: r.time,
          timezone: r.timezone,
          specialRequests: r.specialRequests,
          status: r.status,
          source: r.source,
          openTableConfirmation: r.openTableConfirmation,
          createdAt: r.createdAt.toISOString(),
        })),
        total,
        page,
        pageSize,
      };
    },
  );

  /**
   * GET /reservations/:businessId/:id
   * Get a single reservation by ID.
   */
  app.get<{ Params: { businessId: string; id: string } }>(
    '/reservations/:businessId/:id',
    async (request) => {
      const { businessId, id } = request.params;

      const reservation = await db.reservation.findFirst({
        where: { id, businessId },
        include: {
          contact: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        },
      });

      if (!reservation) throw new NotFoundError('Reservation', id);

      return {
        success: true,
        reservation: {
          id: reservation.id,
          businessId: reservation.businessId,
          contactId: reservation.contactId,
          contact: reservation.contact,
          guestName: reservation.guestName,
          guestPhone: reservation.guestPhone,
          guestEmail: reservation.guestEmail,
          partySize: reservation.partySize,
          date: reservation.date.toISOString(),
          time: reservation.time,
          timezone: reservation.timezone,
          specialRequests: reservation.specialRequests,
          status: reservation.status,
          source: reservation.source,
          openTableConfirmation: reservation.openTableConfirmation,
          createdAt: reservation.createdAt.toISOString(),
        },
      };
    },
  );

  /**
   * PATCH /reservations/:id
   * Update reservation status or details.
   */
  app.patch<{ Params: { id: string } }>(
    '/reservations/:id',
    async (request) => {
      const { id } = request.params;
      const body = request.body as {
        status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW' | 'COMPLETED';
        guestName?: string;
        partySize?: number;
        date?: string;
        time?: string;
        specialRequests?: string;
      };

      const reservation = await db.reservation.findUnique({ where: { id } });
      if (!reservation) throw new NotFoundError('Reservation', id);

      const updated = await db.reservation.update({
        where: { id },
        data: {
          ...(body.status ? { status: body.status } : {}),
          ...(body.guestName ? { guestName: body.guestName.trim() } : {}),
          ...(body.partySize ? { partySize: body.partySize } : {}),
          ...(body.date ? { date: new Date(body.date) } : {}),
          ...(body.time ? { time: body.time } : {}),
          ...(body.specialRequests !== undefined ? { specialRequests: body.specialRequests } : {}),
        },
      });

      log.info({ reservationId: id, status: body.status }, 'Reservation updated');

      return {
        success: true,
        reservation: {
          id: updated.id,
          businessId: updated.businessId,
          guestName: updated.guestName,
          guestPhone: updated.guestPhone,
          guestEmail: updated.guestEmail,
          partySize: updated.partySize,
          date: updated.date.toISOString(),
          time: updated.time,
          timezone: updated.timezone,
          specialRequests: updated.specialRequests,
          status: updated.status,
          source: updated.source,
          openTableConfirmation: updated.openTableConfirmation,
          createdAt: updated.createdAt.toISOString(),
        },
      };
    },
  );

  /**
   * DELETE /reservations/:id
   * Cancel a reservation. If OpenTable confirmation exists, cancels via OpenTable too.
   */
  app.delete<{ Params: { id: string } }>(
    '/reservations/:id',
    async (request) => {
      const { id } = request.params;

      const reservation = await db.reservation.findUnique({ where: { id } });
      if (!reservation) throw new NotFoundError('Reservation', id);

      // If there's an OpenTable confirmation, cancel it
      if (reservation.openTableConfirmation) {
        try {
          await cancelReservation(reservation.openTableConfirmation);
          log.info({ reservationId: id, confirmation: reservation.openTableConfirmation }, 'OpenTable reservation cancelled');
        } catch (err) {
          log.warn({ err, reservationId: id }, 'Failed to cancel OpenTable reservation');
        }
      }

      await db.reservation.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      log.info({ reservationId: id }, 'Reservation cancelled');
      return { success: true };
    },
  );

  /**
   * POST /reservations/opentable/availability
   * Check OpenTable availability for a given date/time/party size.
   * STUB — returns mock data until OpenTable partner API access is granted.
   */
  app.post('/reservations/opentable/availability', async (request, reply) => {
    const body = request.body as {
      businessId?: string;
      restaurantId?: string;
      date?: string;
      time?: string;
      partySize?: number;
    };

    if (!body.date) return reply.code(400).send({ success: false, error: 'date is required' });
    if (!body.time) return reply.code(400).send({ success: false, error: 'time is required' });
    if (!body.partySize || body.partySize < 1) return reply.code(400).send({ success: false, error: 'partySize must be at least 1' });

    // Resolve restaurant ID from business settings or request body
    let restaurantId = body.restaurantId;
    if (!restaurantId && body.businessId) {
      const business = await db.business.findUnique({ where: { id: body.businessId } });
      if (business) {
        const settings = (business.settings as Record<string, unknown>) ?? {};
        const openTableConfig = settings['openTable'] as OpenTableConfig | undefined;
        restaurantId = openTableConfig?.restaurantId;
      }
    }

    if (!restaurantId) return reply.code(400).send({ success: false, error: 'restaurantId or businessId with OpenTable config is required' });

    // TODO: Replace with real OpenTable API call once partner access is approved
    const result = await checkAvailability({
      restaurantId,
      date: body.date,
      time: body.time,
      partySize: body.partySize,
    });

    return { success: true, ...result };
  });

  /**
   * POST /reservations/opentable/book
   * Book via OpenTable directly. Creates a local reservation record with the confirmation.
   * STUB — creates local reservation with mock confirmation until OpenTable partner API access is granted.
   */
  app.post('/reservations/opentable/book', async (request, reply) => {
    const body = request.body as {
      businessId?: string;
      restaurantId?: string;
      date?: string;
      time?: string;
      partySize?: number;
      guestName?: string;
      guestPhone?: string;
      guestEmail?: string;
      specialRequests?: string;
      source?: 'VOICE_AGENT' | 'CHATBOT' | 'MANUAL' | 'WEBSITE';
      voiceCallLogId?: string;
      chatSessionId?: string;
    };

    if (!body.businessId) return reply.code(400).send({ success: false, error: 'businessId is required' });
    if (!body.guestName?.trim()) return reply.code(400).send({ success: false, error: 'guestName is required' });
    if (!body.date) return reply.code(400).send({ success: false, error: 'date is required' });
    if (!body.time) return reply.code(400).send({ success: false, error: 'time is required' });
    if (!body.partySize || body.partySize < 1) return reply.code(400).send({ success: false, error: 'partySize must be at least 1' });

    const business = await db.business.findUnique({ where: { id: body.businessId } });
    if (!business) throw new NotFoundError('Business', body.businessId);

    // Resolve restaurant ID
    let restaurantId = body.restaurantId;
    if (!restaurantId) {
      const settings = (business.settings as Record<string, unknown>) ?? {};
      const openTableConfig = settings['openTable'] as OpenTableConfig | undefined;
      restaurantId = openTableConfig?.restaurantId;
    }

    if (!restaurantId) return reply.code(400).send({ success: false, error: 'restaurantId or OpenTable config on business is required' });

    // TODO: Replace with real OpenTable API call once partner access is approved
    const booking = await bookReservation({
      restaurantId,
      date: body.date,
      time: body.time,
      partySize: body.partySize,
      guestName: body.guestName.trim(),
      guestPhone: body.guestPhone ?? '',
      guestEmail: body.guestEmail ?? '',
      ...(body.specialRequests != null ? { specialRequests: body.specialRequests } : {}),
    });

    // Create local reservation record
    const reservation = await db.reservation.create({
      data: {
        businessId: body.businessId,
        guestName: body.guestName.trim(),
        guestPhone: body.guestPhone ?? null,
        guestEmail: body.guestEmail ?? null,
        partySize: body.partySize,
        date: new Date(body.date),
        time: body.time,
        timezone: business.timezone,
        specialRequests: body.specialRequests ?? null,
        source: body.source ?? 'MANUAL',
        status: 'CONFIRMED',
        openTableConfirmation: booking.confirmationNumber,
        openTableRestaurantId: restaurantId,
        voiceCallLogId: body.voiceCallLogId ?? null,
        chatSessionId: body.chatSessionId ?? null,
      },
    });

    log.info({ businessId: body.businessId, reservationId: reservation.id, confirmation: booking.confirmationNumber }, 'OpenTable reservation booked');

    return {
      success: true,
      reservation: {
        id: reservation.id,
        businessId: reservation.businessId,
        guestName: reservation.guestName,
        partySize: reservation.partySize,
        date: reservation.date.toISOString(),
        time: reservation.time,
        status: reservation.status,
        openTableConfirmation: reservation.openTableConfirmation,
        createdAt: reservation.createdAt.toISOString(),
      },
      confirmationNumber: booking.confirmationNumber,
    };
  });
}
