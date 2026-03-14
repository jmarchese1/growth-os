export interface PremiumWebsiteConfig {
  businessName: string;
  tagline?: string;
  description?: string;
  cuisine?: string;
  phone?: string;
  address?: string;
  city?: string;
  hours?: Record<string, string>;
  menuItems?: Array<{ name: string; description?: string; price?: string; category?: string }>;
  galleryImages?: string[];
  heroImage?: string;
  logoUrl?: string;
  bookingUrl?: string;
  // Customization
  colorScheme: ColorScheme;
  fontPairing: FontPairing;
  // AI-generated copy
  heroHeading: string;
  heroSubheading: string;
  aboutHeading: string;
  aboutBody: string;
  ctaText: string;
  // Integrations
  chatbotEnabled: boolean;
  chatbotBusinessId?: string;
  chatbotApiUrl?: string;
}

export type ColorScheme = 'midnight' | 'warm' | 'forest' | 'ocean' | 'ivory' | 'rose';
export type FontPairing = 'modern' | 'classic' | 'minimal' | 'elegant';

const COLOR_SCHEMES: Record<ColorScheme, { bg: string; surface: string; text: string; muted: string; accent: string; accentText: string; border: string }> = {
  midnight: { bg: '#0a0a0a', surface: '#141414', text: '#f5f5f5', muted: '#888', accent: '#a855f7', accentText: '#fff', border: '#222' },
  warm:     { bg: '#120800', surface: '#1e1000', text: '#fff8f0', muted: '#a08060', accent: '#f97316', accentText: '#fff', border: '#2a1800' },
  forest:   { bg: '#0a1a0a', surface: '#0f2010', text: '#f0f7f0', muted: '#6a9070', accent: '#22c55e', accentText: '#fff', border: '#1a3020' },
  ocean:    { bg: '#06101a', surface: '#0d1e2e', text: '#f0f6ff', muted: '#607090', accent: '#3b82f6', accentText: '#fff', border: '#152030' },
  ivory:    { bg: '#fafaf8', surface: '#ffffff', text: '#1a1a1a', muted: '#777', accent: '#b8860b', accentText: '#fff', border: '#e8e8e4' },
  rose:     { bg: '#12060a', surface: '#1e0d13', text: '#fff5f8', muted: '#907080', accent: '#e11d48', accentText: '#fff', border: '#2a1020' },
};

const FONT_PAIRINGS: Record<FontPairing, { heading: string; body: string; googleFont?: string }> = {
  modern:  { heading: "'Inter', sans-serif", body: "'Inter', sans-serif" },
  classic: { heading: "'Georgia', serif", body: "'Georgia', serif" },
  minimal: { heading: "system-ui, -apple-system, sans-serif", body: "system-ui, -apple-system, sans-serif" },
  elegant: { heading: "'Playfair Display', serif", body: "'Lato', sans-serif", googleFont: 'Playfair+Display:wght@400;700;900&family=Lato:wght@300;400;700' },
};

type Colors = typeof COLOR_SCHEMES[ColorScheme];
type Fonts = typeof FONT_PAIRINGS[FontPairing];

function hoursTable(hours?: Record<string, string>, colors?: Colors): string {
  if (!hours || Object.keys(hours).length === 0) return '';
  const c = colors!;
  const rows = Object.entries(hours).map(([day, time]) => `
    <tr>
      <td style="padding:8px 0;color:${c.muted};font-size:14px;padding-right:24px;">${day}</td>
      <td style="padding:8px 0;color:${c.text};font-size:14px;font-weight:500;">${time}</td>
    </tr>`).join('');
  return `<table style="border-collapse:collapse;width:100%;">${rows}</table>`;
}

function menuSection(items?: PremiumWebsiteConfig['menuItems'], c?: Colors, fonts?: Fonts): string {
  if (!items || items.length === 0) return '';
  const grouped: Record<string, typeof items> = {};
  for (const item of items) {
    const cat = item.category ?? 'Featured';
    grouped[cat] = grouped[cat] ?? [];
    grouped[cat].push(item);
  }
  const sections = Object.entries(grouped).map(([cat, catItems]) => `
    <div style="margin-bottom:40px;">
      <p style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:${c!.accent};font-weight:600;margin-bottom:20px;">${cat}</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;">
        ${catItems.map((item) => `
          <div style="background:${c!.surface};border:1px solid ${c!.border};border-radius:12px;padding:20px;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
              <span style="font-family:${fonts!.heading};font-size:16px;font-weight:600;color:${c!.text};">${item.name}</span>
              ${item.price ? `<span style="font-size:14px;font-weight:700;color:${c!.accent};margin-left:12px;white-space:nowrap;">${item.price}</span>` : ''}
            </div>
            ${item.description ? `<p style="font-size:13px;color:${c!.muted};line-height:1.5;margin:0;">${item.description}</p>` : ''}
          </div>`).join('')}
      </div>
    </div>`).join('');
  return `
  <section id="menu" style="padding:100px 0;background:${c!.bg};">
    <div style="max-width:1100px;margin:0 auto;padding:0 40px;">
      <p style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${c!.accent};font-weight:600;margin-bottom:12px;text-align:center;">MENU</p>
      <h2 style="font-family:${fonts!.heading};font-size:clamp(32px,4vw,52px);font-weight:700;color:${c!.text};text-align:center;margin:0 0 60px;">What We Serve</h2>
      ${sections}
    </div>
  </section>`;
}

function gallerySection(images?: string[], c?: Colors): string {
  if (!images || images.length < 2) return '';
  const imgs = images.slice(0, 6);
  return `
  <section style="padding:0;background:${c!.bg};">
    <div style="display:grid;grid-template-columns:repeat(${Math.min(imgs.length, 3)},1fr);gap:4px;">
      ${imgs.map((src) => `<div style="aspect-ratio:1;overflow:hidden;"><img src="${src}" alt="Gallery" loading="lazy" style="width:100%;height:100%;object-fit:cover;transition:transform 0.4s ease;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" /></div>`).join('')}
    </div>
  </section>`;
}

export function renderRestaurantPremium(config: PremiumWebsiteConfig): string {
  const c = COLOR_SCHEMES[config.colorScheme];
  const f = FONT_PAIRINGS[config.fontPairing];
  const googleFontUrl = f.googleFont
    ? `<link href="https://fonts.googleapis.com/css2?family=${f.googleFont}&display=swap" rel="stylesheet">`
    : '';

  const hasHeroImage = !!config.heroImage;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${config.businessName}${config.city ? ` — ${config.city}` : ''}</title>
  <meta name="description" content="${config.description ?? config.tagline ?? config.businessName}">
  <meta property="og:title" content="${config.businessName}">
  <meta property="og:description" content="${config.description ?? ''}">
  ${config.heroImage ? `<meta property="og:image" content="${config.heroImage}">` : ''}
  ${googleFontUrl}
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html{scroll-behavior:smooth;}
    body{font-family:${f.body};background:${c.bg};color:${c.text};-webkit-font-smoothing:antialiased;}
    a{color:inherit;text-decoration:none;}
    img{max-width:100%;display:block;}
    .nav-link{font-size:14px;font-weight:500;color:${c.muted};transition:color 0.2s;letter-spacing:0.02em;}
    .nav-link:hover{color:${c.text};}
    .btn-primary{display:inline-flex;align-items:center;justify-content:center;padding:14px 32px;background:${c.accent};color:${c.accentText};font-family:${f.heading};font-size:15px;font-weight:600;border-radius:100px;transition:opacity 0.2s,transform 0.15s;cursor:pointer;border:none;letter-spacing:0.01em;}
    .btn-primary:hover{opacity:0.88;transform:translateY(-1px);}
    .btn-outline{display:inline-flex;align-items:center;justify-content:center;padding:13px 28px;background:transparent;color:${c.text};font-family:${f.heading};font-size:15px;font-weight:500;border-radius:100px;border:1.5px solid ${c.border};transition:border-color 0.2s,background 0.2s;cursor:pointer;letter-spacing:0.01em;}
    .btn-outline:hover{border-color:${c.text};background:${c.surface};}
    @media(max-width:768px){
      .nav-links{display:none!important;}
      .hero-btns{flex-direction:column!important;gap:12px!important;}
      .info-grid{grid-template-columns:1fr!important;}
    }
  </style>
</head>
<body>

<!-- NAV -->
<nav style="position:fixed;top:0;left:0;right:0;z-index:100;padding:0 40px;height:64px;display:flex;align-items:center;justify-content:space-between;background:${c.bg}dd;backdrop-filter:blur(12px);border-bottom:1px solid ${c.border}40;">
  <a href="/" style="font-family:${f.heading};font-size:18px;font-weight:700;color:${c.text};letter-spacing:-0.02em;">${config.businessName}</a>
  <div class="nav-links" style="display:flex;align-items:center;gap:32px;">
    <a href="#about" class="nav-link">About</a>
    ${config.menuItems && config.menuItems.length > 0 ? `<a href="#menu" class="nav-link">Menu</a>` : ''}
    <a href="#hours" class="nav-link">Hours</a>
    ${config.bookingUrl ? `<a href="#reserve" class="nav-link">Reserve</a>` : ''}
  </div>
  ${config.phone ? `<a href="tel:${config.phone}" class="btn-primary" style="padding:10px 22px;font-size:14px;">${config.phone}</a>` : config.bookingUrl ? `<a href="${config.bookingUrl}" target="_blank" class="btn-primary" style="padding:10px 22px;font-size:14px;">Reserve a Table</a>` : ''}
</nav>

<!-- HERO -->
<section style="min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:120px 40px 80px;position:relative;overflow:hidden;
  ${hasHeroImage ? `background:url('${config.heroImage}') center/cover no-repeat;` : `background:${c.bg};`}">
  ${hasHeroImage ? `<div style="position:absolute;inset:0;background:linear-gradient(to bottom,${c.bg}99,${c.bg}cc,${c.bg});"></div>` : ''}
  <div style="position:relative;z-index:1;max-width:800px;">
    ${config.cuisine ? `<p style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:${c.accent};font-weight:600;margin-bottom:20px;">${config.cuisine}</p>` : ''}
    <h1 style="font-family:${f.heading};font-size:clamp(42px,6vw,88px);font-weight:800;line-height:1.05;letter-spacing:-0.03em;color:${c.text};margin-bottom:24px;">${config.heroHeading}</h1>
    <p style="font-size:clamp(16px,2vw,20px);color:${c.muted};line-height:1.6;max-width:560px;margin:0 auto 40px;">${config.heroSubheading}</p>
    <div class="hero-btns" style="display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap;">
      ${config.bookingUrl ? `<a href="${config.bookingUrl}" target="_blank" class="btn-primary">${config.ctaText}</a>` : config.phone ? `<a href="tel:${config.phone}" class="btn-primary">${config.ctaText}</a>` : `<a href="#about" class="btn-primary">${config.ctaText}</a>`}
      <a href="#about" class="btn-outline">Learn More</a>
    </div>
  </div>
  <!-- Scroll indicator -->
  <div style="position:absolute;bottom:32px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:6px;">
    <span style="font-size:11px;letter-spacing:0.12em;color:${c.muted};text-transform:uppercase;">Scroll</span>
    <div style="width:1px;height:32px;background:linear-gradient(to bottom,${c.muted},transparent);"></div>
  </div>
</section>

<!-- ABOUT -->
<section id="about" style="padding:100px 0;background:${c.surface};border-top:1px solid ${c.border};border-bottom:1px solid ${c.border};">
  <div style="max-width:1100px;margin:0 auto;padding:0 40px;display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center;">
    <div>
      <p style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${c.accent};font-weight:600;margin-bottom:16px;">OUR STORY</p>
      <h2 style="font-family:${f.heading};font-size:clamp(28px,3.5vw,48px);font-weight:700;color:${c.text};line-height:1.15;letter-spacing:-0.02em;margin-bottom:24px;">${config.aboutHeading}</h2>
      <p style="font-size:16px;color:${c.muted};line-height:1.75;">${config.aboutBody}</p>
    </div>
    <div style="background:${c.bg};border:1px solid ${c.border};border-radius:20px;padding:40px;display:flex;flex-direction:column;gap:20px;">
      ${config.address ? `
      <div style="display:flex;gap:16px;align-items:flex-start;">
        <div style="width:36px;height:36px;border-radius:10px;background:${c.accent}22;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg width="16" height="16" fill="${c.accent}" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/></svg>
        </div>
        <div><p style="font-size:12px;color:${c.muted};margin-bottom:3px;text-transform:uppercase;letter-spacing:0.08em;">Location</p><p style="font-size:14px;color:${c.text};font-weight:500;">${config.address}</p></div>
      </div>` : ''}
      ${config.phone ? `
      <div style="display:flex;gap:16px;align-items:flex-start;">
        <div style="width:36px;height:36px;border-radius:10px;background:${c.accent}22;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg width="16" height="16" fill="${c.accent}" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/></svg>
        </div>
        <div><p style="font-size:12px;color:${c.muted};margin-bottom:3px;text-transform:uppercase;letter-spacing:0.08em;">Phone</p><p style="font-size:14px;color:${c.text};font-weight:500;"><a href="tel:${config.phone}" style="color:${c.text};">${config.phone}</a></p></div>
      </div>` : ''}
    </div>
  </div>
</section>

<!-- MENU -->
${menuSection(config.menuItems, c, f)}

<!-- GALLERY -->
${gallerySection(config.galleryImages, c)}

<!-- HOURS & LOCATION -->
<section id="hours" style="padding:100px 0;background:${c.surface};border-top:1px solid ${c.border};">
  <div style="max-width:1100px;margin:0 auto;padding:0 40px;">
    <p style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${c.accent};font-weight:600;margin-bottom:12px;text-align:center;">VISIT US</p>
    <h2 style="font-family:${f.heading};font-size:clamp(28px,3.5vw,48px);font-weight:700;color:${c.text};text-align:center;margin-bottom:60px;letter-spacing:-0.02em;">Hours & Location</h2>
    <div class="info-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:40px;">
      <div style="background:${c.bg};border:1px solid ${c.border};border-radius:16px;padding:36px;">
        <p style="font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:${c.muted};margin-bottom:20px;font-weight:600;">Hours</p>
        ${hoursTable(config.hours, c)}
        ${!config.hours || Object.keys(config.hours).length === 0 ? `<p style="color:${c.muted};font-size:14px;">Contact us for hours</p>` : ''}
      </div>
      <div style="background:${c.bg};border:1px solid ${c.border};border-radius:16px;padding:36px;display:flex;flex-direction:column;gap:20px;">
        <div>
          <p style="font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:${c.muted};margin-bottom:8px;font-weight:600;">Address</p>
          <p style="font-size:16px;color:${c.text};font-weight:500;line-height:1.5;">${config.address ?? 'Contact us for address'}</p>
        </div>
        ${config.address ? `<a href="https://maps.google.com/?q=${encodeURIComponent(config.address)}" target="_blank" class="btn-outline" style="align-self:flex-start;">Get Directions</a>` : ''}
        ${config.phone ? `<a href="tel:${config.phone}" style="font-size:20px;font-weight:600;color:${c.accent};">${config.phone}</a>` : ''}
      </div>
    </div>
  </div>
</section>

${config.bookingUrl ? `
<!-- RESERVE -->
<section id="reserve" style="padding:100px 0;background:${c.bg};border-top:1px solid ${c.border};">
  <div style="max-width:600px;margin:0 auto;padding:0 40px;text-align:center;">
    <p style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${c.accent};font-weight:600;margin-bottom:12px;">RESERVATIONS</p>
    <h2 style="font-family:${f.heading};font-size:clamp(28px,3.5vw,48px);font-weight:700;color:${c.text};margin-bottom:16px;letter-spacing:-0.02em;">Reserve a Table</h2>
    <p style="font-size:16px;color:${c.muted};line-height:1.6;margin-bottom:40px;">Book your table in seconds. We look forward to welcoming you.</p>
    <a href="${config.bookingUrl}" target="_blank" class="btn-primary" style="font-size:16px;padding:16px 40px;">Book Now</a>
  </div>
</section>` : ''}

<!-- FOOTER -->
<footer style="padding:48px 40px;background:${c.bg};border-top:1px solid ${c.border};display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;">
  <p style="font-family:${f.heading};font-size:16px;font-weight:700;color:${c.text};">${config.businessName}</p>
  <p style="font-size:13px;color:${c.muted};">&copy; ${new Date().getFullYear()} ${config.businessName}. All rights reserved.</p>
  <p style="font-size:11px;color:${c.muted}40;">Powered by <a href="https://embedo.io" style="color:${c.muted}60;">Embedo</a></p>
</footer>

${config.chatbotEnabled && config.chatbotBusinessId ? `
<!-- CHAT WIDGET -->
<script>
  window.EmbledoChatConfig = {
    businessId: "${config.chatbotBusinessId}",
    primaryColor: "${c.accent}",
    businessName: "${config.businessName}",
    welcomeMessage: "Hi! How can I help you today?"
  };
</script>
<script src="${config.chatbotApiUrl ?? 'https://chat.embedo.ai'}/widget.js" async></script>` : ''}

</body>
</html>`;
}
