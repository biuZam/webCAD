// Picking a straight edge (a straight segment of a path, or a centre line) under the cursor.

import type { Entity, Project } from '../document/model'
import { entitiesNear } from '../geometry/query'
import { distance, type Vec2 } from '../lib/vec2'

export interface Edge {
  entity: Entity
  a: Vec2
  b: Vec2
}

/** Distance from p to segment ab, and the parameter t of the closest point (clamped to the segment). */
export function toSegment(p: Vec2, a: Vec2, b: Vec2): { d: number; t: number } {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len2 = dx * dx + dy * dy
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2))
  return { d: distance(p, [a[0] + t * dx, a[1] + t * dy]), t }
}

function straightEdges(e: Entity): [Vec2, Vec2][] {
  if (e.type === 'centreLine') return [[e.from, e.to]]
  if (e.type !== 'path') return []
  const s = e.segments
  const out: [Vec2, Vec2][] = []
  const add = (i: number, j: number) => {
    if (!s[i].ho && !s[j].hi) out.push([s[i].p, s[j].p])
  }
  for (let i = 1; i < s.length; i++) add(i - 1, i)
  if (e.closed && s.length > 1) add(s.length - 1, 0)
  return out
}

/** The straight edge nearest `p` within `tolerance` mm (on visible layers; locked layers are fine to reference). */
export function edgeNear(project: Project, p: Vec2, tolerance: number): Edge | null {
  let best: (Edge & { d: number }) | null = null
  for (const { entity } of entitiesNear(project, p, tolerance)) {
    for (const [a, b] of straightEdges(entity)) {
      const { d } = toSegment(p, a, b)
      if (d <= tolerance && (!best || d < best.d)) best = { entity, a, b, d }
    }
  }
  return best && { entity: best.entity, a: best.a, b: best.b }
}
