// T1.7 Autosave: the current project is written to IndexedDB shortly after every change and
// restored on the next start. Files never leave the device (PRD privacy requirement).

import type { Project } from '../document/model'
import { migrateProject } from '../document/schema'
import type { DocumentStore } from '../document/store'

/** Minimal async key-value API; idb-keyval in the app, an in-memory map in tests. */
export interface KeyValueStorage {
  get(key: string): Promise<unknown>
  set(key: string, value: unknown): Promise<void>
}

export const AUTOSAVE_KEY = 'leatherdraft.autosave.v1'
export const AUTOSAVE_DELAY_MS = 500

export interface AutosaveRecord {
  savedAt: number
  project: Project
  /** Name of the file this project was last opened from / saved to, if any. */
  fileName: string | null
  /** A File System Access handle (structured-cloneable) so Save keeps writing to the same file. */
  fileHandle: FileSystemFileHandle | null
  /** False if the project had changes not yet saved to `fileName` when autosaved. */
  savedToFile: boolean
}

export type AutosaveExtras = Omit<AutosaveRecord, 'savedAt' | 'project'>

/**
 * Load the autosaved project into `store` if there is one and it is valid.
 * Returns the record, or null if nothing was restored. Never throws: a corrupt record is ignored.
 */
export async function restoreAutosave(store: DocumentStore, storage: KeyValueStorage): Promise<AutosaveRecord | null> {
  try {
    const record = (await storage.get(AUTOSAVE_KEY)) as AutosaveRecord | undefined
    if (!record?.project) return null
    const project = migrateProject(record.project)
    // Don't clobber work the user started before IndexedDB answered.
    if (store.getState().past.length > 0) return null
    store.getState().load(project)
    return { ...record, project }
  } catch (error) {
    console.warn('[LeatherDraft] Ignoring unreadable autosave', error)
    return null
  }
}

export interface Autosaver {
  /** Schedule a write for a change the store can't see (e.g. the project was just saved to a file). */
  touch(): void
  /** Write any pending change now and stop. */
  stop(): void
}

/**
 * Write the project `delayMs` after the last change (and immediately when the page is hidden).
 * `extras` supplies the current file metadata at write time.
 */
export function startAutosave(
  store: DocumentStore,
  storage: KeyValueStorage,
  extras: () => AutosaveExtras,
  delayMs = AUTOSAVE_DELAY_MS,
): Autosaver {
  let timer: ReturnType<typeof setTimeout> | undefined
  let pending = false

  const write = () => {
    clearTimeout(timer)
    if (!pending) return
    pending = false
    const record: AutosaveRecord = { savedAt: Date.now(), project: store.getState().project, ...extras() }
    storage.set(AUTOSAVE_KEY, record).catch((error) => console.warn('[LeatherDraft] Autosave failed', error))
  }
  const schedule = () => {
    pending = true
    clearTimeout(timer)
    timer = setTimeout(write, delayMs)
  }

  const unsubscribe = store.subscribe((s, prev) => {
    if (s.project !== prev.project) schedule()
  })
  const onHide = () => {
    if (document.visibilityState === 'hidden') write()
  }
  const hasDocument = typeof document !== 'undefined'
  if (hasDocument) {
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', write)
  }

  return {
    touch: schedule,
    stop() {
      write()
      unsubscribe()
      if (hasDocument) {
        document.removeEventListener('visibilitychange', onHide)
        window.removeEventListener('pagehide', write)
      }
    },
  }
}
