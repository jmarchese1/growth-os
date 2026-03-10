import { db } from '@embedo/db';
import { createLogger, ExternalApiError } from '@embedo/utils';
import { appointmentBookedQueue, leadCreatedQueue } from '@embedo/queue';
import { createOrUpdateContact } from '../contacts/service.js';
import { logContactActivity } from '../contacts/service.js';

const log = createLogger('crm-core:calendly');

interface CalendlyWebhookPayload {
  event: string;
  payload: {
    event_type?: { name: string };
    invitee?: {
      name: string;
      email: string;
      text_reminder_number?: string;
      uri: string;
    };
    scheduled_event?: {
      uri: string;
      start_time: string;
      end_time: string;
      name: string;
    };
    tracking?: {
      utm_source?: string;
      utm_medium?: string;
    };
  };
}

export async function handleCalendlyWebhook(
  businessId: string,
  payload: CalendlyWebhookPayload,
): Promise<void> {
  const { event } = payload;

  if (event !== 'invitee.created') {
    log.debug({ event }, 'Ignoring non-invitee.created event');
    return;
  }

  const { invitee, scheduled_event } = payload.payload;

  if (!invitee || !scheduled_event) {
    throw new ExternalApiError('Calendly', 'Missing invitee or scheduled_event in webhook payload');
  }

  log.info({ businessId, inviteeName: invitee.name }, 'Processing Calendly booking');

  // Create or update the contact
  const nameParts = invitee.name.split(' ');
  const { contact, created } = await createOrUpdateContact({
    businessId,
    email: invitee.email,
    phone: invitee.text_reminder_number,
    firstName: nameParts[0],
    lastName: nameParts.slice(1).join(' ') || undefined,
    source: 'CALENDLY',
  });

  // Extract Calendly event URI as our ID
  const calendlyEventId = scheduled_event.uri.split('/').pop() ?? scheduled_event.uri;

  // Create appointment record
  const appointment = await db.appointment.create({
    data: {
      businessId,
      contactId: contact.id,
      calendlyEventUri: scheduled_event.uri,
      calendlyEventId,
      title: scheduled_event.name,
      startTime: new Date(scheduled_event.start_time),
      endTime: new Date(scheduled_event.end_time),
      status: 'SCHEDULED',
    },
  });

  // Log activity on contact
  await logContactActivity({
    businessId,
    contactId: contact.id,
    type: 'APPOINTMENT',
    title: `Appointment booked: ${scheduled_event.name}`,
    metadata: {
      appointmentId: appointment.id,
      startTime: scheduled_event.start_time,
    },
  });

  // If new contact, emit lead.created
  if (created) {
    await leadCreatedQueue().add(`lead:calendly:${contact.id}`, {
      businessId,
      source: 'CALENDLY',
      sourceId: calendlyEventId,
      rawData: {
        name: invitee.name,
        email: invitee.email,
        phone: invitee.text_reminder_number,
        appointmentTitle: scheduled_event.name,
        appointmentTime: scheduled_event.start_time,
      },
    });
  }

  // Emit appointment.booked event for downstream automation
  await appointmentBookedQueue().add(`apt:${appointment.id}`, {
    businessId,
    appointmentId: appointment.id,
    contactId: contact.id,
    startTime: scheduled_event.start_time,
    calendlyEventId,
  });

  log.info({ appointmentId: appointment.id, contactId: contact.id }, 'Appointment created');
}
