"use client";

import { useEffect, useRef } from "react";

/**
 * Spawns sage-green leaves drifting down from the tree's canopy area.
 * Two modes:
 *   - Ambient: 1 leaf every 3-5s (desktop) / 6-9s (mobile)
 *   - Burst: listens for window "tt-tree-hit"; spawns 10-14 leaves
 *
 * Spawn position is read from [data-tt-tree-canopy] at the moment of
 * spawn so leaves originate from wherever the tree actually is in the
 * viewport. Falls back to top-right if the canopy isn't on screen yet.
 *
 * Each leaf self-removes via animationend. Disabled under
 * prefers-reduced-motion.
 */

const LEAF_PATHS = [
  "M0 -8 C 5 -6 7 0 4 6 C 1 4 -3 4 -5 6 C -7 0 -5 -6 0 -8 Z",
  "M0 -7 C 4 -7 8 -2 5 5 C 2 3 -2 3 -5 5 C -8 -2 -4 -7 0 -7 Z",
  "M-1 -8 C 6 -6 6 2 2 7 C -1 5 -4 5 -6 7 C -8 0 -6 -7 -1 -8 Z",
];
const LEAF_COLORS = ["#86a07a", "#9bb38f", "#6f8a64", "#a8bd9c"];

function spawnLeaf(host: HTMLElement, opts: { burst?: boolean } = {}) {
  const leaf = document.createElement("div");
  const path = LEAF_PATHS[Math.floor(Math.random() * LEAF_PATHS.length)];
  const color = LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)];
  const size = 12 + Math.random() * 8;
  const duration = opts.burst
    ? 5 + Math.random() * 2.5
    : 22 + Math.random() * 12;

  const canopy = document
    .querySelector<SVGRectElement>("[data-tt-tree-canopy]")
    ?.getBoundingClientRect();
  let position: string;
  if (canopy && canopy.width > 0 && canopy.height > 0) {
    const x = canopy.left + Math.random() * canopy.width;
    const y = canopy.top + Math.random() * canopy.height;
    position = `top: ${y}px; left: ${x}px;`;
  } else {
    position = `top: ${4 + Math.random() * 14}vh; right: ${Math.random() * 14}vw;`;
  }

  leaf.style.cssText = `
    position: fixed;
    ${position}
    width: ${size}px;
    height: ${size}px;
    pointer-events: none;
    z-index: -5;
    animation: tt-leaf-drift ${duration}s linear forwards;
    animation-delay: ${opts.burst ? Math.random() * 0.8 : 0}s;
  `;
  leaf.setAttribute("aria-hidden", "true");
  leaf.innerHTML = `<svg viewBox="-10 -10 20 20" width="100%" height="100%"><path d="${path}" fill="${color}" opacity="0.86" transform="rotate(${Math.random() * 360})" /></svg>`;
  host.appendChild(leaf);
  leaf.addEventListener("animationend", () => leaf.remove(), { once: true });
}

export function FallingLeaves() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const isMobile = window.matchMedia("(max-width: 640px)").matches;
    const baseInterval = isMobile ? 7500 : 4000;
    const jitter = isMobile ? 3000 : 2000;

    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      spawnLeaf(host);
      timer = setTimeout(tick, baseInterval + Math.random() * jitter);
    };
    timer = setTimeout(tick, 1200);

    const onHit = () => {
      const count = 10 + Math.floor(Math.random() * 5);
      for (let i = 0; i < count; i++) spawnLeaf(host, { burst: true });
    };
    window.addEventListener("tt-tree-hit", onHit);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("tt-tree-hit", onHit);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-5 motion-reduce:hidden"
    />
  );
}
