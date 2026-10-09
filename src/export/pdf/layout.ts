// T3.2 Page layout for 1:1 PDF export. Pure geometry (mm), no PDF library: unit-tested in Node.
//
// Tiled: the drawing is cut into printable areas that overlap by `overlap` mm, so neighbouring sheets can be
// overlapped and aligned. Tiles are labelled like spreadsheet cells (rows A, B, …; columns 1, 2, …). Tiles that
// contain nothing are skipped (labels keep their grid position so assembly still works).
// Single: one page sized to the drawing, for large-format printers and plotters.

import type { Bounds } from '../../geometry/bounds'

export type PaperSize = 'a4' | 'letter' | 'a3'
export type Orientation = 'portrait' | 'landscape'

/** Portrait width × height in mm. */
export const PAPER_MM: Record<PaperSize, readonly [number, number]> = {
  a4: [210, 297],
  letter: [215.9, 279.4],
  a3: [297, 420],
}

/** Margin on every side (mm): most printers can't print the outer ~5 mm; 10 mm also leaves room for marks. */
export const PAGE_MARGIN = 10
/** Header strip above the printable area (mm). */
export const HEADER_HEIGHT = 6

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface Tile {
  row: number
  col: number
  /** e.g. "B3". */
  label: string
  /** The part of the drawing (drawing coordinates, mm) shown on this page. */
  area: Rect
  /** Labels of the neighbouring tiles that exist (for the assembly marks). */
  right?: string
  below?: string
}

export interface TileLayout {
  pageWidth: number
  pageHeight: number
  orientation: Orientation
  /** Where drawing content goes on each page (page coordinates, mm). */
  printable: Rect
  rows: number
  cols: number
  /** Non-empty tiles, row by row. */
  tiles: Tile[]
}

export interface TileOptions {
  paper: PaperSize
  orientation: Orientation | 'auto'
  overlap: number
}

/** "A", "B", …, "Z", "AA", … */
export function rowName(index: number): string {
  let s = ''
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s
  return s
}

function intersects(a: Rect, b: Bounds): boolean {
  return b.minX < a.x + a.w && b.maxX > a.x && b.minY < a.y + a.h && b.maxY > a.y
}

function layoutFor(
  drawing: Bounds,
  content: readonly Bounds[],
  orientation: Orientation,
  opts: TileOptions,
): TileLayout {
  const [pw, ph] = PAPER_MM[opts.paper]
  const [pageWidth, pageHeight] = orientation === 'portrait' ? [pw, ph] : [ph, pw]
  const printable: Rect = {
    x: PAGE_MARGIN,
    y: PAGE_MARGIN + HEADER_HEIGHT,
    w: pageWidth - 2 * PAGE_MARGIN,
    h: pageHeight - 2 * PAGE_MARGIN - HEADER_HEIGHT,
  }
  const overlap = Math.max(0, Math.min(opts.overlap, printable.w / 2, printable.h / 2))
  const width = drawing.maxX - drawing.minX
  const height = drawing.maxY - drawing.minY
  const count = (size: number, area: number) => Math.max(1, Math.ceil((size - overlap) / (area - overlap) - 1e-9))
  const cols = count(width, printable.w)
  const rows = count(height, printable.h)

  const grid: (Tile | null)[][] = []
  for (let r = 0; r < rows; r++) {
    grid.push([])
    for (let c = 0; c < cols; c++) {
      const area: Rect = {
        x: drawing.minX + c * (printable.w - overlap),
        y: drawing.minY + r * (printable.h - overlap),
        w: printable.w,
        h: printable.h,
      }
      const used = content.length === 0 || content.some((b) => intersects(area, b))
      grid[r].push(used ? { row: r, col: c, label: `${rowName(r)}${c + 1}`, area } : null)
    }
  }
  const tiles: Tile[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tile = grid[r][c]
      if (!tile) continue
      tile.right = grid[r][c + 1]?.label
      tile.below = grid[r + 1]?.[c]?.label
      tiles.push(tile)
    }
  }
  return { pageWidth, pageHeight, orientation, printable, rows, cols, tiles }
}

/**
 * Tile `drawing` onto pages. `content` (per-entity bounds) decides which tiles are empty. With orientation
 * 'auto' the one needing fewer pages wins (portrait on a tie).
 */
export function layoutTiles(drawing: Bounds, content: readonly Bounds[], opts: TileOptions): TileLayout {
  if (opts.orientation !== 'auto') return layoutFor(drawing, content, opts.orientation, opts)
  const portrait = layoutFor(drawing, content, 'portrait', opts)
  const landscape = layoutFor(drawing, content, 'landscape', opts)
  return landscape.tiles.length < portrait.tiles.length ? landscape : portrait
}

/** Calibration square side (mm) and the block reserved for it under a single-page drawing. */
export const CALIBRATION_MM = 50
const CALIBRATION_BLOCK = CALIBRATION_MM + 2 * PAGE_MARGIN

export interface SinglePageLayout {
  pageWidth: number
  pageHeight: number
  /** Where the drawing goes (page mm). */
  drawing: Rect
  /** Where the calibration square goes (page mm). */
  calibration: Rect
}

/** One page sized to the drawing, with the header above and the calibration square below. */
export function layoutSinglePage(drawing: Bounds): SinglePageLayout {
  const w = drawing.maxX - drawing.minX
  const h = drawing.maxY - drawing.minY
  const top = PAGE_MARGIN + HEADER_HEIGHT
  return {
    pageWidth: Math.max(w, CALIBRATION_MM + 60) + 2 * PAGE_MARGIN,
    pageHeight: top + h + CALIBRATION_BLOCK + PAGE_MARGIN,
    drawing: { x: PAGE_MARGIN, y: top, w, h },
    calibration: { x: PAGE_MARGIN, y: top + h + PAGE_MARGIN, w: CALIBRATION_MM, h: CALIBRATION_MM },
  }
}
