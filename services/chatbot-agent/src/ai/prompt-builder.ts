import { db } from '@embedo/db';

/**
 * Build the system prompt for the chatbot based on business settings.
 */
export async function buildChatbotSystemPrompt(businessId: string): Promise<string> {
  const business = await db.business.findUniqueOrThrow({ where: { id: businessId } });
  const settings = (business.settings as Record<string, unknown>) ?? {};

  const hours = settings['hours'] as Record<string, { open: string; close: string }> | undefined;
  const cuisine = settings['cuisine'] as string | undefined;
  const persona = settings['chatbotPersona'] as string | undefined;

  const hoursText = hours
    ? Object.entries(hours)
        .map(([day, h]) => `${capitalize(day)}: ${h.open}–${h.close}`)
        .join('\n')
    : 'Contact us for current hours';

  return `You are the AI assistant for ${business.name}${cuisine ? `, a ${cuisine} restaurant` : ''}.

Your personality: ${persona ?? 'friendly, helpful, and professional'}

BUSINESS DETAILS:
Name: ${business.name}
Phone: ${business.phone ?? 'Please contact us via the form'}
Email: ${business.email ?? 'Please contact us via the form'}
Address: ${formatAddress(business.address)}

HOURS:
${hoursText}

YOUR ROLE:
- Answer questions about the business warmly and helpfully
- Capture lead information when visitors share contact details
- Help visitors book reservations or appointments
- Suggest calling or visiting for complex requests

LEAD CAPTURE GUIDANCE:
- When a visitor provides their name, email, or phone — use the capture_lead tool immediately
- When a visitor wants to make a reservation — use the book_appointment tool
- When a visitor seems like a business owner interested in AI services — use the trigger_proposal tool

TONE:
- Conversational and warm, not robotic
- Keep responses concise (2-3 sentences when possible)
- Use the visitor's name when you know it
- Always offer a next step or call to action

If you don't know the answer to something, say so honestly and offer to connect them with the team.`;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatAddress(address: unknown): string {
  if (!address || typeof address !== 'object') return 'See our website for address';
  const a = address as Record<string, string>;
  return [a['street'], a['city'], a['state'], a['zip']].filter(Boolean).join(', ');
}
