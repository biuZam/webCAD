import { describe, expect, it } from 'vitest'
import type { Entity } from '../document/model'
import { createProject } from '../document/factory'
import { entitiesNear, intersections, nearestPoint, touchesRect } from './query'
import { rectangleSegments } from './shapes'

const base = { layerId: 'l', lineStyle: 'solid', strokeWidth: 0.1 } as const
const square: Entity = { ...base, id: 'sq', type: 'path', segments: rectangleSegments([0, 0], [10, 10]), closed: true }
const circle: Entity = { ...base, id: 'c', type: 'circle', center: [10, 5], rx: 3, ry: 3, rotation: 0 }

describe('geometry queries', () => {
  it('finds the nearest point on an outline', () => {
    const { point, distance } = nearestPoint(square, [5, -2])
    expect(point[0]).toBeCloseTo(5)
    expect(point[1]).toBeCloseTo(0)
    expect(distance).toBeCloseTo(2)
  })

  it('intersects a square edge with a circle', () => {
    const pts = intersections(square, circle).sort((a, b) => a[1] - b[1])
    expect(pts).toHaveLength(2)
    expect(pts[0][0]).toBeCloseTo(10)
    expect(pts[0][1]).toBeCloseTo(2)
    expect(pts[1][1]).toBeCloseTo(8)
  })

  it('crossing test: crossing edge, fully inside, fully outside, enclosing', () => {
    expect(touchesRect(square, { minX: 8, minY: 2, maxX: 12, maxY: 4 })).toBe(true)
    expect(touchesRect(square, { minX: -1, minY: -1, maxX: 11, maxY: 11 })).toBe(true)
    expect(touchesRect(square, { minX: 20, minY: 20, maxX: 30, maxY: 30 })).toBe(false)
    // Box strictly inside the square, touching no edge: the outline does not touch it.
    expect(touchesRect(square, { minX: 3, minY: 3, maxX: 7, maxY: 7 })).toBe(false)
  })

  it('crossing test checks each part of a hole set separately', () => {
    const holes: Entity = {
      ...base,
      id: 'h',
      type: 'holeSet',
      sourceEntityId: 'sq',
      margin: 3,
      pitch: 4,
      holeShape: 'round',
      holeSize: 1,
      slitAngle: 0,
      cornerMode: 'fixed',
      // One hole in the box's corner, one just outside the middle of its edge (nearer the centre).
      holes: [
        [1, 1],
        [10, 15.7],
      ],
    }
    expect(touchesRect(holes, { minX: 0, minY: 0, maxX: 20, maxY: 15 })).toBe(true)
  })

  it('indexes only visible layers', () => {
    const project = createProject()
    const [cut, stitch] = project.layers
    stitch.visible = false
    project.pieces[0].entities.push({ ...square, layerId: cut.id }, { ...circle, layerId: stitch.id })
    expect(entitiesNear(project, [10, 5], 1).map((n) => n.entity.id)).toEqual(['sq'])
  })
})
