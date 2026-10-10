import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUiStore } from '../canvas/ui-store'
import { renameProject } from '../document/commands'
import { documentStore, useDocument } from '../document/store'
import { setLanguage, SUPPORTED_LANGUAGES, type Language } from '../i18n'
import { reloadForUpdate } from '../app/pwa'
import { ExportDialog } from './ExportDialog'
import { importFile } from './import-file'
import { ShortcutsDialog } from './ShortcutsDialog'
import { useFileActions, useUnsaved } from './useFileActions'

/** Source code (Apache-2.0). */
const GITHUB_URL = 'https://github.com/biuZam/webCAD'

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
    return (
      <output className="notice">
        {t(notice.key, { name: notice.name ?? '', count: notice.count ?? 0, skipped: notice.skipped ?? 0 })}
      </output>
    )
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
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

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
      <button onClick={() => void importFile()}>{t('menu.import')}</button>
      <button onClick={() => setExportOpen(true)}>{t('menu.export')}</button>
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
      <button onClick={() => setShortcutsOpen(true)}>{t('menu.shortcuts')}</button>
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <NoticeView />
      <label className="toolbar-language" title={t('menu.language')}>
        {/* A globe instead of the word "Language": recognisable whatever language the UI is in. */}
        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
          <path
            d="M10 2.5a7.5 7.5 0 1 0 0 15a7.5 7.5 0 1 0 0-15zM2.5 10h15M10 2.5c2.2 2 3.3 4.5 3.3 7.5s-1.1 5.5-3.3 7.5M10 2.5C7.8 4.5 6.7 7 6.7 10s1.1 5.5 3.3 7.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
          />
        </svg>
        <select
          aria-label={t('menu.language')}
          value={i18n.language}
          onChange={(e) => void setLanguage(e.target.value as Language)}
        >
          {SUPPORTED_LANGUAGES.map((lng) => (
            <option key={lng} value={lng}>
              {t(`languages.${lng}`)}
            </option>
          ))}
        </select>
      </label>
      <a
        className="toolbar-github"
        href={GITHUB_URL}
        target="_blank"
        rel="noopener noreferrer"
        title={t('menu.github')}
        aria-label={t('menu.github')}
      >
        <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">
          <path
            fill="currentColor"
            d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
          />
        </svg>
      </a>
    </div>
  )
}
