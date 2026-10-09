import { describe, expect, it } from 'vitest'
import { gridSpacing, snapToGrid } from './grid'

describe('grid', () => {
  it('picks the finest spacing at least 8 px apart', () => {
    expect(gridSpacing(10)).toEqual({ minor: 1, major: 10 })
    expect(gridSpacing(100)).toEqual({ minor: 0.1, major: 1 })
    expect(gridSpacing(3.78)).toEqual({ minor: 10, major: 100 })
  })

  it('snaps without float noise', () => {
    expect(snapToGrid([0.31, 0.29], 0.1)).toEqual([0.3, 0.3])
    expect(snapToGrid([14, -16], 10)).toEqual([10, -20])
  })
})
