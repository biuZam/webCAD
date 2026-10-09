// Restores the last session and starts autosave. Runs after the first render so the app is usable at once.

import { get as idbGet, set as idbSet } from 'idb-keyval'
import { useUiStore } from '../canvas/ui-store'
import { acceptanceProject, perfProject } from '../document/fixtures'
import { documentStore } from '../document/store'
import { restoreAutosave, startAutosave, type KeyValueStorage } from '../persistence/autosave'
import { hasUnsavedChanges, useFileSession } from '../persistence/file-session'

const idbStorage: KeyValueStorage = { get: (key) => idbGet(key), set: (key, value) => idbSet(key, value) }

export async function startSession() {
  // Dev/test fixtures: load one and leave autosave off, so it can never overwrite the user's real work.
  const fixture = new URLSearchParams(location.search).get('fixture')
  if (fixture === 'acceptance' || fixture === 'perf') {
    const project = fixture === 'perf' ? perfProject() : acceptanceProject()
    documentStore.getState().load(project)
    useFileSession.setState({ file: null, savedProject: project })
    return
  }

  const record = await restoreAutosave(documentStore, idbStorage)
  if (record) {
    useFileSession.setState({
      file: record.fileName ? { fileName: record.fileName, handle: record.fileHandle } : null,
      savedProject: record.savedToFile ? record.project : null,
    })
    useUiStore.getState().showNotice({ kind: 'info', key: 'file.restored' })
  }

  const autosaver = startAutosave(documentStore, idbStorage, () => {
    const { file } = useFileSession.getState()
    return { fileName: file?.fileName ?? null, fileHandle: file?.handle ?? null, savedToFile: !hasUnsavedChanges() }
  })
  // Saving to a file doesn't change the project, but the record's "saved" flag must still be updated.
  useFileSession.subscribe(() => autosaver.touch())
}
