import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { validate, createLogger } from '@embedo/utils';
import { db } from '@embedo/db';
import { generateProposalContent } from './generator/ai-writer.js';
import { renderProposalHtml } from './generator/html.js';
import { proposalViewedQueue, leadCreatedQueue } from '@embedo/queue';
import { env } from './config.js';
import type { ProposalIntakeData } from '@embedo/types';
import { sendOwnerAlert } from './notifications/owner-alert.js';
import { sendProposalToContact } from './notifications/send-proposal.js';

const log = createLogger('proposal-engine:routes');

const intakeSchema = z.object({
  businessName: z.string().min(2),
  industry: z.string().min(2),
  size: z.enum(['solo', 'small', 'medium', 'large']),
  location: z.string().min(2),
  currentSystems: z.string().optional(),
  goals: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  businessId: z.string().optional(),
  contactId: z.string().optional(),
});

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => ({ ok: true, service: 'proposal-engine' }));

  // ─── Generate proposal ─────────────────────────────────────────────────────
  app.post('/proposals/generate', async (request, reply) => {
    const rawForm = validate(intakeSchema, request.body);
    // ProposalIntakeData doesn't include businessId/contactId — extract separately
    const { businessId: formBusinessId, contactId: formContactId, ...intakeFields } = rawForm;
    const intakeData = intakeFields as unknown as ProposalIntakeData;
    log.info({ businessName: intakeData.businessName }, 'Generating proposal');

    // Generate AI content
    const content = await generateProposalContent(intakeData);

    // Store in DB
    const proposal = await db.proposal.create({
      data: {
        ...(formBusinessId ? { businessId: formBusinessId } : {}),
        ...(formContactId ? { contactId: formContactId } : {}),
        intakeData: intakeData as object,
        content: content as unknown as object,
        status: 'DRAFT',
      },
    });

    const shareUrl = `${env.PROPOSAL_BASE_URL}/${proposal.shareToken}`;

    log.info({ proposalId: proposal.id, shareUrl }, 'Proposal created');

    // Emit lead.created event so lead-engine can normalize + create a Contact
    const ownerBusinessId = (env as Record<string, unknown>)['EMBEDO_BUSINESS_ID'] as string | undefined;
    if (ownerBusinessId) {
      await leadCreatedQueue().add(`proposal:${proposal.id}`, {
        businessId: ownerBusinessId,
        source: 'WEBSITE',
        sourceId: proposal.id,
        rawData: {
          name: intakeData.contactName,
          email: intakeData.contactEmail,
          phone: intakeData.contactPhone,
          businessName: intakeData.businessName,
          industry: intakeData.industry,
          size: intakeData.size,
          location: intakeData.location,
          interest: 'proposal',
        },
      });
    }

    // Notify Jason immediately (fire-and-forget, non-fatal)
    void sendOwnerAlert({
      businessName: intakeData.businessName,
      industry: intakeData.industry,
      size: intakeData.size,
      location: intakeData.location,
      shareUrl,
      ...(intakeData.contactName ? { contactName: intakeData.contactName } : {}),
      ...(intakeData.contactEmail ? { contactEmail: intakeData.contactEmail } : {}),
      ...(intakeData.goals ? { goals: intakeData.goals } : {}),
    });

    return reply.code(201).send({
      proposalId: proposal.id,
      shareUrl,
      content,
    });
  });

  // ─── View proposal by share token ──────────────────────────────────────────
  app.get('/proposals/:shareToken', async (request, reply) => {
    const { shareToken } = request.params as { shareToken: string };
    const { format } = request.query as { format?: string };

    const proposal = await db.proposal.findUnique({ where: { shareToken } });
    if (!proposal) return reply.code(404).send({ error: 'Proposal not found' });

    // Track view
    if (!proposal.viewedAt) {
      await db.proposal.update({
        where: { id: proposal.id },
        data: { viewedAt: new Date(), status: 'VIEWED' },
      });

      // Emit proposal.viewed event
      await proposalViewedQueue().add(`viewed:${proposal.id}`, {
        proposalId: proposal.id,
        businessId: proposal.businessId ?? undefined,
        contactId: proposal.contactId ?? undefined,
        shareToken,
      });
    }

    const intake = proposal.intakeData as unknown as ProposalIntakeData;
    const content = proposal.content as unknown as Parameters<typeof renderProposalHtml>[0]['content'];

    if (format === 'json') {
      return reply.code(200).send({ intake, content });
    }

    // Render HTML
    const html = renderProposalHtml({
      intake,
      content,
      shareToken,
      proposalBaseUrl: env.PROPOSAL_BASE_URL,
    });

    return reply.header('Content-Type', 'text/html').send(html);
  });

  // ─── List proposals ────────────────────────────────────────────────────────
  app.get('/proposals', async (request) => {
    const { businessId, page = '1', pageSize = '20' } = request.query as Record<string, string>;

    const where = businessId ? { businessId } : {};
    const [items, total] = await Promise.all([
      db.proposal.findMany({
        where,
        skip: (parseInt(page) - 1) * parseInt(pageSize),
        take: parseInt(pageSize),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          shareToken: true,
          status: true,
          viewedAt: true,
          acceptedAt: true,
          createdAt: true,
          intakeData: true,
        },
      }),
      db.proposal.count({ where }),
    ]);

    return { items, total, page: parseInt(page), pageSize: parseInt(pageSize) };
  });

  // ─── Send proposal to contact ──────────────────────────────────────────────
  app.post('/proposals/:id/send', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { contactEmail, contactName, shareUrl } = validate(
      z.object({
        contactEmail: z.string().email(),
        contactName: z.string().optional(),
        shareUrl: z.string().url(),
      }),
      request.body
    );

    const proposal = await db.proposal.findUnique({ where: { id } });
    if (!proposal) return reply.code(404).send({ error: 'Proposal not found' });

    const businessName = (proposal.intakeData as Record<string, unknown>)['businessName'] as string;

    try {
      await sendProposalToContact({
        contactEmail,
        contactName,
        businessName,
        shareUrl,
      });

      await db.proposal.update({
        where: { id },
        data: { status: 'SENT' },
      });

      log.info({ proposalId: id, contactEmail }, 'Proposal sent to contact');
      return reply.code(200).send({ success: true, message: 'Proposal sent' });
    } catch (err) {
      log.error({ err, proposalId: id }, 'Failed to send proposal');
      return reply.code(500).send({ error: 'Failed to send proposal' });
    }
  });
}
