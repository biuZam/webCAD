// Query tools: compact entity listing, full entities on request, measurements.

import { z } from 'zod'
import type { Entity, Project } from '../../document/model'
import { entityArea, entityLength } from '../../geometry/measure'
import type { Registrar } from '../define'
import { entityOf, layerOf, pieceOf, sourceOf } from '../edit'
import { bounds, round } from '../result'
import { docId, entityIds, entityId, layerRef, pieceId } from '../schemas'
import type { Sessions } from '../sessions'

const ENTITY_TYPES = ['path', 'circle', 'text', 'centreLine', 'holeSet'] as const

function describe(e: Entity): string {
  const len = entityLength(e)
  const lengthText = len === null ? '' : `, length ${round(len)}`
  switch (e.type) {
    case 'path':
      return `${e.closed ? 'closed' : 'open'} path, ${e.segments.length} points${lengthText}`
    case 'circle':
      return e.rx === e.ry
        ? `circle r ${round(e.rx)}`
        : `ellipse ${round(e.rx)} × ${round(e.ry)}, rotated ${e.rotation}°`
    case 'text':
      return `text "${e.text}", size ${e.size}`
    case 'centreLine':
      return `centre line${lengthText}`
    case 'holeSet':
      return `${e.holes.length} ${e.holeShape} holes, pitch ${e.pitch}, size ${e.holeSize}`
  }
}

function brief(project: Project, e: Entity) {
  const layer = project.layers.find((l) => l.id === e.layerId)
  const source = sourceOf(e)
  return {
    id: e.id,
    type: e.type,
    layer: layer?.kind ?? e.layerId,
    summary: describe(e),
    bounds: bounds([e]),
    ...(source ? { follows: source } : {}),
    ...(e.aiCreated ? { aiCreated: true } : {}),
  }
}

export function registerQueryTools(tool: Registrar, sessions: Sessions) {
  tool(
    'list_entities',
    {
      description:
        'List entities with a one-line summary and bounds [minX, minY, maxX, maxY] (mm). `follows` is the source ' +
        'of a derived entity (stitch lines follow outlines, hole sets follow lines). Use get_entity for full geometry.',
      input: {
        docId,
        pieceId: pieceId.optional(),
        layer: layerRef.optional(),
        type: z.enum(ENTITY_TYPES).optional(),
        aiCreated: z.boolean().optional().describe('true: only AI-created, unreviewed entities.'),
        offset: z.number().int().min(0).optional(),
        limit: z.number().int().min(1).max(500).optional().describe('Default 100.'),
      },
      write: false,
    },
    ({ docId, pieceId, layer, type, aiCreated, offset = 0, limit = 100 }) => {
      const { project } = sessions.get(docId).store.getState()
      const pieces = pieceId === undefined ? project.pieces : [pieceOf(project, pieceId)]
      const layerId = layer === undefined ? undefined : layerOf(project, layer).id
      const matches = pieces
        .flatMap((p) => p.entities)
        .filter(
          (e) =>
            (layerId === undefined || e.layerId === layerId) &&
            (type === undefined || e.type === type) &&
            (aiCreated === undefined || !!e.aiCreated === aiCreated),
        )
      return { total: matches.length, entities: matches.slice(offset, offset + limit).map((e) => brief(project, e)) }
    },
  )

  tool(
    'get_entity',
    {
      description:
        'Full JSON of entities. Paths are segments {p, hi?, ho?}: anchor p plus Bézier handles relative to it.',
      input: { docId, ids: entityIds },
      write: false,
    },
    ({ docId, ids }) => {
      const { project } = sessions.get(docId).store.getState()
      return { entities: ids.map((id) => entityOf(project, id)) }
    },
  )

  tool(
    'measure',
    {
      description: 'Length (mm) of a line or outline, and area (mm²) when it is closed. Hole sets report their count.',
      input: { docId, id: entityId },
      write: false,
    },
    ({ docId, id }) => {
      const e = entityOf(sessions.get(docId).store.getState().project, id)
      const len = entityLength(e)
      const area = entityArea(e)
      return {
        length: len === null ? null : round(len),
        area: area === null ? null : round(area),
        ...(e.type === 'holeSet' ? { holes: e.holes.length } : {}),
      }
    },
  )
}
