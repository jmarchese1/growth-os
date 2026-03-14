import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import sgMail from '@sendgrid/mail';
import { createLogger, validate, formatDate } from '@embedo/utils';
import { db } from '@embedo/db';
import { proposalViewedQueue, leadCreatedQueue } from '@embedo/queue';
import type { ProposalIntakeData, ProposalContent, ProposalModule } from '@embedo/types';

const log = createLogger('api:proposals');

// ─── Embedo modules ──────────────────────────────────────────────────────────

const EMBEDO_MODULES: ProposalModule[] = [
  {
    name: 'AI Voice Receptionist',
    description: 'A 24/7 AI phone agent powered by ElevenLabs that answers calls, takes reservations, answers questions, and captures lead information.',
    benefits: ['Never miss a call', '24/7 availability', 'Consistent professional experience', 'Automatic lead capture from every call'],
    included: true,
  },
  {
    name: 'AI Website Chatbot',
    description: 'An intelligent chatbot embedded on your website that engages visitors, answers questions, and captures leads around the clock.',
    benefits: ['Convert website visitors into customers', 'Instant response to inquiries', 'Appointment booking integration', 'Works while you sleep'],
    included: true,
  },
  {
    name: 'Lead Generation System',
    description: 'A centralized system that collects leads from all channels and automatically triggers follow-up sequences via SMS and email.',
    benefits: ['Automated SMS follow-ups', 'Email nurture sequences', 'Lead scoring and prioritization', 'Never lose a lead again'],
    included: true,
  },
  {
    name: 'Social Media Automation',
    description: 'AI-generated social content scheduled and posted automatically. Comment monitoring with instant auto-DM to engaged followers.',
    benefits: ['Consistent social presence without effort', 'Turn comments into conversations', 'AI-generated content tailored to your brand', 'Convert followers into customers'],
    included: true,
  },
  {
    name: 'Custom Survey Engine',
    description: 'Automated surveys sent to customers post-visit or post-call, with responses triggering custom promotions and follow-ups.',
    benefits: ['Understand customer satisfaction', 'Automatically send promotions based on responses', 'Build customer loyalty', 'Collect valuable business insights'],
    included: true,
  },
  {
    name: 'Professional Website',
    description: 'A modern, mobile-optimized website generated and deployed for your business, with integrated booking, chatbot, and lead capture.',
    benefits: ['Professional online presence', 'Mobile-first design', 'Built-in booking system', 'SEO-optimized'],
    included: true,
  },
  {
    name: 'Appointment Scheduling',
    description: 'Seamless booking integration that allows customers to schedule appointments directly from your website, chatbot, or after a call.',
    benefits: ['Reduce no-shows with automatic reminders', 'Online booking 24/7', 'Calendar management', 'CRM integration'],
    included: true,
  },
];

// ─── AI content generation ───────────────────────────────────────────────────

async function generateProposalContent(intake: ProposalIntakeData): Promise<ProposalContent> {
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const anthropic = new Anthropic({ apiKey });

  const prompt = `You are writing a professional AI transformation proposal for a business.

BUSINESS DETAILS:
- Business Name: ${intake.businessName}
- Industry: ${intake.industry}
- Size: ${intake.size}
- Location: ${intake.location}
- Current Systems: ${intake.currentSystems ?? 'Not specified'}
- Goals: ${intake.goals ?? 'Not specified'}
- Contact: ${intake.contactName ?? 'Business Owner'}

Write a compelling, personalized business proposal for Embedo — an AI automation platform that transforms local businesses. The proposal should feel personal and specific to this business.

Write each section and label them clearly with these exact headers:
## EXECUTIVE SUMMARY
## PROBLEM STATEMENT
## OUR SOLUTION
## EXPECTED BENEFITS
## INVESTMENT OVERVIEW
## IMPLEMENTATION TIMELINE
## NEXT STEPS

Make it professional, specific to the ${intake.industry} industry, and reference the business by name (${intake.businessName}).
Focus on concrete outcomes and ROI. Keep the tone confident and exciting about AI's potential for their business.
The EXPECTED BENEFITS section should list 5-7 specific, measurable benefits.
Keep total length under 1500 words.`;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
  return parseProposalResponse(text, intake);
}

function parseProposalResponse(text: string, intake: ProposalIntakeData): ProposalContent {
  const sections: Record<string, string> = {};
  const headers = ['EXECUTIVE SUMMARY', 'PROBLEM STATEMENT', 'OUR SOLUTION', 'EXPECTED BENEFITS', 'INVESTMENT OVERVIEW', 'IMPLEMENTATION TIMELINE', 'NEXT STEPS'];

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i]!;
    const nextHeader = headers[i + 1];
    const startMarker = `## ${header}`;
    const start = text.indexOf(startMarker);
    if (start === -1) continue;
    const contentStart = start + startMarker.length;
    const end = nextHeader ? text.indexOf(`## ${nextHeader}`, contentStart) : text.length;
    sections[header] = text.slice(contentStart, end === -1 ? text.length : end).trim();
  }

  const benefitsText = sections['EXPECTED BENEFITS'] ?? '';
  const benefits = benefitsText
    .split('\n')
    .filter((line) => line.trim().match(/^[-•*\d]/))
    .map((line) => line.replace(/^[-•*\d.\s]+/, '').trim())
    .filter(Boolean);

  const basePrices: Record<string, string> = { solo: '$497/month', small: '$797/month', medium: '$1,297/month', large: '$2,497/month' };
  const defaultPricing = `Starting at ${basePrices[intake.size] ?? '$797/month'} — includes all AI modules, setup, and ongoing optimization. No long-term contracts required.`;

  return {
    executiveSummary: sections['EXECUTIVE SUMMARY'] ?? '',
    problemStatement: sections['PROBLEM STATEMENT'] ?? '',
    solution: sections['OUR SOLUTION'] ?? '',
    modules: EMBEDO_MODULES,
    expectedBenefits: benefits.length > 0 ? benefits : ['Increased revenue', 'Time savings', 'Better customer experience'],
    investmentOverview: sections['INVESTMENT OVERVIEW'] ?? defaultPricing,
    timeline: sections['IMPLEMENTATION TIMELINE'] ?? '2-3 weeks for full deployment',
    nextSteps: sections['NEXT STEPS'] ?? 'Schedule a discovery call to begin your AI transformation.',
    callToAction: `Book your free strategy call to see how Embedo can transform ${intake.businessName}.`,
  };
}

function buildFallbackContent(intake: ProposalIntakeData): ProposalContent {
  const basePrices: Record<string, string> = { solo: '$497/month', small: '$797/month', medium: '$1,297/month', large: '$2,497/month' };
  return {
    executiveSummary: `Transform ${intake.businessName} with AI-powered automation. Embedo's intelligent systems handle customer interactions 24/7, increase booking rates, and reduce manual work.`,
    problemStatement: intake.goals || `${intake.businessName} is looking to streamline operations and improve customer experience. Current systems lack automation and 24/7 availability.`,
    solution: 'Embedo provides a complete AI automation suite: voice receptionist, website chatbot, lead management, social media automation, and more.',
    modules: EMBEDO_MODULES,
    expectedBenefits: ['24/7 customer availability without hiring', 'Automated lead capture and follow-up', 'Reduced operational costs', 'Improved customer satisfaction', 'Better booking and conversion rates'],
    investmentOverview: `Starting at ${basePrices[intake.size] ?? '$797/month'} — includes all AI modules, setup, and ongoing optimization. No long-term contracts required.`,
    timeline: 'Fast deployment: setup in 48 hours, fully operational in 5 business days.',
    nextSteps: 'Schedule a demo to see how Embedo transforms your business.',
    callToAction: `Book your free strategy call to see how Embedo can transform ${intake.businessName}.`,
  };
}

// ─── HTML renderer ───────────────────────────────────────────────────────────

function renderProposalHtml(intake: ProposalIntakeData, content: ProposalContent): string {
  const date = formatDate(new Date());

  const modulesHtml = content.modules
    .filter((m) => m.included)
    .map((m) => `
      <div class="module">
        <h3>${m.name}</h3>
        <p>${m.description}</p>
        <ul>${m.benefits.map((b) => `<li>${b}</li>`).join('')}</ul>
      </div>`)
    .join('');

  const benefitsHtml = content.expectedBenefits.map((b) => `<li>${b}</li>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Transformation Proposal — ${intake.businessName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; background: #fff; }
    .container { max-width: 800px; margin: 0 auto; padding: 60px 40px; }
    .header { border-bottom: 3px solid #000; padding-bottom: 40px; margin-bottom: 48px; }
    .logo { font-size: 13px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #666; margin-bottom: 32px; }
    h1 { font-size: 40px; font-weight: 700; line-height: 1.1; margin-bottom: 16px; }
    .meta { font-size: 15px; color: #666; }
    .meta span { color: #1a1a1a; font-weight: 500; }
    section { margin-bottom: 48px; }
    h2 { font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #666; margin-bottom: 16px; border-top: 1px solid #e0e0e0; padding-top: 16px; }
    h3 { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
    p { font-size: 16px; line-height: 1.7; color: #333; margin-bottom: 12px; }
    ul { padding-left: 20px; }
    li { font-size: 15px; line-height: 1.8; color: #333; }
    .modules-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 16px; }
    .module { background: #f8f8f8; border-radius: 12px; padding: 24px; }
    .module h3 { font-size: 15px; margin-bottom: 8px; }
    .module p { font-size: 14px; margin-bottom: 12px; }
    .module li { font-size: 13px; }
    .cta-box { background: #000; color: #fff; border-radius: 16px; padding: 48px; text-align: center; margin-top: 48px; }
    .cta-box h2 { color: #fff; border-top: none; padding-top: 0; font-size: 13px; letter-spacing: 0.1em; }
    .cta-box p { color: rgba(255,255,255,0.8); }
    .cta-button { display: inline-block; margin-top: 24px; background: #fff; color: #000; padding: 16px 32px; border-radius: 100px; font-size: 15px; font-weight: 600; text-decoration: none; }
    @media (max-width: 600px) { .container { padding: 32px 20px; } h1 { font-size: 28px; } .modules-grid { grid-template-columns: 1fr; } }
    @media print { .cta-button { display: none; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Embedo — AI Infrastructure for Local Business</div>
      <h1>AI Transformation<br>Proposal for<br>${intake.businessName}</h1>
      <p class="meta">Prepared for <span>${intake.contactName ?? 'the Business Owner'}</span> · <span>${date}</span></p>
    </div>
    <section><h2>Executive Summary</h2><p>${content.executiveSummary}</p></section>
    <section><h2>The Challenge</h2><p>${content.problemStatement}</p></section>
    <section><h2>Our Solution</h2><p>${content.solution}</p></section>
    <section><h2>What Gets Deployed</h2><div class="modules-grid">${modulesHtml}</div></section>
    <section><h2>Expected Outcomes</h2><ul>${benefitsHtml}</ul></section>
    <section><h2>Investment</h2><p>${content.investmentOverview}</p></section>
    <section><h2>Implementation Timeline</h2><p>${content.timeline}</p></section>
    <section><h2>Next Steps</h2><p>${content.nextSteps}</p></section>
    <div class="cta-box">
      <h2>Ready to Transform ${intake.businessName}?</h2>
      <p>${content.callToAction}</p>
      <a href="https://calendly.com/embedo/strategy" class="cta-button">Book Your Free Strategy Call</a>
    </div>
  </div>
</body>
</html>`;
}

// ─── Notifications ───────────────────────────────────────────────────────────

async function sendOwnerAlert(params: {
  businessName: string; industry: string; size: string; location: string; shareUrl: string;
  contactName?: string; contactEmail?: string; goals?: string;
}): Promise<void> {
  const ownerEmail = process.env['OWNER_EMAIL'];
  const apiKey = process.env['SENDGRID_API_KEY'];
  const fromEmail = process.env['SENDGRID_FROM_EMAIL'];
  if (!ownerEmail || !apiKey || !fromEmail) return;

  sgMail.setApiKey(apiKey);
  const { businessName, industry, size, location, shareUrl, contactName, contactEmail, goals } = params;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4f46e5;">New Proposal Request</h2>
      <table style="border-collapse: collapse; width: 100%;">
        <tr><td style="padding: 8px; font-weight: bold; color: #6b7280; width: 140px;">Business</td><td style="padding: 8px;">${businessName}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold; color: #6b7280;">Industry</td><td style="padding: 8px;">${industry}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold; color: #6b7280;">Size</td><td style="padding: 8px;">${size}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold; color: #6b7280;">Location</td><td style="padding: 8px;">${location}</td></tr>
        ${contactName ? `<tr><td style="padding: 8px; font-weight: bold; color: #6b7280;">Contact</td><td style="padding: 8px;">${contactName}</td></tr>` : ''}
        ${contactEmail ? `<tr><td style="padding: 8px; font-weight: bold; color: #6b7280;">Email</td><td style="padding: 8px;"><a href="mailto:${contactEmail}">${contactEmail}</a></td></tr>` : ''}
        ${goals ? `<tr><td style="padding: 8px; font-weight: bold; color: #6b7280;">Goals</td><td style="padding: 8px;">${goals}</td></tr>` : ''}
      </table>
      <div style="margin-top: 24px;">
        <a href="${shareUrl}" style="background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">View Proposal →</a>
      </div>
    </div>`;

  try {
    await sgMail.send({ to: ownerEmail, from: { email: fromEmail, name: 'Embedo' }, subject: `New proposal request — ${businessName}`, html });
  } catch (err) {
    log.warn({ err }, 'Failed to send owner alert — non-fatal');
  }
}

async function sendProposalToContact(params: {
  contactEmail: string; contactName?: string; businessName: string; shareUrl: string;
}): Promise<void> {
  const apiKey = process.env['SENDGRID_API_KEY'];
  const fromEmail = process.env['SENDGRID_FROM_EMAIL'];
  if (!apiKey || !fromEmail) throw new Error('Email service not configured');

  sgMail.setApiKey(apiKey);
  const { contactEmail, contactName, businessName, shareUrl } = params;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
      <div style="background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Your AI Proposal</h1>
        <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 16px;">${businessName}</p>
      </div>
      <div style="background: #f9fafb; padding: 40px 20px;">
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6;">${contactName ? `Hi ${contactName},` : 'Hi there,'}</p>
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #4b5563;">We've prepared a personalized AI proposal tailored to your business needs. Click below to review it.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${shareUrl}" style="background: #6366f1; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">View Your Proposal →</a>
        </div>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #6b7280; text-align: center;">Questions? Reply to this email and we'll get back to you shortly.</p>
      </div>
      <div style="background: white; border-top: 1px solid #e5e7eb; padding: 24px 20px; text-align: center; border-radius: 0 0 12px 12px;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af;">Embedo — AI Infrastructure for Local Businesses<br/><a href="https://embedo.io" style="color: #6366f1; text-decoration: none;">embedo.io</a></p>
      </div>
    </div>`;

  await sgMail.send({ to: contactEmail, from: { email: fromEmail, name: 'Embedo' }, subject: `Your personalized proposal — ${businessName}`, html });
}

// ─── Zod schemas ─────────────────────────────────────────────────────────────

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

// ─── Routes ──────────────────────────────────────────────────────────────────

export async function proposalRoutes(app: FastifyInstance): Promise<void> {
  const proposalBaseUrl = process.env['PROPOSAL_BASE_URL'] ?? 'http://localhost:3010/proposal';

  // POST /proposals/generate
  app.post('/proposals/generate', async (request, reply) => {
    const rawForm = validate(intakeSchema, request.body);
    const { businessId: formBusinessId, contactId: formContactId, ...intakeFields } = rawForm;
    const intakeData = intakeFields as unknown as ProposalIntakeData;
    log.info({ businessName: intakeData.businessName }, 'Generating proposal');

    let content: ProposalContent;
    try {
      content = await generateProposalContent(intakeData);
    } catch (err) {
      log.error({ err, businessName: intakeData.businessName }, 'AI generation failed — using fallback');
      content = buildFallbackContent(intakeData);
    }

    const proposal = await db.proposal.create({
      data: {
        ...(formBusinessId ? { businessId: formBusinessId } : {}),
        ...(formContactId ? { contactId: formContactId } : {}),
        intakeData: intakeData as object,
        content: content as unknown as object,
        status: 'DRAFT',
      },
    });

    const shareUrl = `${proposalBaseUrl}/${proposal.shareToken}`;
    log.info({ proposalId: proposal.id }, 'Proposal created');

    const ownerBusinessId = process.env['EMBEDO_BUSINESS_ID'];
    if (ownerBusinessId) {
      try {
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
      } catch (err) {
        log.warn({ err }, 'Failed to enqueue lead.created event — non-fatal');
      }
    }

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

    return reply.code(201).send({ proposalId: proposal.id, shareUrl, content });
  });

  // GET /proposals
  app.get('/proposals', async (request) => {
    const { businessId, page = '1', pageSize = '20' } = request.query as Record<string, string>;
    const where = businessId ? { businessId } : {};
    const [items, total] = await Promise.all([
      db.proposal.findMany({
        where,
        skip: (parseInt(page) - 1) * parseInt(pageSize),
        take: parseInt(pageSize),
        orderBy: { createdAt: 'desc' },
        select: { id: true, shareToken: true, status: true, viewedAt: true, acceptedAt: true, createdAt: true, intakeData: true },
      }),
      db.proposal.count({ where }),
    ]);
    return { items, total, page: parseInt(page), pageSize: parseInt(pageSize) };
  });

  // GET /proposals/:shareToken — renders the shareable proposal page
  app.get('/proposals/:shareToken', async (request, reply) => {
    const { shareToken } = request.params as { shareToken: string };
    const { format } = request.query as { format?: string };

    const proposal = await db.proposal.findUnique({ where: { shareToken } });
    if (!proposal) return reply.code(404).send({ error: 'Proposal not found' });

    if (!proposal.viewedAt) {
      await db.proposal.update({ where: { id: proposal.id }, data: { viewedAt: new Date(), status: 'VIEWED' } });
      try {
        await proposalViewedQueue().add(`viewed:${proposal.id}`, {
          proposalId: proposal.id,
          ...(proposal.businessId && { businessId: proposal.businessId }),
          ...(proposal.contactId && { contactId: proposal.contactId }),
          shareToken,
        });
      } catch (err) {
        log.warn({ err }, 'Failed to enqueue proposal.viewed event — non-fatal');
      }
    }

    const intake = proposal.intakeData as unknown as ProposalIntakeData;
    const content = proposal.content as unknown as ProposalContent;

    if (format === 'json') return reply.code(200).send({ intake, content });

    const html = renderProposalHtml(intake, content);
    return reply.header('Content-Type', 'text/html').send(html);
  });

  // POST /proposals/:id/send
  app.post('/proposals/:id/send', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { contactEmail, contactName, shareUrl } = validate(
      z.object({ contactEmail: z.string().email(), contactName: z.string().optional(), shareUrl: z.string().url() }),
      request.body
    );

    const proposal = await db.proposal.findUnique({ where: { id } });
    if (!proposal) return reply.code(404).send({ error: 'Proposal not found' });

    const businessName = (proposal.intakeData as Record<string, unknown>)['businessName'] as string;

    try {
      await sendProposalToContact({ contactEmail, ...(contactName && { contactName }), businessName, shareUrl });
      await db.proposal.update({ where: { id }, data: { status: 'SENT' } });
      log.info({ proposalId: id, contactEmail }, 'Proposal sent');
      return reply.code(200).send({ success: true, message: 'Proposal sent' });
    } catch (err) {
      log.error({ err, proposalId: id }, 'Failed to send proposal');
      return reply.code(500).send({ error: 'Failed to send proposal' });
    }
  });
}
