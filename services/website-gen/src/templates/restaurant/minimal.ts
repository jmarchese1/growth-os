import type { WebsiteConfig } from '@embedo/types';

/**
 * Generates the HTML/CSS for the minimal restaurant website template.
 * Apple-inspired: clean, large typography, minimal color.
 */
export function renderRestaurantMinimal(config: WebsiteConfig): string {
  const {
    businessName,
    tagline,
    description,
    primaryColor = '#1a1a1a',
    heroHeading,
    heroSubheading,
    chatbotEnabled,
    chatbotBusinessId,
    bookingEnabled,
    calendlyUrl,
    heroImageUrl,
  } = config;

  const settings = (config as unknown as Record<string, unknown>)['settings'] as Record<string, unknown> | undefined;
  const hours = settings?.['hours'] as Record<string, { open: string; close: string }> | undefined;
  const address = settings?.['address'] as Record<string, string> | undefined;
  const phone = settings?.['phone'] as string | undefined;

  const hoursHtml = hours
    ? Object.entries(hours)
        .map(([day, h]) => `<div class="hours-row"><span>${capitalize(day)}</span><span>${h.open} – ${h.close}</span></div>`)
        .join('')
    : '';

  const addressText = address
    ? [address['street'], address['city'], address['state'], address['zip']].filter(Boolean).join(', ')
    : '';

  const chatbotSnippet = chatbotEnabled && chatbotBusinessId
    ? `<script>
  window.EmbledoChatConfig = {
    businessId: "${chatbotBusinessId}",
    apiUrl: "${process.env['CHATBOT_API_URL'] ?? 'https://chat.embedo.ai'}",
    primaryColor: "${primaryColor}",
    businessName: "${businessName}",
    welcomeMessage: "Welcome to ${businessName}! How can I help you?",
    position: "bottom-right"
  };
  (function() {
    var s = document.createElement('script');
    s.src = (window.EmbledoChatConfig.apiUrl + '/widget.js');
    s.async = true;
    document.head.appendChild(s);
  })();
</script>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${businessName}${tagline ? ` — ${tagline}` : ''}</title>
<meta name="description" content="${description ?? `Welcome to ${businessName}`}">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  :root { --primary: ${primaryColor}; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif; color: #1a1a1a; -webkit-font-smoothing: antialiased; }
  a { color: inherit; text-decoration: none; }

  /* Nav */
  nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; padding: 0 48px; height: 64px; display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.9); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(0,0,0,0.08); }
  .nav-logo { font-size: 18px; font-weight: 700; letter-spacing: -0.02em; }
  .nav-links { display: flex; gap: 32px; }
  .nav-links a { font-size: 14px; color: #666; transition: color 0.2s; }
  .nav-links a:hover { color: #000; }
  .nav-cta { background: var(--primary); color: white; padding: 10px 20px; border-radius: 100px; font-size: 14px; font-weight: 600; transition: opacity 0.2s; }
  .nav-cta:hover { opacity: 0.85; }

  /* Hero */
  .hero { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 120px 48px 80px; text-align: center; position: relative; overflow: hidden; background: ${heroImageUrl ? `url(${heroImageUrl}) center/cover no-repeat` : '#fff'}; }
  ${heroImageUrl ? '.hero::before { content: ""; position: absolute; inset: 0; background: rgba(0,0,0,0.45); }' : ''}
  .hero-content { position: relative; z-index: 1; max-width: 800px; margin: 0 auto; }
  .hero h1 { font-size: clamp(48px, 8vw, 96px); font-weight: 700; letter-spacing: -0.03em; line-height: 1.0; color: ${heroImageUrl ? '#fff' : 'var(--primary)'}; margin-bottom: 24px; }
  .hero p { font-size: clamp(18px, 2.5vw, 24px); color: ${heroImageUrl ? 'rgba(255,255,255,0.85)' : '#666'}; max-width: 560px; margin: 0 auto 40px; line-height: 1.5; }
  .hero-buttons { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
  .btn-primary { background: ${heroImageUrl ? '#fff' : 'var(--primary)'}; color: ${heroImageUrl ? 'var(--primary)' : '#fff'}; padding: 16px 32px; border-radius: 100px; font-size: 16px; font-weight: 600; transition: transform 0.2s, opacity 0.2s; }
  .btn-primary:hover { transform: scale(1.03); opacity: 0.92; }
  .btn-outline { border: 2px solid ${heroImageUrl ? '#fff' : 'var(--primary)'}; color: ${heroImageUrl ? '#fff' : 'var(--primary)'}; padding: 14px 30px; border-radius: 100px; font-size: 16px; font-weight: 600; }

  /* Sections */
  section { padding: 96px 48px; }
  .section-label { font-size: 11px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #999; margin-bottom: 16px; }
  h2 { font-size: clamp(32px, 5vw, 56px); font-weight: 700; letter-spacing: -0.02em; line-height: 1.1; margin-bottom: 24px; }
  .container { max-width: 1100px; margin: 0 auto; }

  /* About */
  .about { background: #f9f9f9; }
  .about p { font-size: 20px; color: #555; line-height: 1.7; max-width: 640px; }

  /* Info grid */
  .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 0; }
  .info-card { padding: 48px; border: 1px solid #f0f0f0; }
  .info-card h3 { font-size: 13px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #999; margin-bottom: 16px; }
  .info-card p, .info-card .hours-row { font-size: 16px; color: #444; line-height: 1.8; }
  .hours-row { display: flex; justify-content: space-between; border-bottom: 1px solid #f5f5f5; padding: 4px 0; }

  /* Booking */
  .booking { background: var(--primary); color: white; text-align: center; }
  .booking h2 { color: white; }
  .booking p { color: rgba(255,255,255,0.8); font-size: 18px; margin-bottom: 32px; }
  .booking .btn-primary { background: white; color: var(--primary); }

  /* Footer */
  footer { padding: 48px; text-align: center; border-top: 1px solid #f0f0f0; }
  footer p { color: #999; font-size: 14px; }

  @media (max-width: 768px) {
    nav { padding: 0 24px; }
    .nav-links { display: none; }
    section { padding: 64px 24px; }
    .hero { padding: 120px 24px 64px; }
  }
</style>
</head>
<body>

<nav>
  <div class="nav-logo">${businessName}</div>
  <div class="nav-links">
    <a href="#about">About</a>
    <a href="#info">Hours & Location</a>
    ${bookingEnabled ? '<a href="#book">Reserve</a>' : ''}
  </div>
  ${bookingEnabled ? `<a href="#book" class="nav-cta">Reserve a Table</a>` : ''}
</nav>

<div class="hero">
  <div class="hero-content">
    <h1>${heroHeading ?? businessName}</h1>
    <p>${heroSubheading ?? description ?? `Experience exceptional dining at ${businessName}.`}</p>
    <div class="hero-buttons">
      ${bookingEnabled ? `<a href="#book" class="btn-primary">Reserve a Table</a>` : ''}
      <a href="#info" class="btn-outline">View Hours</a>
    </div>
  </div>
</div>

<section id="about" class="about">
  <div class="container">
    <p class="section-label">About Us</p>
    <h2>${businessName}</h2>
    <p>${description ?? `Welcome to ${businessName}. We're passionate about creating memorable dining experiences with exceptional food and warm hospitality.`}</p>
  </div>
</section>

<section id="info">
  <div class="container">
    <div class="info-grid">
      ${hours ? `<div class="info-card"><h3>Hours</h3>${hoursHtml}</div>` : ''}
      ${address ? `<div class="info-card"><h3>Location</h3><p>${addressText}</p></div>` : ''}
      ${phone ? `<div class="info-card"><h3>Reservations</h3><p><a href="tel:${phone}">${phone}</a></p></div>` : ''}
    </div>
  </div>
</section>

${bookingEnabled && calendlyUrl ? `
<section id="book" class="booking">
  <div class="container">
    <p class="section-label" style="color: rgba(255,255,255,0.6)">Book a Table</p>
    <h2>Reserve Your Spot</h2>
    <p>Join us for an unforgettable meal. Book your table online in seconds.</p>
    <a href="${calendlyUrl}" target="_blank" class="btn-primary">Book Now</a>
  </div>
</section>
` : ''}

<footer>
  <p>© ${new Date().getFullYear()} ${businessName}. Powered by <a href="https://embedo.ai">Embedo</a>.</p>
</footer>

${chatbotSnippet}
</body>
</html>`;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
