import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { addEntities, renameProject } from '../document/commands'
import { createProject } from '../document/factory'
import { createDocumentStore } from '../document/store'
import { AUTOSAVE_KEY, restoreAutosave, startAutosave, type AutosaveRecord, type KeyValueStorage } from './autosave'

function memoryStorage(): KeyValueStorage & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>()
  return {
    data,
    get: async (k) => data.get(k),
    set: async (k, v) => {
      data.set(k, structuredClone(v))
    },
  }
}
const extras = () => ({ fileName: 'wallet.json', fileHandle: null, savedToFile: false })

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('autosave', () => {
  it('writes once, shortly after the last of several changes', async () => {
    const storage = memoryStorage()
    const store = createDocumentStore(createProject())
    const autosaver = startAutosave(store, storage, extras, 500)
    store.getState().dispatch(renameProject('A'))
    vi.advanceTimersByTime(300)
    store.getState().dispatch(renameProject('B'))
    vi.advanceTimersByTime(300)
    expect(storage.data.has(AUTOSAVE_KEY)).toBe(false)
    vi.advanceTimersByTime(300)
    await Promise.resolve()
    const record = storage.data.get(AUTOSAVE_KEY) as AutosaveRecord
    expect(record.project.name).toBe('B')
    expect(record.fileName).toBe('wallet.json')
    autosaver.stop()
  })

  it('flushes a pending change on stop, and touch() writes without a project change', async () => {
    const storage = memoryStorage()
    const store = createDocumentStore(createProject())
    const autosaver = startAutosave(store, storage, extras, 500)
    autosaver.touch()
    autosaver.stop()
    await Promise.resolve()
    expect(storage.data.has(AUTOSAVE_KEY)).toBe(true)
  })

  it('restores a saved project into a fresh store, with history cleared', async () => {
    const storage = memoryStorage()
    const source = createDocumentStore(createProject('Belt'))
    const autosaver = startAutosave(source, storage, extras, 0)
    source.getState().dispatch(renameProject('Belt v2'))
    vi.runAllTimers()
    await Promise.resolve()
    autosaver.stop()

    const target = createDocumentStore()
    const record = await restoreAutosave(target, storage)
    expect(record?.project.name).toBe('Belt v2')
    expect(target.getState().project.name).toBe('Belt v2')
    expect(target.getState().past).toHaveLength(0)
    expect(target.getState().loads).toBe(1)
  })

  it('ignores a corrupt record and never clobbers work already started', async () => {
    const storage = memoryStorage()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    storage.data.set(AUTOSAVE_KEY, { project: { schemaVersion: 1 } })
    const store = createDocumentStore()
    expect(await restoreAutosave(store, storage)).toBeNull()

    storage.data.set(AUTOSAVE_KEY, {
      savedAt: 0,
      project: createProject('Saved'),
      fileName: null,
      fileHandle: null,
      savedToFile: true,
    })
    const busy = createDocumentStore()
    busy.getState().dispatch(addEntities(busy.getState().project.pieces[0].id, []))
    busy.getState().dispatch(renameProject('Typing already'))
    expect(await restoreAutosave(busy, storage)).toBeNull()
    expect(busy.getState().project.name).toBe('Typing already')
  })
})
