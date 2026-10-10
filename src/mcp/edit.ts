// Helpers the tools use to read and change a document: layer/piece lookup with the App's rules (no drawing on
// locked or hidden layers), and `commit`, which dispatches one command and marks what it created as AI-made.

import type { Draft } from 'immer'
import { findEntity, type Command } from '../document/commands'
import type { Entity, Id, Layer, Piece, Project } from '../document/model'
import type { Doc } from './sessions'
import { bounds, ToolError } from './result'

export function layerOf(project: Project, ref: string): Layer {
  const layer = project.layers.find((l) => l.id === ref) ?? project.layers.find((l) => l.kind === ref)
  if (!layer) {
    const known = project.layers.map((l) => `${l.id} (${l.kind}, '${l.name}')`).join(', ')
    throw new ToolError(`Unknown layer '${ref}'. Layers: ${known}.`)
  }
  return layer
}

/** A layer new or changed entities may go on. */
export function writableLayer(project: Project, ref: string): Layer {
  const layer = layerOf(project, ref)
  if (layer.locked) throw new ToolError(`Layer '${ref}' is locked. Unlock it with update_layer first.`)
  if (!layer.visible) throw new ToolError(`Layer '${ref}' is hidden. Show it with update_layer first.`)
  return layer
}

export function pieceOf(project: Project, id: Id | undefined): Piece {
  if (id === undefined) return project.pieces[0]
  const piece = project.pieces.find((p) => p.id === id)
  if (!piece) throw new ToolError(`Unknown piece '${id}'. Pieces: ${project.pieces.map((p) => p.id).join(', ')}.`)
  return piece
}

export function entityOf(project: Project, id: Id): Entity {
  const found = findEntity(project, id)
  if (!found) throw new ToolError(`Unknown entity '${id}'. Use list_entities to find ids.`)
  return found.entity
}

/** An existing entity that may be changed: its layer is neither locked nor hidden. */
export function editableEntity(project: Project, id: Id): Entity {
  const entity = entityOf(project, id)
  const layer = project.layers.find((l) => l.id === entity.layerId)
  if (layer?.locked || layer?.visible === false)
    throw new ToolError(`Entity '${id}' is on a ${layer.locked ? 'locked' : 'hidden'} layer ('${layer.kind}').`)
  return entity
}

/** The id of the entity a derived one follows, or null for a free entity. */
export function sourceOf(e: Entity): Id | null {
  if (e.type === 'path') return e.derived?.sourceId ?? null
  if (e.type === 'holeSet') return e.sourceEntityId
  return null
}

export interface Outcome {
  created?: Id[]
  changed?: Id[]
  removed?: Id[]
  warnings?: string[]
}

/**
 * Dispatch `command` as one undo step. Entities listed in `created` get `aiCreated: true` inside the same
 * recipe. Returns what the client is told: ids, the bounds of everything created or changed, warnings.
 */
export function commit(doc: Doc, command: Command, outcome: Outcome): object {
  const created = outcome.created ?? []
  const before = doc.store.getState().past.length
  doc.store.getState().dispatch({
    labelKey: command.labelKey,
    recipe: (draft: Draft<Project>) => {
      command.recipe(draft)
      for (const id of created) {
        const found = findEntity(draft, id)
        if (found) found.entity.aiCreated = true
      }
    },
  })
  const project = doc.store.getState().project
  const touched = [...created, ...(outcome.changed ?? [])]
    .map((id) => findEntity(project, id)?.entity)
    .filter((e): e is Entity => e !== undefined)
  return {
    ...outcome,
    ...(doc.store.getState().past.length === before ? { noChange: true } : {}),
    bounds: bounds(touched),
  }
}
