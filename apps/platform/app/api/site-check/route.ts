import { NextRequest, NextResponse } from 'next/server';

/**
 * Website quality checker with two scoring modes:
 * 1. AI Vision (Playwright screenshot → Claude Haiku) — accurate visual scoring
 * 2. HTML Heuristic (fallback) — fast regex-based scoring
 *
 * Screenshots are NEVER written to disk — they exist only as in-memory Buffers,
 * converted to base64 for the Claude API call, then garbage collected.
 */

const CHATBOT_SIGNATURES = [
  'tidio', 'tawk.to', 'intercom', 'drift', 'crisp.chat', 'hubspot',
  'zendesk', 'livechat', 'freshchat', 'olark', 'chatra', 'smartsupp',
  'kommunicate', 'botpress', 'dialogflow', 'manychat', 'chatfuel',
  'landbot', 'collect.chat', 'chatbot.com', 'gorgias', 'helpscout',
  'front.com', 'widget.intercom', 'js.intercomcdn', 'embed.tawk.to',
  'cdn.livechatinc.com', 'wchat.freshchat', 'messenger.com/widget',
  'facebook.com/plugins/customerchat', 'fb-customerchat',
];

const SCORING_PROMPT = `You are a website quality analyst evaluating a small business website. Score this screenshot on these dimensions (each 0-10, decimals allowed):

1. Design Quality - Visual appeal, modern aesthetics, professional look, color harmony
2. Layout - Clear hierarchy, good use of space, not cluttered, readable
3. Branding - Consistent colors, logo visible, cohesive identity
4. Mobile Readiness - Infer from desktop layout: responsive patterns, readable text sizes, tap-friendly buttons
5. Content - Images present, clear CTAs, relevant business info visible (hours, menu, services, contact)

Return ONLY valid JSON, no markdown, no explanation:
{"overall":N,"design":N,"layout":N,"branding":N,"mobile":N,"content":N,"summary":"one sentence assessment"}`;

/* ── HTML Heuristic Scorer (fallback) ──────────────────── */

function scoreWebsite(html: string, url: string, status: number, loadTimeMs: number): { score: number; details: string[] } {
  const details: string[] = [];
  let score = 5.0;
  const lower = html.toLowerCase();
  const length = html.length;

  if (status >= 400) { score -= 3; details.push('Site returned error status'); }
  if (length < 500) { score -= 2; details.push('Very little content'); }
  if (lower.includes('<meta name="description"')) { score += 0.5; details.push('Has meta description'); }
  if (lower.includes('<meta property="og:')) { score += 0.3; details.push('Has Open Graph tags'); }
  if (lower.includes('viewport')) { score += 0.5; details.push('Mobile responsive'); }
  if (/<h1[^>]*>/i.test(html)) { score += 0.3; details.push('Has H1 heading'); }
  if (url.startsWith('https')) { score += 0.5; details.push('HTTPS enabled'); }
  if (loadTimeMs < 2000) { score += 0.5; details.push('Fast load time'); }
  else if (loadTimeMs > 5000) { score -= 0.5; details.push('Slow load time'); }
  if (lower.includes('next') || lower.includes('react') || lower.includes('vue')) { score += 0.3; }
  if (lower.includes('srcset') || lower.includes('loading="lazy"')) { score += 0.3; }
  if ((html.match(/<img/gi) ?? []).length > 3) { score += 0.3; }
  if (lower.includes('schema.org') || lower.includes('json-ld')) { score += 0.4; }
  if ((html.match(/<nav/gi) ?? []).length > 0) { score += 0.2; }
  if (lower.includes('tel:') || lower.includes('mailto:')) { score += 0.3; details.push('Contact info present'); }
  if (lower.includes('google.com/maps') || lower.includes('maps.googleapis')) { score += 0.3; details.push('Has map embed'); }
  if (lower.includes('instagram.com') || lower.includes('facebook.com')) { score += 0.2; details.push('Social links'); }
  if (lower.includes('opentable') || lower.includes('resy.com') || lower.includes('calendly')) { score += 0.3; details.push('Online booking'); }
  if (length > 10000) score += 0.3;
  if (length > 50000) score += 0.3;

  return { score: Math.round(Math.min(10, Math.max(0, score)) * 10) / 10, details };
}

function detectChatbot(html: string): { hasChatbot: boolean; provider: string | null } {
  const lower = html.toLowerCase();
  for (const sig of CHATBOT_SIGNATURES) {
    if (lower.includes(sig)) {
      return { hasChatbot: true, provider: sig.split('.')[0] ?? sig };
    }
  }
  if (lower.includes('chat-widget') || lower.includes('chatwidget') || lower.includes('live-chat')) {
    return { hasChatbot: true, provider: 'unknown' };
  }
  return { hasChatbot: false, provider: null };
}

/* ── AI Vision Scorer (Playwright + Claude Haiku) ──────── */

interface Scorecard {
  overall: number;
  design: number;
  layout: number;
  branding: number;
  mobile: number;
  content: number;
  summary: string;
}

async function scoreWithAIVision(url: string): Promise<Scorecard | null> {
  // Dynamic imports to avoid cold-start cost
  const { chromium } = await import('playwright');
  const Anthropic = (await import('@anthropic-ai/sdk')).default;

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();

    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });

    // Screenshot to Buffer — NEVER written to disk
    const screenshotBuffer: Buffer = await page.screenshot({ type: 'png', fullPage: false });

    // Close browser immediately to free resources
    await browser.close();
    browser = null;

    // Convert to base64 for Claude API
    const base64 = screenshotBuffer.toString('base64');

    // Call Claude Haiku with the screenshot
    const anthropic = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] });
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/png', data: base64 } },
          { type: 'text', text: SCORING_PROMPT },
        ],
      }],
    });

    // Parse JSON response
    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as Scorecard;
    // Validate ranges
    for (const key of ['overall', 'design', 'layout', 'branding', 'mobile', 'content'] as const) {
      if (typeof parsed[key] !== 'number' || parsed[key] < 0 || parsed[key] > 10) return null;
    }

    return parsed;
  } catch {
    return null;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

/* ── API Handler ───────────────────────────────────────── */

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'url param required' }, { status: 400 });

  let targetUrl = url;
  if (!targetUrl.startsWith('http')) targetUrl = `https://${targetUrl}`;

  // Always fetch HTML (for chatbot detection + heuristic fallback)
  let html = '';
  let httpStatus = 0;
  let loadTimeMs = 0;
  try {
    const start = Date.now();
    const res = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EmbedoBot/1.0)' },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });
    loadTimeMs = Date.now() - start;
    httpStatus = res.status;
    html = await res.text();
  } catch {
    // Site unreachable — still try AI vision below
  }

  const { hasChatbot, provider: chatbotProvider } = detectChatbot(html);
  const contentLength = html.length;

  // Try AI Vision scoring (Playwright + Claude Haiku)
  if (process.env['ANTHROPIC_API_KEY']) {
    try {
      const aiResult = await Promise.race([
        scoreWithAIVision(targetUrl),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 30000)),
      ]);

      if (aiResult) {
        return NextResponse.json({
          url: targetUrl,
          score: aiResult.overall,
          scorecard: {
            design: aiResult.design,
            layout: aiResult.layout,
            branding: aiResult.branding,
            mobile: aiResult.mobile,
            content: aiResult.content,
            summary: aiResult.summary,
          },
          scoringMethod: 'ai-vision',
          details: [],
          loadTimeMs,
          hasChatbot,
          chatbotProvider,
          contentLength,
        });
      }
    } catch {
      // Fall through to heuristic
    }
  }

  // Fallback: HTML heuristic scorer
  if (!html) {
    return NextResponse.json({
      url: targetUrl,
      score: 0,
      details: ['Site unreachable'],
      scoringMethod: 'html-heuristic',
      loadTimeMs: 0,
      hasChatbot: false,
      chatbotProvider: null,
      contentLength: 0,
    });
  }

  const { score, details } = scoreWebsite(html, targetUrl, httpStatus, loadTimeMs);
  return NextResponse.json({
    url: targetUrl,
    score,
    details,
    scoringMethod: 'html-heuristic',
    loadTimeMs,
    hasChatbot,
    chatbotProvider,
    contentLength,
  });
}
