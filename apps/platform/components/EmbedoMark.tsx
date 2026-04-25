/**
 * Embedo logomark — rounded blue gradient tile with a custom interlocking-arc
 * glyph (outreach signal in motion). Designed to read as a small product mark,
 * not a placeholder letter.
 */
export function EmbedoMark({ size = 28 }: { size?: number }) {
  return (
    <span
      aria-label="Embedo"
      className="relative shrink-0 inline-flex items-center justify-center rounded-[8px] overflow-hidden"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #0071e3 0%, #1d6cff 60%, #5ac8fa 100%)',
        boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,0.18), 0 1px 2px rgba(0,113,227,0.20), 0 4px 10px rgba(0,113,227,0.18)',
      }}
    >
      <svg
        width={Math.round(size * 0.62)}
        height={Math.round(size * 0.62)}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M5 12c0-3.3 2.7-6 6-6s6 2.7 6 6"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity="0.95"
        />
        <path
          d="M19 12c0 3.3-2.7 6-6 6s-6-2.7-6-6"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity="0.6"
        />
        <circle cx="17" cy="6" r="1.6" fill="white" />
      </svg>
    </span>
  );
}
