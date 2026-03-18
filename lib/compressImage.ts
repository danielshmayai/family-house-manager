/**
 * Compress an image File/Blob to a base64 JPEG string.
 *
 * Strategy:
 *  1. Resize so the longer edge is at most MAX_DIMENSION pixels.
 *  2. Encode as JPEG at the starting quality.
 *  3. If the result is still above MAX_BYTES, halve the quality and retry
 *     until quality drops below MIN_QUALITY or the size target is met.
 */

const MAX_DIMENSION = 1200  // px – longest edge
const MAX_BYTES = 300_000   // 300 KB
const INITIAL_QUALITY = 0.8
const MIN_QUALITY = 0.2

export async function compressImage(file: File): Promise<string> {
  const dataUrl = await readAsDataURL(file)
  const img = await loadImage(dataUrl)

  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.round(img.naturalWidth * scale)
  const h = Math.round(img.naturalHeight * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)

  let quality = INITIAL_QUALITY
  let result = canvas.toDataURL('image/jpeg', quality)

  while (base64Bytes(result) > MAX_BYTES && quality > MIN_QUALITY) {
    quality = Math.max(MIN_QUALITY, quality - 0.15)
    result = canvas.toDataURL('image/jpeg', quality)
  }

  return result
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target!.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/** Approximate byte size of a base64 data-URL */
function base64Bytes(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] ?? ''
  return Math.ceil(base64.length * 0.75)
}
