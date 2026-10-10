// L2/L3/L5-ish Stitch holes: hover a line (usually a stitch line) to preview its holes, click to add them.
// The hole set is linked to that line (sourceEntityId), so it is re-laid-out whenever the line changes,
// which, for a stitch line, is whenever the outline changes (src/document/derived.ts).

import { DEFAULT_SLIT_ANGLE, holeLine, holeSet, stitchLayer } from '../document/builders'
import { insertEntitiesAfter } from '../document/commands'
import { PITCH_PRESETS_MM, type Entity, type HoleShape } from '../document/model'
import { distributeHoles, slitEnds } from '../geometry/leather/stitch-holes'
import { hitTest, PICK_TOLERANCE_PX } from './select'
import type { InputField, InputValues, PreviewShape, Tool, ToolContext, ToolPointerEvent } from './types'

const SHAPES: readonly HoleShape[] = ['round', 'slit']

export class StitchHolesTool implements Tool {
  readonly id = 'stitchHoles'
  readonly cursor = 'crosshair'
  readonly snaps = false
  private pitch: number | null = null
  private holeSize: number | null = null
  private shape: HoleShape = 'round'
  private cornerAware = true
  private hover: Entity | null = null

  activate(ctx: ToolContext) {
    const { pitch, holeSize } = ctx.project.settings
    this.pitch ??= pitch
    this.holeSize ??= holeSize
    this.hover = null
    this.update(ctx)
  }

  onPointerMove(e: ToolPointerEvent, ctx: ToolContext) {
    const hit = hitTest(ctx.project, e.raw, PICK_TOLERANCE_PX * ctx.pixelSize)
    this.hover = hit && holeLine(hit) ? hit : null
    this.update(ctx)
  }

  onPointerLeave(ctx: ToolContext) {
    this.hover = null
    this.update(ctx)
  }

  onPointerDown(e: ToolPointerEvent, ctx: ToolContext) {
    if (e.button !== 0 || !this.hover) return
    const layer = stitchLayer(ctx.project, this.hover)
    if (!layer) {
      ctx.setPrompt('common.layerUnavailable', [])
      return
    }
    const set = holeSet(this.hover, layer.id, {
      pitch: this.pitch!,
      holeSize: this.holeSize!,
      holeShape: this.shape,
      cornerMode: this.cornerAware ? 'cornerAware' : 'fixed',
    })
    ctx.dispatch(insertEntitiesAfter([{ afterId: this.hover.id, entities: [set] }], 'history.stitchHoles'))
    ctx.setSelection([set.id])
    this.update(ctx)
  }

  onInput(values: InputValues, _commit: boolean, ctx: ToolContext) {
    if (values.preset !== undefined && values.preset < PITCH_PRESETS_MM.length)
      this.pitch = PITCH_PRESETS_MM[values.preset]
    if (values.pitch !== undefined && values.pitch > 0) this.pitch = values.pitch
    if (values.size !== undefined && values.size > 0) this.holeSize = values.size
    if (values.shape !== undefined) this.shape = SHAPES[values.shape] ?? this.shape
    if (values.corners !== undefined) this.cornerAware = values.corners === 1
    this.update(ctx)
  }

  cancel(ctx: ToolContext) {
    if (ctx.selection.length > 0) {
      ctx.setSelection([])
      return true
    }
    return false
  }

  private update(ctx: ToolContext) {
    const preview: PreviewShape[] = []
    const line = this.hover ? holeLine(this.hover) : null
    if (line) {
      const { holes, angles } = distributeHoles(line, this.pitch!, this.cornerAware ? 'cornerAware' : 'fixed')
      holes.forEach((h, i) => {
        if (this.shape === 'slit') {
          const [a, b] = slitEnds(h, angles[i], DEFAULT_SLIT_ANGLE, this.holeSize!)
          preview.push({ kind: 'path', segments: [{ p: a }, { p: b }], closed: false })
        } else {
          preview.push({ kind: 'circle', center: h, radius: this.holeSize! / 2 })
        }
      })
    }
    ctx.setPreview(preview)
    const presetIndex = PITCH_PRESETS_MM.findIndex((p) => Math.abs(p - this.pitch!) < 1e-9)
    const fields: InputField[] = [
      {
        key: 'preset',
        kind: 'choice',
        labelKey: 'stitchHoles.preset',
        options: [...PITCH_PRESETS_MM.map((p) => ({ text: `${p} mm` })), 'stitchHoles.custom'],
        live: presetIndex === -1 ? PITCH_PRESETS_MM.length : presetIndex,
      },
      { key: 'pitch', kind: 'length', labelKey: 'stitchHoles.pitch', live: this.pitch! },
      { key: 'size', kind: 'length', labelKey: 'stitchHoles.size', live: this.holeSize! },
      {
        key: 'shape',
        kind: 'choice',
        labelKey: 'stitchHoles.shape',
        options: ['stitchHoles.round', 'stitchHoles.slit'],
        live: SHAPES.indexOf(this.shape),
      },
      { key: 'corners', kind: 'toggle', labelKey: 'stitchHoles.corners', live: this.cornerAware ? 1 : 0 },
    ]
    ctx.setPrompt(this.hover ? 'stitchHoles.promptClick' : 'stitchHoles.promptPick', fields)
  }
}
