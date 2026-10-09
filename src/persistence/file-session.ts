// Which file the current project belongs to and whether it has unsaved changes.
// "Unsaved" is a reference comparison: Immer gives every change a new project object.

import { create } from 'zustand'
import { createProject } from '../document/factory'
import type { Project } from '../document/model'
import { SchemaError } from '../document/schema'
import { documentStore } from '../document/store'
import { openProjectFile, saveProjectFile, type FileRef } from './files'

export interface FileSessionState {
  file: FileRef | null
  /** The project object as last saved or opened; null if it has never been saved. */
  savedProject: Project | null
}

export const useFileSession = create<FileSessionState>()(() => ({ file: null, savedProject: null }))

export function isDirty(project: Project, saved: Project | null): boolean {
  // A brand-new empty project with nothing drawn doesn't count as unsaved work.
  if (saved === null) return project.pieces.some((p) => p.entities.length > 0)
  return project !== saved
}

export function hasUnsavedChanges(): boolean {
  return isDirty(documentStore.getState().project, useFileSession.getState().savedProject)
}

/** Result of a file action, for the UI to report. `errorKey` is a key in the `errors` namespace. */
export type FileActionResult =
  { status: 'done'; fileName: string | null } | { status: 'cancelled' } | { status: 'error'; errorKey: string }

function errorKeyOf(e: unknown): string {
  if (e instanceof SchemaError) return e.message.replace(/^errors:/, '')
  console.error('[LeatherDraft] File operation failed', e)
  return 'file.ioFailed'
}

/** `confirmDiscard` is asked only when there are unsaved changes; return false to keep them. */
export function newProject(confirmDiscard: () => boolean): FileActionResult {
  if (hasUnsavedChanges() && !confirmDiscard()) return { status: 'cancelled' }
  const project = createProject()
  documentStore.getState().load(project)
  useFileSession.setState({ file: null, savedProject: project })
  return { status: 'done', fileName: null }
}

export async function openProject(confirmDiscard: () => boolean): Promise<FileActionResult> {
  if (hasUnsavedChanges() && !confirmDiscard()) return { status: 'cancelled' }
  try {
    const result = await openProjectFile()
    if (!result) return { status: 'cancelled' }
    documentStore.getState().load(result.project)
    useFileSession.setState({ file: result.file, savedProject: result.project })
    return { status: 'done', fileName: result.file.fileName }
  } catch (e) {
    return { status: 'error', errorKey: errorKeyOf(e) }
  }
}

export async function saveProject(saveAs: boolean): Promise<FileActionResult> {
  const project = documentStore.getState().project
  try {
    const file = await saveProjectFile(project, useFileSession.getState().file, saveAs)
    if (!file) return { status: 'cancelled' }
    useFileSession.setState({ file, savedProject: project })
    return { status: 'done', fileName: file.fileName }
  } catch (e) {
    return { status: 'error', errorKey: errorKeyOf(e) }
  }
}
