import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUiStore } from '../canvas/ui-store'
import { renameProject } from '../document/commands'
import { documentStore, useDocument } from '../document/store'
import { setLanguage, SUPPORTED_LANGUAGES, type Language } from '../i18n'
import { reloadForUpdate } from '../app/pwa'
import { ExportDialog } from './ExportDialog'
import { useFileActions, useUnsaved } from './useFileActions'

/** How long an info notice stays up. Errors stay until replaced or dismissed. */
const NOTICE_MS = 4000

function NoticeView() {
  const { t } = useTranslation()
  const { t: tErrors, i18n } = useTranslation('errors')
  const notice = useUiStore((s) => s.notice)
  const showNotice = useUiStore((s) => s.showNotice)

  useEffect(() => {
    if (notice?.kind !== 'info') return
    const timer = setTimeout(() => showNotice(null), NOTICE_MS)
    return () => clearTimeout(timer)
  }, [notice, showNotice])

  if (!notice) return <output className="notice" />
  if (notice.kind === 'update') {
    return (
      <output className="notice">
        {t('update.available')}
        <button className="notice-action" onClick={reloadForUpdate}>
          {t('update.reload')}
        </button>
      </output>
    )
  }
  if (notice.kind === 'info') {
    return <output className="notice">{t(notice.key, { name: notice.name ?? '' })}</output>
  }
  // Error keys come from SchemaError messages or file I/O; fall back to a generic message for anything unknown.
  const key = i18n.exists(notice.errorKey, { ns: 'errors' }) ? notice.errorKey : 'file.ioFailed'
  return (
    <output className="notice notice-error" role="alert">
      {tErrors(key as 'file.ioFailed')}
      <button className="notice-dismiss" aria-label={t('notice.dismiss')} onClick={() => showNotice(null)}>
        ×
      </button>
    </output>
  )
}

function ProjectName() {
  const { t } = useTranslation()
  const name = useDocument((s) => s.project.name)
  const unsaved = useUnsaved()
  const [draft, setDraft] = useState<string | null>(null)

  const commit = () => {
    const next = draft?.trim()
    setDraft(null)
    if (next && next !== name) documentStore.getState().dispatch(renameProject(next))
  }

  return (
    <label className="project-name">
      <span className="visually-hidden">{t('file.projectName')}</span>
      <input
        value={draft ?? name}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') {
            setDraft(null)
            e.currentTarget.blur()
          }
        }}
      />
      {unsaved && (
        <span className="unsaved-dot" title={t('file.unsaved')} aria-label={t('file.unsaved')}>
          •
        </span>
      )}
    </label>
  )
}

export function Toolbar() {
  const { t, i18n } = useTranslation()
  const canUndo = useDocument((s) => s.past.length > 0)
  const canRedo = useDocument((s) => s.future.length > 0)
  const files = useFileActions()

  const [exportOpen, setExportOpen] = useState(false)

  return (
    <div className="toolbar" role="toolbar">
      <ProjectName />
      <button onClick={files.newProject}>{t('menu.new')}</button>
      <button onClick={files.open}>{t('menu.open')}</button>
      <button onClick={() => files.save(false)}>{t('menu.save')}</button>
      <span className="toolbar-gap" />
      <button onClick={() => documentStore.getState().undo()} disabled={!canUndo}>
        {t('menu.undo')}
      </button>
      <button onClick={() => documentStore.getState().redo()} disabled={!canRedo}>
        {t('menu.redo')}
      </button>
      <button onClick={() => setExportOpen(true)}>{t('menu.export')}</button>
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
      <NoticeView />
      <label className="toolbar-language">
        <span>{t('menu.language')}</span>
        <select value={i18n.language} onChange={(e) => void setLanguage(e.target.value as Language)}>
          {SUPPORTED_LANGUAGES.map((lng) => (
            <option key={lng} value={lng}>
              {t(`languages.${lng}`)}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
