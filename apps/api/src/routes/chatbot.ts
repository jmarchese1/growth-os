import type { FastifyInstance } from 'fastify';
import { db } from '@embedo/db';
import { createLogger, NotFoundError } from '@embedo/utils';

const log = createLogger('api:chatbot');

const CHATBOT_URL = process.env['CHATBOT_API_URL'] ?? process.env['CHATBOT_URL'] ?? 'http://localhost:3003';

/** System prompt for Cubey — Embedo's platform support chatbot for business owners using the dashboard */
const EMBEDO_CUBEY_SYSTEM_PROMPT = `You are Cubey, Embedo's in-app support assistant. You are a cute purple cube character who helps business owners navigate and use the Embedo client dashboard. You live inside the app — the user is looking at the dashboard right now.

## Your Role
You help restaurant/business owners who are USING the Embedo platform. They already signed up. Your job is to:
- Answer "how do I..." questions about any feature
- Explain what each tool does and how to set it up
- Guide them step-by-step through tasks
- Troubleshoot issues they're having
- Suggest features they might not know about

## Your Personality
- Friendly, casual, helpful — like a knowledgeable coworker
- Keep answers concise (2-4 sentences). Only go longer if they ask for detail.
- Use "you" language: "Go to the Website tab and click..." not "The user should..."
- If you don't know something, say "I'm not sure about that — reach out to jason@embedo.io or call (917) 704-1382 for help!"
- Refer to pages by their sidebar names (e.g. "the Phone Agent page", "the Contacts page")

## Platform Overview
Embedo is an AI automation platform for local businesses. The sidebar has these sections:

**OVERVIEW:** Dashboard (home page with KPIs, activity feed, trends chart)

**YOUR TOOLS:**
- **Website** (/website) — AI website builder. Generates a full website from business info in ~30 seconds. Has a live preview editor where you can edit hero, menu, gallery, testimonials. Supports custom domain connection (buy domain on GoDaddy, add DNS records). Sites only deploy to Vercel when a custom domain is connected.
- **Phone Agent** (/voice-agent) — AI-powered phone agent that answers calls 24/7. Powered by ElevenLabs + Twilio. Provision a dedicated phone number, choose a voice, customize the system prompt, upload a knowledge base. Has call logs with transcripts, sentiment analysis, and intent detection. Test it with the built-in test call widget.
- **Chat Widget** (/chatbot) — AI chatbot for your website + Instagram/Facebook DMs. Powered by Claude AI. Customize appearance (colors, fonts, bubble size, position), set a welcome message, add quick replies. Has a system prompt editor with trait sliders (tone, energy, expertise). Upload knowledge base docs. Test conversations in-app. Get an embed snippet to paste on your website.
- **QR Codes** (/surveys) — Create QR codes for surveys, spin wheels, discounts, signup forms, menu links, and review requests. Track scans with analytics. Create surveys with text/rating/multiple-choice questions. Deliver via SMS, email, or QR scan.
- **Social Media** (/social) — Content calendar with AI-generated posts. Schedule posts for Instagram, Facebook, TikTok. AI writes captions and hashtags. Track engagement metrics. Connect social accounts in Integrations.
- **Image Library** (/images) — Centralized image storage. Generate images with DALL-E 3 (with AI prompt rewriting for better results). Save images from URLs. Filter by category (food, interior, team, logo, product, lifestyle). Mark favorites. Use images across website builder, social posts, etc.
- **Tool Library** (/tools) — Enable/disable AI-powered capabilities for your phone agent and chatbot. Available tools: Takeout Orders (with menu + pricing config), Waitlist, Daily Specials, Catering Requests, Feedback Collection, Gift Card/Loyalty, Promo Alerts, Table Turnover Tracking, Delivery Tracking. Each tool has its own configuration panel. When enabled, your AI agents can perform these actions during customer conversations.

**DATA:**
- **Reservations** (/reservations) — All reservations from phone agent, chatbot, and website. KPI cards show today's count, upcoming, expected guests, no-shows. Filter by status (Pending/Confirmed/Completed/Cancelled/No-show). Click a reservation to see guest details, confirm, mark seated, or cancel.
- **Orders** (/orders) — Takeout orders from AI agents. Requires TAKEOUT_ORDERS tool enabled in Tool Library. Track order lifecycle: Received → Confirmed → Preparing → Ready → Picked Up. Shows revenue and order stats.

**CRM:**
- **Contacts** (/customers) — Your customer database. Every lead captured by phone agent, chatbot, QR codes, surveys, and manual entry appears here. Add contacts manually (name, email, phone). View contact detail with full activity timeline (calls, chats, emails, orders, appointments, survey responses, QR scans). Send individual emails or SMS. Filter by status (Lead/Prospect/Customer/Churned) and source.
- **Email Campaigns** (/campaigns) — Send styled emails to your contacts. Two modes: Single Email or Multi-Step Sequence. Use the AI draft generator to write emails. Pick email styles (Clean/Card/Hero/Dark) with color and font customization. Add attachments (spin wheels, surveys, discounts, images, CTAs). Select recipients (all or individual). Preview before sending.

**ACCOUNT:**
- **Billing** (/billing) — Manage subscription. Plans: Free, Starter, Growth, Professional, Enterprise. All paid plans have 14-day free trial. Compare features at /billing/compare. Payments through Stripe.
- **Integrations** (/integrations) — View connection status for all services: Voice Agent, Phone Number, Chatbot, Email Delivery, Booking Calendar, Website. Connect social accounts (Instagram, Facebook, Google Business, TikTok).
- **Settings** (/settings) — Business profile (name, phone, email, address), business hours, notification preferences, email defaults (sender name, reply-to, default style), module toggles, team management (invite members by email), and danger zone (delete business).

## Setup Wizard
First-time users see a 6-step onboarding wizard (can be reopened from the Dashboard's "Setup Guide" button):
1. Welcome — overview of what Embedo does
2. Business Hours — set open/close times per day
3. Choose Tools — select which AI tools to enable
4. Website — trigger AI website generation right from the wizard
5. AI Agents — provision phone agent (with area code) and enable chatbot
6. Launch — checklist of next steps with links to each page

## Common How-To Guides

**"How do I set up my phone agent?"**
Go to Phone Agent in the sidebar. Click "Provision Now", optionally enter your area code for a local number. Once provisioned, pick a voice in the Voice tab, customize the system prompt in the Prompt tab, and upload your menu/FAQ to the Knowledge Base tab. Test it with the Test Call widget.

**"How do I add my menu to the chatbot/phone agent?"**
Go to Tool Library and enable "Takeout Orders". Click Configure, then add your menu items with names, prices, and categories. Your AI agents will automatically know your menu during conversations.

**"How do I generate a website?"**
Go to the Website tab and click "Generate Website". AI will build a full site using your business info. Edit it in the live preview — change hero image, menu items, gallery, testimonials. To connect your own domain, follow the domain setup wizard (buy on GoDaddy, add DNS records).

**"How do I embed the chatbot on my website?"**
Go to Chat Widget, then the Embed tab. Copy the script snippet and paste it into your website's HTML. The chatbot bubble will appear in the corner. Customize colors and position in the Appearance tab first.

**"How do I send an email campaign?"**
Go to Email Campaigns and click "Create Campaign". Choose Single Email or Sequence. Use AI Draft to generate content automatically. Pick a style, customize colors, select recipients, preview, and send.

**"How do I create a QR code?"**
Go to QR Codes in the sidebar. Click "Create QR Code". Choose a purpose (survey, discount, spin wheel, signup, menu, review). Configure the details and download the QR code image to print or share.

**"How do I see my call history?"**
Go to Phone Agent → the Dashboard tab shows all calls with transcripts, sentiment, and duration. Click any call to see the full conversation.

**"How do I connect Instagram/Facebook?"**
Go to Integrations in the sidebar. Under Social Accounts, click Connect next to Instagram or Facebook and follow the OAuth flow.

**"What's the Tool Library?"**
It's where you enable special capabilities for your AI agents. For example, enable "Takeout Orders" and your phone agent can take orders during calls. Enable "Waitlist" and the chatbot can add guests to the waitlist. Each tool has its own config panel.

**"How do I add a contact manually?"**
Go to Contacts, click "Add Contact" in the top right. Enter their name, email, and/or phone number.

**"How do I change my business hours?"**
Go to Settings → Business Hours tab. Set open/close times for each day, or mark days as closed.

## Support
For anything you can't answer, direct users to:
- Email: jason@embedo.io
- Phone: (917) 704-1382`;


export async function chatbotRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /chatbot/chat
   * Proxies chat messages to the chatbot-agent service.
   */
  app.post('/chatbot/chat', async (request, reply) => {
    const body = request.body as { businessId?: string };

    if (!body.businessId) {
      return reply.code(400).send({ success: false, error: 'businessId is required' });
    }

    try {
      const res = await fetch(`${CHATBOT_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request.body),
      });
      const data = await res.json();
      return reply.code(res.status).send(data);
    } catch (err) {
      log.error({ err }, 'Failed to reach chatbot-agent service');
      return reply.code(502).send({ success: false, error: 'Chatbot service unavailable' });
    }
  });

  /**
   * GET /chatbot/status/:businessId
   * Returns chatbot deployment status for a business.
   */
  app.get<{ Params: { businessId: string } }>(
    '/chatbot/status/:businessId',
    async (request) => {
      const { businessId } = request.params;
      const business = await db.business.findUnique({
        where: { id: businessId },
        select: {
          id: true,
          name: true,
          settings: true,
        },
      });

      if (!business) throw new NotFoundError('Business', businessId);

      const settings = (business.settings as Record<string, unknown>) ?? {};

      return {
        businessId: business.id,
        businessName: business.name,
        isEnabled: !!settings['chatbotEnabled'],
        settings: {
          chatbotPersona: settings['chatbotPersona'] ?? null,
          welcomeMessage: settings['welcomeMessage'] ?? null,
          primaryColor: settings['primaryColor'] ?? null,
          hours: settings['hours'] ?? null,
          cuisine: settings['cuisine'] ?? null,
          chatbotSystemPrompt: settings['chatbotSystemPrompt'] ?? null,
          chatbotKnowledgeBase: settings['chatbotKnowledgeBase'] ?? null,
          chatbotSecondaryColor: settings['chatbotSecondaryColor'] ?? null,
          chatbotSubtitle: settings['chatbotSubtitle'] ?? null,
          chatbotBubbleSize: settings['chatbotBubbleSize'] ?? null,
          chatbotBorderRadius: settings['chatbotBorderRadius'] ?? null,
          chatbotFontFamily: settings['chatbotFontFamily'] ?? null,
          chatbotPosition: settings['chatbotPosition'] ?? null,
          chatbotWindowWidth: settings['chatbotWindowWidth'] ?? null,
          chatbotWindowHeight: settings['chatbotWindowHeight'] ?? null,
          chatbotShowClose: settings['chatbotShowClose'] ?? null,
          chatbotSoundEnabled: settings['chatbotSoundEnabled'] ?? null,
          chatbotAutoOpen: settings['chatbotAutoOpen'] ?? null,
          chatbotAutoOpenDelay: settings['chatbotAutoOpenDelay'] ?? null,
          chatbotQuickRepliesEnabled: settings['chatbotQuickRepliesEnabled'] ?? null,
          chatbotQuickReplies: settings['chatbotQuickReplies'] ?? null,
          chatbotPoweredBy: settings['chatbotPoweredBy'] ?? null,
          chatbotPersonalityTraits: settings['chatbotPersonalityTraits'] ?? null,
        },
      };
    },
  );

  /**
   * POST /chatbot/enable
   * Enables the chatbot for a business — sets chatbotEnabled flag in settings.
   * Creates a minimal Business record if one doesn't exist yet (e.g. client app user).
   */
  app.post('/chatbot/enable', async (request, reply) => {
    const body = request.body as { businessId: string };

    if (!body.businessId) {
      return reply.code(400).send({ success: false, error: 'businessId is required' });
    }

    let business = await db.business.findUnique({ where: { id: body.businessId } });

    if (!business) {
      // Auto-create a minimal Business record so client-app users can enable features
      const slug = `biz-${body.businessId.slice(0, 8)}-${Date.now()}`;
      business = await db.business.create({
        data: {
          id: body.businessId,
          name: 'My Business',
          slug,
          type: 'RESTAURANT',
          settings: { chatbotEnabled: true },
        },
      });
      log.info({ businessId: body.businessId }, 'Auto-created business and enabled chatbot');
      return { success: true, businessId: business.id };
    }

    const currentSettings = (business.settings as Record<string, unknown>) ?? {};
    const newSettings = { ...currentSettings, chatbotEnabled: true };

    await db.business.update({
      where: { id: body.businessId },
      data: { settings: newSettings },
    });

    log.info({ businessId: body.businessId }, 'Chatbot enabled');
    return { success: true, businessId: body.businessId };
  });

  /**
   * GET /chatbot/sessions/:businessId
   * Returns chat session history for a business.
   */
  app.get<{ Params: { businessId: string }; Querystring: { page?: string; pageSize?: string } }>(
    '/chatbot/sessions/:businessId',
    async (request) => {
      const { businessId } = request.params;
      const page = parseInt(request.query.page ?? '1');
      const pageSize = parseInt(request.query.pageSize ?? '20');

      const [items, total] = await Promise.all([
        db.chatSession.findMany({
          where: { businessId },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            contact: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
          },
        }),
        db.chatSession.count({ where: { businessId } }),
      ]);

      return { items, total, page, pageSize };
    },
  );

  /**
   * GET /chatbot/stats/:businessId
   * Returns aggregated chatbot stats for the dashboard.
   */
  app.get<{ Params: { businessId: string } }>(
    '/chatbot/stats/:businessId',
    async (request) => {
      const { businessId } = request.params;

      const [totalSessions, sessions] = await Promise.all([
        db.chatSession.count({ where: { businessId } }),
        db.chatSession.findMany({
          where: { businessId },
          select: {
            channel: true,
            messages: true,
            leadCaptured: true,
            appointmentMade: true,
          },
        }),
      ]);

      const leadsCapture = sessions.filter((s) => s.leadCaptured).length;
      const appointmentsMade = sessions.filter((s) => s.appointmentMade).length;
      const totalMessages = sessions.reduce((sum, s) => {
        const msgs = s.messages as unknown[];
        return sum + (Array.isArray(msgs) ? msgs.length : 0);
      }, 0);

      const channelBreakdown = {
        WEB: sessions.filter((s) => s.channel === 'WEB').length,
        INSTAGRAM: sessions.filter((s) => s.channel === 'INSTAGRAM').length,
        FACEBOOK: sessions.filter((s) => s.channel === 'FACEBOOK').length,
      };

      return {
        totalSessions,
        leadsCapture,
        appointmentsMade,
        totalMessages,
        channelBreakdown,
      };
    },
  );

  /**
   * GET /chatbot/widget/snippet/:businessId
   * Proxies widget snippet request to chatbot-agent service.
   */
  app.get<{ Params: { businessId: string } }>(
    '/chatbot/widget/snippet/:businessId',
    async (request, reply) => {
      const { businessId } = request.params;

      try {
        const res = await fetch(`${CHATBOT_URL}/widget/snippet/${businessId}`);
        const text = await res.text();
        return reply.code(res.status).header('Content-Type', 'text/plain').send(text);
      } catch (err) {
        log.error({ err }, 'Failed to reach chatbot-agent service for snippet');
        return reply.code(502).send({ success: false, error: 'Chatbot service unavailable' });
      }
    },
  );

  /**
   * GET /chatbot/context/:businessId
   * Returns the full business context + enabled tools for the chatbot to use.
   * The chatbot-agent service calls this to build its system prompt with tool awareness.
   */
  app.get<{ Params: { businessId: string } }>(
    '/chatbot/context/:businessId',
    async (request) => {
      const { businessId } = request.params;

      // Special case: Embedo platform support chatbot (Cubey)
      if (businessId === 'embedo-platform') {
        return {
          success: true,
          context: {
            business: {
              id: 'embedo-platform',
              name: 'Embedo',
              phone: '(917) 704-1382',
              address: null,
              hours: null,
              cuisine: null,
              chatbotPersona: 'cubey',
            },
            tools: [],
            capabilities: {},
            customSystemPrompt: EMBEDO_CUBEY_SYSTEM_PROMPT,
          },
        };
      }

      const business = await db.business.findUnique({
        where: { id: businessId },
        select: { id: true, name: true, phone: true, address: true, settings: true },
      });
      if (!business) throw new NotFoundError('Business', businessId);

      const tools = await db.businessTool.findMany({
        where: { businessId, enabled: true },
        select: { type: true, enabled: true, config: true },
      });

      const settings = (business.settings as Record<string, unknown>) ?? {};
      void tools.find(t => t.type === 'TAKEOUT_ORDERS');

      return {
        success: true,
        context: {
          business: {
            id: business.id,
            name: business.name,
            phone: business.phone,
            address: business.address,
            hours: settings['hours'] ?? null,
            cuisine: settings['cuisine'] ?? null,
            chatbotPersona: settings['chatbotPersona'] ?? null,
          },
          tools: tools.map(t => ({
            type: t.type,
            config: t.config,
          })),
          capabilities: {
            takeOrders: !!tools.find(t => t.type === 'TAKEOUT_ORDERS'),
            waitlist: !!tools.find(t => t.type === 'WAITLIST'),
            dailySpecials: !!tools.find(t => t.type === 'DAILY_SPECIALS'),
            catering: !!tools.find(t => t.type === 'CATERING_REQUESTS'),
            giftCards: !!tools.find(t => t.type === 'GIFT_CARD_LOYALTY'),
            promoAlerts: !!tools.find(t => t.type === 'PROMO_ALERTS'),
            feedback: !!tools.find(t => t.type === 'FEEDBACK_COLLECTION'),
            tableTracking: !!tools.find(t => t.type === 'TABLE_TURNOVER'),
            deliveryTracking: !!tools.find(t => t.type === 'DELIVERY_TRACKING'),
          },
        },
      };
    },
  );

  /**
   * PATCH /chatbot/settings/:businessId
   * Update chatbot configuration (persona, welcome message, colors).
   */
  app.patch<{ Params: { businessId: string } }>(
    '/chatbot/settings/:businessId',
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

      log.info({ businessId }, 'Chatbot settings updated');
      return { success: true, settings: newSettings };
    },
  );
}
