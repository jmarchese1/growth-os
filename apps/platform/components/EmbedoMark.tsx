/**
 * Embedo logomark.
 *
 * A rounded Apple-blue tile containing a single bold flowing stroke
 * (an outgoing signal) that resolves into a filled endpoint dot — a
 * "message reaching destination" mark. Subtle inner highlight at the
 * top edge for dimensional polish.
 */
export function EmbedoMark({ size = 28 }: { size?: number }) {
  const radius = Math.round(size * 0.29);

  return (
    <span
      aria-label="Embedo"
      className="relative shrink-0 inline-flex items-center justify-center overflow-hidden"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: 'linear-gradient(160deg, #1d8cff 0%, #0071e3 50%, #0058b9 100%)',
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.22), 0 1px 2px rgba(0,113,227,0.25), 0 6px 14px rgba(0,113,227,0.20)',
      }}
    >
      {/* Inner top-edge highlight for that iOS-icon glassiness */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 pointer-events-none"
        style={{
          height: '45%',
          borderTopLeftRadius: radius,
          borderTopRightRadius: radius,
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 100%)',
        }}
      />

      <svg
        width={Math.round(size * 0.66)}
        height={Math.round(size * 0.66)}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'relative', zIndex: 1 }}
      >
        {/* The signal arc — a single confident curve */}
        <path
          d="M4 18 C 7 18, 9 14, 12 12 S 17 6, 20 6"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Endpoint dot */}
        <circle cx="20" cy="6" r="2.1" fill="white" />
      </svg>
    </span>
  );
}
