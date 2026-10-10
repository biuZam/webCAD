// Editing tools: change, restyle, delete, transform, offset; undo/redo.

import { z } from 'zod'
import { canOffset } from '../../document/builders'
import {
  detachDerived,
  insertEntitiesAfter,
  removeEntities,
  transformEntities,
  updateEntities,
  updateEntity,
  type Command,
} from '../../document/commands'
import { newId } from '../../document/factory'
import type { Entity, HoleSetEntity, Id, Project } from '../../document/model'
import { offsetEntity } from '../../geometry/offset'
import {
  mirrorAcross,
  rotationAbout,
  scaleAbout,
  scaleXYAbout,
  supportsNonUniformScale,
  translation,
  type Affine,
} from '../../geometry/transform'
import type { Registrar } from '../define'
import { commit, editableEntity, sourceOf, writableLayer } from '../edit'
import { ToolError } from '../result'
import {
  docId,
  editableFields,
  entityId,
  entityIds,
  joinStyle,
  layerRef,
  lineStyle,
  strokeWidth,
  vec2,
} from '../schemas'
import type { Sessions } from '../sessions'

/** Fields that are the output of a derivation: editing them by hand detaches the entity from its source. */
const OUTPUT_FIELDS = ['segments', 'closed', 'holes', 'angles']

const detachHint = (id: Id, source: Id) =>
  `Entity '${id}' follows '${source}' and is regenerated from it. Change the source instead, or pass ` +
  'detach: true to make it a free entity first.'

const operation = z.discriminatedUnion('op', [
  z.object({ op: z.literal('move'), dx: z.number(), dy: z.number() }),
  z.object({
    op: z.literal('rotate'),
    center: vec2,
    angle: z.number().describe('Degrees, positive = clockwise on screen.'),
  }),
  z.object({
    op: z.literal('scale'),
    center: vec2,
    factor: z.number().positive().optional(),
    sx: z.number().positive().optional().describe('Non-uniform scale: paths, centre lines and hole sets only.'),
    sy: z.number().positive().optional(),
  }),
  z.object({ op: z.literal('mirror'), p: vec2, q: vec2.describe('Mirror across the line through p and q.') }),
])

function matrixOf(o: z.infer<typeof operation>, entities: Entity[]): Affine {
  switch (o.op) {
    case 'move':
      return translation(o.dx, o.dy)
    case 'rotate':
      // rotationAbout takes screen-counter-clockwise degrees.
      return rotationAbout(o.center, -o.angle)
    case 'mirror':
      if (o.p[0] === o.q[0] && o.p[1] === o.q[1]) throw new ToolError('Mirror needs two different points.')
      return mirrorAcross(o.p, o.q)
    case 'scale': {
      if (o.factor !== undefined) return scaleAbout(o.center, o.factor)
      if (o.sx === undefined || o.sy === undefined) throw new ToolError('Scale needs factor, or sx and sy.')
      const bad = entities.find((e) => !supportsNonUniformScale(e))
      if (bad && o.sx !== o.sy) throw new ToolError(`A ${bad.type} ('${bad.id}') can only be scaled uniformly.`)
      return scaleXYAbout(o.center, o.sx, o.sy)
    }
  }
}

const all = (project: Project) => project.pieces.flatMap((p) => p.entities)

export function registerModifyTools(tool: Registrar, sessions: Sessions) {
  tool(
    'update_entity',
    {
      description:
        'Change geometry or parameters of one entity. Fields by type: path {segments, closed}; circle {center, ' +
        'rx, ry, rotation}; text {position, text, size, rotation}; centreLine {from, to}; holeSet {pitch, ' +
        'holeSize, holeShape, slitAngle, cornerMode, margin}. Stitch lines and hole sets follow their source: ' +
        'editing their own geometry needs detach: true. detach: true alone just unlinks the entity.',
      input: {
        docId,
        id: entityId,
        changes: z.record(z.string(), z.unknown()).optional(),
        detach: z.boolean().optional(),
      },
      write: true,
    },
    ({ docId, id, changes = {}, detach }) => {
      const doc = sessions.get(docId)
      const entity = editableEntity(doc.store.getState().project, id)
      const parsed = editableFields[entity.type].safeParse(changes)
      if (!parsed.success) throw new ToolError(`Invalid changes for a ${entity.type}: ${parsed.error.message}`)
      const source = sourceOf(entity)
      const touchesOutput = Object.keys(parsed.data).some((k) => OUTPUT_FIELDS.includes(k))
      if (source && touchesOutput && !detach) throw new ToolError(detachHint(id, source))
      const commands: Command[] = []
      if (source && detach)
        commands.push(
          entity.type === 'path' ? detachDerived(id) : updateEntity<HoleSetEntity>(id, { sourceEntityId: null }),
        )
      if (Object.keys(parsed.data).length > 0) commands.push(updateEntity(id, parsed.data as Partial<Entity>))
      if (commands.length === 0) throw new ToolError('Nothing to change: pass changes and/or detach: true.')
      return commit(
        doc,
        { labelKey: 'history.edit', recipe: (draft) => commands.forEach((c) => c.recipe(draft)) },
        { changed: [id] },
      )
    },
  )

  tool(
    'set_style',
    {
      description: 'Move entities to another layer and/or change their line style or export stroke width.',
      input: {
        docId,
        ids: entityIds,
        layer: layerRef.optional(),
        lineStyle: lineStyle.optional(),
        strokeWidth: strokeWidth.optional(),
      },
      write: true,
    },
    ({ docId, ids, layer, lineStyle, strokeWidth }) => {
      const doc = sessions.get(docId)
      const { project } = doc.store.getState()
      for (const id of ids) editableEntity(project, id)
      const changes = {
        ...(layer !== undefined ? { layerId: writableLayer(project, layer).id } : {}),
        ...(lineStyle !== undefined ? { lineStyle } : {}),
        ...(strokeWidth !== undefined ? { strokeWidth } : {}),
      }
      return commit(doc, updateEntities(ids, changes), { changed: ids })
    },
  )

  tool(
    'delete_entities',
    {
      description: 'Delete entities. Stitch lines or hole sets that followed a deleted entity stay, as free entities.',
      input: { docId, ids: entityIds },
      write: true,
      destructive: true,
    },
    ({ docId, ids }) => {
      const doc = sessions.get(docId)
      const { project } = doc.store.getState()
      for (const id of ids) editableEntity(project, id)
      return commit(doc, removeEntities(ids), { removed: ids })
    },
  )

  tool(
    'transform',
    {
      description:
        'Move, rotate, scale or mirror entities, or (copy: true) transformed copies of them. Moving a stitch ' +
        'line or hole set without its source would detach it: include the source, or pass detach: true.',
      input: { docId, ids: entityIds, operation, copy: z.boolean().optional(), detach: z.boolean().optional() },
      write: true,
    },
    ({ docId, ids, operation, copy = false, detach }) => {
      const doc = sessions.get(docId)
      const { project } = doc.store.getState()
      const entities = ids.map((id) => editableEntity(project, id))
      const selected = new Set(ids)
      for (const e of entities) {
        const source = sourceOf(e)
        if (source && !selected.has(source) && !detach) throw new ToolError(detachHint(e.id, source))
      }
      const { command, resultIds } = transformEntities(ids, matrixOf(operation, entities), {
        copy,
        labelKey: `history.${operation.op}`,
      })
      return commit(doc, command, copy ? { created: resultIds } : { changed: resultIds })
    },
  )

  tool(
    'offset',
    {
      description:
        'Offset a path, circle or centre line by a signed distance (mm). Closed shapes: positive = outward, ' +
        'negative = inward. Open lines: positive = left of the drawing direction as seen on screen. The result ' +
        'is a free entity on the same layer (for a linked stitch line use add_stitch_line).',
      input: { docId, id: entityId, distance: z.number(), join: joinStyle.optional() },
      write: true,
    },
    ({ docId, id, distance, join = 'miter' }) => {
      const doc = sessions.get(docId)
      const source = editableEntity(doc.store.getState().project, id)
      if (!canOffset(source)) throw new ToolError(`A ${source.type} cannot be offset.`)
      if (distance === 0) throw new ToolError('distance must not be 0.')
      const result = offsetEntity(source, distance, join)
      if (result.shapes.length === 0) throw new ToolError('The offset is empty (an inset larger than the shape?).')
      const style = { layerId: source.layerId, lineStyle: source.lineStyle, strokeWidth: source.strokeWidth }
      const entities = result.shapes.map((s) => ({ id: newId(), ...style, ...s }) as Entity)
      const warnings = [...result.warnings, ...(result.method === 'clipper' ? ['curves approximated by lines'] : [])]
      return commit(doc, insertEntitiesAfter([{ afterId: id, entities }], 'history.offset'), {
        created: entities.map((e) => e.id),
        warnings,
      })
    },
  )

  for (const which of ['undo', 'redo'] as const) {
    tool(
      which,
      {
        description: `${which === 'undo' ? 'Undo' : 'Redo'} the last change(s). Each tool call is one step.`,
        input: { docId, steps: z.number().int().min(1).optional() },
        write: true,
      },
      ({ docId, steps = 1 }) => {
        const doc = sessions.get(docId)
        const store = doc.store
        let done = 0
        for (; done < steps; done++) {
          const depth = which === 'undo' ? store.getState().past.length : store.getState().future.length
          if (depth === 0) break
          store.getState()[which]()
        }
        const { past, future, project } = store.getState()
        return { steps: done, history: { undo: past.length, redo: future.length }, entities: all(project).length }
      },
    )
  }
}
