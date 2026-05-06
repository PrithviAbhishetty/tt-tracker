/**
 * Sumi-e tree anchored to the right edge of every page.
 *
 * Trunk + branches: layered ink strokes (pale wash → mid → dark accent)
 * passed through a feTurbulence + feDisplacementMap filter so edges read
 * as hand-painted. Secondary twigs fan out from each main branch to give
 * the canopy something to attach to.
 *
 * Foliage: a deterministic scatter of small almond-shaped leaf marks per
 * cluster, layered over a faint sage wash. Each cluster carries two
 * transform layers — an outer wind translate (tt-tree-wind) and an inner
 * rotation sway (tt-tree-sway) — so the canopy bends and rustles out of
 * phase from cluster to cluster.
 *
 * Exposes the canopy hitbox via data-tt-tree-canopy for BouncingBall
 * collision detection.
 */

const LEAF_TONES = ["#a8bd9c", "#9bb38f", "#86a07a", "#6f8a64", "#4a6a42"];
const LEAF_PATH = "M0 -3 Q 2.4 -1 1.5 2.7 Q 0 2.1 -1.5 2.7 Q -2.4 -1 0 -3 Z";

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

type LeafMark = {
  x: number;
  y: number;
  rot: number;
  scale: number;
  fill: string;
  opacity: number;
};

function scatterLeaves(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  count: number,
  seed: number,
): LeafMark[] {
  const rand = mulberry32(seed);
  const leaves: LeafMark[] = [];
  for (let i = 0; i < count; i++) {
    // Sample a point inside an ellipse with a slight bias toward the centre
    // so the cluster has a fuller core and feathered edges.
    const theta = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * (0.55 + rand() * 0.55);
    const x = cx + Math.cos(theta) * rx * r;
    const y = cy + Math.sin(theta) * ry * r;
    const rot = rand() * 360;
    const scale = 0.75 + rand() * 0.85;
    const fill = LEAF_TONES[Math.floor(rand() * LEAF_TONES.length)];
    const opacity = 0.55 + rand() * 0.4;
    leaves.push({ x, y, rot, scale, fill, opacity });
  }
  return leaves;
}

type Cluster = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  count: number;
  seed: number;
  swayDur: number;
  swayDelay: number;
  windDur: number;
  windDelay: number;
};

const CLUSTERS: Cluster[] = [
  { cx: 200, cy: 120, rx: 64, ry: 50, count: 55, seed: 11, swayDur: 7, swayDelay: 0, windDur: 9, windDelay: 0 },
  { cx: 150, cy: 150, rx: 48, ry: 38, count: 42, seed: 23, swayDur: 9, swayDelay: -1.5, windDur: 11, windDelay: -2.4 },
  { cx: 240, cy: 90, rx: 42, ry: 34, count: 36, seed: 47, swayDur: 8, swayDelay: -3, windDur: 7.5, windDelay: -1.1 },
  { cx: 188, cy: 60, rx: 36, ry: 30, count: 30, seed: 71, swayDur: 10, swayDelay: -2.2, windDur: 8.5, windDelay: -3.6 },
  { cx: 120, cy: 110, rx: 32, ry: 26, count: 28, seed: 91, swayDur: 8.5, swayDelay: -4, windDur: 10, windDelay: -0.8 },
  { cx: 168, cy: 200, rx: 34, ry: 26, count: 32, seed: 109, swayDur: 7.5, swayDelay: -0.8, windDur: 8, windDelay: -2.0 },
];

function ClusterFoliage({ c }: { c: Cluster }) {
  const leaves = scatterLeaves(c.cx, c.cy, c.rx, c.ry, c.count, c.seed);
  return (
    <g
      style={{
        transformOrigin: `${c.cx}px ${c.cy + c.ry * 0.6}px`,
        animation: `tt-tree-wind ${c.windDur}s ease-in-out infinite`,
        animationDelay: `${c.windDelay}s`,
      }}
    >
      <g
        style={{
          transformOrigin: `${c.cx}px ${c.cy}px`,
          animation: `tt-tree-sway ${c.swayDur}s ease-in-out infinite`,
          animationDelay: `${c.swayDelay}s`,
        }}
        filter="url(#tree-brush)"
      >
        {/* Faint underlying wash so leaves read as a mass, not isolated marks */}
        <ellipse cx={c.cx} cy={c.cy} rx={c.rx * 0.92} ry={c.ry * 0.92} fill="url(#foliage-wash)" opacity="0.55" />
        {leaves.map((l, i) => (
          <path
            key={i}
            d={LEAF_PATH}
            transform={`translate(${l.x.toFixed(2)} ${l.y.toFixed(2)}) rotate(${l.rot.toFixed(1)}) scale(${l.scale.toFixed(2)})`}
            fill={l.fill}
            opacity={l.opacity}
          />
        ))}
      </g>
    </g>
  );
}

export function TreeScene() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed -z-10"
      style={{
        right: 0,
        bottom: 0,
        width: "min(28rem, 60vw)",
        height: "min(34rem, 80vh)",
      }}
    >
      <svg
        viewBox="0 0 280 380"
        width="100%"
        height="100%"
        preserveAspectRatio="xMaxYMax meet"
        aria-hidden
      >
        <defs>
          <filter id="tree-brush" x="-8%" y="-8%" width="116%" height="116%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <radialGradient id="foliage-wash" cx="42%" cy="36%" r="72%">
            <stop offset="0%" stopColor="#a8bd9c" />
            <stop offset="55%" stopColor="#86a07a" />
            <stop offset="100%" stopColor="#5a7a4f" />
          </radialGradient>
        </defs>

        {/* Trunk + branches — layered brush strokes under tree-brush */}
        <g filter="url(#tree-brush)">
          {/* Trunk: pale halo, main, dark grain, dry-brush skip */}
          <path d="M232 380 C 226 320 222 270 214 224 C 208 188 198 156 184 124" fill="none" stroke="#7a3a36" strokeWidth="13" strokeLinecap="round" opacity="0.28" />
          <path d="M232 380 C 226 320 222 270 214 224 C 208 188 198 156 184 124" fill="none" stroke="var(--paper-edge)" strokeWidth="8.5" strokeLinecap="round" opacity="0.94" />
          <path d="M230 370 C 224 310 220 264 214 220" fill="none" stroke="#3e1a18" strokeWidth="2.2" strokeLinecap="round" opacity="0.55" />
          <path d="M226 340 C 222 296 218 252 212 220" fill="none" stroke="#5a2422" strokeWidth="1.4" strokeLinecap="round" opacity="0.5" strokeDasharray="3 7 12 5" />

          {/* Main branches */}
          <path d="M214 224 C 196 214 172 208 146 210" fill="none" stroke="#7a3a36" strokeWidth="7" strokeLinecap="round" opacity="0.25" />
          <path d="M214 224 C 196 214 172 208 146 210" fill="none" stroke="var(--paper-edge)" strokeWidth="4.2" strokeLinecap="round" opacity="0.92" />

          <path d="M210 200 C 196 184 178 168 158 158" fill="none" stroke="#7a3a36" strokeWidth="6" strokeLinecap="round" opacity="0.22" />
          <path d="M210 200 C 196 184 178 168 158 158" fill="none" stroke="var(--paper-edge)" strokeWidth="3.2" strokeLinecap="round" opacity="0.88" />

          <path d="M198 156 C 184 140 162 124 138 116" fill="none" stroke="#7a3a36" strokeWidth="5.4" strokeLinecap="round" opacity="0.22" />
          <path d="M198 156 C 184 140 162 124 138 116" fill="none" stroke="var(--paper-edge)" strokeWidth="3" strokeLinecap="round" opacity="0.88" />

          <path d="M192 138 C 198 110 200 82 196 56" fill="none" stroke="#7a3a36" strokeWidth="6" strokeLinecap="round" opacity="0.24" />
          <path d="M192 138 C 198 110 200 82 196 56" fill="none" stroke="var(--paper-edge)" strokeWidth="3.4" strokeLinecap="round" opacity="0.9" />

          <path d="M204 188 C 226 170 244 144 250 112" fill="none" stroke="#7a3a36" strokeWidth="5" strokeLinecap="round" opacity="0.2" />
          <path d="M204 188 C 226 170 244 144 250 112" fill="none" stroke="var(--paper-edge)" strokeWidth="2.8" strokeLinecap="round" opacity="0.82" />

          <path d="M186 124 C 178 106 166 90 150 82" fill="none" stroke="var(--paper-edge)" strokeWidth="2.2" strokeLinecap="round" opacity="0.78" />
          <path d="M196 90 C 192 76 188 64 184 52" fill="none" stroke="var(--paper-edge)" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />

          {/* Secondary twigs — thin, branching off the main branches */}
          <path d="M178 210 C 168 204 158 198 148 192" fill="none" stroke="var(--paper-edge)" strokeWidth="1.3" strokeLinecap="round" opacity="0.65" />
          <path d="M170 210 C 162 218 156 226 152 234" fill="none" stroke="var(--paper-edge)" strokeWidth="1.1" strokeLinecap="round" opacity="0.6" />
          <path d="M186 178 C 174 168 162 162 152 158" fill="none" stroke="var(--paper-edge)" strokeWidth="1.3" strokeLinecap="round" opacity="0.62" />
          <path d="M174 148 C 162 142 150 138 138 136" fill="none" stroke="var(--paper-edge)" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
          <path d="M168 130 C 156 124 144 122 132 124" fill="none" stroke="var(--paper-edge)" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
          <path d="M198 116 C 204 102 208 90 210 78" fill="none" stroke="var(--paper-edge)" strokeWidth="1.3" strokeLinecap="round" opacity="0.62" />
          <path d="M200 100 C 210 92 220 86 230 82" fill="none" stroke="var(--paper-edge)" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
          <path d="M222 162 C 232 152 240 142 244 130" fill="none" stroke="var(--paper-edge)" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
          <path d="M124 110 C 116 116 110 124 108 134" fill="none" stroke="var(--paper-edge)" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
          <path d="M148 158 C 138 162 130 168 124 178" fill="none" stroke="var(--paper-edge)" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
        </g>

        {/* Canopy hitbox — invisible, exposed via data attribute */}
        <rect data-tt-tree-canopy="" x="60" y="20" width="220" height="180" fill="transparent" />

        {/* Foliage clusters — leaf-mark scatter per anchor */}
        {CLUSTERS.map((c) => (
          <ClusterFoliage key={c.seed} c={c} />
        ))}
      </svg>
    </div>
  );
}
