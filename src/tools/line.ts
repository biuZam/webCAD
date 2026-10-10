// D1 Line / polyline: click point to point; type length + angle; click the first point to close.
// Two modes, as in AutoCAD: Line (LINE) makes every segment its own entity, so each can be selected and edited
// alone; Polyline (PLINE) makes one path. Either way the run is one undo step, committed when finished or closed.
// Join (Shift+J) turns segments into a polyline; Explode (Shift+X) the reverse.

import { addEntities } from '../document/commands'
import { angleOf, constrainAngle, distance, polar, type Vec2 } from '../lib/vec2'
import { ANGLE_STEP_DEG, CLOSE_TOLERANCE_PX, entityBase, pointFields, typedPoint } from './common'
import type { PathEntity } from '../document/model'
import type { InputField, InputValues, PreviewShape, Tool, ToolContext, ToolPointerEvent } from './types'

export class LineTool implements Tool {
  readonly id = 'line'
  readonly cursor = 'crosshair'
  readonly draws = true
  private points: Vec2[] = []
  /** Where the rubber band currently ends (mouse, constrained, or typed). */
  private next: Vec2 | null = null
  private mouse: Vec2 | null = null
  private typed: InputValues = {}
  private polyline = false

  activate(ctx: ToolContext) {
    this.reset(ctx)
  }

  snapFrom() {
    return this.points.at(-1) ?? null
  }

  onPointerMove(e: ToolPointerEvent, ctx: ToolContext) {
    this.mouse = this.constrain(e)
    this.update(ctx)
  }

  onPointerDown(e: ToolPointerEvent, ctx: ToolContext) {
    if (e.button === 2) return this.finish(ctx)
    if (e.button !== 0) return
    this.mouse = this.constrain(e)
    const p = this.resolve()
    if (!p) return
    const tolerance = CLOSE_TOLERANCE_PX * ctx.pixelSize
    if (this.points.length >= 2 && distance(p, this.points[0]) <= tolerance) return this.commit(ctx, true)
    // Clicking the last point again (the second click of a double-click) finishes the polyline.
    const last = this.points.at(-1)
    if (last && distance(p, last) <= tolerance) return this.finish(ctx)
    this.addPoint(p, ctx)
  }

  onInput(values: InputValues, commit: boolean, ctx: ToolContext) {
    const { mode, ...rest } = values
    if (mode !== undefined) this.polyline = mode === 1
    values = rest
    this.typed = values
    if (commit) {
      const p = this.resolve()
      if (p) this.addPoint(p, ctx)
    } else {
      this.update(ctx)
    }
  }

  finish(ctx: ToolContext) {
    if (this.points.length >= 2) this.commit(ctx, false)
    else this.reset(ctx)
  }

  undoStep(ctx: ToolContext) {
    this.points.pop()
    this.update(ctx)
  }

  cancel(ctx: ToolContext) {
    const busy = this.points.length > 0
    // Esc keeps what was drawn, like ending a polyline in other CAD tools.
    this.finish(ctx)
    return busy
  }

  private constrain(e: ToolPointerEvent): Vec2 {
    const last = this.points.at(-1)
    return e.shift && last ? constrainAngle(last, e.point, ANGLE_STEP_DEG) : e.point
  }

  /** The next point from typed values, falling back to the mouse for anything not typed. */
  private resolve(): Vec2 | null {
    const last = this.points.at(-1)
    if (!last) return typedPoint(this.typed, this.mouse)
    if (this.typed.length === undefined && this.typed.angle === undefined) return this.mouse
    const length = this.typed.length ?? (this.mouse ? distance(last, this.mouse) : 0)
    const angle = this.typed.angle ?? (this.mouse ? angleOf(last, this.mouse) : 0)
    return polar(last, length, angle)
  }

  private addPoint(p: Vec2, ctx: ToolContext) {
    this.points.push(p)
    this.typed = {}
    this.update(ctx)
  }

  private commit(ctx: ToolContext, closed: boolean) {
    const target = ctx.target()
    if (target && this.points.length >= 2) {
      const pts = this.points
      const path = (segments: PathEntity['segments'], isClosed: boolean): PathEntity => ({
        ...entityBase(ctx, target.layerId),
        type: 'path',
        segments,
        closed: isClosed,
      })
      const entities = this.polyline
        ? [
            path(
              pts.map((p) => ({ p })),
              closed,
            ),
          ]
        : // One entity per segment; closing adds the segment back to the first point.
          [...pts.slice(1).map((p, i) => [pts[i], p]), ...(closed ? [[pts[pts.length - 1], pts[0]]] : [])].map(
            ([a, b]) => path([{ p: a }, { p: b }], false),
          )
      ctx.dispatch(addEntities(target.pieceId, entities, 'history.addLine'))
    }
    this.reset(ctx)
  }

  private reset(ctx: ToolContext) {
    this.points = []
    this.typed = {}
    this.update(ctx)
  }

  private update(ctx: ToolContext) {
    this.next = this.resolve()
    const last = this.points.at(-1)
    const preview: PreviewShape[] = []
    const pts = this.next && last ? [...this.points, this.next] : this.points
    if (pts.length >= 2) preview.push({ kind: 'path', segments: pts.map((p) => ({ p })), closed: false })
    ctx.setPreview(preview)

    const modeField: InputField = {
      key: 'mode',
      kind: 'choice',
      labelKey: 'line.mode',
      options: ['line.modeSegments', 'line.modePolyline'],
      live: this.polyline ? 1 : 0,
    }
    if (!last) {
      ctx.setPrompt('line.promptFirst', [modeField, ...pointFields(this.mouse)])
      return
    }
    const fields: InputField[] = [
      modeField,
      {
        key: 'length',
        kind: 'length',
        labelKey: 'line.length',
        live: this.next ? distance(last, this.next) : undefined,
      },
      { key: 'angle', kind: 'angle', labelKey: 'line.angle', live: this.next ? angleOf(last, this.next) : undefined },
    ]
    ctx.setPrompt(this.points.length >= 2 ? 'line.promptMore' : 'line.promptNext', fields)
  }
}
