// Circular arcs as model segments. One cubic Bézier per ≤ 90° of sweep: a single cubic is 2.7·10⁻⁴·r off a true
// circle at 90° but the error grows ~φ⁶ (0.012 mm for r = 8 at 120°), so wider arcs get more pieces.

import type { Segment } from '../document/model'
import { scale, type Vec2 } from '../lib/vec2'

/**
 * Segments for the arc around `centre` of `radius`, from angle `start` sweeping by `sweep` (radians, y-down,
 * positive = clockwise on screen). `from`/`to` pin the exact end points when the caller already has them, so
 * edges meeting the arc stay perfectly straight despite float drift in the angle maths.
 */
export function arcSegments(
  centre: Vec2,
  radius: number,
  start: number,
  sweep: number,
  from?: Vec2,
  to?: Vec2,
): Segment[] {
  const pieces = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2) - 1e-9))
  const step = sweep / pieces
  const k = (4 / 3) * Math.tan(Math.abs(step) / 4) * radius
  const dir = Math.sign(sweep) || 1
  const out: Segment[] = []
  for (let j = 0; j <= pieces; j++) {
    const a = start + step * j
    const exact: Vec2 = [centre[0] + radius * Math.cos(a), centre[1] + radius * Math.sin(a)]
    const p = j === 0 && from ? from : j === pieces && to ? to : exact
    // Unit tangent in the direction of travel.
    const tangent: Vec2 = [-Math.sin(a) * dir, Math.cos(a) * dir]
    const seg: Segment = { p }
    if (j > 0) seg.hi = scale(tangent, -k)
    if (j < pieces) seg.ho = scale(tangent, k)
    out.push(seg)
  }
  return out
}

/** The circle through three points, or null if they are (nearly) collinear. */
export function circleThrough(a: Vec2, b: Vec2, c: Vec2): { centre: Vec2; radius: number } | null {
  const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]))
  const span = Math.max(
    Math.abs(b[0] - a[0]),
    Math.abs(b[1] - a[1]),
    Math.abs(c[0] - a[0]),
    Math.abs(c[1] - a[1]),
    1e-9,
  )
  // Relative test: |d| scales with the square of the points' spread.
  if (Math.abs(d) < 1e-9 * span * span) return null
  const sq = (p: Vec2) => p[0] * p[0] + p[1] * p[1]
  const ux = (sq(a) * (b[1] - c[1]) + sq(b) * (c[1] - a[1]) + sq(c) * (a[1] - b[1])) / d
  const uy = (sq(a) * (c[0] - b[0]) + sq(b) * (a[0] - c[0]) + sq(c) * (b[0] - a[0])) / d
  const centre: Vec2 = [ux, uy]
  return { centre, radius: Math.hypot(a[0] - ux, a[1] - uy) }
}

const angleAt = (centre: Vec2, p: Vec2) => Math.atan2(p[1] - centre[1], p[0] - centre[0])

/** `a` mapped into [0, 2π). */
const positive = (a: number) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)

/** The arc from `start` to `end` that passes through `through`, as segments; null if the points are collinear. */
export function arcThrough(start: Vec2, through: Vec2, end: Vec2): Segment[] | null {
  const circle = circleThrough(start, through, end)
  if (!circle) return null
  const { centre, radius } = circle
  const a0 = angleAt(centre, start)
  // Angles of `through` and `end` measured clockwise (positive, y-down) from `start`, in [0, 2π).
  const t = positive(angleAt(centre, through) - a0)
  const e = positive(angleAt(centre, end) - a0)
  // Clockwise reaches `through` before `end`: go clockwise; otherwise anticlockwise.
  const sweep = t < e ? e : e - 2 * Math.PI
  return arcSegments(centre, radius, a0, sweep, start, end)
}
