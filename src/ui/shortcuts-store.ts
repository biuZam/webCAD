// T4.8 The user's shortcut bindings, remembered per browser (a preference, not part of the project), and
// what each command does.

import { create } from 'zustand'
import { toolSession } from '../canvas/tool-session'
import { assign, COMMAND_IDS, DEFAULT_BINDINGS, mergeSaved, type Bindings, type CommandId } from '../tools/shortcuts'
import type { ToolId } from '../tools/types'

const STORAGE_KEY = 'leatherdraft.shortcuts.v1'

function load(): Bindings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? mergeSaved(JSON.parse(saved)) : DEFAULT_BINDINGS
  } catch {
    return DEFAULT_BINDINGS
  }
}

function save(bindings: Bindings) {
  try {
    // Unbound commands are stored as null so a reload doesn't bring their default back.
    const out: Record<string, string | null> = {}
    for (const id of COMMAND_IDS) out[id] = bindings[id] ?? null
    localStorage.setItem(STORAGE_KEY, JSON.stringify(out))
  } catch {
    // Not remembered; fine.
  }
}

interface ShortcutState {
  bindings: Bindings
  /** Bind (or with null, unbind) a command; returns the command that lost the key, if any. */
  bind: (id: CommandId, key: string | null) => CommandId | null
  reset: () => void
}

export const useShortcuts = create<ShortcutState>()((set, get) => ({
  bindings: load(),
  bind: (id, key) => {
    const { bindings, displaced } = assign(get().bindings, id, key)
    save(bindings)
    set({ bindings })
    return displaced
  },
  reset: () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
    set({ bindings: DEFAULT_BINDINGS })
  },
}))

export function runCommand(id: CommandId) {
  switch (id) {
    case 'flipH':
      return toolSession.flip('horizontal')
    case 'flipV':
      return toolSession.flip('vertical')
    case 'join':
      return toolSession.join()
    case 'explode':
      return toolSession.explode()
    case 'union':
    case 'difference':
      return toolSession.boolean(id)
    default:
      return toolSession.setTool(id as ToolId)
  }
}
