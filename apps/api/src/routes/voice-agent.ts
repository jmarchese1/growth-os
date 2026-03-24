import type { FastifyInstance } from 'fastify';
import { ElevenLabsClient } from 'elevenlabs';
import twilio from 'twilio';
import { db } from '@embedo/db';
import { createLogger, NotFoundError, ExternalApiError } from '@embedo/utils';

const log = createLogger('api:voice-agent');


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildSystemPrompt(business: { name: string; phone: string | null; address: unknown; settings: unknown }, tools?: Array<{ type: string; enabled: boolean; config: any }>): string {
  const settings = (business.settings as Record<string, unknown>) ?? {};
  const hours = settings['hours'] as Record<string, { open: string; close: string }> | undefined;
  const cuisine = settings['cuisine'] as string | undefined;
  const maxPartySize = settings['maxPartySize'] as number | undefined;
  const persona = settings['chatbotPersona'] as string | undefined;
  const hoursText = hours
    ? Object.entries(hours).map(([day, h]) => `${day.charAt(0).toUpperCase() + day.slice(1)}: ${h.open} – ${h.close}`).join(', ')
    : 'Please ask the owner for current hours';
  const addr = business.address && typeof business.address === 'object'
    ? Object.values(business.address as Record<string, string>).filter(Boolean).join(', ')
    : 'See our website for address';

  // Resolve enabled tools
  const takeoutTool = tools?.find(t => t.type === 'TAKEOUT_ORDERS' && t.enabled);
  const waitlistTool = tools?.find(t => t.type === 'WAITLIST' && t.enabled);
  const dailySpecialsTool = tools?.find(t => t.type === 'DAILY_SPECIALS' && t.enabled);
  const cateringTool = tools?.find(t => t.type === 'CATERING_REQUESTS' && t.enabled);
  const giftCardTool = tools?.find(t => t.type === 'GIFT_CARD_LOYALTY' && t.enabled);
  const promoTool = tools?.find(t => t.type === 'PROMO_ALERTS' && t.enabled);
  const tableTool = tools?.find(t => t.type === 'TABLE_TURNOVER' && t.enabled);
  const feedbackTool = tools?.find(t => t.type === 'FEEDBACK_COLLECTION' && t.enabled);

  let capNum = 4;
  let capabilities = `YOUR CAPABILITIES:
1. Answer questions about the restaurant (hours, location, menu, specials)
2. Take reservation requests — collect: name, party size, date/time, phone number
3. Handle inquiries warmly and professionally
4. Transfer to a human if requested or unable to help`;

  let instructions = `RESERVATION INSTRUCTIONS:
- Collect the guest's name, party size, preferred date and time, and phone number.
- Reservations will be automatically confirmed via OpenTable when available.
- If the guest asks for a specific time that may not be available, offer to check nearby time slots.
- Always confirm the reservation details back to the guest before finalizing.`;

  // ── Takeout Orders ──
  if (takeoutTool) {
    const menuItems = takeoutTool.config?.['menuItems'] as Array<{ name: string; price: number; category: string; available: boolean }> | undefined;
    capNum++;
    capabilities += `\n${capNum}. Take takeout orders — collect: name, phone, items, special instructions, pickup time`;

    let menuText = '';
    if (menuItems && menuItems.length > 0) {
      const available = menuItems.filter(m => m.available !== false);
      const byCategory = available.reduce((acc, item) => {
        const cat = item.category || 'General';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
      }, {} as Record<string, typeof available>);
      menuText = '\nMENU:\n' + Object.entries(byCategory).map(([cat, items]) =>
        `${cat}: ${items.map(i => `${i.name} ($${i.price.toFixed(2)})`).join(', ')}`
      ).join('\n');
    }

    instructions += `
TAKEOUT ORDER INSTRUCTIONS:
- Ask what the customer would like to order.${menuText ? ' Refer to the menu below for available items and prices.' : ''}
- Collect the customer's name and phone number.
- Ask about any special instructions or dietary needs.
- Ask for their preferred pickup time, or suggest approximately ${(takeoutTool.config?.['prepTimeMinutes'] as number) ?? 20} minutes from now.
- Repeat the full order back to the customer before confirming.
- When the order is confirmed, output: ORDER_DATA: {"name":"...","phone":"...","items":[{"name":"...","quantity":1,"price":0.00,"notes":"..."}],"specialNotes":"...","pickupTime":"HH:mm"}${menuText}`;
  }

  // ── Waitlist ──
  if (waitlistTool) {
    const avgWait = (waitlistTool.config?.['avgWaitMinutes'] as number) ?? 15;
    capNum++;
    capabilities += `\n${capNum}. Add callers to the waitlist — collect: name, party size, phone number`;
    instructions += `
WAITLIST INSTRUCTIONS:
- If the restaurant is full or the caller asks about wait times, offer to add them to the waitlist.
- Collect the guest's name, party size, and phone number.
- Tell them the estimated wait is approximately ${avgWait} minutes per party ahead of them.
- Let them know they'll receive a text message when their table is ready.
- When confirmed, output: WAITLIST_DATA: {"name":"...","phone":"...","partySize":...,"notes":"..."}`;
  }

  // ── Daily Specials ──
  if (dailySpecialsTool) {
    const specials = dailySpecialsTool.config?.['specials'] as Array<{ name: string; description: string; price: number }> | undefined;
    const eightySixed = dailySpecialsTool.config?.['eightySixedItems'] as string[] | undefined;
    capNum++;
    capabilities += `\n${capNum}. Inform callers about today's specials and unavailable items`;

    if (specials && specials.length > 0) {
      instructions += `\nTODAY'S SPECIALS:\n${specials.map(s => `- ${s.name}${s.price ? ` ($${s.price.toFixed(2)})` : ''}: ${s.description}`).join('\n')}`;
    }
    if (eightySixed && eightySixed.length > 0) {
      instructions += `\nSOLD OUT / UNAVAILABLE TODAY: ${eightySixed.join(', ')}
- If a customer tries to order any of these items, politely let them know it's unavailable today and suggest alternatives.`;
    }
  }

  // ── Catering ──
  if (cateringTool) {
    const minHead = (cateringTool.config?.['minimumHeadcount'] as number) ?? 10;
    capNum++;
    capabilities += `\n${capNum}. Take catering inquiries — collect: name, phone, event date, headcount, dietary needs, budget`;
    instructions += `
CATERING INSTRUCTIONS:
- If someone asks about catering, event ordering, or large orders (${minHead}+ people), take their inquiry.
- Collect: name, phone number, event date and time, headcount, event type, dietary restrictions, and budget if they have one.
- Let them know someone will follow up with a custom quote.
- When confirmed, output: CATERING_DATA: {"name":"...","phone":"...","email":"...","eventDate":"YYYY-MM-DD","eventTime":"HH:mm","eventType":"...","headcount":...,"budget":...,"dietaryNotes":"...","menuRequests":"..."}`;
  }

  // ── Gift Cards ──
  if (giftCardTool) {
    const denominations = (giftCardTool.config?.['denominations'] as number[]) ?? [25, 50, 75, 100];
    capNum++;
    capabilities += `\n${capNum}. Sell gift cards over the phone`;
    instructions += `
GIFT CARD INSTRUCTIONS:
- Available denominations: ${denominations.map(d => `$${d}`).join(', ')}.
- Collect: purchaser's name and phone, recipient's name (if different), gift amount, and a personal message if they want one.
- Let them know the gift card code will be texted to them after purchase.
- When confirmed, output: GIFTCARD_DATA: {"purchaserName":"...","purchaserPhone":"...","recipientName":"...","amount":...,"personalMessage":"..."}`;
  }

  // ── Promos / Happy Hour ──
  if (promoTool) {
    const promos = promoTool.config?.['promos'] as Array<{ name: string; description: string; days?: string[] }> | undefined;
    if (promos && promos.length > 0) {
      capNum++;
      capabilities += `\n${capNum}. Tell callers about current promotions and deals`;
      instructions += `\nCURRENT PROMOTIONS:\n${promos.map(p => `- ${p.name}: ${p.description}${p.days ? ` (${p.days.join(', ')})` : ''}`).join('\n')}
- Mention relevant promotions when appropriate (e.g. if someone calls on a day with a special deal).`;
    }
  }

  // ── Table Turnover (for wait time accuracy) ──
  if (tableTool) {
    capNum++;
    capabilities += `\n${capNum}. Provide accurate table availability and wait time estimates`;
    instructions += `
TABLE AVAILABILITY:
- When asked about wait times or table availability, provide accurate estimates.
- If no tables are available, offer to add them to the waitlist${waitlistTool ? ' (see waitlist instructions above)' : ''} or take a reservation for later.`;
  }

  // ── Feedback Collection ──
  if (feedbackTool) {
    capNum++;
    capabilities += `\n${capNum}. Collect customer feedback and reviews`;
    instructions += `
FEEDBACK COLLECTION INSTRUCTIONS:
- If a customer wants to leave feedback, a review, or share their experience, collect it.
- Ask for: their name (optional), a rating (1-5 stars or terrible/bad/okay/good/excellent), and their comments.
- Thank them sincerely for their feedback.
- When collected, output: FEEDBACK_DATA: {"customerName":"...","customerPhone":"...","rating":"EXCELLENT","comment":"..."}
- Rating must be one of: TERRIBLE, BAD, OKAY, GOOD, EXCELLENT`;
  }

  instructions += `\nIMPORTANT: Keep responses concise — this is a phone call. Never make up information you don't know.
When you collect reservation details output: RESERVATION_DATA: {"name":"...","partySize":...,"date":"...","time":"...","phone":"..."}`;

  return `You are the AI receptionist for ${business.name}${cuisine ? `, a ${cuisine} restaurant` : ''}.
Your personality is ${persona ?? 'friendly, warm, and professional'}.
BUSINESS INFORMATION:
- Name: ${business.name}
- Phone: ${business.phone ?? 'Not available'}
- Address: ${addr}
- Hours: ${hoursText}
${cuisine ? `- Cuisine: ${cuisine}` : ''}
${maxPartySize ? `- Maximum party size: ${maxPartySize}` : ''}
${capabilities}
${instructions}`;
}

export async function voiceAgentRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /voice-agent/voices
   * List available ElevenLabs voices with preview URLs.
   */
  app.get<{ Querystring: { search?: string; category?: string } }>(
    '/voice-agent/voices',
    async (request, reply) => {
      const elevenLabsKey = process.env['ELEVENLABS_API_KEY'];
      if (!elevenLabsKey) return reply.code(500).send({ success: false, error: 'ELEVENLABS_API_KEY not configured' });

      const { search, category } = request.query;
      try {
        const url = new URL('https://api.elevenlabs.io/v1/voices');
        url.searchParams.set('page_size', '100');
        if (search) url.searchParams.set('search', search);

        const res = await fetch(url.toString(), {
          headers: { 'xi-api-key': elevenLabsKey },
        });
        if (!res.ok) throw new Error(`ElevenLabs API ${res.status}`);

        const data = await res.json() as { voices: Array<{
          voice_id: string; name: string; category: string;
          labels: Record<string, string>;
          preview_url: string;
          description: string;
        }> };

        let voices = data.voices.map(v => ({
          id: v.voice_id,
          name: v.name,
          category: v.category,
          accent: v.labels?.['accent'] ?? '',
          gender: v.labels?.['gender'] ?? '',
          age: v.labels?.['age'] ?? '',
          useCase: v.labels?.['use case'] ?? '',
          description: v.description ?? '',
          previewUrl: v.preview_url,
        }));

        if (category && category !== 'all') {
          voices = voices.filter(v => v.gender?.toLowerCase() === category.toLowerCase() || v.category === category);
        }

        return { success: true, voices };
      } catch (err) {
        return reply.code(500).send({ success: false, error: String(err) });
      }
    },
  );

  /**
   * PATCH /voice-agent/voice/:businessId
   * Update the agent's voice.
   */
  app.patch<{ Params: { businessId: string }; Body: { voiceId: string } }>(
    '/voice-agent/voice/:businessId',
    async (request, reply) => {
      const { businessId } = request.params;
      const { voiceId } = request.body as { voiceId: string };
      if (!voiceId) return reply.code(400).send({ success: false, error: 'voiceId required' });

      const business = await db.business.findUnique({ where: { id: businessId } });
      if (!business?.elevenLabsAgentId) return reply.code(400).send({ success: false, error: 'Agent not provisioned' });

      const elevenLabsKey = process.env['ELEVENLABS_API_KEY'];
      if (!elevenLabsKey) return reply.code(500).send({ success: false, error: 'ELEVENLABS_API_KEY not configured' });

      try {
        const el = new ElevenLabsClient({ apiKey: elevenLabsKey });
        await el.conversationalAi.updateAgent(business.elevenLabsAgentId, {
          conversation_config: { tts: { voice_id: voiceId } },
        });

        // Store selected voice in settings
        const settings = (business.settings as Record<string, unknown>) ?? {};
        await db.business.update({
          where: { id: businessId },
          data: { settings: { ...settings, voiceId } as object },
        });

        log.info({ businessId, voiceId }, 'Agent voice updated');
        return { success: true };
      } catch (err) {
        return reply.code(500).send({ success: false, error: String(err) });
      }
    },
  );

  /**
   * POST /voice-agent/knowledge/:businessId
   * Upload a document to the agent's knowledge base.
   */
  app.post<{ Params: { businessId: string } }>(
    '/voice-agent/knowledge/:businessId',
    async (request, reply) => {
      const { businessId } = request.params;
      const body = request.body as { name: string; content: string; type?: string };
      if (!body.name || !body.content) return reply.code(400).send({ success: false, error: 'name and content required' });

      const business = await db.business.findUnique({ where: { id: businessId } });
      if (!business?.elevenLabsAgentId) return reply.code(400).send({ success: false, error: 'Agent not provisioned' });

      const elevenLabsKey = process.env['ELEVENLABS_API_KEY'];
      if (!elevenLabsKey) return reply.code(500).send({ success: false, error: 'ELEVENLABS_API_KEY not configured' });

      try {
        // Add to ElevenLabs knowledge base via API
        const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${business.elevenLabsAgentId}/add-to-knowledge-base`, {
          method: 'POST',
          headers: {
            'xi-api-key': elevenLabsKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: body.name,
            text: body.content,
          }),
        });

        if (!res.ok) {
          const errData = await res.text();
          throw new Error(`ElevenLabs KB upload failed: ${res.status} ${errData}`);
        }

        const data = await res.json() as { id?: string };

        // Store KB entry in settings
        const settings = (business.settings as Record<string, unknown>) ?? {};
        const kbEntries = (settings['knowledgeBase'] as Array<{ id: string; name: string }>) ?? [];
        kbEntries.push({ id: data.id ?? `kb_${Date.now()}`, name: body.name });
        await db.business.update({
          where: { id: businessId },
          data: { settings: { ...settings, knowledgeBase: kbEntries } as object },
        });

        log.info({ businessId, name: body.name }, 'Knowledge base entry added');
        return { success: true, id: data.id };
      } catch (err) {
        return reply.code(500).send({ success: false, error: String(err) });
      }
    },
  );

  /**
   * PATCH /voice-agent/prompt/:businessId
   * Update the agent's system prompt directly.
   */
  app.patch<{ Params: { businessId: string }; Body: { prompt: string; firstMessage?: string } }>(
    '/voice-agent/prompt/:businessId',
    async (request, reply) => {
      const { businessId } = request.params;
      const { prompt, firstMessage } = request.body as { prompt: string; firstMessage?: string };
      if (!prompt?.trim()) return reply.code(400).send({ success: false, error: 'prompt required' });

      const business = await db.business.findUnique({ where: { id: businessId } });
      if (!business?.elevenLabsAgentId) return reply.code(400).send({ success: false, error: 'Agent not provisioned' });

      const elevenLabsKey = process.env['ELEVENLABS_API_KEY'];
      if (!elevenLabsKey) return reply.code(500).send({ success: false, error: 'ELEVENLABS_API_KEY not configured' });

      try {
        const el = new ElevenLabsClient({ apiKey: elevenLabsKey });
        const updateData: Record<string, unknown> = {
          conversation_config: {
            agent: {
              prompt: { prompt },
              ...(firstMessage ? { first_message: firstMessage } : {}),
            },
          },
        };
        await el.conversationalAi.updateAgent(business.elevenLabsAgentId, updateData);

        // Store custom prompt in settings
        const settings = (business.settings as Record<string, unknown>) ?? {};
        await db.business.update({
          where: { id: businessId },
          data: { settings: { ...settings, customPrompt: prompt, firstMessage: firstMessage ?? settings['firstMessage'] } as object },
        });

        log.info({ businessId }, 'Agent prompt updated');
        return { success: true };
      } catch (err) {
        return reply.code(500).send({ success: false, error: String(err) });
      }
    },
  );

  /**
   * GET /voice-agent/status/:businessId
   * Returns provisioning status: ElevenLabs agent ID, Twilio number, and config.
   */
  app.get<{ Params: { businessId: string } }>(
    '/voice-agent/status/:businessId',
    async (request) => {
      const { businessId } = request.params;
      const business = await db.business.findUnique({
        where: { id: businessId },
        select: {
          id: true,
          name: true,
          phone: true,
          elevenLabsAgentId: true,
          twilioPhoneNumber: true,
          settings: true,
        },
      });

      if (!business) throw new NotFoundError('Business', businessId);

      const settings = (business.settings as Record<string, unknown>) ?? {};

      return {
        businessId: business.id,
        businessName: business.name,
        agentId: business.elevenLabsAgentId,
        twilioNumber: business.twilioPhoneNumber,
        isProvisioned: !!(business.elevenLabsAgentId && business.twilioPhoneNumber),
        hasAgent: !!business.elevenLabsAgentId,
        hasNumber: !!business.twilioPhoneNumber,
        settings: {
          hours: settings['hours'] ?? null,
          cuisine: settings['cuisine'] ?? null,
          maxPartySize: settings['maxPartySize'] ?? null,
          chatbotPersona: settings['chatbotPersona'] ?? null,
        },
      };
    },
  );

  /**
   * POST /voice-agent/provision
   * Creates ElevenLabs agent + provisions Twilio phone number directly.
   */
  app.post('/voice-agent/provision', async (request, reply) => {
    const body = request.body as { businessId: string; areaCode?: string };
    if (!body.businessId) return reply.code(400).send({ success: false, error: 'businessId is required' });

    const business = await db.business.findUnique({ where: { id: body.businessId } });
    if (!business) throw new NotFoundError('Business', body.businessId);

    const elevenLabsKey = process.env['ELEVENLABS_API_KEY'];
    const twilioSid = process.env['TWILIO_ACCOUNT_SID'];
    const twilioToken = process.env['TWILIO_AUTH_TOKEN'];

    if (!elevenLabsKey) return reply.code(500).send({ success: false, error: 'ELEVENLABS_API_KEY not configured' });
    if (!twilioSid || !twilioToken) return reply.code(500).send({ success: false, error: 'Twilio credentials not configured' });

    log.info({ businessId: body.businessId }, 'Starting voice agent provisioning');

    try {
      // Fetch enabled tools for this business
      const businessTools = await db.businessTool.findMany({
        where: { businessId: business.id },
        select: { type: true, enabled: true, config: true },
      });

      // Step 1: Create ElevenLabs agent (idempotent)
      let agentId = business.elevenLabsAgentId;
      if (!agentId) {
        const el = new ElevenLabsClient({ apiKey: elevenLabsKey });
        const agent = await el.conversationalAi.createAgent({
          name: `${business.name} — AI Receptionist`,
          conversation_config: {
            agent: {
              prompt: { prompt: buildSystemPrompt(business, businessTools) },
              first_message: `Thank you for calling ${business.name}! I'm your AI assistant. How can I help you today?`,
              language: 'en',
            },
            tts: { voice_id: 'EXAVITQu4vr4xnSDxMaL' }, // Sarah
          },
        });
        agentId = agent.agent_id;
        await db.business.update({ where: { id: business.id }, data: { elevenLabsAgentId: agentId } });
        await db.onboardingLog.create({ data: { businessId: business.id, step: 'elevenlabs_agent_created', status: 'success', message: `Agent: ${agentId}`, data: { agentId } as object } });
        log.info({ businessId: business.id, agentId }, 'ElevenLabs agent created');
      }

      // Step 2: Provision Twilio number (idempotent)
      let phoneNumber = business.twilioPhoneNumber;
      if (!phoneNumber) {
        const tc = twilio(twilioSid, twilioToken);
        const webhookUrl = `${process.env['API_BASE_URL'] ?? 'https://embedoapi-production.up.railway.app'}/webhooks/twilio/voice`;
        const available = await tc.availablePhoneNumbers('US').local.list({
          ...(body.areaCode ? { areaCode: parseInt(body.areaCode) } : {}),
          voiceEnabled: true,
          smsEnabled: true,
          limit: 5,
        });
        if (available.length === 0) throw new ExternalApiError('Twilio', 'No available phone numbers', null);
        const purchased = await tc.incomingPhoneNumbers.create({
          phoneNumber: available[0]!.phoneNumber,
          voiceUrl: webhookUrl,
          voiceMethod: 'POST',
          friendlyName: `${business.name} — AI Receptionist`,
        });
        phoneNumber = purchased.phoneNumber;
        await db.business.update({ where: { id: business.id }, data: { twilioPhoneNumber: phoneNumber } });
        await db.onboardingLog.create({ data: { businessId: business.id, step: 'twilio_number_provisioned', status: 'success', message: `Number: ${phoneNumber}`, data: { phoneNumber } as object } });
        log.info({ businessId: business.id, phoneNumber }, 'Twilio number provisioned');
      }

      return { success: true, agentId, phoneNumber };
    } catch (err) {
      log.error({ err, businessId: body.businessId }, 'Provisioning failed');
      await db.onboardingLog.create({ data: { businessId: body.businessId, step: 'provision_failed', status: 'error', message: String(err) } }).catch(() => {});
      return reply.code(500).send({ success: false, error: String(err) });
    }
  });

  /**
   * GET /voice-agent/calls/:businessId
   * Returns call log history for a business.
   */
  app.get<{ Params: { businessId: string }; Querystring: { page?: string; pageSize?: string } }>(
    '/voice-agent/calls/:businessId',
    async (request) => {
      const { businessId } = request.params;
      const page = parseInt(request.query.page ?? '1');
      const pageSize = parseInt(request.query.pageSize ?? '20');

      const [items, total] = await Promise.all([
        db.voiceCallLog.findMany({
          where: { businessId },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            contact: { select: { id: true, firstName: true, lastName: true, phone: true } },
          },
        }),
        db.voiceCallLog.count({ where: { businessId } }),
      ]);

      return { items, total, page, pageSize };
    },
  );

  /**
   * GET /voice-agent/stats/:businessId
   * Returns aggregated call stats for the dashboard.
   */
  app.get<{ Params: { businessId: string } }>(
    '/voice-agent/stats/:businessId',
    async (request) => {
      const { businessId } = request.params;

      const [totalCalls, calls] = await Promise.all([
        db.voiceCallLog.count({ where: { businessId } }),
        db.voiceCallLog.findMany({
          where: { businessId },
          select: {
            duration: true,
            sentiment: true,
            intent: true,
            leadCaptured: true,
            reservationMade: true,
          },
        }),
      ]);

      const totalDuration = calls.reduce((sum, c) => sum + (c.duration ?? 0), 0);
      const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;
      const leadsCapture = calls.filter((c) => c.leadCaptured).length;
      const positiveCount = calls.filter((c) => c.sentiment === 'POSITIVE').length;
      const positiveRate = totalCalls > 0 ? Math.round((positiveCount / totalCalls) * 100) : 0;

      const intentBreakdown = {
        RESERVATION: calls.filter((c) => c.intent === 'RESERVATION').length,
        INQUIRY: calls.filter((c) => c.intent === 'INQUIRY').length,
        COMPLAINT: calls.filter((c) => c.intent === 'COMPLAINT').length,
        GENERAL: calls.filter((c) => c.intent === 'GENERAL').length,
        UNKNOWN: calls.filter((c) => c.intent === 'UNKNOWN').length,
      };

      const sentimentBreakdown = {
        POSITIVE: positiveCount,
        NEUTRAL: calls.filter((c) => c.sentiment === 'NEUTRAL').length,
        NEGATIVE: calls.filter((c) => c.sentiment === 'NEGATIVE').length,
      };

      return {
        totalCalls,
        avgDuration,
        leadsCapture,
        positiveRate,
        intentBreakdown,
        sentimentBreakdown,
      };
    },
  );

  /**
   * PATCH /voice-agent/settings/:businessId
   * Update voice agent configuration (hours, cuisine, persona, maxPartySize).
   */
  app.patch<{ Params: { businessId: string } }>(
    '/voice-agent/settings/:businessId',
    async (request) => {
      const { businessId } = request.params;
      const updates = request.body as Record<string, unknown>;

      const business = await db.business.findUnique({ where: { id: businessId } });
      if (!business) throw new NotFoundError('Business', businessId);

      const currentSettings = (business.settings as Record<string, unknown>) ?? {};
      const newSettings = { ...currentSettings, ...updates };

      await db.business.update({
        where: { id: businessId },
        data: { settings: newSettings as object },
      });

      // If agent exists, update the ElevenLabs prompt directly
      if (business.elevenLabsAgentId) {
        const elevenLabsKey = process.env['ELEVENLABS_API_KEY'];
        if (elevenLabsKey) {
          try {
            const updatedBusiness = { ...business, settings: newSettings as object };
            const businessTools = await db.businessTool.findMany({
              where: { businessId },
              select: { type: true, enabled: true, config: true },
            });
            const el = new ElevenLabsClient({ apiKey: elevenLabsKey });
            await el.conversationalAi.updateAgent(business.elevenLabsAgentId, {
              conversation_config: { agent: { prompt: { prompt: buildSystemPrompt(updatedBusiness, businessTools) } } },
            });
          } catch (err) {
            log.warn({ err, businessId }, 'Failed to update ElevenLabs agent prompt');
          }
        }
      }

      log.info({ businessId }, 'Voice agent settings updated');
      return { success: true, settings: newSettings };
    },
  );

  /**
   * GET /voice-agent/conversations/:businessId
   * List conversations from ElevenLabs API for this agent.
   */
  app.get<{ Params: { businessId: string }; Querystring: { limit?: string } }>(
    '/voice-agent/conversations/:businessId',
    async (request, reply) => {
      const { businessId } = request.params;
      const limit = parseInt(request.query.limit ?? '30');

      const business = await db.business.findUnique({ where: { id: businessId } });
      if (!business?.elevenLabsAgentId) return reply.send({ success: true, conversations: [] });

      const elevenLabsKey = process.env['ELEVENLABS_API_KEY'];
      if (!elevenLabsKey) return reply.code(500).send({ success: false, error: 'ELEVENLABS_API_KEY not configured' });

      try {
        const res = await fetch(`https://api.elevenlabs.io/v1/convai/conversations?agent_id=${business.elevenLabsAgentId}&limit=${limit}`, {
          headers: { 'xi-api-key': elevenLabsKey },
        });
        if (!res.ok) throw new Error(`ElevenLabs API ${res.status}`);

        const data = await res.json() as { conversations: Array<{
          conversation_id: string;
          agent_id: string;
          status: string;
          start_time_unix_secs: number;
          end_time_unix_secs: number;
          call_duration_secs: number;
          message_count: number;
          metadata: Record<string, unknown>;
          analysis: { call_successful: string; transcript_summary: string } | null;
        }> };

        const conversations = data.conversations.map(c => ({
          id: c.conversation_id,
          status: c.status,
          startTime: new Date(c.start_time_unix_secs * 1000).toISOString(),
          endTime: new Date(c.end_time_unix_secs * 1000).toISOString(),
          duration: c.call_duration_secs,
          messageCount: c.message_count,
          successful: c.analysis?.call_successful ?? 'unknown',
          summary: c.analysis?.transcript_summary ?? '',
        }));

        return { success: true, conversations };
      } catch (err) {
        return reply.code(500).send({ success: false, error: String(err) });
      }
    },
  );

  /**
   * GET /voice-agent/conversation/:conversationId
   * Get full conversation details including transcript.
   */
  app.get<{ Params: { conversationId: string } }>(
    '/voice-agent/conversation/:conversationId',
    async (request, reply) => {
      const { conversationId } = request.params;

      const elevenLabsKey = process.env['ELEVENLABS_API_KEY'];
      if (!elevenLabsKey) return reply.code(500).send({ success: false, error: 'ELEVENLABS_API_KEY not configured' });

      try {
        const res = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`, {
          headers: { 'xi-api-key': elevenLabsKey },
        });
        if (!res.ok) throw new Error(`ElevenLabs API ${res.status}`);

        const data = await res.json() as {
          conversation_id: string;
          status: string;
          transcript: Array<{ role: string; message: string; time_in_call_secs: number }>;
          analysis: { call_successful: string; transcript_summary: string; data_collection_results: Record<string, unknown> } | null;
          metadata: Record<string, unknown>;
          call_duration_secs: number;
        };

        return {
          success: true,
          conversation: {
            id: data.conversation_id,
            status: data.status,
            duration: data.call_duration_secs,
            transcript: data.transcript,
            summary: data.analysis?.transcript_summary ?? '',
            successful: data.analysis?.call_successful ?? 'unknown',
            collectedData: data.analysis?.data_collection_results ?? {},
            metadata: data.metadata,
          },
        };
      } catch (err) {
        return reply.code(500).send({ success: false, error: String(err) });
      }
    },
  );
}
