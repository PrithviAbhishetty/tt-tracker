interface Props {
  className?: string;
  size?: number;
  /** Stroke color override; defaults to currentColor so it adapts to context. */
  stroke?: string;
}

/**
 * Stylized retro Japanese-illustration paddle.
 * Single-stroke ink line with a rope-wrapped handle and one shading stroke.
 * Uses currentColor so it inherits text color from its container.
 */
export function PaddleMark({ className, size = 28, stroke }: Props) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke={stroke ?? "currentColor"}
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* paddle head (oval) */}
      <ellipse cx="26" cy="22" rx="16" ry="18" />
      {/* paddle face shading — small inset arc */}
      <path d="M16 14 q6 -4 14 -2" strokeWidth={1.4} opacity="0.6" />
      {/* handle */}
      <path d="M37 33 L52 50" strokeWidth={3.2} />
      {/* handle wrap (rope) */}
      <path d="M40 36 L43 39" strokeWidth={1.4} />
      <path d="M43 39 L46 42" strokeWidth={1.4} />
      <path d="M46 42 L49 45" strokeWidth={1.4} />
    </svg>
  );
}
