/* eslint-disable @next/next/no-img-element */

/**
 * Embedo logomark — fal.ai-generated PNG saved to /embedo-logo.jpg.
 * A premium iOS-style icon: blue gradient rounded square with a clean
 * stacked-bar abstract monogram inside. Soft shadow for depth.
 */
export function EmbedoMark({ size = 28 }: { size?: number }) {
  return (
    <span
      aria-label="Embedo"
      className="relative shrink-0 inline-flex items-center justify-center overflow-hidden"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.24),
        boxShadow:
          '0 1px 2px rgba(0,113,227,0.18), 0 4px 12px rgba(0,113,227,0.18)',
      }}
    >
      <img
        src="/embedo-logo.jpg"
        alt=""
        width={size}
        height={size}
        style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
        draggable={false}
      />
    </span>
  );
}
