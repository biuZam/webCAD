// Tool palette groups, Photoshop-style: one slot per group shows its last-used member; right-click (or a long
// press, or → on the keyboard) opens the group to pick another. Members are tools, tool modes (a tool plus the
// input that selects the mode, e.g. Circle in ellipse mode) or selection actions.

import { create } from 'zustand'
import type { ActionId } from '../tools/shortcuts'
import type { InputField, InputValues, ToolId } from '../tools/types'

export type VariantId = ToolId | ActionId | 'square' | 'circle3' | 'ellipse'

export interface Variant {
  id: VariantId
  /** The tool it activates (tool variants). */
  tool?: ToolId
  /** Input that puts the tool in this variant's mode; also how the active mode is recognised. */
  input?: InputValues
  /** A selection action instead of a tool. */
  action?: ActionId
}

const tool = (id: ToolId, input?: InputValues): Variant => ({ id, tool: id, input })
const mode = (id: VariantId, t: ToolId, input: InputValues): Variant => ({ id, tool: t, input })
const action = (id: ActionId): Variant => ({ id, action: id })

/** Palette slots in order; `null` draws a divider. */
export const GROUPS: readonly (readonly Variant[] | null)[] = [
  [tool('select')],
  null,
  [tool('line')],
  [tool('rectangle', { shape: 0 }), mode('square', 'rectangle', { shape: 1 })],
  [tool('circle', { mode: 0 }), mode('circle3', 'circle', { mode: 1 }), mode('ellipse', 'circle', { mode: 2 })],
  [tool('pen'), tool('arc')],
  [tool('centreLine')],
  [tool('perpendicular'), tool('parallel')],
  [tool('label')],
  null,
  [tool('move')],
  [tool('rotate')],
  [tool('scale')],
  [tool('mirror')],
  [tool('array')],
  [tool('trim')],
  null,
  [tool('fillet'), tool('chamfer')],
  [tool('offset'), tool('seamAllowance')],
  [tool('stitchLine')],
  [tool('stitchHoles')],
  [tool('punch'), tool('notch')],
  null,
  [tool('measure')],
  null,
  [action('flipH'), action('flipV')],
  [action('join')],
  [action('union'), action('difference')],
]

/**
 * The variant of `group` the active tool is in right now, if it belongs to the group: the one whose mode input
 * matches the tool's current fields (a tool without modes matches as is).
 */
export function activeVariant(group: readonly Variant[], activeTool: ToolId, fields: readonly InputField[]) {
  const live = new Map(fields.map((f) => [f.key, f.live]))
  return group.find(
    (v) => v.tool === activeTool && Object.entries(v.input ?? {}).every(([key, value]) => live.get(key) === value),
  )
}

const STORAGE_KEY = 'leatherdraft.palette.v1'

function load(): Record<number, VariantId> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<number, VariantId>
  } catch {
    return {}
  }
}

/** The member each group shows when none of it is active (last used), remembered per browser. */
export const usePaletteChoice = create<{
  chosen: Record<number, VariantId>
  choose: (g: number, v: VariantId) => void
}>()((set, get) => ({
  chosen: load(),
  choose: (g, v) => {
    if (get().chosen[g] === v) return
    const chosen = { ...get().chosen, [g]: v }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chosen))
    } catch {
      // Not remembered; fine.
    }
    set({ chosen })
  },
}))
