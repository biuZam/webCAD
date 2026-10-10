// T1.6 Measure: distance (with ΔX, ΔY and direction), an angle from three points, or the length of a shape.
// L4 Hole count: click an edge of a hole set, then the edge it is sewn to; the counts are compared.
// Read-only: results show in the input bar in the display unit; nothing is added to the drawing.

import { holeEdges } from '../document/derived'
import type { Entity, HoleSetEntity, Project } from '../document/model'
import { angleBetween, entityLength } from '../geometry/measure'
import { entitiesNear } from '../geometry/query'
import { angleOf, distance, type Vec2 } from '../lib/vec2'
import { toSegment } from './edges'
import { hitTest, PICK_TOLERANCE_PX } from './select'
import type { InputField, InputValues, PreviewShape, Tool, ToolContext, ToolPointerEvent } from './types'

type Mode = 'distance' | 'angle' | 'length' | 'holes'
const MODES: readonly Mode[] = ['distance', 'angle', 'length', 'holes']

/** One edge of a hole set: its holes, in path order. */
export interface HoleEdge {
  set: HoleSetEntity
  index: number
  holes: Vec2[]
}

/** The hole-set edge nearest `p` within `tolerance` mm: distance to the polyline through its holes. */
export function holeEdgeNear(project: Project, p: Vec2, tolerance: number): HoleEdge | null {
  let best: (HoleEdge & { d: number }) | null = null
  for (const { entity, layer } of entitiesNear(project, p, tolerance)) {
    if (entity.type !== 'holeSet' || layer.locked) continue
    const edges = holeEdges(project, entity)
    for (let index = 0; index < edges.length; index++) {
      const holes = edges[index].map((i) => entity.holes[i])
      let d = holes.length === 1 ? distance(p, holes[0]) : Infinity
      for (let k = 1; k < holes.length; k++) d = Math.min(d, toSegment(p, holes[k - 1], holes[k]).d)
      if (d <= tolerance && (!best || d < best.d)) best = { set: entity, index, holes, d }
    }
  }
  return best && { set: best.set, index: best.index, holes: best.holes }
}

export class MeasureTool implements Tool {
  readonly id = 'measure'
  readonly cursor = 'crosshair'
  private mode: Mode = 'distance'
  private points: Vec2[] = []
  private mouse: Vec2 | null = null
  private hover: Entity | null = null
  private hoverEdge: HoleEdge | null = null
  private holeEdgesPicked: HoleEdge[] = []

  get snaps() {
    return this.mode !== 'length' && this.mode !== 'holes'
  }

  activate(ctx: ToolContext) {
    this.points = []
    this.holeEdgesPicked = []
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
    this.hoverEdge = this.mode === 'holes' ? holeEdgeNear(ctx.project, e.raw, PICK_TOLERANCE_PX * ctx.pixelSize) : null
    this.update(ctx)
  }

  onPointerDown(e: ToolPointerEvent, ctx: ToolContext) {
    if (e.button !== 0 || this.mode === 'length') return
    if (this.mode === 'holes') {
      const edge = holeEdgeNear(ctx.project, e.raw, PICK_TOLERANCE_PX * ctx.pixelSize)
      if (!edge) return
      if (this.holeEdgesPicked.length >= 2) this.holeEdgesPicked = []
      this.holeEdgesPicked.push(edge)
      return this.update(ctx)
    }
    // A finished measurement stays on screen until the next click starts a new one.
    if (this.points.length >= this.needed()) this.points = []
    this.points.push(e.point)
    this.update(ctx)
  }

  onInput(values: InputValues, _commit: boolean, ctx: ToolContext) {
    if (values.mode !== undefined) {
      this.mode = MODES[values.mode] ?? this.mode
      this.points = []
      this.holeEdgesPicked = []
    }
    this.update(ctx)
  }

  cancel(ctx: ToolContext) {
    const busy = this.points.length > 0 || this.holeEdgesPicked.length > 0
    this.points = []
    this.holeEdgesPicked = []
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
    if (this.mode === 'holes') {
      const shown = [...this.holeEdgesPicked]
      if (this.hoverEdge && shown.length < 2) shown.push(this.hoverEdge)
      for (const edge of shown) {
        const r = edge.set.holeSize / 2 + 0.5
        for (const at of edge.holes) preview.push({ kind: 'circle', center: at, radius: r })
      }
    }
    ctx.setPreview(preview)

    const fields: InputField[] = [
      {
        key: 'mode',
        kind: 'choice',
        labelKey: 'measure.mode',
        options: ['measure.distance', 'measure.angle', 'measure.length', 'measure.holes'],
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
    } else if (this.mode === 'length') {
      readout('length', 'length', 'measure.length', this.hover ? (entityLength(this.hover) ?? undefined) : undefined)
    } else {
      return this.holesPrompt(fields, ctx)
    }
    const prompt =
      this.mode === 'length'
        ? 'measure.promptLength'
        : this.mode === 'angle'
          ? 'measure.promptAngle'
          : 'measure.promptDistance'
    ctx.setPrompt(prompt, fields)
  }

  private holesPrompt(fields: InputField[], ctx: ToolContext) {
    const [a, b] = this.holeEdgesPicked
    const first = a ?? this.hoverEdge
    const second = a ? (b ?? this.hoverEdge) : null
    const count = (key: string, labelKey: InputField['labelKey'], edge: HoleEdge | null | undefined) =>
      fields.push({ key, kind: 'factor', labelKey, live: edge?.holes.length, readOnly: true })
    count('first', 'measure.edgeA', first)
    count('second', 'measure.edgeB', second)
    if (!a) return ctx.setPrompt('measure.promptHolesFirst', fields)
    if (!b) return ctx.setPrompt('measure.promptHolesSecond', fields)
    const diff = Math.abs(a.holes.length - b.holes.length)
    if (diff === 0) return ctx.setPrompt('measure.holesMatch', fields, { count: a.holes.length })
    ctx.setPrompt('measure.holesDiffer', fields, { a: a.holes.length, b: b.holes.length, diff })
  }
}
