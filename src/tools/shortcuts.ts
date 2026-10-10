// T4.8 Rebindable shortcuts: pure binding logic (the per-browser store is src/ui/shortcuts-store.ts).
// A binding is a letter key, optionally with Shift: "L", "Shift+J". Letters only: digits and . , - start
// typed values in the input bar, Space pans, and Ctrl/⌘/Alt combinations belong to the app and browser.
// Keys are matched by physical key (KeyboardEvent.code), so they work the same on any layout or with an IME.

import { TOOL_ORDER, TOOL_SHORTCUTS } from './index'
import type { ToolId } from './types'

/** Selection actions with shortcuts, besides the tools. */
export const ACTION_IDS = ['flipH', 'flipV', 'join', 'explode', 'union', 'difference'] as const
export type ActionId = (typeof ACTION_IDS)[number]
export type CommandId = ToolId | ActionId

export type Bindings = Partial<Record<CommandId, string>>

export const DEFAULT_BINDINGS: Bindings = {
  ...Object.fromEntries(Object.entries(TOOL_SHORTCUTS).map(([k, id]) => [id, k.toUpperCase()])),
  flipH: 'Shift+H',
  flipV: 'Shift+V',
  join: 'Shift+J',
  explode: 'Shift+X',
  union: 'Shift+U',
  difference: 'Shift+D',
}

/** Every bindable command, tools in palette order then actions. */
export const COMMAND_IDS: readonly CommandId[] = [...TOOL_ORDER.filter((id) => id !== null), ...ACTION_IDS]

/** The binding a key press stands for, or null if it can't be one. */
export function keyOf(e: Pick<KeyboardEvent, 'code' | 'shiftKey' | 'ctrlKey' | 'metaKey' | 'altKey'>): string | null {
  if (e.ctrlKey || e.metaKey || e.altKey) return null
  const letter = e.code.match(/^Key([A-Z])$/)?.[1]
  if (!letter) return null
  return e.shiftKey ? `Shift+${letter}` : letter
}

/** The command bound to `key`, if any. */
export function commandFor(bindings: Bindings, key: string): CommandId | null {
  for (const id of COMMAND_IDS) if (bindings[id] === key) return id
  return null
}

/**
 * Bind `key` to `id` (null: unbind it). A command that had the key loses it, and is reported as `displaced`
 * so the UI can say so.
 */
export function assign(
  bindings: Bindings,
  id: CommandId,
  key: string | null,
): { bindings: Bindings; displaced: CommandId | null } {
  const next: Bindings = { ...bindings }
  let displaced: CommandId | null = null
  if (key) {
    const holder = commandFor(next, key)
    if (holder && holder !== id) {
      next[holder] = undefined
      displaced = holder
    }
  }
  next[id] = key ?? undefined
  return { bindings: next, displaced }
}

/** Saved bindings over the defaults, keeping only well-formed entries for known commands. A saved key that
 * a default also uses goes to the saved command (the default holder loses it). */
export function mergeSaved(saved: unknown): Bindings {
  let out: Bindings = { ...DEFAULT_BINDINGS }
  if (!saved || typeof saved !== 'object') return out
  for (const id of COMMAND_IDS) {
    const v = (saved as Record<string, unknown>)[id]
    if (v === null || (typeof v === 'string' && /^(Shift\+)?[A-Z]$/.test(v))) out = assign(out, id, v).bindings
  }
  return out
}
