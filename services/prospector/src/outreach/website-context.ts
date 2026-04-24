/**
 * Lightweight website scraper — fetches homepage (and /about fallback),
 * strips HTML + scripts + noise, returns clean text for AI personalization.
 *
 * Designed to be fast (8s timeout) and resilient (returns null on any failure,
 * never throws). Used to give Claude real content about the prospect before
 * it writes the cold email.
 */

import { createLogger } from '@embedo/utils';

const log = createLogger('prospector:website-context');

const FETCH_TIMEOUT_MS = 8000;
const MAX_CHARS = 2400; // ~600 tokens, enough for Claude to find something specific

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('text/html') && !ct.includes('text/plain') && !ct.includes('xhtml')) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * Strip HTML → clean text.
 * Drops <script>, <style>, <nav>, <footer>, <header>, cookie banners, noise.
 * Collapses whitespace. Truncates to MAX_CHARS.
 */
function extractCleanText(html: string): string {
  let text = html
    // Drop entire blocks that are nav/script/style/footer/aside
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<aside[\s\S]*?<\/aside>/gi, ' ')
    .replace(/<form[\s\S]*?<\/form>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, ' ')
    // Strip remaining tags
    .replace(/<[^>]+>/g, ' ')
    // Decode common entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();

  // Strip obvious cookie banner / privacy noise
  text = text.replace(/(cookies?\s+to\s+improve.*?(accept|agree|ok)[^.]*\.)/gi, '');
  text = text.replace(/(this\s+website\s+uses\s+cookies[^.]*\.)/gi, '');

  return text.slice(0, MAX_CHARS);
}

function normalizeUrl(url: string): string {
  let u = url.trim();
  if (!u.startsWith('http')) u = `https://${u}`;
  // Strip trailing slash for consistency
  return u.replace(/\/$/, '');
}

/**
 * Fetch a cleaned text snapshot of the prospect's website.
 * Tries homepage first. If that returns nothing useful, tries /about.
 * Returns null if both fail.
 */
export async function fetchWebsiteContext(rawUrl: string | null | undefined): Promise<string | null> {
  if (!rawUrl) return null;
  const url = normalizeUrl(rawUrl);

  const homepage = await fetchHtml(url);
  if (homepage) {
    const cleaned = extractCleanText(homepage);
    if (cleaned.length > 200) {
      log.debug({ url, chars: cleaned.length }, 'Scraped homepage');
      return cleaned;
    }
  }

  // Fallback: /about
  const about = await fetchHtml(`${url}/about`);
  if (about) {
    const cleaned = extractCleanText(about);
    if (cleaned.length > 200) {
      log.debug({ url, chars: cleaned.length }, 'Scraped /about fallback');
      return cleaned;
    }
  }

  return null;
}
