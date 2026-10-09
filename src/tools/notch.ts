// L7 Notch tool: hover an edge (outline, line or circle) and click to add alignment notches there, on the
// edge's own layer. Object snaps apply, so a notch can land on a midpoint, a quadrant or a tracked point.

import { insertEntitiesAfter } from '../document/commands'
import { newId } from '../document/factory'
import type { Entity, PathEntity } from '../document/model'
import { DEFAULT_NOTCH, notchShapes, type NotchOptions } from '../geometry/leather/notches'
import type { Vec2 } from '../lib/vec2'
import { DEFAULT_STROKE_MM } from './common'
import { hitTest, PICK_TOLERANCE_PX } from './select'
import type { InputValues, PreviewShape, Tool, ToolContext, ToolPointerEvent } from './types'

/** A notchable entity under the snapped point, else under the raw pointer. */
function edgeAt(e: ToolPointerEvent, ctx: ToolContext): Entity | null {
  const tolerance = PICK_TOLERANCE_PX * ctx.pixelSize
  const hit = hitTest(ctx.project, e.point, tolerance) ?? hitTest(ctx.project, e.raw, tolerance)
  return hit && (hit.type === 'path' || hit.type === 'circle' || hit.type === 'centreLine') ? hit : null
}

export class NotchTool implements Tool {
  readonly id = 'notch'
  readonly cursor = 'crosshair'
  private options: NotchOptions = { ...DEFAULT_NOTCH }
  private hover: { entity: Entity; at: Vec2; side: Vec2 } | null = null

  activate(ctx: ToolContext) {
    this.hover = null
    this.update(ctx)
  }

  private shapes() {
    return this.hover ? notchShapes(this.hover.entity, this.hover.at, this.hover.side, this.options) : []
  }

  onPointerMove(e: ToolPointerEvent, ctx: ToolContext) {
    const entity = edgeAt(e, ctx)
    this.hover = entity && { entity, at: e.point, side: e.raw }
    this.update(ctx)
  }

  onPointerDown(e: ToolPointerEvent, ctx: ToolContext) {
    if (e.button !== 0) return
    const entity = edgeAt(e, ctx)
    if (!entity) return
    this.hover = { entity, at: e.point, side: e.raw }
    const layer = ctx.project.layers.find((l) => l.id === entity.layerId)
    if (!layer || layer.locked) return
    const marks: PathEntity[] = this.shapes().map((segments) => ({
      id: newId(),
      type: 'path',
      layerId: entity.layerId,
      lineStyle: 'solid',
      strokeWidth: DEFAULT_STROKE_MM,
      segments,
      closed: false,
    }))
    if (marks.length > 0)
      ctx.dispatch(insertEntitiesAfter([{ afterId: entity.id, entities: marks }], 'history.addNotch'))
    this.update(ctx)
  }

  onInput(values: InputValues, _commit: boolean, ctx: ToolContext) {
    const o = this.options
    if (values.count !== undefined) o.count = values.count === 1 ? 2 : 1
    if (values.style !== undefined) o.style = values.style === 1 ? 'v' : 'line'
    if (values.length !== undefined && values.length > 0) o.length = values.length
    if (values.gap !== undefined && values.gap > 0) o.gap = values.gap
    if (values.width !== undefined && values.width > 0) o.width = values.width
    this.update(ctx)
  }

  onPointerLeave(ctx: ToolContext) {
    this.hover = null
    this.update(ctx)
  }

  cancel() {
    return false
  }

  private update(ctx: ToolContext) {
    const preview: PreviewShape[] = []
    if (this.hover) preview.push({ kind: 'entity', entity: this.hover.entity })
    for (const segments of this.shapes()) preview.push({ kind: 'path', segments, closed: false })
    ctx.setPreview(preview)
    const o = this.options
    ctx.setPrompt('notch.prompt', [
      {
        key: 'count',
        kind: 'choice',
        labelKey: 'notch.count',
        options: ['notch.single', 'notch.double'],
        live: o.count - 1,
      },
      {
        key: 'style',
        kind: 'choice',
        labelKey: 'notch.style',
        options: ['notch.line', 'notch.v'],
        live: o.style === 'v' ? 1 : 0,
      },
      { key: 'length', kind: 'length', labelKey: 'notch.length', live: o.length },
      ...(o.count === 2 ? [{ key: 'gap', kind: 'length' as const, labelKey: 'notch.gap' as const, live: o.gap }] : []),
      ...(o.style === 'v'
        ? [{ key: 'width', kind: 'length' as const, labelKey: 'notch.width' as const, live: o.width }]
        : []),
    ])
  }
}
