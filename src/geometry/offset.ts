// M3 Offset (and later L1 stitch lines, L6 seam allowance). Synchronous on purpose: derived stitch lines are
// regenerated inside the same Immer draft as the edit to their source (docs/ARCHITECTURE.md A6).
//
// Strategy:
//   circle          → exact (radius ± d)
//   centre line     → exact (translated along its normal)
//   path / ellipse  → paperjs-offset, checked two ways: its own structural analysis (self-intersections,
//                     containment) and our distance check (every curved part within OFFSET_TOLERANCE of d).
//                     paperjs-offset approximates each curve's offset with one Bézier, which was measured at
//                     up to 0.15 mm off on a r10 corner (0.3 mm on r20): too much for 1:1 patterns. So on a
//                     miss the source curves are subdivided 4×/8×/16× and offset again (error falls ~4× per
//                     doubling). Closed shapes that still miss fall back to Clipper on a flattened polygon
//                     (~0.004 mm, but polylines); open shapes return the best attempt with a warning.
//
// Sign convention: for closed shapes +d is outward; for open shapes +d is on the side of Paper's normal
// (for a path drawn left→right on screen, that is above it). Use `offsetSide` to get the sign for a cursor.

import ClipperLib from 'clipper-lib'
import { analyze, offset as paperOffset } from 'paperjs-offset'
import type { Entity, JoinStyle, Segment } from '../document/model'
import type { Vec2 } from '../lib/vec2'
import { fromPaperPath, kernel } from './kernel'
import { entityShape } from './query'

export type OffsetShape =
  | { type: 'path'; segments: Segment[]; closed: boolean }
  | { type: 'circle'; center: Vec2; rx: number; ry: number; rotation: number }

export interface OffsetResult {
  shapes: OffsetShape[]
  method: 'exact' | 'paperjs-offset' | 'clipper' | 'none'
  /** Non-empty when the result is a best effort that failed a quality check. */
  warnings: string[]
}

/** Miter joins longer than this × the distance are bevelled (SVG's default miter limit is 4). */
export const MITER_LIMIT = 4
/** Curves are flattened to this tolerance (mm) for the Clipper fallback; well under print accuracy. */
const FLATTEN_TOLERANCE = 0.01
/** Clipper works on integers: 1 unit = 1 µm. */
const CLIPPER_SCALE = 1000
/** Max allowed deviation (mm) of an offset curve from the requested distance: 10% of the ±0.2 mm print budget. */
export const OFFSET_TOLERANCE = 0.02
/** Most pieces each source curve is split into before giving up on curves (and falling back to Clipper). */
const MAX_SUBDIVISION = 32
/** Distance samples per curved result segment (the error peaks mid-curve). */
const SAMPLE_TIMES = [0.25, 0.5, 0.75]

const NONE: OffsetResult = { shapes: [], method: 'none', warnings: [] }

function isClosedShape(entity: Entity): boolean {
  return entity.type === 'circle' || (entity.type === 'path' && entity.closed)
}

/** An offset shape as path geometry (a circle becomes four quarter-circle Béziers). */
export function shapeToPath(shape: OffsetShape): { segments: Segment[]; closed: boolean } {
  if (shape.type === 'path') return { segments: shape.segments, closed: shape.closed }
  const ps = kernel()
  const circle = new ps.Path.Ellipse({ center: shape.center, radius: [shape.rx, shape.ry], insert: false })
  if (shape.rotation) circle.rotate(shape.rotation, new ps.Point(shape.center))
  return fromPaperPath(circle)
}

/** +1 or −1: the sign of distance that puts the offset on the cursor's side of `entity`. */
export function offsetSide(entity: Entity, cursor: Vec2): 1 | -1 {
  const shape = entityShape(entity)
  const p = new (kernel().Point)(cursor[0], cursor[1])
  if (isClosedShape(entity)) return shape.contains(p) ? -1 : 1
  const loc = shape.getNearestLocation(p)
  if (!loc) return 1
  const d = p.subtract(loc.point)
  return d.dot(loc.normal) < 0 ? -1 : 1
}

function paperResultToShapes(result: paper.PathItem): OffsetShape[] {
  const paths = result instanceof kernel().CompoundPath ? (result.children as paper.Path[]) : [result as paper.Path]
  return paths.filter((p) => p.segments.length >= 2).map((p) => ({ type: 'path' as const, ...fromPaperPath(p) }))
}

function clipperJoin(join: JoinStyle) {
  return join === 'round'
    ? ClipperLib.JoinType.jtRound
    : join === 'miter'
      ? ClipperLib.JoinType.jtMiter
      : ClipperLib.JoinType.jtSquare
}

/**
 * Offset a closed shape by flattening it to a polygon. Output is polylines (curves become short segments).
 * Exported for tests; callers use offsetEntity, which only falls back to this when paperjs-offset fails.
 */
export function clipperOffset(shape: paper.PathItem, distance: number, join: JoinStyle): OffsetShape[] {
  const flat = shape.clone({ insert: false }) as paper.PathItem
  const parts = flat instanceof kernel().CompoundPath ? (flat.children as paper.Path[]) : [flat as paper.Path]
  const co = new ClipperLib.ClipperOffset(MITER_LIMIT, FLATTEN_TOLERANCE * CLIPPER_SCALE)
  for (const part of parts) {
    part.flatten(FLATTEN_TOLERANCE)
    const poly = part.segments.map((s) => ({
      X: Math.round(s.point.x * CLIPPER_SCALE),
      Y: Math.round(s.point.y * CLIPPER_SCALE),
    }))
    co.AddPath(poly, clipperJoin(join), ClipperLib.EndType.etClosedPolygon)
  }
  const solution: ClipperLib.Paths = []
  co.Execute(solution, distance * CLIPPER_SCALE)
  return solution
    .filter((poly) => poly.length >= 3)
    .map((poly) => ({
      type: 'path' as const,
      closed: true,
      segments: poly.map((pt) => ({ p: [pt.X / CLIPPER_SCALE, pt.Y / CLIPPER_SCALE] as Vec2 })),
    }))
}

function qualityProblems(q: ReturnType<typeof analyze>): string[] {
  const out: string[] = []
  if (q.segmentCount === 0) out.push('empty')
  if (q.selfIntersections > 0) out.push(`self-intersections: ${q.selfIntersections}`)
  if (q.containmentErrors > 0) out.push(`containment errors: ${q.containmentErrors}`)
  if (q.distanceErrors > 0) out.push(`distance errors: ${q.distanceErrors}`)
  return out
}

/** A copy of `path` with every curved segment split into `n` pieces; straight segments are left alone. */
function subdivide(path: paper.Path, n: number): paper.Path {
  const out = path.clone({ insert: false }) as paper.Path
  if (n <= 1) return out
  for (const curve of [...out.curves]) {
    if (curve.isStraight()) continue
    let rest: paper.Curve | null = curve
    // Split off 1/k of what remains, k = n … 2, giving n equal-parameter pieces.
    for (let k = n; k > 1 && rest; k--) rest = rest.divideAtTime(1 / k)
  }
  return out
}

function curvesOf(item: paper.PathItem): paper.Curve[] {
  const paths = item instanceof kernel().CompoundPath ? (item.children as paper.Path[]) : [item as paper.Path]
  return paths.flatMap((p) => p.curves)
}

/**
 * Distance from points to a fixed set of curves, pruned by bounding boxes: a curve whose box is already further
 * away than the best distance found cannot be nearer. Checking curves in order of that lower bound means usually
 * only one or two exact (expensive) nearest-point solves per query, instead of one per curve.
 */
class NearestCurve {
  private readonly curves: { curve: paper.Curve; b: paper.Rectangle }[]

  constructor(item: paper.PathItem) {
    this.curves = curvesOf(item).map((curve) => ({ curve, b: curve.bounds }))
  }

  distance(p: paper.Point): number {
    const candidates = this.curves
      .map(({ curve, b }) => {
        const dx = Math.max(b.left - p.x, 0, p.x - b.right)
        const dy = Math.max(b.top - p.y, 0, p.y - b.bottom)
        return { curve, lower: Math.hypot(dx, dy) }
      })
      .sort((a, b) => a.lower - b.lower)
    let best = Infinity
    for (const { curve, lower } of candidates) {
      if (lower >= best) break
      best = Math.min(best, curve.getNearestPoint(p).getDistance(p))
    }
    return best
  }
}

/**
 * Largest |distance to source − d| over the curved parts of `result`. Straight parts are skipped: they are
 * offset exactly, and miter/bevel joins are meant to be further than d from a sharp corner.
 */
export function offsetError(source: paper.PathItem, result: paper.PathItem, d: number): number {
  const nearest = new NearestCurve(source)
  let max = 0
  for (const curve of curvesOf(result)) {
    if (curve.isStraight()) continue
    for (const t of SAMPLE_TIMES) {
      max = Math.max(max, Math.abs(nearest.distance(curve.getPointAtTime(t)) - d))
    }
  }
  return max
}

interface Attempt {
  result: paper.Path | paper.CompoundPath
  problems: string[]
  error: number
}

function attempt(
  source: paper.Path,
  n: number,
  distance: number,
  join: JoinStyle,
  algorithm: 'adaptive' | 'auto',
): Attempt | null {
  try {
    const result = paperOffset(subdivide(source, n), distance, { join, limit: MITER_LIMIT, insert: false, algorithm })
    const problems = qualityProblems(analyze(source, result, distance, { join }))
    return { result, problems, error: offsetError(source, result, Math.abs(distance)) }
  } catch {
    return null
  }
}

// Deliberately not a type guard: `false` also covers a failed Attempt, so it must not narrow to null.
const ok = (a: Attempt | null): boolean => !!a && a.problems.length === 0 && a.error <= OFFSET_TOLERANCE

/**
 * paperjs-offset with adaptive subdivision. Uses the 'adaptive' strategy directly (we run the quality analysis
 * ourselves, so 'auto''s built-in analysis and retries would be paid twice) and falls back to 'auto' only for
 * structural problems. The error of the curve approximation falls roughly as 1/n², so after the first pass it
 * jumps straight to the predicted subdivision (with a safety factor of 2) instead of stepping 1 → 4 → 8 → 16.
 * Returns the first result within tolerance, else the best one.
 */
function refinedPaperOffset(source: paper.Path, distance: number, join: JoinStyle): Attempt | null {
  let first = attempt(source, 1, distance, join, 'adaptive')
  if (ok(first)) return first
  if (!first || first.problems.length > 0) {
    // Structural problem (or a throw): let paperjs-offset try its other strategies once.
    first = attempt(source, 1, distance, join, 'auto')
    if (ok(first) || !first || first.problems.length > 0) return first
  }
  let best = first
  let n = Math.min(MAX_SUBDIVISION, 2 ** Math.ceil(Math.log2(2 * Math.sqrt(first.error / OFFSET_TOLERANCE))))
  while (n <= MAX_SUBDIVISION) {
    const next = attempt(source, n, distance, join, 'adaptive')
    if (ok(next)) return next
    if (!next || next.problems.length > 0) break
    if (next.error < best.error) best = next
    n *= 2
  }
  return best
}

/**
 * Offset `entity` by a signed `distance` (mm). See the module comment for the sign convention.
 * `quality: 'preview'` makes one unchecked paperjs-offset pass (~0.15 mm off on curves, invisible on screen,
 * ~10× faster) for live tool previews; commits must use the default 'precise'.
 */
export function offsetEntity(
  entity: Entity,
  distance: number,
  join: JoinStyle,
  quality: 'precise' | 'preview' = 'precise',
): OffsetResult {
  if (distance === 0) return NONE

  if (entity.type === 'circle' && entity.rx === entity.ry) {
    const r = entity.rx + distance
    if (r <= 0) return NONE
    return {
      method: 'exact',
      warnings: [],
      shapes: [{ type: 'circle', center: entity.center, rx: r, ry: r, rotation: 0 }],
    }
  }

  if (entity.type === 'centreLine') {
    const [ax, ay] = entity.from
    const [bx, by] = entity.to
    const len = Math.hypot(bx - ax, by - ay)
    if (len === 0) return NONE
    // Paper's normal for direction (dx, dy) is (dy, −dx) / len; match it so the sign convention holds.
    const nx = ((by - ay) / len) * distance
    const ny = (-(bx - ax) / len) * distance
    return {
      method: 'exact',
      warnings: [],
      shapes: [{ type: 'path', closed: false, segments: [{ p: [ax + nx, ay + ny] }, { p: [bx + nx, by + ny] }] }],
    }
  }

  if (entity.type !== 'path' && entity.type !== 'circle') return NONE

  const source = entityShape(entity) as paper.Path
  if (quality === 'preview') {
    try {
      const result = paperOffset(source, distance, { join, limit: MITER_LIMIT, insert: false, algorithm: 'adaptive' })
      return { method: 'paperjs-offset', warnings: [], shapes: paperResultToShapes(result) }
    } catch {
      return NONE
    }
  }
  const attempt = refinedPaperOffset(source, distance, join)
  if (attempt && attempt.problems.length === 0 && attempt.error <= OFFSET_TOLERANCE) {
    return { method: 'paperjs-offset', warnings: [], shapes: paperResultToShapes(attempt.result) }
  }

  // Clipper can only offset closed polygons one-sidedly; open paths keep the best paperjs-offset result.
  if (isClosedShape(entity)) {
    const shapes = clipperOffset(source, distance, join)
    return { method: 'clipper', warnings: shapes.length ? [] : ['empty'], shapes }
  }
  if (!attempt) return { ...NONE, warnings: ['paperjs-offset failed'] }
  const warnings = [...attempt.problems]
  if (attempt.error > OFFSET_TOLERANCE) warnings.push(`distance error ${attempt.error.toFixed(3)} mm`)
  return { method: 'paperjs-offset', warnings, shapes: paperResultToShapes(attempt.result) }
}
