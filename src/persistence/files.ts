// T1.7 Open / save the native `.json` project file.
// Uses the File System Access API where available (Chrome, Edge) so Save keeps writing to the same file;
// elsewhere falls back to a download and an <input type="file">.

import type { Project } from '../document/model'
import { migrateProject, SchemaError } from '../document/schema'

// The pickers are not in TypeScript's DOM lib yet (WICG File System Access).
interface FilePickerOptions {
  suggestedName?: string
  types?: { description?: string; accept: Record<string, string[]> }[]
  excludeAcceptAllOption?: boolean
}
declare global {
  interface Window {
    showSaveFilePicker?: (options?: FilePickerOptions) => Promise<FileSystemFileHandle>
    showOpenFilePicker?: (options?: FilePickerOptions) => Promise<FileSystemFileHandle[]>
  }
  interface FileSystemHandle {
    queryPermission?: (d: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>
    requestPermission?: (d: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>
  }
}

const PICKER_TYPES = [{ description: 'LeatherDraft project', accept: { 'application/json': ['.json'] } }]

export function serializeProject(project: Project): string {
  return JSON.stringify(project, null, 2) + '\n'
}

export function parseProjectFile(text: string): Project {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new SchemaError('errors:file.notJson')
  }
  return migrateProject(json)
}

/** A safe default file name from the project name. */
export function fileNameFor(project: Project): string {
  const base = project.name.trim().replace(/[\\/:*?"<>|]+/g, '-') || 'pattern'
  return `${base}.json`
}

const isAbort = (e: unknown) => e instanceof DOMException && e.name === 'AbortError'

export interface FileRef {
  fileName: string
  handle: FileSystemFileHandle | null
}

async function writable(handle: FileSystemFileHandle): Promise<boolean> {
  const opts = { mode: 'readwrite' } as const
  if (!handle.queryPermission) return true
  if ((await handle.queryPermission(opts)) === 'granted') return true
  return (await handle.requestPermission?.(opts)) === 'granted'
}

/**
 * Save the project. With a handle (and not `saveAs`) it overwrites that file; otherwise it asks where.
 * Returns where it was saved, or null if the user cancelled.
 */
export async function saveProjectFile(
  project: Project,
  current: FileRef | null,
  saveAs: boolean,
): Promise<FileRef | null> {
  const text = serializeProject(project)
  try {
    let handle = !saveAs ? (current?.handle ?? null) : null
    if (handle && !(await writable(handle))) handle = null
    if (!handle && window.showSaveFilePicker) {
      handle = await window.showSaveFilePicker({
        suggestedName: current?.fileName ?? fileNameFor(project),
        types: PICKER_TYPES,
      })
    }
    if (handle) {
      const stream = await handle.createWritable()
      await stream.write(text)
      await stream.close()
      return { fileName: handle.name, handle }
    }
  } catch (e) {
    if (isAbort(e)) return null
    throw e
  }
  // Fallback: download. The browser decides where it goes; there is no handle to reuse.
  const fileName = current?.fileName ?? fileNameFor(project)
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  Object.assign(document.createElement('a'), { href: url, download: fileName }).click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
  return { fileName, handle: null }
}

function pickWithInput(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.json,application/json' })
    input.addEventListener('change', () => resolve(input.files?.[0] ?? null))
    input.addEventListener('cancel', () => resolve(null))
    input.click()
  })
}

/** Ask for a project file and parse it. Returns null if the user cancelled; throws SchemaError for bad files. */
export async function openProjectFile(): Promise<{ project: Project; file: FileRef } | null> {
  let file: File | null
  let handle: FileSystemFileHandle | null = null
  try {
    if (window.showOpenFilePicker) {
      ;[handle] = await window.showOpenFilePicker({ types: PICKER_TYPES })
      file = await handle.getFile()
    } else {
      file = await pickWithInput()
    }
  } catch (e) {
    if (isAbort(e)) return null
    throw e
  }
  if (!file) return null
  return { project: parseProjectFile(await file.text()), file: { fileName: file.name, handle } }
}
