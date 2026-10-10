// Every document change is a Command. Tools build commands; only the store applies them.

import { current, type Draft } from 'immer'
import { transformEntity, type Affine } from '../geometry/transform'
import { newId } from './factory'
import type { LengthUnit } from '../lib/units'
import type { Entity, Id, Layer, LineStyle, Project, ProjectSettings } from './model'

export interface Command {
  /** i18n key (namespace `common`, under `history.`) naming the action for undo/redo menus. */
  labelKey: string
  recipe: (draft: Draft<Project>) => void
}

export function findEntity(project: Draft<Project> | Project, id: Id) {
  for (const piece of project.pieces) {
    const index = piece.entities.findIndex((e) => e.id === id)
    if (index !== -1) return { piece, index, entity: piece.entities[index] }
  }
  return undefined
}

export const addEntities = (pieceId: Id, entities: Entity[], labelKey = 'history.add'): Command => ({
  labelKey,
  recipe: (draft) => {
    const piece = draft.pieces.find((p) => p.id === pieceId)
    if (!piece) throw new Error(`Unknown piece ${pieceId}`)
    piece.entities.push(...(entities as Draft<Entity>[]))
  },
})

/**
 * Change fields of one entity. Generic so type-specific fields can be set:
 * `updateEntity<CircleEntity>(id, { rx: 5 })`. The entity must actually be of that type.
 */
export function updateEntity<E extends Entity = Entity>(
  id: Id,
  changes: Partial<Omit<E, 'id' | 'type'>>,
  labelKey = 'history.edit',
): Command {
  return {
    labelKey,
    recipe: (draft) => {
      const found = findEntity(draft, id)
      if (!found) throw new Error(`Unknown entity ${id}`)
      Object.assign(found.entity, changes)
    },
  }
}

/** Fields every entity type has, editable across a mixed selection. */
export type CommonEntityFields = { layerId: Id; lineStyle: LineStyle; strokeWidth: number }

/** Set common fields on several entities as one undo step. Unchanged values produce no patches. */
export const updateEntities = (ids: readonly Id[], changes: Partial<CommonEntityFields>): Command => ({
  labelKey: 'history.edit',
  recipe: (draft) => {
    for (const id of ids) {
      const found = findEntity(draft, id)
      if (found) Object.assign(found.entity, changes)
    }
  },
})

export const updateProjectSettings = (changes: Partial<ProjectSettings>): Command => ({
  labelKey: 'history.settings',
  recipe: (draft) => {
    Object.assign(draft.settings, changes)
  },
})

export const setDisplayUnit = (unit: LengthUnit): Command => ({
  labelKey: 'history.units',
  recipe: (draft) => {
    draft.displayUnit = unit
  },
})

/** Insert entities right after existing ones (e.g. offsets after their source), as one undo step. */
export const insertEntitiesAfter = (
  inserts: readonly { afterId: Id; entities: Entity[] }[],
  labelKey = 'history.add',
): Command => ({
  labelKey,
  recipe: (draft) => {
    for (const { afterId, entities } of inserts) {
      const found = findEntity(draft, afterId)
      if (!found) throw new Error(`Unknown entity ${afterId}`)
      found.piece.entities.splice(found.index + 1, 0, ...(entities as Draft<Entity>[]))
    }
  },
})

/**
 * Replace entities in place, each by zero or more entities (trim, split, join, booleans), as one undo step.
 * Give the first replacement the original id to keep links to it (stitch lines follow a trimmed outline).
 */
export const replaceEntities = (replacements: readonly { id: Id; with: Entity[] }[], labelKey: string): Command => ({
  labelKey,
  recipe: (draft) => {
    for (const r of replacements) {
      const found = findEntity(draft, r.id)
      if (found) found.piece.entities.splice(found.index, 1, ...(r.with as Draft<Entity>[]))
    }
  },
})

/** Turn a derived (linked) entity into a free one, keeping its current geometry. */
export const detachDerived = (id: Id): Command => ({
  labelKey: 'history.detach',
  recipe: (draft) => {
    const found = findEntity(draft, id)
    if (found?.entity.type === 'path') delete found.entity.derived
  },
})

export const removeEntities = (ids: readonly Id[]): Command => ({
  labelKey: 'history.delete',
  recipe: (draft) => {
    const set = new Set(ids)
    // Splice in place so an empty match produces no patches (and no empty undo step).
    for (const piece of draft.pieces) {
      for (let i = piece.entities.length - 1; i >= 0; i--) {
        if (set.has(piece.entities[i].id)) piece.entities.splice(i, 1)
      }
    }
  },
})

/** Clear the AI-created mark (the person has checked these entities). Unmarked ids produce no patches. */
export const markReviewed = (ids: readonly Id[]): Command => ({
  labelKey: 'history.reviewAi',
  recipe: (draft) => {
    for (const id of ids) {
      const found = findEntity(draft, id)
      if (found?.entity.aiCreated) delete found.entity.aiCreated
    }
  },
})

export const renameProject = (name: string): Command => ({
  labelKey: 'history.rename',
  recipe: (draft) => {
    draft.name = name
  },
})

export const updateLayer = (id: Id, changes: Partial<Omit<Layer, 'id'>>): Command => ({
  labelKey: 'history.layer',
  recipe: (draft) => {
    const layer = draft.layers.find((l) => l.id === id)
    if (!layer) throw new Error(`Unknown layer ${id}`)
    Object.assign(layer, changes)
  },
})

/**
 * A copied stitch line or hole set whose source was copied with it follows that copy, not the original
 * (otherwise the derivation pass would regenerate it on top of the original).
 */
function relinkCopy(copy: Entity, copyIds: ReadonlyMap<Id, Id>) {
  if (copy.type === 'path' && copy.derived && copyIds.has(copy.derived.sourceId))
    copy.derived = { ...copy.derived, sourceId: copyIds.get(copy.derived.sourceId)! }
  if (copy.type === 'holeSet' && copy.sourceEntityId !== null && copyIds.has(copy.sourceEntityId))
    copy.sourceEntityId = copyIds.get(copy.sourceEntityId)!
}

/**
 * Transform entities in place, or (copy) insert transformed copies right after each original.
 * Returns the command plus the ids of the resulting entities, so tools can select them.
 */
export function transformEntities(
  ids: readonly Id[],
  matrix: Affine,
  options: { copy: boolean; labelKey: string },
): { command: Command; resultIds: Id[] } {
  const copyIds = new Map(ids.map((id) => [id, options.copy ? newId() : id]))
  return {
    resultIds: [...copyIds.values()],
    command: {
      labelKey: options.labelKey,
      recipe: (draft) => {
        for (const piece of draft.pieces) {
          for (let i = piece.entities.length - 1; i >= 0; i--) {
            const original = piece.entities[i]
            const targetId = copyIds.get(original.id)
            if (targetId === undefined) continue
            const moved = { ...transformEntity(current(original) as Entity, matrix), id: targetId }
            if (options.copy) relinkCopy(moved, copyIds)
            if (options.copy) piece.entities.splice(i + 1, 0, moved as Draft<Entity>)
            else piece.entities[i] = moved as Draft<Entity>
          }
        }
      },
    },
  }
}

/**
 * M10 Array: copies of the entities under each matrix (e.g. k × a step for k = 1…n−1), as one undo step.
 * `resultIds` lists the originals and then every copy.
 */
export function arrayEntities(
  ids: readonly Id[],
  matrices: readonly Affine[],
  labelKey: string,
): { command: Command; resultIds: Id[] } {
  const copies = matrices.map((m) => transformEntities(ids, m, { copy: true, labelKey }))
  return {
    resultIds: [...ids, ...copies.flatMap((c) => c.resultIds)],
    command: {
      labelKey,
      recipe: (draft) => {
        for (const c of copies) c.command.recipe(draft)
      },
    },
  }
}
