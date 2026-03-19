import Anthropic from '@anthropic-ai/sdk';
import { createLogger } from '@embedo/utils';
import type { StyleOverrides } from '../templates/restaurant/premium.js';

const logger = createLogger('website-gen:style-generator');

/**
 * Uses AI to generate dynamic StyleOverrides based on:
 * - Inspiration site analysis (screenshots + CSS tokens)
 * - Industry type
 * - Color scheme + font pairing selections
 *
 * This is what makes every generated site UNIQUE instead of cookie-cutter.
 */
export async function generateStyleOverrides(params: {
  inspirationStyleNotes: string;
  industryType: string;
  colorScheme: string;
  fontPairing: string;
  businessName: string;
  hasHeroImage: boolean;
  hasManyMenuItems: boolean;
  hasGallery: boolean;
}, anthropicKey: string): Promise<Partial<StyleOverrides>> {
  if (!params.inspirationStyleNotes && !params.industryType) {
    return {}; // No inspiration = use defaults
  }

  const client = new Anthropic({ apiKey: anthropicKey });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `You are an expert web designer. Generate specific CSS design tokens for a website based on the inspiration and context below.

## Inspiration & Style Notes
${params.inspirationStyleNotes || 'No specific inspiration provided — create a unique, high-quality design appropriate for the industry.'}

## Context
- Industry: ${params.industryType}
- Business: ${params.businessName}
- Selected color scheme: ${params.colorScheme}
- Selected font: ${params.fontPairing}
- Has hero image: ${params.hasHeroImage}
- Menu items: ${params.hasManyMenuItems ? 'many (8+)' : 'few or none'}
- Has gallery: ${params.hasGallery}

## Your Task
Generate a JSON object of style tokens that make this site visually UNIQUE. Don't use the same values every time — vary them based on the inspiration sites and industry mood.

For example:
- A fine dining restaurant inspired by a moody Alinea-style site should get: large hero, bottom-aligned layout, sharp buttons (0px radius), no card borders, thick accent dividers, large heading scale, wide letter spacing
- A bright brunch cafe inspired by Blue Bottle should get: centered compact hero, pill buttons, rounded cards with shadows, minimal dividers, standard heading scale
- A luxury spa inspired by Aman resorts should get: full-height hero, light touch (ghost buttons), large spacing, no borders, floating images, serif section labels

Return ONLY valid JSON with these fields (include ALL fields):
{
  "navHeight": "64px to 80px",
  "navStyle": "fixed" | "sticky" | "static",
  "navBackground": "transparent" | "rgba(x,x,x,0.9)" | use theme bg with alpha,
  "sectionPadding": "vertical padding for sections, e.g. 100px 0, 140px 0, 80px 0",
  "maxWidth": "content max-width: 900px for editorial, 1100px normal, 1400px for wide",
  "contentPadding": "horizontal padding: 0 40px, 0 60px, 0 80px",
  "heroLayout": "centered" | "left-aligned" | "bottom-aligned" | "overlay-full",
  "heroMinHeight": "100vh, 90vh, 85vh, 70vh",
  "heroHeadingSize": "clamp(min, preferred, max) — vary a lot! e.g. clamp(48px,8vw,120px) for bold",
  "heroHeadingWeight": "400 for elegant, 700 normal, 800-900 for bold/impact",
  "heroHeadingLetterSpacing": "-0.06em for tight/impact, -0.02em normal, 0.02em for spaced",
  "heroSubtitleSize": "clamp(14px,1.5vw,18px) to clamp(18px,2.5vw,24px)",
  "buttonRadius": "0px sharp, 8px rounded, 12px more rounded, 100px pill",
  "buttonPadding": "e.g. 14px 32px, 18px 48px, 12px 24px",
  "buttonStyle": "filled" | "outline" | "underline" | "ghost",
  "buttonTextTransform": "none" | "uppercase",
  "buttonLetterSpacing": "0.01em normal, 0.08em for uppercase spaced",
  "cardRadius": "0px sharp, 8px, 12px, 20px rounded",
  "cardBorder": true | false,
  "cardShadow": "none" | "0 4px 20px rgba(0,0,0,0.08)" | "0 1px 3px rgba(0,0,0,0.04)",
  "sectionLabelStyle": "uppercase-small" | "accent-line" | "none" | "large-serif",
  "headingSizeScale": 0.8 to 1.5 — multiplier for all section headings,
  "bodyLineHeight": "1.5 compact, 1.7 normal, 1.9 spacious, 2.0 very airy",
  "gridGap": "16px tight, 24px normal, 40px spacious",
  "useHeroOrbs": true | false — decorative gradient orbs (false for clean/minimal),
  "useHoverEffects": true | false,
  "imageStyle": "full-bleed" | "rounded" | "bordered" | "floating",
  "dividerStyle": "line" | "none" | "gradient" | "thick",
  "customCSS": "any additional CSS rules as a string — for truly unique touches like custom animations, special gradients, unique nav effects, etc. This is your creative freedom — use it."
}

Be CREATIVE and SPECIFIC. The goal is that two different inspiration URLs produce visibly different websites. Don't default to the same safe choices every time.`,
    }],
  });

  try {
    const block = response.content[0];
    const text = block && block.type === 'text' ? block.text.trim() : '{}';
    const jsonText = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(jsonText) as Partial<StyleOverrides>;
    logger.info({ keys: Object.keys(parsed).length }, 'Generated style overrides from inspiration');
    return parsed;
  } catch {
    logger.warn('Failed to parse style overrides — using defaults');
    return {};
  }
}
