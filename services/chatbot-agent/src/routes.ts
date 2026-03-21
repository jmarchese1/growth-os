import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { validate, createLogger } from '@embedo/utils';
import { db } from '@embedo/db';
import { processMessage } from './ai/client.js';
import { generateWidgetSnippet, buildWidgetConfig } from './embed/widget.js';
import type { ChatMessage } from '@embedo/types';

const log = createLogger('chatbot-agent:routes');

const chatSchema = z.object({
  sessionKey: z.string().optional(),
  businessId: z.string().min(1),
  channel: z.enum(['WEB', 'INSTAGRAM', 'FACEBOOK']).default('WEB'),
  message: z.string().min(1).max(2000),
  contactId: z.string().optional(),
  test: z.boolean().optional(),
});

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => ({ ok: true, service: 'chatbot-agent' }));

  // ─── Chat endpoint ─────────────────────────────────────────────────────────
  app.post('/chat', async (request, reply) => {
    const body = validate(chatSchema, request.body);
    const { businessId, message, contactId, test } = body;
    const channel = body.channel ?? 'WEB';

    // ── Test mode: skip DB persistence and lead events ──────────────────────
    if (test) {
      // Accept optional history passed inline (no DB lookup)
      const inlineHistory = ((request.body as Record<string, unknown>)['history'] as ChatMessage[]) ?? [];

      const result = await processMessage({
        businessId,
        sessionKey: `test:${businessId}:${Date.now()}`,
        message,
        history: inlineHistory,
        channel,
        test: true,
      });

      log.info({ businessId, test: true }, 'Test chat processed');

      return reply.code(200).send({
        reply: result.reply,
        sessionKey: null,
        actions: result.actions,
      });
    }

    // ── Normal mode: full DB persistence ────────────────────────────────────
    let sessionKey: string = body.sessionKey ?? '';
    let session = sessionKey
      ? await db.chatSession.findUnique({ where: { sessionKey } })
      : null;

    if (!session) {
      sessionKey = `${businessId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
      session = await db.chatSession.create({
        data: {
          businessId,
          ...(contactId ? { contactId } : {}),
          channel,
          sessionKey,
          messages: [],
        },
      });
    }

    const history = (session.messages as unknown as ChatMessage[]) ?? [];

    const result = await processMessage({
      businessId,
      sessionKey: session.sessionKey,
      message,
      history,
      channel,
    });

    log.info({ sessionKey, leadCaptured: result.leadCaptured }, 'Chat processed');

    return reply.code(200).send({
      reply: result.reply,
      sessionKey: session.sessionKey,
      actions: result.actions,
    });
  });

  // ─── Widget config endpoint ────────────────────────────────────────────────
  app.get('/widget/config/:businessId', async (request, reply) => {
    const { businessId } = request.params as { businessId: string };

    const business = await db.business.findUnique({ where: { id: businessId } });
    if (!business) return reply.code(404).send({ error: 'Business not found' });

    const settings = (business.settings as Record<string, unknown>) ?? {};

    const config = buildWidgetConfig({
      businessId,
      businessName: business.name,
      primaryColor: (settings['primaryColor'] as string) ?? '#000000',
      ...(settings['logoUrl'] ? { logoUrl: settings['logoUrl'] as string } : {}),
    });

    return reply.code(200).send(config);
  });

  // ─── Widget snippet endpoint ───────────────────────────────────────────────
  app.get('/widget/snippet/:businessId', async (request, reply) => {
    const { businessId } = request.params as { businessId: string };

    const business = await db.business.findUnique({ where: { id: businessId } });
    if (!business) return reply.code(404).send({ error: 'Business not found' });

    const settings = (business.settings as Record<string, unknown>) ?? {};

    const config = buildWidgetConfig({
      businessId,
      businessName: business.name,
      primaryColor: (settings['primaryColor'] as string) ?? '#000000',
    });

    const snippet = generateWidgetSnippet(config);
    return reply.header('Content-Type', 'text/plain').send(snippet);
  });

  // ─── Widget JS serve endpoint ──────────────────────────────────────────────
  // In production this would be served from a CDN, but for dev we serve it here
  app.get('/widget.js', async (_request, reply) => {
    const widgetJs = buildWidgetJs();
    return reply
      .header('Content-Type', 'application/javascript')
      .header('Access-Control-Allow-Origin', '*')
      .header('Cache-Control', 'no-cache, no-store, must-revalidate')
      .send(widgetJs);
  });
}

/**
 * Minimal chatbot widget JavaScript — injects a chat bubble into the page.
 * In production, this should be a compiled/minified bundle.
 */
function buildWidgetJs(): string {
  return `
(function() {
  var config = window.EmbledoChatConfig;
  if (!config) return;
  if (window.__embedoChatLoaded) return;
  window.__embedoChatLoaded = true;
  console.log('[Embedo Chat] Widget v2 loaded');

  function init() {
    if (!document.body) { setTimeout(init, 50); return; }
    if (document.getElementById('embedo-chat-bubble')) return;

  // Create chat bubble
  var bubble = document.createElement('div');
  bubble.id = 'embedo-chat-bubble';
  bubble.style.cssText = [
    'position:fixed',
    config.position === 'bottom-left' ? 'left:24px' : 'right:24px',
    'bottom:24px',
    'width:56px',
    'height:56px',
    'border-radius:50%',
    'background:' + config.primaryColor,
    'cursor:pointer',
    'box-shadow:0 4px 24px rgba(0,0,0,0.2)',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'z-index:9999',
    'transition:transform 0.2s ease',
  ].join(';');

  bubble.innerHTML = '<svg width="24" height="24" fill="white" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';

  // Create chat window
  var chatWindow = document.createElement('div');
  chatWindow.id = 'embedo-chat-window';
  chatWindow.style.cssText = [
    'position:fixed',
    config.position === 'bottom-left' ? 'left:24px' : 'right:24px',
    'bottom:96px',
    'width:360px',
    'height:500px',
    'background:white',
    'border-radius:16px',
    'box-shadow:0 8px 48px rgba(0,0,0,0.15)',
    'display:none',
    'flex-direction:column',
    'z-index:9999',
    'font-family:-apple-system,BlinkMacSystemFont,sans-serif',
    'overflow:hidden',
  ].join(';');

  chatWindow.innerHTML = \`
    <div style="background:\${config.primaryColor};padding:16px;color:white;border-radius:16px 16px 0 0">
      <div style="font-weight:600;font-size:16px">\${config.businessName}</div>
      <div style="font-size:13px;opacity:0.85">\${config.welcomeMessage}</div>
    </div>
    <div id="embedo-messages" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:8px"></div>
    <div style="padding:12px;border-top:1px solid #f0f0f0;display:flex;gap:8px">
      <input id="embedo-input" type="text" placeholder="Type a message..." style="flex:1;border:1px solid #e0e0e0;border-radius:8px;padding:8px 12px;outline:none;font-size:14px"/>
      <button id="embedo-send" style="background:\${config.primaryColor};color:white;border:none;border-radius:8px;padding:8px 16px;cursor:pointer;font-size:14px">Send</button>
    </div>
  \`;

  document.body.appendChild(bubble);
  document.body.appendChild(chatWindow);

  var sessionKey = null;
  var isOpen = false;

  bubble.addEventListener('click', function() {
    isOpen = !isOpen;
    chatWindow.style.display = isOpen ? 'flex' : 'none';
    bubble.style.transform = isOpen ? 'scale(0.9)' : 'scale(1)';
  });

  function addMessage(text, isUser) {
    var msgs = document.getElementById('embedo-messages');
    var msg = document.createElement('div');
    msg.style.cssText = [
      'max-width:80%',
      'padding:8px 12px',
      'border-radius:12px',
      'font-size:14px',
      'line-height:1.4',
      isUser ? 'align-self:flex-end;background:' + config.primaryColor + ';color:white' : 'align-self:flex-start;background:#f0f0f0;color:#333',
    ].join(';');
    msg.textContent = text;
    msgs.appendChild(msg);
    msgs.scrollTop = msgs.scrollHeight;
  }

  var isSending = false;

  async function sendMessage() {
    var input = document.getElementById('embedo-input');
    var sendBtn = document.getElementById('embedo-send');
    var message = input.value.trim();
    if (!message || isSending) return;

    isSending = true;
    input.value = '';
    input.disabled = true;
    sendBtn.disabled = true;
    sendBtn.textContent = '...';
    sendBtn.style.opacity = '0.5';
    addMessage(message, true);

    // Show typing indicator
    var typing = document.createElement('div');
    typing.id = 'embedo-typing';
    typing.style.cssText = 'align-self:flex-start;background:#f0f0f0;color:#999;padding:8px 16px;border-radius:16px;font-size:13px;';
    typing.textContent = 'Typing...';
    var msgs = document.getElementById('embedo-messages');
    msgs.appendChild(typing);
    msgs.scrollTop = msgs.scrollHeight;

    try {
      var res = await fetch(config.apiUrl + '/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: config.businessId,
          message: message,
          sessionKey: sessionKey,
          channel: 'WEB',
        }),
      });
      var data = await res.json();
      sessionKey = data.sessionKey;
      var t = document.getElementById('embedo-typing');
      if (t) t.remove();
      addMessage(data.reply, false);
    } catch(e) {
      var t2 = document.getElementById('embedo-typing');
      if (t2) t2.remove();
      addMessage('Sorry, I had trouble connecting. Please try again.', false);
    }

    isSending = false;
    input.disabled = false;
    sendBtn.disabled = false;
    sendBtn.textContent = 'Send';
    sendBtn.style.opacity = '1';
    input.focus();
  }

  document.getElementById('embedo-send').addEventListener('click', sendMessage);
  document.getElementById('embedo-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') sendMessage();
  });
  } // end init

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`.trim();
}
