// Exact geometric queries over model entities, for hit-testing and snapping.
// Kernel shapes are cached per entity *object*: Immer gives a changed entity a new object,
// so the cache never goes stale and unchanged entities are never rebuilt.

import RBush from 'rbush'
import type { Entity, Id, Layer, PathEntity, Project } from '../document/model'
import type { Vec2 } from '../lib/vec2'
import { emptyBounds, entityBounds, type Bounds } from './bounds'
import { kernel, toPaperPath } from './kernel'

const shapes = new WeakMap<Entity, paper.PathItem>()

/** The entity's outline as a headless Paper.js path (closed holes and text become simple shapes). */
export function entityShape(entity: Entity): paper.PathItem {
  let shape = shapes.get(entity)
  if (shape) return shape
  const ps = kernel()
  switch (entity.type) {
    case 'path':
      shape = toPaperPath(entity)
      break
    case 'circle':
      shape = new ps.Path.Ellipse({
        center: entity.center,
        radius: [entity.rx, entity.ry],
        insert: false,
      })
      // Model rotation is clockwise in y-down space, which is what Paper's rotate() does too.
      if (entity.rotation) shape.rotate(entity.rotation, new ps.Point(entity.center))
      break
    case 'centreLine':
      shape = new ps.Path.Line({ from: entity.from, to: entity.to, insert: false })
      break
    case 'holeSet':
      shape = new ps.CompoundPath({
        children: entity.holes.map(
          (c) => new ps.Path.Circle({ center: c, radius: entity.holeSize / 2, insert: false }),
        ),
        insert: false,
      })
      break
    case 'text': {
      const b = entityBounds(entity)
      shape = new ps.Path.Rectangle({ from: [b.minX, b.minY], to: [b.maxX, b.maxY], insert: false })
      break
    }
  }
  shapes.set(entity, shape)
  return shape
}

export function nearestPoint(entity: Entity, p: Vec2): { point: Vec2; distance: number } {
  const q = entityShape(entity).getNearestPoint(new (kernel().Point)(p[0], p[1]))
  return { point: [q.x, q.y], distance: Math.hypot(q.x - p[0], q.y - p[1]) }
}

/**
 * The point of a path nearest `p` as a curve location: the curve from anchor `index` to the next one, at
 * curve time `time` in [0, 1].
 */
export function nearestLocation(entity: PathEntity, p: Vec2): { index: number; time: number; distance: number } {
  const loc = (entityShape(entity) as paper.Path).getNearestLocation(new (kernel().Point)(p[0], p[1]))
  return { index: loc.curve.index, time: loc.time, distance: loc.point.getDistance(new (kernel().Point)(p[0], p[1])) }
}

export function intersections(a: Entity, b: Entity): Vec2[] {
  return entityShape(a)
    .getIntersections(entityShape(b))
    .map((loc) => [loc.point.x, loc.point.y] as Vec2)
}

/** True if the entity's outline touches or lies inside the rectangle. */
export function touchesRect(entity: Entity, rect: Bounds): boolean {
  const b = entityBounds(entity)
  if (b.maxX < rect.minX || b.minX > rect.maxX || b.maxY < rect.minY || b.minY > rect.maxY) return false
  if (b.minX >= rect.minX && b.maxX <= rect.maxX && b.minY >= rect.minY && b.maxY <= rect.maxY) return true
  const box = new (kernel().Path.Rectangle)({ from: [rect.minX, rect.minY], to: [rect.maxX, rect.maxY], insert: false })
  if (entityShape(entity).getIntersections(box).length > 0) return true
  // No crossing, so each connected part is wholly inside or wholly outside the box, and a part's point
  // nearest the box centre tells which. Check parts separately: for a multi-part shape (hole set) an
  // outside part can be nearer the centre than an inside one.
  const shape = entityShape(entity)
  const parts = shape instanceof kernel().CompoundPath ? (shape.children as paper.PathItem[]) : [shape]
  return parts.some((part) => box.contains(part.getNearestPoint(box.bounds.center)))
}

// ---- Spatial index ---------------------------------------------------------------------------

export interface IndexedEntity extends Bounds {
  entity: Entity
  layer: Layer
}

// IndexedEntity carries minX/minY/maxX/maxY itself, which is RBush's default item format.
type EntityTree = RBush<IndexedEntity>

const indexes = new WeakMap<Project, EntityTree>()

/**
 * R-tree of every entity on a visible layer, built once per project object (bulk load is ~1 ms for 2,000 entities).
 * Locked layers are included: they can be snapped to, just not selected.
 */
function entityIndex(project: Project): EntityTree {
  let tree = indexes.get(project)
  if (tree) return tree
  const layers = new Map<Id, Layer>(project.layers.map((l) => [l.id, l]))
  const items: IndexedEntity[] = []
  for (const piece of project.pieces) {
    for (const entity of piece.entities) {
      const layer = layers.get(entity.layerId)
      if (!layer?.visible) continue
      const b = entityBounds(entity, emptyBounds())
      if (b.minX > b.maxX) continue
      items.push({ ...b, entity, layer })
    }
  }
  tree = new RBush<IndexedEntity>()
  tree.load(items)
  indexes.set(project, tree)
  return tree
}

/** Entities on visible layers whose bounds come within `radius` of `p`. */
export function entitiesNear(project: Project, p: Vec2, radius: number): IndexedEntity[] {
  return entityIndex(project).search({
    minX: p[0] - radius,
    minY: p[1] - radius,
    maxX: p[0] + radius,
    maxY: p[1] + radius,
  })
}

/** Entities on visible layers whose bounds overlap `rect`. */
export function entitiesInRect(project: Project, rect: Bounds): IndexedEntity[] {
  return entityIndex(project).search(rect)
}
