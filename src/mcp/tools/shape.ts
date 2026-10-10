// Shape tools: fillet and chamfer corners, join / explode / boolean paths, linear and circular arrays.

import { z } from 'zod'
import { arrayEntities, updateEntity } from '../../document/commands'
import type { Id, PathEntity, Segment } from '../../document/model'
import {
  applyToCorners,
  chamferCorner,
  chamferDistanceForAngle,
  cornerAt,
  corners,
  filletCorner,
  type CornerResult,
} from '../../geometry/corners'
import { circularArray, linearArray } from '../../tools/array'
import { booleanSelection, explodeSelection, joinSelection, type PathOp } from '../../tools/path-ops'
import type { Registrar } from '../define'
import { commit, editableEntity, sourceOf } from '../edit'
import { round, ToolError } from '../result'
import { docId, entityId, entityIds, length, vec2 } from '../schemas'
import type { Doc, Sessions } from '../sessions'

const cornerList = z
  .array(z.number().int().min(0))
  .optional()
  .describe('Anchor indices of the corners (see get_entity segments). Default: every corner.')

/** A free path whose corners may be changed. */
function cornerPath(doc: Doc, id: Id): PathEntity {
  const e = editableEntity(doc.store.getState().project, id)
  if (e.type !== 'path') throw new ToolError(`Only paths have corners; '${id}' is a ${e.type}.`)
  const source = sourceOf(e)
  if (source) throw new ToolError(`'${id}' follows '${source}': round the source instead and it follows.`)
  return e
}

function applyCorners(
  doc: Doc,
  id: Id,
  picked: number[] | undefined,
  op: (segments: Segment[], closed: boolean, i: number) => CornerResult,
  labelKey: string,
) {
  const path = cornerPath(doc, id)
  const available = corners(path.segments, path.closed)
  if (available.length === 0) throw new ToolError('This path has no corners between straight edges.')
  const indices = picked ?? available
  const bad = indices.filter((i) => !available.includes(i))
  if (bad.length > 0)
    throw new ToolError(`Not corners between straight edges: ${bad.join(', ')}. Corners: ${available.join(', ')}.`)
  const result = applyToCorners(path.segments, indices, (segs, i) => op(segs, path.closed, i))
  if ('error' in result)
    throw new ToolError(
      result.error === 'tooLarge'
        ? `Too large for an edge: at most ${round(result.max)} mm here.`
        : 'Not applicable to this corner.',
    )
  return commit(doc, updateEntity<PathEntity>(id, { segments: result.segments }, labelKey), { changed: [id] })
}

function pathOp(doc: Doc, op: PathOp | null, why: string) {
  if (!op) throw new ToolError(why)
  // The results are new geometry made by the AI: mark them for review even where they keep an old id.
  return commit(doc, op.command, { created: op.resultIds })
}

export function registerShapeTools(tool: Registrar, sessions: Sessions) {
  tool(
    'fillet',
    {
      description: 'Round corners of a path (corners between two straight edges) with a tangent arc.',
      input: { docId, id: entityId, radius: length, corners: cornerList },
      write: true,
    },
    ({ docId, id, radius, corners }) =>
      applyCorners(sessions.get(docId), id, corners, (s, c, i) => filletCorner(s, c, i, radius), 'history.fillet'),
  )

  tool(
    'chamfer',
    {
      description:
        'Cut corners of a path straight: d1 along the incoming edge and d2 (default d1) along the outgoing one, ' +
        'or d1 and an angle to the incoming edge.',
      input: {
        docId,
        id: entityId,
        d1: length,
        d2: length.optional(),
        angle: z.number().gt(0).lt(180).optional().describe('Degrees from the incoming edge (instead of d2).'),
        corners: cornerList,
      },
      write: true,
    },
    ({ docId, id, d1, d2, angle, corners }) =>
      applyCorners(
        sessions.get(docId),
        id,
        corners,
        (segments, closed, i) => {
          let second = d2 ?? d1
          if (angle !== undefined) {
            const corner = cornerAt(segments, closed, i)
            const fromAngle = corner && chamferDistanceForAngle(corner, d1, angle)
            if (fromAngle === null || fromAngle === undefined) return { error: 'notACorner' }
            second = fromAngle
          }
          return chamferCorner(segments, closed, i, d1, second)
        },
        'history.chamfer',
      ),
  )

  tool(
    'join',
    {
      description:
        'Join open paths end to nearest end into one path (keeps the first id and style); a single path whose ' +
        'ends meet is closed.',
      input: { docId, ids: entityIds },
      write: true,
    },
    ({ docId, ids }) => {
      const doc = sessions.get(docId)
      const project = doc.store.getState().project
      ids.forEach((id) => editableEntity(project, id))
      return pathOp(doc, joinSelection(project, ids), 'Nothing to join: pass open paths whose ends meet.')
    },
  )

  tool(
    'explode',
    {
      description: 'Split paths into one open path per segment (curves keep their handles).',
      input: { docId, ids: entityIds },
      write: true,
    },
    ({ docId, ids }) => {
      const doc = sessions.get(docId)
      const project = doc.store.getState().project
      ids.forEach((id) => editableEntity(project, id))
      return pathOp(doc, explodeSelection(project, ids), 'Nothing to explode: pass paths with two or more segments.')
    },
  )

  tool(
    'boolean',
    {
      description:
        "Combine closed shapes (closed paths, circles). 'union' merges them; 'difference' cuts all the others out " +
        "of the largest. Results keep the base shape's style; the other inputs are removed.",
      input: { docId, ids: entityIds, op: z.enum(['union', 'difference']) },
      write: true,
    },
    ({ docId, ids, op }) => {
      const doc = sessions.get(docId)
      const project = doc.store.getState().project
      ids.forEach((id) => editableEntity(project, id))
      return pathOp(doc, booleanSelection(project, ids, op), 'Pass at least two closed shapes.')
    },
  )

  tool(
    'array',
    {
      description:
        'Copy entities in a row (linear: step dx, dy) or around a centre (circular: sweep degrees, positive = ' +
        'clockwise on screen; 360 spaces them evenly). count includes the originals.',
      input: {
        docId,
        ids: entityIds,
        count: z.number().int().min(2).max(500),
        linear: z.object({ dx: z.number(), dy: z.number() }).optional(),
        circular: z
          .object({
            center: vec2,
            sweep: z
              .number()
              .min(-360)
              .max(360)
              .refine((v) => v !== 0),
          })
          .optional(),
      },
      write: true,
    },
    ({ docId, ids, count, linear, circular }) => {
      if (!linear === !circular) throw new ToolError('Pass exactly one of linear or circular.')
      const doc = sessions.get(docId)
      const project = doc.store.getState().project
      const selected = new Set(ids)
      for (const id of ids) {
        const source = sourceOf(editableEntity(project, id))
        if (source && !selected.has(source))
          throw new ToolError(`'${id}' follows '${source}': include its source, so each copy follows its own.`)
      }
      // circularArray takes screen-counter-clockwise degrees.
      const matrices = linear
        ? linearArray(linear.dx, linear.dy, count)
        : circularArray(circular!.center, count, -circular!.sweep)
      const { command, resultIds } = arrayEntities(ids, matrices, 'history.array')
      return commit(doc, command, { created: resultIds.slice(ids.length) })
    },
  )
}
