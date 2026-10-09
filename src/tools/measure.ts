// T1.6 Measure: distance (with ΔX, ΔY and direction), an angle from three points, or the length of a shape.
// Read-only: results show in the input bar in the display unit; nothing is added to the drawing.

import type { Entity } from '../document/model'
import { pathLength } from '../geometry/kernel'
import { entityShape } from '../geometry/query'
import { angleOf, distance, type Vec2 } from '../lib/vec2'
import { hitTest, PICK_TOLERANCE_PX } from './select'
import type { InputField, InputValues, PreviewShape, Tool, ToolContext, ToolPointerEvent } from './types'

type Mode = 'distance' | 'angle' | 'length'
const MODES: readonly Mode[] = ['distance', 'angle', 'length']

/** Length of an entity's outline: path length, circumference, centre-line length. Null for holes and text. */
export function entityLength(e: Entity): number | null {
  switch (e.type) {
    case 'path':
      return pathLength(e)
    case 'circle':
      return e.rx === e.ry ? 2 * Math.PI * e.rx : (entityShape(e) as paper.Path).length
    case 'centreLine':
      return distance(e.from, e.to)
    default:
      return null
  }
}

/** The angle at `vertex` between the rays to `a` and `b`, in degrees [0, 180]. */
export function angleBetween(a: Vec2, vertex: Vec2, b: Vec2): number {
  const d = Math.abs(angleOf(vertex, a) - angleOf(vertex, b))
  return d > 180 ? 360 - d : d
}

export class MeasureTool implements Tool {
  readonly id = 'measure'
  readonly cursor = 'crosshair'
  private mode: Mode = 'distance'
  private points: Vec2[] = []
  private mouse: Vec2 | null = null
  private hover: Entity | null = null

  get snaps() {
    return this.mode !== 'length'
  }

  activate(ctx: ToolContext) {
    this.points = []
    this.update(ctx)
  }

  snapFrom() {
    return this.points.at(-1) ?? null
  }

  private needed() {
    return this.mode === 'distance' ? 2 : 3
  }

  onPointerMove(e: ToolPointerEvent, ctx: ToolContext) {
    this.mouse = e.point
    this.hover = this.mode === 'length' ? hitTest(ctx.project, e.raw, PICK_TOLERANCE_PX * ctx.pixelSize) : null
    this.update(ctx)
  }

  onPointerDown(e: ToolPointerEvent, ctx: ToolContext) {
    if (e.button !== 0 || this.mode === 'length') return
    // A finished measurement stays on screen until the next click starts a new one.
    if (this.points.length >= this.needed()) this.points = []
    this.points.push(e.point)
    this.update(ctx)
  }

  onInput(values: InputValues, _commit: boolean, ctx: ToolContext) {
    if (values.mode !== undefined) {
      this.mode = MODES[values.mode] ?? this.mode
      this.points = []
    }
    this.update(ctx)
  }

  cancel(ctx: ToolContext) {
    const busy = this.points.length > 0
    this.points = []
    this.update(ctx)
    return busy
  }

  private update(ctx: ToolContext) {
    const done = this.points.length >= this.needed()
    const pts = done || !this.mouse || this.mode === 'length' ? this.points : [...this.points, this.mouse]
    const preview: PreviewShape[] = []
    if (pts.length >= 2) preview.push({ kind: 'path', segments: pts.map((p) => ({ p })), closed: false, dashed: true })
    for (const p of this.points) preview.push({ kind: 'snap', at: p, snapKind: 'endpoint' })
    if (this.hover) preview.push({ kind: 'entity', entity: this.hover })
    ctx.setPreview(preview)

    const fields: InputField[] = [
      {
        key: 'mode',
        kind: 'choice',
        labelKey: 'measure.mode',
        options: ['measure.distance', 'measure.angle', 'measure.length'],
        live: MODES.indexOf(this.mode),
      },
    ]
    const readout = (
      key: string,
      kind: 'length' | 'angle',
      labelKey: InputField['labelKey'],
      live: number | undefined,
    ) => fields.push({ key, kind, labelKey, live, readOnly: true })
    if (this.mode === 'distance') {
      const [a, b] = pts
      readout('d', 'length', 'measure.distance', a && b ? distance(a, b) : undefined)
      readout('dx', 'length', 'move.dx', a && b ? b[0] - a[0] : undefined)
      readout('dy', 'length', 'move.dy', a && b ? b[1] - a[1] : undefined)
      readout('dir', 'angle', 'line.angle', a && b ? angleOf(a, b) : undefined)
    } else if (this.mode === 'angle') {
      const [a, v, b] = pts
      readout('angle', 'angle', 'measure.angle', a && v && b ? angleBetween(a, v, b) : undefined)
    } else {
      readout('length', 'length', 'measure.length', this.hover ? (entityLength(this.hover) ?? undefined) : undefined)
    }
    const prompt =
      this.mode === 'length'
        ? 'measure.promptLength'
        : this.mode === 'angle'
          ? 'measure.promptAngle'
          : 'measure.promptDistance'
    ctx.setPrompt(prompt, fields)
  }
}
