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

    // Always append lead capture instructions
    prompt += `\n\n## Lead Capture (IMPORTANT)
Whenever a visitor mentions their name, email, or phone number — even casually — immediately use the capture_lead tool to save their info. Don't wait for them to explicitly say "here's my contact info." Examples:
- "I'm Jason" → capture_lead with name: "Jason"
- "you can reach me at jason@gmail.com" → capture_lead with email
- "my number is 555-1234" → capture_lead with phone
- "Jason here, email is j@test.com" → capture_lead with name + email
Be natural about it — acknowledge the info warmly and continue the conversation.`;

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
- ALWAYS use the capture_lead tool when a visitor mentions their name, email, or phone — even casually ("I'm Jason", "email me at j@test.com", "my number is 555-1234")
- Help book reservations when asked — use the book_appointment tool
- Naturally try to learn the visitor's name during conversation (e.g. "By the way, who am I chatting with?")
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

/**
 * Build the system prompt from API gateway context (preferred path — no DB query needed).
 * Includes dynamic tool capability descriptions based on what's enabled.
 */
export function buildChatbotSystemPromptFromContext(
  context: Record<string, unknown>,
  enabledTools: Array<{ type: string; config: Record<string, unknown> }>,
): string {
  // Check for a top-level custom system prompt (e.g. Embedo platform Cubey)
  const topLevelPrompt = context['customSystemPrompt'] as string | undefined;
  if (topLevelPrompt) return topLevelPrompt;

  const biz = (context['business'] as Record<string, unknown>) ?? {};
  const settings = (biz['settings'] as Record<string, unknown>) ?? {};
  const capabilities = (context['capabilities'] as string[]) ?? [];

  const name = (biz['name'] as string) ?? 'our business';
  const phone = biz['phone'] as string | undefined;
  const address = biz['address'];
  const cuisine = (settings['cuisine'] as string) ?? (biz['cuisine'] as string | undefined);
  const persona = (settings['chatbotPersona'] as string) ?? 'friendly, helpful, and professional';
  const customPrompt = settings['chatbotSystemPrompt'] as string | undefined;
  const knowledgeBase = settings['chatbotKnowledgeBase'] as string | undefined;
  const hours = settings['hours'] as Record<string, { open: string; close: string }> | undefined;

  let prompt: string;

  if (customPrompt) {
    prompt = customPrompt;
    if (knowledgeBase) {
      prompt += `\n\n## Knowledge Base\nUse this information to answer customer questions accurately:\n\n${knowledgeBase}`;
    }
    const bizInfo = buildBusinessContext(name, phone, address, hours, cuisine);
    prompt += `\n\n## Business Info\n${bizInfo}`;
  } else {
    const hoursText = hours
      ? Object.entries(hours)
          .map(([day, h]) => `${capitalize(day)}: ${h.open}–${h.close}`)
          .join('\n')
      : 'Contact us for current hours';

    prompt = `You are the AI assistant for ${name}${cuisine ? `, a ${cuisine} restaurant` : ''}.
Your personality: ${persona}

BUSINESS: ${name} | Phone: ${phone ?? 'N/A'} | ${formatAddress(address)}
HOURS:
${hoursText}

${knowledgeBase ? `## Knowledge Base\n${knowledgeBase}\n\n` : ''}`;
  }

  // Build available actions section based on enabled tools
  const actionLines: string[] = [];
  actionLines.push('- Save customer contact info (use capture_lead tool — call it immediately when they mention name, email, or phone)');
  actionLines.push('- Make table reservations (use make_reservation tool)');
  actionLines.push('- Look up business info like hours, location, menu (use get_business_info tool)');

  const toolTypeMap = new Map(enabledTools.map((t) => [t.type, t.config ?? {}]));

  if (toolTypeMap.has('TAKEOUT_ORDERS')) {
    const config = toolTypeMap.get('TAKEOUT_ORDERS')!;
    const items = config['menuItems'] as Array<{ name: string; price: number }> | undefined;
    const menuHint = items?.length ? ` — menu: ${items.map((i) => `${i.name} $${i.price}`).join(', ')}` : '';
    actionLines.push(`- Take takeout orders (use create_order tool${menuHint})`);
  }
  if (toolTypeMap.has('WAITLIST')) {
    const config = toolTypeMap.get('WAITLIST')!;
    const avg = config['avgWaitMinutes'] as number | undefined;
    actionLines.push(`- Add guests to waitlist (use add_to_waitlist tool${avg ? ` — avg wait: ~${avg} min` : ''})`);
  }
  if (toolTypeMap.has('CATERING_REQUESTS')) {
    actionLines.push('- Submit catering inquiries (use submit_catering_inquiry tool)');
  }
  if (toolTypeMap.has('FEEDBACK_COLLECTION')) {
    actionLines.push('- Collect customer feedback (use collect_feedback tool)');
  }
  if (toolTypeMap.has('GIFT_CARD_LOYALTY')) {
    actionLines.push('- Check gift card balances (use check_gift_card_balance tool — code format: GC-XXXXX)');
  }
  if (toolTypeMap.has('DAILY_SPECIALS')) {
    actionLines.push("- Get today's specials and unavailable items (use get_daily_specials tool)");
  }

  prompt += `\n\n## Available Actions
You can perform these actions during the conversation:
${actionLines.join('\n')}

## Rules
- Be concise (1-3 sentences per response)
- Be warm and helpful
- When a customer wants to perform an action, use the appropriate tool immediately
- Confirm the result with the customer after the tool executes
- ALWAYS capture contact info when mentioned — even casually ("I'm Jason" → capture_lead)
- Always collect name and phone when taking orders or reservations
- Naturally try to learn the visitor's name (e.g. "By the way, who am I chatting with?")
- If you don't know something specific, say so honestly and suggest they call or visit`;

  if (capabilities.length > 0) {
    prompt += `\n\n## Enabled Capabilities\n${capabilities.join(', ')}`;
  }

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
