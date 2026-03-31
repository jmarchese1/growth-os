/**
 * Extract and validate Instagram handles from URLs.
 */

/**
 * Parse an Instagram URL into a handle.
 * "https://www.instagram.com/marios_pizza/" → "marios_pizza"
 * "https://instagram.com/marios_pizza?hl=en" → "marios_pizza"
 * "@marios_pizza" → "marios_pizza"
 * "marios_pizza" → "marios_pizza"
 */
export function extractHandle(input: string): string | null {
  if (!input || input.trim().length === 0) return null;

  let handle: string;

  // Handle full URLs
  if (input.includes('instagram.com')) {
    try {
      const url = new URL(input.startsWith('http') ? input : `https://${input}`);
      const path = url.pathname.replace(/^\//, '').replace(/\/$/, '');
      // Skip post/reel/story URLs — these aren't profile pages
      if (path.startsWith('p/') || path.startsWith('reel/') || path.startsWith('stories/') || path.startsWith('explore/')) {
        return null;
      }
      handle = path.split('/')[0] ?? '';
    } catch {
      return null;
    }
  } else {
    // Bare handle, possibly with @
    handle = input.trim().replace(/^@/, '');
  }

  // Validate handle format: 1-30 chars, alphanumeric + underscores + periods
  if (!handle || handle.length === 0 || handle.length > 30) return null;
  if (!/^[a-zA-Z0-9_.]+$/.test(handle)) return null;

  return handle.toLowerCase();
}

/**
 * Build the full Instagram profile URL from a handle.
 */
export function handleToUrl(handle: string): string {
  return `https://www.instagram.com/${handle}/`;
}
