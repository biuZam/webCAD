import { describe, expect, it } from 'vitest'
import { acceptanceProject } from '../document/fixtures'
import { exportSvg } from './svg'
import { hasWatermark, layoutWatermark } from './watermark'

describe('watermark', () => {
  it('covers the whole rectangle, centres included and corners reached', () => {
    const { marks, size } = layoutWatermark('DRAFT', 0, 0, 200, 100)
    expect(size).toBe(10)
    expect(marks.length).toBeGreaterThan(10)
    const near = (x: number, y: number) => marks.some(([mx, my]) => Math.hypot(mx - x, my - y) < 40)
    for (const [x, y] of [
      [0, 0],
      [200, 0],
      [0, 100],
      [200, 100],
      [100, 50],
    ])
      expect(near(x, y)).toBe(true)
  })

  it('ignores blank text', () => {
    expect(hasWatermark({ text: '  ' })).toBe(false)
    expect(hasWatermark(undefined)).toBe(false)
  })

  it('adds a top Inkscape layer of escaped, tilted text to the SVG only when asked', () => {
    expect(exportSvg(acceptanceProject())).not.toContain('id="watermark"')
    const svg = exportSvg(acceptanceProject(), { watermark: { text: 'A&B 样板', opacity: 0.2 } })
    const group = /<g id="watermark"[^>]*>(.*?)<\/g>\n<\/svg>/.exec(svg)
    expect(group).not.toBeNull()
    expect(group![0]).toContain('fill-opacity="0.2"')
    expect(group![1]).toContain('>A&amp;B 样板</text>')
    expect(group![1]).toContain('transform="rotate(-30 ')
  })
})
