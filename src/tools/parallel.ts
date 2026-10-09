// D9 Parallel line: pick a straight edge, then click on the side and at the distance wanted, or type the
// distance (the cursor picks the side). The new line is as long as the edge. Stays on the same edge for more
// lines; Esc picks another edge.

import { addEntities } from '../document/commands'
import { add, distance, scale, sub, type Vec2 } from '../lib/vec2'
import { entityBase } from './common'
import { edgeNear, type Edge } from './edges'
import { PICK_TOLERANCE_PX } from './select'
import type { InputValues, PreviewShape, Tool, ToolContext, ToolPointerEvent } from './types'

/** The line parallel to `edge` at signed distance `d` (positive = left of a→b on screen, y-down). */
export function parallelTo(edge: Pick<Edge, 'a' | 'b'>, d: number): [Vec2, Vec2] | null {
  const len = distance(edge.a, edge.b)
  if (len === 0) return null
  const u = scale(sub(edge.b, edge.a), 1 / len)
  const offset = scale([-u[1], u[0]], d)
  return [add(edge.a, offset), add(edge.b, offset)]
}

export class ParallelTool implements Tool {
  readonly id = 'parallel'
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

  /** Signed distance from the edge: the typed one on the cursor's side, else the cursor's own. */
  private offset(): number | null {
    const e = this.edge
    if (!e || !this.mouse) return null
    const len = distance(e.a, e.b)
    if (len === 0) return null
    const u = scale(sub(e.b, e.a), 1 / len)
    const rel = sub(this.mouse, e.a)
    const side = -rel[0] * u[1] + rel[1] * u[0]
    return this.typed.distance !== undefined ? Math.abs(this.typed.distance) * (side < 0 ? -1 : 1) : side
  }

  private line(): [Vec2, Vec2] | null {
    const d = this.offset()
    return this.edge && d !== null && d !== 0 ? parallelTo(this.edge, d) : null
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
    if (l && target) {
      ctx.dispatch(
        addEntities(
          target.pieceId,
          [{ ...entityBase(ctx, target.layerId), type: 'path', segments: [{ p: l[0] }, { p: l[1] }], closed: false }],
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
    if (l) preview.push({ kind: 'path', segments: [{ p: l[0] }, { p: l[1] }], closed: false })
    ctx.setPreview(preview)
    if (!this.edge) return ctx.setPrompt('parallel.promptEdge', [])
    const d = this.offset()
    ctx.setPrompt('parallel.promptPlace', [
      { key: 'distance', kind: 'length', labelKey: 'parallel.distance', live: d === null ? undefined : Math.abs(d) },
    ])
  }
}
