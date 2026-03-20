import { createLogger } from '@embedo/utils';

const logger = createLogger('website-gen:image-verify');

/**
 * Verify all image URLs in the generated HTML actually load.
 * Replace broken ones with working fallbacks.
 */
export async function verifyAndFixImages(html: string, fallbackImages: Array<{ url: string; alt: string }>): Promise<string> {
  // Extract all img src URLs from the HTML
  const urlsToCheck = new Set<string>();
  let match: RegExpExecArray | null;

  // Collect all image URLs
  const imgRegex = /src=["']([^"']+\.(?:jpg|jpeg|png|webp|gif|svg)[^"']*)/gi;
  while ((match = imgRegex.exec(html)) !== null) {
    if (match[1] && match[1].startsWith('http')) urlsToCheck.add(match[1]);
  }

  const bgRegex = /url\(["']?([^"')]+\.(?:jpg|jpeg|png|webp|gif)[^"')]*)/gi;
  while ((match = bgRegex.exec(html)) !== null) {
    if (match[1] && match[1].startsWith('http')) urlsToCheck.add(match[1]);
  }

  if (urlsToCheck.size === 0) {
    logger.info('No image URLs found to verify');
    return html;
  }

  // Check each URL with a HEAD request (fast, no download)
  const broken = new Set<string>();
  const checks = Array.from(urlsToCheck).map(async (url) => {
    try {
      const res = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
        redirect: 'follow',
      });
      if (!res.ok) {
        broken.add(url);
      }
    } catch {
      broken.add(url);
    }
  });

  await Promise.all(checks);

  if (broken.size === 0) {
    logger.info({ total: urlsToCheck.size }, 'All images verified OK');
    return html;
  }

  logger.warn({ broken: broken.size, total: urlsToCheck.size }, 'Broken images found — replacing');

  // Replace broken URLs with fallback images
  let fixed = html;
  let fallbackIdx = 0;
  for (const brokenUrl of broken) {
    const fallback = fallbackImages[fallbackIdx % fallbackImages.length];
    if (fallback) {
      // Escape special regex chars in the URL
      const escaped = brokenUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      fixed = fixed.replace(new RegExp(escaped, 'g'), fallback.url);
      fallbackIdx++;
    }
  }

  logger.info({ replaced: broken.size }, 'Broken images replaced with fallbacks');
  return fixed;
}

/**
 * Remove common image artifacts:
 * - Yellow/gold borders or outlines on images (browser focus styles, broken CSS)
 * - Ring utilities that look like selection boxes
 */
export function cleanImageArtifacts(html: string): string {
  // Add CSS to prevent yellow box artifacts on images
  const artifactFix = `
    /* Prevent image artifacts — yellow boxes, focus rings, selection outlines */
    img { outline: none !important; border: none !important; box-shadow: none !important; }
    img:focus, img:active { outline: none !important; }
    *:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
    img:focus-visible { outline: none !important; }
    [class*="ring-"] img, img[class*="ring-"] { --tw-ring-shadow: none !important; }
    figure { outline: none !important; border: none !important; }
  `;

  // Inject before </style> or before </head>
  if (html.includes('</style>')) {
    html = html.replace('</style>', `${artifactFix}\n</style>`);
  } else if (html.includes('</head>')) {
    html = html.replace('</head>', `<style>${artifactFix}</style>\n</head>`);
  }

  // Also remove any inline border/outline styles on img tags
  html = html.replace(/(<img[^>]*)\s+style="[^"]*(?:border|outline)[^"]*"/gi, '$1');

  return html;
}
