// M5 Rotate: centre, then angle (click: direction from the centre, measured from +x; or typed).
// Shift rounds the angle to 15°.

import { rotationAbout, type Affine } from '../geometry/transform'
import { angleOf, distance, polar, type Vec2 } from '../lib/vec2'
import { ANGLE_STEP_DEG, pointFields, typedPoint } from './common'
import { TransformTool } from './transform-base'
import type { InputValues, PreviewShape, ToolPointerEvent } from './types'

export class RotateTool extends TransformTool {
  readonly id = 'rotate'
  protected readonly labelKey = 'history.rotate'
  private centre: Vec2 | null = null
  private shift = false

  constructor() {
    super(false)
  }

  protected resetSteps() {
    this.centre = null
  }

  protected busy() {
    return this.centre !== null
  }

  protected override track(e: ToolPointerEvent): Vec2 {
    this.shift = e.shift
    return e.point
  }

  private angle(values: InputValues): number | null {
    if (values.angle !== undefined) return values.angle
    if (!this.centre || !this.mouse || distance(this.centre, this.mouse) === 0) return null
    const a = angleOf(this.centre, this.mouse)
    return this.shift ? Math.round(a / ANGLE_STEP_DEG) * ANGLE_STEP_DEG : a
  }

  protected click(p: Vec2): Affine | null {
    if (!this.centre) {
      this.centre = p
      return null
    }
    return this.current()
  }

  protected enter(values: InputValues): Affine | null {
    if (!this.centre) {
      this.centre = typedPoint(values, this.mouse)
      return null
    }
    const a = this.angle(values)
    return a === null ? null : rotationAbout(this.centre, a)
  }

  protected current() {
    const a = this.angle(this.typed)
    return this.centre && a !== null ? rotationAbout(this.centre, a) : null
  }

  protected guides(): PreviewShape[] {
    const a = this.angle(this.typed)
    if (!this.centre || a === null) return []
    const r = this.mouse ? Math.max(distance(this.centre, this.mouse), 1) : 20
    return [
      {
        kind: 'path',
        segments: [{ p: polar(this.centre, r, 0) }, { p: this.centre }, { p: polar(this.centre, r, a) }],
        closed: false,
        dashed: true,
      },
    ]
  }

  protected step() {
    if (!this.centre) return { prompt: 'rotate.promptCentre' as const, fields: pointFields(this.mouse) }
    return {
      prompt: 'rotate.promptAngle' as const,
      fields: [
        { key: 'angle', kind: 'angle' as const, labelKey: 'rotate.angle' as const, live: this.angle({}) ?? undefined },
      ],
    }
  }
}
