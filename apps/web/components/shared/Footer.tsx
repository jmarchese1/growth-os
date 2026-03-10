const NAV = [
  { label: 'The System', href: '#system' },
  { label: 'Features', href: '#features' },
  { label: 'Automation', href: '#system' },
  { label: 'Custom Proposal', href: '#proposal' },
  { label: 'Book a Call', href: '#book' },
];

const SOCIAL = [
  { label: 'LinkedIn', href: 'https://linkedin.com/company/embedo', icon: 'linkedin' },
  { label: 'X / Twitter', href: 'https://x.com/embedo_ai', icon: 'x' },
  { label: 'Instagram', href: 'https://instagram.com/embedo.ai', icon: 'instagram' },
];

export default function Footer() {
  return (
    <footer className="bg-indigo-950 text-white">
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-10">

        {/* Main grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-14">

          {/* Brand */}
          <div className="lg:col-span-2">
            <p className="text-2xl font-bold tracking-tight mb-3">Embedo</p>
            <p className="text-indigo-300 text-sm leading-relaxed max-w-xs mb-6">
              AI infrastructure for local businesses. Voice, chat, leads, social, surveys,
              and more — deployed in days, not months.
            </p>
            {/* Social icons */}
            <div className="flex gap-3">
              {SOCIAL.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="w-9 h-9 rounded-full border border-indigo-700 bg-indigo-900/60 flex items-center justify-center hover:border-indigo-400 hover:bg-indigo-800 transition-all"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://api.iconify.design/simple-icons:${s.icon}.svg`}
                    alt={s.label}
                    style={{ width: 14, height: 14, filter: 'brightness(0) invert(1)', opacity: 0.75 }}
                  />
                </a>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] uppercase text-indigo-400 mb-5">
              Product
            </p>
            <ul className="space-y-3">
              {NAV.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-indigo-200/70 hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] uppercase text-indigo-400 mb-5">
              Contact
            </p>
            <ul className="space-y-3 text-sm text-indigo-200/70">
              <li>
                <a href="mailto:hello@embedo.io" className="hover:text-white transition-colors">
                  hello@embedo.io
                </a>
              </li>
              <li>
                <a href="#book" className="hover:text-white transition-colors">
                  Book a free strategy call
                </a>
              </li>
              <li className="text-indigo-300/50 text-xs leading-relaxed pt-2">
                Serving local businesses<br />across the United States
              </li>
            </ul>

            {/* Founder badge */}
            <div className="mt-6 flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full overflow-hidden border border-indigo-600 flex-shrink-0"
                style={{ background: 'rgba(99,102,241,0.2)' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/workday_photo.jpeg"
                  alt="Jason Marchese"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 8%' }}
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-white leading-none">Jason Marchese</p>
                <p className="text-xs text-indigo-400 leading-none mt-0.5">Founder · Data Scientist</p>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-indigo-800/60 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-indigo-500">
            © 2026 Embedo. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-xs text-indigo-500 hover:text-indigo-300 transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-xs text-indigo-500 hover:text-indigo-300 transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
