// D8 Perpendicular: pick a straight edge, then the line starts where the cursor projects onto that edge (or
// its extension) and runs perpendicular to it, to the cursor. Type "along" (from the edge's start) and/or
// "length" to place it exactly. Stays on the same edge for more lines; Esc picks another edge.

import { addEntities } from '../document/commands'
import { add, distance, scale, sub, type Vec2 } from '../lib/vec2'
import { entityBase } from './common'
import { edgeNear, type Edge } from './edges'
import { PICK_TOLERANCE_PX } from './select'
import type { InputValues, PreviewShape, Tool, ToolContext, ToolPointerEvent } from './types'

export class PerpendicularTool implements Tool {
  readonly id = 'perpendicular'
  readonly cursor = 'crosshair'
  readonly draws = true
  private edge: Edge | null = null
  private hoverEdge: Edge | null = null
  private mouse: Vec2 | null = null
  private typed: InputValues = {}

  activate(ctx: ToolContext) {
    this.edge = null
    this.update(ctx)
  }

  /** Foot on the edge's line and end point of the perpendicular, from the cursor and typed values. */
  private line(): { foot: Vec2; end: Vec2; along: number; length: number } | null {
    const e = this.edge
    if (!e || !this.mouse) return null
    const len = distance(e.a, e.b)
    if (len === 0) return null
    const u = scale(sub(e.b, e.a), 1 / len)
    const n: Vec2 = [-u[1], u[0]]
    const rel = sub(this.mouse, e.a)
    const along = this.typed.along ?? rel[0] * u[0] + rel[1] * u[1]
    const side = rel[0] * n[0] + rel[1] * n[1]
    const length = this.typed.length !== undefined ? Math.abs(this.typed.length) * (side < 0 ? -1 : 1) : side
    const foot = add(e.a, scale(u, along))
    return { foot, end: add(foot, scale(n, length)), along, length }
  }

  onPointerMove(e: ToolPointerEvent, ctx: ToolContext) {
    this.mouse = e.point
    if (!this.edge) this.hoverEdge = edgeNear(ctx.project, e.raw, PICK_TOLERANCE_PX * ctx.pixelSize)
    this.update(ctx)
  }

  onPointerDown(e: ToolPointerEvent, ctx: ToolContext) {
    if (e.button !== 0) return
    this.mouse = e.point
    if (!this.edge) {
      this.edge = edgeNear(ctx.project, e.raw, PICK_TOLERANCE_PX * ctx.pixelSize)
      this.typed = {}
      return this.update(ctx)
    }
    this.commit(ctx)
  }

  onInput(values: InputValues, commit: boolean, ctx: ToolContext) {
    this.typed = values
    if (commit && this.edge) this.commit(ctx)
    else this.update(ctx)
  }

  cancel(ctx: ToolContext) {
    const busy = this.edge !== null
    this.edge = null
    this.typed = {}
    this.update(ctx)
    return busy
  }

  private commit(ctx: ToolContext) {
    const l = this.line()
    const target = ctx.target()
    if (l && target && Math.abs(l.length) > 0) {
      ctx.dispatch(
        addEntities(
          target.pieceId,
          [
            {
              ...entityBase(ctx, target.layerId),
              type: 'path',
              segments: [{ p: l.foot }, { p: l.end }],
              closed: false,
            },
          ],
          'history.addLine',
        ),
      )
    }
    this.typed = {}
    this.update(ctx)
  }

  private update(ctx: ToolContext) {
    const preview: PreviewShape[] = []
    const shown = this.edge ?? this.hoverEdge
    if (shown)
      preview.push({ kind: 'path', segments: [{ p: shown.a }, { p: shown.b }], closed: false, dashed: !this.edge })
    const l = this.line()
    if (l) {
      preview.push({ kind: 'path', segments: [{ p: l.foot }, { p: l.end }], closed: false })
      // Extension of the edge when the foot lies beyond it.
      if (this.edge)
        preview.push({ kind: 'path', segments: [{ p: this.edge.a }, { p: l.foot }], closed: false, dashed: true })
    }
    ctx.setPreview(preview)
    if (!this.edge) return ctx.setPrompt('perpendicular.promptEdge', [])
    ctx.setPrompt('perpendicular.promptPlace', [
      { key: 'along', kind: 'length', labelKey: 'perpendicular.along', live: l?.along },
      { key: 'length', kind: 'length', labelKey: 'perpendicular.length', live: l ? Math.abs(l.length) : undefined },
    ])
  }
}
