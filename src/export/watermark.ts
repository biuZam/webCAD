// Repeated diagonal text over an exported drawing (SVG, PNG) or over every PDF page.
// Pure layout here; svg.ts and pdf/index.ts draw it.

import type { Vec2 } from '../lib/vec2'

export interface Watermark {
  text: string
  /** 0–1. Default WATERMARK_OPACITY. */
  opacity?: number
}

export const WATERMARK_OPACITY = 0.15
export const WATERMARK_COLOR = '#808080'
/** Degrees, counter-clockwise as seen on the page. */
export const WATERMARK_ANGLE = 30

export interface WatermarkLayout {
  /** Font size, mm. */
  size: number
  /** Estimated text width, mm (the PDF measures it exactly). */
  width: number
  /** Text centres, mm. Each copy is rotated WATERMARK_ANGLE about its centre. */
  marks: Vec2[]
}

/** True if the watermark has something to print. */
export const hasWatermark = (w: Watermark | undefined): w is Watermark => !!w && w.text.trim() !== ''

/** Rough advance width in em: CJK and other wide scripts ≈ 1 em, Latin ≈ 0.6 em. */
function emWidth(text: string): number {
  return Array.from(text).reduce((sum, c) => sum + (c.codePointAt(0)! >= 0x2e80 ? 1 : 0.6), 0)
}

/** Copies of `text` in staggered rows tilted by WATERMARK_ANGLE, covering the rectangle (mm). */
export function layoutWatermark(text: string, x: number, y: number, w: number, h: number): WatermarkLayout {
  const size = Math.min(24, Math.max(4, Math.min(w, h) / 10))
  const width = emWidth(text.trim()) * size
  const stepX = width + 3 * size
  const stepY = 4 * size
  const cx = x + w / 2
  const cy = y + h / 2
  // Lay the grid out unrotated over a square that covers the rectangle at any angle, then rotate it.
  const half = Math.hypot(w, h) / 2 + stepX
  const a = (WATERMARK_ANGLE * Math.PI) / 180
  const [cos, sin] = [Math.cos(a), Math.sin(a)]
  const marks: Vec2[] = []
  const rows = Math.ceil(half / stepY)
  for (let r = -rows; r <= rows; r++) {
    const shift = r % 2 === 0 ? 0 : stepX / 2
    for (let u = -half + shift; u <= half; u += stepX) {
      const v = r * stepY
      // Counter-clockwise on a y-down page.
      const px = cx + u * cos + v * sin
      const py = cy - u * sin + v * cos
      if (px < x - width / 2 || px > x + w + width / 2 || py < y - width / 2 || py > y + h + width / 2) continue
      marks.push([px, py])
    }
  }
  return { size, width, marks }
}
