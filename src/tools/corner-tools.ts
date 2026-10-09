// M1 Fillet and M2 Chamfer tools. Hover near a corner (an anchor between two straight edges) to preview,
// click to apply, Shift for every corner of that shape. Values are sticky. Stitch lines (derived paths) are
// skipped: editing them directly would detach them; round the outline instead and they follow.

import { updateEntity } from '../document/commands'
import type { PathEntity, Project, Segment } from '../document/model'
import {
  applyToCorners,
  chamferCorner,
  chamferDistanceForAngle,
  cornerAt,
  cornerDistance,
  corners,
  filletCorner,
  type Corner,
  type CornerResult,
} from '../geometry/corners'
import { entitiesNear } from '../geometry/query'
import type { Vec2 } from '../lib/vec2'
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

/** Corners are picked within this many CSS px of their anchor. */
const CORNER_PICK_PX = 12

interface Target {
  entity: PathEntity
  corner: Corner
  all: boolean
}

/** The nearest corner (of an editable, non-derived path) within `tolerance` mm of `p`. */
export function cornerNear(
  project: Project,
  p: Vec2,
  tolerance: number,
): { entity: PathEntity; corner: Corner } | null {
  let best: { entity: PathEntity; corner: Corner; d: number } | null = null
  for (const { entity, layer } of entitiesNear(project, p, tolerance)) {
    if (layer.locked || entity.type !== 'path' || entity.derived) continue
    for (const i of corners(entity.segments, entity.closed)) {
      const corner = cornerAt(entity.segments, entity.closed, i)!
      const d = cornerDistance(corner, p)
      if (d <= tolerance && (!best || d < best.d)) best = { entity, corner, d }
    }
  }
  return best && { entity: best.entity, corner: best.corner }
}

abstract class CornerTool implements Tool {
  abstract readonly id: ToolId
  readonly cursor = 'crosshair'
  readonly snaps = false
  private target: Target | null = null
  protected abstract readonly labelKey: string
  protected abstract readonly prompts: { pick: I18nKey; apply: I18nKey; tooLarge: I18nKey; notApplicable: I18nKey }
  /** Apply the operation to corner `i` of `segments`. */
  protected abstract op(segments: Segment[], closed: boolean, i: number): CornerResult
  protected abstract fields(): InputField[]
  /** Update sticky values from typed input. */
  protected abstract setValues(values: InputValues): void

  activate(ctx: ToolContext) {
    this.target = null
    this.update(ctx)
  }

  private result(t: Target): CornerResult {
    const { segments, closed } = t.entity
    const indices = t.all ? corners(segments, closed) : [t.corner.index]
    return applyToCorners(segments, indices, (segs, i) => this.op(segs, closed, i))
  }

  onPointerMove(e: ToolPointerEvent, ctx: ToolContext) {
    const hit = cornerNear(ctx.project, e.raw, CORNER_PICK_PX * ctx.pixelSize)
    this.target = hit && { ...hit, all: e.shift }
    this.update(ctx)
  }

  onPointerLeave(ctx: ToolContext) {
    this.target = null
    this.update(ctx)
  }

  onPointerDown(e: ToolPointerEvent, ctx: ToolContext) {
    if (e.button !== 0) return
    const hit = cornerNear(ctx.project, e.raw, CORNER_PICK_PX * ctx.pixelSize)
    if (!hit) return
    const target = { ...hit, all: e.shift }
    const r = this.result(target)
    if ('error' in r) return this.update(ctx, target, r)
    ctx.dispatch(updateEntity<PathEntity>(target.entity.id, { segments: r.segments }, this.labelKey))
    this.target = null
    this.update(ctx)
  }

  onInput(values: InputValues, _commit: boolean, ctx: ToolContext) {
    this.setValues(values)
    this.update(ctx)
  }

  cancel() {
    return false
  }

  private update(ctx: ToolContext, target = this.target, result = target ? this.result(target) : null) {
    const preview: PreviewShape[] = []
    if (target) preview.push({ kind: 'snap', at: target.corner.point, snapKind: 'endpoint' })
    if (target && result && 'segments' in result) {
      preview.push({ kind: 'path', segments: result.segments, closed: target.entity.closed })
    }
    ctx.setPreview(preview)
    if (result && 'error' in result) {
      if (result.error === 'tooLarge')
        ctx.setPrompt(this.prompts.tooLarge, this.fields(), { max: result.max.toFixed(2) })
      else ctx.setPrompt(this.prompts.notApplicable, this.fields())
      return
    }
    ctx.setPrompt(target ? this.prompts.apply : this.prompts.pick, this.fields())
  }
}

export class FilletTool extends CornerTool {
  readonly id = 'fillet'
  protected readonly labelKey = 'history.fillet'
  protected readonly prompts = {
    pick: 'fillet.promptPick',
    apply: 'fillet.promptApply',
    tooLarge: 'fillet.tooLarge',
    notApplicable: 'fillet.notApplicable',
  } as const
  private radius = 3

  protected op(segments: Segment[], closed: boolean, i: number) {
    return filletCorner(segments, closed, i, this.radius)
  }
  protected setValues(values: InputValues) {
    if (values.radius !== undefined && values.radius > 0) this.radius = values.radius
  }
  protected fields(): InputField[] {
    return [{ key: 'radius', kind: 'length', labelKey: 'fillet.radius', live: this.radius }]
  }
}

export class ChamferTool extends CornerTool {
  readonly id = 'chamfer'
  protected readonly labelKey = 'history.chamfer'
  protected readonly prompts = {
    pick: 'chamfer.promptPick',
    apply: 'chamfer.promptApply',
    tooLarge: 'chamfer.tooLarge',
    notApplicable: 'chamfer.notApplicable',
  } as const
  private d1 = 3
  /** null = same as d1. */
  private d2: number | null = null
  /** When set, d2 follows from d1 and this angle (degrees from the first edge). */
  private angle: number | null = null

  protected op(segments: Segment[], closed: boolean, i: number): CornerResult {
    let d2 = this.d2 ?? this.d1
    if (this.angle !== null) {
      const c = cornerAt(segments, closed, i)
      const fromAngle = c && chamferDistanceForAngle(c, this.d1, this.angle)
      if (fromAngle === null || fromAngle === undefined) return { error: 'notACorner' }
      d2 = fromAngle
    }
    return chamferCorner(segments, closed, i, this.d1, d2)
  }
  protected setValues(values: InputValues) {
    if (values.d1 !== undefined && values.d1 > 0) this.d1 = values.d1
    if (values.d2 !== undefined) this.d2 = values.d2 > 0 ? values.d2 : null
    if (values.angle !== undefined) this.angle = values.angle > 0 && values.angle < 180 ? values.angle : null
  }
  protected fields(): InputField[] {
    return [
      { key: 'd1', kind: 'length', labelKey: 'chamfer.d1', live: this.d1 },
      { key: 'd2', kind: 'length', labelKey: 'chamfer.d2', live: this.d2 ?? this.d1 },
      { key: 'angle', kind: 'angle', labelKey: 'chamfer.angle', live: this.angle ?? undefined },
    ]
  }
}
