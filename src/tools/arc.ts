// D3 3-point arc: click the start, the end, then a point the arc passes through.

import { addEntities } from '../document/commands'
import { arcThrough } from '../geometry/arcs'
import type { Vec2 } from '../lib/vec2'
import { entityBase, pointFields, typedPoint } from './common'
import type { InputValues, PreviewShape, Tool, ToolContext, ToolPointerEvent } from './types'

export class ArcTool implements Tool {
  readonly id = 'arc'
  readonly cursor = 'crosshair'
  readonly draws = true
  private start: Vec2 | null = null
  private end: Vec2 | null = null
  private mouse: Vec2 | null = null

  activate(ctx: ToolContext) {
    this.reset(ctx)
  }

  snapFrom() {
    return this.end ?? this.start
  }

  onPointerMove(e: ToolPointerEvent, ctx: ToolContext) {
    this.mouse = e.point
    this.update(ctx)
  }

  onPointerDown(e: ToolPointerEvent, ctx: ToolContext) {
    if (e.button !== 0) return
    this.mouse = e.point
    this.place(e.point, ctx)
  }

  onInput(values: InputValues, commit: boolean, ctx: ToolContext) {
    if (!commit) return
    const p = typedPoint(values, this.mouse)
    if (p) this.place(p, ctx)
  }

  undoStep(ctx: ToolContext) {
    if (this.end) this.end = null
    else this.start = null
    this.update(ctx)
  }

  cancel(ctx: ToolContext) {
    const busy = this.start !== null
    this.reset(ctx)
    return busy
  }

  private place(p: Vec2, ctx: ToolContext) {
    if (!this.start) this.start = p
    else if (!this.end) this.end = p
    else {
      const segments = arcThrough(this.start, p, this.end)
      const target = ctx.target()
      if (!segments) return ctx.setPrompt('arc.collinear', pointFields(this.mouse))
      if (target) {
        ctx.dispatch(
          addEntities(
            target.pieceId,
            [{ ...entityBase(ctx, target.layerId), type: 'path', segments, closed: false }],
            'history.addArc',
          ),
        )
      }
      return this.reset(ctx)
    }
    this.update(ctx)
  }

  private reset(ctx: ToolContext) {
    this.start = null
    this.end = null
    this.update(ctx)
  }

  private update(ctx: ToolContext) {
    const preview: PreviewShape[] = []
    if (this.start && !this.end && this.mouse) {
      preview.push({ kind: 'path', segments: [{ p: this.start }, { p: this.mouse }], closed: false, dashed: true })
    }
    if (this.start && this.end && this.mouse) {
      const segments = arcThrough(this.start, this.mouse, this.end)
      preview.push(
        segments
          ? { kind: 'path', segments, closed: false }
          : { kind: 'path', segments: [{ p: this.start }, { p: this.end }], closed: false, dashed: true },
      )
    }
    ctx.setPreview(preview)
    const key = !this.start ? 'arc.promptStart' : !this.end ? 'arc.promptEnd' : 'arc.promptThrough'
    ctx.setPrompt(key, pointFields(this.mouse))
  }
}
