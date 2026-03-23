import type Anthropic from '@anthropic-ai/sdk';

/**
 * Tool Registry — maps BusinessTool types to Anthropic tool definitions.
 * Tools are either "always-on" (core capabilities) or gated behind a BusinessTool type.
 */

export interface ToolEntry {
  name: string;
  /** Which BusinessTool type must be enabled (null = always available) */
  requiredToolType: string | null;
  /** Build an Anthropic tool schema, optionally using the tool's config */
  buildSchema: (config: Record<string, unknown>) => Anthropic.Tool;
}

// ── Always-on tools ─────────────────────────────────────────────────────────

const captureLead: ToolEntry = {
  name: 'capture_lead',
  requiredToolType: null,
  buildSchema: () => ({
    name: 'capture_lead',
    description:
      'Save customer contact info when they mention their name, email, or phone — even casually. Call this immediately, don\'t wait for explicit "here\'s my info."',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Full name of the customer' },
        email: { type: 'string', description: 'Email address' },
        phone: { type: 'string', description: 'Phone number' },
        interest: { type: 'string', description: 'What they are interested in' },
      },
      required: [],
    },
  }),
};

const makeReservation: ToolEntry = {
  name: 'make_reservation',
  requiredToolType: null,
  buildSchema: () => ({
    name: 'make_reservation',
    description:
      'Book a table reservation for a customer. Collect their name, party size, date, and time. Phone number is highly recommended.',
    input_schema: {
      type: 'object' as const,
      properties: {
        guestName: { type: 'string', description: 'Customer name' },
        partySize: { type: 'number', description: 'Number of guests' },
        date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
        time: { type: 'string', description: 'Time in HH:MM format (24h)' },
        guestPhone: { type: 'string', description: 'Phone number' },
        guestEmail: { type: 'string', description: 'Email address' },
        specialRequests: { type: 'string', description: 'Any special requests' },
      },
      required: ['guestName', 'partySize', 'date', 'time'],
    },
  }),
};

const getBusinessInfo: ToolEntry = {
  name: 'get_business_info',
  requiredToolType: null,
  buildSchema: () => ({
    name: 'get_business_info',
    description:
      'Look up business information to answer customer questions. Use this when you need specific details you don\'t already have in your system prompt.',
    input_schema: {
      type: 'object' as const,
      properties: {
        infoType: {
          type: 'string',
          enum: ['hours', 'location', 'menu', 'contact', 'specials', 'general'],
          description: 'Type of information to retrieve',
        },
      },
      required: ['infoType'],
    },
  }),
};

// ── Gated tools (require BusinessTool enabled) ──────────────────────────────

function buildMenuDescription(config: Record<string, unknown>): string {
  const items = config['menuItems'] as Array<{ name: string; price: number; category?: string }> | undefined;
  if (!items || items.length === 0) return 'Ask the customer what they would like to order.';
  const grouped = new Map<string, string[]>();
  for (const item of items) {
    const cat = item.category ?? 'Menu';
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(`${item.name} ($${item.price.toFixed(2)})`);
  }
  let desc = 'Available menu items:\n';
  for (const [cat, list] of grouped) {
    desc += `${cat}: ${list.join(', ')}\n`;
  }
  const prep = config['prepTimeMinutes'] as number | undefined;
  if (prep) desc += `Typical prep time: ${prep} minutes.`;
  return desc;
}

const createOrder: ToolEntry = {
  name: 'create_order',
  requiredToolType: 'TAKEOUT_ORDERS',
  buildSchema: (config) => ({
    name: 'create_order',
    description: `Create a takeout order for the customer. ${buildMenuDescription(config)}`,
    input_schema: {
      type: 'object' as const,
      properties: {
        customerName: { type: 'string', description: 'Customer name' },
        customerPhone: { type: 'string', description: 'Phone number for order updates' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Item name' },
              quantity: { type: 'number', description: 'Quantity' },
              price: { type: 'number', description: 'Price per item' },
              notes: { type: 'string', description: 'Special instructions for this item' },
            },
            required: ['name', 'quantity', 'price'],
          },
          description: 'Ordered items',
        },
        specialNotes: { type: 'string', description: 'Overall order notes' },
        pickupTime: { type: 'string', description: 'Requested pickup time (HH:MM)' },
      },
      required: ['customerName', 'items'],
    },
  }),
};

const addToWaitlist: ToolEntry = {
  name: 'add_to_waitlist',
  requiredToolType: 'WAITLIST',
  buildSchema: (config) => {
    const avg = config['avgWaitMinutes'] as number | undefined;
    return {
      name: 'add_to_waitlist',
      description: `Add a guest to the restaurant waitlist.${avg ? ` Average wait is approximately ${avg} minutes per party.` : ''}`,
      input_schema: {
        type: 'object' as const,
        properties: {
          guestName: { type: 'string', description: 'Guest name' },
          partySize: { type: 'number', description: 'Number of guests' },
          guestPhone: { type: 'string', description: 'Phone number for notification when table is ready' },
          notes: { type: 'string', description: 'Any notes (seating preference, etc.)' },
        },
        required: ['guestName', 'partySize'],
      },
    };
  },
};

const submitCateringInquiry: ToolEntry = {
  name: 'submit_catering_inquiry',
  requiredToolType: 'CATERING_REQUESTS',
  buildSchema: (config) => {
    const minHeadcount = config['minimumHeadcount'] as number | undefined;
    return {
      name: 'submit_catering_inquiry',
      description: `Submit a catering inquiry for an event.${minHeadcount ? ` Minimum headcount: ${minHeadcount}.` : ''}`,
      input_schema: {
        type: 'object' as const,
        properties: {
          customerName: { type: 'string', description: 'Contact name' },
          customerPhone: { type: 'string', description: 'Phone number' },
          customerEmail: { type: 'string', description: 'Email address' },
          eventDate: { type: 'string', description: 'Event date (YYYY-MM-DD)' },
          eventTime: { type: 'string', description: 'Event time (HH:MM)' },
          eventType: { type: 'string', description: 'Type of event (wedding, corporate, birthday, etc.)' },
          headcount: { type: 'number', description: 'Expected number of guests' },
          budget: { type: 'number', description: 'Budget in dollars' },
          dietaryNotes: { type: 'string', description: 'Dietary restrictions or preferences' },
          notes: { type: 'string', description: 'Additional details' },
        },
        required: ['customerName', 'eventDate', 'headcount'],
      },
    };
  },
};

const collectFeedback: ToolEntry = {
  name: 'collect_feedback',
  requiredToolType: 'FEEDBACK_COLLECTION',
  buildSchema: () => ({
    name: 'collect_feedback',
    description:
      'Collect customer feedback about their experience. Use when a customer shares praise, complaints, or ratings.',
    input_schema: {
      type: 'object' as const,
      properties: {
        customerName: { type: 'string', description: 'Customer name' },
        customerPhone: { type: 'string', description: 'Phone number' },
        rating: {
          type: 'string',
          enum: ['TERRIBLE', 'POOR', 'OKAY', 'GOOD', 'EXCELLENT'],
          description: 'Rating based on customer sentiment',
        },
        comment: { type: 'string', description: 'Customer feedback comment' },
      },
      required: ['rating', 'comment'],
    },
  }),
};

const checkGiftCardBalance: ToolEntry = {
  name: 'check_gift_card_balance',
  requiredToolType: 'GIFT_CARD_LOYALTY',
  buildSchema: () => ({
    name: 'check_gift_card_balance',
    description: 'Look up a gift card balance by its code. The code format is GC-XXXXX.',
    input_schema: {
      type: 'object' as const,
      properties: {
        code: { type: 'string', description: 'Gift card code (e.g. GC-ABC12)' },
      },
      required: ['code'],
    },
  }),
};

const getDailySpecials: ToolEntry = {
  name: 'get_daily_specials',
  requiredToolType: 'DAILY_SPECIALS',
  buildSchema: () => ({
    name: 'get_daily_specials',
    description: 'Get today\'s specials and any 86\'d (unavailable) items.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  }),
};

// ── Registry ────────────────────────────────────────────────────────────────

export const TOOL_REGISTRY: ToolEntry[] = [
  captureLead,
  makeReservation,
  getBusinessInfo,
  createOrder,
  addToWaitlist,
  submitCateringInquiry,
  collectFeedback,
  checkGiftCardBalance,
  getDailySpecials,
];

/**
 * Generate Anthropic tool schemas based on which BusinessTools are enabled.
 * Always-on tools are included regardless.
 */
export function generateToolSchemas(
  enabledTools: Array<{ type: string; config: Record<string, unknown> }>,
): Anthropic.Tool[] {
  const enabledMap = new Map(enabledTools.map((t) => [t.type, t.config ?? {}]));
  const schemas: Anthropic.Tool[] = [];

  for (const entry of TOOL_REGISTRY) {
    if (entry.requiredToolType === null) {
      // Always-on tool
      schemas.push(entry.buildSchema({}));
    } else if (enabledMap.has(entry.requiredToolType)) {
      // Gated tool — business has this tool enabled
      schemas.push(entry.buildSchema(enabledMap.get(entry.requiredToolType)!));
    }
  }

  return schemas;
}
