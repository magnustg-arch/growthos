/**
 * Generates PWA icons for GrowthOS using only Node.js built-ins.
 * Creates: public/icons/icon-192.png, icon-512.png, apple-touch-icon.png
 *
 * Icon design: purple gradient background (#6c63ff) with white "G"
 * (solid color version — replace with a proper design tool if you want a logo later)
 */

import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dir = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dir, '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })

// CRC32 lookup table
const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let crc = 0xFFFFFFFF
  for (const byte of buf) crc = crcTable[(crc ^ byte) & 0xFF] ^ (crc >>> 8)
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.allocUnsafe(4)
  lenBuf.writeUInt32BE(data.length)
  const crcBuf = Buffer.allocUnsafe(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

/**
 * Create a PNG with a solid background and a simple letter "G" drawn with rectangles.
 * r,g,b = background colour (RGB 0-255)
 */
function createIconPNG(size, bgR, bgG, bgB) {
  // RGBA pixel array
  const px = new Uint8Array(size * size * 3)

  // Fill background
  for (let i = 0; i < size * size; i++) {
    px[i * 3]     = bgR
    px[i * 3 + 1] = bgG
    px[i * 3 + 2] = bgB
  }

  // Draw a rounded-ish white "G" using filled rectangles scaled to icon size
  const s = size / 64  // scale factor (icon designed on 64px grid)
  function rect(x, y, w, h) {
    for (let row = Math.round(y * s); row < Math.round((y + h) * s); row++) {
      for (let col = Math.round(x * s); col < Math.round((x + w) * s); col++) {
        if (row < 0 || row >= size || col < 0 || col >= size) continue
        const idx = (row * size + col) * 3
        px[idx] = 255; px[idx + 1] = 255; px[idx + 2] = 255
      }
    }
  }

  // "G" drawn on 64×64 grid (centred in 64px, starts at x=14)
  // Top horizontal bar
  rect(16, 12, 32, 6)
  // Left vertical bar
  rect(14, 12, 6, 40)
  // Bottom horizontal bar
  rect(16, 46, 32, 6)
  // Right vertical bar (bottom half only — classic G shape)
  rect(42, 32, 6, 20)
  // Middle horizontal bar (the "shelf" of G)
  rect(28, 32, 20, 6)

  // Build PNG raw (filter byte 0 per row + RGB)
  const rowLen = 1 + size * 3
  const raw = Buffer.alloc(size * rowLen)
  for (let y = 0; y < size; y++) {
    raw[y * rowLen] = 0 // filter: None
    for (let x = 0; x < size; x++) {
      raw[y * rowLen + 1 + x * 3]     = px[(y * size + x) * 3]
      raw[y * rowLen + 1 + x * 3 + 1] = px[(y * size + x) * 3 + 1]
      raw[y * rowLen + 1 + x * 3 + 2] = px[(y * size + x) * 3 + 2]
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 2  // RGB

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', deflateSync(raw)),
    makeChunk('IEND', Buffer.alloc(0)),
  ])
}

// GrowthOS purple: #6c63ff = rgb(108, 99, 255)
const R = 108, G = 99, B = 255

const files = [
  { name: 'icon-192.png',        size: 192 },
  { name: 'icon-512.png',        size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
]

for (const { name, size } of files) {
  const png = createIconPNG(size, R, G, B)
  writeFileSync(join(outDir, name), png)
  console.log(`✓ public/icons/${name}  (${size}×${size})`)
}

console.log('\nIkoner generert! 🎨')
