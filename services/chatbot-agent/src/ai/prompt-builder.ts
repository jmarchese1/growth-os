import { db } from '@embedo/db';

// Cache prompts for 5 minutes to avoid DB query on every message
const promptCache = new Map<string, { prompt: string; expiry: number }>();

/**
 * Build the system prompt for the chatbot based on business settings.
 * Priority: custom system prompt > auto-generated from business data
 */
export async function buildChatbotSystemPrompt(businessId: string): Promise<string> {
  const cached = promptCache.get(businessId);
  if (cached && cached.expiry > Date.now()) return cached.prompt;

  const business = await db.business.findUniqueOrThrow({ where: { id: businessId } });
  const settings = (business.settings as Record<string, unknown>) ?? {};

  const customPrompt = settings['chatbotSystemPrompt'] as string | undefined;
  const knowledgeBase = settings['chatbotKnowledgeBase'] as string | undefined;
  const persona = settings['chatbotPersona'] as string | undefined;
  const hours = settings['hours'] as Record<string, { open: string; close: string }> | undefined;
  const cuisine = settings['cuisine'] as string | undefined;

  let prompt: string;

  if (customPrompt) {
    // User wrote a custom system prompt — use it as the foundation
    prompt = customPrompt;

    // Append knowledge base if provided
    if (knowledgeBase) {
      prompt += `\n\n## Knowledge Base\nUse this information to answer customer questions accurately:\n\n${knowledgeBase}`;
    }

    // Append core business info the user might not have included
    const bizInfo = buildBusinessContext(business.name, business.phone, business.address, hours, cuisine);
    prompt += `\n\n## Business Info\n${bizInfo}`;

  } else {
    // No custom prompt — generate one from business data
    const hoursText = hours
      ? Object.entries(hours)
          .map(([day, h]) => `${capitalize(day)}: ${h.open}–${h.close}`)
          .join('\n')
      : 'Contact us for current hours';

    prompt = `You are the AI assistant for ${business.name}${cuisine ? `, a ${cuisine} restaurant` : ''}.
Your personality: ${persona ?? 'friendly, helpful, and professional'}

BUSINESS: ${business.name} | Phone: ${business.phone ?? 'N/A'} | ${formatAddress(business.address)}
HOURS:
${hoursText}

${knowledgeBase ? `## Knowledge Base\n${knowledgeBase}\n\n` : ''}RULES:
- Be concise (1-3 sentences per response)
- Be warm and helpful
- When visitors share their name, phone, or email, use the capture_lead tool
- Help book reservations when asked — use the book_appointment tool
- If you don't know something specific, say so honestly and suggest they call or visit`;
  }

  promptCache.set(businessId, { prompt, expiry: Date.now() + 5 * 60 * 1000 });
  return prompt;
}

function buildBusinessContext(name: string, phone: unknown, address: unknown, hours: Record<string, { open: string; close: string }> | undefined, cuisine: string | undefined): string {
  const parts: string[] = [];
  parts.push(`Business: ${name}`);
  if (cuisine) parts.push(`Cuisine: ${cuisine}`);
  if (phone) parts.push(`Phone: ${phone}`);
  parts.push(`Address: ${formatAddress(address)}`);
  if (hours) {
    parts.push('Hours:');
    for (const [day, h] of Object.entries(hours)) {
      parts.push(`  ${capitalize(day)}: ${h.open}–${h.close}`);
    }
  }
  return parts.join('\n');
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatAddress(address: unknown): string {
  if (!address || typeof address !== 'object') return 'See our website for address';
  const a = address as Record<string, string>;
  return [a['street'], a['city'], a['state'], a['zip']].filter(Boolean).join(', ');
}
