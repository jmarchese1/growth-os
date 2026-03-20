import { createLogger } from '@embedo/utils';

const logger = createLogger('website-gen:inspiration');

export interface DesignTokens {
  // Colors
  colors: string[];           // All unique color values found
  backgroundColor: string;    // Primary background color
  textColor: string;          // Primary text color
  accentColors: string[];     // Button/link/accent colors
  // Typography
  fontFamilies: string[];     // Font families used
  fontSizes: string[];        // Font size values
  headingWeight: string;      // Most common heading weight
  // Layout
  maxWidth: string;           // Content max-width
  sectionPadding: string[];   // Section padding values
  gridPatterns: string[];     // Grid column patterns found
  // Components
  borderRadius: string[];     // Border radius values
  shadows: string[];          // Box shadow values
  // Mood
  isDark: boolean;            // Dark or light theme
  hasHeroImage: boolean;      // Whether hero has a background image
  layoutStyle: string;        // 'centered' | 'left-aligned' | 'asymmetric' | 'grid-heavy'
}

/**
 * Extract meaningful design tokens from raw HTML/CSS source.
 * Returns a concise, structured analysis instead of a raw CSS dump.
 */
export function extractDesignTokens(rawHtml: string): DesignTokens {
  const tokens: DesignTokens = {
    colors: [],
    backgroundColor: '',
    textColor: '',
    accentColors: [],
    fontFamilies: [],
    fontSizes: [],
    headingWeight: '700',
    maxWidth: '1200px',
    sectionPadding: [],
    gridPatterns: [],
    borderRadius: [],
    shadows: [],
    isDark: false,
    hasHeroImage: false,
    layoutStyle: 'centered',
  };

  // Extract colors (hex, rgb, hsl)
  const colorMatches = rawHtml.match(/#[0-9a-fA-F]{3,8}|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)/g) ?? [];
  tokens.colors = [...new Set(colorMatches)].slice(0, 20);

  // Detect background color from body or root
  const bodyBg = rawHtml.match(/body\s*\{[^}]*background(?:-color)?:\s*([^;}\s]+)/i);
  if (bodyBg?.[1]) tokens.backgroundColor = bodyBg[1];

  // Detect text color
  const bodyColor = rawHtml.match(/body\s*\{[^}]*(?:^|;)\s*color:\s*([^;}\s]+)/i);
  if (bodyColor?.[1]) tokens.textColor = bodyColor[1];

  // Detect dark vs light
  const bg = tokens.backgroundColor.toLowerCase();
  tokens.isDark = bg.startsWith('#0') || bg.startsWith('#1') || bg.startsWith('#2') ||
    bg.includes('rgb(0') || bg.includes('rgb(1') || bg.includes('rgb(2') ||
    bg === 'black' || bg === '#000';

  // Extract font families
  const fontMatches = rawHtml.match(/font-family:\s*([^;}"]+)/gi) ?? [];
  const fonts = fontMatches.map(f => f.replace(/font-family:\s*/i, '').trim());
  tokens.fontFamilies = [...new Set(fonts)].slice(0, 5);

  // Extract Google Fonts from link tags
  const googleFonts = rawHtml.match(/fonts\.googleapis\.com\/css2?\?family=([^"&]+)/gi) ?? [];
  for (const gf of googleFonts) {
    const families = gf.match(/family=([^&"]+)/)?.[1]?.split('&family=') ?? [];
    for (const fam of families) {
      const name = decodeURIComponent(fam.split(':')[0] ?? '').replace(/\+/g, ' ');
      if (name && !tokens.fontFamilies.includes(name)) tokens.fontFamilies.push(name);
    }
  }

  // Extract font sizes
  const sizeMatches = rawHtml.match(/font-size:\s*([^;}"]+)/gi) ?? [];
  tokens.fontSizes = [...new Set(sizeMatches.map(s => s.replace(/font-size:\s*/i, '').trim()))].slice(0, 10);

  // Extract heading weight
  const weightMatches = rawHtml.match(/(?:h[1-3]|\.heading|\.title)[^{]*\{[^}]*font-weight:\s*(\d+)/gi) ?? [];
  if (weightMatches.length > 0) {
    const weights = weightMatches.map(w => w.match(/font-weight:\s*(\d+)/)?.[1]).filter(Boolean);
    if (weights.length > 0) tokens.headingWeight = weights[0]!;
  }

  // Extract max-width
  const maxWidths = rawHtml.match(/max-width:\s*(\d+(?:px|rem|em))/gi) ?? [];
  const widths = maxWidths.map(m => m.replace(/max-width:\s*/i, ''));
  if (widths.length > 0) tokens.maxWidth = widths[0]!;

  // Extract section padding
  const paddings = rawHtml.match(/padding:\s*(\d+px(?:\s+\d+px)*)/gi) ?? [];
  tokens.sectionPadding = [...new Set(paddings.map(p => p.replace(/padding:\s*/i, '')))].slice(0, 5);

  // Extract grid patterns
  const gridCols = rawHtml.match(/grid-template-columns:\s*([^;}"]+)/gi) ?? [];
  tokens.gridPatterns = [...new Set(gridCols.map(g => g.replace(/grid-template-columns:\s*/i, '').trim()))].slice(0, 5);

  // Extract border radius
  const radiusMatches = rawHtml.match(/border-radius:\s*([^;}"]+)/gi) ?? [];
  tokens.borderRadius = [...new Set(radiusMatches.map(r => r.replace(/border-radius:\s*/i, '').trim()))].slice(0, 5);

  // Extract box shadows
  const shadowMatches = rawHtml.match(/box-shadow:\s*([^;}"]+)/gi) ?? [];
  tokens.shadows = [...new Set(shadowMatches.map(s => s.replace(/box-shadow:\s*/i, '').trim()))].filter(s => s !== 'none').slice(0, 3);

  // Detect hero image
  tokens.hasHeroImage = /hero[^{]*\{[^}]*(?:background-image|background:.*url)/i.test(rawHtml) ||
    /\.hero[^{]*\{[^}]*url\(/i.test(rawHtml);

  // Detect layout style
  const gridCount = (rawHtml.match(/display:\s*grid/gi) ?? []).length;
  const textCenter = (rawHtml.match(/text-align:\s*center/gi) ?? []).length;
  const textLeft = (rawHtml.match(/text-align:\s*left/gi) ?? []).length;

  if (gridCount > 5) tokens.layoutStyle = 'grid-heavy';
  else if (textCenter > textLeft * 2) tokens.layoutStyle = 'centered';
  else if (textLeft > textCenter) tokens.layoutStyle = 'left-aligned';
  else tokens.layoutStyle = 'asymmetric';

  // Detect accent colors (from buttons, links, active states)
  const accentPatterns = rawHtml.match(/(?:\.btn|\.button|a:hover|\.cta|\.accent)[^{]*\{[^}]*(?:background|color|border-color):\s*([^;}\s]+)/gi) ?? [];
  const accents = accentPatterns.map(p => {
    const color = p.match(/#[0-9a-fA-F]{3,8}|rgb\([^)]+\)/)?.[0];
    return color;
  }).filter((c): c is string => !!c);
  tokens.accentColors = [...new Set(accents)].slice(0, 3);

  logger.info({
    colors: tokens.colors.length,
    fonts: tokens.fontFamilies.length,
    isDark: tokens.isDark,
    layout: tokens.layoutStyle,
  }, 'Design tokens extracted');

  return tokens;
}

/**
 * Format design tokens as a concise string for the AI prompt.
 * Much more useful than a raw CSS dump.
 */
export function formatDesignTokens(tokens: DesignTokens): string {
  const lines: string[] = [
    `## Design DNA`,
    `Theme: ${tokens.isDark ? 'DARK' : 'LIGHT'} background`,
    `Layout: ${tokens.layoutStyle}`,
  ];

  if (tokens.backgroundColor) lines.push(`Background: ${tokens.backgroundColor}`);
  if (tokens.textColor) lines.push(`Text color: ${tokens.textColor}`);
  if (tokens.accentColors.length) lines.push(`Accent colors: ${tokens.accentColors.join(', ')}`);
  if (tokens.colors.length > 3) lines.push(`Color palette: ${tokens.colors.slice(0, 10).join(', ')}`);
  if (tokens.fontFamilies.length) lines.push(`Fonts: ${tokens.fontFamilies.join(', ')}`);
  if (tokens.headingWeight) lines.push(`Heading weight: ${tokens.headingWeight}`);
  if (tokens.fontSizes.length) lines.push(`Font sizes: ${tokens.fontSizes.join(', ')}`);
  if (tokens.maxWidth) lines.push(`Max width: ${tokens.maxWidth}`);
  if (tokens.sectionPadding.length) lines.push(`Section padding: ${tokens.sectionPadding.join(', ')}`);
  if (tokens.borderRadius.length) lines.push(`Border radius: ${tokens.borderRadius.join(', ')}`);
  if (tokens.shadows.length) lines.push(`Shadows: ${tokens.shadows.join(' | ')}`);
  if (tokens.gridPatterns.length) lines.push(`Grid patterns: ${tokens.gridPatterns.join(', ')}`);
  lines.push(`Hero has image: ${tokens.hasHeroImage}`);

  return lines.join('\n');
}
