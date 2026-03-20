import Anthropic from '@anthropic-ai/sdk';
import { createLogger } from '@embedo/utils';

const logger = createLogger('website-gen:reviewer');

/**
 * Review a generated website by fetching its live HTML and having Claude
 * analyze it for quality issues. Returns a revised HTML if fixes are needed.
 *
 * This works without Playwright — fetches the deployed HTML and analyzes
 * the code structure, not a screenshot.
 */
export async function reviewAndImprove(params: {
  html: string;
  deployedUrl: string;
  businessName: string;
  industryType: string;
  inspirationNotes: string;
  anthropicKey: string;
  maxRounds?: number;
}): Promise<{ html: string; improvements: string[] }> {
  const { html, businessName, industryType, inspirationNotes, anthropicKey, maxRounds = 1 } = params;
  const improvements: string[] = [];
  let currentHtml = html;

  const client = new Anthropic({ apiKey: anthropicKey });

  for (let round = 0; round < maxRounds; round++) {
    logger.info({ round: round + 1, htmlLength: currentHtml.length }, 'Starting review round');

    // Extract key sections for review (don't send the full 40KB)
    const headSection = currentHtml.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1]?.slice(0, 3000) ?? '';
    const bodyStart = currentHtml.match(/<body[^>]*>([\s\S]{0,5000})/i)?.[1] ?? '';
    const imgTags = Array.from(currentHtml.matchAll(/<img[^>]+>/gi)).map(m => m[0]).join('\n');
    const sectionCount = (currentHtml.match(/<section/gi) ?? []).length;
    const hasTailwind = currentHtml.includes('tailwindcss.com');
    const imageCount = (currentHtml.match(/<img/gi) ?? []).length;
    const hasGoogleFonts = currentHtml.includes('fonts.googleapis.com');

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      messages: [{
        role: 'user',
        content: `You are a senior web designer reviewing a generated website for ${businessName} (${industryType}).

## SITE STATS
- Tailwind CSS loaded: ${hasTailwind}
- Google Fonts loaded: ${hasGoogleFonts}
- Sections: ${sectionCount}
- Images: ${imageCount}
- HTML size: ${currentHtml.length} chars

## HEAD SECTION (first 3000 chars)
${headSection}

## BODY START (first 5000 chars)
${bodyStart}

## ALL IMAGE TAGS
${imgTags || 'NO IMAGES FOUND'}

## INSPIRATION CONTEXT
${inspirationNotes.slice(0, 2000)}

## REVIEW CHECKLIST
Score each 1-5 and note fixes needed:

1. **Images**: Are there enough images (at least 4)? Do they use object-cover? Any broken src patterns?
2. **Layout variety**: Do sections look different from each other or is it all the same pattern repeated?
3. **Typography**: Are fonts loaded? Is there heading/body hierarchy?
4. **Spacing**: Appropriate padding between sections? Not too cramped or empty?
5. **Hero quality**: Does the hero have a background image with overlay? Is the heading impactful?
6. **Colors**: Does the palette match the inspiration? Is there good contrast?
7. **Mobile**: Are there responsive breakpoints (sm:, md:, lg:)?
8. **Interactivity**: Hover effects, transitions, smooth scroll?
9. **Image artifacts**: Any images with borders, outlines, or yellow boxes that shouldn't be there?
10. **Overall polish**: Does it look agency-quality or generic?

If the site scores 8+/10 overall, respond with:
{"action": "approve", "score": N, "notes": "brief note"}

If it needs fixes, respond with the COMPLETE fixed HTML:
{"action": "fix", "score": N, "improvements": ["what you fixed"], "html": "<!DOCTYPE html>...complete HTML..."}

IMPORTANT: If you return fixed HTML, it must be COMPLETE and valid. Don't truncate.
Return ONLY valid JSON.`,
      }],
    });

    const block = response.content[0];
    const text = block && block.type === 'text' ? block.text.trim() : '{}';
    const jsonText = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

    try {
      const result = JSON.parse(jsonText) as {
        action: 'approve' | 'fix';
        score: number;
        notes?: string;
        improvements?: string[];
        html?: string;
      };

      logger.info({ round: round + 1, action: result.action, score: result.score }, 'Review result');

      if (result.action === 'approve' || result.score >= 8) {
        logger.info({ score: result.score }, 'Site approved by reviewer');
        break;
      }

      if (result.action === 'fix' && result.html && result.html.includes('<!DOCTYPE')) {
        currentHtml = result.html;
        improvements.push(...(result.improvements ?? []));
        logger.info({ improvements: result.improvements, newLength: currentHtml.length }, 'Applied review fixes');
      } else {
        logger.warn('Reviewer suggested fix but did not return valid HTML');
        break;
      }
    } catch {
      logger.warn('Failed to parse review response');
      break;
    }
  }

  return { html: currentHtml, improvements };
}
