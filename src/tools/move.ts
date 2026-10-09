// M7 Move / copy: base point, then destination (click, or typed dx/dy). Shift locks the direction to 15°.

import { translation, type Affine } from '../geometry/transform'
import { constrainAngle, distance, type Vec2 } from '../lib/vec2'
import { ANGLE_STEP_DEG, pointFields, typedPoint } from './common'
import { TransformTool } from './transform-base'
import type { InputValues, PreviewShape, ToolPointerEvent } from './types'

export class MoveTool extends TransformTool {
  readonly id = 'move'
  protected readonly labelKey = 'history.move'
  private base: Vec2 | null = null

  constructor() {
    super(false)
  }

  override snapFrom() {
    return this.base
  }

  protected resetSteps() {
    this.base = null
  }

  protected busy() {
    return this.base !== null
  }

  protected override track(e: ToolPointerEvent): Vec2 {
    return e.shift && this.base ? constrainAngle(this.base, e.point, ANGLE_STEP_DEG) : e.point
  }

  protected click(p: Vec2): Affine | null {
    if (!this.base) {
      this.base = p
      return null
    }
    return translation(p[0] - this.base[0], p[1] - this.base[1])
  }

  protected enter(values: InputValues): Affine | null {
    if (!this.base) {
      this.base = typedPoint(values, this.mouse)
      return null
    }
    return this.delta(values)
  }

  /** Typed dx/dy, each falling back to the mouse. */
  private delta(values: InputValues): Affine | null {
    const base = this.base
    if (!base) return null
    const dx = values.dx ?? (this.mouse ? this.mouse[0] - base[0] : undefined)
    const dy = values.dy ?? (this.mouse ? this.mouse[1] - base[1] : undefined)
    return dx === undefined || dy === undefined ? null : translation(dx, dy)
  }

  protected current() {
    return this.delta(this.typed)
  }

  protected guides(): PreviewShape[] {
    const m = this.current()
    if (!this.base || !m) return []
    const to: Vec2 = [this.base[0] + m[4], this.base[1] + m[5]]
    return distance(this.base, to) > 0
      ? [{ kind: 'path', segments: [{ p: this.base }, { p: to }], closed: false, dashed: true }]
      : []
  }

  protected step() {
    if (!this.base) return { prompt: 'move.promptBase' as const, fields: pointFields(this.mouse) }
    const m = this.current()
    return {
      prompt: 'move.promptTarget' as const,
      fields: [
        { key: 'dx', kind: 'length' as const, labelKey: 'move.dx' as const, live: m?.[4] },
        { key: 'dy', kind: 'length' as const, labelKey: 'move.dy' as const, live: m?.[5] },
      ],
    }
  }
}
