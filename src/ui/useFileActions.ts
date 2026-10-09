import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useUiStore } from '../canvas/ui-store'
import { useDocument } from '../document/store'
import {
  isDirty,
  newProject,
  openProject,
  saveProject,
  useFileSession,
  type FileActionResult,
} from '../persistence/file-session'

/** True when the project has changes not saved to a file. */
export function useUnsaved(): boolean {
  const project = useDocument((s) => s.project)
  const saved = useFileSession((s) => s.savedProject)
  return isDirty(project, saved)
}

/** New / Open / Save with confirmation and status notices. */
export function useFileActions() {
  const { t } = useTranslation()
  const showNotice = useUiStore((s) => s.showNotice)

  const report = useCallback(
    (result: FileActionResult, key: 'file.saved' | 'file.opened' | 'file.created') => {
      if (result.status === 'done') showNotice({ kind: 'info', key, name: result.fileName ?? '' })
      else if (result.status === 'error') showNotice({ kind: 'error', errorKey: result.errorKey })
    },
    [showNotice],
  )
  // A native confirm is acceptable here: it's rare, blocking is the point, and it needs no extra UI.
  const confirmDiscard = useCallback(() => window.confirm(t('file.discardConfirm')), [t])

  return useMemo(
    () => ({
      newProject: () => report(newProject(confirmDiscard), 'file.created'),
      open: () => void openProject(confirmDiscard).then((r) => report(r, 'file.opened')),
      save: (saveAs: boolean) => void saveProject(saveAs).then((r) => report(r, 'file.saved')),
    }),
    [confirmDiscard, report],
  )
}
