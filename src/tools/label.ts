// D10 Labels on the Notes layer: text (piece name, "cut 2"…) and grain arrows.
//   Text:  click or type the position, then type the text (size and angle optional) and press Enter.
//   Grain arrow: click both ends (Shift locks to 15°), or type length and angle for the second.

import { DEFAULT_STROKE_MM } from '../document/builders'
import { addEntities } from '../document/commands'
import { newId } from '../document/factory'
import type { Id, PathEntity, TextEntity } from '../document/model'
import { grainArrowSegments } from '../geometry/shapes'
import { angleOf, constrainAngle, distance, polar, type Vec2 } from '../lib/vec2'
import { ANGLE_STEP_DEG, pointFields, typedPoint } from './common'
import type { InputField, InputTexts, InputValues, PreviewShape, Tool, ToolContext, ToolPointerEvent } from './types'

/** Default text height (mm): legible on a printed pattern without crowding small pieces. */
export const DEFAULT_TEXT_SIZE = 5

type Mode = 'text' | 'grain'

export class LabelTool implements Tool {
  readonly id = 'label'
  readonly cursor = 'crosshair'
  private mode: Mode = 'text'
  /** Text position, or the grain arrow's first end. */
  private first: Vec2 | null = null
  private mouse: Vec2 | null = null
  private typed: InputValues = {}
  private text = ''
  /** Sticky between labels, so a set of labels comes out alike. */
  private size = DEFAULT_TEXT_SIZE
  private angle = 0
  private lastText = ''

  activate(ctx: ToolContext) {
    this.reset()
    this.update(ctx)
  }

  snapFrom() {
    return this.mode === 'grain' ? this.first : null
  }

  onPointerMove(e: ToolPointerEvent, ctx: ToolContext) {
    this.mouse = this.track(e)
    // Once a text is placed, the mouse no longer matters: keep the preview still while typing.
    if (this.mode === 'grain' || !this.first) this.update(ctx)
  }

  onPointerDown(e: ToolPointerEvent, ctx: ToolContext) {
    if (e.button !== 0) return
    const p = this.track(e)
    if (!this.first) {
      this.first = p
      this.typed = {}
    } else if (this.mode === 'grain') {
      this.commitArrow(this.first, p, ctx)
    } else {
      // A second click while typing: place the text there instead.
      this.first = p
    }
    this.update(ctx)
  }

  onInput(values: InputValues, commit: boolean, ctx: ToolContext, texts: InputTexts) {
    if (values.mode !== undefined) {
      this.mode = values.mode === 1 ? 'grain' : 'text'
      this.reset()
      return this.update(ctx)
    }
    this.typed = values
    if (this.mode === 'text' && this.first) {
      this.text = texts.text ?? ''
      if (values.size !== undefined && values.size > 0) this.size = values.size
      if (values.angle !== undefined) this.angle = values.angle
      if (commit) this.commitText(ctx)
    } else if (commit) {
      if (!this.first) {
        this.first = typedPoint(values, this.mouse)
        this.typed = {}
      } else {
        const end = this.typedEnd()
        if (end) this.commitArrow(this.first, end, ctx)
      }
    }
    this.update(ctx)
  }

  /** Enter with nothing typed: place the text as shown (the placeholder text, if any). */
  finish(ctx: ToolContext) {
    if (this.mode === 'text' && this.first) this.commitText(ctx)
  }

  cancel(ctx: ToolContext) {
    const busy = this.first !== null
    this.reset()
    this.update(ctx)
    return busy
  }

  private reset() {
    this.first = null
    this.typed = {}
    this.text = ''
  }

  private track(e: ToolPointerEvent): Vec2 {
    return this.mode === 'grain' && this.first && e.shift
      ? constrainAngle(this.first, e.point, ANGLE_STEP_DEG)
      : e.point
  }

  /** The grain arrow's second end from typed length/angle, each falling back to the mouse. */
  private typedEnd(): Vec2 | null {
    const a = this.first
    if (!a) return null
    const { length, angle } = this.typed
    if (length === undefined && angle === undefined) return this.mouse
    const len = length ?? (this.mouse ? distance(a, this.mouse) : 0)
    return len > 0 ? polar(a, len, angle ?? (this.mouse ? angleOf(a, this.mouse) : 0)) : null
  }

  /** The Notes layer if it can be drawn on, else the active layer. */
  private layerId(ctx: ToolContext): Id | null {
    const notes = ctx.project.layers.find((l) => l.kind === 'notes')
    if (notes && notes.visible && !notes.locked) return notes.id
    return ctx.target()?.layerId ?? null
  }

  private textEntity(at: Vec2, layerId: Id, text: string): TextEntity {
    return {
      id: newId(),
      type: 'text',
      layerId,
      lineStyle: 'solid',
      strokeWidth: DEFAULT_STROKE_MM,
      position: at,
      text,
      size: this.size,
      // Model rotation is clockwise; typed angles are counter-clockwise.
      rotation: this.angle === 0 ? 0 : -this.angle,
    }
  }

  private commitText(ctx: ToolContext) {
    const text = (this.text.trim() ? this.text : this.lastText).trim()
    const layerId = this.layerId(ctx)
    const pieceId = ctx.project.pieces[0]?.id
    if (!this.first || !text) return
    if (!layerId || !pieceId) return ctx.setPrompt('common.layerUnavailable', [])
    ctx.dispatch(addEntities(pieceId, [this.textEntity(this.first, layerId, text)], 'history.addLabel'))
    this.lastText = text
    this.reset()
    this.update(ctx)
  }

  private commitArrow(a: Vec2, b: Vec2, ctx: ToolContext) {
    if (distance(a, b) === 0) return
    const layerId = this.layerId(ctx)
    const pieceId = ctx.project.pieces[0]?.id
    if (!layerId || !pieceId) return ctx.setPrompt('common.layerUnavailable', [])
    const arrow: PathEntity = {
      id: newId(),
      type: 'path',
      layerId,
      lineStyle: 'solid',
      strokeWidth: DEFAULT_STROKE_MM,
      segments: grainArrowSegments(a, b),
      closed: false,
    }
    ctx.dispatch(addEntities(pieceId, [arrow], 'history.addGrainArrow'))
    this.reset()
  }

  private update(ctx: ToolContext) {
    const preview: PreviewShape[] = []
    const modeField: InputField = {
      key: 'mode',
      kind: 'choice',
      labelKey: 'label.mode',
      options: ['label.modeText', 'label.modeGrain'],
      live: this.mode === 'grain' ? 1 : 0,
    }
    if (this.mode === 'text') {
      const at = this.first ?? this.mouse
      const text = this.text.trim() ? this.text : this.lastText
      if (at && text) {
        // Layer id only matters for colour; the overlay draws previews in the selection colour.
        preview.push({ kind: 'entity', entity: this.textEntity(at, '', text) })
      }
      ctx.setPreview(preview)
      if (!this.first) return ctx.setPrompt('label.promptPlace', [modeField, ...pointFields(this.mouse)])
      return ctx.setPrompt('label.promptText', [
        { key: 'text', kind: 'text', labelKey: 'label.text', liveText: this.lastText },
        { key: 'size', kind: 'length', labelKey: 'label.size', live: this.size },
        { key: 'angle', kind: 'angle', labelKey: 'label.angle', live: this.angle },
      ])
    }
    const end = this.first ? this.typedEnd() : null
    if (this.first && end && distance(this.first, end) > 0) {
      preview.push({ kind: 'path', segments: grainArrowSegments(this.first, end), closed: false })
    }
    ctx.setPreview(preview)
    if (!this.first) return ctx.setPrompt('label.promptGrainStart', [modeField, ...pointFields(this.mouse)])
    ctx.setPrompt('label.promptGrainEnd', [
      { key: 'length', kind: 'length', labelKey: 'label.length', live: end ? distance(this.first, end) : undefined },
      { key: 'angle', kind: 'angle', labelKey: 'label.angle', live: end ? angleOf(this.first, end) : undefined },
    ])
  }
}
