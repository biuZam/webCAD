// @vitest-environment happy-dom
import '../test/canvas-stub'
import { describe, expect, it } from 'vitest'
import { entityBounds } from '../geometry/bounds'
import { pathLength } from '../geometry/kernel'
import { importSvg, SvgImportError, type ImportedShape } from './svg-import'

const svg = (attrs: string, body: string) => `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${body}</svg>`
const box = (s: ImportedShape) => {
  const b = entityBounds({ type: 'path', ...s } as never)
  return [b.minX, b.minY, b.maxX, b.maxY].map((v) => Math.round(v * 1e4) / 1e4)
}

describe('SVG import (T4.7)', () => {
  it('reads a true-scale export back at the same size (mm document, viewBox in mm)', () => {
    const { shapes } = importSvg(
      svg('width="100mm" height="60mm" viewBox="10 20 100 60"', '<g><path d="M10 20L110 20L110 80L10 80Z"/></g>'),
    )
    expect(shapes).toHaveLength(1)
    expect(shapes[0].closed).toBe(true)
    expect(shapes[0].segments.map((s) => s.p)).toEqual([
      [0, 0],
      [100, 0],
      [100, 60],
      [0, 60],
    ])
  })

  it('treats unitless documents as CSS px (96 per inch)', () => {
    const { shapes } = importSvg(svg('width="96" height="96"', '<line x1="0" y1="0" x2="96" y2="0"/>'))
    expect(pathLength(shapes[0])).toBeCloseTo(25.4, 9)
  })

  it('scales user units by width ÷ viewBox width', () => {
    const { shapes } = importSvg(
      svg('width="200mm" height="100mm" viewBox="0 0 400 200"', '<rect x="0" y="0" width="100" height="50"/>'),
    )
    expect(box(shapes[0])).toEqual([0, 0, 50, 25])
  })

  it('applies group and shape transforms in order', () => {
    const { shapes } = importSvg(
      svg(
        'width="100mm" height="100mm" viewBox="0 0 100 100"',
        '<g transform="translate(10 20)"><rect width="10" height="5" transform="scale(2) rotate(90)"/></g>',
      ),
    )
    // rotate(90) maps the 10×5 rect to x ∈ [−5, 0], y ∈ [0, 10]; scale(2) doubles; translate moves.
    expect(box(shapes[0])).toEqual([0, 20, 10, 40])
  })

  it('reads circles, ellipses, rounded rects, polylines, polygons and arcs in path data', () => {
    const { shapes } = importSvg(
      svg(
        'width="100mm" height="100mm" viewBox="0 0 100 100"',
        '<circle cx="50" cy="50" r="10"/>' +
          '<ellipse cx="0" cy="0" rx="4" ry="2"/>' +
          '<rect width="20" height="10" rx="2"/>' +
          '<polyline points="0,0 10,0 10,10"/>' +
          '<polygon points="0 0 10 0 5 8"/>' +
          '<path d="M0 0 A 10 10 0 0 1 20 0"/>',
      ),
    )
    expect(shapes).toHaveLength(6)
    expect(box(shapes[0])).toEqual([40, 40, 60, 60])
    expect(shapes.slice(3).map((s) => s.closed)).toEqual([false, true, false])
    expect(pathLength(shapes[5])).toBeCloseTo(Math.PI * 10, 2) // a half circle of radius 10
  })

  it('splits compound paths into separate outlines and skips hidden, defs and text', () => {
    const result = importSvg(
      svg(
        'width="10mm" height="10mm" viewBox="0 0 10 10"',
        '<defs><path d="M0 0L5 5"/></defs><path d="M0 0H4V4ZM6 6H9V9Z"/>' +
          '<path d="M0 0L1 1" style="display: none"/><text>Hi</text>',
      ),
    )
    expect(result.shapes).toHaveLength(2)
    expect(result.skipped).toBe(1)
  })

  it('rejects files that are not SVG', () => {
    expect(() => importSvg('{"not": "svg"}')).toThrow(SvgImportError)
  })
})
