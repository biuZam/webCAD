import { beforeEach, describe, expect, it } from 'vitest'
import { addEntities } from '../document/commands'
import { createProject } from '../document/factory'
import type { Entity, Id, PathEntity } from '../document/model'
import { createDocumentStore, type DocumentStore } from '../document/store'
import { closedArea } from '../geometry/edit'
import { pathLength } from '../geometry/kernel'
import { rectangleSegments } from '../geometry/shapes'
import type { Vec2 } from '../lib/vec2'
import { createTools } from './index'
import { ToolSession, type SessionView } from './session'
import type { I18nKey, PreviewShape } from './types'

let store: DocumentStore
let session: ToolSession
let preview: PreviewShape[]
let promptKey: I18nKey
let selection: readonly Id[]
const view: SessionView = { zoom: 10, snaps: new Set(), activeLayerId: null }
const ev = (raw: Vec2, shift = false) => ({ raw, button: 0, shift, alt: false })
function click(p: Vec2, shift = false) {
  session.pointerMove(ev(p, shift))
  session.pointerDown(ev(p, shift))
  session.pointerUp(ev(p, shift))
}
const all = (): Entity[] => store.getState().project.pieces[0].entities
const get = (id: string) => all().find((e) => e.id === id) as PathEntity
const lastLabel = () => store.getState().past.at(-1)?.labelKey

function setup(entities: Entity[]) {
  const project = createProject()
  store = createDocumentStore(project)
  // Put everything on this project's Cut layer.
  const layerId = project.layers[0].id
  store.getState().dispatch(
    addEntities(
      project.pieces[0].id,
      entities.map((e) => ({ ...e, layerId })),
    ),
  )
  store.setState({ past: [] })
  session = new ToolSession(store, createTools(), () => view, {
    preview: (s) => (preview = s),
    prompt: (key) => (promptKey = key),
    tool: () => {},
    cursor: () => {},
    selection: (ids) => (selection = ids),
  })
}

const line = (id: string, a: Vec2, b: Vec2): PathEntity => ({
  id,
  type: 'path',
  layerId: '',
  lineStyle: 'solid',
  strokeWidth: 0.2,
  segments: [{ p: a }, { p: b }],
  closed: false,
})
const rect = (id: string, a: Vec2, b: Vec2): PathEntity => ({
  ...line(id, a, b),
  segments: rectangleSegments(a, b),
  closed: true,
})

describe('parallel tool', () => {
  beforeEach(() => {
    setup([line('e', [0, 0], [40, 0])])
    session.setTool('parallel')
  })

  it('pick an edge, then click: a line of the same length at the cursor’s distance', () => {
    click([10, 0.2])
    click([25, 7])
    const added = all().at(-1) as PathEntity
    expect(added.segments.map((s) => s.p)).toEqual([
      [0, 7],
      [40, 7],
    ])
  })

  it('typed distance goes on the cursor’s side', () => {
    click([10, 0.2])
    session.pointerMove(ev([20, -3]))
    session.input({ distance: 12.5 }, true)
    expect((all().at(-1) as PathEntity).segments[0].p).toEqual([0, -12.5])
  })
})

describe('trim tool', () => {
  beforeEach(() => {
    setup([line('a', [0, 0], [40, 0]), line('k', [20, -10], [20, 10]), rect('r', [50, 0], [70, 20])])
    session.setTool('trim')
  })

  it('previews and trims the clicked piece back to the crossing, keeping the id', () => {
    session.pointerMove(ev([30, 0.2]))
    expect(preview.some((s) => s.kind === 'entity')).toBe(true)
    click([30, 0.2])
    expect(get('a').segments.map((s) => s.p)).toEqual([
      [0, 0],
      [20, 0],
    ])
    expect(lastLabel()).toBe('history.trim')
  })

  it('Shift-click extends instead; extend mode reaches the next boundary', () => {
    click([30, 0.2]) // trim → a ends at 20
    click([19, 0.2], true) // Shift: extend the right end of a… which already touches k, so on to the rectangle
    expect(get('a').segments.at(-1)!.p).toEqual([50, 0])
    expect(lastLabel()).toBe('history.extend')
  })

  it('split mode cuts a line in two and opens a closed outline', () => {
    session.input({ mode: 2 }, false)
    expect(promptKey).toBe('trim.promptSplit')
    click([10, 0.2])
    expect(all().filter((e) => e.type === 'path' && !e.closed)).toHaveLength(3) // a in two, and k
    click([60, 0.2])
    expect(get('r').closed).toBe(false)
    expect(pathLength(get('r'))).toBeCloseTo(80, 9)
    expect(lastLabel()).toBe('history.split')
  })

  it('does nothing where there is nothing to cut against', () => {
    click([60, 20.2]) // the rectangle touches nothing
    expect(store.getState().past).toHaveLength(0)
  })
})

describe('join and booleans on the selection', () => {
  it('joins open paths into one (first id kept), closing when the ends meet', () => {
    setup([
      line('a', [0, 0], [10, 0]),
      line('b', [10, 10], [10, 0]),
      line('c', [0, 10], [10, 10]),
      line('d', [0, 0], [0, 10]),
    ])
    session.selectAll()
    session.join()
    expect(all()).toHaveLength(1)
    expect(get('a').closed).toBe(true)
    expect(closedArea(get('a'))).toBeCloseTo(100, 9)
    expect(selection).toEqual(['a'])
    expect(lastLabel()).toBe('history.join')
    store.getState().undo()
    expect(all()).toHaveLength(4)
  })

  it('says why nothing happens for an unsuitable selection', () => {
    setup([rect('r', [0, 0], [10, 10])])
    session.selectAll()
    session.join()
    expect(promptKey).toBe('common.joinNone')
    session.boolean('union')
    expect(promptKey).toBe('common.booleanNone')
  })

  it('union merges overlapping outlines; difference cuts the smaller from the largest', () => {
    setup([rect('small', [5, 5], [15, 15]), rect('big', [0, 0], [40, 40])])
    session.selectAll()
    session.boolean('difference')
    // The window becomes its own outline, styled like (and the first keeping the id of) the big piece.
    expect(all()).toHaveLength(2)
    expect(selection).toContain('big')
    expect(
      all()
        .map((e) => closedArea(e))
        .sort((x, y) => x - y),
    ).toEqual([100, 1600].map((v) => expect.closeTo(v, 6)))

    setup([rect('a', [0, 0], [10, 10]), rect('b', [5, 0], [15, 10])])
    session.selectAll()
    session.boolean('union')
    expect(all()).toHaveLength(1)
    expect(closedArea(get('a'))).toBeCloseTo(150, 6)
  })

  it('explodes a rectangle into four segments (first keeps the id); Join puts them back', () => {
    setup([rect('r', [0, 0], [10, 10])])
    session.selectAll()
    session.explode()
    expect(all()).toHaveLength(4)
    expect(all()[0].id).toBe('r')
    expect(all().every((e) => e.type === 'path' && e.segments.length === 2 && !e.closed)).toBe(true)
    expect(selection).toHaveLength(4)
    expect(lastLabel()).toBe('history.explode')
    session.join()
    expect(all()).toHaveLength(1)
    expect(get('r').closed).toBe(true)
    expect(closedArea(get('r'))).toBeCloseTo(100, 9)
  })

  it('explode keeps curve handles on each piece and says why when there is nothing to explode', () => {
    setup([
      {
        ...line('c', [0, 0], [10, 0]),
        segments: [
          { p: [0, 0], ho: [0, 5] },
          { p: [10, 0], hi: [0, 5], ho: [0, -5] },
          { p: [20, 0], hi: [0, -5] },
        ],
      },
    ])
    session.selectAll()
    session.explode()
    expect(all().map((e) => (e as PathEntity).segments)).toEqual([
      [
        { p: [0, 0], ho: [0, 5] },
        { p: [10, 0], hi: [0, 5] },
      ],
      [
        { p: [10, 0], ho: [0, -5] },
        { p: [20, 0], hi: [0, -5] },
      ],
    ])
    session.explode() // single segments now
    expect(promptKey).toBe('common.explodeNone')
  })
})
