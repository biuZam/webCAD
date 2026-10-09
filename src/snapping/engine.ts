// T1.3 Object snapping. Pure function of the project, cursor and options; see docs/ARCHITECTURE.md §6.
// T1.3b Quadrant points on circles/ellipses; polar tracking (rays every POLAR_STEP_DEG from the previous point)
// and object tracking (horizontal/vertical lines through recently snapped points, and their crossings). Tracking
// applies only when no object snap does, and before the grid; its result carries the guide lines to draw.

import type { Entity, Project, Segment } from '../document/model'
import { entitiesNear, intersections, nearestPoint } from '../geometry/query'
import { kernel } from '../geometry/kernel'
import { add, distance, type Vec2 } from '../lib/vec2'
import { snapToGrid } from './grid'

export type SnapKind =
  | 'endpoint'
  | 'midpoint'
  | 'centre'
  | 'quadrant'
  | 'intersection'
  | 'perpendicular'
  | 'tangent'
  | 'nearest'
  | 'polar'
  | 'tracking'
  | 'grid'

export const SNAP_KINDS: readonly SnapKind[] = [
  'endpoint',
  'midpoint',
  'centre',
  'quadrant',
  'intersection',
  'perpendicular',
  'tangent',
  'nearest',
  'polar',
  'tracking',
  'grid',
]

/** Polar tracking rays from the previous point, every this many degrees. */
export const POLAR_STEP_DEG = 45

/** Lower wins. Within the same rank the closest candidate wins. */
const RANK: Record<SnapKind, number> = {
  endpoint: 0,
  intersection: 1,
  centre: 1,
  midpoint: 1,
  quadrant: 1,
  perpendicular: 2,
  tangent: 2,
  nearest: 3,
  polar: 4,
  tracking: 4,
  grid: 5,
}

export interface SnapResult {
  kind: SnapKind
  point: Vec2
  /** Tracking lines that produced the point (from their origin to the point), for the overlay. */
  guides?: [Vec2, Vec2][]
}

export interface SnapOptions {
  enabled: ReadonlySet<SnapKind>
  /** Capture radius in mm (screen tolerance × mm per px). */
  tolerance: number
  /** Grid step in mm; grid snapping applies only when no object snap is found. */
  gridStep: number
  /** The tool's previous point, for perpendicular and tangent snaps. */
  from?: Vec2 | null
  /** Leave these entities out (e.g. the path being edited, so a dragged point doesn't snap to its old self). */
  exclude?: readonly string[]
  /** Recently snapped points to track horizontally and vertically from (object tracking). */
  tracked?: readonly Vec2[]
}

/** Kinds worth tracking from once snapped to (see SnapOptions.tracked). */
export const TRACKABLE: ReadonlySet<SnapKind> = new Set(['endpoint', 'midpoint', 'centre', 'quadrant', 'intersection'])

/** More candidates than this near the cursor and pairwise intersections are skipped (cost is quadratic). */
const MAX_INTERSECTION_CANDIDATES = 24

function anchors(entity: Entity): Vec2[] {
  switch (entity.type) {
    case 'path':
      return entity.segments.map((s) => s.p)
    case 'centreLine':
      return [entity.from, entity.to]
    default:
      return []
  }
}

function centres(entity: Entity): Vec2[] {
  switch (entity.type) {
    case 'circle':
      return [entity.center]
    case 'holeSet':
      return entity.holes
    default:
      return []
  }
}

/** The four ends of a circle's or ellipse's axes (its rotation is clockwise, y-down). */
function quadrants(entity: Entity): Vec2[] {
  if (entity.type !== 'circle') return []
  const r = (entity.rotation * Math.PI) / 180
  const u: Vec2 = [Math.cos(r), Math.sin(r)]
  const v: Vec2 = [-u[1], u[0]]
  const [cx, cy] = entity.center
  return [
    [cx + u[0] * entity.rx, cy + u[1] * entity.rx],
    [cx + v[0] * entity.ry, cy + v[1] * entity.ry],
    [cx - u[0] * entity.rx, cy - u[1] * entity.rx],
    [cx - v[0] * entity.ry, cy - v[1] * entity.ry],
  ]
}

/** A tracking line: through `origin` with unit direction `dir`. */
interface TrackLine {
  kind: 'polar' | 'tracking'
  origin: Vec2
  dir: Vec2
}

function trackingLines(options: SnapOptions): TrackLine[] {
  const lines: TrackLine[] = []
  const { from, enabled } = options
  if (from && enabled.has('polar')) {
    for (let a = 0; a < 360; a += POLAR_STEP_DEG) {
      const r = (a * Math.PI) / 180
      // Rays only (not whole lines): the direction the user is drawing in.
      // Exact zeros on the axes, so locked points don't pick up 1e-16 noise.
      const exact = (v: number) => (Math.abs(v) < 1e-12 ? 0 : v)
      lines.push({ kind: 'polar', origin: from, dir: [exact(Math.cos(r)), exact(-Math.sin(r))] })
    }
  }
  if (enabled.has('tracking')) {
    for (const q of options.tracked ?? []) {
      lines.push({ kind: 'tracking', origin: q, dir: [1, 0] }, { kind: 'tracking', origin: q, dir: [0, 1] })
    }
  }
  return lines
}

/** Signed distance of `p` along and across a line. */
function onLine(line: TrackLine, p: Vec2) {
  const dx = p[0] - line.origin[0]
  const dy = p[1] - line.origin[1]
  return { along: dx * line.dir[0] + dy * line.dir[1], across: -dx * line.dir[1] + dy * line.dir[0] }
}

/** Point on a line at `along`. */
const at = (line: TrackLine, along: number): Vec2 => [
  line.origin[0] + line.dir[0] * along,
  line.origin[1] + line.dir[1] * along,
]

/** Crossing of two lines, or null if parallel. */
function crossing(a: TrackLine, b: TrackLine): Vec2 | null {
  const det = a.dir[0] * b.dir[1] - a.dir[1] * b.dir[0]
  if (Math.abs(det) < 1e-9) return null
  const t = ((b.origin[0] - a.origin[0]) * b.dir[1] - (b.origin[1] - a.origin[1]) * b.dir[0]) / det
  return at(a, t)
}

/** Polar and object tracking: the crossing of two nearby lines, else the nearest line's closest point. */
function track(p: Vec2, options: SnapOptions): SnapResult | null {
  const near = trackingLines(options)
    .map((line) => ({ line, ...onLine(line, p) }))
    // Polar rays point away from the previous point; tracking lines run both ways.
    .filter(
      ({ line, along, across }) => Math.abs(across) <= options.tolerance && (line.kind === 'tracking' || along > 0),
    )
    .sort((a, b) => Math.abs(a.across) - Math.abs(b.across))
  if (near.length === 0) return null
  for (let i = 0; i < near.length; i++) {
    for (let j = i + 1; j < near.length; j++) {
      const x = crossing(near[i].line, near[j].line)
      if (x && distance(x, p) <= options.tolerance * 1.5) {
        return {
          kind: near[i].line.kind === 'polar' || near[j].line.kind === 'polar' ? 'polar' : 'tracking',
          point: x,
          guides: [
            [near[i].line.origin, x],
            [near[j].line.origin, x],
          ],
        }
      }
    }
  }
  const { line, along } = near[0]
  const point = at(line, along)
  return { kind: line.kind, point, guides: [[line.origin, point]] }
}

/** Midpoint (by arc length) of every edge of a path, including the closing edge. */
function midpoints(entity: Entity): Vec2[] {
  if (entity.type === 'centreLine') return [[(entity.from[0] + entity.to[0]) / 2, (entity.from[1] + entity.to[1]) / 2]]
  if (entity.type !== 'path') return []
  const segs = entity.segments
  const out: Vec2[] = []
  const edge = (a: Segment, b: Segment) => {
    if (!a.ho && !b.hi) {
      out.push([(a.p[0] + b.p[0]) / 2, (a.p[1] + b.p[1]) / 2])
      return
    }
    const ps = kernel()
    const curve = new ps.Curve(
      new ps.Point(a.p),
      new ps.Point(a.ho ?? [0, 0]),
      new ps.Point(b.hi ?? [0, 0]),
      new ps.Point(b.p),
    )
    const m = curve.getPointAt(curve.length / 2)
    out.push([m.x, m.y])
  }
  for (let i = 1; i < segs.length; i++) edge(segs[i - 1], segs[i])
  if (entity.closed && segs.length > 1) edge(segs[segs.length - 1], segs[0])
  return out
}

/** Feet of perpendiculars from `from` onto the entity (straight edges, circles; curves via nearest point). */
function perpendiculars(entity: Entity, from: Vec2): Vec2[] {
  if (entity.type === 'circle' && entity.rx === entity.ry) {
    const d = distance(from, entity.center)
    if (d === 0) return []
    const u: Vec2 = [(from[0] - entity.center[0]) / d, (from[1] - entity.center[1]) / d]
    return [
      add(entity.center, [u[0] * entity.rx, u[1] * entity.rx]),
      add(entity.center, [-u[0] * entity.rx, -u[1] * entity.rx]),
    ]
  }
  const edges: [Vec2, Vec2][] = []
  if (entity.type === 'centreLine') edges.push([entity.from, entity.to])
  if (entity.type === 'path') {
    const s = entity.segments
    const straight = (a: Segment, b: Segment) => !a.ho && !b.hi
    for (let i = 1; i < s.length; i++) if (straight(s[i - 1], s[i])) edges.push([s[i - 1].p, s[i].p])
    if (entity.closed && s.length > 1 && straight(s[s.length - 1], s[0])) edges.push([s[s.length - 1].p, s[0].p])
    if (s.some((seg) => seg.hi || seg.ho)) {
      // For curved paths the nearest point from `from` is a perpendicular foot.
      return [...edges.flatMap(([a, b]) => foot(a, b, from)), nearestPoint(entity, from).point]
    }
  }
  return edges.flatMap(([a, b]) => foot(a, b, from))
}

/** Foot of the perpendicular from p onto segment ab, if it lands on the segment. */
function foot(a: Vec2, b: Vec2, p: Vec2): Vec2[] {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return []
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2
  return t >= 0 && t <= 1 ? [[a[0] + t * dx, a[1] + t * dy]] : []
}

/** Tangent points on a circle from an external point. */
function tangents(entity: Entity, from: Vec2): Vec2[] {
  if (entity.type !== 'circle' || entity.rx !== entity.ry) return []
  const [cx, cy] = entity.center
  const r = entity.rx
  const d = distance(from, entity.center)
  if (d <= r) return []
  const base = Math.atan2(from[1] - cy, from[0] - cx)
  const spread = Math.acos(r / d)
  return [base + spread, base - spread].map((a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)] as Vec2)
}

export function snap(project: Project, p: Vec2, options: SnapOptions): SnapResult | null {
  const { enabled, tolerance, from } = options
  let best: (SnapResult & { d: number }) | null = null
  const offer = (kind: SnapKind, point: Vec2) => {
    if (!enabled.has(kind)) return
    const d = distance(p, point)
    if (d > tolerance) return
    if (!best || RANK[kind] < RANK[best.kind] || (RANK[kind] === RANK[best.kind] && d < best.d)) {
      best = { kind, point, d }
    }
  }

  const near = entitiesNear(project, p, tolerance)
    .map((n) => n.entity)
    .filter((e) => !options.exclude?.includes(e.id))
  for (const entity of near) {
    for (const q of anchors(entity)) offer('endpoint', q)
    if (enabled.has('centre')) for (const q of centres(entity)) offer('centre', q)
    if (enabled.has('quadrant')) for (const q of quadrants(entity)) offer('quadrant', q)
    if (enabled.has('midpoint')) for (const q of midpoints(entity)) offer('midpoint', q)
    if (from && enabled.has('perpendicular')) for (const q of perpendiculars(entity, from)) offer('perpendicular', q)
    if (from && enabled.has('tangent')) for (const q of tangents(entity, from)) offer('tangent', q)
    if (enabled.has('nearest')) offer('nearest', nearestPoint(entity, p).point)
  }
  if (enabled.has('intersection') && near.length <= MAX_INTERSECTION_CANDIDATES) {
    for (let i = 0; i < near.length; i++) {
      for (let j = i + 1; j < near.length; j++) {
        for (const q of intersections(near[i], near[j])) offer('intersection', q)
      }
    }
  }

  const found = best as (SnapResult & { d: number }) | null
  if (found) return { kind: found.kind, point: found.point }
  const tracked = track(p, options)
  if (tracked) return tracked
  if (enabled.has('grid')) return { kind: 'grid', point: snapToGrid(p, options.gridStep) }
  return null
}
