// MCP import/export (P3) in plain Node, like the real server: PDF export and SVG import install happy-dom
// themselves (headless-dom.ts), so this file deliberately does not use the happy-dom test environment.

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createProject } from '../document/factory'
import { exportDxf } from '../export/dxf'
import { rectangleSegments } from '../geometry/shapes'
import { startServer } from './test-harness'

let h: Awaited<ReturnType<typeof startServer>>
const call = (name: string, args?: Record<string, unknown>) => h.call(name, args)

beforeEach(async () => {
  h = await startServer()
})
afterEach(() => h.client.close())

describe('export_pdf', () => {
  it('writes a tiled 1:1 PDF, and embeds the CJK font for Chinese', async () => {
    const { docId } = await call('new_project', { name: 'Tote' })
    await call('add_rect', { docId, x: 0, y: 0, width: 300, height: 200 })
    const r = await call('export_pdf', { docId, path: 'tote.pdf' })
    const pdf = readFileSync(path.join(h.dir, 'tote.pdf'), 'latin1')
    expect(pdf.startsWith('%PDF-')).toBe(true)
    expect(r.bytes).toBe(pdf.length)
    // 300 × 200 mm on A4 with 10 mm overlap and margins: several sheets plus the cover page.
    expect((pdf.match(/\/Type \/Page\b/g) ?? []).length).toBeGreaterThan(2)
    expect(pdf).not.toContain('NotoSansSC')

    await call('add_text', { docId, position: [10, 20], text: '托特包' })
    await call('export_pdf', { docId, path: 'tote-zh.pdf', mode: 'single', language: 'zh-CN' })
    expect(readFileSync(path.join(h.dir, 'tote-zh.pdf'), 'latin1')).toContain('NotoSansSC')
  }, 30_000)
})

describe('import_file', () => {
  it('imports SVG in its units onto the reference layer, as one undo step', async () => {
    writeFileSync(
      path.join(h.dir, 'in.svg'),
      '<svg xmlns="http://www.w3.org/2000/svg" width="10cm" height="5cm" viewBox="0 0 100 50">' +
        '<rect x="0" y="0" width="100" height="50"/><circle cx="50" cy="25" r="10"/><text>skip</text></svg>',
    )
    const { docId, layers } = await call('new_project')
    const r = await call('import_file', { docId, path: 'in.svg' })
    expect(r.created).toHaveLength(2)
    expect(r.skipped).toBe(1)
    expect(r.bounds).toEqual([0, 0, 100, 50])
    const reference = layers.find((l: { kind: string }) => l.kind === 'reference').id
    expect(h.entities(docId).every((e) => e.layerId === reference && e.aiCreated)).toBe(true)
    expect(await call('undo', { docId })).toMatchObject({ entities: 0 })
  })

  it('imports DXF without a DOM, and reports unreadable files', async () => {
    const source = createProject()
    source.pieces[0].entities.push({
      id: 'r',
      type: 'path',
      layerId: source.layers[0].id,
      lineStyle: 'solid',
      strokeWidth: 0.2,
      segments: rectangleSegments([0, 0], [80, 40]),
      closed: true,
    })
    writeFileSync(path.join(h.dir, 'in.dxf'), exportDxf(source))
    const { docId } = await call('new_project')
    const r = await call('import_file', { docId, path: 'in.dxf', layer: 'cut' })
    expect(r.bounds).toEqual([0, 0, 80, 40])

    writeFileSync(path.join(h.dir, 'bad.dxf'), 'hello')
    await expect(call('import_file', { docId, path: 'bad.dxf' })).rejects.toThrow(/Cannot read 'bad.dxf'/)
    await expect(call('import_file', { docId, path: 'in.json' })).rejects.toThrow(/\.svg or \.dxf/)
  })
})

describe('resources', () => {
  it('lists and reads each open document as JSON and SVG', async () => {
    const { docId } = await call('new_project', { name: 'Belt' })
    await call('add_rect', { docId, x: 0, y: 0, width: 120, height: 30 })
    const { resources } = await h.client.listResources()
    expect(resources.map((r) => r.uri).sort()).toEqual([
      `leatherdraft://${docId}/drawing.svg`,
      `leatherdraft://${docId}/project.json`,
    ])
    const svg = await h.client.readResource({ uri: `leatherdraft://${docId}/drawing.svg` })
    expect((svg.contents[0] as { text: string }).text).toContain('width="120mm"')
    const json = await h.client.readResource({ uri: `leatherdraft://${docId}/project.json` })
    expect(JSON.parse((json.contents[0] as { text: string }).text).name).toBe('Belt')
  })
})
