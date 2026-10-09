// Document store: the single place the project changes. See docs/ARCHITECTURE.md §4.

import { applyPatches, enablePatches, produceWithPatches, type Patch } from 'immer'
import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'
import type { Command } from './commands'
import { regenerateDerived } from './derived'
import { createProject } from './factory'
import type { Project } from './model'

enablePatches()

export interface HistoryEntry {
  labelKey: string
  patches: Patch[]
  inverse: Patch[]
}

export interface DocumentState {
  project: Project
  past: HistoryEntry[]
  future: HistoryEntry[]
  /** Incremented whenever load() replaces the project, so views can e.g. zoom to fit. */
  loads: number
  dispatch: (command: Command) => void
  undo: () => void
  redo: () => void
  /** Replace the whole project (open file, new project). Clears history. */
  load: (project: Project) => void
}

export type DocumentStore = StoreApi<DocumentState>

export function createDocumentStore(initial: Project = createProject()): DocumentStore {
  return createStore<DocumentState>()((set, get) => ({
    project: initial,
    past: [],
    future: [],
    loads: 0,

    dispatch(command) {
      const base = get().project
      const [project, patches, inverse] = produceWithPatches(base, (draft) => {
        command.recipe(draft)
        // Derived entities (stitch lines) follow their sources inside the same draft: one undo step.
        regenerateDerived(draft, base)
      })
      if (patches.length === 0) return
      set((s) => ({
        project,
        past: [...s.past, { labelKey: command.labelKey, patches, inverse }],
        future: [],
      }))
    },

    undo() {
      const { past, future, project } = get()
      const entry = past.at(-1)
      if (!entry) return
      set({ project: applyPatches(project, entry.inverse), past: past.slice(0, -1), future: [entry, ...future] })
    },

    redo() {
      const { past, future, project } = get()
      const entry = future[0]
      if (!entry) return
      set({ project: applyPatches(project, entry.patches), past: [...past, entry], future: future.slice(1) })
    },

    load(project) {
      set((s) => ({ project, past: [], future: [], loads: s.loads + 1 }))
    },
  }))
}

/** The app-wide document store. Tests should use createDocumentStore() instead. */
export const documentStore = createDocumentStore()

export function useDocument<T>(selector: (s: DocumentState) => T): T {
  return useStore(documentStore, selector)
}
