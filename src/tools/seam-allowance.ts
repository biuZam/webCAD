// L6 Seam allowance per edge: pick a closed outline; every edge starts at the default allowance. Click an edge
// (Shift-click for several) and type its allowance + Enter; with no edge picked, a typed value applies to all.
// Enter with nothing typed adds the allowance outline (a new path on the active layer); Esc steps back.

import { addEntities } from '../document/commands'
import type { Entity, PathEntity } from '../document/model'
import type { Shape } from '../geometry/edit'
import { outlineEdges, seamAllowance } from '../geometry/leather/seam-allowance'
import { nearestPoint } from '../geometry/query'
import type { Vec2 } from '../lib/vec2'
import { entityBase } from './common'
import { hitTest, PICK_TOLERANCE_PX } from './select'
import type { InputValues, PreviewShape, Tool, ToolContext, ToolPointerEvent } from './types'

/** Default allowance (mm) for new outlines: a common seam allowance. */
export const DEFAULT_SEAM_ALLOWANCE = 10

/** The outline of a closed path as path geometry, or null. (Circles: use Offset.) */
function closedOutline(e: Entity): Shape | null {
  return e.type === 'path' && e.closed && e.segments.length > 2 ? { segments: e.segments, closed: true } : null
}

const asPath = (s: Shape): PathEntity => ({
  id: '',
  type: 'path',
  layerId: '',
  lineStyle: 'solid',
  strokeWidth: 0,
  segments: s.segments,
  closed: s.closed,
})

export class SeamAllowanceTool implements Tool {
  readonly id = 'seamAllowance'
  readonly cursor = 'crosshair'
  readonly draws = true
  readonly snaps = false
  private outline: { source: Entity; shape: Shape; edges: Shape[] } | null = null
  private allowances: number[] = []
  private picked = new Set<number>()
  private hoverEntity: Entity | null = null
  private hoverEdge: number | null = null
  private preview: Shape | null = null
  private defaultAllowance = DEFAULT_SEAM_ALLOWANCE

  activate(ctx: ToolContext) {
    this.reset()
    this.update(ctx)
  }

  private reset() {
    this.outline = null
    this.allowances = []
    this.picked.clear()
    this.preview = null
  }

  /** The edge of the picked outline nearest `p`, within the pick tolerance. */
  private edgeAt(p: Vec2, ctx: ToolContext): number | null {
    if (!this.outline) return null
    let best: { i: number; d: number } | null = null
    this.outline.edges.forEach((edge, i) => {
      const d = nearestPoint(asPath(edge), p).distance
      if (!best || d < best.d) best = { i, d }
    })
    const found = best as { i: number; d: number } | null
    return found && found.d <= PICK_TOLERANCE_PX * ctx.pixelSize ? found.i : null
  }

  onPointerMove(e: ToolPointerEvent, ctx: ToolContext) {
    if (!this.outline) {
      const hit = hitTest(ctx.project, e.raw, PICK_TOLERANCE_PX * ctx.pixelSize)
      this.hoverEntity = hit && closedOutline(hit) ? hit : null
    } else {
      this.hoverEdge = this.edgeAt(e.raw, ctx)
    }
    this.update(ctx)
  }

  onPointerDown(e: ToolPointerEvent, ctx: ToolContext) {
    if (e.button !== 0) return
    if (!this.outline) {
      const hit = hitTest(ctx.project, e.raw, PICK_TOLERANCE_PX * ctx.pixelSize)
      const shape = hit && closedOutline(hit)
      if (!hit || !shape) return
      const edges = outlineEdges(shape)
      this.outline = { source: hit, shape, edges }
      this.allowances = edges.map(() => this.defaultAllowance)
      this.recompute()
      return this.update(ctx)
    }
    const edge = this.edgeAt(e.raw, ctx)
    if (edge === null) return
    if (!e.shift) this.picked.clear()
    if (this.picked.has(edge) && e.shift) this.picked.delete(edge)
    else this.picked.add(edge)
    this.update(ctx)
  }

  onInput(values: InputValues, commit: boolean, ctx: ToolContext) {
    const d = values.allowance
    if (!commit || d === undefined || d < 0 || !this.outline) return
    const targets = this.picked.size > 0 ? [...this.picked] : this.allowances.map((_, i) => i)
    for (const i of targets) this.allowances[i] = d
    if (this.picked.size === 0) this.defaultAllowance = d
    this.recompute()
    this.update(ctx)
  }

  /** Enter with nothing typed: add the allowance outline. */
  finish(ctx: ToolContext) {
    const target = ctx.target()
    if (!this.outline || !target) return
    const shape = seamAllowance(this.outline.shape, this.allowances)
    if (!shape) return
    ctx.dispatch(
      addEntities(
        target.pieceId,
        [{ ...entityBase(ctx, target.layerId), type: 'path', segments: shape.segments, closed: true }],
        'history.seamAllowance',
      ),
    )
    this.reset()
    this.update(ctx)
  }

  cancel(ctx: ToolContext) {
    if (this.picked.size > 0) this.picked.clear()
    else if (this.outline) this.reset()
    else return false
    this.update(ctx)
    return true
  }

  private recompute() {
    this.preview = this.outline ? seamAllowance(this.outline.shape, this.allowances, 'preview') : null
  }

  private update(ctx: ToolContext) {
    const shapes: PreviewShape[] = []
    if (!this.outline) {
      if (this.hoverEntity) shapes.push({ kind: 'entity', entity: this.hoverEntity })
      ctx.setPreview(shapes)
      return ctx.setPrompt('seamAllowance.promptPick', [])
    }
    if (this.preview) shapes.push({ kind: 'path', segments: this.preview.segments, closed: true, dashed: true })
    this.outline.edges.forEach((edge, i) => {
      if (this.picked.has(i) || this.hoverEdge === i) shapes.push({ kind: 'entity', entity: asPath(edge) })
    })
    ctx.setPreview(shapes)
    const shown = this.picked.size > 0 ? this.allowances[[...this.picked][0]] : this.allowances[0]
    ctx.setPrompt(
      this.picked.size > 0 ? 'seamAllowance.promptEdges' : 'seamAllowance.promptAll',
      [{ key: 'allowance', kind: 'length', labelKey: 'seamAllowance.allowance', live: shown }],
      { values: this.allowances.map((v) => String(+v.toFixed(2))).join(' · ') },
    )
  }
}
