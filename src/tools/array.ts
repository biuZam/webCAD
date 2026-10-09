// M10 Array: repeat the selection.
//   Linear: base point, then the offset to the next copy (click, or typed ΔX/ΔY); `count` copies in all,
//           the original included. Shift locks the direction to 15°.
//   Circular: centre, then Enter or a click; `count` copies spread over `angle` degrees (360 = a full turn,
//           evenly spaced; less = first to last copy span the angle).
// One undo step; the originals and every copy stay selected.

import { rotationAbout, translation, type Affine } from '../geometry/transform'
import { constrainAngle, type Vec2 } from '../lib/vec2'
import { ANGLE_STEP_DEG, pointFields, typedPoint } from './common'
import { TransformTool, type Transforms } from './transform-base'
import type { InputField, InputValues, PreviewShape, ToolContext, ToolPointerEvent } from './types'

type Mode = 'linear' | 'circular'

/** Matrices for copies 1…count−1 of a linear array with step (dx, dy). */
export function linearArray(dx: number, dy: number, count: number): Affine[] {
  return Array.from({ length: Math.max(0, count - 1) }, (_, i) => translation(dx * (i + 1), dy * (i + 1)))
}

/** Matrices for copies 1…count−1 of a circular array about `centre` over `sweep` degrees (counter-clockwise). */
export function circularArray(centre: Vec2, count: number, sweep: number): Affine[] {
  if (count < 2) return []
  const full = Math.abs(Math.abs(sweep) - 360) < 1e-9
  const step = full ? sweep / count : sweep / (count - 1)
  return Array.from({ length: count - 1 }, (_, i) => rotationAbout(centre, step * (i + 1)))
}

export class ArrayTool extends TransformTool {
  readonly id = 'array'
  protected readonly labelKey = 'history.array'
  protected override readonly copyToggle = false
  private mode: Mode = 'linear'
  private base: Vec2 | null = null
  /** Sticky between arrays. */
  private count = 3
  private sweep = 360

  constructor() {
    super(true)
  }

  override snapFrom() {
    return this.mode === 'linear' ? this.base : null
  }

  protected resetSteps() {
    this.base = null
  }

  protected busy() {
    return this.base !== null
  }

  protected override track(e: ToolPointerEvent): Vec2 {
    return e.shift && this.base && this.mode === 'linear' ? constrainAngle(this.base, e.point, ANGLE_STEP_DEG) : e.point
  }

  /** Sticky settings from typed values; returns the rest. */
  private settings(values: InputValues): InputValues {
    const { mode, count, sweep, ...rest } = values
    if (mode !== undefined) {
      this.mode = mode === 1 ? 'circular' : 'linear'
      this.base = null
    }
    if (count !== undefined && count >= 2) this.count = Math.round(count)
    if (sweep !== undefined && sweep !== 0) this.sweep = Math.max(-360, Math.min(360, sweep))
    return rest
  }

  override onInput(values: InputValues, commit: boolean, ctx: ToolContext) {
    const rest = this.settings(values)
    // Enter after typing only a count or angle just applies it; it doesn't place the base point.
    super.onInput(rest, commit && Object.keys(rest).length > 0, ctx)
  }

  /** Enter with nothing typed: make the circular array (linear arrays need their step clicked or typed). */
  override finish(ctx: ToolContext) {
    if (!this.picking && this.base && this.mode === 'circular') this.commit(this.current(), ctx)
    else super.finish(ctx)
  }

  protected click(p: Vec2): Transforms | null {
    if (!this.base) {
      this.base = p
      return null
    }
    return this.mode === 'circular' ? this.current() : this.linear(this.typed, p)
  }

  protected enter(values: InputValues): Transforms | null {
    if (!this.base) {
      this.base = typedPoint(values, this.mouse)
      return null
    }
    return this.mode === 'circular' ? circularArray(this.base, this.count, this.sweep) : this.linear(values, this.mouse)
  }

  /** Linear step from typed ΔX/ΔY, each falling back to the pointer. */
  private linear(values: InputValues, pointer: Vec2 | null): Affine[] | null {
    const base = this.base
    if (!base) return null
    const dx = values.dx ?? (pointer ? pointer[0] - base[0] : undefined)
    const dy = values.dy ?? (pointer ? pointer[1] - base[1] : undefined)
    if (dx === undefined || dy === undefined || (dx === 0 && dy === 0)) return null
    return linearArray(dx, dy, this.count)
  }

  protected current(): Transforms | null {
    if (!this.base) return null
    return this.mode === 'circular'
      ? circularArray(this.base, this.count, this.sweep)
      : this.linear(this.typed, this.mouse)
  }

  protected guides(): PreviewShape[] {
    if (!this.base || this.mode !== 'linear') return []
    const t = this.linear(this.typed, this.mouse)
    const step = t?.[0]
    return step
      ? [
          {
            kind: 'path',
            segments: [{ p: this.base }, { p: [this.base[0] + step[4], this.base[1] + step[5]] }],
            closed: false,
            dashed: true,
          },
        ]
      : []
  }

  protected step() {
    const fields: InputField[] = [
      {
        key: 'mode',
        kind: 'choice',
        labelKey: 'array.mode',
        options: ['array.linear', 'array.circular'],
        live: this.mode === 'circular' ? 1 : 0,
      },
      { key: 'count', kind: 'count', labelKey: 'array.count', live: this.count },
    ]
    if (this.mode === 'circular') {
      fields.push({ key: 'sweep', kind: 'angle', labelKey: 'array.sweep', live: this.sweep })
      if (!this.base) return { prompt: 'array.promptCentre' as const, fields: [...fields, ...pointFields(this.mouse)] }
      return { prompt: 'array.promptCircular' as const, fields }
    }
    if (!this.base) return { prompt: 'array.promptBase' as const, fields: [...fields, ...pointFields(this.mouse)] }
    const step = this.linear(this.typed, this.mouse)?.[0]
    return {
      prompt: 'array.promptStep' as const,
      fields: [
        ...fields,
        { key: 'dx', kind: 'length' as const, labelKey: 'move.dx' as const, live: step?.[4] },
        { key: 'dy', kind: 'length' as const, labelKey: 'move.dy' as const, live: step?.[5] },
      ],
    }
  }
}
