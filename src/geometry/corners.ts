// M1 Fillet and M2 Chamfer on the corners of a path: an anchor where two straight edges meet at an angle.
// Pure geometry on model segments (mm); no Paper.js needed.

import type { Segment } from '../document/model'
import { add, distance, scale, sub, type Vec2 } from '../lib/vec2'
import { arcSegments } from './arcs'

/** Below this turn (degrees) two edges are treated as collinear: there is no corner to round. */
const MIN_TURN_DEG = 0.5
const EPS = 1e-9

export interface Corner {
  index: number
  point: Vec2
  /** Unit vectors from the corner along the incoming (back to previous anchor) and outgoing edges. */
  u: Vec2
  v: Vec2
  /** Lengths of those two edges. */
  lenU: number
  lenV: number
  /** Interior angle between the edges, radians (π = straight, small = sharp). */
  theta: number
}

const unit = (a: Vec2, len: number): Vec2 => [a[0] / len, a[1] / len]

/** The corner at anchor `i`, or null if it isn't one (path end, a curved edge on either side, or collinear). */
export function cornerAt(segments: readonly Segment[], closed: boolean, i: number): Corner | null {
  const n = segments.length
  if (n < 3) return null
  const prevIndex = i > 0 ? i - 1 : closed ? n - 1 : -1
  const nextIndex = i < n - 1 ? i + 1 : closed ? 0 : -1
  if (prevIndex < 0 || nextIndex < 0) return null
  const prev = segments[prevIndex]
  const here = segments[i]
  const next = segments[nextIndex]
  // Both edges must be straight: no handles on either end of either edge.
  if (prev.ho || here.hi || here.ho || next.hi) return null
  const a = sub(prev.p, here.p)
  const b = sub(next.p, here.p)
  const lenU = Math.hypot(a[0], a[1])
  const lenV = Math.hypot(b[0], b[1])
  if (lenU < EPS || lenV < EPS) return null
  const u = unit(a, lenU)
  const v = unit(b, lenV)
  const theta = Math.acos(Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1])))
  if (Math.PI - theta < (MIN_TURN_DEG * Math.PI) / 180) return null
  return { index: i, point: here.p, u, v, lenU, lenV, theta }
}

/** Indices of every corner that can be filleted or chamfered. */
export function corners(segments: readonly Segment[], closed: boolean): number[] {
  return segments.map((_, i) => i).filter((i) => cornerAt(segments, closed, i) !== null)
}

export type CornerResult = { segments: Segment[] } | { error: 'tooLarge'; max: number } | { error: 'notACorner' }

/** Replace anchor `i` with `replacement` anchors. */
function replaceAnchor(segments: readonly Segment[], i: number, replacement: Segment[]): Segment[] {
  return [...segments.slice(0, i), ...replacement, ...segments.slice(i + 1)]
}

/**
 * Round the corner with a tangent arc of `radius`. The edges are shortened by r / tan(θ/2) each. The arc is one
 * cubic Bézier per ≤ 90° of sweep (handle length (4/3)·tan(φ/4)·r): a single cubic is 2.7·10⁻⁴·r off a true
 * circle at 90°, but the error grows ~φ⁶ (0.012 mm for r = 8 at 120°), so sharper corners get more pieces.
 */
export function filletCorner(segments: readonly Segment[], closed: boolean, i: number, radius: number): CornerResult {
  const c = cornerAt(segments, closed, i)
  if (!c) return { error: 'notACorner' }
  if (!(radius > 0)) return { segments: [...segments] }
  const t = radius / Math.tan(c.theta / 2)
  const maxT = Math.min(c.lenU, c.lenV)
  if (t > maxT + EPS) return { error: 'tooLarge', max: maxT * Math.tan(c.theta / 2) }

  // Centre on the bisector, r / sin(θ/2) from the corner; the arc runs from T1 (on the incoming edge) to T2.
  const bis = unit(add(c.u, c.v), Math.hypot(c.u[0] + c.v[0], c.u[1] + c.v[1]))
  const centre = add(c.point, scale(bis, radius / Math.sin(c.theta / 2)))
  const t1 = add(c.point, scale(c.u, t))
  const t2 = add(c.point, scale(c.v, t))
  const a1 = Math.atan2(t1[1] - centre[1], t1[0] - centre[0])
  let sweep = Math.atan2(t2[1] - centre[1], t2[0] - centre[0]) - a1
  // The fillet arc is always the short way round (|sweep| = π − θ < π).
  if (sweep > Math.PI) sweep -= 2 * Math.PI
  if (sweep < -Math.PI) sweep += 2 * Math.PI
  const arc = arcSegments(centre, radius, a1, sweep, t1, t2)
  return { segments: replaceAnchor(segments, i, arc) }
}

/** Cut the corner straight: `d1` along the incoming edge and `d2` along the outgoing edge. */
export function chamferCorner(
  segments: readonly Segment[],
  closed: boolean,
  i: number,
  d1: number,
  d2: number,
): CornerResult {
  const c = cornerAt(segments, closed, i)
  if (!c) return { error: 'notACorner' }
  if (d1 > c.lenU + EPS || d2 > c.lenV + EPS) return { error: 'tooLarge', max: Math.min(c.lenU, c.lenV) }
  if (!(d1 > 0) || !(d2 > 0)) return { segments: [...segments] }
  return {
    segments: replaceAnchor(segments, i, [{ p: add(c.point, scale(c.u, d1)) }, { p: add(c.point, scale(c.v, d2)) }]),
  }
}

/**
 * Second chamfer distance for a cut that starts `d1` along the incoming edge and meets it at `angleDeg`
 * (law of sines in the cut-off triangle). Null if the cut would never reach the outgoing edge.
 */
export function chamferDistanceForAngle(corner: Corner, d1: number, angleDeg: number): number | null {
  const alpha = (angleDeg * Math.PI) / 180
  const gamma = Math.PI - corner.theta - alpha
  if (alpha <= 0 || gamma <= 0) return null
  return (d1 * Math.sin(alpha)) / Math.sin(gamma)
}

/** Apply `op` to several corners of one path; works from the last index down so earlier indices stay valid. */
export function applyToCorners(
  segments: readonly Segment[],
  indices: readonly number[],
  op: (segs: Segment[], i: number) => CornerResult,
): CornerResult {
  let current = [...segments]
  for (const i of [...indices].sort((a, b) => b - a)) {
    const r = op(current, i)
    if ('error' in r) return r
    current = r.segments
  }
  return { segments: current }
}

/** Distance from `p` to a corner's anchor (for picking the corner under the cursor). */
export const cornerDistance = (c: Corner, p: Vec2) => distance(c.point, p)
