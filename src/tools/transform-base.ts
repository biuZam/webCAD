// Shared behaviour for the transform tools (move, rotate, scale, mirror):
//   1. "pick" step: if nothing is selected, the tool selects like the Select tool (click / box);
//      Enter or right-click continues. With a selection already, this step is skipped.
//   2. The tool's own steps (subclass), with a live preview of the transformed selection.
// After each commit the result stays selected and the tool goes back to its first step, ready to repeat.

import { findEntity, transformEntities } from '../document/commands'
import type { Affine } from '../geometry/transform'
import { transformEntity } from '../geometry/transform'
import type { Vec2 } from '../lib/vec2'
import { SelectTool } from './select'
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

export abstract class TransformTool implements Tool {
  abstract readonly id: ToolId
  readonly cursor = 'crosshair'
  protected picking = false
  protected mouse: Vec2 | null = null
  protected typed: InputValues = {}
  /** Sticky "keep original" option. */
  protected copy: boolean
  private readonly picker = new SelectTool(false)

  constructor(copyByDefault: boolean) {
    this.copy = copyByDefault
  }

  // The picker needs the raw pointer; the transform steps snap.
  get snaps() {
    return !this.picking
  }

  /** History label for the command, in the `common` namespace. */
  protected abstract readonly labelKey: string
  /** Back to the tool's first step after picking or committing. */
  protected abstract resetSteps(): void
  /** True while the tool is part-way through its own steps (so Esc steps back instead of leaving). */
  protected abstract busy(): boolean
  /** Handle a click in the tool's own steps. Return a matrix to commit it. */
  protected abstract click(point: Vec2, ctx: ToolContext): Affine | null
  /** Typed values committed with Enter. Return a matrix to commit it. */
  protected abstract enter(values: InputValues, ctx: ToolContext): Affine | null
  /** The transform implied by the mouse and typed values right now, for the preview. */
  protected abstract current(): Affine | null
  /** Extra preview shapes (rubber band, axis…). */
  protected abstract guides(): PreviewShape[]
  /** Prompt and fields for the current step (the copy toggle is appended automatically). */
  protected abstract step(): { prompt: I18nKey; fields: InputField[] }

  /** The point a pointer event stands for (e.g. Shift-constrained). Called before click/move handling. */
  protected track(e: ToolPointerEvent, _ctx: ToolContext): Vec2 {
    return e.point
  }

  activate(ctx: ToolContext) {
    this.picking = ctx.selection.length === 0
    this.typed = {}
    this.resetSteps()
    if (this.picking) this.picker.activate(ctx)
    this.update(ctx)
  }

  snapFrom(): Vec2 | null {
    return null
  }

  onPointerDown(e: ToolPointerEvent, ctx: ToolContext) {
    if (e.button === 2) return this.finish(ctx)
    if (this.picking) return this.picker.onPointerDown(e, ctx)
    if (e.button !== 0) return
    this.mouse = this.track(e, ctx)
    this.commit(this.click(this.mouse, ctx), ctx)
  }

  onPointerMove(e: ToolPointerEvent, ctx: ToolContext) {
    if (this.picking) {
      this.picker.onPointerMove(e, ctx)
      return
    }
    this.mouse = this.track(e, ctx)
    this.update(ctx)
  }

  onPointerUp(e: ToolPointerEvent, ctx: ToolContext) {
    if (this.picking) {
      this.picker.onPointerUp(e, ctx)
      this.update(ctx)
    }
  }

  onPointerLeave(ctx: ToolContext) {
    // While picking, behave like Select; otherwise keep the preview so values can be typed in the input bar.
    if (this.picking) this.picker.onPointerLeave(ctx)
  }

  onInput(values: InputValues, commit: boolean, ctx: ToolContext) {
    if (values.copy !== undefined) this.copy = values.copy === 1
    const { copy: _, ...rest } = values
    this.typed = rest
    if (commit && !this.picking) this.commit(this.enter(rest, ctx), ctx)
    else this.update(ctx)
  }

  /** Enter with nothing typed, right-click: finish picking and start transforming. */
  finish(ctx: ToolContext) {
    if (this.picking && ctx.selection.length > 0) {
      this.picking = false
      this.resetSteps()
      this.update(ctx)
    }
  }

  deactivate(ctx: ToolContext) {
    this.picker.deactivate(ctx)
    this.resetSteps()
    this.typed = {}
  }

  cancel(ctx: ToolContext) {
    if (this.picking) return this.picker.cancel(ctx)
    if (this.busy()) {
      this.resetSteps()
      this.typed = {}
      this.update(ctx)
      return true
    }
    return false
  }

  private commit(matrix: Affine | null, ctx: ToolContext) {
    if (matrix) {
      const ids = ctx.selection.filter((id) => findEntity(ctx.project, id))
      const { command, resultIds } = transformEntities(ids, matrix, { copy: this.copy, labelKey: this.labelKey })
      ctx.dispatch(command)
      ctx.setSelection(resultIds)
      this.resetSteps()
    }
    this.typed = {}
    this.update(ctx)
  }

  protected update(ctx: ToolContext) {
    if (this.picking) {
      ctx.setPrompt('transform.promptPick', [])
      return
    }
    const m = this.current()
    const preview: PreviewShape[] = []
    if (m) {
      for (const id of ctx.selection) {
        const found = findEntity(ctx.project, id)
        if (found) preview.push({ kind: 'entity', entity: transformEntity(found.entity, m) })
      }
    }
    ctx.setPreview([...preview, ...this.guides()])
    const { prompt, fields } = this.step()
    ctx.setPrompt(prompt, [
      ...fields,
      { key: 'copy', kind: 'toggle', labelKey: 'transform.copy', live: this.copy ? 1 : 0 },
    ])
  }
}
