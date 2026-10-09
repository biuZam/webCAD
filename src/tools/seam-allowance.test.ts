import { beforeEach, describe, expect, it } from 'vitest'
import { addEntities } from '../document/commands'
import { createProject } from '../document/factory'
import type { Entity, PathEntity } from '../document/model'
import { createDocumentStore, type DocumentStore } from '../document/store'
import { entityBounds } from '../geometry/bounds'
import { rectangleSegments } from '../geometry/shapes'
import type { Vec2 } from '../lib/vec2'
import { createTools } from './index'
import { ToolSession, type SessionView } from './session'
import type { I18nKey, PreviewShape, PromptParams } from './types'

let store: DocumentStore
let session: ToolSession
let preview: PreviewShape[]
let prompt: { key: I18nKey; params?: PromptParams }
const view: SessionView = { zoom: 10, snaps: new Set(), activeLayerId: null }
const ev = (raw: Vec2, shift = false) => ({ raw, button: 0, shift, alt: false })
function click(p: Vec2, shift = false) {
  session.pointerMove(ev(p, shift))
  session.pointerDown(ev(p, shift))
  session.pointerUp(ev(p, shift))
}
const all = (): Entity[] => store.getState().project.pieces[0].entities
const box = (e: Entity) => {
  const b = entityBounds(e)
  return [b.minX, b.minY, b.maxX, b.maxY].map((v) => Math.round(v * 1e3) / 1e3)
}

beforeEach(() => {
  const project = createProject()
  const outline: PathEntity = {
    id: 'o',
    type: 'path',
    layerId: project.layers[0].id,
    lineStyle: 'solid',
    strokeWidth: 0.2,
    segments: rectangleSegments([0, 0], [100, 60]),
    closed: true,
  }
  store = createDocumentStore(project)
  store.getState().dispatch(addEntities(project.pieces[0].id, [outline]))
  session = new ToolSession(store, createTools(), () => view, {
    preview: (s) => (preview = s),
    prompt: (key, _fields, params) => (prompt = { key, params }),
    tool: () => {},
    cursor: () => {},
    selection: () => {},
  })
  session.setTool('seamAllowance')
})

describe('seam allowance tool (L6)', () => {
  it('pick an outline, set all edges, then one edge, and add the result', () => {
    click([50, 0.2])
    expect(prompt).toEqual({ key: 'seamAllowance.promptAll', params: { values: '10 · 10 · 10 · 10' } })
    expect(preview.some((s) => s.kind === 'path' && s.dashed)).toBe(true)
    session.input({ allowance: 6 }, true)
    click([100.2, 30]) // the right edge
    expect(prompt.key).toBe('seamAllowance.promptEdges')
    session.input({ allowance: 15 }, true)
    expect(prompt.params).toEqual({ values: '6 · 15 · 6 · 6' })
    session.finish()
    const added = all().at(-1)!
    expect(added.id).not.toBe('o')
    expect(box(added)).toEqual([-6, -6, 115, 66])
    expect(store.getState().past.at(-1)?.labelKey).toBe('history.seamAllowance')
    expect(prompt.key).toBe('seamAllowance.promptPick')
  })

  it('Shift-click picks several edges; Esc clears them, then the outline', () => {
    click([50, 0.2])
    click([50, 60.2])
    click([50, -0.2], true)
    session.input({ allowance: 0 }, true)
    expect(prompt.params).toEqual({ values: '0 · 10 · 0 · 10' })
    session.cancel()
    expect(prompt.key).toBe('seamAllowance.promptAll')
    session.cancel()
    expect(prompt.key).toBe('seamAllowance.promptPick')
  })
})
