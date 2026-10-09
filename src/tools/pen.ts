// D3 Pen: click for a corner anchor, drag for a smooth anchor (symmetric handles), click the first anchor to
// close; Enter / double-click / Esc finish an open path; Backspace removes the last anchor. Typed length +
// angle add a corner anchor, like the line tool. The whole path is one entity and one undo step.

import { addEntities } from '../document/commands'
import type { Segment } from '../document/model'
import { angleOf, constrainAngle, distance, polar, sub, type Vec2 } from '../lib/vec2'
import { ANGLE_STEP_DEG, CLOSE_TOLERANCE_PX, entityBase, pointFields, typedPoint } from './common'
import type { InputField, InputValues, PreviewShape, Tool, ToolContext, ToolPointerEvent } from './types'

/** A press that moves further than this (CSS px) becomes a handle drag. */
const DRAG_PX = 3

export class PenTool implements Tool {
  readonly id = 'pen'
  readonly cursor = 'crosshair'
  readonly draws = true
  private segs: Segment[] = []
  private mouse: Vec2 | null = null
  private typed: InputValues = {}
  /** The anchor being placed while the button is down: dragging pulls out its handles. */
  private press: { index: number; at: Vec2; dragging: boolean } | null = null

  activate(ctx: ToolContext) {
    this.reset(ctx)
  }

  snapFrom() {
    return this.segs.at(-1)?.p ?? null
  }

  onPointerDown(e: ToolPointerEvent, ctx: ToolContext) {
    if (e.button === 2) return this.finish(ctx)
    if (e.button !== 0) return
    const p = this.constrain(e)
    const tolerance = CLOSE_TOLERANCE_PX * ctx.pixelSize
    const first = this.segs[0]
    const last = this.segs.at(-1)
    if (this.segs.length >= 2 && first && distance(p, first.p) <= tolerance) return this.commit(ctx, true)
    if (last && distance(p, last.p) <= tolerance) return this.finish(ctx) // second click of a double-click
    this.segs.push({ p })
    this.typed = {}
    this.press = { index: this.segs.length - 1, at: e.raw, dragging: false }
    this.update(ctx)
  }

  onPointerMove(e: ToolPointerEvent, ctx: ToolContext) {
    const press = this.press
    if (press) {
      if (!press.dragging && distance(press.at, e.raw) / ctx.pixelSize >= DRAG_PX) press.dragging = true
      if (press.dragging) {
        // Handles follow the raw pointer: snapping them to the grid would quantise the curve's shape.
        const seg = this.segs[press.index]
        const ho = sub(e.raw, seg.p)
        this.segs[press.index] = { p: seg.p, hi: [-ho[0], -ho[1]], ho }
      }
    } else {
      this.mouse = this.constrain(e)
    }
    this.update(ctx)
  }

  onPointerUp() {
    this.press = null
  }

  onInput(values: InputValues, commit: boolean, ctx: ToolContext) {
    this.typed = values
    if (commit) {
      const p = this.resolve()
      if (p) {
        this.segs.push({ p })
        this.typed = {}
      }
    }
    this.update(ctx)
  }

  finish(ctx: ToolContext) {
    if (this.segs.length >= 2) this.commit(ctx, false)
    else this.reset(ctx)
  }

  undoStep(ctx: ToolContext) {
    this.segs.pop()
    this.press = null
    this.update(ctx)
  }

  cancel(ctx: ToolContext) {
    const busy = this.segs.length > 0
    this.finish(ctx)
    return busy
  }

  private constrain(e: ToolPointerEvent): Vec2 {
    const last = this.segs.at(-1)
    return e.shift && last ? constrainAngle(last.p, e.point, ANGLE_STEP_DEG) : e.point
  }

  private resolve(): Vec2 | null {
    const last = this.segs.at(-1)?.p
    if (!last) return typedPoint(this.typed, this.mouse)
    if (this.typed.length === undefined && this.typed.angle === undefined) return this.mouse
    const length = this.typed.length ?? (this.mouse ? distance(last, this.mouse) : 0)
    const angle = this.typed.angle ?? (this.mouse ? angleOf(last, this.mouse) : 0)
    return polar(last, length, angle)
  }

  private commit(ctx: ToolContext, closed: boolean) {
    const target = ctx.target()
    if (target && this.segs.length >= 2) {
      ctx.dispatch(
        addEntities(
          target.pieceId,
          [{ ...entityBase(ctx, target.layerId), type: 'path', segments: this.segs, closed }],
          'history.addPath',
        ),
      )
    }
    this.reset(ctx)
  }

  private reset(ctx: ToolContext) {
    this.segs = []
    this.typed = {}
    this.press = null
    this.update(ctx)
  }

  private update(ctx: ToolContext) {
    const preview: PreviewShape[] = []
    const last = this.segs.at(-1)
    const next = this.press ? null : this.resolve()
    const segs = next && last ? [...this.segs, { p: next }] : this.segs
    if (segs.length >= 2) preview.push({ kind: 'path', segments: segs, closed: false })
    // Show the handles of the anchor being dragged.
    const dragged = this.press?.dragging ? this.segs[this.press.index] : null
    if (dragged?.hi && dragged.ho) {
      preview.push({
        kind: 'path',
        segments: [
          { p: [dragged.p[0] + dragged.hi[0], dragged.p[1] + dragged.hi[1]] },
          { p: [dragged.p[0] + dragged.ho[0], dragged.p[1] + dragged.ho[1]] },
        ],
        closed: false,
        dashed: true,
      })
    }
    ctx.setPreview(preview)
    if (!last) return ctx.setPrompt('pen.promptFirst', pointFields(this.mouse))
    const fields: InputField[] = [
      { key: 'length', kind: 'length', labelKey: 'line.length', live: next ? distance(last.p, next) : undefined },
      { key: 'angle', kind: 'angle', labelKey: 'line.angle', live: next ? angleOf(last.p, next) : undefined },
    ]
    ctx.setPrompt(this.segs.length >= 2 ? 'pen.promptMore' : 'pen.promptNext', fields)
  }
}
