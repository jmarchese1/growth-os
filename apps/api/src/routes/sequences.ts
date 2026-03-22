import type { FastifyInstance } from 'fastify';
import Anthropic from '@anthropic-ai/sdk';
import sgMail from '@sendgrid/mail';
import twilio from 'twilio';
import { db } from '@embedo/db';
import { createLogger, NotFoundError } from '@embedo/utils';
import { buildOutreachHtml } from '../email/outreach-email.js';

const log = createLogger('api:sequences');

type SequenceType = 'EMAIL' | 'SMS';

interface EmailStep {
  stepNumber: number;
  delayHours: number;
  subject: string;
  body: string;
}

interface SmsStep {
  stepNumber: number;
  delayHours: number;
  message: string;
}

const TRIGGER_LABELS: Record<string, string> = {
  LEAD_CREATED: 'When a new lead is created',
  SURVEY_COMPLETE: 'After completing a survey',
  APPOINTMENT_BOOKED: 'After booking an appointment',
  APPOINTMENT_REMINDER: 'Before an upcoming appointment',
  CALL_COMPLETED: 'After a phone call',
  PROPOSAL_SENT: 'After a proposal is sent',
  CUSTOM: 'Manual enrollment',
};

export async function sequenceRoutes(app: FastifyInstance): Promise<void> {
  // ─── LIST SEQUENCES ──────────────────────────────────────────────────────────

  app.get('/businesses/:id/sequences', async (request, _reply) => {
    const { id } = request.params as { id: string };
    const { type } = request.query as { type?: string };

    const emailSequences = (!type || type === 'EMAIL')
      ? await db.emailSequence.findMany({ where: { businessId: id }, orderBy: { createdAt: 'desc' } })
      : [];

    const smsSequences = (!type || type === 'SMS')
      ? await db.smsSequence.findMany({ where: { businessId: id }, orderBy: { createdAt: 'desc' } })
      : [];

    // Normalize into a unified format
    const sequences = [
      ...emailSequences.map((s) => ({
        id: s.id,
        name: s.name,
        type: 'EMAIL' as SequenceType,
        trigger: s.trigger,
        triggerLabel: TRIGGER_LABELS[s.trigger] ?? s.trigger,
        stepCount: Array.isArray(s.steps) ? (s.steps as unknown[]).length : 0,
        active: s.active,
        createdAt: s.createdAt.toISOString(),
      })),
      ...smsSequences.map((s) => ({
        id: s.id,
        name: s.name,
        type: 'SMS' as SequenceType,
        trigger: s.trigger,
        triggerLabel: TRIGGER_LABELS[s.trigger] ?? s.trigger,
        stepCount: Array.isArray(s.steps) ? (s.steps as unknown[]).length : 0,
        active: s.active,
        createdAt: s.createdAt.toISOString(),
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { success: true, sequences };
  });

  // ─── CREATE SEQUENCE ─────────────────────────────────────────────────────────

  app.post('/businesses/:id/sequences', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      name: string;
      type: SequenceType;
      trigger: string;
      steps?: EmailStep[] | SmsStep[];
    };

    if (!body.name?.trim()) return reply.code(400).send({ success: false, error: 'name is required' });
    if (!body.type) return reply.code(400).send({ success: false, error: 'type (EMAIL or SMS) is required' });
    if (!body.trigger) return reply.code(400).send({ success: false, error: 'trigger is required' });

    const defaultEmailSteps: EmailStep[] = [
      { stepNumber: 1, delayHours: 0, subject: 'Hey {{firstName}}!', body: '<p>Hi {{firstName}},</p><p>Thanks for connecting with {{business}}! We wanted to reach out and let you know we appreciate you.</p><p>Is there anything we can help you with?</p>' },
    ];

    const defaultSmsSteps: SmsStep[] = [
      { stepNumber: 1, delayHours: 0, message: 'Hey {{firstName}}! Thanks for connecting with {{business}}. We appreciate you! Reply if we can help with anything.' },
    ];

    if (body.type === 'EMAIL') {
      const seq = await db.emailSequence.create({
        data: {
          businessId: id,
          name: body.name.trim(),
          trigger: body.trigger as 'LEAD_CREATED' | 'SURVEY_COMPLETE' | 'APPOINTMENT_BOOKED' | 'APPOINTMENT_REMINDER' | 'CALL_COMPLETED' | 'PROPOSAL_SENT' | 'CUSTOM',
          steps: (body.steps ?? defaultEmailSteps) as unknown as object,
          active: true,
        },
      });
      log.info({ businessId: id, sequenceId: seq.id }, 'Email sequence created');
      return { success: true, sequence: { ...seq, type: 'EMAIL', steps: seq.steps } };
    }

    const seq = await db.smsSequence.create({
      data: {
        businessId: id,
        name: body.name.trim(),
        trigger: body.trigger as 'LEAD_CREATED' | 'SURVEY_COMPLETE' | 'APPOINTMENT_BOOKED' | 'APPOINTMENT_REMINDER' | 'CALL_COMPLETED' | 'PROPOSAL_SENT' | 'CUSTOM',
        steps: (body.steps ?? defaultSmsSteps) as unknown as object,
        active: true,
      },
    });
    log.info({ businessId: id, sequenceId: seq.id }, 'SMS sequence created');
    return { success: true, sequence: { ...seq, type: 'SMS', steps: seq.steps } };
  });

  // ─── GET SEQUENCE DETAIL ──────────────────────────────────────────────────────

  app.get('/sequences/:id', async (request, _reply) => {
    const { id } = request.params as { id: string };
    const { type } = request.query as { type: string };

    if (type === 'SMS') {
      const seq = await db.smsSequence.findUnique({ where: { id } });
      if (!seq) throw new NotFoundError('SmsSequence', id);
      return { success: true, sequence: { ...seq, type: 'SMS', triggerLabel: TRIGGER_LABELS[seq.trigger] ?? seq.trigger } };
    }

    const seq = await db.emailSequence.findUnique({ where: { id } });
    if (!seq) throw new NotFoundError('EmailSequence', id);
    return { success: true, sequence: { ...seq, type: 'EMAIL', triggerLabel: TRIGGER_LABELS[seq.trigger] ?? seq.trigger } };
  });

  // ─── UPDATE SEQUENCE ──────────────────────────────────────────────────────────

  app.patch('/sequences/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      type: SequenceType;
      name?: string;
      trigger?: string;
      steps?: EmailStep[] | SmsStep[];
      active?: boolean;
    };

    if (!body.type) return reply.code(400).send({ success: false, error: 'type is required' });

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data['name'] = body.name.trim();
    if (body.trigger !== undefined) data['trigger'] = body.trigger;
    if (body.steps !== undefined) data['steps'] = body.steps as unknown as object;
    if (body.active !== undefined) data['active'] = body.active;

    if (body.type === 'SMS') {
      const seq = await db.smsSequence.update({ where: { id }, data });
      log.info({ sequenceId: id }, 'SMS sequence updated');
      return { success: true, sequence: { ...seq, type: 'SMS' } };
    }

    const seq = await db.emailSequence.update({ where: { id }, data });
    log.info({ sequenceId: id }, 'Email sequence updated');
    return { success: true, sequence: { ...seq, type: 'EMAIL' } };
  });

  // ─── DELETE SEQUENCE ──────────────────────────────────────────────────────────

  app.delete('/sequences/:id', async (request, _reply) => {
    const { id } = request.params as { id: string };
    const { type } = request.query as { type: string };

    if (type === 'SMS') {
      await db.smsSequence.delete({ where: { id } });
    } else {
      await db.emailSequence.delete({ where: { id } });
    }

    log.info({ sequenceId: id, type }, 'Sequence deleted');
    return { success: true };
  });

  // ─── PREVIEW EMAIL STEP ──────────────────────────────────────────────────────

  app.post('/sequences/preview-email', async (request, _reply) => {
    const body = request.body as {
      businessId: string;
      subject: string;
      emailBody: string;
      recipientName?: string;
    };

    const business = await db.business.findUnique({
      where: { id: body.businessId },
      select: { name: true, settings: true },
    });
    if (!business) throw new NotFoundError('Business', body.businessId);

    const settings = business.settings as Record<string, unknown> | null;
    const rewardSettings = settings?.['rewardEmails'] as Record<string, unknown> | undefined;

    const html = buildOutreachHtml({
      businessName: business.name,
      recipientName: body.recipientName ?? 'John',
      subject: body.subject,
      body: body.emailBody,
      accentColor: (rewardSettings?.['accentColor'] as string) ?? '#7C3AED',
      logoUrl: (rewardSettings?.['logoUrl'] as string) || undefined,
      fontFamily: (rewardSettings?.['fontFamily'] as string) ?? 'helvetica',
    });

    return { success: true, html };
  });

  // ─── AI GENERATE EMAIL CONTENT ────────────────────────────────────────────────

  app.post('/sequences/generate-email', async (request, reply) => {
    const body = request.body as {
      businessId: string;
      purpose: string;
      stepNumber?: number;
      tone?: string;
    };

    const apiKey = process.env['ANTHROPIC_API_KEY'];
    if (!apiKey) return reply.code(500).send({ success: false, error: 'AI not configured' });

    const business = await db.business.findUnique({
      where: { id: body.businessId },
      select: { name: true, type: true },
    });
    if (!business) throw new NotFoundError('Business', body.businessId);

    const tone = body.tone ?? 'warm, friendly, and casual';
    const stepNum = body.stepNumber ?? 1;

    const prompt = `You are writing a marketing email for a local business.

Business: ${business.name} (${business.type ?? 'local business'})
Purpose: ${body.purpose}
Email step: ${stepNum} in the sequence
Tone: ${tone}

Write a short, effective email that would make a customer want to come back.
- Keep it 2-3 short paragraphs max
- Use {{firstName}} for the recipient's name
- Use {{business}} for the business name
- Be conversational, not corporate
- Include a clear value proposition or reason to come back
- DO NOT include subject line in the body

Return JSON only:
{
  "subject": "email subject line (short, compelling, no emojis)",
  "body": "email body as HTML paragraphs using <p> tags"
}`;

    try {
      const client = new Anthropic({ apiKey });
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = msg.content[0]?.type === 'text' ? msg.content[0].text : '';
      const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const result = JSON.parse(cleaned) as { subject: string; body: string };

      return { success: true, subject: result.subject, body: result.body };
    } catch (err) {
      log.error({ err }, 'AI email generation failed');
      return reply.code(500).send({ success: false, error: 'AI generation failed' });
    }
  });

  // ─── AI GENERATE SMS CONTENT ──────────────────────────────────────────────────

  app.post('/sequences/generate-sms', async (request, reply) => {
    const body = request.body as {
      businessId: string;
      purpose: string;
      stepNumber?: number;
    };

    const apiKey = process.env['ANTHROPIC_API_KEY'];
    if (!apiKey) return reply.code(500).send({ success: false, error: 'AI not configured' });

    const business = await db.business.findUnique({
      where: { id: body.businessId },
      select: { name: true, type: true },
    });
    if (!business) throw new NotFoundError('Business', body.businessId);

    const prompt = `Write a marketing SMS for a local business.

Business: ${business.name} (${business.type ?? 'local business'})
Purpose: ${body.purpose}
Step: ${body.stepNumber ?? 1} in the sequence

Rules:
- Under 160 characters
- Casual and friendly
- Use {{firstName}} for recipient name
- Use {{business}} for business name
- Include a reason to come back
- No hashtags

Return just the SMS text, nothing else.`;

    try {
      const client = new Anthropic({ apiKey });
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = msg.content[0]?.type === 'text' ? msg.content[0].text.trim() : '';
      return { success: true, message: text };
    } catch (err) {
      log.error({ err }, 'AI SMS generation failed');
      return reply.code(500).send({ success: false, error: 'AI generation failed' });
    }
  });

  // ─── SEND ONE-OFF EMAIL TO CONTACT ────────────────────────────────────────────

  app.post('/contacts/:id/send-email', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { subject: string; emailBody: string };

    if (!body.subject?.trim() || !body.emailBody?.trim()) {
      return reply.code(400).send({ success: false, error: 'subject and emailBody are required' });
    }

    const sgKey = process.env['SENDGRID_API_KEY'];
    const fromEmail = process.env['SENDGRID_FROM_EMAIL'] ?? 'jason@embedo.io';
    if (!sgKey) return reply.code(500).send({ success: false, error: 'Email not configured' });

    const contact = await db.contact.findUnique({
      where: { id },
      include: { business: { select: { name: true, settings: true } } },
    });
    if (!contact) throw new NotFoundError('Contact', id);
    if (!contact.email) return reply.code(400).send({ success: false, error: 'Contact has no email address' });

    const settings = contact.business.settings as Record<string, unknown> | null;
    const rewardSettings = settings?.['rewardEmails'] as Record<string, unknown> | undefined;

    const html = buildOutreachHtml({
      businessName: contact.business.name,
      recipientName: contact.firstName || undefined,
      subject: body.subject,
      body: body.emailBody,
      accentColor: (rewardSettings?.['accentColor'] as string) ?? '#7C3AED',
      logoUrl: (rewardSettings?.['logoUrl'] as string) || undefined,
      fontFamily: (rewardSettings?.['fontFamily'] as string) ?? 'helvetica',
    });

    try {
      sgMail.setApiKey(sgKey);
      await sgMail.send({
        to: contact.email,
        from: { email: fromEmail, name: contact.business.name },
        subject: body.subject.replace(/\{\{firstName\}\}/g, contact.firstName ?? 'there').replace(/\{\{business\}\}/g, contact.business.name),
        html,
      });

      // Log activity
      await db.contactActivity.create({
        data: {
          contactId: id,
          businessId: contact.businessId,
          type: 'EMAIL',
          title: `Email sent: ${body.subject}`,
          description: body.subject,
        },
      });

      log.info({ contactId: id, email: contact.email }, 'One-off email sent');
      return { success: true };
    } catch (err) {
      log.error({ err, contactId: id }, 'Failed to send email');
      return reply.code(500).send({ success: false, error: 'Failed to send email' });
    }
  });

  // ─── SEND ONE-OFF SMS TO CONTACT ──────────────────────────────────────────────

  app.post('/contacts/:id/send-sms', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { message: string };

    if (!body.message?.trim()) return reply.code(400).send({ success: false, error: 'message is required' });

    const sid = process.env['TWILIO_ACCOUNT_SID'];
    const token = process.env['TWILIO_AUTH_TOKEN'];
    const from = process.env['TWILIO_FROM_NUMBER'];
    if (!sid || !token || !from) return reply.code(500).send({ success: false, error: 'SMS not configured' });

    const contact = await db.contact.findUnique({
      where: { id },
      include: { business: { select: { name: true } } },
    });
    if (!contact) throw new NotFoundError('Contact', id);
    if (!contact.phone) return reply.code(400).send({ success: false, error: 'Contact has no phone number' });

    const smsText = body.message
      .replace(/\{\{firstName\}\}/g, contact.firstName ?? 'there')
      .replace(/\{\{business\}\}/g, contact.business.name);

    try {
      const client = twilio(sid, token);
      await client.messages.create({ to: contact.phone, from, body: smsText });

      await db.contactActivity.create({
        data: {
          contactId: id,
          businessId: contact.businessId,
          type: 'SMS',
          title: `SMS sent`,
          description: smsText.slice(0, 200),
        },
      });

      log.info({ contactId: id, phone: contact.phone }, 'One-off SMS sent');
      return { success: true };
    } catch (err) {
      log.error({ err, contactId: id }, 'Failed to send SMS');
      return reply.code(500).send({ success: false, error: 'Failed to send SMS' });
    }
  });
}
