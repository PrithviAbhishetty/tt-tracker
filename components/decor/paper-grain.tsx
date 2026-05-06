/**
 * Inline SVG noise filter + a fixed grain overlay div.
 * Filter id: `#paper-grain` — anything can apply `filter: url(#paper-grain)`.
 * The visible grain texture is a tiled SVG turbulence converted to alpha.
 */
export function PaperGrainFilter() {
  return (
    <>
      <svg
        aria-hidden
        focusable="false"
        width="0"
        height="0"
        style={{ position: "absolute", pointerEvents: "none" }}
      >
        <filter id="paper-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0
                    0 0 0 0 0
                    0 0 0 0 0
                    0 0 0 0.10 0"
          />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </svg>
      {/* Persistent grain wash on top of the page (under content). */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240' viewBox='0 0 240 240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='3'/><feColorMatrix values='0 0 0 0 0.137  0 0 0 0 0.098  0 0 0 0 0.082  0 0 0 0.45 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          backgroundSize: "240px 240px",
          opacity: 0.18,
          mixBlendMode: "multiply",
        }}
      />
    </>
  );
}
