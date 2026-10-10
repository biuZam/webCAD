// Geometric constraints, the pure part: resolving references into the current geometry and measuring how far a
// constraint is from being satisfied. The solver itself (planegcs, lazy WASM) is in solver.ts.
// Only straight edges and true circles can be constrained; curved edges and ellipses have no references.

import type { CircleEntity, Constraint, EdgeRef, Entity, Id, Piece, PointRef } from '../document/model'
import type { Vec2 } from '../lib/vec2'

/** Residual below which a constraint counts as satisfied: mm for lengths, mm-equivalent for angles. */
export const CONSTRAINT_TOLERANCE = 0.001

const find = (piece: Piece, id: Id): Entity | undefined => piece.entities.find((e) => e.id === id)

/** The anchor a reference names, or null if the entity or index no longer exists. */
export function pointOf(piece: Piece, ref: PointRef): Vec2 | null {
  const e = find(piece, ref.entityId)
  if (!e) return null
  if (e.type === 'path') return e.segments[ref.index]?.p ?? null
  if (e.type === 'centreLine') return ref.index === 0 ? e.from : ref.index === 1 ? e.to : null
  if (e.type === 'circle') return ref.index === 0 ? e.center : null
  return null
}

/** Segment indices of the two ends of an edge, or null if the edge doesn't exist or is curved. */
export function edgeEnds(e: Entity, edge: number): [number, number] | null {
  if (e.type === 'centreLine') return edge === 0 ? [0, 1] : null
  if (e.type !== 'path') return null
  const s = e.segments
  const j = edge + 1 < s.length ? edge + 1 : e.closed && s.length > 1 ? 0 : -1
  if (edge < 0 || edge >= s.length || j < 0) return null
  if (s[edge].ho || s[j].hi) return null
  return [edge, j]
}

export function edgeOf(piece: Piece, ref: EdgeRef): [Vec2, Vec2] | null {
  const e = find(piece, ref.entityId)
  const ends = e && edgeEnds(e, ref.edge)
  if (!e || !ends) return null
  const a = pointOf(piece, { entityId: e.id, index: ends[0] })
  const b = pointOf(piece, { entityId: e.id, index: ends[1] })
  return a && b ? [a, b] : null
}

/** A circle (not an ellipse) the constraints can use. */
export function circleOf(piece: Piece, id: Id): CircleEntity | null {
  const e = find(piece, id)
  return e?.type === 'circle' && Math.abs(e.rx - e.ry) < 1e-9 ? e : null
}

/** Entities a constraint refers to. */
export function constraintEntities(c: Constraint): Id[] {
  switch (c.type) {
    case 'coincident':
    case 'distance':
      return [c.a.entityId, c.b.entityId]
    case 'parallel':
    case 'perpendicular':
      return [c.a.entityId, c.b.entityId]
    case 'tangent':
      return [c.line.entityId, c.circle]
    case 'radius':
      return [c.circle]
  }
}

/**
 * How far `c` is from satisfied, in mm (angles are converted to the distance the far end of the shorter edge
 * would have to move). Null when a reference is broken (entity gone, edge now curved, index out of range).
 */
export function constraintResidual(piece: Piece, c: Constraint): number | null {
  switch (c.type) {
    case 'coincident':
    case 'distance': {
      const a = pointOf(piece, c.a)
      const b = pointOf(piece, c.b)
      if (!a || !b) return null
      const d = Math.hypot(a[0] - b[0], a[1] - b[1])
      return c.type === 'distance' ? Math.abs(d - c.value) : d
    }
    case 'parallel':
    case 'perpendicular': {
      const a = edgeOf(piece, c.a)
      const b = edgeOf(piece, c.b)
      if (!a || !b) return null
      const [ux, uy] = [a[1][0] - a[0][0], a[1][1] - a[0][1]]
      const [vx, vy] = [b[1][0] - b[0][0], b[1][1] - b[0][1]]
      const lu = Math.hypot(ux, uy)
      const lv = Math.hypot(vx, vy)
      if (lu === 0 || lv === 0) return null
      const s = c.type === 'parallel' ? (ux * vy - uy * vx) / (lu * lv) : (ux * vx + uy * vy) / (lu * lv)
      return Math.abs(s) * Math.min(lu, lv)
    }
    case 'tangent': {
      const l = edgeOf(piece, c.line)
      const circle = circleOf(piece, c.circle)
      if (!l || !circle) return null
      const len = Math.hypot(l[1][0] - l[0][0], l[1][1] - l[0][1])
      if (len === 0) return null
      const dist =
        Math.abs(
          (l[1][0] - l[0][0]) * (l[0][1] - circle.center[1]) - (l[0][0] - circle.center[0]) * (l[1][1] - l[0][1]),
        ) / len
      return Math.abs(dist - circle.rx)
    }
    case 'radius': {
      const circle = circleOf(piece, c.circle)
      return circle ? Math.abs(circle.rx - c.value) : null
    }
  }
}

export const isSatisfied = (residual: number | null) => residual !== null && residual <= CONSTRAINT_TOLERANCE

/** Current value of a dimension (distance between its points, or circle radius), or null if broken. */
export function dimensionValue(piece: Piece, c: Constraint): number | null {
  if (c.type === 'distance') {
    const a = pointOf(piece, c.a)
    const b = pointOf(piece, c.b)
    return a && b ? Math.hypot(a[0] - b[0], a[1] - b[1]) : null
  }
  if (c.type === 'radius') return circleOf(piece, c.circle)?.rx ?? null
  return null
}
