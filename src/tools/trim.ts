// M8 Trim / extend / split, one tool with three modes (choice in the input bar; Shift flips trim ↔ extend,
// as in desktop CAD). Every visible entity is a cutting edge or boundary; the clicked entity is edited in
// place: its first resulting piece keeps the id, so a stitch line linked to a trimmed outline follows it.

import { replaceEntities } from '../document/commands'
import { newId } from '../document/factory'
import type { Entity, PathEntity, Project } from '../document/model'
import { entityBounds } from '../geometry/bounds'
import { extend, isEditable, splitAt, trim, type Shape } from '../geometry/edit'
import { entitiesInRect, nearestPoint } from '../geometry/query'
import type { Vec2 } from '../lib/vec2'
import { hitTest, PICK_TOLERANCE_PX } from './select'
import type { InputValues, PreviewShape, Tool, ToolContext, ToolPointerEvent } from './types'

type Mode = 'trim' | 'extend' | 'split'
const MODES: readonly Mode[] = ['trim', 'extend', 'split']
const PROMPTS = { trim: 'trim.promptTrim', extend: 'trim.promptExtend', split: 'trim.promptSplit' } as const

/** Entities that can cut or bound `entity`: other outlines, lines and circles on visible layers. */
function boundaries(project: Project, entity: Entity, everywhere: boolean): Entity[] {
  const area = everywhere ? { minX: -Infinity, minY: -Infinity, maxX: Infinity, maxY: Infinity } : entityBounds(entity)
  return entitiesInRect(project, area)
    .map((x) => x.entity)
    .filter((e) => e.id !== entity.id && e.type !== 'text' && e.type !== 'holeSet')
}

/** Model entities for edit results: same layer and style as the source; the first keeps its id. */
export function shapesToEntities(source: Entity, shapes: readonly Shape[]): PathEntity[] {
  return shapes.map((shape, i) => ({
    id: i === 0 ? source.id : newId(),
    type: 'path',
    layerId: source.layerId,
    lineStyle: source.lineStyle,
    strokeWidth: source.strokeWidth,
    segments: shape.segments,
    closed: shape.closed,
  }))
}

export class TrimTool implements Tool {
  readonly id = 'trim'
  readonly cursor = 'crosshair'
  // Picks entities with the raw pointer; snapping would pull the click off the piece to remove.
  readonly snaps = false
  private mode: Mode = 'trim'
  private result: { source: Entity; shapes: Shape[]; at: Vec2; mode: Mode } | null = null

  activate(ctx: ToolContext) {
    this.result = null
    this.update(ctx)
  }

  /** The mode a click uses: Shift swaps trim and extend. */
  private effective(shift: boolean): Mode {
    if (!shift || this.mode === 'split') return this.mode
    return this.mode === 'trim' ? 'extend' : 'trim'
  }

  /** What a click at `p` would do, or null. */
  private compute(p: Vec2, shift: boolean, ctx: ToolContext) {
    const hit = hitTest(ctx.project, p, PICK_TOLERANCE_PX * ctx.pixelSize)
    if (!hit || !isEditable(hit)) return null
    const mode = this.effective(shift)
    const at = nearestPoint(hit, p).point
    const shapes =
      mode === 'split'
        ? splitAt(hit, at)
        : mode === 'trim'
          ? trim(hit, boundaries(ctx.project, hit, false), at)
          : [extend(hit, boundaries(ctx.project, hit, true), at)].filter((s) => s !== null)
    // Trimming may remove the whole entity (no shapes left); the other modes always leave something.
    return shapes && (shapes.length > 0 || mode === 'trim') ? { source: hit, shapes, at, mode } : null
  }

  onPointerMove(e: ToolPointerEvent, ctx: ToolContext) {
    this.result = this.compute(e.raw, e.shift, ctx)
    this.update(ctx)
  }

  onPointerDown(e: ToolPointerEvent, ctx: ToolContext) {
    if (e.button !== 0) return
    const r = this.compute(e.raw, e.shift, ctx)
    if (!r) return
    const labelKey = `history.${r.mode}`
    ctx.dispatch(replaceEntities([{ id: r.source.id, with: shapesToEntities(r.source, r.shapes) }], labelKey))
    this.result = this.compute(e.raw, e.shift, ctx)
    this.update(ctx)
  }

  onInput(values: InputValues, _commit: boolean, ctx: ToolContext) {
    if (values.mode !== undefined) this.mode = MODES[values.mode] ?? 'trim'
    this.result = null
    this.update(ctx)
  }

  onPointerLeave(ctx: ToolContext) {
    this.result = null
    this.update(ctx)
  }

  cancel() {
    return false
  }

  private update(ctx: ToolContext) {
    const preview: PreviewShape[] = []
    const r = this.result
    if (r) {
      // What stays (or the extended path), highlighted; for a split, the point too.
      for (const entity of shapesToEntities(r.source, r.shapes)) preview.push({ kind: 'entity', entity })
      if (r.mode === 'split') preview.push({ kind: 'node', at: r.at, smooth: false, active: true })
    }
    ctx.setPreview(preview)
    ctx.setPrompt(PROMPTS[this.mode], [
      {
        key: 'mode',
        kind: 'choice',
        labelKey: 'trim.mode',
        options: ['trim.modeTrim', 'trim.modeExtend', 'trim.modeSplit'],
        live: MODES.indexOf(this.mode),
      },
    ])
  }
}
