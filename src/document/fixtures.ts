// PRD acceptance test: 100 × 100 mm square, 50 mm circle, holes at 3.85 mm pitch.
// Used by export tests and loadable in dev with `?fixture=acceptance` (never autosaved).
// The holes follow the outline 4 mm inside it (a linked hole set), laid out corner-aware like the real tool.

import { translation, transformEntity } from '../geometry/transform'
import { addEntities } from './commands'
import { createProject, newId } from './factory'
import type { Entity, Project } from './model'
import { createDocumentStore } from './store'
import { distributeHoles } from '../geometry/leather/stitch-holes'
import { rectangleSegments } from '../geometry/shapes'

export function acceptanceProject(): Project {
  const project = createProject('Acceptance test')
  const layer = (kind: string) => project.layers.find((l) => l.kind === kind)!.id
  const outlineId = newId()
  const margin = 4
  const pitch = 3.85
  // Built without a dispatch, so lay the holes out here exactly as the derivation pass would.
  const { holes, angles } = distributeHoles(
    { segments: rectangleSegments([margin, margin], [100 - margin, 100 - margin]), closed: true },
    pitch,
    'cornerAware',
  )

  project.pieces[0].entities.push(
    {
      id: outlineId,
      type: 'path',
      layerId: layer('cut'),
      lineStyle: 'solid',
      strokeWidth: 0.1,
      segments: rectangleSegments([0, 0], [100, 100]),
      closed: true,
    },
    {
      id: newId(),
      type: 'circle',
      layerId: layer('cut'),
      lineStyle: 'solid',
      strokeWidth: 0.1,
      center: [50, 50],
      rx: 25,
      ry: 25,
      rotation: 0,
    },
    {
      id: newId(),
      type: 'holeSet',
      layerId: layer('stitch'),
      lineStyle: 'solid',
      strokeWidth: 0.1,
      sourceEntityId: outlineId,
      margin: -margin,
      pitch,
      holeShape: 'round',
      holeSize: 1.2,
      slitAngle: 0,
      cornerMode: 'cornerAware',
      holes,
      angles,
    },
    {
      id: newId(),
      type: 'centreLine',
      layerId: layer('reference'),
      lineStyle: 'dashDot',
      strokeWidth: 0.1,
      from: [50, 0],
      to: [50, 100],
    },
  )
  return project
}

/**
 * Performance fixture (T1.20): `units` copies of a realistic piece (rounded-rect outline, linked stitch line,
 * linked slit holes, a circle and a centre line), 5 entities each, laid out on a grid. One unit is built
 * through a real store so the derivation pass lays out its line and holes; the rest are translated clones with
 * remapped links, which avoids hundreds of precise offsets just to build the fixture.
 * Loadable in dev with `?fixture=perf` (never autosaved).
 */
export function perfProject(units = 400): Project {
  const project = createProject('Performance test')
  const [cut, stitch, reference] = project.layers
  const store = createDocumentStore(createProject())
  const pieceId = store.getState().project.pieces[0].id
  const base = { strokeWidth: 0.2 }
  const unit: Entity[] = [
    {
      ...base,
      id: 'o',
      type: 'path',
      layerId: cut.id,
      lineStyle: 'solid',
      closed: true,
      segments: rectangleSegments([0, 0], [60, 40], 6),
    },
    {
      ...base,
      id: 's',
      type: 'path',
      layerId: stitch.id,
      lineStyle: 'dashed',
      closed: true,
      segments: [],
      derived: { kind: 'offset', sourceId: 'o', margin: -3.5, join: 'miter' },
    },
    {
      ...base,
      id: 'h',
      type: 'holeSet',
      layerId: stitch.id,
      lineStyle: 'solid',
      sourceEntityId: 's',
      margin: 0,
      pitch: 3.85,
      holeShape: 'slit',
      holeSize: 1.2,
      slitAngle: 45,
      cornerMode: 'cornerAware',
      holes: [],
    },
    {
      ...base,
      id: 'c',
      type: 'circle',
      layerId: cut.id,
      lineStyle: 'solid',
      center: [30, 20],
      rx: 6,
      ry: 6,
      rotation: 0,
    },
    { ...base, id: 'l', type: 'centreLine', layerId: reference.id, lineStyle: 'dashDot', from: [30, -2], to: [30, 42] },
  ]
  store.getState().dispatch(addEntities(pieceId, unit))
  const laidOut = store.getState().project.pieces[0].entities

  const columns = Math.ceil(Math.sqrt(units))
  for (let i = 0; i < units; i++) {
    const m = translation((i % columns) * 70, Math.floor(i / columns) * 50)
    const ids = new Map(laidOut.map((e) => [e.id, newId()]))
    for (const e of laidOut) {
      const copy = { ...transformEntity(e, m), id: ids.get(e.id)! } as Entity
      if (copy.type === 'path' && copy.derived)
        copy.derived = { ...copy.derived, sourceId: ids.get(copy.derived.sourceId)! }
      if (copy.type === 'holeSet' && copy.sourceEntityId) copy.sourceEntityId = ids.get(copy.sourceEntityId)!
      project.pieces[0].entities.push(copy)
    }
  }
  return project
}
