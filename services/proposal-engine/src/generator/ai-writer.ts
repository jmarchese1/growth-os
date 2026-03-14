import Anthropic from '@anthropic-ai/sdk';
import { createLogger, ExternalApiError } from '@embedo/utils';
import { env } from '../config.js';
import type { ProposalIntakeData, ProposalContent, ProposalModule } from '@embedo/types';

const log = createLogger('proposal-engine:ai-writer');

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

export const EMBEDO_MODULES: ProposalModule[] = [
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

/**
 * Generate a custom AI proposal based on intake form data.
 */
export async function generateProposalContent(
  intake: ProposalIntakeData,
): Promise<ProposalContent> {
  log.info({ businessName: intake.businessName }, 'Generating proposal');

  const prompt = buildProposalPrompt(intake);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min timeout

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001', // Using Haiku for faster responses; replace with claude-sonnet-4-6 if needed
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    clearTimeout(timeoutId);

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';

    // Parse the structured sections from Claude's response
    const content = parseProposalResponse(text, intake);
    log.info({ businessName: intake.businessName }, 'Proposal generated');
    return content;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    log.error({ err: errorMsg, businessName: intake.businessName }, 'Anthropic API error');
    throw new ExternalApiError('Anthropic', `Failed to generate proposal: ${errorMsg}`, err);
  }
}

function buildProposalPrompt(intake: ProposalIntakeData): string {
  return `You are writing a professional AI transformation proposal for a business.

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
}

function parseProposalResponse(text: string, intake: ProposalIntakeData): ProposalContent {
  const sections: Record<string, string> = {};
  const headers = [
    'EXECUTIVE SUMMARY',
    'PROBLEM STATEMENT',
    'OUR SOLUTION',
    'EXPECTED BENEFITS',
    'INVESTMENT OVERVIEW',
    'IMPLEMENTATION TIMELINE',
    'NEXT STEPS',
  ];

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

  // Extract benefits as array
  const benefitsText = sections['EXPECTED BENEFITS'] ?? '';
  const benefits = benefitsText
    .split('\n')
    .filter((line) => line.trim().match(/^[-•*\d]/))
    .map((line) => line.replace(/^[-•*\d.\s]+/, '').trim())
    .filter(Boolean);

  return {
    executiveSummary: sections['EXECUTIVE SUMMARY'] ?? '',
    problemStatement: sections['PROBLEM STATEMENT'] ?? '',
    solution: sections['OUR SOLUTION'] ?? '',
    modules: EMBEDO_MODULES,
    expectedBenefits: benefits.length > 0 ? benefits : ['Increased revenue', 'Time savings', 'Better customer experience'],
    investmentOverview: sections['INVESTMENT OVERVIEW'] ?? generateDefaultPricing(intake),
    timeline: sections['IMPLEMENTATION TIMELINE'] ?? '2-3 weeks for full deployment',
    nextSteps: sections['NEXT STEPS'] ?? 'Schedule a discovery call to begin your AI transformation.',
    callToAction: `Book your free strategy call to see how Embedo can transform ${intake.businessName}.`,
  };
}

function generateDefaultPricing(intake: ProposalIntakeData): string {
  const basePrices: Record<string, string> = {
    solo: '$497/month',
    small: '$797/month',
    medium: '$1,297/month',
    large: '$2,497/month',
  };
  const price = basePrices[intake.size] ?? '$797/month';
  return `Starting at ${price} — includes all AI modules, setup, and ongoing optimization. No long-term contracts required.`;
}
