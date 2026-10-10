// M3 Offset: pick a source (or use the selection), then click on the side to offset to.
// Distance is "through the cursor" by default, or typed (then remembered for the next offsets).
// The result is selected afterwards, so clicking again makes another concentric offset, e.g. a second stitch line.

import { canOffset } from '../document/builders'
import { insertEntitiesAfter } from '../document/commands'
import { newId } from '../document/factory'
import type { Entity, Id, JoinStyle } from '../document/model'
import { nearestPoint } from '../geometry/query'
import { offsetEntity, offsetSide, type OffsetResult, type OffsetShape } from '../geometry/offset'
import type { Vec2 } from '../lib/vec2'
import { hitTest, PICK_TOLERANCE_PX } from './select'
import type {
  I18nKey,
  InputField,
  InputValues,
  PreviewShape,
  Tool,
  ToolContext,
  ToolId,
  ToolPointerEvent,
} from './types'

export const JOINS: readonly JoinStyle[] = ['miter', 'round', 'bevel']

function shapeToEntity(shape: OffsetShape, source: Entity): Entity {
  const style = { id: newId(), layerId: source.layerId, lineStyle: source.lineStyle, strokeWidth: source.strokeWidth }
  return shape.type === 'circle' ? { ...style, ...shape } : { ...style, ...shape }
}

function shapeToPreview(shape: OffsetShape): PreviewShape {
  return shape.type === 'circle'
    ? { kind: 'circle', center: shape.center, radius: shape.rx }
    : { kind: 'path', segments: shape.segments, closed: shape.closed }
}

export class OffsetTool implements Tool {
  readonly id: ToolId = 'offset'
  readonly cursor = 'crosshair'
  protected sources: Id[] = []
  private mouse: Vec2 | null = null
  private typed: InputValues = {}
  /** Sticky settings. `through`: distance follows the cursor instead of `distance`. */
  private distance: number | null = null
  protected through = true
  protected join: JoinStyle = 'miter'

  // Hooks for tools built on this one (the stitch-line tool).
  protected readonly labelKey: string = 'history.offset'
  protected readonly prompts: { pick: I18nKey; side: I18nKey; approx: I18nKey } = {
    pick: 'offset.promptPick',
    side: 'offset.promptSide',
    approx: 'offset.promptApprox',
  }

  /** The entities to insert after `source` for an offset by signed `margin`; null if not allowed (prompted). */
  protected makeEntities(source: Entity, result: OffsetResult, _margin: number, _ctx: ToolContext): Entity[] | null {
    return result.shapes.map((s) => shapeToEntity(s, source))
  }

  /** What to offset next after a commit: by default the new lines, for concentric offsets. */
  protected afterCommit(created: Id[]): Id[] {
    return created
  }

  activate(ctx: ToolContext) {
    this.sources = ctx.selection.filter((id) => {
      const e = this.entity(ctx, id)
      return e !== null && canOffset(e)
    })
    this.typed = {}
    if (this.distance === null) this.distance = ctx.project.settings.stitchMargin
    this.update(ctx)
  }

  private entity(ctx: ToolContext, id: Id): Entity | null {
    for (const p of ctx.project.pieces) for (const e of p.entities) if (e.id === id) return e
    return null
  }

  private sourceEntities(ctx: ToolContext): Entity[] {
    return this.sources.map((id) => this.entity(ctx, id)).filter((e): e is Entity => e !== null)
  }

  /** Unsigned offset distance right now. */
  private effectiveDistance(ctx: ToolContext): number | null {
    if (this.typed.distance !== undefined) return Math.abs(this.typed.distance)
    if (!this.through) return this.distance
    if (!this.mouse) return null
    const ds = this.sourceEntities(ctx).map((e) => nearestPoint(e, this.mouse!).distance)
    return ds.length ? Math.min(...ds) : null
  }

  private offsets(ctx: ToolContext, quality: 'precise' | 'preview') {
    const d = this.effectiveDistance(ctx)
    if (!d || !this.mouse) return []
    return this.sourceEntities(ctx).map((source) => {
      const margin = offsetSide(source, this.mouse!) * d
      return { source, margin, result: offsetEntity(source, margin, this.join, quality) }
    })
  }

  /**
   * An object snap gives "offset through that point"; a grid snap would only quantise the distance (coarsely
   * when zoomed out, often onto the source itself, i.e. 0), so it is ignored.
   */
  private pointOf(e: ToolPointerEvent): Vec2 {
    return e.snap === 'grid' ? e.raw : e.point
  }

  onPointerMove(e: ToolPointerEvent, ctx: ToolContext) {
    this.mouse = this.pointOf(e)
    if (this.sources.length === 0) {
      const hit = hitTest(ctx.project, e.raw, PICK_TOLERANCE_PX * ctx.pixelSize)
      ctx.setPreview(hit && canOffset(hit) ? [{ kind: 'entity', entity: hit }] : [])
      ctx.setPrompt(this.prompts.pick, [])
      return
    }
    this.update(ctx)
  }

  onPointerDown(e: ToolPointerEvent, ctx: ToolContext) {
    if (e.button !== 0) return
    this.mouse = this.pointOf(e)
    if (this.sources.length === 0) {
      const hit = hitTest(ctx.project, e.raw, PICK_TOLERANCE_PX * ctx.pixelSize)
      if (hit && canOffset(hit)) {
        this.sources = [hit.id]
        ctx.setSelection([hit.id])
      }
      this.update(ctx)
      return
    }
    this.commit(ctx)
  }

  onPointerLeave(ctx: ToolContext) {
    if (this.sources.length === 0) ctx.setPreview([])
  }

  onInput(values: InputValues, commit: boolean, ctx: ToolContext) {
    if (values.through !== undefined) this.through = values.through === 1
    if (values.join !== undefined) this.join = JOINS[values.join] ?? this.join
    this.typed = values.distance !== undefined ? { distance: values.distance } : {}
    if (commit && this.typed.distance !== undefined && this.sources.length > 0) {
      // A typed distance becomes the sticky one and switches off "through".
      this.distance = Math.abs(this.typed.distance)
      this.through = false
      this.commit(ctx)
      return
    }
    this.update(ctx)
  }

  cancel(ctx: ToolContext) {
    if (this.sources.length > 0) {
      this.sources = []
      this.typed = {}
      ctx.setSelection([])
      this.update(ctx)
      return true
    }
    return false
  }

  private commit(ctx: ToolContext) {
    const made = this.offsets(ctx, 'precise').filter((o) => o.result.shapes.length > 0)
    if (made.length === 0) return this.update(ctx)
    const inserts: { afterId: Id; entities: Entity[] }[] = []
    for (const { source, margin, result } of made) {
      const entities = this.makeEntities(source, result, margin, ctx)
      if (!entities) return // the hook explained why in the prompt
      inserts.push({ afterId: source.id, entities })
    }
    ctx.dispatch(insertEntitiesAfter(inserts, this.labelKey))
    const created = inserts.flatMap((i) => i.entities.map((e) => e.id))
    this.sources = this.afterCommit(created)
    ctx.setSelection(created)
    this.typed = {}
    const approximate = made.some((o) => o.result.method === 'clipper' || o.result.warnings.length > 0)
    this.update(ctx, approximate ? this.prompts.approx : undefined)
  }

  protected update(ctx: ToolContext, promptOverride?: I18nKey) {
    if (this.sources.length === 0) {
      ctx.setPreview([])
      ctx.setPrompt(promptOverride ?? this.prompts.pick, [])
      return
    }
    ctx.setPreview(this.offsets(ctx, 'preview').flatMap((o) => o.result.shapes.map(shapeToPreview)))
    const fields: InputField[] = [
      { key: 'distance', kind: 'length', labelKey: 'offset.distance', live: this.effectiveDistance(ctx) ?? undefined },
      { key: 'through', kind: 'toggle', labelKey: 'offset.through', live: this.through ? 1 : 0 },
      {
        key: 'join',
        kind: 'choice',
        labelKey: 'offset.join',
        options: ['offset.joinMiter', 'offset.joinRound', 'offset.joinBevel'],
        live: JOINS.indexOf(this.join),
      },
    ]
    ctx.setPrompt(promptOverride ?? this.prompts.side, fields)
  }
}
