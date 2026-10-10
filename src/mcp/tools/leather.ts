// Leather tools: linked stitch lines and hole sets, seam allowances, notches. Same builders as the App's tools.

import { z } from 'zod'
import {
  canOffset,
  DEFAULT_STROKE_MM,
  holeLine,
  holeSet,
  LINE_STYLE_FOR_LAYER,
  stitchLayer,
  stitchLine,
} from '../../document/builders'
import { findEntity, insertEntitiesAfter } from '../../document/commands'
import { newId } from '../../document/factory'
import type { Entity, HoleSetEntity, PathEntity, Project } from '../../document/model'
import type { Shape } from '../../geometry/edit'
import { DEFAULT_NOTCH, notchShapes } from '../../geometry/leather/notches'
import { outlineEdges, seamAllowance } from '../../geometry/leather/seam-allowance'
import { pathLength } from '../../geometry/kernel'
import type { Registrar } from '../define'
import { commit, editableEntity, entityOf, pieceOf, writableLayer } from '../edit'
import { round, ToolError } from '../result'
import { docId, entityId, joinStyle, layerRef, length, vec2 } from '../schemas'
import type { Sessions } from '../sessions'

const isClosed = (e: Entity) => e.type === 'circle' || (e.type === 'path' && e.closed)

/** The outline of a closed path, for seam allowances. (Circles: use offset.) */
function closedOutline(e: Entity): Shape {
  if (e.type === 'path' && e.closed && e.segments.length > 2) return { segments: e.segments, closed: true }
  throw new ToolError(`Seam allowances need a closed path; '${e.id}' is a ${e.type}. For a circle use offset.`)
}

const holeOptions = {
  pitch: length.optional().describe('Hole spacing, mm. Default: the project pitch.'),
  holeSize: length.optional().describe('Hole diameter, or slit length. Default: the project hole size.'),
  holeShape: z.enum(['round', 'slit']).optional().describe("Default 'round'. Slits are diamond-chisel marks."),
  slitAngle: z.number().optional().describe('Slit angle to the line, degrees. Default 45.'),
  cornerMode: z
    .enum(['cornerAware', 'fixed'])
    .optional()
    .describe("'cornerAware' (default): a hole on every corner, pitch adjusted per edge. 'fixed': exact pitch."),
}

type HoleArgs = { [K in keyof typeof holeOptions]?: z.infer<(typeof holeOptions)[K]> }

/** The stitch layer for `source`, or a ToolError explaining why not. */
function stitchLayerFor(project: Project, source: Entity) {
  const layer = stitchLayer(project, source)
  if (!layer) throw new ToolError('The stitch layer is locked or hidden. Change it with update_layer first.')
  return layer
}

function holesFor(project: Project, source: Entity, layerId: string, o: HoleArgs, margin = 0): HoleSetEntity {
  if (!holeLine(source)) throw new ToolError(`Holes can't follow a ${source.type} ('${source.id}').`)
  return holeSet(source, layerId, {
    pitch: o.pitch ?? project.settings.pitch,
    holeSize: o.holeSize ?? project.settings.holeSize,
    holeShape: o.holeShape,
    slitAngle: o.slitAngle,
    cornerMode: o.cornerMode,
    margin,
  })
}

const holeCount = (project: Project, id: string) => {
  const e = findEntity(project, id)?.entity
  return e?.type === 'holeSet' ? e.holes.length : 0
}

export function registerLeatherTools(tool: Registrar, sessions: Sessions) {
  tool(
    'add_stitch_line',
    {
      description:
        'Add a stitch line (dashed, on the stitch layer) linked to an outline: it follows the outline whenever ' +
        'the outline changes. Closed outlines: inside by default. withHoles: true also adds stitch holes along it ' +
        '(same options as add_stitch_holes), all in one undo step.',
      input: {
        docId,
        sourceId: entityId.describe('The outline (path, circle or centre line) to follow.'),
        margin: length
          .optional()
          .describe('Distance from the outline, mm. Default: the project stitch margin (3.5 for new projects).'),
        side: z
          .enum(['inside', 'outside', 'left', 'right'])
          .optional()
          .describe(
            "Closed outlines: 'inside' (default) or 'outside'. Open lines: 'left' or 'right' as seen on screen when walking from the first point (required).",
          ),
        join: joinStyle.optional().describe("Corner style, default 'miter'."),
        withHoles: z.boolean().optional(),
        ...holeOptions,
      },
      write: true,
    },
    ({ docId, sourceId, margin, side, join = 'miter', withHoles, ...holes }) => {
      const doc = sessions.get(docId)
      const { project } = doc.store.getState()
      const source = editableEntity(project, sourceId)
      if (!canOffset(source)) throw new ToolError(`A ${source.type} can't have a stitch line.`)
      const closed = isClosed(source)
      if (!closed && (side === undefined || side === 'inside' || side === 'outside'))
        throw new ToolError("This line is open: pass side 'left' or 'right'.")
      if (closed && (side === 'left' || side === 'right'))
        throw new ToolError("This outline is closed: pass side 'inside' or 'outside'.")
      // offsetEntity: closed + = outward; open + = Paper's normal side, which is left on screen (y down).
      const sign = side === 'outside' || side === 'left' ? 1 : -1
      const d = sign * (margin ?? project.settings.stitchMargin)
      const layer = stitchLayerFor(project, source)
      const line = stitchLine(source, layer.id, d, join)
      if (!line) throw new ToolError('The stitch line is empty: the margin is larger than the shape allows.')
      const entities: Entity[] = [line.entity]
      if (withHoles) entities.push(holesFor(project, line.entity, layer.id, holes))
      const result = commit(doc, insertEntitiesAfter([{ afterId: source.id, entities }], 'history.stitchLine'), {
        created: entities.map((e) => e.id),
        warnings: line.result.warnings,
      })
      const after = doc.store.getState().project
      const length = pathLength(entityOf(after, line.entity.id) as PathEntity)
      return {
        ...result,
        stitchLineId: line.entity.id,
        length: round(length),
        ...(withHoles ? { holeSetId: entities[1].id, holes: holeCount(after, entities[1].id) } : {}),
      }
    },
  )

  tool(
    'add_stitch_holes',
    {
      description:
        'Add stitch holes along a line (usually a stitch line), on the stitch layer. They are linked: moved or ' +
        're-spaced automatically when the line changes. margin offsets the holes from the line first (signed: ' +
        'for closed shapes negative = inside), so holes can follow an outline directly.',
      input: { docId, sourceId: entityId, margin: z.number().optional(), ...holeOptions },
      write: true,
    },
    ({ docId, sourceId, margin, ...holes }) => {
      const doc = sessions.get(docId)
      const { project } = doc.store.getState()
      const source = editableEntity(project, sourceId)
      const set = holesFor(project, source, stitchLayerFor(project, source).id, holes, margin)
      const result = commit(
        doc,
        insertEntitiesAfter([{ afterId: source.id, entities: [set] }], 'history.stitchHoles'),
        {
          created: [set.id],
        },
      )
      const count = holeCount(doc.store.getState().project, set.id)
      const warnings = count === 0 ? ['No holes fit: the line is too short or the margin collapses it.'] : []
      return { ...result, holes: count, ...(count === 0 ? { warnings } : {}) }
    },
  )

  tool(
    'outline_edges',
    {
      description:
        'The edges of a closed path as used by add_seam_allowance: spans between corners, in order, with their ' +
        'end points and lengths.',
      input: { docId, id: entityId },
      write: false,
    },
    ({ docId, id }) => {
      const edges = outlineEdges(closedOutline(entityOf(sessions.get(docId).store.getState().project, id)))
      return {
        edges: edges.map((e, index) => ({
          index,
          from: e.segments[0].p.map(round),
          to: e.segments[e.segments.length - 1].p.map(round),
          length: round(pathLength(e)),
          curved: e.segments.some((s) => s.hi || s.ho),
        })),
      }
    },
  )

  tool(
    'add_seam_allowance',
    {
      description:
        'Add a seam-allowance outline around a closed path: edge i (see outline_edges) moves out by ' +
        'allowances[i] mm; missing values repeat the last one, 0 keeps the edge. Default layer: cut.',
      input: {
        docId,
        id: entityId,
        allowances: z.array(z.number().min(0)).min(1),
        layer: layerRef.optional(),
      },
      write: true,
    },
    ({ docId, id, allowances, layer: ref }) => {
      const doc = sessions.get(docId)
      const { project } = doc.store.getState()
      const source = entityOf(project, id)
      const shape = seamAllowance(closedOutline(source), allowances)
      if (!shape) throw new ToolError('Could not build the seam allowance for this outline.')
      const layer = writableLayer(project, ref ?? 'cut')
      const entity: PathEntity = {
        id: newId(),
        type: 'path',
        layerId: layer.id,
        lineStyle: LINE_STYLE_FOR_LAYER[layer.kind],
        strokeWidth: DEFAULT_STROKE_MM,
        segments: shape.segments,
        closed: true,
      }
      const piece = project.pieces.find((p) => p.entities.some((e) => e.id === id)) ?? pieceOf(project, undefined)
      return commit(
        doc,
        {
          labelKey: 'history.seamAllowance',
          recipe: (draft) => {
            draft.pieces.find((p) => p.id === piece.id)!.entities.push(entity)
          },
        },
        { created: [entity.id] },
      )
    },
  )

  tool(
    'add_notch',
    {
      description:
        "Add alignment notches on an edge at the point nearest `at`, on the edge's layer. They point into a " +
        'closed outline; on an open line towards `towards`.',
      input: {
        docId,
        id: entityId,
        at: vec2,
        towards: vec2.optional().describe('Any point on the side the notch should point to (open lines).'),
        count: z
          .union([z.literal(1), z.literal(2)])
          .optional()
          .describe('Single (default) or double notch.'),
        style: z.enum(['line', 'v']).optional().describe("'line' (default): a snip. 'v': a V notch."),
        length: length.optional().describe(`Depth, mm. Default ${DEFAULT_NOTCH.length}.`),
        gap: length.optional().describe(`Spacing of a double notch, mm. Default ${DEFAULT_NOTCH.gap}.`),
        width: length.optional().describe(`Width of a V at the edge, mm. Default ${DEFAULT_NOTCH.width}.`),
      },
      write: true,
    },
    ({ docId, id, at, towards, ...o }) => {
      const doc = sessions.get(docId)
      const edge = editableEntity(doc.store.getState().project, id)
      if (!isClosed(edge) && !towards) throw new ToolError('This line is open: pass `towards` to pick the side.')
      const options = Object.assign(
        { ...DEFAULT_NOTCH },
        Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)),
      )
      const marks: PathEntity[] = notchShapes(edge, at, towards ?? at, options).map((segments) => ({
        id: newId(),
        type: 'path',
        layerId: edge.layerId,
        lineStyle: 'solid',
        strokeWidth: DEFAULT_STROKE_MM,
        segments,
        closed: false,
      }))
      if (marks.length === 0) throw new ToolError(`Can't notch a ${edge.type}.`)
      return commit(doc, insertEntitiesAfter([{ afterId: id, entities: marks }], 'history.addNotch'), {
        created: marks.map((m) => m.id),
      })
    },
  )
}
