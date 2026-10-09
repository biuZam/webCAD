// T3.1–T3.3 PDF export at 1:1. Lazy-loaded (jsPDF + svg2pdf.js are large; docs/ARCHITECTURE.md A7).
//
// Every page renders the same SVG the app exports (A5: screen, SVG and PDF can't drift), positioned so the
// page's part of the drawing lands in the printable area and clipped to it. Units are mm throughout, so an
// SVG user unit (1 mm) is exactly 1 mm on paper.
//
// Text uses jsPDF's built-in Helvetica (WinAnsi / Latin-1) when that covers everything printed. Otherwise
// (T4.2: Chinese page text, project name or labels) the CJK font from `loadCjkFont` (Noto Sans SC, GB2312
// subset) is embedded for all text on the pages and the labels in the drawing; jsPDF subsets it again, so the
// PDF only carries the glyphs it uses. Without a loader, non-Latin-1 characters print as "?".

import { jsPDF } from 'jspdf'
// The named function, not the `doc.svg` plugin: the plugin patches whichever jsPDF module instance svg2pdf
// imported, which (bundler/test-runner dependent) need not be ours.
import { svg2pdf } from 'svg2pdf.js'
import type { Project } from '../../document/model'
import { emptyBounds, entityBounds, type Bounds } from '../../geometry/bounds'
import { exportSvg, type SvgExportOptions } from '../svg'
import {
  CALIBRATION_MM,
  HEADER_HEIGHT,
  layoutSinglePage,
  layoutTiles,
  PAGE_MARGIN,
  type Orientation,
  type PaperSize,
  type Rect,
  type Tile,
  type TileLayout,
} from './layout'

export interface PdfStrings {
  /** e.g. "Scale 1:1". */
  scale: string
  /** Label under the calibration square, e.g. "50 mm: measure …" (Latin-1 only, see `latin1`). */
  calibration: string
  /** Printing instructions, one paragraph per entry. */
  instructions: string[]
  /** Assembly hint, already formatted with the overlap, e.g. "Sheets overlap by 10 mm…". */
  assembly: string
  /** Heading of the sheet map on the assembly page. */
  sheets: string
}

export interface PdfOptions {
  mode: 'single' | 'tiled'
  paper: PaperSize
  orientation: Orientation | 'auto'
  overlap: number
  svg: SvgExportOptions
  strings: PdfStrings
  /** Already formatted for the user's locale. */
  date: string
  /** Turn off stream compression (tests inspect the content). */
  uncompressed?: boolean
  /** Fetches the CJK TrueType font; only called when something to print is outside Latin-1. */
  loadCjkFont?: () => Promise<ArrayBuffer>
}

/** jsPDF font family name the CJK font is registered under (also used as the SVG font-family). */
export const CJK_FONT = 'NotoSansSC'

const MARK = 4 // crop mark length, mm
const GREY = 150

/** Helvetica in jsPDF only covers Latin-1: replace anything else so the PDF stays readable. */
export const latin1 = (s: string) => Array.from(s, (c) => (c.codePointAt(0)! > 0xff ? '?' : c)).join('')

/** True if any of the strings has a character Helvetica can't print. */
export const needsCjk = (texts: readonly string[]) =>
  texts.some((t) => Array.from(t).some((c) => c.codePointAt(0)! > 0xff))

/** Which font the page text uses, and how strings are prepared for it. */
interface Fonts {
  family: string
  /** No bold face in the CJK font: headings use the regular weight. */
  bold: string
  prepare: (s: string) => string
}

const HELVETICA: Fonts = { family: 'helvetica', bold: 'bold', prepare: latin1 }

function base64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

/** Register the CJK font with `doc` if anything printed needs it; otherwise plain Helvetica. */
async function setUpFonts(doc: jsPDF, texts: string[], opts: PdfOptions): Promise<Fonts> {
  if (!opts.loadCjkFont || !needsCjk(texts)) return HELVETICA
  doc.addFileToVFS(`${CJK_FONT}.ttf`, base64(await opts.loadCjkFont()))
  doc.addFont(`${CJK_FONT}.ttf`, CJK_FONT, 'normal')
  return { family: CJK_FONT, bold: 'normal', prepare: (s) => s }
}

/** Everything the PDF prints as text: page furniture, names, and the labels in the drawing. */
function printedTexts(project: Project, opts: PdfOptions): string[] {
  const labels =
    opts.svg.includeLabels === false
      ? []
      : project.pieces.flatMap((p) => p.entities.flatMap((e) => (e.type === 'text' ? [e.text] : [])))
  const s = opts.strings
  return [
    project.name,
    ...project.pieces.map((p) => p.name),
    s.scale,
    s.calibration,
    ...s.instructions,
    s.assembly,
    s.sheets,
    opts.date,
    ...labels,
  ]
}

/** The exported SVG as a DOM element, plus the drawing area its viewBox covers (mm). */
function svgElement(project: Project, options: SvgExportOptions) {
  const text = exportSvg(project, options)
  const svg = new DOMParser().parseFromString(text, 'image/svg+xml').documentElement
  const [x, y, w, h] = (svg.getAttribute('viewBox') ?? '0 0 1 1').split(/\s+/).map(Number)
  return { svg, view: { x, y, w, h } }
}

/** Per-entity bounds of what will actually print, to skip empty tiles. */
function contentBounds(project: Project, options: SvgExportOptions): Bounds[] {
  const layers = new Set(
    project.layers
      .filter((l) => (options.cutOnly ? l.kind === 'cut' : true))
      .filter((l) => (options.layerIds ? options.layerIds.includes(l.id) : l.visible))
      .map((l) => l.id),
  )
  return project.pieces.flatMap((p) =>
    p.entities.filter((e) => layers.has(e.layerId)).map((e) => entityBounds(e, emptyBounds())),
  )
}

function header(doc: jsPDF, fonts: Fonts, pageWidth: number, left: string, right: string) {
  doc.setFont(fonts.family, 'normal')
  doc.setFontSize(8)
  doc.setTextColor(60)
  const y = PAGE_MARGIN + HEADER_HEIGHT - 2
  doc.text(fonts.prepare(left), PAGE_MARGIN, y)
  doc.text(fonts.prepare(right), pageWidth - PAGE_MARGIN, y, { align: 'right' })
}

function calibrationSquare(doc: jsPDF, fonts: Fonts, at: Rect, label: string) {
  doc.setDrawColor(0)
  doc.setLineWidth(0.3)
  doc.setLineDashPattern([], 0)
  doc.rect(at.x, at.y, CALIBRATION_MM, CALIBRATION_MM)
  doc.setFont(fonts.family, 'normal')
  doc.setFontSize(8)
  doc.setTextColor(0)
  doc.text(fonts.prepare(label), at.x, at.y + CALIBRATION_MM + 5)
}

/** Labels in the drawing use the embedded CJK font when there is one (svg2pdf matches jsPDF fonts by family). */
function setLabelFont(svg: Element, fonts: Fonts) {
  if (fonts.family !== HELVETICA.family) svg.setAttribute('font-family', fonts.family)
}

/** Draw the SVG so the drawing point (`from.x`, `from.y`) lands at page point (`to.x`, `to.y`), clipped to `to`. */
async function placeDrawing(doc: jsPDF, svg: Element, view: Rect, from: { x: number; y: number }, to: Rect) {
  doc.saveGraphicsState()
  doc.rect(to.x, to.y, to.w, to.h, null)
  doc.clip()
  doc.discardPath()
  await svg2pdf(svg, doc, { x: to.x + (view.x - from.x), y: to.y + (view.y - from.y), width: view.w, height: view.h })
  doc.restoreGraphicsState()
}

/** Corner crop marks, dashed overlap guides towards existing neighbours, and the neighbours' labels. */
function tileMarks(doc: jsPDF, layout: TileLayout, tile: Tile, overlap: number) {
  const { x, y, w, h } = layout.printable
  doc.setDrawColor(0)
  doc.setLineWidth(0.2)
  doc.setLineDashPattern([], 0)
  for (const [cx, cy, dx, dy] of [
    [x, y, -1, -1],
    [x + w, y, 1, -1],
    [x, y + h, -1, 1],
    [x + w, y + h, 1, 1],
  ]) {
    doc.line(cx, cy, cx + dx * MARK, cy)
    doc.line(cx, cy, cx, cy + dy * MARK)
  }
  doc.setDrawColor(GREY)
  doc.setLineDashPattern([2, 2], 0)
  doc.setFontSize(9)
  doc.setTextColor(GREY)
  if (tile.right) {
    const gx = x + w - overlap
    doc.line(gx, y, gx, y + h)
    doc.text(tile.right, x + w + 1.5, y + h / 2, { angle: -90 })
  }
  if (tile.below) {
    const gy = y + h - overlap
    doc.line(x, gy, x + w, gy)
    doc.text(tile.below, x + w / 2, y + h + 5, { align: 'center' })
  }
  doc.setLineDashPattern([], 0)
}

/** Page 1 of a tiled PDF: header, calibration square, instructions and a map of the sheets. */
function assemblyPage(
  doc: jsPDF,
  fonts: Fonts,
  project: Project,
  layout: TileLayout,
  opts: PdfOptions,
  pageCount: number,
) {
  const { pageWidth, pageHeight } = layout
  header(doc, fonts, pageWidth, `${project.name}`, `${opts.strings.scale} · ${opts.date} · 1/${pageCount}`)
  let y = PAGE_MARGIN + HEADER_HEIGHT + 8
  doc.setFont(fonts.family, fonts.bold)
  doc.setFontSize(16)
  doc.setTextColor(0)
  doc.text(fonts.prepare(project.name), PAGE_MARGIN, y)
  y += 8
  calibrationSquare(doc, fonts, { x: PAGE_MARGIN, y, w: CALIBRATION_MM, h: CALIBRATION_MM }, opts.strings.calibration)
  // Instructions to the right of the square.
  doc.setFont(fonts.family, 'normal')
  doc.setFontSize(9)
  const textX = PAGE_MARGIN + CALIBRATION_MM + 8
  const textW = pageWidth - textX - PAGE_MARGIN
  let ty = y + 3
  for (const para of [...opts.strings.instructions, opts.strings.assembly]) {
    const lines = doc.splitTextToSize(fonts.prepare(para), textW) as string[]
    doc.text(lines, textX, ty)
    ty += lines.length * 4.2 + 2
  }
  y = Math.max(y + CALIBRATION_MM + 12, ty + 4)

  // Sheet map: every grid cell, skipped ones greyed out.
  doc.setFont(fonts.family, fonts.bold)
  doc.setFontSize(10)
  doc.text(fonts.prepare(opts.strings.sheets), PAGE_MARGIN, y)
  y += 4
  const availW = pageWidth - 2 * PAGE_MARGIN
  const availH = pageHeight - PAGE_MARGIN - y
  const cell = Math.min(availW / layout.cols, availH / layout.rows, 30)
  const cellH = cell * (layout.printable.h / layout.printable.w)
  const present = new Set(layout.tiles.map((t) => t.label))
  doc.setFont(fonts.family, 'normal')
  doc.setFontSize(Math.max(6, Math.min(10, cell / 3)))
  doc.setLineWidth(0.2)
  for (let r = 0; r < layout.rows; r++) {
    for (let c = 0; c < layout.cols; c++) {
      const label = layout.tiles.find((t) => t.row === r && t.col === c)?.label
      const cx = PAGE_MARGIN + c * cell
      const cy = y + r * cellH
      doc.setDrawColor(label ? 0 : 200)
      doc.setTextColor(label ? 0 : 200)
      doc.rect(cx, cy, cell, cellH)
      if (label && present.has(label)) doc.text(label, cx + cell / 2, cy + cellH / 2 + 1.5, { align: 'center' })
    }
  }
}

export async function exportPdf(project: Project, opts: PdfOptions): Promise<Blob> {
  const { svg, view } = svgElement(project, opts.svg)
  const drawing: Bounds = { minX: view.x, minY: view.y, maxX: view.x + view.w, maxY: view.y + view.h }
  const pieceName = project.pieces[0]?.name ?? ''

  if (opts.mode === 'single') {
    const l = layoutSinglePage(drawing)
    const doc = new jsPDF({
      unit: 'mm',
      format: [l.pageWidth, l.pageHeight],
      orientation: l.pageWidth > l.pageHeight ? 'l' : 'p',
      compress: !opts.uncompressed,
    })
    const fonts = await setUpFonts(doc, printedTexts(project, opts), opts)
    setLabelFont(svg, fonts)
    header(doc, fonts, l.pageWidth, `${project.name} · ${pieceName}`, `${opts.strings.scale} · ${opts.date}`)
    await placeDrawing(doc, svg, view, { x: view.x, y: view.y }, l.drawing)
    calibrationSquare(doc, fonts, l.calibration, opts.strings.calibration)
    return doc.output('blob')
  }

  const layout = layoutTiles(drawing, contentBounds(project, opts.svg), opts)
  const pageCount = layout.tiles.length + 1
  const format = [layout.pageWidth, layout.pageHeight]
  const orientation = layout.orientation === 'portrait' ? 'p' : 'l'
  const doc = new jsPDF({ unit: 'mm', format, orientation, compress: !opts.uncompressed })
  const fonts = await setUpFonts(doc, printedTexts(project, opts), opts)
  setLabelFont(svg, fonts)
  assemblyPage(doc, fonts, project, layout, opts, pageCount)
  for (const [i, tile] of layout.tiles.entries()) {
    doc.addPage(format, orientation)
    header(
      doc,
      fonts,
      layout.pageWidth,
      `${project.name} · ${pieceName}`,
      `${opts.strings.scale} · ${tile.label} · ${i + 2}/${pageCount}`,
    )
    await placeDrawing(doc, svg, view, { x: tile.area.x, y: tile.area.y }, layout.printable)
    tileMarks(doc, layout, tile, opts.overlap)
  }
  return doc.output('blob')
}
