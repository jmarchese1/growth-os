import { createLogger } from '@embedo/utils';

const log = createLogger('prospector:website-score');

const CHATBOT_SIGNATURES = [
  'tidio', 'tawk.to', 'intercom', 'drift', 'crisp.chat', 'hubspot',
  'zendesk', 'livechat', 'freshchat', 'olark', 'chatra', 'smartsupp',
  'kommunicate', 'botpress', 'manychat', 'chatfuel', 'landbot',
  'chatbot.com', 'gorgias', 'helpscout', 'embed.tawk.to',
  'cdn.livechatinc.com', 'fb-customerchat',
];

interface WebsiteScoreResult {
  score: number;
  scorecard: Record<string, number | string> | null;
  scoringMethod: 'html-heuristic';
  hasChatbot: boolean;
  chatbotProvider: string | null;
}

/**
 * Score a website using HTML heuristics. Fast, no external deps.
 * Called during prospect enrichment in the worker pipeline.
 */
export async function scoreWebsite(websiteUrl: string): Promise<WebsiteScoreResult> {
  let targetUrl = websiteUrl;
  if (!targetUrl.startsWith('http')) targetUrl = `https://${targetUrl}`;

  try {
    const res = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EmbedoBot/1.0)' },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });
    const html = await res.text();
    const lower = html.toLowerCase();
    const length = html.length;

    let score = 5.0;

    if (res.status >= 400) score -= 3;
    if (length < 500) score -= 2;
    if (lower.includes('<meta name="description"')) score += 0.5;
    if (lower.includes('<meta property="og:')) score += 0.3;
    if (lower.includes('viewport')) score += 0.5;
    if (/<h1[^>]*>/i.test(html)) score += 0.3;
    if (targetUrl.startsWith('https')) score += 0.5;
    if (lower.includes('srcset') || lower.includes('loading="lazy"')) score += 0.3;
    if ((html.match(/<img/gi) ?? []).length > 3) score += 0.3;
    if (lower.includes('schema.org') || lower.includes('json-ld')) score += 0.4;
    if ((html.match(/<nav/gi) ?? []).length > 0) score += 0.2;
    if (lower.includes('tel:') || lower.includes('mailto:')) score += 0.3;
    if (lower.includes('google.com/maps') || lower.includes('maps.googleapis')) score += 0.3;
    if (lower.includes('instagram.com') || lower.includes('facebook.com')) score += 0.2;
    if (lower.includes('opentable') || lower.includes('resy.com') || lower.includes('calendly')) score += 0.3;
    if (length > 10000) score += 0.3;
    if (length > 50000) score += 0.3;

    score = Math.round(Math.min(10, Math.max(0, score)) * 10) / 10;

    // Chatbot detection
    let hasChatbot = false;
    let chatbotProvider: string | null = null;
    for (const sig of CHATBOT_SIGNATURES) {
      if (lower.includes(sig)) {
        hasChatbot = true;
        chatbotProvider = sig.split('.')[0] ?? sig;
        break;
      }
    }
    if (!hasChatbot && (lower.includes('chat-widget') || lower.includes('chatwidget') || lower.includes('live-chat'))) {
      hasChatbot = true;
      chatbotProvider = 'unknown';
    }

    log.info({ url: targetUrl, score, hasChatbot, chatbotProvider }, 'Website scored');
    return { score, scorecard: null, scoringMethod: 'html-heuristic', hasChatbot, chatbotProvider };
  } catch (err) {
    log.warn({ url: targetUrl, err }, 'Website scoring failed');
    return { score: 0, scorecard: null, scoringMethod: 'html-heuristic', hasChatbot: false, chatbotProvider: null };
  }
}
