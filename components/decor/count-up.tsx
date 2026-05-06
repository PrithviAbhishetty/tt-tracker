"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  duration?: number; // ms
  /** Where to start the count from. Defaults to ~75% of the target so the animation reads as "settling in". */
  from?: number;
  className?: string;
}

/**
 * Animates a number from `from` to `value` once on mount.
 * Respects prefers-reduced-motion (renders the final value immediately).
 */
export function CountUp({ value, duration = 900, from, className }: Props) {
  const startVal = from ?? Math.max(0, Math.round(value * 0.75));
  const [display, setDisplay] = useState(startVal);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    const tick = (t: number) => {
      if (startedAt.current === null) startedAt.current = t;
      const elapsed = t - startedAt.current;
      const progress = Math.min(1, elapsed / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const cur = Math.round(startVal + (value - startVal) * eased);
      setDisplay(cur);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <span className={className}>{display}</span>;
}
