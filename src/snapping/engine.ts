// T1.3 Object snapping. Pure function of the project, cursor and options; see docs/ARCHITECTURE.md §6.

import type { Entity, Project, Segment } from '../document/model'
import { entitiesNear, intersections, nearestPoint } from '../geometry/query'
import { kernel } from '../geometry/kernel'
import { add, distance, type Vec2 } from '../lib/vec2'
import { snapToGrid } from './grid'

export type SnapKind =
  'endpoint' | 'midpoint' | 'centre' | 'intersection' | 'perpendicular' | 'tangent' | 'nearest' | 'grid'

export const SNAP_KINDS: readonly SnapKind[] = [
  'endpoint',
  'midpoint',
  'centre',
  'intersection',
  'perpendicular',
  'tangent',
  'nearest',
  'grid',
]

/** Lower wins. Within the same rank the closest candidate wins. */
const RANK: Record<SnapKind, number> = {
  endpoint: 0,
  intersection: 1,
  centre: 1,
  midpoint: 1,
  perpendicular: 2,
  tangent: 2,
  nearest: 3,
  grid: 4,
}

export interface SnapResult {
  kind: SnapKind
  point: Vec2
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
}

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
  if (enabled.has('grid')) return { kind: 'grid', point: snapToGrid(p, options.gridStep) }
  return null
}
