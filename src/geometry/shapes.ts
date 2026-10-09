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

/** Longest arrowhead of a grain arrow (mm); shorter arrows get heads a quarter of their length. */
export const GRAIN_ARROW_HEAD = 5

/**
 * D10 Grain (backbone) arrow from `a` to `b` with a head at both ends, as one open polyline that runs
 * through each head (barb → tip → barb → tip): a single path entity, exported as one `<path>`.
 */
export function grainArrowSegments(a: Vec2, b: Vec2): Segment[] {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1])
  if (len === 0) return []
  const u: Vec2 = [(b[0] - a[0]) / len, (b[1] - a[1]) / len]
  const head = Math.min(GRAIN_ARROW_HEAD, len / 4)
  // Barbs at ±30° from the shaft.
  const back = head * Math.cos(Math.PI / 6)
  const side = head * Math.sin(Math.PI / 6)
  const barb = (tip: Vec2, dir: 1 | -1, s: 1 | -1): Vec2 => [
    tip[0] - dir * u[0] * back - s * u[1] * side,
    tip[1] - dir * u[1] * back + s * u[0] * side,
  ]
  // Head at a points back towards b (dir −1), head at b points away from a (dir +1).
  return [
    { p: barb(a, -1, 1) },
    { p: a },
    { p: barb(a, -1, -1) },
    { p: a },
    { p: b },
    { p: barb(b, 1, 1) },
    { p: b },
    { p: barb(b, 1, -1) },
  ]
}
