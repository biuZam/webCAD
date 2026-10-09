import { beforeEach, describe, expect, it } from 'vitest'
import { addEntities, updateEntity, updateLayer } from '../document/commands'
import { createProject } from '../document/factory'
import type { CircleEntity, Entity, Id } from '../document/model'
import { createDocumentStore, type DocumentStore } from '../document/store'
import { rectangleSegments } from '../geometry/shapes'
import type { Vec2 } from '../lib/vec2'
import { createTools } from './index'
import { ToolSession, type SessionView } from './session'
import type { PreviewShape } from './types'

let store: DocumentStore
let session: ToolSession
let view: SessionView
let selection: readonly Id[]
let preview: PreviewShape[]

const ev = (raw: Vec2, shift = false) => ({ raw, button: 0, shift, alt: false })
function click(p: Vec2, shift = false) {
  session.pointerMove(ev(p, shift))
  session.pointerDown(ev(p, shift))
  session.pointerUp(ev(p, shift))
}
function drag(a: Vec2, b: Vec2, shift = false) {
  session.pointerDown(ev(a, shift))
  session.pointerMove(ev(b, shift))
  session.pointerUp(ev(b, shift))
}

beforeEach(() => {
  const project = createProject()
  const layerId = project.layers[0].id
  const base = { layerId, lineStyle: 'solid', strokeWidth: 0.1 } as const
  const entities: Entity[] = [
    { ...base, id: 'a', type: 'path', segments: rectangleSegments([0, 0], [10, 10]), closed: true },
    { ...base, id: 'b', type: 'circle', center: [30, 5], rx: 5, ry: 5, rotation: 0 },
    { ...base, id: 'c', type: 'path', segments: [{ p: [0, 20] }, { p: [40, 20] }], closed: false },
  ]
  store = createDocumentStore(project)
  store.getState().dispatch(addEntities(project.pieces[0].id, entities))
  view = { zoom: 10, snaps: new Set(['endpoint', 'grid']), activeLayerId: null }
  selection = []
  session = new ToolSession(store, createTools(), () => view, {
    preview: (s) => (preview = s),
    prompt: () => {},
    tool: () => {},
    cursor: () => {},
    selection: (ids) => (selection = ids),
  })
  session.setTool('select')
})

describe('select tool', () => {
  it('selects by clicking near an outline, not inside it', () => {
    click([10.3, 5])
    expect(selection).toEqual(['a'])
    click([5, 5])
    expect(selection).toEqual([])
  })

  it('Shift-click toggles', () => {
    click([10.3, 5])
    click([35, 5], true)
    expect(selection).toEqual(['a', 'b'])
    click([10.3, 5], true)
    expect(selection).toEqual(['b'])
  })

  it('does not snap the pointer', () => {
    session.pointerMove(ev([0.4, 0.4]))
    expect(preview.find((s) => s.kind === 'point')).toEqual({ kind: 'point', at: [0.4, 0.4] })
  })

  it('highlights the entity under the cursor', () => {
    session.pointerMove(ev([20, 20.2]))
    expect(preview.some((s) => s.kind === 'entity' && s.entity.id === 'c')).toBe(true)
  })

  it('box left→right selects only entities fully inside', () => {
    drag([-1, -1], [36, 25])
    expect(selection).toEqual(['a', 'b'])
  })

  it('box right→left selects anything touched, previewed dashed', () => {
    session.pointerDown(ev([33, 25]))
    session.pointerMove(ev([20, 8]))
    expect(preview.find((s) => s.kind === 'path')).toMatchObject({ dashed: true })
    session.pointerUp(ev([20, 8]))
    expect([...selection].sort()).toEqual(['b', 'c'])
  })

  it('deletes the selection as one undo step, and undo restores it', () => {
    drag([-1, -1], [36, 25])
    session.deleteKey()
    expect(store.getState().project.pieces[0].entities.map((e) => e.id)).toEqual(['c'])
    expect(selection).toEqual([])
    store.getState().undo()
    expect(store.getState().project.pieces[0].entities).toHaveLength(3)
  })

  it('Esc clears the selection, then falls through', () => {
    click([10.3, 5])
    session.cancel()
    expect(selection).toEqual([])
  })

  it('ignores locked layers and prunes the selection when a layer is locked', () => {
    click([10.3, 5])
    const layerId = store.getState().project.layers[0].id
    store.getState().dispatch(updateLayer(layerId, { locked: true }))
    expect(selection).toEqual([])
    click([10.3, 5])
    expect(selection).toEqual([])
  })

  it('switching tools keeps the selection (only Esc clears it)', () => {
    click([10.3, 5])
    session.setTool('line')
    session.setTool('select')
    expect(selection).toEqual(['a'])
  })

  it('drops the hover highlight when the pointer leaves the canvas', () => {
    session.pointerMove(ev([35, 5]))
    expect(preview.some((s) => s.kind === 'entity')).toBe(true)
    session.pointerLeave()
    expect(preview).toEqual([])
  })

  it('refreshes the hover highlight when the project changes without a mouse move', async () => {
    session.pointerMove(ev([35, 5])) // over circle b's edge
    const before = preview.find((s) => s.kind === 'entity')
    expect(before?.kind === 'entity' && before.entity.id).toBe('b')
    store.getState().dispatch(updateEntity<CircleEntity>('b', { rx: 1, ry: 1 }))
    await Promise.resolve()
    // The circle shrank away from the cursor, so nothing is hovered any more.
    expect(preview.some((s) => s.kind === 'entity')).toBe(false)
  })

  it('select all picks every selectable entity', () => {
    session.setTool('line')
    session.selectAll()
    expect(session.activeToolId).toBe('select')
    expect(selection).toEqual(['a', 'b', 'c'])
  })
})

describe('drag to move in the Select tool', () => {
  const ids = () => store.getState().project.pieces[0].entities.map((e) => e.id)
  const circle = () => store.getState().project.pieces[0].entities.find((e) => e.id === 'b') as CircleEntity

  it('dragging a selected entity moves the selection as one undo step', () => {
    drag([-1, -1], [36, 12]) // a and b
    session.pointerDown(ev([35, 5]))
    session.pointerMove(ev([37, 5]))
    session.pointerMove(ev([45.2, 15.3]))
    expect(preview.filter((s) => s.kind === 'entity')).toHaveLength(2)
    session.pointerUp(ev([45.2, 15.3]))
    // The grid (1 mm at this zoom) quantises the cursor.
    expect(circle().center).toEqual([40, 15])
    expect(store.getState().past.at(-1)?.labelKey).toBe('history.move')
    expect(selection).toEqual(['a', 'b'])
    store.getState().undo()
    expect(circle().center).toEqual([30, 5])
  })

  it('snaps the cursor to other geometry, not to the moving entities', () => {
    click([35, 5])
    drag([35, 5], [40.3, 20.2]) // the end of line c
    expect(circle().center).toEqual([35, 20])
  })

  it('Alt-drag moves a copy; Esc during a drag abandons it', () => {
    click([35, 5])
    session.pointerDown(ev([35, 5]))
    session.pointerMove(ev([35, 50]))
    session.pointerUp({ ...ev([35, 50]), alt: true })
    expect(ids()).toHaveLength(4)
    expect(circle().center).toEqual([30, 5])
    session.pointerDown(ev([35, 50]))
    session.pointerMove(ev([60, 60]))
    session.cancel()
    session.pointerUp(ev([60, 60]))
    expect(store.getState().past).toHaveLength(2) // add + copy
  })

  it('dragging an unselected entity box-selects instead', () => {
    click([35, 5])
    drag([20, 20.2], [50, 30])
    expect(selection).toEqual([])
    expect(circle().center).toEqual([30, 5])
  })
})

describe('object snaps while drawing', () => {
  it('a line snaps its first point to an existing endpoint', () => {
    session.setTool('line')
    click([10.4, 9.6]) // endpoint (10, 10) is 0.57 mm = 5.7 px away at 10 px/mm
    click([50, 50])
    session.finish()
    const line = store.getState().project.pieces[0].entities.at(-1)!
    expect(line.type === 'path' && line.segments[0].p).toEqual([10, 10])
  })

  it('shows the snap marker for the captured kind', () => {
    session.setTool('line')
    session.pointerMove(ev([0.3, 0.2]))
    expect(preview.at(-1)).toEqual({ kind: 'snap', at: [0, 0], snapKind: 'endpoint' })
  })
})

describe('object tracking while drawing (T1.3b)', () => {
  it('remembers snapped points and lines the next point up with them', () => {
    view = { zoom: 10, snaps: new Set(['endpoint', 'tracking']), activeLayerId: null }
    session.setTool('line')
    session.pointerMove(ev([10.2, 0.3])) // hover the square's corner (10, 0): tracked
    click([25, 40]) // first point, free
    session.pointerMove(ev([10.4, 55])) // straight below the tracked corner
    expect(preview.find((s) => s.kind === 'snap')).toMatchObject({ snapKind: 'tracking', at: [10, 55] })
    expect(preview.some((s) => s.kind === 'path' && s.dashed)).toBe(true)
  })
})
