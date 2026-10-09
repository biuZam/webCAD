// T3.4 Export options: SVG or 1:1 PDF (single page or tiled), layer choice, laser-friendly options.

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import i18next from 'i18next'
import { useUiStore } from '../canvas/ui-store'
import { documentStore, useDocument } from '../document/store'
import { exportSvg, type SvgExportOptions } from '../export/svg'
import type { PdfStrings } from '../export/pdf'
import type { Orientation, PaperSize } from '../export/pdf/layout'
import { downloadBlob } from './download'
import { useLayerName } from './layerName'

interface ExportSettings {
  format: 'svg' | 'pdf'
  /** null = all visible layers. */
  layerIds: string[] | null
  cutOnly: boolean
  includeLabels: boolean
  /** null = each entity's own stroke width. */
  strokeWidth: number | null
  polyline: boolean
  paper: PaperSize | 'single'
  orientation: Orientation | 'auto'
  overlap: number
}

const DEFAULTS: ExportSettings = {
  format: 'pdf',
  layerIds: null,
  cutOnly: false,
  includeLabels: true,
  strokeWidth: null,
  polyline: false,
  paper: 'a4',
  orientation: 'auto',
  overlap: 10,
}

// Remembered per browser for convenience only (not part of the project).
const STORAGE_KEY = 'leatherdraft.export.v1'
function loadSettings(): ExportSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? { ...DEFAULTS, ...JSON.parse(saved), layerIds: null } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}
function saveSettings(s: ExportSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...s, layerIds: null }))
  } catch {
    // Not remembered; fine.
  }
}

/**
 * Text printed on the PDF pages. jsPDF's built-in font is Latin-1 only, so until CJK font embedding (T4.2)
 * the page furniture is always English; the dialog itself is translated as usual.
 */
function pdfStrings(overlap: number): PdfStrings {
  const t = i18next.getFixedT('en', 'export')
  return {
    scale: t('pdf.scale'),
    calibration: t('pdf.calibration'),
    instructions: [t('pdf.instructions1'), t('pdf.instructions2')],
    assembly: t('pdf.assembly', { overlap }),
    sheets: t('pdf.sheets'),
  }
}

export function ExportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation('export')
  const { t: tc } = useTranslation()
  const ref = useRef<HTMLDialogElement>(null)
  const layers = useDocument((s) => s.project.layers)
  const layerName = useLayerName()
  const showNotice = useUiStore((s) => s.showNotice)
  const [settings, setSettings] = useState<ExportSettings>(loadSettings)
  const [busy, setBusy] = useState(false)
  const set = (patch: Partial<ExportSettings>) => setSettings((s) => ({ ...s, ...patch }))

  useEffect(() => {
    const dialog = ref.current!
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const chosenLayers = settings.layerIds ?? layers.filter((l) => l.visible).map((l) => l.id)
  const toggleLayer = (id: string) =>
    set({ layerIds: chosenLayers.includes(id) ? chosenLayers.filter((x) => x !== id) : [...chosenLayers, id] })

  const run = async () => {
    const project = documentStore.getState().project
    const svgOptions: SvgExportOptions = {
      layerIds: chosenLayers,
      cutOnly: settings.cutOnly,
      includeLabels: settings.includeLabels,
      strokeWidth: settings.strokeWidth ?? undefined,
      polyline: settings.polyline,
    }
    const base = project.name.trim() || 'pattern'
    saveSettings(settings)
    setBusy(true)
    try {
      if (settings.format === 'svg') {
        downloadBlob(`${base}.svg`, new Blob([exportSvg(project, svgOptions)], { type: 'image/svg+xml' }))
      } else {
        // Lazy: jsPDF + svg2pdf.js are only loaded when someone actually exports a PDF.
        const { exportPdf } = await import('../export/pdf')
        const blob = await exportPdf(project, {
          mode: settings.paper === 'single' ? 'single' : 'tiled',
          paper: settings.paper === 'single' ? 'a4' : settings.paper,
          orientation: settings.orientation,
          overlap: settings.overlap,
          svg: svgOptions,
          strings: pdfStrings(settings.overlap),
          date: new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date()),
        })
        downloadBlob(`${base}.pdf`, blob)
      }
      showNotice({ kind: 'info', key: 'file.exported', name: `${base}.${settings.format}` })
      onClose()
    } catch (e) {
      console.error('[LeatherDraft] Export failed', e)
      showNotice({ kind: 'error', errorKey: 'file.exportFailed' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <dialog ref={ref} className="dialog" onClose={onClose} aria-labelledby="export-title">
      <form
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault()
          void run()
        }}
      >
        <h2 id="export-title" className="dialog-title">
          {t('title')}
        </h2>

        <fieldset className="dialog-group">
          <legend>{t('format')}</legend>
          {(['pdf', 'svg'] as const).map((f) => (
            <label key={f} className="dialog-check">
              <input type="radio" name="format" checked={settings.format === f} onChange={() => set({ format: f })} />
              {t(`formats.${f}`)}
            </label>
          ))}
        </fieldset>

        {settings.format === 'pdf' && (
          <fieldset className="dialog-group">
            <legend>{t('pdf.paper')}</legend>
            <label className="dialog-row">
              <span>{t('pdf.paper')}</span>
              <select
                value={settings.paper}
                onChange={(e) => set({ paper: e.target.value as ExportSettings['paper'] })}
              >
                <option value="a4">A4</option>
                <option value="letter">Letter</option>
                <option value="a3">A3</option>
                <option value="single">{t('pdf.single')}</option>
              </select>
            </label>
            {settings.paper !== 'single' && (
              <>
                <label className="dialog-row">
                  <span>{t('pdf.orientation')}</span>
                  <select
                    value={settings.orientation}
                    onChange={(e) => set({ orientation: e.target.value as ExportSettings['orientation'] })}
                  >
                    <option value="auto">{t('pdf.auto')}</option>
                    <option value="portrait">{t('pdf.portrait')}</option>
                    <option value="landscape">{t('pdf.landscape')}</option>
                  </select>
                </label>
                <label className="dialog-row">
                  <span>{t('pdf.overlap')}</span>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    step={1}
                    value={settings.overlap}
                    onChange={(e) => set({ overlap: Math.max(0, Number(e.target.value) || 0) })}
                  />
                  <span>mm</span>
                </label>
              </>
            )}
            <p className="dialog-hint">{t('pdf.printHint')}</p>
          </fieldset>
        )}

        <fieldset className="dialog-group">
          <legend>{t('layers')}</legend>
          {layers.map((l) => (
            <label key={l.id} className="dialog-check">
              <input
                type="checkbox"
                checked={chosenLayers.includes(l.id)}
                disabled={settings.cutOnly && l.kind !== 'cut'}
                onChange={() => toggleLayer(l.id)}
              />
              {layerName(l)}
            </label>
          ))}
          <label className="dialog-check">
            <input type="checkbox" checked={settings.cutOnly} onChange={(e) => set({ cutOnly: e.target.checked })} />
            {t('cutOnly')}
          </label>
          <label className="dialog-check">
            <input
              type="checkbox"
              checked={settings.includeLabels}
              onChange={(e) => set({ includeLabels: e.target.checked })}
            />
            {t('includeLabels')}
          </label>
          {settings.format === 'svg' && (
            <label className="dialog-check">
              <input
                type="checkbox"
                checked={settings.polyline}
                onChange={(e) => set({ polyline: e.target.checked })}
              />
              {t('polyline')}
            </label>
          )}
          <label className="dialog-row">
            <span>{t('strokeWidth')}</span>
            <input
              type="number"
              min={0}
              step={0.05}
              placeholder={t('strokeAsDrawn')}
              value={settings.strokeWidth ?? ''}
              onChange={(e) => set({ strokeWidth: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) })}
            />
            <span>mm</span>
          </label>
        </fieldset>

        <div className="dialog-actions">
          <button type="button" onClick={onClose}>
            {tc('dialog.cancel')}
          </button>
          <button type="submit" className="primary" disabled={busy || chosenLayers.length === 0}>
            {busy ? t('working') : t('export', { format: settings.format.toUpperCase() })}
          </button>
        </div>
        <p className="visually-hidden" aria-live="polite">
          {busy ? t('working') : ''}
        </p>
      </form>
    </dialog>
  )
}
