// D5 Circle / ellipse, in three modes (choice field):
//   centre + radius  → click (or type) the centre, then a point on the circle or a typed radius
//   3 points         → three points on the circle
//   ellipse          → centre, end of the first axis (sets its radius and direction), then the other radius:
//                      a click's distance from that axis, or typed

import { addEntities } from '../document/commands'
import type { CircleEntity } from '../document/model'
import { circleThrough } from '../geometry/arcs'
import { distance, type Vec2 } from '../lib/vec2'
import { entityBase, pointFields, typedPoint } from './common'
import type { I18nKey, InputField, InputValues, PreviewShape, Tool, ToolContext, ToolPointerEvent } from './types'

type Mode = 'centre' | 'threePoints' | 'ellipse'
const MODES: readonly Mode[] = ['centre', 'threePoints', 'ellipse']

/** Distance from p to the infinite line through c in the direction of a − c. */
function distanceToAxis(c: Vec2, a: Vec2, p: Vec2): number {
  const ax = a[0] - c[0]
  const ay = a[1] - c[1]
  const len = Math.hypot(ax, ay)
  return len === 0 ? 0 : Math.abs(ax * (p[1] - c[1]) - ay * (p[0] - c[0])) / len
}

export class CircleTool implements Tool {
  readonly id = 'circle'
  readonly cursor = 'crosshair'
  readonly draws = true
  private mode: Mode = 'centre'
  private points: Vec2[] = []
  private mouse: Vec2 | null = null
  private typed: InputValues = {}

  activate(ctx: ToolContext) {
    this.reset(ctx)
  }

  snapFrom() {
    return this.points[0] ?? null
  }

  onPointerMove(e: ToolPointerEvent, ctx: ToolContext) {
    this.mouse = e.point
    this.update(ctx)
  }

  onPointerDown(e: ToolPointerEvent, ctx: ToolContext) {
    if (e.button !== 0) return
    this.mouse = e.point
    this.advance(ctx, e.point)
  }

  onInput(values: InputValues, commit: boolean, ctx: ToolContext) {
    if (values.mode !== undefined) {
      this.mode = MODES[values.mode] ?? this.mode
      return this.reset(ctx)
    }
    this.typed = values
    if (!commit) return this.update(ctx)
    // Enter: a typed point on the first step. Later steps use the typed radius, so the mouse isn't needed:
    // fall back to the last placed point when the pointer hasn't moved over the canvas yet.
    const p = this.points.length === 0 ? typedPoint(values, this.mouse) : (this.mouse ?? this.points.at(-1)!)
    if (p) this.advance(ctx, p)
  }

  undoStep(ctx: ToolContext) {
    this.points.pop()
    this.update(ctx)
  }

  cancel(ctx: ToolContext) {
    const busy = this.points.length > 0
    this.reset(ctx)
    return busy
  }

  /** The circle or ellipse implied by the points so far plus `p` (or typed values); null if not enough yet. */
  private shape(p: Vec2 | null): Omit<CircleEntity, 'id' | 'layerId' | 'lineStyle' | 'strokeWidth' | 'type'> | null {
    const [a, b] = this.points
    if (this.mode === 'centre') {
      if (!a) return null
      const r = this.typed.radius !== undefined ? Math.abs(this.typed.radius) : p ? distance(a, p) : 0
      return r > 0 ? { center: a, rx: r, ry: r, rotation: 0 } : null
    }
    if (this.mode === 'threePoints') {
      if (!a || !b || !p) return null
      const c = circleThrough(a, b, p)
      return c ? { center: c.centre, rx: c.radius, ry: c.radius, rotation: 0 } : null
    }
    // Ellipse: centre a, first-axis end b, then the other radius.
    if (!a) return null
    if (!b) {
      if (!p) return null
      const rx = distance(a, p)
      // Until the first axis is placed this is just a circle: rotation doesn't matter yet.
      return rx > 0 ? { center: a, rx, ry: rx, rotation: 0 } : null
    }
    const rx = distance(a, b)
    const ry = this.typed.radius !== undefined ? Math.abs(this.typed.radius) : p ? distanceToAxis(a, b, p) : 0
    // Model rotation is clockwise in y-down space: the direction of b − a as atan2 gives it directly.
    const rotation = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI
    return rx > 0 && ry > 0 ? { center: a, rx, ry, rotation } : null
  }

  private needed() {
    return this.mode === 'centre' ? 1 : 2
  }

  private advance(ctx: ToolContext, p: Vec2) {
    if (this.points.length < this.needed()) {
      // Ellipse: the axis end must differ from the centre.
      if (!(this.mode === 'ellipse' && this.points.length === 1 && distance(this.points[0], p) === 0))
        this.points.push(p)
      this.typed = {}
      return this.update(ctx)
    }
    const shape = this.shape(p)
    const target = ctx.target()
    if (!shape) return ctx.setPrompt(this.mode === 'threePoints' ? 'arc.collinear' : this.prompt(), this.fields(null))
    if (target) {
      const circle: CircleEntity = { ...entityBase(ctx, target.layerId), type: 'circle', ...shape }
      ctx.dispatch(
        addEntities(target.pieceId, [circle], this.mode === 'ellipse' ? 'history.addEllipse' : 'history.addCircle'),
      )
    }
    this.reset(ctx)
  }

  private reset(ctx: ToolContext) {
    this.points = []
    this.typed = {}
    this.update(ctx)
  }

  private prompt(): I18nKey {
    const n = this.points.length
    if (this.mode === 'centre') return n === 0 ? 'circle.promptCentre' : 'circle.promptRadius'
    if (this.mode === 'threePoints')
      return n === 0 ? 'circle.promptP1' : n === 1 ? 'circle.promptP2' : 'circle.promptP3'
    return n === 0 ? 'circle.promptCentre' : n === 1 ? 'circle.promptAxis' : 'circle.promptOther'
  }

  private fields(shape: ReturnType<CircleTool['shape']>): InputField[] {
    const fields: InputField[] = [
      {
        key: 'mode',
        kind: 'choice',
        labelKey: 'circle.mode',
        options: ['circle.modeCentre', 'circle.modeThree', 'circle.modeEllipse'],
        live: MODES.indexOf(this.mode),
      },
    ]
    if (this.points.length === 0) return [...fields, ...pointFields(this.mouse)]
    if (this.mode === 'centre')
      fields.push({ key: 'radius', kind: 'length', labelKey: 'circle.radius', live: shape?.rx })
    if (this.mode === 'ellipse' && this.points.length === 2)
      fields.push({ key: 'radius', kind: 'length', labelKey: 'circle.radius2', live: shape?.ry })
    return fields
  }

  private update(ctx: ToolContext) {
    const shape = this.shape(this.mouse)
    const preview: PreviewShape[] = []
    if (shape) {
      const temp: CircleEntity = { id: '', layerId: '', lineStyle: 'solid', strokeWidth: 0, type: 'circle', ...shape }
      preview.push({ kind: 'entity', entity: temp })
    }
    if (this.mode === 'ellipse' && this.points[1])
      preview.push({
        kind: 'path',
        segments: [{ p: this.points[0] }, { p: this.points[1] }],
        closed: false,
        dashed: true,
      })
    for (const p of this.points.slice(this.mode === 'centre' ? 1 : 0))
      preview.push({ kind: 'snap', at: p, snapKind: 'endpoint' })
    ctx.setPreview(preview)
    ctx.setPrompt(this.prompt(), this.fields(shape))
  }
}
