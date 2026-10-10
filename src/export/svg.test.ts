import { describe, expect, it } from 'vitest'
import { acceptanceProject } from '../document/fixtures'
import { exportSvg, pathData } from './svg'

describe('exportSvg', () => {
  const project = acceptanceProject()
  const svg = exportSvg(project)

  it('sizes the document in mm with 1 user unit = 1 mm (PRD acceptance test)', () => {
    expect(svg).toContain('width="100mm" height="100mm" viewBox="0 0 100 100"')
  })

  it('names LeatherDraft as the generator in <metadata>, nothing about the user', () => {
    expect(svg).toContain(
      '<metadata id="leatherdraft">Created with LeatherDraft (https://github.com/biuZam/webCAD)</metadata>',
    )
  })

  it('writes one Inkscape layer group per visible layer', () => {
    for (const layer of project.layers) {
      expect(svg).toContain(`inkscape:groupmode="layer" inkscape:label="${layer.name}"`)
    }
  })

  it('exports geometry natively: closed square, circle, dash-dot centre line, holes', () => {
    expect(svg).toContain('d="M0 0L100 0L100 100L0 100Z"')
    expect(svg).toContain('<circle id="' + project.pieces[0].entities[1].id + '" cx="50" cy="50" r="25"')
    expect(svg).toContain('stroke-dasharray="6 1.5 0.5 1.5"')
    // Corner-aware at 3.85 mm round a 92 mm inset square: 92 / 3.85 → 24 gaps per side, 96 holes.
    expect(svg.match(/<circle cx=/g)).toHaveLength(96)
  })

  it('exports slit holes as short lines at path direction + slit angle, always solid', () => {
    const p = acceptanceProject()
    const holes = p.pieces[0].entities.find((e) => e.type === 'holeSet')!
    Object.assign(holes, { holeShape: 'slit', slitAngle: 90, holeSize: 2, lineStyle: 'dashed' })
    const element = new RegExp(`<path id="${holes.id}" d="([^"]+)"([^>]*)/>`).exec(exportSvg(p))
    expect(element).not.toBeNull()
    const [, d, attrs] = element!
    // First hole: corner (4, 4) on the top edge (direction 0°) → slit at 90°: vertical, 2 mm long.
    expect(d.startsWith('M4 3L4 5')).toBe(true)
    expect(attrs).not.toContain('stroke-dasharray')
  })

  it('polyline mode flattens curves and circles to straight segments only', () => {
    const out = exportSvg(acceptanceProject(), { polyline: true, cutOnly: true })
    expect(out).not.toContain('<circle')
    const ds = [...out.matchAll(/ d="([^"]+)"/g)].map((m) => m[1])
    expect(ds.length).toBeGreaterThan(0)
    for (const d of ds) expect(d).not.toMatch(/C/)
    // The circle became a many-sided polygon within 0.01 mm of r = 25: every vertex is ~25 mm from (50, 50).
    const circle = ds.find((d) => d.split('L').length > 20)!
    for (const [, x, y] of circle.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)) {
      expect(Math.abs(Math.hypot(Number(x) - 50, Number(y) - 50) - 25)).toBeLessThan(0.01)
    }
  })

  it('cut-only drops other layers', () => {
    const cut = exportSvg(project, { cutOnly: true })
    expect(cut.match(/inkscape:groupmode="layer"/g)).toHaveLength(1)
    expect(cut).not.toContain('stroke-dasharray')
  })

  it('emits cubic commands for handles, including the closing edge', () => {
    expect(
      pathData(
        [
          { p: [0, 0], hi: [0, 1], ho: [1, 0] },
          { p: [10, 0], hi: [-1, 0] },
        ],
        true,
      ),
    ).toBe('M0 0C1 0 9 0 10 0C10 0 0 1 0 0Z')
  })

  it('rounds coordinates to 0.001 mm', () => {
    expect(pathData([{ p: [1 / 3, 2 / 3] }], false)).toBe('M0.333 0.667')
  })
})
