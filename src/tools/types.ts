// Tool framework contracts. Tools are plain state machines: no React, no Paper.js.
// See docs/ARCHITECTURE.md §6.

import type { ParseKeys } from 'i18next'
import type { Command } from '../document/commands'
import type { Entity, Id, Project, Segment } from '../document/model'
import type { Vec2 } from '../lib/vec2'
import type { SnapKind } from '../snapping/engine'

export type ToolId =
  | 'select'
  | 'line'
  | 'rectangle'
  | 'circle'
  | 'move'
  | 'rotate'
  | 'scale'
  | 'mirror'
  | 'offset'
  | 'stitchLine'
  | 'stitchHoles'
  | 'pen'
  | 'arc'
  | 'fillet'
  | 'chamfer'
  | 'centreLine'
  | 'measure'
  | 'perpendicular'

/** A key in the `tools` namespace (translate with `useTranslation('tools')`). */
export type I18nKey = ParseKeys<'tools'>

/** Values interpolated into a prompt, e.g. { max: '12.5' }. Lengths are passed in mm, already formatted. */
export type PromptParams = Record<string, string | number>

/** A typed numeric field shown in the input bar while a tool needs it. */
export interface InputField {
  key: string
  /**
   * length: mm, typed in display units · angle: degrees · factor: plain number · toggle: checkbox, 1 or 0 ·
   * choice: a select over `options`, value = option index.
   */
  kind: 'length' | 'angle' | 'factor' | 'toggle' | 'choice'
  /** A readout (e.g. a measurement): shown formatted, not editable. */
  readOnly?: boolean
  /** Option labels for `choice` fields: translation keys, or literal text such as "3.85 mm". */
  options?: (I18nKey | { text: string })[]
  labelKey: I18nKey
  /** Current value implied by the mouse (or the toggle's state); shown as the placeholder. */
  live?: number
}

/** Typed values by field key (mm or degrees). Missing = not typed, so the tool uses the mouse instead. */
export type InputValues = Partial<Record<string, number>>

/** Preview geometry, in mm, drawn on the canvas overlay. */
export type PreviewShape =
  | { kind: 'path'; segments: Segment[]; closed: boolean; dashed?: boolean }
  | { kind: 'circle'; center: Vec2; radius: number }
  /** Plain cursor position. */
  | { kind: 'point'; at: Vec2 }
  /** Cursor captured by an object snap; drawn with that snap's marker. */
  | { kind: 'snap'; at: Vec2; snapKind: SnapKind }
  /** An existing entity highlighted (e.g. under the cursor in Select). */
  | { kind: 'entity'; entity: Entity }
  /** A path anchor shown for node editing: square = corner, round = smooth. */
  | { kind: 'node'; at: Vec2; smooth: boolean; active?: boolean }
  /** A Bézier handle: line from its anchor to the handle point. */
  | { kind: 'handle'; from: Vec2; to: Vec2 }

export interface ToolPointerEvent {
  /** Pointer position in mm after snapping. */
  point: Vec2
  /** Pointer position in mm before snapping. */
  raw: Vec2
  /** Which snap moved `point`, if any. */
  snap: SnapKind | null
  button: number
  shift: boolean
  alt: boolean
}

export interface ToolContext {
  readonly project: Project
  readonly selection: readonly Id[]
  setSelection(ids: readonly Id[]): void
  /** Where new entities go: the active piece and layer. Null when the active layer is hidden or locked. */
  target(): { pieceId: Id; layerId: Id } | null
  dispatch(command: Command): void
  setPreview(shapes: PreviewShape[]): void
  /** Status-bar prompt and the input fields for the tool's current step. */
  setPrompt(promptKey: I18nKey, fields: InputField[], params?: PromptParams): void
  /** Size of one CSS pixel in mm at the current zoom (for pick tolerances). */
  readonly pixelSize: number
}

export interface Tool {
  readonly id: ToolId
  readonly cursor: string
  /** True for tools that create entities on the active layer; they are blocked (with a prompt) when it's locked or hidden. */
  readonly draws?: boolean
  /** False for tools that need the raw pointer (Select). Default true. */
  readonly snaps?: boolean
  /** Reference point for perpendicular/tangent snaps: usually the tool's previous point. */
  snapFrom?(): Vec2 | null
  /** An entity to leave out of snapping (e.g. the path whose point is being dragged). */
  snapExclude?(): Id | null
  /** Double-click on the canvas. */
  onDoubleClick?(e: ToolPointerEvent, ctx: ToolContext): void
  /** Called when the tool becomes active; set the initial prompt here. */
  activate(ctx: ToolContext): void
  onPointerDown?(e: ToolPointerEvent, ctx: ToolContext): void
  onPointerMove?(e: ToolPointerEvent, ctx: ToolContext): void
  onPointerUp?(e: ToolPointerEvent, ctx: ToolContext): void
  /** The pointer left the canvas (e.g. to the panels). Drop hover-only feedback here. */
  onPointerLeave?(ctx: ToolContext): void
  /** Typed values changed (`commit` false: live preview) or Enter was pressed (`commit` true). */
  onInput?(values: InputValues, commit: boolean, ctx: ToolContext): void
  /** Enter with nothing typed, double-click or right-click: complete the current operation. */
  finish?(ctx: ToolContext): void
  /** Backspace/Delete while drawing: step back one point. Takes precedence over onDelete. */
  undoStep?(ctx: ToolContext): void
  /** Backspace/Delete when the tool has no undoStep: delete the selection. */
  onDelete?(ctx: ToolContext): void
  /** Esc. Returns false if there was nothing in progress, so the session can fall back to Select. */
  cancel(ctx: ToolContext): boolean
  /**
   * Switching to another tool. Defaults to cancel(). Tools whose Esc does more than abort the current
   * gesture (Select's Esc clears the selection) override this so switching tools keeps the selection.
   */
  deactivate?(ctx: ToolContext): void
}
