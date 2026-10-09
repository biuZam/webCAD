// T4.6 PNG preview: the SVG export rasterised in the browser, on white, at a chosen resolution.
// For sharing and previews only; it is not true scale on screen (use SVG/PDF/DXF for making).

/** Resolutions offered, in dots per inch. */
export const PNG_DPI = [96, 150, 300] as const

/** Width and height in mm, read from the SVG export's root element. */
export function svgSizeMm(svg: string): [number, number] | null {
  const m = svg.match(/<svg\b[^>]*\swidth="([\d.]+)mm"\s+height="([\d.]+)mm"/)
  return m ? [Number(m[1]), Number(m[2])] : null
}

/** Largest canvas side browsers reliably allocate. Bigger drawings are scaled down to fit. */
const MAX_SIDE_PX = 8192

/** Pixel size of the PNG for an SVG of `w × h` mm at `dpi`, clamped to MAX_SIDE_PX. */
export function pngSize(wMm: number, hMm: number, dpi: number): [number, number] {
  const scale = Math.min(dpi / 25.4, MAX_SIDE_PX / Math.max(wMm, hMm, 1e-9))
  return [Math.max(1, Math.round(wMm * scale)), Math.max(1, Math.round(hMm * scale))]
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/**
 * The PNG with a pHYs chunk (pixels per metre) right after IHDR, so image and print software know its real
 * size. Canvas encoders don't write one. Assumes the PNG has none yet (true for canvas output).
 */
export function withResolution(png: Uint8Array, dpi: number): Uint8Array<ArrayBuffer> {
  const IHDR_END = 8 + 25 // signature + IHDR (length, type, 13 bytes of data, CRC)
  const ppm = Math.round(dpi / 0.0254)
  const chunk = new Uint8Array(21)
  const view = new DataView(chunk.buffer)
  view.setUint32(0, 9)
  chunk.set([0x70, 0x48, 0x59, 0x73], 4) // "pHYs"
  view.setUint32(8, ppm)
  view.setUint32(12, ppm)
  chunk[16] = 1 // unit: metre
  view.setUint32(17, crc32(chunk.subarray(4, 17)))
  const out = new Uint8Array(png.length + chunk.length)
  out.set(png.subarray(0, IHDR_END))
  out.set(chunk, IHDR_END)
  out.set(png.subarray(IHDR_END), IHDR_END + chunk.length)
  return out
}

/** Rasterise an SVG export to a PNG blob (browser only). The PNG records its resolution so apps print it to size. */
export async function svgToPng(svg: string, dpi: number): Promise<Blob> {
  const size = svgSizeMm(svg)
  if (!size) throw new Error('Not an SVG export')
  const [w, h] = pngSize(size[0], size[1], dpi)
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const g = canvas.getContext('2d')
    if (!g) throw new Error('No 2D canvas')
    g.fillStyle = '#ffffff'
    g.fillRect(0, 0, w, h)
    g.drawImage(img, 0, 0, w, h)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('PNG encoding failed')
    // The resolution actually used (lower than asked if the size was clamped).
    const effectiveDpi = (w / size[0]) * 25.4
    return new Blob([withResolution(new Uint8Array(await blob.arrayBuffer()), effectiveDpi)], { type: 'image/png' })
  } finally {
    URL.revokeObjectURL(url)
  }
}
