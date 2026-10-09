import { useEffect } from 'react'
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

export function App() {
  const { t } = useTranslation()
  const files = useFileActions()
  const name = useDocument((s) => s.project.name)
  const unsaved = useUnsaved()
  useToolKeys()

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
      <main className="app-main">
        <ToolPalette />
        <CanvasView />
        <aside className="side-panel">
          <LayersPanel />
          <PropertiesPanel />
        </aside>
      </main>
      <InputBar />
      <StatusBar />
    </div>
  )
}
