"use client";

import { useRef, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  /** Max tilt in degrees on each axis. */
  max?: number;
}

/**
 * Wraps children in a div that tilts toward the cursor on hover.
 * Touch devices and reduced-motion users get a plain div (no listeners).
 */
export function Tilt({ children, className = "", max = 8 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0..1
    const py = (e.clientY - rect.top) / rect.height; // 0..1
    const ry = (px - 0.5) * 2 * max; // rotateY: cursor right → tilt right
    const rx = -(py - 0.5) * 2 * max; // rotateX: cursor down → tilt back
    el.style.setProperty("--rx", `${rx}deg`);
    el.style.setProperty("--ry", `${ry}deg`);
  }

  function reset() {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      className={`tt-tilt ${className}`}
    >
      {children}
    </div>
  );
}
