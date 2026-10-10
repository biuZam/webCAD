// T3.4 Export options: SVG or 1:1 PDF (single page or tiled), layer choice, laser-friendly options.
// T4.6 DXF (lazy, via the Maker.js adapter) and a PNG preview.

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import i18next from 'i18next'
import { pdfLanguage } from '../i18n'
import { useUiStore } from '../canvas/ui-store'
import { documentStore, useDocument } from '../document/store'
import { exportSvg, type SvgExportOptions } from '../export/svg'
import type { PdfStrings } from '../export/pdf'
import { PNG_DPI } from '../export/png'
import type { Orientation, PaperSize } from '../export/pdf/layout'
import { downloadBlob } from './download'
import { useLayerName } from './layerName'

interface ExportSettings {
  format: 'svg' | 'pdf' | 'dxf' | 'png'
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
  dpi: number
  /** Empty = no watermark. */
  watermark: string
  /** Percent. */
  watermarkOpacity: number
}

const MIME = { svg: 'image/svg+xml', dxf: 'application/dxf' } as const

/** T4.2 The CJK PDF font (public/fonts, ~1.4 MB gzipped); fetched only for PDFs with Chinese text. */
async function loadCjkFont(): Promise<ArrayBuffer> {
  const res = await fetch(`${import.meta.env.BASE_URL}fonts/NotoSansSC-GB2312.ttf`)
  if (!res.ok) throw new Error(`CJK font: HTTP ${res.status}`)
  return res.arrayBuffer()
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
  dpi: 150,
  watermark: '',
  watermarkOpacity: 15,
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

/** Text printed on the PDF pages, in the UI language (T4.2 embeds a CJK font when it is needed). */
function pdfStrings(overlap: number): PdfStrings {
  const t = i18next.getFixedT(pdfLanguage(i18next.language), 'export')
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
  const aiCount = useDocument((s) =>
    s.project.pieces.reduce((n, p) => n + p.entities.filter((e) => e.aiCreated).length, 0),
  )
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
      watermark:
        settings.format !== 'dxf' && settings.watermark.trim()
          ? { text: settings.watermark, opacity: settings.watermarkOpacity / 100 }
          : undefined,
    }
    const base = project.name.trim() || 'pattern'
    saveSettings(settings)
    setBusy(true)
    try {
      let saved: string | null
      if (settings.format === 'svg') {
        saved = await downloadBlob(`${base}.svg`, new Blob([exportSvg(project, svgOptions)], { type: MIME.svg }))
      } else if (settings.format === 'dxf') {
        // Lazy: Maker.js is only loaded for DXF.
        const { exportDxf } = await import('../export/dxf')
        saved = await downloadBlob(`${base}.dxf`, new Blob([exportDxf(project, svgOptions)], { type: MIME.dxf }))
      } else if (settings.format === 'png') {
        const { svgToPng } = await import('../export/png')
        saved = await downloadBlob(
          `${base}.png`,
          await svgToPng(exportSvg(project, { ...svgOptions, margin: 5 }), settings.dpi),
        )
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
          date: new Intl.DateTimeFormat(i18next.language, { dateStyle: 'medium' }).format(new Date()),
          loadCjkFont,
        })
        saved = await downloadBlob(`${base}.pdf`, blob)
      }
      // Cancelled the desktop Save dialog: keep the export dialog open.
      if (saved === null) return
      showNotice({ kind: 'info', key: 'file.exported', name: saved })
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
        {aiCount > 0 && <p className="dialog-hint dialog-warning">{t('aiUnreviewed', { count: aiCount })}</p>}

        <fieldset className="dialog-group">
          <legend>{t('format')}</legend>
          {(['pdf', 'svg', 'dxf', 'png'] as const).map((f) => (
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

        {settings.format === 'png' && (
          <fieldset className="dialog-group">
            <legend>{t('png.resolution')}</legend>
            <label className="dialog-row">
              <span>{t('png.resolution')}</span>
              <select value={settings.dpi} onChange={(e) => set({ dpi: Number(e.target.value) })}>
                {PNG_DPI.map((d) => (
                  <option key={d} value={d}>
                    {d} dpi
                  </option>
                ))}
              </select>
            </label>
            <p className="dialog-hint">{t('png.hint')}</p>
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
              checked={settings.includeLabels && settings.format !== 'dxf'}
              disabled={settings.format === 'dxf'}
              onChange={(e) => set({ includeLabels: e.target.checked })}
            />
            {t('includeLabels')}
          </label>
          {settings.format === 'dxf' && <p className="dialog-hint">{t('dxf.noLabels')}</p>}
          {(settings.format === 'svg' || settings.format === 'dxf') && (
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

        {settings.format !== 'dxf' && (
          <fieldset className="dialog-group">
            <legend>{t('watermark.title')}</legend>
            <label className="dialog-row">
              <span>{t('watermark.text')}</span>
              <input
                type="text"
                maxLength={100}
                placeholder={t('watermark.placeholder')}
                value={settings.watermark}
                onChange={(e) => set({ watermark: e.target.value })}
              />
              <span />
            </label>
            <label className="dialog-row">
              <span>{t('watermark.opacity')}</span>
              <input
                type="number"
                min={5}
                max={100}
                step={5}
                disabled={!settings.watermark.trim()}
                value={settings.watermarkOpacity}
                onChange={(e) => set({ watermarkOpacity: Math.min(100, Math.max(5, Number(e.target.value) || 15)) })}
              />
              <span>%</span>
            </label>
            {settings.format === 'pdf' && <p className="dialog-hint">{t('watermark.pdfHint')}</p>}
          </fieldset>
        )}

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
