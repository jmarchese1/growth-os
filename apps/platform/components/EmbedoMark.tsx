import Image from 'next/image';
import logo from './assets/embedo-logo.jpg';

/**
 * Embedo logomark — fal.ai-generated icon, imported as a module so Next.js
 * bundles it into _next/static/media (the public/ folder isn't being
 * deployed on this Vercel project for some reason).
 */
export function EmbedoMark({ size = 28 }: { size?: number }) {
  return (
    <span
      aria-label="Embedo"
      className="relative shrink-0 inline-block overflow-hidden"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.24),
        boxShadow:
          '0 1px 2px rgba(0,113,227,0.18), 0 4px 12px rgba(0,113,227,0.18)',
      }}
    >
      <Image
        src={logo}
        alt=""
        width={size}
        height={size}
        priority
        style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
        draggable={false}
      />
    </span>
  );
}
