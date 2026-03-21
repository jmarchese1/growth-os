import { db } from '@embedo/db';

// Cache prompts for 5 minutes to avoid DB query on every message
const promptCache = new Map<string, { prompt: string; expiry: number }>();

/**
 * Build the system prompt for the chatbot based on business settings.
 */
export async function buildChatbotSystemPrompt(businessId: string): Promise<string> {
  const cached = promptCache.get(businessId);
  if (cached && cached.expiry > Date.now()) return cached.prompt;

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

  const prompt = `You are the AI assistant for ${business.name}${cuisine ? `, a ${cuisine} restaurant` : ''}.
Your personality: ${persona ?? 'friendly, helpful, and professional'}
BUSINESS: ${business.name} | Phone: ${business.phone ?? 'N/A'} | ${formatAddress(business.address)}
HOURS: ${hoursText}
RULES: Be concise (1-2 sentences). Be warm. Capture leads when visitors share contact info. Help book reservations. Say you don't know if unsure.`;

  promptCache.set(businessId, { prompt, expiry: Date.now() + 5 * 60 * 1000 });
  return prompt;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatAddress(address: unknown): string {
  if (!address || typeof address !== 'object') return 'See our website for address';
  const a = address as Record<string, string>;
  return [a['street'], a['city'], a['state'], a['zip']].filter(Boolean).join(', ');
}
