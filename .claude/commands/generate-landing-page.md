Generate a premium, conversion-focused landing page for a B2B or B2C service business using Next.js 15 (App Router) and Tailwind CSS v3.

## What you need from the user first

If the user hasn't already provided it, ask for:
1. **Business name** and one-sentence description of what it does
2. **Target customer** (who is this for?)
3. **Primary CTA** — what do you want visitors to do? (book a call, sign up, get a proposal, etc.)

Once you have that, build everything below without asking further questions. Make smart assumptions on copy, colors, and layout.

---

## Design Principles (follow these strictly)

### Visual language
- **Apple-inspired minimalism** — whitespace is a feature, not wasted space
- **Dark hero option or light with grid** — use a subtle dot/line grid (`background-image: linear-gradient(rgba(X,X,X,0.05) 1px, transparent 1px), linear-gradient(90deg, ...)`) on light sections
- **One accent color** — pick a single strong brand color (indigo, violet, emerald, rose, amber). Everything derives from it
- **Typography**: `font-bold tracking-tight` headings, `text-gray-500` body, tight leading on large type
- **No stock photo backgrounds** unless the user provides one — use gradients, glows, and grid patterns instead

### Animation & interactivity
- **Ambient glow blobs** — `absolute rounded-full blur-3xl opacity-60` with brand color, positioned behind content
- **Particle canvas** (optional for hero) — subtle orbiting/floating dots that react to the brand color palette
- **CSS keyframe animations** — define in `globals.css`: `pulse-glow`, `slow-spin`, orbit patterns
- **Hover effects** — colored `box-shadow` glow matching the accent color, NOT plain gray shadows. Use `onMouseEnter`/`onMouseLeave` for fine control
- **Scroll-triggered counters** — use `IntersectionObserver` for animated stat numbers, upward drift motion

### Buttons
- **Primary CTA**: neon/vibrant gradient matching the brand accent with a colored glow shadow (`box-shadow: 0 0 24px rgba(...)`)
- **Secondary CTA**: clean white/outlined, no heavy shadow
- All buttons: `rounded-full`, `hover:scale-105 active:scale-95`, smooth transitions

### Cards & sections
- Use `rounded-2xl` consistently
- Cards: `bg-[accent-50] border-[accent-100]` with a colored glow `box-shadow` on hover
- Alternating section backgrounds: white → off-white/gray-50 → dark (accent-950) → white
- Dark sections: deep indigo/slate background, glow blobs, white text

---

## Page Sections to Build (in order)

### 1. Hero Section
- Sticky nav with logo left, CTA button right
- Large headline: bold problem/outcome statement (2 lines max)
- Subheadline: one sentence explaining who this is for and what they get
- Two CTAs: primary (neon gradient) + secondary (white outlined)
- Background: white + `bg-grid` + radial glow blob + optional particle canvas
- Scroll indicator arrow at bottom

### 2. Problem / Social Proof Section
- "The problem" framing — 2-3 pain points the customer feels
- Optionally: an emotional quote from a customer persona (blockquote style, dark background)
- 3 animated stats that count up on scroll (e.g. "73% of leads never get a follow-up")

### 3. Features / Why Us Section
- Left: "Why [Brand]" eyebrow + large 2-line heading + 1-sentence subtext naming key integrations
- Right: **Orbital animation card** — dark background card with brand logo at center, 6 partner/tool logos orbiting in a perfect circle using CSS animation
  - Single rotating ring wrapper with all nodes pre-positioned at 60° intervals (not per-element delays — that causes clustering)
  - Each node counter-rotates to stay upright: outer div `logo-orbit`, inner div `counter-orbit`
  - Logos via `https://api.iconify.design/simple-icons:[slug].svg` with `filter: brightness(0) invert(1)` for white rendering
- Below: 6-card feature grid, all with accent tint background and hover glow

### 4. How It Works / System Section
- "One platform. [N] modules/steps." heading
- Full-width section with `bg-grid` throughout (not just the header)
- Ambient glow blobs at top and bottom
- Row-based list of features/steps — on hover: indigo left-border accent slides in + row background shifts + text darkens
- Alternating subtle background on odd rows

### 5. Social Proof / Testimonials
- Dark background section (accent-950)
- 2-3 testimonial cards or one large featured quote
- Credibility badges or logos below

### 6. About / Founder Section (if applicable)
- Light section with `bg-grid` + radial glow
- Photo with **orbital ring background**: 3 counter-rotating dashed SVG rings with glowing orbiting dots, particles — all using the same `logo-orbit`/`counter-orbit` keyframes
- Bio text right-aligned: credential badges, 2-paragraph story, warm close
- Credentials as pill badges: `bg-accent-50 border-accent-200 text-accent-700`

### 7. Primary CTA Section
- Dark deep background (accent-950 or near-black)
- Centered: eyebrow label + large heading + subtext
- Single large neon primary button
- Social proof micro-copy below: "✓ Free  ✓ No obligation  ✓ [Time]"

### 8. Footer
- Logo + tagline left
- Links: Features, How It Works, About, [CTA]
- Copyright right

---

## File Structure to Create

```
apps/web/
├── app/
│   ├── layout.tsx          # Font, metadata, globals import
│   ├── page.tsx            # Assembles all sections
│   └── globals.css         # Keyframes + utility classes
├── components/
│   ├── nav/Navbar.tsx
│   ├── hero/HeroSection.tsx
│   ├── sections/
│   │   ├── ProblemSection.tsx
│   │   ├── FeaturesSection.tsx   # Orbital animation + feature cards
│   │   ├── SystemOverview.tsx    # Row-based module list
│   │   └── AutomationExamples.tsx
│   ├── ui/
│   │   ├── AnimatedStat.tsx      # IntersectionObserver counter
│   │   ├── ParticleCanvas.tsx    # Canvas particle background
│   │   ├── CursorSpotlight.tsx   # Mouse-tracking vignette effect
│   │   └── LogoDisplay.tsx       # Orbital hero visual
│   ├── proposal/ProposalCTA.tsx  # Lead capture form
│   ├── booking/
│   │   ├── CalendlySection.tsx   # Founder intro + booking CTA
│   │   └── CalModal.tsx          # Cal.com popup (uses @calcom/embed-react)
│   └── footer/Footer.tsx
└── public/                       # Brand assets
```

---

## globals.css Keyframes (always include these)

```css
@keyframes logo-orbit {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes counter-orbit {
  from { transform: rotate(360deg); }
  to   { transform: rotate(0deg); }
}
@keyframes pulse-glow {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50%       { opacity: 1;   transform: scale(1.15); }
}
@keyframes cube-spin-breathe {
  0%   { transform: rotate(0deg)   scale(1.00); }
  25%  { transform: rotate(90deg)  scale(1.07); }
  50%  { transform: rotate(180deg) scale(1.00); }
  75%  { transform: rotate(270deg) scale(1.06); }
  100% { transform: rotate(360deg) scale(1.00); }
}
.bg-grid {
  background-image: linear-gradient(rgba(99,102,241,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(99,102,241,0.05) 1px, transparent 1px);
  background-size: 56px 56px;
}
```

---

## Orbital Animation Pattern (critical — get this right)

**Wrong approach** (causes uneven spacing):
```tsx
// BAD: per-node delays cause clustering at render time
TOOLS.map((t, i) => (
  <div style={{ animationDelay: `-${(i/6)*20}s` }}>...</div>
))
```

**Correct approach** (guarantees perfect 60° spacing):
```tsx
// GOOD: single ring rotates, nodes pre-positioned at exact angles
const NODES = TOOLS.map((t, i) => {
  const angleDeg = -90 + (i / COUNT) * 360; // start from top
  const rad = (angleDeg * Math.PI) / 180;
  return {
    ...t,
    left: ORBIT_R + ORBIT_R * Math.cos(rad) - NODE_D / 2,
    top:  ORBIT_R + ORBIT_R * Math.sin(rad) - NODE_D / 2,
  };
});

// Single rotating wrapper — all nodes ride this
<div style={{ animation: `logo-orbit ${DURATION}s linear infinite` }}>
  {NODES.map((t) => (
    <div style={{ position: 'absolute', left: t.left, top: t.top,
                  animation: `counter-orbit ${DURATION}s linear infinite` }}>
      {/* logo node */}
    </div>
  ))}
</div>
```

---

## Booking Integration

Use **Cal.com** (not Calendly) via `@calcom/embed-react`:

```tsx
'use client';
import { useEffect, useRef } from 'react';

declare global {
  interface Window { Calendly?: { initPopupWidget: (o: { url: string }) => void } }
}

// Cal.com popup pattern:
import { getCalApi } from '@calcom/embed-react';

useEffect(() => {
  (async () => {
    const cal = await getCalApi();
    cal('ui', { hideEventTypeDetails: false, layout: 'month_view' });
  })();
}, []);

// Button:
<button data-cal-link="username/30min" data-cal-config='{"layout":"month_view"}'>
  Book a Call
</button>
```

---

## Tailwind Config Requirements

```js
// tailwind.config.js
theme: {
  extend: {
    colors: {
      'brand-accent': '#6366F1',      // swap for chosen accent
      'brand-accent-dark': '#4F46E5',
    }
  }
}
```

---

## Copy Guidelines

- **Headlines**: outcome-focused, not feature-focused. "Your business, running itself." not "Our AI platform automates tasks."
- **Subheadlines**: one sentence, specific, who + what + when. Max 25 words.
- **Body**: short paragraphs, 2-3 sentences max. Plain language. No jargon.
- **CTAs**: action verb + specific outcome. "Generate My Proposal" not "Submit". "Book a Free Call" not "Contact Us".
- **Social proof copy**: real pain, real emotion. "I spent four hours every Sunday..." > "Our customers love us."

---

## Quality Checklist Before Finishing

- [ ] All sections have consistent max-width (`max-w-5xl` or `max-w-6xl`) and `px-6` padding
- [ ] No section uses plain gray `shadow` on hover — all use brand-colored glow shadows
- [ ] Primary buttons use neon gradient + colored glow shadow
- [ ] Orbital animation uses single-ring approach (not per-node delays)
- [ ] All logo images use `filter: brightness(0) invert(1)` for dark node backgrounds
- [ ] Dark sections have glow blobs (`absolute rounded-full blur-3xl`)
- [ ] `'use client'` added to any component using hooks or mouse events
- [ ] `globals.css` includes all keyframes
- [ ] Mobile: single column, images scale, no overflow
