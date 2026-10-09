import { newId } from '../document/factory'
import type { Id } from '../document/model'
import type { Vec2 } from '../lib/vec2'
import { LINE_STYLE_FOR_LAYER } from './session'
import type { InputField, InputValues, ToolContext } from './types'

/** Default export stroke width for new entities (mm). */
export const DEFAULT_STROKE_MM = 0.2

/** Clicking within this many CSS px of a polyline's first point closes it. */
export const CLOSE_TOLERANCE_PX = 8

/** Shift constrains directions to multiples of this angle. */
export const ANGLE_STEP_DEG = 15

export function entityBase(ctx: ToolContext, layerId: Id) {
  const layer = ctx.project.layers.find((l) => l.id === layerId)!
  return { id: newId(), layerId, lineStyle: LINE_STYLE_FOR_LAYER[layer.kind], strokeWidth: DEFAULT_STROKE_MM }
}

/** Input fields for typing an absolute first point. */
export function pointFields(cursor: Vec2 | null): InputField[] {
  return [
    { key: 'x', kind: 'length', labelKey: 'common.x', live: cursor?.[0] },
    { key: 'y', kind: 'length', labelKey: 'common.y', live: cursor?.[1] },
  ]
}

/** The point given by typed x/y, falling back to the cursor per coordinate. */
export function typedPoint(values: InputValues, cursor: Vec2 | null): Vec2 | null {
  const x = values.x ?? cursor?.[0]
  const y = values.y ?? cursor?.[1]
  return x === undefined || y === undefined ? null : [x, y]
}
