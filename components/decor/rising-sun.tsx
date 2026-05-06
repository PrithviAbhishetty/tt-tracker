/**
 * A large half-disc sun in deep-burgundy ink, anchored top-right and
 * partially clipped by the viewport edge. Reads as a sumie sun painted
 * into the brick-red ground rather than a backlit highlight.
 *
 * Very gentle "breathing" scale animation (~8s) for life.
 */
export function RisingSun() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed -z-10 tt-sun-breathe"
      style={{
        top: "-6rem",
        right: "-6rem",
        width: "min(28rem, 70vw)",
        height: "min(28rem, 70vw)",
        opacity: 0.18,
        transformOrigin: "75% 75%",
      }}
    >
      <svg viewBox="0 0 200 200" width="100%" height="100%" aria-hidden>
        <circle cx="100" cy="100" r="92" fill="var(--paper-edge)" />
        {/* Subtle inner ring for the brushstroke feel */}
        <circle
          cx="100"
          cy="100"
          r="92"
          fill="none"
          stroke="var(--paper-edge)"
          strokeWidth="2"
          opacity="0.6"
        />
        {/* Tiny brush imperfection on the edge */}
        <circle cx="100" cy="100" r="86" fill="none" stroke="var(--paper-edge)" strokeWidth="0.6" opacity="0.5" />
      </svg>
    </div>
  );
}
