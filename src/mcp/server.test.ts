// End-to-end tests of the MCP server through a real client over an in-memory transport.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { stitchLine } from '../document/builders'
import { insertEntitiesAfter } from '../document/commands'
import type { PathEntity } from '../document/model'
import { startServer } from './test-harness'

let h: Awaited<ReturnType<typeof startServer>>
let dir: string
const call = (name: string, args?: Record<string, unknown>) => h.call(name, args)
const entities = (docId: string) => h.entities(docId)

beforeEach(async () => {
  h = await startServer()
  dir = h.dir
})
afterEach(() => h.client.close())

describe('tools', () => {
  it('registers only read tools in read-only mode', async () => {
    const all = (await h.client.listTools()).tools.map((t) => t.name)
    expect(all).toEqual(expect.arrayContaining(['add_rect', 'save_project', 'undo', 'get_project']))
    await h.client.close()
    h = await startServer({ readonly: true })
    const ro = (await h.client.listTools()).tools.map((t) => t.name).sort()
    expect(ro).toEqual([
      'close_project',
      'export_dxf',
      'export_pdf',
      'export_svg',
      'get_entity',
      'get_project',
      'list_entities',
      'list_projects',
      'measure',
      'open_project',
      'outline_edges',
    ])
  })
})

describe('drawing', () => {
  it('adds lines one entity per segment, as one undo step, marked as AI-made', async () => {
    const { docId } = await call('new_project')
    const r = await call('add_lines', {
      docId,
      points: [
        [0, 0],
        [10, 0],
        [10, 10],
      ],
      closed: true,
    })
    expect(r.created).toHaveLength(3)
    expect(r.bounds).toEqual([0, 0, 10, 10])
    expect(entities(docId).every((e) => e.aiCreated && e.type === 'path' && e.segments.length === 2)).toBe(true)
    expect(await call('undo', { docId })).toMatchObject({ steps: 1, history: { undo: 0, redo: 1 }, entities: 0 })

    await call('add_lines', {
      docId,
      points: [
        [0, 0],
        [10, 0],
        [10, 10],
      ],
      mode: 'polyline',
      closed: true,
    })
    expect(entities(docId)).toHaveLength(1)
    expect((entities(docId)[0] as PathEntity).closed).toBe(true)
  })

  it('puts items on their default layers with the layer style', async () => {
    const { docId, layers } = await call('new_project')
    const kindOf = (id: string) => layers.find((l: { id: string }) => l.id === id).kind
    await call('add_entities', {
      docId,
      items: [
        { kind: 'rect', x: 0, y: 0, width: 80, height: 50, cornerRadius: 4 },
        { kind: 'text', position: [5, 10], text: 'Card' },
        { kind: 'centreLine', from: [40, -5], to: [40, 55] },
        { kind: 'arc', center: [0, 0], r: 10, startAngle: 0, sweepAngle: 90 },
      ],
    })
    const [rect, text, centre, arc] = entities(docId)
    expect([rect, text, centre, arc].map((e) => kindOf(e.layerId))).toEqual(['cut', 'notes', 'reference', 'cut'])
    expect([rect.lineStyle, centre.lineStyle]).toEqual(['solid', 'dashDot'])
    // Clockwise on screen from +x: ends at +y (down).
    expect((arc as PathEntity).segments.at(-1)!.p.map(Math.round)).toEqual([0, 10])
    expect(await call('undo', { docId })).toMatchObject({ entities: 0 })
  })

  it('refuses locked layers and explains how to fix it', async () => {
    const { docId } = await call('new_project')
    await call('update_layer', { docId, layer: 'cut', locked: true })
    await expect(call('add_circle', { docId, center: [0, 0], r: 5 })).rejects.toThrow(/locked.*update_layer/)
    await expect(call('add_circle', { docId, center: [0, 0], r: 5, layer: 'nope' })).rejects.toThrow(/Unknown layer/)
  })

  it('lists, measures and returns full entities', async () => {
    const { docId } = await call('new_project')
    const { created } = await call('add_rect', { docId, x: 10, y: 20, width: 100, height: 50 })
    const list = await call('list_entities', { docId, layer: 'cut' })
    expect(list.total).toBe(1)
    expect(list.entities[0]).toMatchObject({ id: created[0], layer: 'cut', bounds: [10, 20, 110, 70], aiCreated: true })
    expect(await call('measure', { docId, id: created[0] })).toMatchObject({ length: 300, area: 5000 })
    const { entities: full } = await call('get_entity', { docId, ids: created })
    expect(full[0].segments).toHaveLength(4)
  })
})

describe('editing', () => {
  it('transforms with clockwise angles, and copies', async () => {
    const { docId } = await call('new_project')
    const { created } = await call('add_lines', {
      docId,
      points: [
        [0, 0],
        [10, 0],
      ],
    })
    const r = await call('transform', { docId, ids: created, operation: { op: 'rotate', center: [0, 0], angle: 90 } })
    expect(r.bounds).toEqual([0, 0, 0, 10])
    const copy = await call('transform', { docId, ids: created, operation: { op: 'move', dx: 5, dy: 0 }, copy: true })
    expect(copy.created).toHaveLength(1)
    expect(entities(docId)).toHaveLength(2)
  })

  it('offsets and validates updates', async () => {
    const { docId } = await call('new_project')
    const { created } = await call('add_circle', { docId, center: [0, 0], r: 10 })
    const off = await call('offset', { docId, id: created[0], distance: -2 })
    expect(off.bounds).toEqual([-8, -8, 8, 8])
    await call('update_entity', { docId, id: created[0], changes: { rx: 20, ry: 20 } })
    expect(entities(docId)[0]).toMatchObject({ rx: 20, ry: 20 })
    await expect(call('update_entity', { docId, id: created[0], changes: { segments: [] } })).rejects.toThrow(
      /Invalid changes for a circle/,
    )
  })

  it('protects derived entities unless detach is passed', async () => {
    const { docId, layers } = await call('new_project')
    const { created } = await call('add_rect', { docId, x: 0, y: 0, width: 50, height: 30 })
    const doc = h.sessions.get(docId)
    const outline = entities(docId)[0]
    const line = stitchLine(outline, layers[1].id, -3, 'miter')!.entity
    doc.store.getState().dispatch(insertEntitiesAfter([{ afterId: created[0], entities: [line] }]))
    const move = { op: 'move', dx: 1, dy: 0 }
    await expect(call('transform', { docId, ids: [line.id], operation: move })).rejects.toThrow(/follows/)
    // Moving it with its source keeps the link.
    await call('transform', { docId, ids: [created[0], line.id], operation: move })
    expect((entities(docId)[1] as PathEntity).derived).toBeDefined()
    await call('update_entity', { docId, id: line.id, detach: true })
    expect((entities(docId)[1] as PathEntity).derived).toBeUndefined()
  })
})

describe('files', () => {
  it('saves, reopens, refuses to lose changes and stays inside the root', async () => {
    const { docId } = await call('new_project', { name: 'Wallet' })
    await call('add_rect', { docId, x: 0, y: 0, width: 95, height: 80 })
    await expect(call('close_project', { docId })).rejects.toThrow(/Unsaved/)
    await expect(call('save_project', { docId })).rejects.toThrow(/pass a path/)
    mkdirSync(path.join(dir, 'out'))
    await call('save_project', { docId, path: 'out/wallet.json' })
    expect(JSON.parse(readFileSync(path.join(dir, 'out/wallet.json'), 'utf8')).name).toBe('Wallet')
    await call('close_project', { docId })

    const reopened = await call('open_project', { path: 'out/wallet.json' })
    expect(reopened).toMatchObject({ name: 'Wallet', dirty: false, aiUnreviewed: 1 })
    expect((await call('open_project', { path: 'out/wallet.json' })).docId).toBe(reopened.docId)

    await expect(call('save_project', { docId: reopened.docId, path: '../x.json' })).rejects.toThrow(/outside/)
    await expect(call('save_project', { docId: reopened.docId, path: '/etc/x.json' })).rejects.toThrow(/outside/)
    await expect(call('export_svg', { docId: reopened.docId, path: 'a.json' })).rejects.toThrow(/\.svg/)
  })

  it('rejects files that are not projects', async () => {
    writeFileSync(path.join(dir, 'bad.json'), '{"hello": 1}')
    await expect(call('open_project', { path: 'bad.json' })).rejects.toThrow(/not.*LeatherDraft project/i)
  })

  it('exports SVG at true scale, as text or to a file, and DXF', async () => {
    const { docId } = await call('new_project')
    await call('add_rect', { docId, x: 0, y: 0, width: 100, height: 40 })
    const { svg } = await call('export_svg', { docId })
    expect(svg).toContain('width="100mm"')
    expect(svg).not.toContain('aiCreated')
    await call('export_svg', { docId, path: 'p.svg', margin: 5 })
    expect(readFileSync(path.join(dir, 'p.svg'), 'utf8')).toContain('width="110mm"')
    await call('export_dxf', { docId, path: 'p.dxf' })
    expect(readFileSync(path.join(dir, 'p.dxf'), 'utf8')).toContain('$INSUNITS')
  })
})

describe('layering', () => {
  it('keeps the App and the MCP server apart', async () => {
    const { readdirSync, statSync } = await import('node:fs')
    const src = path.resolve(__dirname, '..')
    const files = (d: string): string[] =>
      readdirSync(d).flatMap((f) => {
        const p = path.join(d, f)
        return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) ? [p] : []
      })
    const imports = (f: string) => [...readFileSync(f, 'utf8').matchAll(/from '([^']+)'/g)].map((m) => m[1])
    for (const f of files(src)) {
      const inMcp = f.startsWith(path.join(src, 'mcp'))
      for (const spec of imports(f)) {
        if (inMcp) expect(spec, f).not.toMatch(/^(react|react-dom|zustand$)|\/(app|ui|canvas|i18n)\//)
        else expect(spec, f).not.toMatch(/\/mcp\//)
      }
    }
  })
})
