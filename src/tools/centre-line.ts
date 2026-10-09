// D6 Centre line: a dash-dot axis through a shape's bounding-box centre (vertical or horizontal), or between
// two points. Goes on the Reference layer. Mirror uses centre lines as axes.

import { addEntities } from '../document/commands'
import { newId } from '../document/factory'
import type { CentreLineEntity, Entity, Id } from '../document/model'
import { entityBounds } from '../geometry/bounds'
import { constrainAngle, distance, type Vec2 } from '../lib/vec2'
import { ANGLE_STEP_DEG, DEFAULT_STROKE_MM, pointFields } from './common'
import { hitTest, PICK_TOLERANCE_PX } from './select'
import type { InputField, InputValues, PreviewShape, Tool, ToolContext, ToolPointerEvent } from './types'

/** How far a shape's centre line extends past its bounds (mm). */
export const CENTRE_LINE_OVERSHOOT = 5

type Mode = 'shape' | 'points'
type Orientation = 'vertical' | 'horizontal'

/** The axis through `e`'s bounding-box centre, overshooting the bounds a little. */
export function centreAxis(e: Entity, orientation: Orientation): [Vec2, Vec2] {
  const b = entityBounds(e)
  const cx = (b.minX + b.maxX) / 2
  const cy = (b.minY + b.maxY) / 2
  const o = CENTRE_LINE_OVERSHOOT
  return orientation === 'vertical'
    ? [
        [cx, b.minY - o],
        [cx, b.maxY + o],
      ]
    : [
        [b.minX - o, cy],
        [b.maxX + o, cy],
      ]
}

export class CentreLineTool implements Tool {
  readonly id = 'centreLine'
  readonly cursor = 'crosshair'
  private mode: Mode = 'shape'
  private orientation: Orientation = 'vertical'
  private first: Vec2 | null = null
  private mouse: Vec2 | null = null
  private hover: Entity | null = null

  /** In shape mode the raw pointer picks shapes; in two-point mode points snap. */
  get snaps() {
    return this.mode === 'points'
  }

  activate(ctx: ToolContext) {
    this.first = null
    this.update(ctx)
  }

  snapFrom() {
    return this.first
  }

  onPointerMove(e: ToolPointerEvent, ctx: ToolContext) {
    this.mouse = this.first && e.shift ? constrainAngle(this.first, e.point, ANGLE_STEP_DEG) : e.point
    this.hover = this.mode === 'shape' ? hitTest(ctx.project, e.raw, PICK_TOLERANCE_PX * ctx.pixelSize) : null
    this.update(ctx)
  }

  onPointerDown(e: ToolPointerEvent, ctx: ToolContext) {
    if (e.button !== 0) return
    if (this.mode === 'shape') {
      const hit = hitTest(ctx.project, e.raw, PICK_TOLERANCE_PX * ctx.pixelSize)
      if (hit) this.commit(ctx, ...centreAxis(hit, this.orientation))
      return
    }
    const p = this.first && e.shift ? constrainAngle(this.first, e.point, ANGLE_STEP_DEG) : e.point
    if (!this.first) this.first = p
    else if (distance(this.first, p) > 0) this.commit(ctx, this.first, p)
    this.update(ctx)
  }

  onInput(values: InputValues, _commit: boolean, ctx: ToolContext) {
    if (values.mode !== undefined) {
      this.mode = values.mode === 1 ? 'points' : 'shape'
      this.first = null
    }
    if (values.orientation !== undefined) this.orientation = values.orientation === 1 ? 'horizontal' : 'vertical'
    this.update(ctx)
  }

  cancel(ctx: ToolContext) {
    const busy = this.first !== null
    this.first = null
    this.update(ctx)
    return busy
  }

  /** The Reference layer if it can be drawn on, else the active layer. */
  private layerId(ctx: ToolContext): Id | null {
    const ref = ctx.project.layers.find((l) => l.kind === 'reference')
    if (ref && ref.visible && !ref.locked) return ref.id
    return ctx.target()?.layerId ?? null
  }

  private commit(ctx: ToolContext, from: Vec2, to: Vec2) {
    const layerId = this.layerId(ctx)
    const pieceId = ctx.project.pieces[0]?.id
    if (!layerId || !pieceId) return ctx.setPrompt('common.layerUnavailable', [])
    const line: CentreLineEntity = {
      id: newId(),
      type: 'centreLine',
      layerId,
      lineStyle: 'dashDot',
      strokeWidth: DEFAULT_STROKE_MM,
      from,
      to,
    }
    ctx.dispatch(addEntities(pieceId, [line], 'history.addCentreLine'))
    this.first = null
  }

  private update(ctx: ToolContext) {
    const preview: PreviewShape[] = []
    if (this.mode === 'shape' && this.hover) {
      const [a, b] = centreAxis(this.hover, this.orientation)
      preview.push(
        { kind: 'entity', entity: this.hover },
        { kind: 'path', segments: [{ p: a }, { p: b }], closed: false, dashed: true },
      )
    }
    if (this.mode === 'points' && this.first && this.mouse) {
      preview.push({ kind: 'path', segments: [{ p: this.first }, { p: this.mouse }], closed: false, dashed: true })
    }
    ctx.setPreview(preview)
    const fields: InputField[] = [
      {
        key: 'mode',
        kind: 'choice',
        labelKey: 'centreLine.mode',
        options: ['centreLine.modeShape', 'centreLine.modePoints'],
        live: this.mode === 'points' ? 1 : 0,
      },
    ]
    if (this.mode === 'shape') {
      fields.push({
        key: 'orientation',
        kind: 'choice',
        labelKey: 'centreLine.orientation',
        options: ['centreLine.vertical', 'centreLine.horizontal'],
        live: this.orientation === 'horizontal' ? 1 : 0,
      })
      return ctx.setPrompt('centreLine.promptShape', fields)
    }
    ctx.setPrompt(this.first ? 'centreLine.promptSecond' : 'centreLine.promptFirst', [
      ...fields,
      ...(this.first ? [] : pointFields(this.mouse)),
    ])
  }
}
