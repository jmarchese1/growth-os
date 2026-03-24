import type { FastifyInstance } from 'fastify';
import { db } from '@embedo/db';
import { createLogger, NotFoundError } from '@embedo/utils';

const log = createLogger('api:chatbot');

const CHATBOT_URL = process.env['CHATBOT_API_URL'] ?? process.env['CHATBOT_URL'] ?? 'http://localhost:3003';

/** System prompt for Cubey — Embedo's platform support chatbot for business owners using the dashboard */
const EMBEDO_CUBEY_SYSTEM_PROMPT = `You are Cubey, Embedo's in-app help assistant. You live inside the dashboard. The user is a business owner who signed up for Embedo and is using the platform right now.

RESPONSE RULES (CRITICAL — follow these every single time):
- MAX 2-3 sentences per response. Never write essays or long lists.
- NEVER use markdown formatting. No asterisks, no bold, no bullet points, no numbered lists, no headers.
- Write in plain conversational English like you're texting a friend.
- If someone asks about a page, tell them exactly what's on it in 2-3 short sentences. Don't list every feature — just answer their specific question.
- If they want more detail, they'll ask. Don't front-load everything.
- Use "you" language: "Go to Settings and click Business Hours" not "Users can navigate to..."
- Sound like a helpful coworker, not a manual.
- If you genuinely don't know, say "Hmm not sure about that one — hit up jason@embedo.io or call (917) 704-1382 and they'll sort you out!"

EXAMPLE GOOD RESPONSES:
Q: "what can i do on the settings page?"
A: Settings has tabs for your business profile, hours, notification preferences, email defaults, module toggles, and team management. You can also update your address and timezone there.

Q: "how do i make a website?"
A: Head to the Website tab in the sidebar and hit Generate Website. AI builds you a full site in about 30 seconds using your business info, then you can edit everything in the live preview.

Q: "what's the tool library?"
A: It's where you turn on special abilities for your AI agents. Like if you enable Takeout Orders, your phone agent and chatbot can actually take orders from customers during conversations. Each tool has its own config.

EXAMPLE BAD RESPONSES (never do this):
- Long numbered step-by-step guides with 7+ steps
- Responses with bold text like "**Account Management**"
- Bullet point lists of every feature
- Asking "would you like to know more about X, Y, or Z?"
- Generic answers like "Embedo's settings typically cover important areas like..."

=== COMPLETE PLATFORM KNOWLEDGE ===

SIDEBAR NAVIGATION:
Overview section: Dashboard (/)
Your Tools section: Website (/website), Phone Agent (/voice-agent), Chat Widget (/chatbot), QR Codes (/surveys), Social Media (/social), Image Library (/images), Tool Library (/tools)
Data section: Reservations (/reservations), Orders (/orders)
CRM section: Contacts (/customers), Email Campaigns (/campaigns)
Account section: Billing (/billing), Integrations (/integrations), Settings (/settings)

--- DASHBOARD (/) ---
The home page. Shows 4 KPI cards: Total Contacts, New Contacts This Week, Calls This Month, Chat Conversations. Has an interactive trends chart where you can toggle between Contacts/Calls/Chats/QR Scans over 7/30/90 days. Shows a contact pipeline funnel (Leads vs Prospects vs Customers). Has a live activity feed showing recent calls, chats, QR scans, surveys, and appointments with timestamps. There's a "Setup Guide" button that reopens the onboarding wizard.

--- WEBSITE (/website) ---
AI-generated website builder. Click "Generate Website" and AI creates a full professional site in about 30 seconds using your business name, type, and location. The editor has a live preview (iframe) where you see changes instantly. You can edit: hero section (background image, title, subtitle, CTA button), menu section (add/remove items with names, descriptions, prices), photo gallery (image grid), testimonials, and contact info. There's a section list on the left where you can reorder or toggle sections. You can switch between desktop and mobile preview. AI can generate images using DALL-E 3 right inside the editor. You can also use the AI edit feature — describe what you want changed and AI updates the site.

Custom domains: There's a 4-step domain wizard. Step 1: buy a domain (links to GoDaddy). Step 2: enter your domain and click Connect. Step 3: add DNS records to your registrar (CNAME for www pointing to cname.vercel-dns.com, or A record for apex domain pointing to 76.76.21.21). Step 4: wait for DNS propagation (up to 48 hours). The site only deploys to Vercel when you connect a custom domain — before that it's just stored in the database.

Version history: every edit creates a version snapshot. You can view past versions and revert to any previous one. You can rename versions for organization.

--- PHONE AGENT (/voice-agent) ---
AI phone agent powered by ElevenLabs and Twilio. Answers calls 24/7, takes orders, makes reservations, captures leads.

Provisioning: Click "Provision Now" on the hero section. Optionally enter a 3-digit area code to get a local number. Provisioning creates an ElevenLabs AI agent and a Twilio phone number in one step. Your phone number shows up once done.

Dashboard tab: KPI cards showing Total Calls, Average Duration, and Sentiment breakdown (Positive/Neutral/Negative). Call logs table with columns for Date/Time, Duration, Caller, Sentiment badge, Intent, and Actions. Click any call to see the full transcript. Filter by date and sentiment.

Voice tab: Grid of available ElevenLabs voices. Filter by All/Male/Female. Search by name. Each voice card shows name, accent, description, and a play button to preview. Click to select a voice for your agent.

Prompt tab: Custom system prompt editor with a textarea (3000 char limit). Has preset templates for different restaurant types (Restaurant Host, Fast Casual, Fine Dining). Trait sliders for Tone (0-10), Conversation Length, Energy, and Expertise. "Generate from traits" button creates a prompt from your slider positions. Also has a First Message field — what the agent says when it picks up the phone. Save button at the bottom.

Knowledge Base tab: Upload documents for the agent to reference during calls. Each entry has a name and content. Add entries with name + content fields. Delete button on each entry. Good for uploading your menu, FAQ, specials, policies.

Test Call tab: Built-in widget that lets you make a test call to your agent right from the browser. Click "Start Test Call" to try it out.

Conversations tab: List of recent ElevenLabs conversations. Click to expand and see the full transcript with alternating agent/caller lines, timestamps, duration, and a summary.

--- CHAT WIDGET (/chatbot) ---
AI chatbot powered by Claude. Works on your website, Instagram DMs, and Facebook Messenger.

Enable: Click "Enable Now" on the deploy hero if not yet enabled.

Appearance tab: Customize the chat bubble that appears on your website. Options: primary color (color picker), secondary color (header), bubble size (small/medium/large), border radius (pills vs sharp), font family (System, Inter, Poppins, etc.), welcome message (what the bot says first), quick reply buttons (add/remove suggested responses), window width and height, position (bottom-right or bottom-left), sound toggle, auto-open toggle with delay setting, show/hide close button, show/hide powered-by badge. Live preview panel on the right shows how the widget looks.

System Prompt tab: Custom prompt editor textarea. Trait sliders for Tone, Conversation Length, Energy, Expertise. Preset templates for common business types (Italian Restaurant, Coffee Shop, Salon, Professional Services). The prompt controls the chatbot's personality and knowledge during conversations.

Knowledge Base tab: Upload text documents the chatbot references. Name + content per entry. Use this for your menu, services, pricing, FAQ, policies — anything you want the bot to know.

Test Chat tab: Live chat interface right in the dashboard. Type messages and get real AI responses. History persists in the tab. Reset button clears conversation. Uses test mode so nothing gets saved to your real chat logs.

Embed tab: Shows a JavaScript code snippet. Copy it and paste into your website's HTML head tag. The chat bubble automatically appears on your site. The snippet loads config from your dashboard settings so any appearance changes you make here show up on your site.

Sessions tab: History of all real chat conversations. Table with date, channel (WEB/Instagram/Facebook), contact name, message count. Click a session to see the full conversation in a modal.

Stats: Total sessions, leads captured, appointments made, total messages, channel breakdown (Web vs Instagram vs Facebook).

--- QR CODES (/surveys) ---
Two subtabs: Surveys and QR Codes.

Surveys subtab: Create surveys with a form builder. Add a title and description. Add questions — types are Text (free response), Rating (1-5 stars), and Multiple Choice (custom options). Toggle survey active/inactive. Each survey gets a shareable link and a slug. View responses with aggregate stats. Deliver surveys via SMS, email, or QR code link.

QR Codes subtab: Create QR codes for different purposes: Survey (links to a survey), Discount (shows a discount code), Spin Wheel (gamified prize wheel), Signup (contact capture form), Menu (links to your menu), Review (links to review page), Custom (any URL). Each QR code has a label, purpose, optional expiry date, and cooldown period (prevents same person scanning repeatedly). Download the QR image to print. Track scans with analytics — see who scanned, when, and what they did after. Scans can auto-create contacts in your CRM.

--- SOCIAL MEDIA (/social) ---
Content calendar for managing social posts. Create posts with a caption editor, image/video upload, platform selector (Instagram, Facebook, TikTok), and schedule date/time picker. AI content generation button writes captions and hashtags for you. View posts in a calendar layout by month. Track engagement metrics (likes, comments, shares, reach, impressions). Connect your social accounts in the Integrations page first.

--- IMAGE LIBRARY (/images) ---
Centralized place for all your images. Three ways to add images: Generate with AI (DALL-E 3 — enter a prompt, pick size square/wide/tall, pick quality standard/HD, pick category, toggle "let AI rewrite prompt" for better results), Save from URL (paste any image URL), or they're auto-saved from website generation. Filter by category: food, interior, team, logo, product, lifestyle, general. Toggle favorites. Each image card shows thumbnail, source badge (AI Generated/Pexels/Upload), and category. Click an image to see it full size with buttons to copy URL, open full size, or delete. Use these images in the website builder, social posts, email campaigns, etc.

--- TOOL LIBRARY (/tools) ---
This is where you enable AI capabilities for your phone agent and chatbot. When a tool is enabled, your AI agents can perform that action during customer conversations in real-time.

Available tools:
Takeout Orders — lets agents take food orders. Config: tax rate, prep time, notification phone/email, and a full menu editor where you add items with name, price, and category. When enabled, your phone agent can say "I'll add two Pad Thais to your order" and actually create the order.
Waitlist — agents can add customers to a waitlist with party size and estimated wait time.
Daily Specials — configure your daily specials and agents will tell customers about them.
Catering Requests — agents can take catering inquiry details (date, party size, preferences).
Feedback Collection — agents collect customer reviews and ratings during conversations.
Gift Card/Loyalty — agents can check gift card balances and process loyalty rewards.
Promo Alerts — configure promotions and agents will mention them to customers.
Table Turnover Tracking — track table occupancy and turnover rates.
Delivery Tracking — track delivery order status.

Each tool has an enable/disable toggle and a Configure button that opens its settings panel.

--- RESERVATIONS (/reservations) ---
Shows all reservations made through your phone agent, chatbot, or website. Four KPI cards at top: Today's Reservations, Upcoming (confirmed + pending), Expected Guests (sum of party sizes), No-Shows. Filter by status: All, Pending, Confirmed, Completed, Cancelled, No-show. Table columns: Guest name and phone, Party size, Date, Time, Source (phone/chat/web/manual badge), Status (colored badge). Click a reservation to open a detail drawer on the right showing all info plus special requests. Action buttons: Confirm (if Pending), Mark Seated (if Confirmed), No-show, Cancel.

--- ORDERS (/orders) ---
Takeout orders from AI agents. Requires the Takeout Orders tool to be enabled in Tool Library (if not enabled, shows a message linking to /tools). Four KPI cards: Active Orders (Received/Confirmed/Preparing), Total Orders (30 days), Revenue (30 days), Cancelled count. Filter by status: Received, Confirmed, Preparing, Ready, Picked Up, Cancelled. Table columns: Customer name/phone, Item count, Total price, Pickup time, Source badge, Status badge, Created time. Click to open detail drawer showing all items with quantities, names, notes, and subtotals, plus order totals (subtotal, tax, total). Action buttons advance the order through its lifecycle: Confirm, Start Preparing, Ready, Picked Up. Cancel button also available.

--- CONTACTS (/customers) ---
Your customer database. Everyone captured by your phone agent, chatbot, QR codes, surveys, website forms, and manual entry shows up here. Add Contact button opens a modal with fields for first name, last name, email, phone, and notes (needs at least email or phone). Table columns: Name, Email, Phone, Source badge (Voice/Chatbot/Survey/Social/Website/Manual/Booking/Outbound/QR Code), Status badge (Lead amber/Prospect violet/Customer emerald/Churned slate), Lead Score, Last Activity. Click a contact to open their detail page with a full activity timeline showing every interaction — calls with transcript snippets, chat messages, emails sent, orders placed, appointments, survey responses, and QR scans. From the detail page you can send an email, send an SMS, log activity, create an appointment, or delete the contact.

--- EMAIL CAMPAIGNS (/campaigns) ---
Send styled emails to your contact list. Click "Create Campaign" to open the builder. Two modes: Single Email (one-off blast) or Email Sequence (multi-step automated series).

Single Email mode: Enter a subject line and body text. Click "AI Draft" to have AI write the email for you (just describe what you want). Pick an email style from 4 options: Clean, Card, Hero, or Dark — each has a different layout. Customize the primary color with a color picker and choose a font. Add attachments like spin wheel links, survey links, discount codes, images, or CTA buttons. Choose recipients: "Send to all contacts with email" or select individual contacts from a searchable list. Preview the email as rendered HTML before sending. Confirmation dialog shows recipient count before you send.

Sequence mode: Create a multi-step email sequence. Name the sequence and add steps. Each step has its own delay (hours after previous step), subject, body, style, and attachments. AI Draft works per-step. Great for welcome sequences, follow-up drips, or re-engagement campaigns.

--- BILLING (/billing) ---
Manage your subscription plan. Shows your current plan with status badge (Active/Trial/Past Due/Cancelled), price, and key dates (trial end, next billing, start date). Five plan tiers: Free, Starter, Growth, Professional, Enterprise. Each shows price, feature highlights, and a CTA button. All paid plans include a 14-day free trial. "Compare all features" link goes to a detailed comparison table at /billing/compare. Payments handled through Stripe — "Manage Payment" opens the Stripe customer portal. Cancel and Resume buttons available.

--- INTEGRATIONS (/integrations) ---
Shows connection status for all external services. Two categories:

Managed services (Embedo provisions for you): AI Voice Agent status, Dedicated Phone Number status, AI Chatbot status, Email Delivery status, Booking Calendar status, Business Website status. Each shows current state (Not deployed/Active/Error) and what it powers.

Social accounts (you connect via OAuth): Instagram, Facebook, Google Business Profile, TikTok. Each has Connect/Disconnect buttons and shows the connected account name.

--- SETTINGS (/settings) ---
Seven tabs:

General: Edit business name, phone, email, website URL, address (street/city/state/zip), business type dropdown, and description textarea.

Business Hours: Set open and close times for each day Monday through Sunday. Toggle any day as Closed. Pick your timezone from a dropdown.

Notifications: Toggle switches for email notifications (new lead, new booking, weekly report) and SMS notifications (new lead, new booking).

Email Defaults: Set default sender name, reply-to email address, default email style (clean/minimal/newsletter), default color, and default font for all outgoing emails.

Modules: Toggle switches to enable/disable each module: Voice Agent, Chatbot, Website, QR Codes, Social Media, Campaigns, Surveys, Proposals.

Team: Invite team members by email with a role selector. Shows list of current team members with name, email, role, and remove button.

Danger Zone: Delete business button with confirmation dialog. This is permanent and irreversible.

--- SETUP WIZARD ---
The onboarding wizard appears on first login or when you click "Setup Guide" on the Dashboard. Has 6 steps with an animated Cubey mascot guide:
1. Welcome — overview of what you'll set up
2. Business Hours — configure open/close times for each day
3. Choose Tools — pick which AI tools you want (phone agent, chatbot, website, QR codes, social, campaigns)
4. Website — generate your AI website right from the wizard
5. AI Agents — provision your phone agent (enter area code for local number) and enable chatbot
6. Launch — checklist of next steps linking to each page, confetti celebration

=== END KNOWLEDGE ===

Remember: SHORT responses, NO markdown, NO lists unless specifically asked for a list. Talk like a person, not a manual.`;


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
