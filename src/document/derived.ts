// T2.1 Derivation pass: keeps derived entities (stitch lines) in step with their sources.
// Runs inside the same Immer draft as every command (store.dispatch), so an edit and the regeneration it
// causes are one undo step and the document is never stale (docs/ARCHITECTURE.md A6).
//
// "Changed in this command" is a reference comparison against the pre-command project: Immer's current()
// returns the original object for an untouched draft and a new one for a modified draft.
//
// Derived entities: paths with a `derived` link (stitch lines) and hole sets with a `sourceEntityId`.
// Rules for both:
//   source gone                                → detach (keep the output, drop the link)
//   its own geometry edited, source unchanged  → detach (the user moved/reshaped the stitch line itself)
//   source geometry changed, or its derivation
//   changed, or it is new                      → regenerate geometry from the source (style is kept)
//   anything else (e.g. source style changed)  → untouched

import { current, isDraft, type Draft } from 'immer'
import { distributeHoles } from '../geometry/leather/stitch-holes'
import { offsetEntity, shapeToPath } from '../geometry/offset'
import type { Entity, HoleSetEntity, Id, JoinStyle, PathEntity, Project, Segment } from './model'

/** The entity's value right now: the original object if untouched, a fresh one if modified, as-is if new. */
/**
 * Whether an entity's *geometry* differs (reference comparison of its geometric fields). Style changes such as
 * stroke width or layer must not trigger a regeneration: that would cost a precise offset and give the derived
 * entity a new identity for nothing.
 */
function geometryChanged(before: Entity | undefined, now: Entity | undefined): boolean {
  if (!before || !now || before === now) return before !== now
  if (before.type !== now.type) return true
  switch (now.type) {
    case 'path': {
      const b = before as typeof now
      return b.segments !== now.segments || b.closed !== now.closed
    }
    case 'circle': {
      const b = before as typeof now
      return b.center !== now.center || b.rx !== now.rx || b.ry !== now.ry || b.rotation !== now.rotation
    }
    case 'centreLine': {
      const b = before as typeof now
      return b.from !== now.from || b.to !== now.to
    }
    case 'holeSet': {
      const b = before as typeof now
      return b.holes !== now.holes
    }
    default:
      return true
  }
}

const snapshot = (x: Draft<Entity>): Entity => (isDraft(x) ? (current(x) as Entity) : (x as Entity))

type DerivedDraft = Draft<PathEntity> | Draft<HoleSetEntity>

/** The entity a derived entity follows, or null if it isn't (or is no longer) derived. */
function sourceIdOf(e: Draft<Entity> | Entity): Id | null {
  if (e.type === 'path') return e.derived?.sourceId ?? null
  if (e.type === 'holeSet') return e.sourceEntityId
  return null
}

/** Whether the link's own parameters changed (margin, pitch, …), which also calls for a regeneration. */
function linkChanged(before: Entity, now: Entity): boolean {
  if (before.type === 'path' && now.type === 'path') {
    const a = before.derived
    const b = now.derived
    return a?.sourceId !== b?.sourceId || a?.margin !== b?.margin || a?.join !== b?.join
  }
  if (before.type === 'holeSet' && now.type === 'holeSet') {
    return (
      before.sourceEntityId !== now.sourceEntityId ||
      before.margin !== now.margin ||
      before.pitch !== now.pitch ||
      before.cornerMode !== now.cornerMode
    )
  }
  return true
}

/** Whether the command edited the derived entity's own output (moved it on its own). */
function ownOutputEdited(before: Entity, now: Entity): boolean {
  if (before.type === 'path' && now.type === 'path')
    return before.segments !== now.segments || before.closed !== now.closed
  if (before.type === 'holeSet' && now.type === 'holeSet') return before.holes !== now.holes
  return false
}

function detach(e: DerivedDraft) {
  if (e.type === 'path') delete e.derived
  else e.sourceEntityId = null
}

/** The line to follow: the source itself, or its offset by `margin`, as path geometry. */
function followedGeometry(
  source: Entity,
  margin: number,
  join: JoinStyle,
): { segments: Segment[]; closed: boolean } | null {
  if (margin !== 0) {
    const shape = offsetEntity(source, margin, join).shapes[0]
    return shape ? shapeToPath(shape) : null
  }
  switch (source.type) {
    case 'path':
      return { segments: source.segments, closed: source.closed }
    case 'circle':
      return shapeToPath({
        type: 'circle',
        center: source.center,
        rx: source.rx,
        ry: source.ry,
        rotation: source.rotation,
      })
    case 'centreLine':
      return { segments: [{ p: source.from }, { p: source.to }], closed: false }
    default:
      return null
  }
}

const edgeCache = new WeakMap<HoleSetEntity, number[][]>()

/**
 * L4 The holes of a set grouped by edge (indices into `holes`, see HoleLayout.edges), recomputed from the line
 * they follow. A detached set has no line any more: all its holes count as one edge.
 */
export function holeEdges(project: Project, set: HoleSetEntity): number[][] {
  let edges = edgeCache.get(set)
  if (edges) return edges
  const source = set.sourceEntityId ? findEntityIn(project, set.sourceEntityId) : undefined
  const geometry = source && followedGeometry(source, set.margin, 'miter')
  const layout = geometry && distributeHoles(geometry, set.pitch, set.cornerMode)
  // Only trust the regrouping if it reproduces the cached holes (it always should while linked).
  edges = layout && layout.holes.length === set.holes.length ? layout.edges : [set.holes.map((_, i) => i)]
  edgeCache.set(set, edges)
  return edges
}

function findEntityIn(project: Project, id: Id): Entity | undefined {
  for (const piece of project.pieces) for (const e of piece.entities) if (e.id === id) return e
  return undefined
}

function regenerate(e: DerivedDraft, source: Entity) {
  if (e.type === 'path') {
    // Several pieces can result (an inset that pinches apart); the first is kept. Empty means the offset
    // collapsed (e.g. inset larger than the shape); the link stays so it reappears if the source grows.
    const link = e.derived!
    const geometry = followedGeometry(source, link.margin, link.join) ?? { segments: [], closed: e.closed }
    e.segments = geometry.segments as Draft<PathEntity>['segments']
    e.closed = geometry.closed
  } else {
    const geometry = followedGeometry(source, e.margin, 'miter')
    const layout = geometry ? distributeHoles(geometry, e.pitch, e.cornerMode) : { holes: [], angles: [] }
    e.holes = layout.holes as Draft<HoleSetEntity>['holes']
    e.angles = layout.angles
  }
}

/**
 * The entities of each piece as plain objects, without creating a draft proxy per entity. `current()` on the
 * array keeps the original object for every untouched entry, so this is cheap even with thousands of
 * entities. (Iterating the draft array directly proxied all 2,000 entities: ~5 ms per command.)
 */
function plainEntities(draft: Draft<Project>): { entity: Entity; piece: number; index: number }[] {
  const out: { entity: Entity; piece: number; index: number }[] = []
  draft.pieces.forEach((piece, p) => {
    const list = (isDraft(piece.entities) ? current(piece.entities) : piece.entities) as Entity[]
    list.forEach((entity, index) => out.push({ entity, piece: p, index }))
  })
  return out
}

export function regenerateDerived(draft: Draft<Project>, base: Project): void {
  const all = plainEntities(draft)
  const derivedRefs = all.filter(
    ({ entity }) => (entity.type === 'path' || entity.type === 'holeSet') && sourceIdOf(entity) !== null,
  )
  if (derivedRefs.length === 0) return

  const baseById = new Map<Id, Entity>()
  for (const piece of base.pieces) for (const e of piece.entities) baseById.set(e.id, e)
  const nowById = new Map<Id, Entity>(all.map(({ entity }) => [entity.id, entity]))
  const sourceMoved = (id: Id) => geometryChanged(baseById.get(id), nowById.get(id))
  /** The draft (mutable) version of a derived entity; only created for entities we actually change. */
  const draftOf = (ref: (typeof derivedRefs)[number]) => draft.pieces[ref.piece].entities[ref.index] as DerivedDraft

  // A derived entity may follow another derived one (outline → stitch line → holes). Process sources before
  // their dependants and refresh the snapshot after each regeneration, so dependants see the new geometry.
  const byId = new Map(derivedRefs.map((r) => [r.entity.id, r]))
  const depth = (e: Entity, seen = new Set<Id>()): number => {
    const sourceId = sourceIdOf(e)!
    const source = byId.get(sourceId)
    if (!source || seen.has(sourceId)) return 0
    seen.add(sourceId)
    return 1 + depth(source.entity, seen)
  }
  derivedRefs.sort((a, b) => depth(a.entity) - depth(b.entity))

  for (const ref of derivedRefs) {
    const now = nowById.get(ref.entity.id)!
    const sourceId = sourceIdOf(now)!
    const source = nowById.get(sourceId)
    if (!source) {
      detach(draftOf(ref))
      continue
    }
    const before = baseById.get(now.id)
    const isNew = !before
    const paramsChanged = !isNew && linkChanged(before, now)

    if (!isNew && ownOutputEdited(before, now) && !sourceMoved(sourceId) && !paramsChanged) {
      detach(draftOf(ref))
      continue
    }
    if (isNew || paramsChanged || sourceMoved(sourceId)) {
      const target = draftOf(ref)
      regenerate(target, source)
      nowById.set(now.id, snapshot(target))
    }
  }
}
