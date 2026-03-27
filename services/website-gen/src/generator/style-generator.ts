import Anthropic from '@anthropic-ai/sdk';
import { createLogger } from '@embedo/utils';
import type { StyleOverrides } from '../templates/restaurant/premium.js';

const logger = createLogger('website-gen:style-generator');

/**
 * Uses AI to generate dynamic StyleOverrides based on inspiration site analysis.
 * The `customCSS` field is the PRIMARY output — it's a complete stylesheet that
 * overrides the base template to make every site visually unique.
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
  const client = new Anthropic({ apiKey: anthropicKey });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: `You are a world-class web designer known for creating DISTINCTIVE, memorable websites that avoid generic AI aesthetics. Your job is to generate a COMPLETE custom CSS stylesheet that transforms a base website template into something extraordinary — inspired by the reference sites below but elevated with your own creative choices.

## DESIGN PHILOSOPHY
- Typography: Use distinctive Google Fonts, never generic (Inter, Roboto, Arial). Pick characterful, unexpected pairings.
- Color: Commit to a cohesive palette with dominant colors and sharp accents. Avoid timid, evenly-distributed palettes or cliched purple-gradient-on-white.
- Texture: Create atmosphere with gradient meshes, noise, patterns, layered transparencies, or dramatic shadows. Never flat solid backgrounds.
- Motion: Add CSS animations for scroll reveals, hover states, and ambient background effects. A few well-orchestrated effects over scattered micro-interactions.
- Spatial: Unexpected layouts — asymmetry, overlap, generous negative space. Not everything centered.

## Inspiration Analysis
${params.inspirationStyleNotes || 'No specific inspiration — create a distinctive, high-end design for a ' + params.industryType + '.'}

## Context
- Industry: ${params.industryType}
- Business: ${params.businessName}
- Base color scheme: ${params.colorScheme} (can be overridden in CSS)
- Base font: ${params.fontPairing}
- Has hero image: ${params.hasHeroImage}
- Has many menu items: ${params.hasManyMenuItems}
- Has gallery: ${params.hasGallery}

## Available CSS Classes You Can Target
The website HTML has these semantic classes. Your CSS will be injected AFTER the base styles, so you can override anything:

**Layout:**
- \`.site-nav\` — the navigation bar
- \`.site-logo\` — the business name in nav
- \`.nav-links\` — container for nav links
- \`.nav-link\` — individual nav links
- \`.nav-cta\` — the CTA button in nav

**Hero:**
- \`.hero-section\` — the full hero area (has background-image if hero image exists)
- \`.hero-overlay\` — gradient overlay on hero image
- \`.hero-content\` — the text container inside hero
- \`.hero-tag\` — small cuisine/type label above heading
- \`.hero-heading\` — the main h1
- \`.hero-subtitle\` — the subtitle paragraph
- \`.hero-btns\` — button container
- \`.hero-tagline\` — small tagline at bottom

**Buttons:**
- \`.btn-primary\` — primary CTA buttons
- \`.btn-outline\` — secondary outline buttons

**Sections** (each section has its own id like #about, #menu, #hours, #reserve):
- \`section\` — all content sections
- \`.section-container\` — inner container (not yet used in all sections but available)

**Footer:**
- \`.site-footer\` — footer wrapper
- \`.footer-inner\` — inner container
- \`.footer-brand\` — business name in footer

## Your Task
Return a JSON object with TWO key fields:

1. **Design tokens** (the structural JSON fields) — these control layout, spacing, and hero treatment
2. **customCSS** — THIS IS THE MAIN OUTPUT. Write a comprehensive CSS stylesheet (as a string) that completely reskins the site. This is where the magic happens.

Your customCSS should be AGGRESSIVE and SPECIFIC. Don't write timid CSS. Write CSS that makes this site look like it was custom-designed by an agency, inspired by the reference sites. Override colors, backgrounds, spacing, typography, borders, shadows, animations — everything.

Examples of what good customCSS looks like:

For a warm, photo-heavy Italian restaurant (inspired by fornoshortnorth.com):
\`\`\`css
.site-nav { background: rgba(30,15,5,0.95); border-bottom: 2px solid #e8732a; }
.hero-section { min-height: 85vh; }
.hero-overlay { background: linear-gradient(to bottom, transparent 20%, rgba(20,10,0,0.85) 100%) !important; }
.hero-heading { font-size: clamp(48px,8vw,110px) !important; text-shadow: 0 4px 40px rgba(0,0,0,0.5); }
.btn-primary { background: #e8732a !important; border-radius: 4px !important; text-transform: uppercase; letter-spacing: 0.08em; }
section { border-top: none !important; }
/* Add a warm glow effect */
.hero-section::after { content:''; position:absolute; bottom:0; left:0; right:0; height:200px; background:linear-gradient(to top, #1a0a00, transparent); pointer-events:none; }
\`\`\`

For a minimal, airy brunch spot:
\`\`\`css
body { background: #faf8f5 !important; color: #2a2420 !important; }
.site-nav { background: transparent !important; border-bottom: none !important; }
.hero-section { min-height: 70vh; background-color: #faf8f5 !important; }
.hero-heading { font-weight: 400 !important; letter-spacing: 0.02em !important; }
.btn-primary { background: transparent !important; color: #2a2420 !important; border: 1.5px solid #2a2420 !important; border-radius: 0 !important; }
section { padding: 80px 0 !important; }
\`\`\`

Return ONLY valid JSON:
{
  "heroLayout": "centered" | "left-aligned" | "bottom-aligned" | "overlay-full",
  "heroMinHeight": "e.g. 100vh, 85vh, 70vh",
  "heroHeadingSize": "e.g. clamp(48px,8vw,110px)",
  "heroHeadingWeight": "e.g. 800, 400, 900",
  "heroHeadingLetterSpacing": "e.g. -0.04em",
  "buttonRadius": "e.g. 100px, 4px, 0px",
  "buttonStyle": "filled" | "outline" | "underline",
  "buttonTextTransform": "none" | "uppercase",
  "cardRadius": "e.g. 20px, 8px, 0px",
  "cardBorder": true | false,
  "sectionLabelStyle": "uppercase-small" | "accent-line" | "none",
  "headingSizeScale": 1.0,
  "useHeroOrbs": false,
  "imageStyle": "full-bleed" | "rounded" | "bordered",
  "dividerStyle": "line" | "none" | "thick",
  "customCSS": "YOUR FULL CUSTOM STYLESHEET HERE — make it 30-80 lines of CSS. Override .site-nav, .hero-section, .hero-heading, .btn-primary, section backgrounds, card styles, footer, colors, shadows, borders, typography — EVERYTHING needed to match the inspiration. Use !important where needed to override inline styles on section renderers."
}

CRITICAL: The customCSS field should be SUBSTANTIAL (30-80 lines). A 2-line customCSS means you're not trying hard enough. Study the inspiration description and translate every visual detail into CSS.

ANTI-PATTERNS TO AVOID in your CSS:
- Generic purple-gradient-on-white color schemes
- Inter / Roboto / Arial font imports (use distinctive Google Fonts like Playfair Display, Sora, Space Mono, Cormorant Garant, etc.)
- Flat solid-color section backgrounds (add subtle gradients, textures, or patterns)
- Identical section layouts (vary the visual rhythm)
- Cookie-cutter card grids (try bento layouts, overlapping compositions, or asymmetric arrangements)

Include Google Font @import in your customCSS for the distinctive fonts you choose.`,
    }],
  });

  try {
    const block = response.content[0];
    const text = block && block.type === 'text' ? block.text.trim() : '{}';
    const jsonText = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(jsonText) as Partial<StyleOverrides>;
    const cssLen = (parsed.customCSS ?? '').length;
    logger.info({ keys: Object.keys(parsed).length, customCSSLength: cssLen }, 'Generated style overrides');
    return parsed;
  } catch (err) {
    logger.warn({ error: String(err) }, 'Failed to parse style overrides — using defaults');
    return {};
  }
}
