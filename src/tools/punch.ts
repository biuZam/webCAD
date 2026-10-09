// L5 Punch marks: round holes (for rivets, snaps, Chicago screws, buckle tongues…) and slots, placed by
// clicking a centre (object snaps apply) or typing x/y. Diameter from a preset or typed; slots also take a
// length and an angle. Drawn on the active layer (normally Cut: they are punched through).

import { addEntities } from '../document/commands'
import type { CircleEntity, Entity, PathEntity } from '../document/model'
import { slotSegments } from '../geometry/shapes'
import type { Vec2 } from '../lib/vec2'
import { entityBase, pointFields, typedPoint } from './common'
import type { InputField, InputValues, PreviewShape, Tool, ToolContext, ToolPointerEvent } from './types'

/** Common hole-punch diameters (mm). */
export const PUNCH_PRESETS = [1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 8, 10] as const

type Kind = 'round' | 'slot'

export class PunchTool implements Tool {
  readonly id = 'punch'
  readonly cursor = 'crosshair'
  readonly draws = true
  private kind: Kind = 'round'
  /** Sticky sizes: a row of rivet holes all come out alike. */
  private diameter = 3
  private slotLength = 12
  private angle = 0
  private mouse: Vec2 | null = null
  private typed: InputValues = {}

  activate(ctx: ToolContext) {
    this.typed = {}
    this.update(ctx)
  }

  onPointerMove(e: ToolPointerEvent, ctx: ToolContext) {
    this.mouse = e.point
    this.update(ctx)
  }

  onPointerDown(e: ToolPointerEvent, ctx: ToolContext) {
    if (e.button !== 0) return
    this.commit(e.point, ctx)
  }

  onInput(values: InputValues, commit: boolean, ctx: ToolContext) {
    const { kind, preset, diameter, length, angle, ...rest } = values
    if (kind !== undefined) this.kind = kind === 1 ? 'slot' : 'round'
    if (preset !== undefined && PUNCH_PRESETS[preset]) this.diameter = PUNCH_PRESETS[preset]
    if (diameter !== undefined && diameter > 0) this.diameter = diameter
    if (length !== undefined && length > 0) this.slotLength = length
    if (angle !== undefined) this.angle = angle
    this.typed = rest
    // Enter with a typed position places the mark there; otherwise it only sets sizes.
    const at = rest.x !== undefined || rest.y !== undefined ? typedPoint(rest, this.mouse) : null
    if (commit && at) this.commit(at, ctx)
    else this.update(ctx)
  }

  cancel() {
    return false
  }

  /** The mark centred at `at`, minus its id and style. */
  private shape(
    at: Vec2,
  ):
    | Pick<CircleEntity, 'type' | 'center' | 'rx' | 'ry' | 'rotation'>
    | Pick<PathEntity, 'type' | 'segments' | 'closed'> {
    const r = this.diameter / 2
    if (this.kind === 'round') return { type: 'circle', center: at, rx: r, ry: r, rotation: 0 }
    return {
      type: 'path',
      segments: slotSegments(at, Math.max(this.slotLength, this.diameter), this.diameter, this.angle),
      closed: true,
    }
  }

  private commit(at: Vec2, ctx: ToolContext) {
    const target = ctx.target()
    if (!target) return
    const entity = { ...entityBase(ctx, target.layerId), ...this.shape(at) } as Entity
    ctx.dispatch(addEntities(target.pieceId, [entity], this.kind === 'round' ? 'history.addPunch' : 'history.addSlot'))
    this.typed = {}
    this.update(ctx)
  }

  private update(ctx: ToolContext) {
    const preview: PreviewShape[] = []
    const at = typedPoint(this.typed, this.mouse)
    if (at) {
      const s = this.shape(at)
      preview.push(
        s.type === 'circle'
          ? { kind: 'circle', center: s.center, radius: s.rx }
          : { kind: 'path', segments: s.segments, closed: true },
      )
    }
    ctx.setPreview(preview)
    const preset = PUNCH_PRESETS.indexOf(this.diameter as (typeof PUNCH_PRESETS)[number])
    const fields: InputField[] = [
      {
        key: 'kind',
        kind: 'choice',
        labelKey: 'punch.kind',
        options: ['punch.round', 'punch.slot'],
        live: this.kind === 'slot' ? 1 : 0,
      },
      {
        key: 'preset',
        kind: 'choice',
        labelKey: 'punch.preset',
        // A typed size that isn't a preset shows as "custom" (the last option).
        options: [...PUNCH_PRESETS.map((d) => ({ text: `${d} mm` })), 'punch.custom'],
        live: preset >= 0 ? preset : PUNCH_PRESETS.length,
      },
      {
        key: 'diameter',
        kind: 'length',
        labelKey: this.kind === 'slot' ? 'punch.width' : 'punch.diameter',
        live: this.diameter,
      },
    ]
    if (this.kind === 'slot') {
      fields.push(
        { key: 'length', kind: 'length', labelKey: 'punch.length', live: this.slotLength },
        { key: 'angle', kind: 'angle', labelKey: 'punch.angle', live: this.angle },
      )
    }
    ctx.setPrompt(this.kind === 'slot' ? 'punch.promptSlot' : 'punch.prompt', [...fields, ...pointFields(this.mouse)])
  }
}
