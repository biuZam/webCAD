import { describe, expect, it } from 'vitest'
import { addEntities, removeEntities, updateLayer } from './commands'
import { createProject, newId } from './factory'
import type { PathEntity } from './model'
import { createDocumentStore } from './store'

function line(layerId: string): PathEntity {
  return {
    id: newId(),
    type: 'path',
    layerId,
    lineStyle: 'solid',
    strokeWidth: 0.1,
    segments: [{ p: [0, 0] }, { p: [10, 0] }],
    closed: false,
  }
}

describe('document store', () => {
  it('records one undo step per command and undoes/redoes it', () => {
    const store = createDocumentStore(createProject())
    const { project } = store.getState()
    const piece = project.pieces[0]
    const entity = line(project.layers[0].id)

    store.getState().dispatch(addEntities(piece.id, [entity]))
    expect(store.getState().project.pieces[0].entities).toHaveLength(1)
    expect(store.getState().past.map((e) => e.labelKey)).toEqual(['history.add'])

    store.getState().undo()
    expect(store.getState().project).toEqual(project)
    expect(store.getState().future).toHaveLength(1)

    store.getState().redo()
    expect(store.getState().project.pieces[0].entities[0]).toEqual(entity)
  })

  it('clears redo history on a new command', () => {
    const store = createDocumentStore(createProject())
    const layer = store.getState().project.layers[0]
    store.getState().dispatch(updateLayer(layer.id, { visible: false }))
    store.getState().undo()
    store.getState().dispatch(updateLayer(layer.id, { locked: true }))
    expect(store.getState().future).toHaveLength(0)
  })

  it('ignores commands that change nothing', () => {
    const store = createDocumentStore(createProject())
    store.getState().dispatch(removeEntities(['missing']))
    expect(store.getState().past).toHaveLength(0)
  })

  it('keeps untouched entities referentially equal (renderer relies on this)', () => {
    const store = createDocumentStore(createProject())
    const { project } = store.getState()
    const a = line(project.layers[0].id)
    const b = line(project.layers[0].id)
    store.getState().dispatch(addEntities(project.pieces[0].id, [a, b]))
    const before = store.getState().project.pieces[0].entities
    store.getState().dispatch(removeEntities([a.id]))
    expect(store.getState().project.pieces[0].entities[0]).toBe(before[1])
  })
})
