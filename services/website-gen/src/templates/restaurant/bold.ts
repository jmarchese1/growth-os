/**
 * Bold template — high contrast, large typography, statement design.
 * Uses the same PremiumWebsiteConfig interface.
 */
import type { PremiumWebsiteConfig } from './premium.js';

const COLOR_SCHEMES: Record<string, { bg: string; surface: string; text: string; muted: string; accent: string; accentText: string; border: string }> = {
  midnight: { bg: '#000000', surface: '#0a0a0a', text: '#ffffff', muted: '#777',    accent: '#a855f7', accentText: '#000', border: '#1a1a1a' },
  warm:     { bg: '#0a0400', surface: '#141000', text: '#fff8f0', muted: '#a08060', accent: '#ff8c00', accentText: '#000', border: '#1e1200' },
  forest:   { bg: '#000a00', surface: '#001000', text: '#f0f7f0', muted: '#6a9070', accent: '#00ff6a', accentText: '#000', border: '#0a200a' },
  ocean:    { bg: '#000610', surface: '#000d1e', text: '#f0f6ff', muted: '#607090', accent: '#0088ff', accentText: '#000', border: '#001530' },
  ivory:    { bg: '#ffffff', surface: '#f5f5f0', text: '#000000', muted: '#555',    accent: '#c4960b', accentText: '#fff', border: '#e0e0d8' },
  rose:     { bg: '#0a0004', surface: '#12000a', text: '#fff5f8', muted: '#907080', accent: '#ff1a50', accentText: '#fff', border: '#200810' },
};

const FONT_PAIRINGS: Record<string, { heading: string; body: string; googleFont?: string }> = {
  modern:    { heading: "'Inter', sans-serif",        body: "'Inter', sans-serif" },
  classic:   { heading: "'Georgia', serif",           body: "'Georgia', serif" },
  minimal:   { heading: "system-ui, sans-serif",      body: "system-ui, sans-serif" },
  elegant:   { heading: "'Playfair Display', serif",  body: "'Lato', sans-serif",    googleFont: 'Playfair+Display:wght@400;700;900&family=Lato:wght@300;400;700' },
  luxury:    { heading: "'Cormorant Garamond', serif", body: "'Cormorant', serif",    googleFont: 'Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400' },
  editorial: { heading: "'DM Serif Display', serif",  body: "'DM Sans', sans-serif",  googleFont: 'DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500' },
  tech:      { heading: "'Space Grotesk', sans-serif", body: "'Space Grotesk', sans-serif", googleFont: 'Space+Grotesk:wght@300;400;500;600;700' },
  literary:  { heading: "'Libre Baskerville', serif", body: "'Libre Baskerville', serif", googleFont: 'Libre+Baskerville:ital,wght@0,400;0,700;1,400' },
};

export function renderBoldTemplate(config: PremiumWebsiteConfig): string {
  const c = COLOR_SCHEMES[config.colorScheme] ?? COLOR_SCHEMES['midnight']!;
  const f = FONT_PAIRINGS[config.fontPairing] ?? FONT_PAIRINGS['modern']!;
  const gf = f.googleFont ? `<link href="https://fonts.googleapis.com/css2?family=${f.googleFont}&display=swap" rel="stylesheet">` : '';

  const menuHtml = config.menuItems?.slice(0, 8).map(item => `
    <div style="padding:24px 0;border-bottom:1px solid ${c.border};">
      <div style="display:flex;justify-content:space-between;align-items:baseline;">
        <span style="font-family:${f.heading};font-size:22px;font-weight:700;color:${c.text};">${item.name}</span>
        ${item.price ? `<span style="font-size:18px;font-weight:700;color:${c.accent};">${item.price}</span>` : ''}
      </div>
      ${item.description ? `<p style="font-size:15px;color:${c.muted};margin-top:6px;">${item.description}</p>` : ''}
    </div>`).join('') ?? '';

  const hoursHtml = config.hours ? Object.entries(config.hours).map(([day, time]) => `
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid ${c.border};">
      <span style="color:${c.muted};font-size:16px;">${day}</span>
      <span style="color:${c.text};font-size:16px;font-weight:600;">${time}</span>
    </div>`).join('') : '';

  return `<!DOCTYPE html>
<html lang="en"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${config.businessName}</title>
  <meta name="description" content="${config.description ?? config.businessName}">
  ${gf}
  <style>
    *{margin:0;padding:0;box-sizing:border-box}html{scroll-behavior:smooth}
    body{font-family:${f.body};background:${c.bg};color:${c.text};-webkit-font-smoothing:antialiased}
    a{color:inherit;text-decoration:none}img{max-width:100%;display:block}
    @media(max-width:768px){.hide-mobile{display:none!important}.hero-heading{font-size:15vw!important}}
  </style>
</head><body>

<!-- NAV -->
<nav style="position:fixed;top:0;left:0;right:0;z-index:100;padding:0 48px;height:72px;display:flex;align-items:center;justify-content:space-between;background:transparent;">
  <a href="/" style="font-family:${f.heading};font-size:24px;font-weight:900;color:${c.text};letter-spacing:-0.04em;">${config.businessName}</a>
  ${config.phone ? `<a href="tel:${config.phone}" style="font-size:14px;font-weight:600;color:${c.accent};">${config.phone}</a>` : ''}
</nav>

<!-- HERO -->
<section style="min-height:100vh;display:flex;flex-direction:column;justify-content:flex-end;padding:0 48px 80px;position:relative;overflow:hidden;${config.heroImage ? `background:url('${config.heroImage}') center/cover;` : `background:${c.bg};`}">
  ${config.heroImage ? `<div style="position:absolute;inset:0;background:linear-gradient(to top,${c.bg},${c.bg}40,transparent);"></div>` : ''}
  <div style="position:relative;z-index:1;max-width:1200px;">
    ${config.cuisine ? `<p style="font-size:13px;letter-spacing:0.3em;text-transform:uppercase;color:${c.accent};font-weight:700;margin-bottom:20px;">${config.cuisine}</p>` : ''}
    <h1 class="hero-heading" style="font-family:${f.heading};font-size:clamp(64px,10vw,160px);font-weight:900;line-height:0.92;letter-spacing:-0.06em;color:${c.text};margin-bottom:24px;">${config.heroHeading}</h1>
    <p style="font-size:clamp(18px,2.5vw,26px);color:${c.muted};max-width:600px;line-height:1.5;margin-bottom:40px;">${config.heroSubheading}</p>
    ${config.bookingUrl ? `<a href="${config.bookingUrl}" style="display:inline-block;padding:18px 48px;background:${c.accent};color:${c.accentText};font-family:${f.heading};font-size:17px;font-weight:700;border-radius:0;letter-spacing:0.05em;text-transform:uppercase;">${config.ctaText}</a>` : ''}
  </div>
</section>

<!-- ABOUT -->
<section style="padding:120px 48px;max-width:900px;">
  <h2 style="font-family:${f.heading};font-size:clamp(36px,5vw,72px);font-weight:900;letter-spacing:-0.04em;line-height:1.05;margin-bottom:32px;">${config.aboutHeading}</h2>
  <p style="font-size:20px;color:${c.muted};line-height:1.8;">${config.aboutBody}</p>
</section>

${menuHtml ? `
<!-- MENU -->
<section style="padding:100px 48px;max-width:800px;">
  <p style="font-size:12px;letter-spacing:0.3em;text-transform:uppercase;color:${c.accent};font-weight:700;margin-bottom:16px;">MENU</p>
  <h2 style="font-family:${f.heading};font-size:clamp(32px,4vw,56px);font-weight:900;letter-spacing:-0.03em;margin-bottom:40px;">Our Selection</h2>
  ${menuHtml}
</section>` : ''}

${hoursHtml ? `
<!-- HOURS -->
<section style="padding:100px 48px;max-width:600px;">
  <p style="font-size:12px;letter-spacing:0.3em;text-transform:uppercase;color:${c.accent};font-weight:700;margin-bottom:16px;">HOURS</p>
  <h2 style="font-family:${f.heading};font-size:clamp(32px,4vw,56px);font-weight:900;letter-spacing:-0.03em;margin-bottom:40px;">When We're Open</h2>
  ${hoursHtml}
  ${config.address ? `<p style="margin-top:32px;font-size:18px;color:${c.muted};">${config.address}</p>` : ''}
</section>` : ''}

<!-- FOOTER -->
<footer style="padding:80px 48px;border-top:1px solid ${c.border};">
  <p style="font-family:${f.heading};font-size:32px;font-weight:900;letter-spacing:-0.03em;margin-bottom:8px;">${config.businessName}</p>
  ${config.tagline ? `<p style="font-size:15px;color:${c.muted};">${config.tagline}</p>` : ''}
  <p style="font-size:12px;color:${c.muted};margin-top:24px;">&copy; ${new Date().getFullYear()} ${config.businessName}. Powered by <a href="https://embedo.io" style="color:${c.accent};">Embedo</a></p>
</footer>

</body></html>`;
}
