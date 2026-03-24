/**
 * Editorial template — magazine-style layout with visual storytelling.
 * Uses the same PremiumWebsiteConfig interface.
 */
import type { PremiumWebsiteConfig } from './premium.js';

const COLOR_SCHEMES: Record<string, { bg: string; surface: string; text: string; muted: string; accent: string; border: string }> = {
  midnight: { bg: '#0c0c10', surface: '#16161c', text: '#f0efe8', muted: '#8a8880', accent: '#c8a870', border: '#242428' },
  warm:     { bg: '#faf6f0', surface: '#ffffff', text: '#2a1f10', muted: '#8a7a60', accent: '#c8860b', border: '#e8e0d0' },
  forest:   { bg: '#f4f5f0', surface: '#ffffff', text: '#1a2418', muted: '#6a7860', accent: '#4a6840', border: '#d4d9c8' },
  ocean:    { bg: '#f0f4f8', surface: '#ffffff', text: '#0a1a2a', muted: '#5a7090', accent: '#2a6090', border: '#d0d8e0' },
  ivory:    { bg: '#fafaf5', surface: '#ffffff', text: '#1a1a15', muted: '#777770', accent: '#9a8060', border: '#e8e8e0' },
  rose:     { bg: '#faf5f7', surface: '#ffffff', text: '#2a1018', muted: '#907078', accent: '#b0405a', border: '#e8d8dc' },
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

export function renderEditorialTemplate(config: PremiumWebsiteConfig): string {
  const c = COLOR_SCHEMES[config.colorScheme] ?? COLOR_SCHEMES['ivory']!;
  const f = FONT_PAIRINGS[config.fontPairing] ?? FONT_PAIRINGS['editorial']!;
  const gf = f.googleFont ? `<link href="https://fonts.googleapis.com/css2?family=${f.googleFont}&display=swap" rel="stylesheet">` : '';

  const features = config.features?.slice(0, 3) ?? [];
  const testimonials = config.testimonials?.slice(0, 2) ?? [];

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
    .editorial-grid{display:grid;grid-template-columns:1fr 1fr;gap:0}
    @media(max-width:768px){.editorial-grid{grid-template-columns:1fr}.hide-mobile{display:none!important}}
  </style>
</head><body>

<!-- NAV -->
<nav style="padding:24px 48px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid ${c.border};">
  <a href="/" style="font-family:${f.heading};font-size:22px;font-weight:700;color:${c.text};letter-spacing:-0.02em;">${config.businessName}</a>
  <div style="display:flex;align-items:center;gap:32px;font-size:13px;color:${c.muted};" class="hide-mobile">
    <a href="#story">Story</a>
    ${config.menuItems?.length ? '<a href="#menu">Menu</a>' : ''}
    <a href="#visit">Visit</a>
    ${config.bookingUrl ? `<a href="${config.bookingUrl}" style="padding:8px 20px;border:1px solid ${c.text};border-radius:100px;color:${c.text};font-weight:500;">${config.ctaText}</a>` : ''}
  </div>
</nav>

<!-- HERO — editorial split -->
<div class="editorial-grid">
  ${config.heroImage ? `<div style="min-height:90vh;background:url('${config.heroImage}') center/cover;"></div>` : `<div style="min-height:90vh;background:${c.accent}15;"></div>`}
  <div style="display:flex;flex-direction:column;justify-content:center;padding:80px 60px;">
    ${config.cuisine ? `<p style="font-size:11px;letter-spacing:0.25em;text-transform:uppercase;color:${c.accent};font-weight:600;margin-bottom:20px;">${config.cuisine}</p>` : ''}
    <h1 style="font-family:${f.heading};font-size:clamp(32px,4vw,64px);font-weight:700;line-height:1.1;letter-spacing:-0.03em;margin-bottom:24px;">${config.heroHeading}</h1>
    <p style="font-size:18px;color:${c.muted};line-height:1.7;margin-bottom:32px;max-width:440px;">${config.heroSubheading}</p>
    ${config.bookingUrl ? `<a href="${config.bookingUrl}" style="display:inline-block;padding:14px 32px;background:${c.accent};color:#fff;font-family:${f.heading};font-size:15px;font-weight:600;border-radius:100px;align-self:flex-start;">${config.ctaText}</a>` : ''}
  </div>
</div>

<!-- STORY -->
<section id="story" style="padding:120px 48px;">
  <div style="max-width:680px;margin:0 auto;">
    <p style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:${c.accent};font-weight:600;margin-bottom:16px;">OUR STORY</p>
    <h2 style="font-family:${f.heading};font-size:clamp(28px,3.5vw,48px);font-weight:700;line-height:1.15;letter-spacing:-0.02em;margin-bottom:28px;">${config.aboutHeading}</h2>
    <p style="font-size:18px;color:${c.muted};line-height:1.9;">${config.aboutBody}</p>
  </div>
</section>

${features.length > 0 ? `
<!-- FEATURES — editorial cards -->
<section style="padding:80px 48px;background:${c.surface};border-top:1px solid ${c.border};border-bottom:1px solid ${c.border};">
  <div style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:48px;">
    ${features.map(feat => `
    <div>
      <h3 style="font-family:${f.heading};font-size:22px;font-weight:700;margin-bottom:12px;">${feat.title}</h3>
      <p style="font-size:15px;color:${c.muted};line-height:1.7;">${feat.description}</p>
    </div>`).join('')}
  </div>
</section>` : ''}

${config.menuItems?.length ? `
<!-- MENU — editorial list -->
<section id="menu" style="padding:100px 48px;">
  <div style="max-width:700px;margin:0 auto;">
    <p style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:${c.accent};font-weight:600;margin-bottom:16px;">THE MENU</p>
    <h2 style="font-family:${f.heading};font-size:clamp(28px,3.5vw,48px);font-weight:700;letter-spacing:-0.02em;margin-bottom:48px;">Our Selection</h2>
    ${config.menuItems.slice(0, 10).map(item => `
    <div style="padding:20px 0;border-bottom:1px solid ${c.border};display:flex;justify-content:space-between;align-items:baseline;">
      <div><span style="font-family:${f.heading};font-size:18px;font-weight:600;">${item.name}</span>${item.description ? `<p style="font-size:14px;color:${c.muted};margin-top:4px;">${item.description}</p>` : ''}</div>
      ${item.price ? `<span style="font-size:16px;font-weight:600;color:${c.accent};white-space:nowrap;margin-left:24px;">${item.price}</span>` : ''}
    </div>`).join('')}
  </div>
</section>` : ''}

${config.galleryImages?.length ? `
<!-- GALLERY — editorial masonry -->
<section style="padding:0;">
  <div style="display:grid;grid-template-columns:repeat(${Math.min(config.galleryImages.length, 3)},1fr);gap:2px;">
    ${config.galleryImages.slice(0, 6).map(src => `<div style="aspect-ratio:4/3;overflow:hidden;"><img src="${src}" alt="Gallery" loading="lazy" style="width:100%;height:100%;object-fit:cover;transition:transform 0.5s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" /></div>`).join('')}
  </div>
</section>` : ''}

${testimonials.length > 0 ? `
<!-- TESTIMONIALS -->
<section style="padding:100px 48px;background:${c.surface};border-top:1px solid ${c.border};">
  <div style="max-width:700px;margin:0 auto;">
    ${testimonials.map(t => `
    <blockquote style="margin-bottom:48px;">
      <p style="font-family:${f.heading};font-size:clamp(20px,2.5vw,28px);font-weight:400;font-style:italic;line-height:1.6;color:${c.text};margin-bottom:16px;">"${t.quote}"</p>
      <cite style="font-size:14px;color:${c.muted};font-style:normal;">— ${t.author}, ${t.detail}</cite>
    </blockquote>`).join('')}
  </div>
</section>` : ''}

<!-- VISIT -->
<section id="visit" style="padding:100px 48px;">
  <div style="max-width:600px;margin:0 auto;text-align:center;">
    <p style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:${c.accent};font-weight:600;margin-bottom:16px;">VISIT US</p>
    <h2 style="font-family:${f.heading};font-size:clamp(28px,3.5vw,48px);font-weight:700;letter-spacing:-0.02em;margin-bottom:32px;">Hours & Location</h2>
    ${config.hours ? Object.entries(config.hours).map(([day, time]) => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid ${c.border};font-size:15px;"><span style="color:${c.muted}">${day}</span><span>${time}</span></div>`).join('') : ''}
    ${config.address ? `<p style="margin-top:28px;font-size:17px;color:${c.muted};">${config.address}${config.city ? `, ${config.city}` : ''}</p>` : ''}
    ${config.phone ? `<p style="margin-top:12px;"><a href="tel:${config.phone}" style="font-size:20px;font-weight:600;color:${c.accent};">${config.phone}</a></p>` : ''}
  </div>
</section>

<!-- FOOTER -->
<footer style="padding:48px;text-align:center;border-top:1px solid ${c.border};">
  <p style="font-family:${f.heading};font-size:18px;font-weight:700;margin-bottom:4px;">${config.businessName}</p>
  ${config.tagline ? `<p style="font-size:13px;color:${c.muted};">${config.tagline}</p>` : ''}
  <p style="font-size:11px;color:${c.muted};margin-top:20px;">&copy; ${new Date().getFullYear()} ${config.businessName}. Powered by <a href="https://embedo.io" style="color:${c.accent};">Embedo</a></p>
</footer>

${config.chatbotEnabled && config.chatbotBusinessId ? `
<script>
  window.EmbledoChatConfig = {
    businessId: "${config.chatbotBusinessId}",
    primaryColor: "${c.accent}",
    businessName: "${config.businessName}",
    welcomeMessage: "Hi! How can I help you today?"
  };
</script>
<script src="${config.chatbotApiUrl ?? 'https://chat.embedo.ai'}/widget.js" async></script>` : ''}

</body></html>`;
}
