// UI-only state. Not part of undo history or the project file.

import { create } from 'zustand'
import type { Id } from '../document/model'
import type { Vec2 } from '../lib/vec2'
import type { SnapKind } from '../snapping/engine'
import type { I18nKey, InputField, PreviewShape, PromptParams, ToolId } from '../tools/types'

/** A short message in the header. Error keys are in the `errors` namespace, info keys under `common:file.*`. */
export type Notice =
  | { kind: 'error'; errorKey: string }
  | {
      kind: 'info'
      key: 'file.saved' | 'file.opened' | 'file.restored' | 'file.created' | 'file.exported' | 'file.offlineReady'
      name?: string
    }
  /** A new version is installed and waiting; the notice offers Reload. */
  | { kind: 'update' }

export interface UiState {
  /** Cursor position in mm (after snapping), or null when the pointer is outside the canvas. */
  cursor: Vec2 | null
  /** CSS pixels per millimetre. */
  zoom: number
  /** Null means "the first layer". */
  activeLayerId: Id | null
  /** Mirrors ToolSession's selection (the session owns it). */
  selection: readonly Id[]
  snaps: ReadonlySet<SnapKind>
  activeTool: ToolId
  toolCursor: string
  prompt: { key: I18nKey; fields: InputField[]; params?: PromptParams }
  /** Tool preview shapes for the canvas overlay. Changes on every mouse move: don't select it in React. */
  preview: PreviewShape[]
  notice: Notice | null
  showNotice: (notice: Notice | null) => void
  setCursor: (cursor: Vec2 | null) => void
  setZoom: (zoom: number) => void
  setActiveLayer: (id: Id) => void
  toggleSnap: (kind: SnapKind) => void
}

export const useUiStore = create<UiState>()((set) => ({
  cursor: null,
  zoom: 1,
  activeLayerId: null,
  selection: [],
  // Tangent and nearest are off by default: they capture almost everywhere near a curve.
  snaps: new Set<SnapKind>(['endpoint', 'midpoint', 'centre', 'intersection', 'perpendicular', 'grid']),
  activeTool: 'select',
  toolCursor: 'default',
  prompt: { key: 'select.prompt', fields: [] },
  preview: [],
  notice: null,
  showNotice: (notice) => set({ notice }),
  setCursor: (cursor) => set({ cursor }),
  setZoom: (zoom) => set({ zoom }),
  setActiveLayer: (activeLayerId) => set({ activeLayerId }),
  toggleSnap: (kind) =>
    set((s) => {
      const snaps = new Set(s.snaps)
      if (!snaps.delete(kind)) snaps.add(kind)
      return { snaps }
    }),
}))
