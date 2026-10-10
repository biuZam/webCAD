// Constraint solving with planegcs (FreeCAD's solver, LGPL, WASM). Loaded lazily and kept as its own chunk.
// Solving is explicit: a request lists the constraints to enforce and the points that must not move, and the
// result is the entities with their new positions. The caller dispatches them in one command.

import type { Constraint, Entity, Id, Piece, PointRef } from '../document/model'
import type { Vec2 } from '../lib/vec2'
import { circleOf, constraintEntities, constraintResidual, edgeEnds, edgeOf, isSatisfied, pointOf } from './constraints'

export interface SolveRequest {
  piece: Piece
  /** Constraints to enforce: the piece's own plus any new or changed ones. */
  constraints: readonly Constraint[]
  /** Points that keep their position (circles: index 0 pins the centre and the radius). */
  pinned: readonly PointRef[]
}

export type SolveResult = { ok: true; entities: Entity[] } | { ok: false; reason: 'broken' | 'conflict' | 'failed' }

type Wrapper = import('@salusoft89/planegcs').GcsWrapper
let wrapper: Promise<Wrapper> | null = null

async function loadWrapper(): Promise<Wrapper> {
  const { init_planegcs_module, GcsWrapper } = await import('@salusoft89/planegcs')
  // In the browser the .wasm file is a separate asset; under Node the module finds it next to itself.
  const locateFile = typeof window === 'undefined' ? undefined : { locateFile: () => '' as string }
  if (locateFile) {
    const url = (await import('@salusoft89/planegcs/dist/planegcs_dist/planegcs.wasm?url')).default
    locateFile.locateFile = () => url
  }
  const mod = await init_planegcs_module(locateFile)
  return new GcsWrapper(new mod.GcsSystem())
}

const getWrapper = () => (wrapper ??= loadWrapper().catch((e) => ((wrapper = null), Promise.reject(e))))

const key = (r: PointRef) => `${r.entityId}:${r.index}`

function refsOf(c: Constraint, piece: Piece): PointRef[] {
  const edgePoints = (entityId: Id, edge: number) => {
    const e = piece.entities.find((x) => x.id === entityId)
    const ends = e && edgeEnds(e, edge)
    return ends ? ends.map((index) => ({ entityId, index })) : []
  }
  switch (c.type) {
    case 'coincident':
    case 'distance':
      return [c.a, c.b]
    case 'parallel':
    case 'perpendicular':
      return [...edgePoints(c.a.entityId, c.a.edge), ...edgePoints(c.b.entityId, c.b.edge)]
    case 'tangent':
      return [...edgePoints(c.line.entityId, c.line.edge), { entityId: c.circle, index: 0 }]
    case 'radius':
      return [{ entityId: c.circle, index: 0 }]
  }
}

export async function solve({ piece, constraints, pinned }: SolveRequest): Promise<SolveResult> {
  // Every reference must resolve to straight edges, true circles and existing points.
  for (const c of constraints) {
    const ok =
      constraintEntities(c).every((id) => piece.entities.some((e) => e.id === id)) &&
      (c.type === 'coincident' || c.type === 'distance'
        ? pointOf(piece, c.a) && pointOf(piece, c.b)
        : c.type === 'parallel' || c.type === 'perpendicular'
          ? edgeOf(piece, c.a) && edgeOf(piece, c.b)
          : c.type === 'tangent'
            ? edgeOf(piece, c.line) && circleOf(piece, c.circle)
            : circleOf(piece, c.circle))
    if (!ok) return { ok: false, reason: 'broken' }
  }

  const pins = new Set(pinned.map(key))
  const prims: unknown[] = []
  let next = 0
  const newId = () => String(++next)

  // Points first (lines and circles need lower ids than themselves).
  const pointIds = new Map<string, string>()
  const addPoint = (r: PointRef) => {
    const k = key(r)
    if (pointIds.has(k)) return pointIds.get(k)!
    const at = pointOf(piece, r)!
    const id = newId()
    pointIds.set(k, id)
    prims.push({ id, type: 'point', x: at[0], y: at[1], fixed: pins.has(k) })
    return id
  }
  for (const c of constraints) for (const r of refsOf(c, piece)) addPoint(r)

  const lineIds = new Map<string, string>()
  const addLine = (entityId: Id, edge: number) => {
    const k = `${entityId}/${edge}`
    if (lineIds.has(k)) return lineIds.get(k)!
    const e = piece.entities.find((x) => x.id === entityId)!
    const [i, j] = edgeEnds(e, edge)!
    const id = newId()
    lineIds.set(k, id)
    prims.push({
      id,
      type: 'line',
      p1_id: pointIds.get(key({ entityId, index: i }))!,
      p2_id: pointIds.get(key({ entityId, index: j }))!,
    })
    return id
  }
  const circleIds = new Map<Id, string>()
  const addCircle = (entityId: Id) => {
    if (circleIds.has(entityId)) return circleIds.get(entityId)!
    const circle = circleOf(piece, entityId)!
    const id = newId()
    circleIds.set(entityId, id)
    const radiusDriven = constraints.find((c) => c.type === 'radius' && c.circle === entityId)
    prims.push({ id, type: 'circle', c_id: pointIds.get(key({ entityId, index: 0 }))!, radius: circle.rx })
    // A circle keeps its size unless a radius dimension says otherwise.
    if (!radiusDriven) prims.push({ id: newId(), type: 'circle_radius', c_id: id, radius: circle.rx })
    return id
  }

  for (const c of constraints) {
    switch (c.type) {
      case 'coincident':
        prims.push({ id: newId(), type: 'p2p_coincident', p1_id: addPoint(c.a), p2_id: addPoint(c.b) })
        break
      case 'distance':
        prims.push({
          id: newId(),
          type: 'p2p_distance',
          p1_id: addPoint(c.a),
          p2_id: addPoint(c.b),
          distance: c.value,
        })
        break
      case 'parallel':
      case 'perpendicular':
        prims.push({
          id: newId(),
          type: c.type === 'parallel' ? 'parallel' : 'perpendicular_ll',
          l1_id: addLine(c.a.entityId, c.a.edge),
          l2_id: addLine(c.b.entityId, c.b.edge),
        })
        break
      case 'tangent':
        prims.push({
          id: newId(),
          type: 'tangent_lc',
          l_id: addLine(c.line.entityId, c.line.edge),
          c_id: addCircle(c.circle),
        })
        break
      case 'radius':
        prims.push({
          id: newId(),
          type: 'circle_radius',
          c_id: addCircle(c.circle),
          radius: c.value,
        })
        break
    }
  }

  const gcs = await getWrapper()
  gcs.clear_data()
  gcs.push_primitives_and_params(prims as Parameters<Wrapper['push_primitives_and_params']>[0])
  const status = gcs.solve()
  if (gcs.has_gcs_conflicting_constraints()) return { ok: false, reason: 'conflict' }
  // 0 = success, 1 = converged; 2 = failed, 3 = solution invalid.
  if (status !== 0 && status !== 1) return { ok: false, reason: 'failed' }
  gcs.apply_solution()

  const solved = new Map<string, { x: number; y: number }>()
  const radii = new Map<Id, number>()
  for (const p of gcs.sketch_index.get_primitives()) {
    if (p.type === 'point') solved.set(p.id, { x: p.x, y: p.y })
    if (p.type === 'circle')
      for (const [entityId, id] of circleIds) if (id === p.id) radii.set(entityId, p.radius as number)
  }

  const moved = (r: PointRef): Vec2 | null => {
    const id = pointIds.get(key(r))
    const s = id && solved.get(id)
    return s ? [s.x, s.y] : null
  }
  // Ignore solver noise so untouched geometry stays bit-identical (and makes no patches).
  const same = (a: Vec2, b: Vec2) => Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9

  const touched = new Set(constraints.flatMap(constraintEntities))
  const entities: Entity[] = []
  for (const e of piece.entities) {
    if (!touched.has(e.id)) continue
    if (e.type === 'path') {
      let changed = false
      const segments = e.segments.map((s, index) => {
        const p = moved({ entityId: e.id, index })
        if (!p || same(p, s.p)) return s
        changed = true
        return { ...s, p }
      })
      if (changed) entities.push({ ...e, segments })
    } else if (e.type === 'centreLine') {
      const from = moved({ entityId: e.id, index: 0 }) ?? e.from
      const to = moved({ entityId: e.id, index: 1 }) ?? e.to
      if (!same(from, e.from) || !same(to, e.to)) entities.push({ ...e, from, to })
    } else if (e.type === 'circle') {
      const center = moved({ entityId: e.id, index: 0 }) ?? e.center
      const r = radii.get(e.id) ?? e.rx
      if (!same(center, e.center) || Math.abs(r - e.rx) > 1e-9) entities.push({ ...e, center, rx: r, ry: r })
    }
  }

  // Don't trust the solver's status alone (constraints between pinned points are silently dropped): check the
  // result against every constraint.
  const result: Piece = { ...piece, entities: piece.entities.map((e) => entities.find((x) => x.id === e.id) ?? e) }
  if (!constraints.every((c) => isSatisfied(constraintResidual(result, c)))) return { ok: false, reason: 'conflict' }
  return { ok: true, entities }
}
