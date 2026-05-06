// Generate PNG icons (192, 512, and a 512 maskable variant) from public/icons/icon.svg.
// Run with: node scripts/generate-icons.mjs
import sharp from "sharp";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const svgPath = resolve(root, "public/icons/icon.svg");
const outDir = resolve(root, "public/icons");
mkdirSync(outDir, { recursive: true });

const svg = readFileSync(svgPath);

async function render(size, outName, { padding = 0, background = null } = {}) {
  const inner = size - padding * 2;
  let pipeline = sharp(svg).resize(inner, inner);
  let buf = await pipeline.png().toBuffer();
  if (padding > 0 || background) {
    buf = await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: background || { r: 22, g: 163, b: 74, alpha: 1 },
      },
    })
      .composite([{ input: buf, top: padding, left: padding }])
      .png()
      .toBuffer();
  }
  await sharp(buf).png().toFile(resolve(outDir, outName));
  console.log("wrote", outName);
}

await render(192, "icon-192.png");
await render(512, "icon-512.png");
// Maskable: keep the meaningful art inside the safe area (~80% of the canvas).
// Use a solid background color so OS-applied masks don't reveal transparent corners.
await render(512, "icon-maskable-512.png", { padding: 64 });
// Apple-touch-icon size
await render(180, "apple-touch-icon.png");
console.log("done");
