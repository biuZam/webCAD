import { beforeEach, describe, expect, it } from 'vitest'
import { addEntities } from '../document/commands'
import { createProject } from '../document/factory'
import type { Entity, Id, PathEntity } from '../document/model'
import { createDocumentStore, type DocumentStore } from '../document/store'
import { isSmooth } from '../geometry/nodes'
import { distance, type Vec2 } from '../lib/vec2'
import { createTools } from './index'
import { ToolSession, type SessionView } from './session'
import type { PreviewShape } from './types'

let store: DocumentStore
let session: ToolSession
let preview: PreviewShape[]
let selection: readonly Id[]
const view: SessionView = { zoom: 10, snaps: new Set(['endpoint']), activeLayerId: null }
const ev = (raw: Vec2) => ({ raw, button: 0, shift: false, alt: false })
function click(p: Vec2) {
  session.pointerMove(ev(p))
  session.pointerDown(ev(p))
  session.pointerUp(ev(p))
}
function drag(from: Vec2, to: Vec2, release = true) {
  session.pointerMove(ev(from))
  session.pointerDown(ev(from))
  session.pointerMove(ev(to))
  if (release) session.pointerUp(ev(to))
}
const get = (id: string) => store.getState().project.pieces[0].entities.find((e) => e.id === id) as PathEntity

beforeEach(() => {
  const project = createProject()
  const [cut, stitch] = project.layers
  const base = { layerId: cut.id, lineStyle: 'solid', strokeWidth: 0.2 } as const
  const list: Entity[] = [
    {
      ...base,
      id: 'p',
      type: 'path',
      closed: false,
      segments: [{ p: [0, 0] }, { p: [20, 0], hi: [-5, 0], ho: [5, 0] }, { p: [40, 0] }],
    },
    { ...base, id: 'other', type: 'path', closed: false, segments: [{ p: [0, 30] }, { p: [50, 30] }] },
    {
      ...base,
      id: 'st',
      type: 'path',
      layerId: stitch.id,
      closed: false,
      segments: [],
      derived: { kind: 'offset', sourceId: 'p', margin: 3, join: 'miter' },
    },
  ]
  store = createDocumentStore(project)
  store.getState().dispatch(addEntities(project.pieces[0].id, list))
  session = new ToolSession(store, createTools(), () => view, {
    preview: (s) => (preview = s),
    prompt: () => {},
    tool: () => {},
    cursor: () => {},
    selection: (ids) => (selection = ids),
  })
  session.setTool('select')
  click([10, 0.2]) // select the path
  expect(selection).toEqual(['p'])
})

describe('node editing in the Select tool', () => {
  it('shows the selected path’s anchors and handles', () => {
    session.pointerMove(ev([30, 10]))
    expect(preview.filter((s) => s.kind === 'node')).toHaveLength(3)
    expect(preview.filter((s) => s.kind === 'handle')).toHaveLength(2)
    expect(preview.find((s) => s.kind === 'node' && s.at[0] === 20)).toMatchObject({ smooth: true })
  })

  it('drags an anchor (snapping to other geometry) as one undo step; the stitch line follows', () => {
    drag([40, 0], [50.3, 29.8]) // onto the other path's endpoint (50, 30)
    expect(get('p').segments[2].p).toEqual([50, 30])
    expect(store.getState().past.at(-1)?.labelKey).toBe('history.editNodes')
    // Regenerated from the moved outline: its end is 3 mm (the margin) from the new end point.
    expect(distance(get('st').segments.at(-1)!.p, [50, 30])).toBeCloseTo(3, 3)
  })

  it('does not snap a dragged anchor to the path’s own points', () => {
    drag([40, 0], [20.3, 0.3]) // near its own middle anchor (20, 0)
    expect(get('p').segments[2].p).toEqual([20.3, 0.3])
  })

  it('drags a handle; the smooth anchor stays smooth', () => {
    drag([25, 0], [20, 6]) // the out-handle, pulled straight down
    const mid = get('p').segments[1]
    expect(mid.ho).toEqual([0, 6])
    expect(isSmooth(mid)).toBe(true)
  })

  it('double-click toggles smooth ↔ corner', () => {
    session.doubleClick(ev([20, 0]))
    expect(get('p').segments[1]).toEqual({ p: [20, 0] })
    session.doubleClick(ev([20, 0]))
    expect(isSmooth(get('p').segments[1])).toBe(true)
  })

  it('Esc during a drag reverts it', () => {
    drag([40, 0], [45, 10], false)
    session.cancel()
    session.pointerUp(ev([45, 10]))
    expect(get('p').segments[2].p).toEqual([40, 0])
  })

  it('shows no points for linked stitch lines', () => {
    click([10, -3.2]) // the stitch line: +3 is on the normal side, i.e. above a left→right path
    expect(selection).toEqual(['st'])
    session.pointerMove(ev([30, 10]))
    expect(preview.some((s) => s.kind === 'node')).toBe(false)
  })

  it('never edits points inside the Move tool’s picking step', () => {
    session.cancel() // clear selection
    session.setTool('move')
    click([10, 0.2])
    drag([40, 0], [45, 10])
    expect(get('p').segments[2].p).toEqual([40, 0])
  })

  it('double-click on a segment adds a point there, as one undo step', () => {
    session.doubleClick(ev([10, 0.2]))
    expect(get('p').segments.map((seg) => seg.p)).toEqual([
      [0, 0],
      [10, 0],
      [20, 0],
      [40, 0],
    ])
    expect(store.getState().past.at(-1)?.labelKey).toBe('history.addPoint')
    // The new point is picked, so Delete takes it out again.
    session.deleteKey()
    expect(get('p').segments.map((seg) => seg.p)).toEqual([
      [0, 0],
      [20, 0],
      [40, 0],
    ])
    expect(selection).toEqual(['p'])
  })

  it('click a point, then Delete removes just that point', () => {
    click([40, 0])
    expect(preview.find((s) => s.kind === 'node' && s.at[0] === 40)).toMatchObject({ active: true })
    session.deleteKey()
    expect(get('p').segments.map((seg) => seg.p)).toEqual([
      [0, 0],
      [20, 0],
    ])
    expect(store.getState().past.at(-1)?.labelKey).toBe('history.deletePoint')
    // With two points left, Delete on a point removes the whole path.
    click([20, 0])
    session.deleteKey()
    expect(store.getState().project.pieces[0].entities.some((e) => e.id === 'p')).toBe(false)
  })

  it('Esc unpicks the point before it clears the selection', () => {
    click([40, 0])
    session.cancel()
    expect(selection).toEqual(['p'])
    session.deleteKey()
    expect(store.getState().project.pieces[0].entities.some((e) => e.id === 'p')).toBe(false)
  })
})
