import { db } from '@embedo/db';
import { createLogger } from '@embedo/utils';
import { leadCreatedQueue } from '@embedo/queue';
import { env } from '../config.js';

const log = createLogger('chatbot-agent:tool-executor');

const API = env.API_GATEWAY_URL;

export interface ToolResult {
  success: boolean;
  data: Record<string, unknown>;
  userMessage?: string;
}

interface ExecuteParams {
  toolName: string;
  input: Record<string, unknown>;
  businessId: string;
  sessionKey: string;
  channel: string;
  test?: boolean | undefined;
  /** Full business context from /chatbot/context endpoint */
  context?: Record<string, unknown> | undefined;
  /** Enabled tools with configs */
  enabledTools?: Array<{ type: string; config: Record<string, unknown> }> | undefined;
}

/**
 * Execute a tool call by name. Dispatches to the appropriate handler.
 */
export async function executeTool(params: ExecuteParams): Promise<ToolResult> {
  const { toolName, input, businessId, sessionKey, channel, test } = params;
  log.info({ toolName, businessId, sessionKey }, 'Executing tool');

  try {
    switch (toolName) {
      case 'capture_lead':
        return await execCaptureLead(input, businessId, sessionKey, channel, test);
      case 'make_reservation':
        return await execMakeReservation(input, businessId, sessionKey);
      case 'get_business_info':
        return execGetBusinessInfo(input, params.context);
      case 'create_order':
        return await execCreateOrder(input, businessId, sessionKey);
      case 'add_to_waitlist':
        return await execAddToWaitlist(input, businessId);
      case 'submit_catering_inquiry':
        return await execCateringInquiry(input, businessId);
      case 'collect_feedback':
        return await execCollectFeedback(input, businessId);
      case 'check_gift_card_balance':
        return await execCheckGiftCard(input, businessId);
      case 'get_daily_specials':
        return execGetDailySpecials(params.enabledTools);
      default:
        return { success: false, data: {}, userMessage: `Unknown tool: ${toolName}` };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ err: msg, toolName, businessId }, 'Tool execution failed');
    return {
      success: false,
      data: { error: msg },
      userMessage: "I'm sorry, I wasn't able to complete that action. Please try again or call us directly.",
    };
  }
}

// ── capture_lead ────────────────────────────────────────────────────────────

async function execCaptureLead(
  input: Record<string, unknown>,
  businessId: string,
  sessionKey: string,
  channel: string,
  test?: boolean,
): Promise<ToolResult> {
  const name = (input['name'] as string) ?? '';
  const nameParts = name.trim().split(/\s+/);
  const firstName = nameParts[0] ?? '';
  const lastName = nameParts.slice(1).join(' ') ?? '';
  const email = (input['email'] as string) ?? '';
  const phone = (input['phone'] as string) ?? '';

  if (test) {
    return { success: true, data: { captured: true, test: true }, userMessage: 'Contact info noted.' };
  }

  let contactId: string | null = null;

  try {
    let contact = null;
    if (email) {
      contact = await db.contact.findFirst({ where: { businessId, email } });
    }
    if (!contact && phone) {
      contact = await db.contact.findFirst({ where: { businessId, phone } });
    }

    if (contact) {
      await db.contact.update({
        where: { id: contact.id },
        data: {
          ...(firstName && !contact.firstName ? { firstName } : {}),
          ...(lastName && !contact.lastName ? { lastName } : {}),
          ...(email && !contact.email ? { email } : {}),
          ...(phone && !contact.phone ? { phone } : {}),
          source: contact.source ?? 'CHATBOT',
        },
      });
      contactId = contact.id;
      log.info({ contactId, businessId }, 'Updated existing contact from chat');
    } else if (firstName || email || phone) {
      const contactData: Record<string, unknown> = {
        businessId,
        firstName: firstName || 'Unknown',
        lastName: lastName || '',
        source: 'CHATBOT',
        notes: `Captured from chat. Interest: ${(input['interest'] as string) ?? 'general inquiry'}`,
      };
      if (email) contactData['email'] = email;
      if (phone) contactData['phone'] = phone;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newContact = await (db.contact.create as any)({ data: contactData });
      contactId = newContact.id;
      await db.chatSession.update({
        where: { sessionKey },
        data: { contactId: newContact.id },
      });
      log.info({ contactId: newContact.id, businessId }, 'Created new contact from chat');
    }
  } catch (contactErr) {
    log.error({ err: contactErr instanceof Error ? contactErr.message : String(contactErr) }, 'Failed to save contact');
  }

  await leadCreatedQueue().add(`lead:chat:${sessionKey}:${Date.now()}`, {
    businessId,
    source: channel === 'WEB' ? 'CHATBOT' : 'SOCIAL',
    sourceId: sessionKey,
    rawData: input,
  });

  return {
    success: true,
    data: { captured: true, contactId },
    userMessage: 'Contact information saved successfully.',
  };
}

// ── make_reservation ────────────────────────────────────────────────────────

async function execMakeReservation(
  input: Record<string, unknown>,
  businessId: string,
  sessionKey: string,
): Promise<ToolResult> {
  const res = await fetch(`${API}/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      businessId,
      guestName: input['guestName'],
      partySize: input['partySize'],
      date: input['date'],
      time: input['time'],
      guestPhone: input['guestPhone'],
      guestEmail: input['guestEmail'],
      specialRequests: input['specialRequests'],
      source: 'CHATBOT',
      chatSessionId: sessionKey,
    }),
  });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) {
    return { success: false, data, userMessage: (data['error'] as string) ?? 'Failed to create reservation.' };
  }
  const reservation = data['reservation'] as Record<string, unknown>;
  return {
    success: true,
    data: { reservationId: reservation?.['id'], status: reservation?.['status'] },
    userMessage: `Reservation confirmed for ${input['guestName']}, party of ${input['partySize']} on ${input['date']} at ${input['time']}.`,
  };
}

// ── create_order ────────────────────────────────────────────────────────────

async function execCreateOrder(
  input: Record<string, unknown>,
  businessId: string,
  sessionKey: string,
): Promise<ToolResult> {
  const res = await fetch(`${API}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      businessId,
      customerName: input['customerName'],
      customerPhone: input['customerPhone'],
      items: input['items'],
      specialNotes: input['specialNotes'],
      pickupTime: input['pickupTime'],
      source: 'CHATBOT',
      chatSessionId: sessionKey,
    }),
  });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) {
    return { success: false, data, userMessage: (data['error'] as string) ?? 'Failed to create order.' };
  }
  const order = data['order'] as Record<string, unknown>;
  return {
    success: true,
    data: { orderId: order?.['id'], total: order?.['total'], status: order?.['status'] },
    userMessage: `Order placed! Total: $${order?.['total']}. ${input['pickupTime'] ? `Pickup at ${input['pickupTime']}.` : 'We\'ll have it ready soon.'}`,
  };
}

// ── add_to_waitlist ─────────────────────────────────────────────────────────

async function execAddToWaitlist(
  input: Record<string, unknown>,
  businessId: string,
): Promise<ToolResult> {
  const res = await fetch(`${API}/waitlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      businessId,
      guestName: input['guestName'],
      partySize: input['partySize'],
      guestPhone: input['guestPhone'],
      notes: input['notes'],
      source: 'CHATBOT',
    }),
  });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) {
    return { success: false, data, userMessage: (data['error'] as string) ?? 'Failed to add to waitlist.' };
  }
  const entry = data['entry'] as Record<string, unknown>;
  return {
    success: true,
    data: { position: entry?.['position'], estimatedWait: entry?.['estimatedWait'] },
    userMessage: `Added to waitlist! Position: #${entry?.['position']}. Estimated wait: ~${entry?.['estimatedWait']} minutes.`,
  };
}

// ── submit_catering_inquiry ─────────────────────────────────────────────────

async function execCateringInquiry(
  input: Record<string, unknown>,
  businessId: string,
): Promise<ToolResult> {
  const res = await fetch(`${API}/catering`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      businessId,
      customerName: input['customerName'],
      customerPhone: input['customerPhone'],
      customerEmail: input['customerEmail'],
      eventDate: input['eventDate'],
      eventTime: input['eventTime'],
      eventType: input['eventType'],
      headcount: input['headcount'],
      budget: input['budget'],
      dietaryNotes: input['dietaryNotes'],
      notes: input['notes'],
      source: 'CHATBOT',
    }),
  });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) {
    return { success: false, data, userMessage: (data['error'] as string) ?? 'Failed to submit catering inquiry.' };
  }
  return {
    success: true,
    data: { inquiryId: (data['inquiry'] as Record<string, unknown>)?.['id'] },
    userMessage: 'Catering inquiry submitted! Our team will follow up with a quote soon.',
  };
}

// ── collect_feedback ────────────────────────────────────────────────────────

async function execCollectFeedback(
  input: Record<string, unknown>,
  businessId: string,
): Promise<ToolResult> {
  const res = await fetch(`${API}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      businessId,
      customerName: input['customerName'],
      customerPhone: input['customerPhone'],
      rating: input['rating'],
      comment: input['comment'],
      triggerType: 'CHATBOT',
    }),
  });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) {
    return { success: false, data, userMessage: (data['error'] as string) ?? 'Failed to save feedback.' };
  }
  return {
    success: true,
    data: { feedbackId: (data['entry'] as Record<string, unknown>)?.['id'] },
    userMessage: 'Thank you for your feedback! We really appreciate it.',
  };
}

// ── check_gift_card_balance ─────────────────────────────────────────────────

async function execCheckGiftCard(
  input: Record<string, unknown>,
  businessId: string,
): Promise<ToolResult> {
  const code = (input['code'] as string) ?? '';
  const res = await fetch(`${API}/gift-cards?businessId=${businessId}&code=${encodeURIComponent(code)}`);
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) {
    return { success: false, data: {}, userMessage: `Could not find gift card with code "${code}".` };
  }
  const cards = data['items'] as Array<Record<string, unknown>> | undefined;
  const card = cards?.[0];
  if (!card) {
    return { success: false, data: {}, userMessage: `No gift card found with code "${code}". Please check the code and try again.` };
  }
  return {
    success: true,
    data: { code: card['code'], balance: card['currentBalance'], status: card['status'] },
    userMessage: `Gift card ${card['code']}: balance is $${card['currentBalance']}. Status: ${card['status']}.`,
  };
}

// ── get_business_info ───────────────────────────────────────────────────────

function execGetBusinessInfo(
  input: Record<string, unknown>,
  context?: Record<string, unknown>,
): ToolResult {
  const infoType = (input['infoType'] as string) ?? 'general';
  const biz = (context?.['business'] as Record<string, unknown>) ?? {};

  switch (infoType) {
    case 'hours':
      return { success: true, data: { hours: biz['hours'] ?? 'Hours not available' } };
    case 'location':
      return { success: true, data: { address: biz['address'] ?? 'Address not available' } };
    case 'menu':
      return { success: true, data: { cuisine: biz['cuisine'], menu: 'Please ask about specific items or check our website.' } };
    case 'contact':
      return { success: true, data: { phone: biz['phone'], name: biz['name'] } };
    case 'specials':
      return { success: true, data: { specials: 'Ask about our daily specials!' } };
    default:
      return { success: true, data: { name: biz['name'], phone: biz['phone'], address: biz['address'], hours: biz['hours'] } };
  }
}

// ── get_daily_specials ──────────────────────────────────────────────────────

function execGetDailySpecials(
  enabledTools?: Array<{ type: string; config: Record<string, unknown> }>,
): ToolResult {
  const tool = enabledTools?.find((t) => t.type === 'DAILY_SPECIALS');
  if (!tool) {
    return { success: false, data: {}, userMessage: 'Daily specials are not currently available.' };
  }
  const config = tool.config ?? {};
  const specials = config['specials'] as Array<{ name: string; description: string; price: number }> | undefined;
  const eightySixed = config['eightySixedItems'] as string[] | undefined;

  return {
    success: true,
    data: { specials: specials ?? [], unavailable: eightySixed ?? [] },
    userMessage: specials?.length
      ? `Today's specials: ${specials.map((s) => `${s.name} — ${s.description} ($${s.price})`).join('; ')}.${eightySixed?.length ? ` Currently unavailable: ${eightySixed.join(', ')}.` : ''}`
      : 'No specials listed today.',
  };
}
