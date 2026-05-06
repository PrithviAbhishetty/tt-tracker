/**
 * A thin sage hairline along the bottom of the viewport with a few
 * brushy grass tufts. Anchors the tree visually and gives leaves
 * somewhere to land.
 */
export function GroundLine() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-0 right-0 bottom-0 -z-10"
      style={{ height: "1.5rem" }}
    >
      <svg
        viewBox="0 0 1200 24"
        preserveAspectRatio="none"
        width="100%"
        height="100%"
        aria-hidden
      >
        {/* Hairline */}
        <line
          x1="0"
          y1="20"
          x2="1200"
          y2="20"
          stroke="var(--accent)"
          strokeWidth="0.8"
          opacity="0.55"
        />
        {/* Grass tufts — brushy strokes */}
        {[80, 220, 360, 540, 720, 880, 1020, 1140].map((x, i) => (
          <g key={i} opacity="0.7">
            <path
              d={`M${x} 20 Q ${x - 2} ${14 - (i % 3)} ${x - 4} ${10 - (i % 2)}`}
              stroke="var(--accent)"
              strokeWidth="1"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d={`M${x} 20 Q ${x + 2} ${13 - ((i + 1) % 3)} ${x + 5} ${9 - (i % 2)}`}
              stroke="var(--accent-deep)"
              strokeWidth="0.9"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d={`M${x + 2} 20 Q ${x + 3} 16 ${x + 4} 13`}
              stroke="var(--accent)"
              strokeWidth="0.7"
              fill="none"
              strokeLinecap="round"
            />
          </g>
        ))}
      </svg>
    </div>
  );
}
