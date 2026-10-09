// Builders that turn tool input into model geometry.

import type { Segment } from '../document/model'
import type { Vec2 } from '../lib/vec2'

/** Handle length for a cubic Bézier approximating a quarter circle of radius 1. */
export const KAPPA = 0.5522847498307936

/**
 * Axis-aligned rectangle from two opposite corners, clockwise in y-down space starting at the top-left.
 * A positive `radius` rounds every corner with a quarter-circle Bézier; it is clamped to half the shorter side.
 */
export function rectangleSegments(a: Vec2, b: Vec2, radius = 0): Segment[] {
  const [x0, x1] = [Math.min(a[0], b[0]), Math.max(a[0], b[0])]
  const [y0, y1] = [Math.min(a[1], b[1]), Math.max(a[1], b[1])]
  const r = Math.max(0, Math.min(radius, (x1 - x0) / 2, (y1 - y0) / 2))
  if (r === 0) return [{ p: [x0, y0] }, { p: [x1, y0] }, { p: [x1, y1] }, { p: [x0, y1] }]

  const k = KAPPA * r
  // Each corner contributes two anchors: where the straight edge ends and where the next one starts.
  // When r is exactly half a side the straight edge has zero length and two anchors coincide; that is
  // harmless for rendering and export, and keeps the segment count predictable for later edits.
  return [
    { p: [x0 + r, y0], hi: [-k, 0] },
    { p: [x1 - r, y0], ho: [k, 0] },
    { p: [x1, y0 + r], hi: [0, -k] },
    { p: [x1, y1 - r], ho: [0, k] },
    { p: [x1 - r, y1], hi: [k, 0] },
    { p: [x0 + r, y1], ho: [-k, 0] },
    { p: [x0, y1 - r], hi: [0, k] },
    { p: [x0, y0 + r], ho: [0, -k] },
  ]
}
