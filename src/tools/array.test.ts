import { beforeEach, describe, expect, it } from 'vitest'
import { addEntities } from '../document/commands'
import { createProject } from '../document/factory'
import type { CircleEntity, Entity, Id } from '../document/model'
import { createDocumentStore, type DocumentStore } from '../document/store'
import type { Vec2 } from '../lib/vec2'
import { circularArray, linearArray } from './array'
import { createTools } from './index'
import { ToolSession, type SessionView } from './session'
import type { PreviewShape } from './types'

let store: DocumentStore
let session: ToolSession
let preview: PreviewShape[]
let selection: readonly Id[]
const view: SessionView = { zoom: 10, snaps: new Set(), activeLayerId: null }
const ev = (raw: Vec2) => ({ raw, button: 0, shift: false, alt: false })
function click(p: Vec2) {
  session.pointerMove(ev(p))
  session.pointerDown(ev(p))
  session.pointerUp(ev(p))
}
const circles = () =>
  (store.getState().project.pieces[0].entities as Entity[])
    .filter((e): e is CircleEntity => e.type === 'circle')
    .map((c) => c.center.map((v) => Math.round(v * 1e9) / 1e9 || 0))
    .sort((a, b) => a[0] - b[0] || a[1] - b[1])

beforeEach(() => {
  const project = createProject()
  const hole: CircleEntity = {
    id: 'h',
    type: 'circle',
    layerId: project.layers[0].id,
    lineStyle: 'solid',
    strokeWidth: 0.2,
    center: [10, 0],
    rx: 1,
    ry: 1,
    rotation: 0,
  }
  store = createDocumentStore(project)
  store.getState().dispatch(addEntities(project.pieces[0].id, [hole]))
  session = new ToolSession(store, createTools(), () => view, {
    preview: (s) => (preview = s),
    prompt: () => {},
    tool: () => {},
    cursor: () => {},
    selection: (ids) => (selection = ids),
  })
  session.select(['h'])
  session.setTool('array')
})

describe('array tool (M10)', () => {
  it('builds step matrices for linear and circular arrays', () => {
    expect(linearArray(5, 0, 3).map((m) => [m[4], m[5]])).toEqual([
      [5, 0],
      [10, 0],
    ])
    expect(circularArray([0, 0], 4, 360)).toHaveLength(3)
    expect(circularArray([0, 0], 1, 360)).toEqual([])
  })

  it('linear: base point, typed count and step → copies in one undo step, all selected', () => {
    session.input({ count: 4 }, true) // only sets the count
    click([10, 0])
    session.pointerMove(ev([12, 0]))
    expect(preview.filter((s) => s.kind === 'entity')).toHaveLength(3)
    session.input({ dx: 6, dy: 0 }, true)
    expect(circles()).toEqual([
      [10, 0],
      [16, 0],
      [22, 0],
      [28, 0],
    ])
    expect(store.getState().past.at(-1)?.labelKey).toBe('history.array')
    expect(selection).toHaveLength(4)
    store.getState().undo()
    expect(circles()).toHaveLength(1)
  })

  it('circular: centre, then Enter spreads the copies evenly round', () => {
    session.input({ mode: 1, count: 4 }, false)
    click([0, 0])
    session.finish()
    expect(circles()).toEqual([
      [-10, 0],
      [0, -10],
      [0, 10],
      [10, 0],
    ])
  })

  it('circular over less than a full turn spans first to last copy', () => {
    session.input({ mode: 1, count: 3, sweep: 90 }, false)
    click([0, 0])
    click([50, 50])
    // 0°, 45°, 90° counter-clockwise on screen (y-down: 90° is straight up).
    const c = circles()
    expect(c).toContainEqual([0, -10])
    expect(c.find(([x, y]) => x > 7 && x < 7.1 && y < -7)).toBeDefined()
  })
})
