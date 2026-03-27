import { NextRequest, NextResponse } from 'next/server';

/**
 * Lightweight website quality checker.
 * Fetches the HTML of a site and scores it 0-10 based on signals.
 * Also detects common chatbot widgets.
 */

const CHATBOT_SIGNATURES = [
  // Common chatbot/widget scripts and elements
  'tidio', 'tawk.to', 'intercom', 'drift', 'crisp.chat', 'hubspot',
  'zendesk', 'livechat', 'freshchat', 'olark', 'chatra', 'smartsupp',
  'kommunicate', 'botpress', 'dialogflow', 'manychat', 'chatfuel',
  'landbot', 'collect.chat', 'chatbot.com', 'gorgias', 'helpscout',
  'front.com', 'widget.intercom', 'js.intercomcdn', 'embed.tawk.to',
  'cdn.livechatinc.com', 'wchat.freshchat', 'messenger.com/widget',
  'facebook.com/plugins/customerchat', 'fb-customerchat',
];

function scoreWebsite(html: string, url: string, status: number, loadTimeMs: number): { score: number; details: string[] } {
  const details: string[] = [];
  let score = 5.0; // Start at baseline

  const lower = html.toLowerCase();
  const length = html.length;

  // Penalize errors
  if (status >= 400) { score -= 3; details.push('Site returned error status'); }
  if (length < 500) { score -= 2; details.push('Very little content'); }

  // Content quality signals
  if (lower.includes('<meta name="description"')) { score += 0.5; details.push('Has meta description'); }
  if (lower.includes('<meta property="og:')) { score += 0.3; details.push('Has Open Graph tags'); }
  if (lower.includes('viewport')) { score += 0.5; details.push('Mobile responsive'); }
  if (/<h1[^>]*>/i.test(html)) { score += 0.3; details.push('Has H1 heading'); }

  // SSL
  if (url.startsWith('https')) { score += 0.5; details.push('HTTPS enabled'); }

  // Performance signals
  if (loadTimeMs < 2000) { score += 0.5; details.push('Fast load time'); }
  else if (loadTimeMs > 5000) { score -= 0.5; details.push('Slow load time'); }

  // Modern tech signals
  if (lower.includes('next') || lower.includes('react') || lower.includes('vue') || lower.includes('angular')) {
    score += 0.3; details.push('Modern framework detected');
  }

  // Image optimization
  if (lower.includes('srcset') || lower.includes('loading="lazy"')) {
    score += 0.3; details.push('Optimized images');
  }

  // Rich content
  if ((html.match(/<img/gi) ?? []).length > 3) { score += 0.3; details.push('Multiple images'); }
  if (lower.includes('schema.org') || lower.includes('json-ld')) { score += 0.4; details.push('Structured data'); }

  // Navigation
  if ((html.match(/<nav/gi) ?? []).length > 0) { score += 0.2; details.push('Has navigation'); }

  // Contact info signals
  if (lower.includes('tel:') || lower.includes('mailto:')) { score += 0.2; details.push('Contact info present'); }

  // Content volume
  if (length > 10000) { score += 0.3; }
  if (length > 50000) { score += 0.3; }

  return { score: Math.round(Math.min(10, Math.max(0, score)) * 10) / 10, details };
}

function detectChatbot(html: string): { hasChatbot: boolean; provider: string | null } {
  const lower = html.toLowerCase();
  for (const sig of CHATBOT_SIGNATURES) {
    if (lower.includes(sig)) {
      return { hasChatbot: true, provider: sig.split('.')[0] ?? sig };
    }
  }
  // Check for generic chat widget patterns
  if (lower.includes('chat-widget') || lower.includes('chatwidget') || lower.includes('live-chat') || lower.includes('livechat')) {
    return { hasChatbot: true, provider: 'unknown' };
  }
  return { hasChatbot: false, provider: null };
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'url param required' }, { status: 400 });

  // Normalize URL
  let targetUrl = url;
  if (!targetUrl.startsWith('http')) targetUrl = `https://${targetUrl}`;

  try {
    const start = Date.now();
    const res = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EmbedoBot/1.0)' },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });
    const loadTimeMs = Date.now() - start;
    const html = await res.text();

    const { score, details } = scoreWebsite(html, targetUrl, res.status, loadTimeMs);
    const { hasChatbot, provider } = detectChatbot(html);

    return NextResponse.json({
      url: targetUrl,
      score,
      details,
      loadTimeMs,
      hasChatbot,
      chatbotProvider: provider,
      contentLength: html.length,
    });
  } catch (err) {
    return NextResponse.json({
      url: targetUrl,
      score: 0,
      details: ['Site unreachable or timed out'],
      loadTimeMs: 0,
      hasChatbot: false,
      chatbotProvider: null,
      contentLength: 0,
      error: err instanceof Error ? err.message : 'Failed to fetch',
    });
  }
}
