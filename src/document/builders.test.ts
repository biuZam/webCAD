import { describe, expect, it } from 'vitest'
import { emptyBounds, entityBounds } from '../geometry/bounds'
import { entityArea, entityLength } from '../geometry/measure'
import { rectangleSegments } from '../geometry/shapes'
import { holeLine, holeSet, stitchLayer, stitchLine } from './builders'
import { addEntities, insertEntitiesAfter, updateLayer } from './commands'
import { createProject } from './factory'
import type { Entity, HoleSetEntity, PathEntity } from './model'
import { createDocumentStore } from './store'

function setup() {
  const project = createProject()
  const [cut, stitch] = project.layers
  const outline: PathEntity = {
    id: 'outline',
    type: 'path',
    layerId: cut.id,
    lineStyle: 'solid',
    strokeWidth: 0.2,
    closed: true,
    segments: rectangleSegments([0, 0], [100, 60]),
  }
  const store = createDocumentStore(project)
  store.getState().dispatch(addEntities(project.pieces[0].id, [outline]))
  return { store, outline, cut, stitch }
}

const entities = (store: ReturnType<typeof setup>['store']) => store.getState().project.pieces[0].entities

describe('stitchLayer', () => {
  it('prefers the Stitch layer and refuses a locked one', () => {
    const { store, outline, stitch } = setup()
    expect(stitchLayer(store.getState().project, outline)?.id).toBe(stitch.id)
    store.getState().dispatch(updateLayer(stitch.id, { locked: true }))
    expect(stitchLayer(store.getState().project, outline)).toBeNull()
  })
})

describe('stitchLine', () => {
  it('builds a dashed linked line that the derivation pass keeps', () => {
    const { store, outline, stitch } = setup()
    const line = stitchLine(outline, stitch.id, -3.5, 'miter')!
    expect(line.entity.derived).toEqual({ kind: 'offset', sourceId: 'outline', margin: -3.5, join: 'miter' })
    expect(line.entity.lineStyle).toBe('dashed')
    store.getState().dispatch(insertEntitiesAfter([{ afterId: outline.id, entities: [line.entity] }]))
    const b = entityBounds(entities(store)[1], emptyBounds())
    expect([b.minX, b.minY, b.maxX, b.maxY].map((v) => Math.round(v * 1000) / 1000)).toEqual([3.5, 3.5, 96.5, 56.5])
  })

  it('is null when the inset collapses the shape', () => {
    const { outline, stitch } = setup()
    expect(stitchLine(outline, stitch.id, -40, 'miter')).toBeNull()
  })
})

describe('holeSet', () => {
  it('is laid out by the derivation pass on insert', () => {
    const { store, outline, stitch } = setup()
    const set = holeSet(outline, stitch.id, { pitch: 4, holeSize: 1.2 })
    expect(set).toMatchObject({ holeShape: 'round', cornerMode: 'cornerAware', slitAngle: 45, holes: [] })
    store.getState().dispatch(insertEntitiesAfter([{ afterId: outline.id, entities: [set] }]))
    // 320 mm perimeter at 4 mm pitch.
    expect((entities(store)[1] as HoleSetEntity).holes).toHaveLength(80)
  })

  it('only follows lines', () => {
    const text: Entity = {
      id: 't',
      type: 'text',
      layerId: 'x',
      lineStyle: 'solid',
      strokeWidth: 0.2,
      position: [0, 0],
      text: 'a',
      size: 5,
      rotation: 0,
    }
    expect(holeLine(text)).toBeNull()
  })
})

describe('measure', () => {
  it('gives length and area of closed shapes, no area for open ones', () => {
    const { outline } = setup()
    expect(entityLength(outline)).toBeCloseTo(320, 6)
    expect(entityArea(outline)).toBeCloseTo(6000, 6)
    expect(entityArea({ ...outline, closed: false })).toBeNull()
  })
})
