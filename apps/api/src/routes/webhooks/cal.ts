import type { FastifyInstance } from 'fastify';
import { db } from '@embedo/db';
import { createLogger } from '@embedo/utils';
import { appointmentBookedQueue, leadCreatedQueue } from '@embedo/queue';
import twilio from 'twilio';

const log = createLogger('api:webhook:cal');

// Cal.com BOOKING_CREATED payload shape (relevant fields only)
interface CalBookingPayload {
  triggerEvent: string;
  payload: {
    uid: string;
    title: string;
    startTime: string;
    endTime: string;
    organizer: { email: string; name: string; timeZone: string };
    attendees: Array<{
      email: string;
      name: string;
      phoneNumber?: string;
      timeZone: string;
    }>;
  };
}

export async function calWebhookRoutes(app: FastifyInstance): Promise<void> {
  app.post('/webhooks/cal', async (request, reply) => {
    const body = request.body as CalBookingPayload;

    if (body.triggerEvent !== 'BOOKING_CREATED') {
      return reply.code(200).send({ received: true });
    }

    const { payload } = body;
    const attendee = payload.attendees?.[0];

    if (!attendee) {
      log.warn('Cal.com webhook received with no attendees');
      return reply.code(200).send({ received: true });
    }

    log.info({ uid: payload.uid, attendee: attendee.email }, 'Cal.com booking received');

    // Resolve Embedo business ID from env
    const businessId = process.env['EMBEDO_BUSINESS_ID'];
    if (!businessId) {
      log.warn('EMBEDO_BUSINESS_ID not set — cannot store appointment');
      return reply.code(200).send({ received: true });
    }

    // Parse name into first/last
    const nameParts = (attendee.name ?? '').trim().split(/\s+/);
    const firstName = nameParts[0] ?? '';
    const lastName = nameParts.slice(1).join(' ') || undefined;

    // Upsert Contact
    let contact = attendee.email
      ? await db.contact.findFirst({ where: { businessId, email: attendee.email } })
      : null;

    if (!contact) {
      contact = await db.contact.create({
        data: {
          businessId,
          firstName,
          ...(lastName !== undefined ? { lastName } : {}),
          ...(attendee.email ? { email: attendee.email } : {}),
          ...(attendee.phoneNumber ? { phone: attendee.phoneNumber } : {}),
          source: 'CALENDLY',
          status: 'LEAD',
          leadScore: 30,
          tags: ['cal-booking'],
        },
      });
      log.info({ contactId: contact.id }, 'New contact created from Cal.com booking');
    } else {
      // Bump lead score for returning contact
      await db.contact.update({
        where: { id: contact.id },
        data: { leadScore: { increment: 10 } },
      });
    }

    // Create Appointment
    const appointment = await db.appointment.create({
      data: {
        businessId,
        contactId: contact.id,
        calendlyEventId: payload.uid,
        title: payload.title,
        startTime: new Date(payload.startTime),
        endTime: new Date(payload.endTime),
        timezone: attendee.timeZone,
        status: 'SCHEDULED',
      },
    });

    // Emit appointment.booked event (lead-engine + survey-engine consume this)
    await appointmentBookedQueue().add(`cal:${payload.uid}`, {
      businessId,
      appointmentId: appointment.id,
      contactId: contact.id,
      startTime: payload.startTime,
      calendlyEventId: payload.uid,
    });

    // SMS alert to Jason
    const ownerPhone = process.env['OWNER_PHONE'];
    const twilioSid = process.env['TWILIO_ACCOUNT_SID'];
    const twilioToken = process.env['TWILIO_AUTH_TOKEN'];
    const twilioFrom = process.env['TWILIO_FROM_NUMBER'];

    if (ownerPhone && twilioSid && twilioToken && twilioFrom) {
      try {
        const client = twilio(twilioSid, twilioToken);
        const startFormatted = new Date(payload.startTime).toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZone: attendee.timeZone,
        });
        await client.messages.create({
          to: ownerPhone,
          from: twilioFrom,
          body: `New call booked: ${attendee.name} (${attendee.email}) — ${startFormatted}`,
        });
        log.info({ ownerPhone }, 'Owner SMS sent for Cal.com booking');
      } catch (err) {
        log.error({ err }, 'Failed to send owner SMS — non-fatal');
      }
    }

    return reply.code(200).send({ received: true, appointmentId: appointment.id });
  });
}
