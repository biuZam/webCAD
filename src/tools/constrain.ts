// T5.2 Constraints: parallel, perpendicular, tangent, coincident, distance and radius dimensions.
// Pick two things (the first stays where it is, the second moves); dimensions then take a typed value (Enter
// without typing keeps the current one). The planegcs solver runs asynchronously (its WASM loads on first use);
// the constraint and the geometry it moved are one undo step. Dimensions can be edited later in the Properties
// panel.

import { findEntity, setConstraint } from '../document/commands'
import { newId } from '../document/factory'
import type { Constraint, ConstraintType, EdgeRef, Entity, Id, Piece, PointRef } from '../document/model'
import { circleOf, dimensionValue, edgeEnds, pointOf } from '../geometry/constraints'
import { entitiesNear } from '../geometry/query'
import { solve } from '../geometry/solver'
import { distance, type Vec2 } from '../lib/vec2'
import { toSegment } from './edges'
import { PICK_TOLERANCE_PX } from './select'
import type { I18nKey, InputField, InputValues, PreviewShape, Tool, ToolContext, ToolPointerEvent } from './types'

export const CONSTRAINT_MODES = ['parallel', 'perpendicular', 'tangent', 'coincident', 'distance', 'radius'] as const
type Mode = (typeof CONSTRAINT_MODES)[number]

type Pick =
  | { kind: 'point'; ref: PointRef; at: Vec2 }
  | { kind: 'edge'; ref: EdgeRef; a: Vec2; b: Vec2 }
  | { kind: 'circle'; id: Id; center: Vec2; radius: number }

/** Which kind of thing each step of a mode picks. A tangent takes a line and a circle in either order. */
const STEPS: Record<Mode, readonly Pick['kind'][]> = {
  parallel: ['edge', 'edge'],
  perpendicular: ['edge', 'edge'],
  tangent: ['edge', 'circle'],
  coincident: ['point', 'point'],
  distance: ['point', 'point'],
  radius: ['circle'],
}

function pick(piece: Piece | undefined, ctx: ToolContext, raw: Vec2, wanted: Pick['kind'][]): Pick | null {
  const tolerance = PICK_TOLERANCE_PX * ctx.pixelSize
  let best: (Pick & { d: number }) | null = null
  const offer = (p: Pick, d: number) => {
    if (d <= tolerance && (!best || d < best.d)) best = { ...p, d }
  }
  for (const { entity } of entitiesNear(ctx.project, raw, tolerance)) {
    if (piece && !piece.entities.includes(entity)) continue
    const anchors: Vec2[] = []
    if (entity.type === 'path') anchors.push(...entity.segments.map((s) => s.p))
    else if (entity.type === 'centreLine') anchors.push(entity.from, entity.to)
    else if (entity.type === 'circle') anchors.push(entity.center)
    if (wanted.includes('point')) {
      // Points win over edges so corners are easy to hit.
      anchors.forEach((at, index) =>
        offer({ kind: 'point', ref: { entityId: entity.id, index }, at }, distance(raw, at) * 0.5),
      )
    }
    if (wanted.includes('edge') && (entity.type === 'path' || entity.type === 'centreLine')) {
      const count = entity.type === 'path' ? entity.segments.length : 1
      for (let edge = 0; edge < count; edge++) {
        const ends = edgeEnds(entity, edge)
        if (!ends) continue
        const [a, b] = ends.map((i) => anchors[i]) as [Vec2, Vec2]
        offer({ kind: 'edge', ref: { entityId: entity.id, edge }, a, b }, toSegment(raw, a, b).d)
      }
    }
    if (wanted.includes('circle') && entity.type === 'circle' && Math.abs(entity.rx - entity.ry) < 1e-9) {
      offer(
        { kind: 'circle', id: entity.id, center: entity.center, radius: entity.rx },
        Math.abs(distance(raw, entity.center) - entity.rx),
      )
    }
  }
  const found = best as (Pick & { d: number }) | null
  if (!found) return null
  const { d: _d, ...rest } = found
  return rest
}

function pickEntityId(p: Pick): Id {
  return p.kind === 'point' ? p.ref.entityId : p.kind === 'edge' ? p.ref.entityId : p.id
}

function previewOf(p: Pick, dashed: boolean): PreviewShape {
  if (p.kind === 'point') return { kind: 'point', at: p.at }
  if (p.kind === 'edge') return { kind: 'path', segments: [{ p: p.a }, { p: p.b }], closed: false, dashed }
  return { kind: 'circle', center: p.center, radius: p.radius }
}

/** The pins that keep the first pick where it is. */
function pinsFor(p: Pick, piece: Piece): PointRef[] {
  if (p.kind === 'point') return [p.ref]
  if (p.kind === 'circle') return [{ entityId: p.id, index: 0 }]
  const e = piece.entities.find((x) => x.id === p.ref.entityId)!
  return (edgeEnds(e, p.ref.edge) ?? []).map((index) => ({ entityId: p.ref.entityId, index }))
}

const sameRefs = (a: Constraint, b: Constraint) => JSON.stringify({ ...a, id: '' }) === JSON.stringify({ ...b, id: '' })

export class ConstrainTool implements Tool {
  readonly id = 'constrain'
  readonly cursor = 'crosshair'
  readonly snaps = false
  private mode: Mode = 'parallel'
  private picks: Pick[] = []
  private hover: Pick | null = null
  private failed: 'conflict' | 'failed' | 'broken' | null = null
  private busy = false

  activate(ctx: ToolContext) {
    this.reset(ctx)
  }

  private piece(ctx: ToolContext): Piece | undefined {
    const first = this.picks[0]
    return first ? findEntity(ctx.project, pickEntityId(first))?.piece : undefined
  }

  private wanted(): Pick['kind'][] {
    const step = STEPS[this.mode][this.picks.length]
    if (!step) return []
    if (this.mode === 'tangent' && this.picks.length === 1) return [this.picks[0].kind === 'edge' ? 'circle' : 'edge']
    if (this.mode === 'tangent') return ['edge', 'circle']
    return [step]
  }

  onPointerMove(e: ToolPointerEvent, ctx: ToolContext) {
    this.hover = this.busy ? null : pick(this.piece(ctx), ctx, e.raw, this.wanted())
    this.update(ctx)
  }

  onPointerDown(e: ToolPointerEvent, ctx: ToolContext) {
    if (e.button !== 0 || this.busy) return
    const p = pick(this.piece(ctx), ctx, e.raw, this.wanted())
    if (!p) return
    this.failed = null
    this.picks.push(p)
    const steps = STEPS[this.mode].length
    // Dimensions wait for a value after the last pick; the relations apply right away.
    if (this.picks.length === steps && this.mode !== 'distance' && this.mode !== 'radius') void this.commit(ctx)
    else this.update(ctx)
  }

  onInput(values: InputValues, commit: boolean, ctx: ToolContext) {
    const mode = values.mode !== undefined ? CONSTRAINT_MODES[values.mode] : undefined
    if (mode && mode !== this.mode) {
      this.mode = mode
      this.picks = []
      this.failed = null
      return this.update(ctx)
    }
    if (commit && this.ready()) void this.commit(ctx, values.value)
    else this.update(ctx)
  }

  finish(ctx: ToolContext) {
    if (this.ready()) void this.commit(ctx)
  }

  cancel(ctx: ToolContext) {
    const busy = this.picks.length > 0
    this.reset(ctx)
    return busy
  }

  private ready() {
    return (this.mode === 'distance' || this.mode === 'radius') && this.picks.length === STEPS[this.mode].length
  }

  private reset(ctx: ToolContext) {
    this.picks = []
    this.hover = null
    this.failed = null
    this.update(ctx)
  }

  /** The constraint the picks describe; dimensions take `value` (mm) or the current measure. */
  private build(piece: Piece, value?: number): Constraint | null {
    const [p, q] = this.picks
    const id = newId()
    switch (this.mode) {
      case 'parallel':
      case 'perpendicular':
        return p?.kind === 'edge' && q?.kind === 'edge' ? { id, type: this.mode, a: p.ref, b: q.ref } : null
      case 'tangent': {
        const line = [p, q].find((x) => x?.kind === 'edge')
        const circle = [p, q].find((x) => x?.kind === 'circle')
        return line?.kind === 'edge' && circle?.kind === 'circle'
          ? { id, type: 'tangent', line: line.ref, circle: circle.id }
          : null
      }
      case 'coincident':
        return p?.kind === 'point' && q?.kind === 'point' ? { id, type: 'coincident', a: p.ref, b: q.ref } : null
      case 'distance': {
        if (p?.kind !== 'point' || q?.kind !== 'point') return null
        const c: Constraint = { id, type: 'distance', a: p.ref, b: q.ref, value: 0 }
        return { ...c, value: value ?? dimensionValue(piece, c) ?? 0 }
      }
      case 'radius': {
        if (p?.kind !== 'circle') return null
        return { id, type: 'radius', circle: p.id, value: value ?? circleOf(piece, p.id)?.rx ?? 0 }
      }
    }
  }

  private async commit(ctx: ToolContext, value?: number) {
    const piece = this.piece(ctx)
    const first = this.picks[0]
    const constraint = piece && this.build(piece, value)
    if (!piece || !constraint || !first) return
    if (value !== undefined && !(value > 0)) return this.update(ctx)
    const existing = piece.constraints ?? []
    // The same relation twice adds nothing.
    if (existing.some((c) => sameRefs(c, constraint))) {
      this.picks = []
      return this.update(ctx)
    }
    this.busy = true
    this.update(ctx)
    const result = await solve({
      piece,
      constraints: [...existing, constraint],
      pinned: pinsFor(first, piece),
    }).catch(() => ({ ok: false as const, reason: 'failed' as const }))
    this.busy = false
    if (result.ok) {
      ctx.dispatch(setConstraint(piece.id, constraint, result.entities as Entity[]))
      this.picks = []
      this.failed = null
    } else {
      this.picks = []
      this.failed = result.reason
    }
    this.update(ctx)
  }

  private update(ctx: ToolContext) {
    const preview: PreviewShape[] = this.picks.map((p) => previewOf(p, false))
    if (this.hover) preview.push(previewOf(this.hover, true))
    ctx.setPreview(preview)

    const modeField: InputField = {
      key: 'mode',
      kind: 'choice',
      labelKey: 'constrain.mode',
      options: [
        'constrain.modeParallel',
        'constrain.modePerpendicular',
        'constrain.modeTangent',
        'constrain.modeCoincident',
        'constrain.modeDistance',
        'constrain.modeRadius',
      ],
      live: CONSTRAINT_MODES.indexOf(this.mode),
    }
    if (this.busy) return ctx.setPrompt('constrain.promptSolving', [modeField])
    if (this.ready()) {
      const piece = this.piece(ctx)
      const current = piece && this.build(piece)
      const live = piece && current ? (dimensionValue(piece, current) ?? undefined) : undefined
      return ctx.setPrompt(this.mode === 'radius' ? 'constrain.promptRadius' : 'constrain.promptDistance', [
        modeField,
        {
          key: 'value',
          kind: 'length',
          labelKey: this.mode === 'radius' ? 'constrain.radius' : 'constrain.distance',
          live,
        },
      ])
    }
    if (this.failed) {
      return ctx.setPrompt(this.failed === 'conflict' ? 'constrain.promptConflict' : 'constrain.promptFailed', [
        modeField,
      ])
    }
    const second = this.picks.length === 1
    const key: I18nKey =
      this.mode === 'radius'
        ? 'constrain.promptCircle'
        : this.mode === 'tangent'
          ? second
            ? 'constrain.promptTangent2'
            : 'constrain.promptTangent1'
          : this.mode === 'coincident' || this.mode === 'distance'
            ? second
              ? 'constrain.promptPoint2'
              : 'constrain.promptPoint1'
            : second
              ? 'constrain.promptEdge2'
              : 'constrain.promptEdge1'
    ctx.setPrompt(key, [modeField])
  }
}

export type { ConstraintType }
// pointOf is re-exported for tests that check solved geometry.
export { pointOf }
