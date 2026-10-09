// L7 Notches: alignment marks on an edge, single or double, as short straight snips (a line across the edge,
// into the piece) or V notches. They point into a closed outline, or for an open line towards `side`.
// Double notches sit `gap` apart along the edge (measured along the curve), each square to the edge there.

import type { Entity, Segment } from '../../document/model'
import type { Vec2 } from '../../lib/vec2'
import { kernel } from '../kernel'
import { entityShape } from '../query'

export interface NotchOptions {
  count: 1 | 2
  style: 'line' | 'v'
  /** Depth into the piece (mm). */
  length: number
  /** Distance between the two marks of a double notch (mm). */
  gap: number
  /** Width of a V notch at the edge (mm). */
  width: number
}

export const DEFAULT_NOTCH: NotchOptions = { count: 1, style: 'line', length: 4, gap: 3, width: 3 }

/**
 * Notch marks at the point of `entity` nearest `at`, as open paths. `side` (any point) picks the side for open
 * lines; closed outlines always get inward notches. Empty if the entity has no outline to notch.
 */
export function notchShapes(entity: Entity, at: Vec2, side: Vec2, o: NotchOptions): Segment[][] {
  if (entity.type !== 'path' && entity.type !== 'circle' && entity.type !== 'centreLine') return []
  const ps = kernel()
  const shape = entityShape(entity) as paper.Path
  if (!(shape instanceof ps.Path) || shape.length === 0) return []
  const centre = shape.getNearestLocation(new ps.Point(at)).offset
  const closed = shape.closed
  const offsets = o.count === 2 ? [centre - o.gap / 2, centre + o.gap / 2] : [centre]
  const out: Segment[][] = []
  for (let off of offsets) {
    if (closed) off = ((off % shape.length) + shape.length) % shape.length
    else if (off < 0 || off > shape.length) continue
    const q = shape.getPointAt(off)
    const t = shape.getTangentAt(off)
    if (!q || !t) continue
    let n = t.rotate(90, new ps.Point(0, 0))
    const probe = q.add(n.multiply(0.01))
    const inward = closed ? shape.contains(probe) : n.dot(new ps.Point(side).subtract(q)) >= 0
    if (!inward) n = n.multiply(-1)
    const tip = q.add(n.multiply(o.length))
    const p = (v: paper.Point): Segment => ({ p: [v.x, v.y] })
    out.push(
      o.style === 'v'
        ? [p(q.subtract(t.multiply(o.width / 2))), p(tip), p(q.add(t.multiply(o.width / 2)))]
        : [p(q), p(tip)],
    )
  }
  return out
}
