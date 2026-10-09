// M4 Mirror: across a centre line (hover it and click), or across an axis through two points
// (or a point and a typed angle). Keeps the original by default — mirrored pieces usually need both sides.

import { mirrorAcross, type Affine } from '../geometry/transform'
import { angleOf, constrainAngle, distance, polar, type Vec2 } from '../lib/vec2'
import { ANGLE_STEP_DEG, pointFields, typedPoint } from './common'
import { hitTest, PICK_TOLERANCE_PX } from './select'
import { TransformTool } from './transform-base'
import type { InputValues, PreviewShape, ToolContext, ToolPointerEvent } from './types'

export class MirrorTool extends TransformTool {
  readonly id = 'mirror'
  protected readonly labelKey = 'history.mirror'
  private first: Vec2 | null = null
  /** A centre line under the cursor before the first point is placed: clicking mirrors across it. */
  private axisLine: [Vec2, Vec2] | null = null

  constructor() {
    super(true)
  }

  protected resetSteps() {
    this.first = null
    this.axisLine = null
  }

  protected busy() {
    return this.first !== null
  }

  protected override track(e: ToolPointerEvent, ctx: ToolContext): Vec2 {
    if (!this.first) {
      const hit = hitTest(ctx.project, e.raw, PICK_TOLERANCE_PX * ctx.pixelSize)
      this.axisLine = hit?.type === 'centreLine' && !ctx.selection.includes(hit.id) ? [hit.from, hit.to] : null
      return e.point
    }
    return e.shift ? constrainAngle(this.first, e.point, ANGLE_STEP_DEG) : e.point
  }

  private axis(values: InputValues): [Vec2, Vec2] | null {
    if (!this.first) return this.axisLine
    if (values.angle !== undefined) return [this.first, polar(this.first, 10, values.angle)]
    return this.mouse && distance(this.first, this.mouse) > 0 ? [this.first, this.mouse] : null
  }

  protected click(p: Vec2): Affine | null {
    if (!this.first) {
      if (this.axisLine) return mirrorAcross(...this.axisLine)
      this.first = p
      return null
    }
    return this.current()
  }

  protected enter(values: InputValues): Affine | null {
    if (!this.first) {
      this.first = typedPoint(values, this.mouse)
      this.axisLine = null
      return null
    }
    const axis = this.axis(values)
    return axis ? mirrorAcross(...axis) : null
  }

  protected current() {
    const axis = this.axis(this.typed)
    return axis ? mirrorAcross(...axis) : null
  }

  protected guides(): PreviewShape[] {
    const axis = this.axis(this.typed)
    if (!axis) return []
    // Draw the axis well past both points so it reads as a line, not a segment.
    const a = angleOf(axis[0], axis[1])
    const len = Math.max(distance(axis[0], axis[1]), 50)
    return [
      {
        kind: 'path',
        segments: [{ p: polar(axis[0], -len, a) }, { p: polar(axis[0], 2 * len, a) }],
        closed: false,
        dashed: true,
      },
    ]
  }

  protected step() {
    if (!this.first) return { prompt: 'mirror.promptFirst' as const, fields: pointFields(this.mouse) }
    const axis = this.axis({})
    return {
      prompt: 'mirror.promptSecond' as const,
      fields: [
        {
          key: 'angle',
          kind: 'angle' as const,
          labelKey: 'mirror.angle' as const,
          live: axis ? angleOf(axis[0], axis[1]) : undefined,
        },
      ],
    }
  }
}
