import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CanvasView } from '../canvas/CanvasView'
import { documentStore, useDocument } from '../document/store'
import { InputBar } from '../ui/InputBar'
import { LayersPanel } from '../ui/LayersPanel'
import { PropertiesPanel } from '../ui/PropertiesPanel'
import { StatusBar } from '../ui/StatusBar'
import { ToolPalette } from '../ui/ToolPalette'
import { Toolbar } from '../ui/Toolbar'
import { useFileActions, useUnsaved } from '../ui/useFileActions'
import { useToolKeys } from '../ui/useToolKeys'

// The side panel's open/closed state is a per-browser preference.
const PANEL_KEY = 'leatherdraft.sidePanel.v1'
function loadPanelOpen(): boolean {
  try {
    return localStorage.getItem(PANEL_KEY) !== 'closed'
  } catch {
    return true
  }
}
function savePanelOpen(open: boolean) {
  try {
    localStorage.setItem(PANEL_KEY, open ? 'open' : 'closed')
  } catch {
    // Not remembered; fine.
  }
}

export function App() {
  const { t } = useTranslation()
  const files = useFileActions()
  const name = useDocument((s) => s.project.name)
  const unsaved = useUnsaved()
  useToolKeys()
  const [panelOpen, setPanelOpen] = useState(loadPanelOpen)

  // No browser context menu over the app (right-click is ours: finish, tool groups). Text fields keep theirs,
  // for copy and paste.
  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      if (e.target instanceof Element && e.target.closest('input, textarea, [contenteditable]')) return
      e.preventDefault()
    }
    document.addEventListener('contextmenu', onContextMenu)
    return () => document.removeEventListener('contextmenu', onContextMenu)
  }, [])

  const togglePanel = () => {
    setPanelOpen((open) => {
      savePanelOpen(!open)
      return !open
    })
  }

  useEffect(() => {
    document.title = `${unsaved ? '• ' : ''}${name} — ${t('app.name')}`
  }, [name, unsaved, t])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return
      const key = e.key.toLowerCase()
      // Save/Open work even from a text field; otherwise the browser's own Save Page / Open File appears.
      if (key === 's') files.save(e.shiftKey)
      else if (key === 'o') files.open()
      // Undo/redo inside a text field stays native.
      else if (e.target instanceof HTMLInputElement) return
      else if (key === 'z' && !e.shiftKey) documentStore.getState().undo()
      else if ((key === 'z' && e.shiftKey) || key === 'y') documentStore.getState().redo()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [files])

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">{t('app.name')}</h1>
        <Toolbar />
      </header>
      <main className={panelOpen ? 'app-main' : 'app-main panel-collapsed'}>
        <ToolPalette />
        <CanvasView />
        <aside className="side-panel">
          <button
            type="button"
            className="panel-toggle"
            aria-expanded={panelOpen}
            aria-controls="side-panel-content"
            title={t(panelOpen ? 'panels.hide' : 'panels.show')}
            aria-label={t(panelOpen ? 'panels.hide' : 'panels.show')}
            onClick={togglePanel}
          >
            <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
              <path
                d={panelOpen ? 'M8 5l5 5-5 5' : 'M12 5l-5 5 5 5'}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              />
            </svg>
          </button>
          <div id="side-panel-content" className="side-panel-content" hidden={!panelOpen}>
            <LayersPanel />
            <PropertiesPanel />
          </div>
        </aside>
      </main>
      <InputBar />
      <StatusBar />
    </div>
  )
}
