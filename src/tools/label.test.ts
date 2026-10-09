import { beforeEach, describe, expect, it } from 'vitest'
import { updateLayer } from '../document/commands'
import { createProject } from '../document/factory'
import type { Entity, PathEntity, TextEntity } from '../document/model'
import { createDocumentStore, type DocumentStore } from '../document/store'
import { entityBounds, textBox } from '../geometry/bounds'
import { grainArrowSegments } from '../geometry/shapes'
import { distance, type Vec2 } from '../lib/vec2'
import { createTools } from './index'
import { ToolSession, type SessionView } from './session'
import type { I18nKey, InputField, PreviewShape } from './types'

let store: DocumentStore
let session: ToolSession
let preview: PreviewShape[]
let prompt: { key: I18nKey; fields: InputField[] }
const view: SessionView = { zoom: 10, snaps: new Set(), activeLayerId: null }
const ev = (raw: Vec2, shift = false) => ({ raw, button: 0, shift, alt: false })
function click(p: Vec2, shift = false) {
  session.pointerMove(ev(p, shift))
  session.pointerDown(ev(p, shift))
  session.pointerUp(ev(p, shift))
}
const entities = (): Entity[] => store.getState().project.pieces[0].entities
const notesLayer = () => store.getState().project.layers.find((l) => l.kind === 'notes')!

beforeEach(() => {
  store = createDocumentStore(createProject())
  session = new ToolSession(store, createTools(), () => view, {
    preview: (s) => (preview = s),
    prompt: (key, fields) => (prompt = { key, fields }),
    tool: () => {},
    cursor: () => {},
    selection: () => {},
  })
  session.setTool('label')
})

describe('label tool: text', () => {
  it('click, type, Enter: adds the text on the Notes layer as one undo step', () => {
    click([10, 20])
    expect(prompt.key).toBe('label.promptText')
    expect(prompt.fields[0]).toMatchObject({ key: 'text', kind: 'text' })
    session.input({}, false, { text: 'Strap · cut 2' })
    expect(preview.some((s) => s.kind === 'entity' && s.entity.type === 'text')).toBe(true)
    session.input({ size: 8, angle: 90 }, true, { text: 'Strap · cut 2' })
    const [label] = entities() as TextEntity[]
    expect(label).toMatchObject({
      type: 'text',
      text: 'Strap · cut 2',
      position: [10, 20],
      size: 8,
      rotation: -90, // typed counter-clockwise; the model stores clockwise
      layerId: notesLayer().id,
    })
    expect(store.getState().past.at(-1)?.labelKey).toBe('history.addLabel')
    expect(prompt.key).toBe('label.promptPlace')
  })

  it('reuses the last text, size and angle for the next label (Enter with nothing typed)', () => {
    click([0, 0])
    session.input({ size: 3 }, true, { text: 'Front' })
    click([0, 50])
    expect(prompt.fields[0]).toMatchObject({ liveText: 'Front' })
    session.finish()
    expect(entities().map((e) => (e as TextEntity).text)).toEqual(['Front', 'Front'])
    expect((entities()[1] as TextEntity).size).toBe(3)
  })

  it('does nothing without any text; Esc goes back to placing', () => {
    click([0, 0])
    session.finish()
    expect(entities()).toHaveLength(0)
    session.cancel()
    expect(prompt.key).toBe('label.promptPlace')
  })

  it('falls back to the active layer when Notes is locked', () => {
    store.getState().dispatch(updateLayer(notesLayer().id, { locked: true }))
    click([0, 0])
    session.input({}, true, { text: 'A' })
    expect(entities()[0].layerId).toBe(store.getState().project.layers[0].id)
  })
})

describe('label tool: grain arrow', () => {
  beforeEach(() => session.input({ mode: 1 }, false))

  it('two clicks draw a double-headed arrow as one path', () => {
    click([0, 0])
    session.pointerMove(ev([0, 40]))
    expect(preview.some((s) => s.kind === 'path')).toBe(true)
    click([0, 40])
    const [arrow] = entities() as PathEntity[]
    expect(arrow.type).toBe('path')
    expect(arrow.closed).toBe(false)
    expect(arrow.layerId).toBe(notesLayer().id)
    expect(store.getState().past.at(-1)?.labelKey).toBe('history.addGrainArrow')
    const pts = arrow.segments.map((s) => s.p)
    expect(pts).toContainEqual([0, 0])
    expect(pts).toContainEqual([0, 40])
  })

  it('takes typed length and angle (counter-clockwise, y up on screen)', () => {
    click([10, 10])
    session.input({ length: 30, angle: 90 }, true)
    const arrow = entities()[0] as PathEntity
    const b = entityBounds(arrow)
    expect(b.minY).toBeCloseTo(-20, 9) // 30 mm straight up from (10, 10)
    expect(b.maxY).toBeCloseTo(10, 9)
  })
})

describe('grain arrow and text geometry', () => {
  it('puts both heads inside the arrow’s length, with 5 mm barbs at most', () => {
    const segs = grainArrowSegments([0, 0], [100, 0])
    const b = entityBounds({ type: 'path', segments: segs, closed: false } as PathEntity)
    expect(b.minX).toBe(0)
    expect(b.maxX).toBe(100)
    for (const s of segs) expect(Math.min(distance(s.p, [0, 0]), distance(s.p, [100, 0]))).toBeLessThanOrEqual(5 + 1e-9)
    // Short arrows get proportionally short heads.
    const short = grainArrowSegments([0, 0], [8, 0])
    expect(Math.max(...short.map((s) => Math.abs(s.p[1])))).toBeCloseTo(1, 9) // 2 mm head × sin 30°
  })

  it('estimates text boxes, wider for CJK, and rotates them', () => {
    const latin = textBox({ position: [0, 0], text: 'abcde', size: 10, rotation: 0 })
    expect(latin[1][0]).toBeCloseTo(30, 9)
    const cjk = textBox({ position: [0, 0], text: '前片', size: 10, rotation: 0 })
    expect(cjk[1][0]).toBeCloseTo(20, 9)
    // Rotated 90° clockwise (y-down): the text runs downwards.
    const down = textBox({ position: [0, 0], text: 'abcde', size: 10, rotation: 90 })
    expect(down[1][0]).toBeCloseTo(0, 9)
    expect(down[1][1]).toBeCloseTo(30, 9)
  })
})
