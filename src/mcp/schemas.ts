// Zod pieces shared by the MCP tools. Descriptions are for the AI client: they end up in the JSON Schema.

import { z } from 'zod'

export const docId = z.string().describe('Document id from new_project / open_project.')
export const entityId = z.string().describe('Entity id.')
export const entityIds = z.array(z.string()).min(1).describe('Entity ids.')
export const vec2 = z.tuple([z.number(), z.number()]).describe('Point [x, y] in mm, y pointing down.')
export const length = z.number().positive().describe('Length in mm.')

export const layerRef = z
  .string()
  .describe("Layer: a kind ('cut', 'stitch', 'reference', 'notes'; the first layer of that kind) or a layer id.")
export const pieceId = z.string().describe('Piece id. Default: the first piece.')
export const lineStyle = z.enum(['solid', 'dashed', 'dotted', 'dashDot'])
export const strokeWidth = z.number().positive().describe('Export stroke width in mm. Default 0.2.')
export const joinStyle = z.enum(['miter', 'round', 'bevel'])

export const segment = z
  .object({
    p: vec2.describe('Anchor point.'),
    hi: vec2.optional().describe('Incoming Bézier handle, relative to the anchor.'),
    ho: vec2.optional().describe('Outgoing Bézier handle, relative to the anchor.'),
  })
  .strict()

/** Optional placement and style fields every `add_*` tool takes. */
export const placement = {
  layer: layerRef.optional(),
  pieceId: pieceId.optional(),
  lineStyle: lineStyle.optional().describe("Default: the layer's style (cut solid, stitch dashed, reference dotted)."),
  strokeWidth: strokeWidth.optional(),
}

/** Editable fields per entity type, used to validate update_entity. */
export const editableFields = {
  path: z
    .object({ segments: z.array(segment).min(1), closed: z.boolean() })
    .partial()
    .strict(),
  circle: z.object({ center: vec2, rx: length, ry: length, rotation: z.number() }).partial().strict(),
  text: z
    .object({ position: vec2, text: z.string().min(1), size: length, rotation: z.number() })
    .partial()
    .strict(),
  centreLine: z.object({ from: vec2, to: vec2 }).partial().strict(),
  holeSet: z
    .object({
      pitch: length,
      holeSize: length,
      holeShape: z.enum(['round', 'slit']),
      slitAngle: z.number(),
      cornerMode: z.enum(['fixed', 'cornerAware']),
      margin: z.number(),
    })
    .partial()
    .strict(),
} as const
