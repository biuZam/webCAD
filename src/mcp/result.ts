// Tool results: JSON text for the client, errors as `isError` results with a message an AI can act on.

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import type { Bounds } from '../geometry/bounds'
import { emptyBounds, entityBounds, isEmpty } from '../geometry/bounds'
import type { Entity } from '../document/model'

/** An error caused by the request (bad id, locked layer…). Its message goes to the client as is. */
export class ToolError extends Error {}

/** Numbers in results are rounded to 0.001 mm, the export precision. */
export const round = (v: number) => Math.round(v * 1000) / 1000

export function bounds(entities: readonly Entity[]): [number, number, number, number] | null {
  const b: Bounds = emptyBounds()
  for (const e of entities) entityBounds(e, b)
  return isEmpty(b) ? null : [round(b.minX), round(b.minY), round(b.maxX), round(b.maxY)]
}

export function ok(data: object): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify({ ok: true, ...data }) }] }
}

export function fail(error: unknown): CallToolResult {
  const message =
    error instanceof ToolError ? error.message : `Internal error: ${error instanceof Error ? error.message : error}`
  return { content: [{ type: 'text', text: message }], isError: true }
}
