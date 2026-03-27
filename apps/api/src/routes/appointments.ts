import type { FastifyInstance } from 'fastify';
import { db } from '@embedo/db';
import type { AppointmentStatus } from '@embedo/db';
import { createLogger, NotFoundError } from '@embedo/utils';

const log = createLogger('api:appointments');

const CAL_API_BASE = 'https://api.cal.com/v2';

interface CalBooking {
  id: number;
  uid: string;
  title: string;
  status: string;
  start: string;
  end: string;
  attendees: Array<{
    email: string;
    name: string;
    timeZone: string;
  }>;
}

interface CalBookingsResponse {
  status: string;
  data: CalBooking[];
}

export async function appointmentRoutes(app: FastifyInstance): Promise<void> {
  // GET /appointments
  app.get('/appointments', async (request) => {
    const { startDate, endDate, status } = request.query as Record<string, string>;

    const now = new Date();
    const defaultStart = new Date(now);
    defaultStart.setDate(defaultStart.getDate() - 30);
    const defaultEnd = new Date(now);
    defaultEnd.setDate(defaultEnd.getDate() + 60);

    const filterStart = startDate ? new Date(startDate) : defaultStart;
    const filterEnd = endDate ? new Date(endDate) : defaultEnd;

    const where = {
      startTime: {
        gte: filterStart,
        lte: filterEnd,
      },
      ...(status ? { status: status as AppointmentStatus } : {}),
    };

    const appointments = await db.appointment.findMany({
      where,
      orderBy: { startTime: 'asc' },
      include: {
        contact: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        business: {
          select: { id: true, name: true },
        },
      },
    });

    return { items: appointments, total: appointments.length };
  });

  // GET /appointments/:id
  app.get('/appointments/:id', async (request) => {
    const { id } = request.params as { id: string };

    const appointment = await db.appointment.findUnique({
      where: { id },
      include: {
        contact: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        business: {
          select: { id: true, name: true },
        },
      },
    });

    if (!appointment) throw new NotFoundError('Appointment', id);
    return appointment;
  });

  // PATCH /appointments/:id
  app.patch('/appointments/:id', async (request) => {
    const { id } = request.params as { id: string };
    const { status, notes } = request.body as { status?: string; notes?: string };

    const existing = await db.appointment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Appointment', id);

    const updated = await db.appointment.update({
      where: { id },
      data: {
        ...(status !== undefined ? { status: status as AppointmentStatus } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
      include: {
        contact: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        business: {
          select: { id: true, name: true },
        },
      },
    });

    log.info({ appointmentId: id, status, notes }, 'Appointment updated');
    return updated;
  });

  // POST /appointments/sync-cal — pull bookings from Cal.com API and upsert into DB
  app.post('/appointments/sync-cal', async (_request, reply) => {
    const calApiKey = process.env['CAL_COM_API_KEY'];
    if (!calApiKey) {
      return reply.code(400).send({ error: 'CAL_COM_API_KEY not configured' });
    }

    // Find the first business to associate appointments with (admin platform = single tenant)
    const business = await db.business.findFirst({ select: { id: true } });
    if (!business) {
      return reply.code(400).send({ error: 'No business found to associate appointments with' });
    }

    try {
      // Fetch bookings from Cal.com API v2
      const res = await fetch(`${CAL_API_BASE}/bookings?status=upcoming,past,cancelled`, {
        headers: {
          'Authorization': `Bearer ${calApiKey}`,
          'cal-api-version': '2026-02-25',
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const text = await res.text();
        log.warn({ status: res.status, body: text }, 'Cal.com API request failed');
        return reply.code(502).send({ error: `Cal.com API returned ${res.status}` });
      }

      const body = await res.json() as CalBookingsResponse;
      const bookings = body.data ?? [];

      let created = 0;
      let updated = 0;
      let skipped = 0;

      for (const booking of bookings) {
        const attendee = booking.attendees?.[0];
        if (!attendee?.email) {
          skipped++;
          continue;
        }

        // Upsert contact by email
        let contact = await db.contact.findFirst({
          where: { email: attendee.email, businessId: business.id },
          select: { id: true },
        });

        if (!contact) {
          const nameParts = (attendee.name ?? '').split(' ');
          contact = await db.contact.create({
            data: {
              businessId: business.id,
              email: attendee.email,
              firstName: nameParts[0] || null,
              lastName: nameParts.slice(1).join(' ') || null,
              source: 'CALENDLY',
              status: 'LEAD',
            },
            select: { id: true },
          });
        }

        // Map Cal.com status to our AppointmentStatus
        let aptStatus: AppointmentStatus = 'SCHEDULED';
        if (booking.status === 'cancelled' || booking.status === 'rejected') aptStatus = 'CANCELLED';

        // Upsert by calendlyEventId (the uid)
        const existing = await db.appointment.findUnique({
          where: { calendlyEventId: booking.uid },
        });

        if (existing) {
          await db.appointment.update({
            where: { id: existing.id },
            data: {
              title: booking.title,
              startTime: new Date(booking.start),
              endTime: new Date(booking.end),
              status: aptStatus,
              timezone: attendee.timeZone ?? null,
            },
          });
          updated++;
        } else {
          await db.appointment.create({
            data: {
              businessId: business.id,
              contactId: contact.id,
              calendlyEventId: booking.uid,
              title: booking.title,
              startTime: new Date(booking.start),
              endTime: new Date(booking.end),
              timezone: attendee.timeZone ?? null,
              status: aptStatus,
            },
          });
          created++;
        }
      }

      log.info({ total: bookings.length, created, updated, skipped }, 'Cal.com sync completed');
      return reply.send({ synced: true, total: bookings.length, created, updated, skipped });
    } catch (err) {
      log.error({ err }, 'Cal.com sync failed');
      return reply.code(500).send({ error: 'Sync failed' });
    }
  });
}
