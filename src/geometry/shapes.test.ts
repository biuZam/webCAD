import { describe, expect, it } from 'vitest'
import { pathLength } from './kernel'
import { rectangleSegments } from './shapes'

describe('rectangleSegments', () => {
  it('normalises corners so the result is the same for any drag direction', () => {
    expect(rectangleSegments([10, 10], [0, 0])).toEqual(rectangleSegments([0, 0], [10, 10]))
  })

  it('rounds corners with quarter-circle Béziers', () => {
    // Perimeter of a rounded rect: 2(w + h) − 8r + 2πr. Kappa Béziers are within 0.03% of a true arc.
    const segments = rectangleSegments([0, 0], [100, 60], 5)
    expect(segments).toHaveLength(8)
    expect(pathLength({ segments, closed: true })).toBeCloseTo(2 * 160 - 40 + 2 * Math.PI * 5, 1)
  })

  it('clamps the radius to half the shorter side', () => {
    const segments = rectangleSegments([0, 0], [20, 10], 50)
    expect(segments[0].p).toEqual([5, 0])
  })
})
