import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { validate, createLogger } from '@embedo/utils';
import { db } from '@embedo/db';
import { processMessage } from './ai/client.js';
import { generateWidgetSnippet, buildWidgetConfig } from './embed/widget.js';
import { env } from './config.js';
import type { ChatMessage } from '@embedo/types';

const log = createLogger('chatbot-agent:routes');

const chatSchema = z.object({
  sessionKey: z.string().nullable().optional(),
  businessId: z.string().min(1),
  channel: z.enum(['WEB', 'INSTAGRAM', 'FACEBOOK']).default('WEB'),
  message: z.string().min(1).max(2000),
  contactId: z.string().nullable().optional(),
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

  // ─── Widget config endpoint (returns live settings for widget.js) ──────────
  app.get('/widget/config/:businessId', async (request, reply) => {
    const { businessId } = request.params as { businessId: string };

    const business = await db.business.findUnique({ where: { id: businessId } });
    if (!business) return reply.code(404).send({ error: 'Business not found' });

    const settings = (business.settings as Record<string, unknown>) ?? {};

    return reply.code(200).send({
      businessId,
      businessName: business.name,
      primaryColor: (settings['primaryColor'] as string) ?? '#a855f7',
      welcomeMessage: (settings['welcomeMessage'] as string) ?? `Hi! How can I help you today?`,
      position: (settings['chatbotPosition'] as string) ?? 'bottom-right',
      bubbleSize: (settings['chatbotBubbleSize'] as number) ?? 56,
      borderRadius: (settings['chatbotBorderRadius'] as number) ?? 16,
      fontFamily: (settings['chatbotFontFamily'] as string) ?? '-apple-system, BlinkMacSystemFont, sans-serif',
      windowWidth: (settings['chatbotWindowWidth'] as number) ?? 360,
      windowHeight: (settings['chatbotWindowHeight'] as number) ?? 500,
      apiUrl: env.CHATBOT_API_URL,
      ...(settings['logoUrl'] ? { logoUrl: settings['logoUrl'] as string } : {}),
    });
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
  var base = window.EmbledoChatConfig;
  if (!base) return;
  if (window.__embedoChatV4) return;
  window.__embedoChatV4 = true;

  // Fetch live settings from API (overrides generation-time config)
  var xhr0 = new XMLHttpRequest();
  xhr0.open('GET', base.apiUrl + '/widget/config/' + base.businessId, true);
  xhr0.timeout = 5000;
  xhr0.onload = function() {
    try { var live = JSON.parse(xhr0.responseText); boot(Object.assign({}, base, live)); }
    catch(e) { boot(base); }
  };
  xhr0.onerror = function() { boot(base); };
  xhr0.ontimeout = function() { boot(base); };
  xhr0.send();

  function boot(C) {
    if (!document.body) return setTimeout(function(){ boot(C); }, 50);
    if (document.getElementById('ec-bubble')) return;

    var pc = C.primaryColor || '#a855f7';
    var bs = C.bubbleSize || 56;
    var br = C.borderRadius != null ? C.borderRadius : 16;
    var ff = C.fontFamily || '-apple-system,BlinkMacSystemFont,sans-serif';
    var ww = C.windowWidth || 360;
    var wh = C.windowHeight || 500;
    var pos = C.position || 'bottom-right';
    var sk = null;
    var busy = false;
    var isOpen = false;

    // ── Bubble ──
    var bub = document.createElement('div');
    bub.id = 'ec-bubble';
    bub.setAttribute('style','position:fixed;'+(pos==='bottom-left'?'left':'right')+':24px;bottom:24px;width:'+bs+'px;height:'+bs+'px;border-radius:50%;background:'+pc+';cursor:pointer;box-shadow:0 4px 24px rgba(0,0,0,.2);display:flex;align-items:center;justify-content:center;z-index:9999;transition:transform .2s');
    var iconSz = Math.round(bs * 0.43);
    bub.innerHTML='<svg width="'+iconSz+'" height="'+iconSz+'" fill="#fff" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';

    // ── Window ──
    var win = document.createElement('div');
    win.id = 'ec-win';
    win.setAttribute('style','position:fixed;'+(pos==='bottom-left'?'left':'right')+':24px;bottom:'+(bs+40)+'px;width:'+ww+'px;height:'+wh+'px;background:#fff;border-radius:'+br+'px;box-shadow:0 8px 48px rgba(0,0,0,.15);display:none;flex-direction:column;z-index:9999;font-family:'+ff+';overflow:hidden');

    var headerBr = br + 'px ' + br + 'px 0 0';
    var inputBr = Math.max(br/2, 6);
    win.innerHTML='<div style="background:'+pc+';padding:16px;color:#fff;border-radius:'+headerBr+'"><div style="font-weight:600;font-size:16px">'+(C.businessName||'Chat')+'</div><div style="font-size:13px;opacity:.85">'+(C.welcomeMessage||'Hi! How can I help you?')+'</div></div><div id="ec-msgs" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:8px"></div><div style="padding:12px;border-top:1px solid #f0f0f0;display:flex;gap:8px"><input id="ec-in" type="text" placeholder="Type a message..." style="flex:1;border:1px solid #e0e0e0;border-radius:'+inputBr+'px;padding:8px 12px;outline:none;font-size:14px;font-family:'+ff+'"><button id="ec-btn" style="background:'+pc+';color:#fff;border:none;border-radius:'+inputBr+'px;padding:8px 16px;cursor:pointer;font-size:14px;font-family:'+ff+'">Send</button></div>';

    document.body.appendChild(bub);
    document.body.appendChild(win);

    var msgs = document.getElementById('ec-msgs');
    var inp = document.getElementById('ec-in');
    var btn = document.getElementById('ec-btn');

    bub.onclick = function() {
      isOpen = !isOpen;
      win.style.display = isOpen ? 'flex' : 'none';
      bub.style.transform = isOpen ? 'scale(.9)' : 'scale(1)';
      if (isOpen) inp.focus();
    };

    function addMsg(txt, isUser) {
      var d = document.createElement('div');
      d.setAttribute('style','max-width:80%;padding:8px 12px;border-radius:'+Math.max(br*0.75,8)+'px;font-size:14px;line-height:1.4;word-wrap:break-word;'+(isUser?'align-self:flex-end;background:'+pc+';color:#fff':'align-self:flex-start;background:#f0f0f0;color:#333'));
      d.textContent = txt;
      msgs.appendChild(d);
      msgs.scrollTop = msgs.scrollHeight;
    }

    function lock() { busy=true; inp.disabled=true; btn.disabled=true; btn.textContent='...'; btn.style.opacity='.5'; }
    function unlock() { busy=false; inp.disabled=false; btn.disabled=false; btn.textContent='Send'; btn.style.opacity='1'; inp.focus(); }

    function send() {
      var txt = (inp.value||'').trim();
      if (!txt || busy) return;
      lock(); inp.value=''; addMsg(txt, true);

      var dot = document.createElement('div');
      dot.id = 'ec-typing';
      dot.setAttribute('style','align-self:flex-start;background:#f0f0f0;color:#999;padding:8px 16px;border-radius:16px;font-size:13px');
      dot.textContent = 'Typing...';
      msgs.appendChild(dot);
      msgs.scrollTop = msgs.scrollHeight;

      var body = { businessId: C.businessId, message: txt, channel: 'WEB' };
      if (sk) body.sessionKey = sk;

      var xhr = new XMLHttpRequest();
      xhr.open('POST', C.apiUrl + '/chat', true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.timeout = 30000;

      xhr.onload = function() {
        var t = document.getElementById('ec-typing'); if (t) t.remove();
        try { var d = JSON.parse(xhr.responseText); if (d.reply) { addMsg(d.reply, false); if (d.sessionKey) sk = d.sessionKey; } else { addMsg('Sorry, something went wrong.', false); } }
        catch(e) { addMsg('Sorry, I had trouble connecting.', false); }
        unlock();
      };
      xhr.onerror = function() { var t = document.getElementById('ec-typing'); if (t) t.remove(); addMsg('Connection error.', false); unlock(); };
      xhr.ontimeout = function() { var t = document.getElementById('ec-typing'); if (t) t.remove(); addMsg('Response took too long.', false); unlock(); };
      xhr.send(JSON.stringify(body));
    }

    btn.onclick = send;
    inp.onkeydown = function(e) { if (e.key === 'Enter') send(); };
  }
})();
`.trim();
}
