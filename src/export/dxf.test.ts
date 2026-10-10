import { describe, expect, it } from 'vitest'
import { createProject } from '../document/factory'
import type { Entity, Project, Segment } from '../document/model'
import { toPaperPath } from '../geometry/kernel'
import { MAKER_ARC_ACCURACY } from '../geometry/maker-adapter'
import { rectangleSegments } from '../geometry/shapes'
import { acceptanceProject } from '../document/fixtures'
import { exportDxf } from './dxf'

interface DxfEntity {
  type: string
  [code: string]: string
}

/** Minimal DXF reader: the ENTITIES section as {type, code → value} records. */
function entities(dxf: string): DxfEntity[] {
  const lines = dxf.split('\n').map((l) => l.trim())
  const out: DxfEntity[] = []
  let inEntities = false
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const [code, value] = [lines[i], lines[i + 1]]
    if (code === '2' && value === 'ENTITIES') inEntities = true
    else if (code === '0' && value === 'ENDSEC') inEntities = false
    else if (inEntities && code === '0') out.push({ type: value })
    else if (inEntities && out.length > 0) out[out.length - 1][code] = value
  }
  return out
}

function project(list: (layerIndex: number) => Entity[]): Project {
  const p = createProject()
  p.pieces[0].entities = [0, 1, 2, 3].flatMap((i) => list(i).map((e) => ({ ...e, layerId: p.layers[i].id })))
  return p
}

const base = { lineStyle: 'solid', strokeWidth: 0.2, layerId: '' } as const

describe('DXF export (T4.6)', () => {
  it('starts with a LeatherDraft comment (group 999)', () => {
    const dxf = exportDxf(acceptanceProject())
    expect(dxf.startsWith('999\nCreated with LeatherDraft (https://github.com/biuZam/webCAD)\n0\nSECTION')).toBe(true)
  })

  it('writes millimetre units, straight edges as LINEs on named layers, y up', () => {
    const p = project((i) =>
      i === 0 ? [{ ...base, id: 'r', type: 'path', segments: rectangleSegments([0, 0], [100, 60]), closed: true }] : [],
    )
    const dxf = exportDxf(p)
    expect(dxf).toMatch(/\$INSUNITS\s+70\s+4\b/)
    const lines = entities(dxf).filter((e) => e.type === 'LINE')
    expect(lines).toHaveLength(4)
    expect(new Set(lines.map((l) => l['8']))).toEqual(new Set(['cut']))
    const ys = lines.flatMap((l) => [Number(l['20']), Number(l['21'])])
    expect(Math.min(...ys)).toBe(-60) // y-down 60 becomes y-up −60
    expect(Math.max(...ys)).toBe(0)
  })

  it('writes circles and round holes as CIRCLEs; leaves out labels', () => {
    const p = project((i) =>
      i === 0
        ? [
            { ...base, id: 'c', type: 'circle', center: [10, 20], rx: 5, ry: 5, rotation: 0 },
            { ...base, id: 't', type: 'text', position: [0, 0], text: 'Front', size: 5, rotation: 0 },
          ]
        : [],
    )
    const [circle, ...rest] = entities(exportDxf(p))
    expect(rest).toHaveLength(0)
    expect(circle).toMatchObject({ type: 'CIRCLE', '10': '10', '20': '-20', '40': '5' })
  })

  it('fits curves with ARCs within the accuracy, or flattens them in polyline mode', () => {
    const segments: Segment[] = [
      { p: [0, 0], ho: [0, 30] },
      { p: [40, 0], hi: [10, 30] },
    ]
    const curve = { segments, closed: false }
    const p = project((i) => (i === 0 ? [{ ...base, id: 'b', type: 'path', ...curve }] : []))
    const arcs = entities(exportDxf(p)).filter((e) => e.type === 'ARC')
    expect(arcs.length).toBeGreaterThan(3)
    const truth = toPaperPath(curve)
    let worst = 0
    for (const a of arcs) {
      const [cx, cy, r] = [Number(a['10']), -Number(a['20']), Number(a['40'])]
      let [start, end] = [Number(a['50']), Number(a['51'])]
      if (end < start) end += 360
      for (let k = 0; k <= 8; k++) {
        const t = ((start + ((end - start) * k) / 8) * Math.PI) / 180
        // DXF angles are counter-clockwise in y-up; back to y-down for the comparison.
        const q = new (truth.firstSegment.point.constructor as typeof paper.Point)(
          cx + r * Math.cos(t),
          cy - r * Math.sin(t),
        )
        worst = Math.max(worst, truth.getNearestPoint(q).getDistance(q))
      }
    }
    expect(worst).toBeLessThanOrEqual(MAKER_ARC_ACCURACY * 2)

    const flat = entities(exportDxf(p, { polyline: true }))
    expect(flat.some((e) => e.type === 'ARC')).toBe(false)
    expect(flat.filter((e) => e.type === 'LINE').length).toBeGreaterThan(10)
  })

  it('follows the layer and cut-only choices', () => {
    const p = project((i) => [{ ...base, id: `l${i}`, type: 'centreLine', from: [0, i], to: [10, i] }])
    expect(entities(exportDxf(p, { cutOnly: true })).map((e) => e['8'])).toEqual(['cut'])
    expect(
      entities(exportDxf(p))
        .map((e) => e['8'])
        .sort(),
    ).toEqual(['cut', 'notes', 'reference', 'stitch'])
  })
})
