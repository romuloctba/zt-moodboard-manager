/**
 * PWA Icon Generator Script
 * 
 * Run with: node scripts/generate-icons.mjs
 * 
 * Generates PNG icons for PWA manifest.
 * Only 192x192 and 512x512 are required by the PWA spec.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Only the essential sizes for PWA
const ICON_SIZES = [192, 512];
const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

// Generate SVG icon (purple gradient with "M" letter for Moodboard)
function generateSVG(size) {
  const fontSize = Math.floor(size * 0.5);
  const cornerRadius = Math.floor(size * 0.15);
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#7c3aed;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#4f46e5;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${cornerRadius}" fill="url(#grad)"/>
  <text x="50%" y="55%" dominant-baseline="central" text-anchor="middle" 
        font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="${fontSize}" fill="white">M</text>
</svg>`;
}

async function main() {
  console.log('Generating PWA icons...\n');

  for (const size of ICON_SIZES) {
    const svgContent = generateSVG(size);
    const pngFilename = `icon-${size}x${size}.png`;
    const pngFilepath = path.join(ICONS_DIR, pngFilename);
    
    await sharp(Buffer.from(svgContent))
      .png()
      .toFile(pngFilepath);
    
    console.log(`✓ Created ${pngFilename}`);
  }

  // Create apple-touch-icon (180x180)
  const appleTouchIcon = path.join(ICONS_DIR, 'apple-touch-icon.png');
  await sharp(Buffer.from(generateSVG(180)))
    .png()
    .toFile(appleTouchIcon);
  console.log(`✓ Created apple-touch-icon.png`);

  // Create favicon (32x32)
  const faviconPath = path.join(__dirname, '..', 'public', 'favicon.png');
  await sharp(Buffer.from(generateSVG(32)))
    .png()
    .toFile(faviconPath);
  console.log(`✓ Created favicon.png`);

  console.log('\n✨ All icons generated!');
}

main().catch(console.error);
