// Routes input events to the active tool and owns its preview, prompt and the selection.
// The canvas feeds it pointer events in mm; React feeds it keys and typed values.

import { findEntity, transformEntities, type Command } from '../document/commands'
import type { Id, Layer, LineStyle, Project } from '../document/model'
import type { DocumentStore } from '../document/store'
import { emptyBounds, entityBounds, isEmpty } from '../geometry/bounds'
import { mirrorAcross } from '../geometry/transform'
import type { Vec2 } from '../lib/vec2'
import { snap, type SnapKind } from '../snapping/engine'
import { booleanSelection, joinSelection, type PathOp } from './path-ops'
import { gridSpacing } from '../snapping/grid'
import type {
  I18nKey,
  InputField,
  InputTexts,
  InputValues,
  PreviewShape,
  PromptParams,
  Tool,
  ToolContext,
  ToolId,
  ToolPointerEvent,
} from './types'

/** Object snaps capture within this many CSS px of the cursor. */
export const SNAP_TOLERANCE_PX = 10

export interface SessionView {
  /** CSS px per mm. */
  zoom: number
  /** Enabled snap kinds, including 'grid'. */
  snaps: ReadonlySet<SnapKind>
  activeLayerId: string | null
}

export interface SessionListener {
  preview(shapes: PreviewShape[]): void
  prompt(promptKey: I18nKey, fields: InputField[], params?: PromptParams): void
  tool(id: ToolId, cursor: string): void
  /** Snapped pointer position in mm, or null when the pointer left the canvas. */
  cursor(point: Vec2 | null): void
  selection(ids: readonly Id[]): void
}

export type PointerInput = Omit<ToolPointerEvent, 'point' | 'raw' | 'snap'> & { raw: Vec2 }

/** Default line style for new entities, by the kind of layer they're drawn on. */
export const LINE_STYLE_FOR_LAYER: Record<Layer['kind'], LineStyle> = {
  cut: 'solid',
  stitch: 'dashed',
  reference: 'dotted',
  notes: 'solid',
}

/** Ids of entities the user may select: on visible, unlocked layers. */
export function selectableIds(project: Project): Id[] {
  const ok = new Set(project.layers.filter((l) => l.visible && !l.locked).map((l) => l.id))
  return project.pieces.flatMap((p) => p.entities.filter((e) => ok.has(e.layerId)).map((e) => e.id))
}

export class ToolSession {
  private tool: Tool
  private readonly ctx: ToolContext
  private readonly store: DocumentStore
  private readonly tools: Record<ToolId, Tool>
  private readonly getView: () => SessionView
  private readonly listener: SessionListener
  private cursorMarker: PreviewShape | null = null
  private toolPreview: PreviewShape[] = []
  /** Last pointer position over the canvas, replayed when the project changes so previews never go stale. */
  private lastMove: PointerInput | null = null
  private replayQueued = false
  private selection: readonly Id[] = []

  constructor(
    store: DocumentStore,
    tools: Record<ToolId, Tool>,
    getView: () => SessionView,
    listener: SessionListener,
  ) {
    this.store = store
    this.tools = tools
    this.getView = getView
    this.listener = listener
    this.tool = tools.select
    // A getter-based context so tools always read the current project, zoom and selection.
    const getSelection = () => this.selection
    this.ctx = {
      get project() {
        return store.getState().project
      },
      get pixelSize() {
        return 1 / getView().zoom
      },
      get selection() {
        return getSelection()
      },
      setSelection: (ids) => this.setSelection(ids),
      target: () => this.target(),
      dispatch: (command: Command) => store.getState().dispatch(command),
      setPreview: (shapes) => {
        this.toolPreview = shapes
        this.emitPreview()
      },
      setPrompt: (key, fields, params) => listener.prompt(key, fields, params),
    }
    // Drop selected ids that no longer exist or became unselectable (undo, delete, layer hidden/locked).
    store.subscribe((s, prev) => {
      if (s.project === prev.project || this.selection.length === 0) return
      const ok = new Set(selectableIds(s.project))
      const kept = this.selection.filter((id) => ok.has(id))
      if (kept.length !== this.selection.length) this.setSelection(kept)
    })
    // Hover highlights, snap markers and transform previews are computed from the project at the last
    // pointer move. When the project changes some other way (panel edit, undo, keyboard), recompute them.
    // Deferred so it never re-enters a tool that is in the middle of dispatching.
    store.subscribe((s, prev) => {
      if (s.project === prev.project || !this.lastMove || this.replayQueued) return
      this.replayQueued = true
      queueMicrotask(() => {
        this.replayQueued = false
        if (this.lastMove) this.pointerMove(this.lastMove)
      })
    })
  }

  get activeToolId(): ToolId {
    return this.tool.id
  }

  setTool(id: ToolId) {
    if (this.tool.deactivate) this.tool.deactivate(this.ctx)
    else this.tool.cancel(this.ctx)
    this.tool = this.tools[id]
    this.toolPreview = []
    this.emitPreview()
    this.listener.tool(id, this.tool.cursor)
    this.tool.activate(this.ctx)
  }

  pointerDown(e: PointerInput) {
    if (this.tool.draws && e.button === 0 && !this.target()) {
      // Say why nothing happens instead of silently ignoring the click.
      this.listener.prompt('common.layerUnavailable', [])
      return
    }
    this.tool.onPointerDown?.(this.toToolEvent(e), this.ctx)
  }

  pointerMove(e: PointerInput) {
    this.lastMove = e
    const te = this.toToolEvent(e)
    this.cursorMarker =
      te.snap && te.snap !== 'grid'
        ? { kind: 'snap', at: te.point, snapKind: te.snap }
        : { kind: 'point', at: te.point }
    this.listener.cursor(te.point)
    this.tool.onPointerMove?.(te, this.ctx)
    this.emitPreview()
  }

  doubleClick(e: PointerInput) {
    this.tool.onDoubleClick?.(this.toToolEvent(e), this.ctx)
  }

  pointerUp(e: PointerInput) {
    this.tool.onPointerUp?.(this.toToolEvent(e), this.ctx)
  }

  pointerLeave() {
    this.lastMove = null
    this.tool.onPointerLeave?.(this.ctx)
    this.cursorMarker = null
    this.listener.cursor(null)
    this.emitPreview()
  }

  input(values: InputValues, commit: boolean, texts: InputTexts = {}) {
    this.tool.onInput?.(values, commit, this.ctx, texts)
  }

  finish() {
    this.tool.finish?.(this.ctx)
  }

  /** Delete / Backspace: the tool's own meaning (e.g. remove the last point), else delete the selection. */
  deleteKey() {
    if (this.tool.undoStep) this.tool.undoStep(this.ctx)
    else this.tool.onDelete?.(this.ctx)
  }

  /** Esc: cancel the tool's current operation, or return to Select if it was idle. */
  cancel() {
    if (!this.tool.cancel(this.ctx) && this.tool.id !== 'select') this.setTool('select')
  }

  /** M6: flip the selection in place about the centre of its bounds. */
  flip(direction: 'horizontal' | 'vertical') {
    const { project } = this.store.getState()
    const b = emptyBounds()
    for (const id of this.selection) {
      const found = findEntity(project, id)
      if (found) entityBounds(found.entity, b)
    }
    if (isEmpty(b)) return
    const cx = (b.minX + b.maxX) / 2
    const cy = (b.minY + b.maxY) / 2
    // Horizontal flip mirrors left↔right, i.e. across a vertical axis.
    const m = direction === 'horizontal' ? mirrorAcross([cx, 0], [cx, 1]) : mirrorAcross([0, cy], [1, cy])
    this.store
      .getState()
      .dispatch(transformEntities(this.selection, m, { copy: false, labelKey: 'history.flip' }).command)
  }

  /** M9 Join the selected open paths (or close one). */
  join() {
    this.applyPathOp(joinSelection(this.store.getState().project, this.selection), 'common.joinNone')
  }

  /** M9 Union of the selected closed shapes, or the largest minus the others. */
  boolean(op: 'union' | 'difference') {
    this.applyPathOp(booleanSelection(this.store.getState().project, this.selection, op), 'common.booleanNone')
  }

  private applyPathOp(op: PathOp | null, failKey: I18nKey) {
    if (!op) return this.listener.prompt(failKey, [])
    this.store.getState().dispatch(op.command)
    this.setSelection(op.resultIds)
  }

  /** Select these entities (switching to Select), e.g. what an import just added. */
  select(ids: readonly Id[]) {
    if (this.tool.id !== 'select') this.setTool('select')
    this.setSelection(ids)
  }

  selectAll() {
    if (this.tool.id !== 'select') this.setTool('select')
    this.setSelection(selectableIds(this.store.getState().project))
  }

  private setSelection(ids: readonly Id[]) {
    this.selection = ids
    this.listener.selection(ids)
  }

  private target() {
    const { project } = this.store.getState()
    const { activeLayerId } = this.getView()
    const layer = project.layers.find((l) => l.id === activeLayerId) ?? project.layers[0]
    const piece = project.pieces[0]
    if (!layer || !piece || !layer.visible || layer.locked) return null
    return { pieceId: piece.id, layerId: layer.id }
  }

  private toToolEvent(e: PointerInput): ToolPointerEvent {
    if (this.tool.snaps === false) return { ...e, point: e.raw, snap: null }
    const view = this.getView()
    const result = snap(this.store.getState().project, e.raw, {
      enabled: view.snaps,
      tolerance: SNAP_TOLERANCE_PX / view.zoom,
      gridStep: gridSpacing(view.zoom).minor,
      from: this.tool.snapFrom?.() ?? null,
      exclude: this.tool.snapExclude?.(),
    })
    return { ...e, point: result?.point ?? e.raw, snap: result?.kind ?? null }
  }

  private emitPreview() {
    this.listener.preview(this.cursorMarker ? [...this.toolPreview, this.cursorMarker] : this.toolPreview)
  }
}
