interface Props {
  /** Kanji to render in the seal — e.g. 一, 二, 三, 覇, 王, 客, 輪, 札 */
  kanji: string;
  size?: number;
  /** -8deg by default; pass an override if needed */
  rotate?: number;
  /** Pulse animation on the champion card */
  pulse?: boolean;
  className?: string;
}

/**
 * Vintage sage-green "hanko" seal stamp. Circular, slightly imperfect edge,
 * single bold kanji centered. Inverted from traditional vermilion to fit the
 * brick-red + sage palette.
 */
export function Hanko({ kanji, size = 56, rotate = -8, pulse, className }: Props) {
  return (
    <span
      className={`inline-flex items-center justify-center ${pulse ? "tt-stamp-pulse" : ""} ${className ?? ""}`}
      style={{
        width: size,
        height: size,
        transform: `rotate(${rotate}deg)`,
      }}
      aria-hidden
    >
      <svg viewBox="0 0 64 64" width={size} height={size} className="block">
        <defs>
          {/* Slightly imperfect circular path for stamp feel */}
          <filter id={`stamp-${kanji}`} x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="5" />
            <feDisplacementMap in="SourceGraphic" scale="1.4" />
          </filter>
        </defs>
        <g filter={`url(#stamp-${kanji})`}>
          <circle cx="32" cy="32" r="28" fill="var(--accent)" />
          <circle cx="32" cy="32" r="28" fill="none" stroke="var(--accent-deep)" strokeWidth="1.5" />
          <text
            x="32"
            y="32"
            textAnchor="middle"
            dominantBaseline="central"
            fill="var(--paper-light)"
            fontFamily="var(--font-display), serif"
            fontSize={kanji.length > 1 ? "20" : "30"}
            fontWeight={800}
          >
            {kanji}
          </text>
        </g>
      </svg>
    </span>
  );
}
