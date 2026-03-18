/**
 * Generates public/icons/icon-192.png and icon-512.png
 * from an inline SVG house icon using sharp (bundled with Next.js).
 *
 * Run once:  node scripts/generate-icons.js
 */

const sharp = require('../node_modules/sharp')
const fs = require('fs')
const path = require('path')

const outDir = path.join(__dirname, '..', 'public', 'icons')
fs.mkdirSync(outDir, { recursive: true })

// House SVG — designed on a 100×100 grid, scaled by sharp to target size
const svg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <!-- rounded background -->
  <rect width="100" height="100" rx="22" fill="#1a56db"/>
  <!-- roof -->
  <polygon points="50,15 85,46 15,46" fill="white"/>
  <!-- chimney -->
  <rect x="62" y="22" width="8" height="16" rx="2" fill="white"/>
  <!-- walls -->
  <rect x="24" y="46" width="52" height="36" rx="3" fill="white"/>
  <!-- door -->
  <rect x="42" y="62" width="16" height="20" rx="3" fill="#1a56db"/>
  <!-- left window -->
  <rect x="29" y="53" width="12" height="11" rx="2" fill="#1a56db"/>
  <!-- right window -->
  <rect x="59" y="53" width="12" height="11" rx="2" fill="#1a56db"/>
</svg>`

async function generate(size, filename) {
  const buf = Buffer.from(svg(size))
  await sharp(buf)
    .resize(size, size)
    .png()
    .toFile(path.join(outDir, filename))
  console.log(`✓ ${filename}`)
}

;(async () => {
  await generate(192, 'icon-192.png')
  await generate(512, 'icon-512.png')
  await generate(180, 'apple-touch-icon.png')  // standard iOS size
  // Also overwrite the SVG with the house design (keeps it consistent)
  fs.writeFileSync(path.join(outDir, 'icon-192.svg'), svg(192))
  console.log('✓ icon-192.svg')
  console.log('Done.')
})()
