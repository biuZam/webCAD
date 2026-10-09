import { beforeEach, describe, expect, it } from 'vitest'
import { addEntities } from '../document/commands'
import { createProject } from '../document/factory'
import type { CircleEntity, Entity, Id, PathEntity } from '../document/model'
import { createDocumentStore, type DocumentStore } from '../document/store'
import { emptyBounds, entityBounds } from '../geometry/bounds'
import { rectangleSegments } from '../geometry/shapes'
import type { Vec2 } from '../lib/vec2'
import { createTools } from './index'
import { ToolSession, type SessionView } from './session'
import type { I18nKey, InputField, PreviewShape } from './types'

let store: DocumentStore
let session: ToolSession
let selection: readonly Id[]
let prompt: { key: I18nKey; fields: InputField[] }
let preview: PreviewShape[]

const ev = (raw: Vec2) => ({ raw, button: 0, shift: false, alt: false })
function click(p: Vec2) {
  session.pointerMove(ev(p))
  session.pointerDown(ev(p))
  session.pointerUp(ev(p))
}
const entities = () => store.getState().project.pieces[0].entities
const boundsOf = (e: Entity) => {
  const b = entityBounds(e, emptyBounds())
  return [b.minX, b.minY, b.maxX, b.maxY].map((v) => Math.round(v * 1000) / 1000)
}

beforeEach(() => {
  const project = createProject()
  const layerId = project.layers[0].id
  const base = { layerId, lineStyle: 'solid', strokeWidth: 0.2 } as const
  const list: Entity[] = [
    { ...base, id: 'sq', type: 'path', segments: rectangleSegments([0, 0], [100, 60]), closed: true },
    { ...base, id: 'c', type: 'circle', lineStyle: 'dashed', center: [200, 30], rx: 20, ry: 20, rotation: 0 },
  ]
  store = createDocumentStore(project)
  store.getState().dispatch(addEntities(project.pieces[0].id, list))
  // Grid on (10 px/mm → 1 mm grid) so the through-cursor test sees a grid snap it must ignore.
  const view: SessionView = { zoom: 10, snaps: new Set(['grid']), activeLayerId: null }
  selection = []
  session = new ToolSession(store, createTools(), () => view, {
    preview: (s) => (preview = s),
    prompt: (key, fields) => (prompt = { key, fields }),
    tool: () => {},
    cursor: () => {},
    selection: (ids) => (selection = ids),
  })
  session.setTool('offset')
})

describe('offset tool', () => {
  it('asks for a source, then offsets inward through the cursor', () => {
    expect(prompt.key).toBe('offset.promptPick')
    click([100.2, 30]) // pick the square's right edge
    expect(selection).toEqual(['sq'])
    session.pointerMove(ev([96, 30])) // 4 mm inside
    expect(preview.some((s) => s.kind === 'path')).toBe(true)
    click([96, 30])
    const made = entities()[1] as PathEntity
    expect(made.id).not.toBe('sq')
    expect(boundsOf(made)).toEqual([4, 4, 96, 56])
    // Inserted right after its source, same style, and selected for the next offset.
    expect(selection).toEqual([made.id])
    expect(store.getState().past.at(-1)?.labelKey).toBe('history.offset')
  })

  it('uses a typed distance on the cursor side, and remembers it', () => {
    click([100.2, 30])
    session.pointerMove(ev([120, 30])) // outside
    session.input({ distance: 3.5 }, true)
    expect(boundsOf(entities()[1])).toEqual([-3.5, -3.5, 103.5, 63.5])
    // Next click offsets the new line by the remembered 3.5 mm, not through the cursor.
    click([130, 30])
    expect(boundsOf(entities()[2])).toEqual([-7, -7, 107, 67])
    expect(prompt.fields.find((f) => f.key === 'through')?.live).toBe(0)
  })

  it('offsets circles exactly, keeping the source’s style', () => {
    click([220.1, 30])
    session.pointerMove(ev([205, 30]))
    session.input({ distance: 5 }, true)
    const made = entities().find((e) => e.id !== 'c' && e.type === 'circle') as CircleEntity
    expect(made.rx).toBe(15)
    expect(made.lineStyle).toBe('dashed')
  })

  it('switches join style from the choice field (round outward corners)', () => {
    click([100.2, 30])
    session.input({ join: 1 }, false) // round
    session.pointerMove(ev([110, 30]))
    session.input({ distance: 5 }, true)
    const made = entities()[1] as PathEntity
    expect(made.segments.some((s) => s.hi || s.ho)).toBe(true)
  })

  it('Esc drops the source, a second Esc leaves the tool', () => {
    click([100.2, 30])
    session.cancel()
    expect(selection).toEqual([])
    expect(prompt.key).toBe('offset.promptPick')
    session.cancel()
    expect(session.activeToolId).toBe('select')
  })

  it('ignores grid snapping for the through-cursor distance', () => {
    click([100.2, 30])
    // A grid snap would put this point back on the edge (distance 0); the raw 2.7 mm must be used.
    session.pointerMove({ raw: [97.3, 30], button: 0, shift: false, alt: false })
    expect(prompt.fields.find((f) => f.key === 'distance')?.live).toBeCloseTo(2.7)
  })

  it('starts from an existing selection', () => {
    session.setTool('select')
    click([100.2, 30])
    session.setTool('offset')
    expect(prompt.key).toBe('offset.promptSide')
  })
})
