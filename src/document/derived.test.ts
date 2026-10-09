import { beforeEach, describe, expect, it } from 'vitest'
import { emptyBounds, entityBounds } from '../geometry/bounds'
import { rectangleSegments } from '../geometry/shapes'
import { scaleAbout, translation } from '../geometry/transform'
import { addEntities, removeEntities, transformEntities, updateEntities, updateEntity } from './commands'
import { createProject } from './factory'
import type { Entity, PathEntity } from './model'
import { createDocumentStore, type DocumentStore } from './store'

let store: DocumentStore
const get = (id: string) => store.getState().project.pieces[0].entities.find((e) => e.id === id) as PathEntity
const boundsOf = (e: Entity) => {
  const b = entityBounds(e, emptyBounds())
  return [b.minX, b.minY, b.maxX, b.maxY].map((v) => Math.round(v * 1000) / 1000)
}

beforeEach(() => {
  const project = createProject()
  const [cut, stitch] = project.layers
  store = createDocumentStore(project)
  const outline: Entity = {
    id: 'outline',
    type: 'path',
    layerId: cut.id,
    lineStyle: 'solid',
    strokeWidth: 0.2,
    closed: true,
    segments: rectangleSegments([0, 0], [100, 60]),
  }
  // Created with no geometry: the derivation pass fills it in.
  const stitchLine: Entity = {
    id: 'stitch',
    type: 'path',
    layerId: stitch.id,
    lineStyle: 'dashed',
    strokeWidth: 0.2,
    closed: true,
    segments: [],
    derived: { kind: 'offset', sourceId: 'outline', margin: -3.5, join: 'miter' },
  }
  store.getState().dispatch(addEntities(project.pieces[0].id, [outline, stitchLine]))
})

describe('derived stitch lines', () => {
  it('are generated when created', () => {
    expect(boundsOf(get('stitch'))).toEqual([3.5, 3.5, 96.5, 56.5])
  })

  it('follow their source in the same undo step', () => {
    store
      .getState()
      .dispatch(
        transformEntities(['outline'], scaleAbout([0, 0], 2), { copy: false, labelKey: 'history.scale' }).command,
      )
    expect(boundsOf(get('stitch'))).toEqual([3.5, 3.5, 196.5, 116.5])
    store.getState().undo()
    expect(boundsOf(get('stitch'))).toEqual([3.5, 3.5, 96.5, 56.5])
    expect(store.getState().past).toHaveLength(1) // only the original add
  })

  it('regenerate when their margin changes', () => {
    store.getState().dispatch(
      updateEntity<PathEntity>('stitch', {
        derived: { kind: 'offset', sourceId: 'outline', margin: -5, join: 'miter' },
      }),
    )
    expect(boundsOf(get('stitch'))).toEqual([5, 5, 95, 55])
  })

  it('stay linked when moved together with their source', () => {
    store
      .getState()
      .dispatch(
        transformEntities(['outline', 'stitch'], translation(10, 0), { copy: false, labelKey: 'history.move' }).command,
      )
    expect(get('stitch').derived).toBeDefined()
    expect(boundsOf(get('stitch'))).toEqual([13.5, 3.5, 106.5, 56.5])
  })

  it('detach when the stitch line alone is moved', () => {
    store
      .getState()
      .dispatch(transformEntities(['stitch'], translation(0, 100), { copy: false, labelKey: 'history.move' }).command)
    expect(get('stitch').derived).toBeUndefined()
    expect(boundsOf(get('stitch'))).toEqual([3.5, 103.5, 96.5, 156.5])
  })

  it('keep their link when only their style changes', () => {
    store.getState().dispatch(updateEntities(['stitch'], { lineStyle: 'dotted' }))
    expect(get('stitch').derived).toBeDefined()
    expect(get('stitch').lineStyle).toBe('dotted')
  })

  it('detach, keeping their geometry, when the source is deleted', () => {
    store.getState().dispatch(removeEntities(['outline']))
    expect(get('stitch').derived).toBeUndefined()
    expect(boundsOf(get('stitch'))).toEqual([3.5, 3.5, 96.5, 56.5])
  })

  it('collapse to nothing when the inset is too large, and come back when the source grows', () => {
    store
      .getState()
      .dispatch(
        transformEntities(['outline'], scaleAbout([0, 0], 0.05), { copy: false, labelKey: 'history.scale' }).command,
      )
    expect(get('stitch').segments).toEqual([])
    expect(get('stitch').derived).toBeDefined()
    store
      .getState()
      .dispatch(
        transformEntities(['outline'], scaleAbout([0, 0], 20), { copy: false, labelKey: 'history.scale' }).command,
      )
    expect(boundsOf(get('stitch'))).toEqual([3.5, 3.5, 96.5, 56.5])
  })

  it('leave unrelated commands untouched (no extra patches)', () => {
    const before = store.getState().project.pieces[0].entities
    store.getState().dispatch(updateEntities(['outline'], { strokeWidth: 0.3 }))
    expect(get('stitch')).toBe(before[1])
  })
})
