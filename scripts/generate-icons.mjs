import sharp from "sharp";
import { writeFile } from "node:fs/promises";

const svgMaster = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#9b6bf5"/>
      <stop offset="100%" stop-color="#e5635c"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" rx="224" ry="224" fill="url(#g)"/>
  <text x="512" y="512"
        font-family="'Inter', 'Segoe UI', system-ui, sans-serif"
        font-size="560"
        font-weight="800"
        fill="#ffffff"
        text-anchor="middle"
        dominant-baseline="central">F</text>
</svg>`);

const targets = [
  { size: 192, out: "public/icons/icon-192.png" },
  { size: 512, out: "public/icons/icon-512.png" },
  { size: 180, out: "public/icons/apple-touch-icon.png" },
];

for (const { size, out } of targets) {
  await sharp(svgMaster)
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(out);
  process.stdout.write(`wrote ${out} (${size}x${size})\n`);
}

await writeFile("public/icons/icon-source.svg", svgMaster);
process.stdout.write("wrote public/icons/icon-source.svg\n");
