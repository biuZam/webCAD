import { describe, expect, it } from 'vitest'
import type { Bounds } from '../../geometry/bounds'
import { layoutSinglePage, layoutTiles, rowName } from './layout'

const box = (minX: number, minY: number, maxX: number, maxY: number): Bounds => ({ minX, minY, maxX, maxY })

describe('layoutTiles', () => {
  it('fits a small drawing on one tile', () => {
    const l = layoutTiles(box(0, 0, 100, 100), [], { paper: 'a4', orientation: 'portrait', overlap: 10 })
    expect([l.rows, l.cols, l.tiles.length]).toEqual([1, 1, 1])
    // A4 portrait printable area: 210 − 2·10 wide, 297 − 2·10 − 6 high.
    expect(l.printable).toEqual({ x: 10, y: 16, w: 190, h: 271 })
  })

  it('steps tiles by printable size minus the overlap, and labels them like cells', () => {
    // 400 mm wide on A4 portrait: steps of 190 − 10 = 180 → ceil((400 − 10) / 180) = 3 columns.
    const l = layoutTiles(box(0, 0, 400, 100), [], { paper: 'a4', orientation: 'portrait', overlap: 10 })
    expect(l.cols).toBe(3)
    expect(l.tiles.map((t) => t.label)).toEqual(['A1', 'A2', 'A3'])
    expect(l.tiles.map((t) => t.area.x)).toEqual([0, 180, 360])
    // Each tile shares exactly `overlap` mm with the next.
    expect(l.tiles[0].area.x + l.tiles[0].area.w - l.tiles[1].area.x).toBe(10)
    expect(l.tiles[0].right).toBe('A2')
    expect(l.tiles[2].right).toBeUndefined()
  })

  it('needs no extra tile when the drawing exactly fills whole steps', () => {
    // 190 + 180 = 370 mm covers two tiles exactly.
    expect(layoutTiles(box(0, 0, 370, 50), [], { paper: 'a4', orientation: 'portrait', overlap: 10 }).cols).toBe(2)
  })

  it('picks the orientation needing fewer pages', () => {
    // 260 × 150: portrait needs 2 columns; landscape (277 × 184 printable) fits on one.
    const l = layoutTiles(box(0, 0, 260, 150), [], { paper: 'a4', orientation: 'auto', overlap: 10 })
    expect(l.orientation).toBe('landscape')
    expect(l.tiles).toHaveLength(1)
  })

  it('skips tiles that contain nothing, keeping grid labels and neighbours', () => {
    // An L shape: content only along the top row and down the left column.
    const content = [box(0, 0, 400, 20), box(0, 0, 20, 600)]
    const l = layoutTiles(box(0, 0, 400, 600), content, { paper: 'a4', orientation: 'portrait', overlap: 10 })
    expect(l.rows * l.cols).toBeGreaterThan(l.tiles.length)
    const labels = l.tiles.map((t) => t.label)
    expect(labels).toContain('A3')
    expect(labels).toContain('C1')
    expect(labels).not.toContain('B2')
    expect(l.tiles.find((t) => t.label === 'A2')!.below).toBeUndefined() // B2 was skipped
  })

  it('names rows past Z like spreadsheets', () => {
    expect([0, 25, 26, 27, 701].map(rowName)).toEqual(['A', 'Z', 'AA', 'AB', 'ZZ'])
  })
})

describe('layoutSinglePage', () => {
  it('sizes the page to the drawing plus header, margins and the calibration block', () => {
    const l = layoutSinglePage(box(-5, 0, 295, 200))
    expect(l.drawing).toEqual({ x: 10, y: 16, w: 300, h: 200 })
    expect(l.pageWidth).toBe(320)
    expect(l.calibration).toEqual({ x: 10, y: 226, w: 50, h: 50 })
    expect(l.pageHeight).toBe(16 + 200 + 70 + 10)
  })
})

describe('latin1', () => {
  it('keeps Latin-1 text and replaces anything else (one ? per character, emoji included)', async () => {
    const { latin1 } = await import('./index')
    expect(latin1('Café — 钱包 😀')).toBe('Café ? ?? ?')
  })
})
