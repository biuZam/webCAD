// M7 Scale (uniform): base point, then a typed factor, or a reference point and its new position
// (factor = new distance / reference distance from the base).

import { scaleAbout, type Affine } from '../geometry/transform'
import { distance, type Vec2 } from '../lib/vec2'
import { pointFields, typedPoint } from './common'
import { TransformTool } from './transform-base'
import type { InputValues, PreviewShape } from './types'

export class ScaleTool extends TransformTool {
  readonly id = 'scale'
  protected readonly labelKey = 'history.scale'
  private base: Vec2 | null = null
  private ref: Vec2 | null = null

  constructor() {
    super(false)
  }

  override snapFrom() {
    return this.base
  }

  protected resetSteps() {
    this.base = null
    this.ref = null
  }

  protected busy() {
    return this.base !== null
  }

  private factor(values: InputValues): number | null {
    if (values.factor !== undefined) return values.factor > 0 ? values.factor : null
    if (!this.base || !this.ref || !this.mouse) return null
    const d = distance(this.base, this.ref)
    return d > 0 ? distance(this.base, this.mouse) / d : null
  }

  protected click(p: Vec2): Affine | null {
    if (!this.base) {
      this.base = p
      return null
    }
    if (!this.ref) {
      if (distance(this.base, p) > 0) this.ref = p
      return null
    }
    return this.current()
  }

  protected enter(values: InputValues): Affine | null {
    if (!this.base) {
      this.base = typedPoint(values, this.mouse)
      return null
    }
    const f = this.factor(values)
    return f === null ? null : scaleAbout(this.base, f)
  }

  protected current() {
    const f = this.factor(this.typed)
    return this.base && f !== null && f > 0 ? scaleAbout(this.base, f) : null
  }

  protected guides(): PreviewShape[] {
    if (!this.base) return []
    const out: PreviewShape[] = []
    if (this.ref) out.push({ kind: 'path', segments: [{ p: this.base }, { p: this.ref }], closed: false, dashed: true })
    if (this.mouse) out.push({ kind: 'path', segments: [{ p: this.base }, { p: this.mouse }], closed: false })
    return out
  }

  protected step() {
    if (!this.base) return { prompt: 'scale.promptBase' as const, fields: pointFields(this.mouse) }
    return {
      prompt: this.ref ? ('scale.promptTarget' as const) : ('scale.promptRef' as const),
      fields: [
        {
          key: 'factor',
          kind: 'factor' as const,
          labelKey: 'scale.factor' as const,
          live: this.factor({}) ?? undefined,
        },
      ],
    }
  }
}
