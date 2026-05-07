"use client";

import { useEffect, useRef } from "react";

/**
 * Interactive bouncing ball: a state machine across the whole viewport.
 *
 *   idle    → CSS tt-arc animation in the bottom 35% of the viewport
 *             (only until the user first grabs the ball)
 *   grabbed → user holds the ball; it follows the cursor (samples kept
 *             for release-velocity calculation)
 *   flung   → JS rAF physics: gravity, air drag, edge bounces with
 *             restitution, tree-canopy collision (dispatches tt-tree-hit)
 *   drift   → after a flung settles, the ball wanders slowly along the
 *             floor with a gently random-walking horizontal target
 *             velocity, until grabbed again
 *
 * Touch / reduced-motion: idle only (ball runs CSS arc, not grabbable).
 * Static under prefers-reduced-motion.
 */

const GRAVITY = 0.55;
const DRAG = 0.9985;
const RESTITUTION = 0.78;
const FLOOR_FRICTION = 0.93;
const SETTLE_VELOCITY = 3; // px/s
const SETTLE_FRAMES = 18;
const DRIFT_TARGET_MAX = 0.7; // px/frame at 60fps → ~42 px/s
const DRIFT_STEER_MS = 2200; // re-roll target every ~2s
const DRIFT_EASE = 0.04; // how fast vx eases toward vTarget
const DRIFT_FLOOR_FRICTION = 0.985;
const DRIFT_WALL_REFLECT = 0.55;
const BALL_SIZE = 32;
const RADIUS = BALL_SIZE / 2;
const TOP_NAV_GUARD = 64; // keep the ball out of the top-nav hit area

type Sample = { x: number; y: number; t: number };

export function BouncingBall() {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const ballRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const ball = ballRef.current;
    if (!wrapper || !ball) return;

    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      ball.style.animation = "none";
      return;
    }

    const isFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!isFinePointer) {
      // Touch: ambient arc only, no interaction
      return;
    }

    type State = "idle" | "grabbed" | "flung" | "drift";
    let state: State = "idle";
    let x = 0;
    let y = 0;
    let vx = 0;
    let vy = 0;
    let raf = 0;
    const samples: Sample[] = [];
    let lastFrameTime = 0;
    let lowVFrames = 0;
    let vTarget = 0;
    let lastSteerTime = 0;

    const setTransform = () => {
      ball.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };

    const lockToViewport = () => {
      // Fix the ball at its current position in the viewport, then mutate via transform
      const rect = ball.getBoundingClientRect();
      ball.style.animation = "none";
      ball.style.position = "fixed";
      ball.style.left = "0px";
      ball.style.top = "0px";
      x = rect.left;
      y = rect.top;
      setTransform();
    };

    const onPointerDown = (e: PointerEvent) => {
      if (state === "grabbed") return;
      if (state === "idle") lockToViewport();
      else cancelAnimationFrame(raf);
      state = "grabbed";
      ball.style.cursor = "grabbing";
      ball.setPointerCapture?.(e.pointerId);
      samples.length = 0;
      const rect = ball.getBoundingClientRect();
      const now = performance.now();
      samples.push({ x: rect.left + RADIUS, y: rect.top + RADIUS, t: now });
      e.preventDefault();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (state !== "grabbed") return;
      x = e.clientX - RADIUS;
      y = e.clientY - RADIUS;
      setTransform();
      const now = performance.now();
      samples.push({ x: e.clientX, y: e.clientY, t: now });
      // Keep recent samples only (last ~120ms)
      while (samples.length > 0 && now - samples[0].t > 120) samples.shift();
    };

    const onPointerUp = (e: PointerEvent) => {
      if (state !== "grabbed") return;
      ball.releasePointerCapture?.(e.pointerId);
      ball.style.cursor = "grab";

      // Compute release velocity from samples
      if (samples.length >= 2) {
        const first = samples[0];
        const last = samples[samples.length - 1];
        const dt = (last.t - first.t) / 1000;
        if (dt > 0) {
          // Convert px/s → px/frame (~60fps)
          vx = ((last.x - first.x) / dt) / 60;
          vy = ((last.y - first.y) / dt) / 60;
        } else {
          vx = 0;
          vy = 0;
        }
      } else {
        vx = 0;
        vy = 0;
      }

      // Cap absurdly fast throws
      const cap = 60;
      vx = Math.max(-cap, Math.min(cap, vx));
      vy = Math.max(-cap, Math.min(cap, vy));

      state = "flung";
      lowVFrames = 0;
      lastFrameTime = performance.now();
      raf = requestAnimationFrame(physicsTick);
    };

    const physicsTick = (now: number) => {
      if (state !== "flung") return;
      const dt = Math.min(2, (now - lastFrameTime) / 16.67); // frames elapsed
      lastFrameTime = now;

      vy += GRAVITY * dt;
      vx *= Math.pow(DRAG, dt);
      vy *= Math.pow(DRAG, dt);

      x += vx * dt;
      y += vy * dt;

      const W = window.innerWidth;
      const H = window.innerHeight;

      // Edge collisions
      if (x < 0) {
        x = 0;
        vx = -vx * RESTITUTION;
      } else if (x + BALL_SIZE > W) {
        x = W - BALL_SIZE;
        vx = -vx * RESTITUTION;
      }
      if (y < TOP_NAV_GUARD) {
        y = TOP_NAV_GUARD;
        vy = Math.abs(vy) * RESTITUTION;
      } else if (y + BALL_SIZE > H) {
        y = H - BALL_SIZE;
        vy = -vy * RESTITUTION;
        vx *= FLOOR_FRICTION;
      }

      // Tree canopy collision
      const canopyEl = document.querySelector<SVGRectElement>("[data-tt-tree-canopy]");
      if (canopyEl) {
        const canopy = canopyEl.getBoundingClientRect();
        if (
          x + BALL_SIZE > canopy.left &&
          x < canopy.right &&
          y + BALL_SIZE > canopy.top &&
          y < canopy.bottom
        ) {
          // Push out along smallest overlap and reflect
          const overlapL = x + BALL_SIZE - canopy.left;
          const overlapR = canopy.right - x;
          const overlapT = y + BALL_SIZE - canopy.top;
          const overlapB = canopy.bottom - y;
          const minOverlap = Math.min(overlapL, overlapR, overlapT, overlapB);
          if (minOverlap === overlapL) {
            x = canopy.left - BALL_SIZE;
            vx = -Math.abs(vx) * RESTITUTION;
          } else if (minOverlap === overlapR) {
            x = canopy.right;
            vx = Math.abs(vx) * RESTITUTION;
          } else if (minOverlap === overlapT) {
            y = canopy.top - BALL_SIZE;
            vy = -Math.abs(vy) * RESTITUTION;
          } else {
            y = canopy.bottom;
            vy = Math.abs(vy) * RESTITUTION;
          }
          window.dispatchEvent(
            new CustomEvent("tt-tree-hit", {
              detail: { x: x + RADIUS, y: y + RADIUS },
            })
          );
        }
      }

      setTransform();

      const speed = Math.hypot(vx, vy) * 60; // back to px/s
      const onFloor = y + BALL_SIZE >= H - 1;
      if (onFloor && speed < SETTLE_VELOCITY) {
        lowVFrames++;
      } else {
        lowVFrames = 0;
      }

      if (lowVFrames > SETTLE_FRAMES) {
        startDrift();
        return;
      }

      raf = requestAnimationFrame(physicsTick);
    };

    const startDrift = () => {
      state = "drift";
      lastFrameTime = performance.now();
      lastSteerTime = lastFrameTime;
      // Pick an initial target away from the wall the ball is closest to
      const W = window.innerWidth;
      const center = x + RADIUS;
      vTarget = center > W / 2
        ? -(0.3 + Math.random() * (DRIFT_TARGET_MAX - 0.3))
        : (0.3 + Math.random() * (DRIFT_TARGET_MAX - 0.3));
      raf = requestAnimationFrame(driftTick);
    };

    const driftTick = (now: number) => {
      if (state !== "drift") return;
      const dt = Math.min(2, (now - lastFrameTime) / 16.67);
      lastFrameTime = now;

      // Re-roll target every DRIFT_STEER_MS so the ball wanders rather than
      // bee-lines for one wall.
      if (now - lastSteerTime > DRIFT_STEER_MS) {
        lastSteerTime = now;
        const sign = Math.random() < 0.5 ? -1 : 1;
        vTarget = sign * (0.25 + Math.random() * (DRIFT_TARGET_MAX - 0.25));
      }

      // Ease vx toward vTarget; gravity keeps it on the floor.
      vx += (vTarget - vx) * DRIFT_EASE * dt;
      vy += GRAVITY * dt;

      x += vx * dt;
      y += vy * dt;

      const W = window.innerWidth;
      const H = window.innerHeight;

      if (x < 0) {
        x = 0;
        vx = Math.abs(vx) * DRIFT_WALL_REFLECT;
        vTarget = Math.abs(vTarget); // steer away from wall
      } else if (x + BALL_SIZE > W) {
        x = W - BALL_SIZE;
        vx = -Math.abs(vx) * DRIFT_WALL_REFLECT;
        vTarget = -Math.abs(vTarget);
      }

      if (y + BALL_SIZE > H) {
        y = H - BALL_SIZE;
        // Gently quench vertical bounce; keep horizontal drift alive.
        vy = -vy * 0.25;
        if (Math.abs(vy) < 0.4) vy = 0;
        vx *= DRIFT_FLOOR_FRICTION;
      }

      setTransform();
      raf = requestAnimationFrame(driftTick);
    };

    ball.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    ball.style.cursor = "grab";

    return () => {
      cancelAnimationFrame(raf);
      ball.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      aria-hidden
      className="fixed left-0 right-0 pointer-events-none motion-reduce:hidden"
      style={{
        bottom: 0,
        height: "35vh",
        overflow: "visible",
        zIndex: 20,
      }}
    >
      <div
        ref={ballRef}
        style={{
          width: `${BALL_SIZE}px`,
          height: `${BALL_SIZE}px`,
          animation: "tt-arc 14s ease-in-out infinite",
          pointerEvents: "auto",
          touchAction: "none",
        }}
      >
        <Ball />
      </div>
    </div>
  );
}

export function Ball({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 36 36" width={size} height={size} className={className} aria-hidden>
      <defs>
        <radialGradient id="bg-ball" cx="35%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#fbeae2" />
          <stop offset="80%" stopColor="#e8d5c5" />
          <stop offset="100%" stopColor="#c8a899" />
        </radialGradient>
      </defs>
      <circle cx="18" cy="18" r="15" fill="url(#bg-ball)" stroke="var(--ink)" strokeWidth="1.4" />
      <ellipse cx="13" cy="12" rx="4" ry="2.5" fill="rgba(255,255,255,0.6)" />
      <path
        d="M9 22 q9 5 18 -1"
        fill="none"
        stroke="var(--ink)"
        strokeWidth="0.9"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}
