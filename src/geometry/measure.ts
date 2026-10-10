// Measurements shared by the Measure tool and the MCP server.

import type { Entity } from '../document/model'
import { angleOf, distance, type Vec2 } from '../lib/vec2'
import { closedArea, isClosedShape } from './edit'
import { pathLength } from './kernel'
import { entityShape } from './query'

/** Length of an entity's outline: path length, circumference, centre-line length. Null for holes and text. */
export function entityLength(e: Entity): number | null {
  switch (e.type) {
    case 'path':
      return pathLength(e)
    case 'circle':
      return e.rx === e.ry ? 2 * Math.PI * e.rx : (entityShape(e) as paper.Path).length
    case 'centreLine':
      return distance(e.from, e.to)
    default:
      return null
  }
}

/** Enclosed area (mm²) of a closed path or circle; null for anything open. */
export function entityArea(e: Entity): number | null {
  return isClosedShape(e) ? closedArea(e) : null
}

/** The angle at `vertex` between the rays to `a` and `b`, in degrees [0, 180]. */
export function angleBetween(a: Vec2, vertex: Vec2, b: Vec2): number {
  const d = Math.abs(angleOf(vertex, a) - angleOf(vertex, b))
  return d > 180 ? 360 - d : d
}
