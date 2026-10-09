import { describe, expect, it } from 'vitest'
import type { Segment } from '../document/model'
import { fromPaperPath, pathLength, toPaperPath } from './kernel'
import { rectangleSegments } from './shapes'

describe('geometry kernel', () => {
  it('round-trips model segments through Paper.js losslessly', () => {
    const segments: Segment[] = [{ p: [0, 0], ho: [5, -5] }, { p: [20, 0], hi: [-5, -5] }, { p: [20, 10] }]
    expect(fromPaperPath(toPaperPath({ segments, closed: true }))).toEqual({ segments, closed: true })
  })

  it('measures path length in mm', () => {
    expect(pathLength({ segments: rectangleSegments([0, 0], [100, 50]), closed: true })).toBeCloseTo(300)
  })
})
