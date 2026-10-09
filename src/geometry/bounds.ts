// Exact axis-aligned bounds of model entities, without the Paper.js kernel (export needs no canvas).

import type { Entity, Segment } from '../document/model'
import { add, type Vec2 } from '../lib/vec2'

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export const emptyBounds = (): Bounds => ({ minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity })
export const isEmpty = (b: Bounds) => b.minX > b.maxX

function include(b: Bounds, [x, y]: Vec2) {
  if (x < b.minX) b.minX = x
  if (y < b.minY) b.minY = y
  if (x > b.maxX) b.maxX = x
  if (y > b.maxY) b.maxY = y
}

/** Parameters t in (0,1) where one coordinate of a cubic Bézier has an extremum. */
function cubicExtrema(p0: number, p1: number, p2: number, p3: number): number[] {
  // Derivative: 3[(−p0+3p1−3p2+p3)t² + 2(p0−2p1+p2)t + (p1−p0)]
  const a = -p0 + 3 * p1 - 3 * p2 + p3
  const b = 2 * (p0 - 2 * p1 + p2)
  const c = p1 - p0
  const ts: number[] = []
  if (Math.abs(a) < 1e-12) {
    if (Math.abs(b) > 1e-12) ts.push(-c / b)
  } else {
    const disc = b * b - 4 * a * c
    if (disc >= 0) {
      const s = Math.sqrt(disc)
      ts.push((-b + s) / (2 * a), (-b - s) / (2 * a))
    }
  }
  return ts.filter((t) => t > 0 && t < 1)
}

function cubicAt(p0: number, p1: number, p2: number, p3: number, t: number) {
  const u = 1 - t
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3
}

function includeCurve(b: Bounds, s0: Segment, s1: Segment) {
  include(b, s1.p)
  if (!s0.ho && !s1.hi) return
  const c0 = s0.p
  const c1 = s0.ho ? add(s0.p, s0.ho) : s0.p
  const c2 = s1.hi ? add(s1.p, s1.hi) : s1.p
  const c3 = s1.p
  for (const t of [...cubicExtrema(c0[0], c1[0], c2[0], c3[0]), ...cubicExtrema(c0[1], c1[1], c2[1], c3[1])]) {
    include(b, [cubicAt(c0[0], c1[0], c2[0], c3[0], t), cubicAt(c0[1], c1[1], c2[1], c3[1], t)])
  }
}

/**
 * Bounds are cached per entity *object* (Immer gives a changed entity a new object, so the cache can't go
 * stale). This makes rebuilding the spatial index after an edit cost only the entities that changed: with
 * 2,000 entities (17,600 holes) recomputing all of them took ~3 ms per edit.
 */
const cache = new WeakMap<Entity, Readonly<Bounds>>()

/** Grow `into` by the entity's bounds (a fresh accumulator if omitted) and return it. */
export function entityBounds(entity: Entity, into: Bounds = emptyBounds()): Bounds {
  let own = cache.get(entity)
  if (!own) {
    own = computeBounds(entity, emptyBounds())
    cache.set(entity, own)
  }
  if (own.minX <= own.maxX) {
    if (own.minX < into.minX) into.minX = own.minX
    if (own.minY < into.minY) into.minY = own.minY
    if (own.maxX > into.maxX) into.maxX = own.maxX
    if (own.maxY > into.maxY) into.maxY = own.maxY
  }
  return into
}

function computeBounds(entity: Entity, into: Bounds): Bounds {
  switch (entity.type) {
    case 'path': {
      const segs = entity.segments
      if (segs.length === 0) break
      include(into, segs[0].p)
      for (let i = 1; i < segs.length; i++) includeCurve(into, segs[i - 1], segs[i])
      if (entity.closed && segs.length > 1) includeCurve(into, segs[segs.length - 1], segs[0])
      break
    }
    case 'circle': {
      const {
        center: [cx, cy],
        rx,
        ry,
      } = entity
      const r = (entity.rotation * Math.PI) / 180
      const hw = Math.hypot(rx * Math.cos(r), ry * Math.sin(r))
      const hh = Math.hypot(rx * Math.sin(r), ry * Math.cos(r))
      include(into, [cx - hw, cy - hh])
      include(into, [cx + hw, cy + hh])
      break
    }
    case 'centreLine':
      include(into, entity.from)
      include(into, entity.to)
      break
    case 'holeSet': {
      const r = entity.holeSize / 2
      for (const [x, y] of entity.holes) {
        include(into, [x - r, y - r])
        include(into, [x + r, y + r])
      }
      break
    }
    case 'text': {
      // Approximation until text layout lands (T4.3): 0.6 em per character, baseline at position.
      const [x, y] = entity.position
      include(into, [x, y - entity.size])
      include(into, [x + entity.text.length * entity.size * 0.6, y])
      break
    }
  }
  return into
}
