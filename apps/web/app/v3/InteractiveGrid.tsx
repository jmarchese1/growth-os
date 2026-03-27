'use client';

/**
 * Animated background with 3 morphing color orbs — purple, magenta, dark blue.
 */
export default function InteractiveGrid({ className = '' }: { className?: string }) {
  return (
    <div
      className={`absolute inset-0 w-full h-full overflow-hidden ${className}`}
      style={{ zIndex: 0 }}
    >
      {/* 3 orbs: purple, magenta, dark blue */}
      <div className="v3-mesh-blob v3-mesh-1" />
      <div className="v3-mesh-blob v3-mesh-2" />
      <div className="v3-mesh-blob v3-mesh-3" />

      {/* Subtle grid lines */}
      <div className="v3-grid-lines" />
    </div>
  );
}
