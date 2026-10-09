// T4.7 SVG import for tracing: shapes from an SVG file as model geometry in millimetres.
//
// Units: the root's width/height (with units) and viewBox give mm per user unit; without units, a user unit is
// a CSS px (25.4 / 96 mm), which is what Inkscape and browsers assume. Transforms on groups and shapes are
// applied. Path data (all commands, arcs included) is parsed by the geometry kernel (Paper.js).
// Supported: path, rect, circle, ellipse, line, polyline, polygon, nested g/svg. Skipped: text, images,
// <use>, and anything inside defs, clipPath, mask, marker, pattern or symbol, or hidden with display:none.
//
// Needs DOMParser (browser, or happy-dom in tests). y-down in both SVG and the model, so no flip.

import type { Segment } from '../document/model'
import { fromPaperPath, kernel } from '../geometry/kernel'

export interface ImportedShape {
  segments: Segment[]
  closed: boolean
}

export interface SvgImport {
  shapes: ImportedShape[]
  /** Elements that were left out (text, images, <use>…), for the user notice. */
  skipped: number
}

/** mm per unit, for absolute SVG/CSS length units. */
const UNIT_MM: Record<string, number> = {
  mm: 1,
  cm: 10,
  in: 25.4,
  pt: 25.4 / 72,
  pc: 25.4 / 6,
  px: 25.4 / 96,
  '': 25.4 / 96,
}

const SKIP_SUBTREES = new Set([
  'defs',
  'clippath',
  'mask',
  'marker',
  'pattern',
  'symbol',
  'metadata',
  'style',
  'title',
  'desc',
])
const IGNORED = new Set(['text', 'image', 'use', 'foreignobject', 'switch', 'a'])

export class SvgImportError extends Error {}

/** A length attribute in mm, or null if missing or relative (%, em). */
function lengthMm(value: string | null): number | null {
  const m = value?.trim().match(/^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*([a-z]*)$/i)
  if (!m) return null
  const unit = UNIT_MM[m[2].toLowerCase()]
  return unit === undefined ? null : Number(m[1]) * unit
}

const num = (el: Element, name: string, fallback = 0) => {
  const v = parseFloat(el.getAttribute(name) ?? '')
  return Number.isFinite(v) ? v : fallback
}

/** The root's mapping from user units to mm, as a matrix (scale + viewBox origin). */
function rootMatrix(svg: Element): paper.Matrix {
  const ps = kernel()
  const vb = svg
    .getAttribute('viewBox')
    ?.trim()
    .split(/[\s,]+/)
    .map(Number)
  const w = lengthMm(svg.getAttribute('width'))
  const h = lengthMm(svg.getAttribute('height'))
  const px = UNIT_MM.px
  if (!vb || vb.length !== 4 || vb.some((v) => !Number.isFinite(v)) || vb[2] <= 0 || vb[3] <= 0) {
    return new ps.Matrix(px, 0, 0, px, 0, 0)
  }
  // With a viewBox, width/height (default: the viewBox in px) set the scale. Non-uniform viewBoxes are
  // taken as uniform on width (preserveAspectRatio is not modelled).
  const sx = (w ?? vb[2] * px) / vb[2]
  const sy = h !== null ? h / vb[3] : sx
  return new ps.Matrix(sx, 0, 0, sy, -vb[0] * sx, -vb[1] * sy)
}

/** Parse an SVG transform list into a matrix. */
export function parseTransform(value: string | null): paper.Matrix {
  const ps = kernel()
  const m = new ps.Matrix()
  if (!value) return m
  for (const [, name, args] of value.matchAll(/(\w+)\s*\(([^)]*)\)/g)) {
    const a = args
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number)
    switch (name) {
      case 'matrix':
        if (a.length === 6) m.append(new ps.Matrix(a[0], a[1], a[2], a[3], a[4], a[5]))
        break
      case 'translate':
        m.translate(a[0] ?? 0, a[1] ?? 0)
        break
      case 'scale':
        m.scale(a[0] ?? 1, a[1] ?? a[0] ?? 1)
        break
      case 'rotate':
        m.rotate(a[0] ?? 0, new ps.Point(a[1] ?? 0, a[2] ?? 0))
        break
      case 'skewX':
        m.skew(a[0] ?? 0, 0)
        break
      case 'skewY':
        m.skew(0, a[0] ?? 0)
        break
    }
  }
  return m
}

const hidden = (el: Element) =>
  el.getAttribute('display') === 'none' || /(^|;)\s*display\s*:\s*none/.test(el.getAttribute('style') ?? '')

/** One shape element as a Paper path item in its own user space, or null if unsupported. */
function shapeItem(el: Element): paper.PathItem | null {
  const ps = kernel()
  const tag = el.localName.toLowerCase()
  switch (tag) {
    case 'path': {
      const d = el.getAttribute('d')
      return d ? (ps.PathItem.create(d) as paper.PathItem) : null
    }
    case 'rect': {
      const [w, h] = [num(el, 'width'), num(el, 'height')]
      if (w <= 0 || h <= 0) return null
      // rx/ry default to each other; clamped to half the side.
      const rxa = el.hasAttribute('rx') ? num(el, 'rx') : el.hasAttribute('ry') ? num(el, 'ry') : 0
      const rya = el.hasAttribute('ry') ? num(el, 'ry') : rxa
      return new ps.Path.Rectangle({
        rectangle: new ps.Rectangle(num(el, 'x'), num(el, 'y'), w, h),
        radius: new ps.Size(Math.min(rxa, w / 2), Math.min(rya, h / 2)),
        insert: false,
      })
    }
    case 'circle': {
      const r = num(el, 'r')
      return r > 0 ? new ps.Path.Circle({ center: [num(el, 'cx'), num(el, 'cy')], radius: r, insert: false }) : null
    }
    case 'ellipse': {
      const [rx, ry] = [num(el, 'rx'), num(el, 'ry')]
      return rx > 0 && ry > 0
        ? new ps.Path.Ellipse({ center: [num(el, 'cx'), num(el, 'cy')], radius: [rx, ry], insert: false })
        : null
    }
    case 'line':
      return new ps.Path({
        segments: [
          [num(el, 'x1'), num(el, 'y1')],
          [num(el, 'x2'), num(el, 'y2')],
        ],
        insert: false,
      })
    case 'polyline':
    case 'polygon': {
      const v = (el.getAttribute('points') ?? '')
        .trim()
        .split(/[\s,]+/)
        .filter(Boolean)
        .map(Number)
      const pts: [number, number][] = []
      for (let i = 0; i + 1 < v.length; i += 2) pts.push([v[i], v[i + 1]])
      return pts.length >= 2 ? new ps.Path({ segments: pts, closed: tag === 'polygon', insert: false }) : null
    }
    default:
      return null
  }
}

/** Round to 1e-6 mm so unit conversions don't leave 99.99999999-style noise. */
const r6 = (v: number) => Math.round(v * 1e6) / 1e6 || 0
function rounded(shape: ImportedShape): ImportedShape {
  return {
    closed: shape.closed,
    segments: shape.segments.map(({ p, hi, ho }) => {
      const seg: Segment = { p: [r6(p[0]), r6(p[1])] }
      if (hi) seg.hi = [r6(hi[0]), r6(hi[1])]
      if (ho) seg.ho = [r6(ho[0]), r6(ho[1])]
      return seg
    }),
  }
}

function collect(el: Element, matrix: paper.Matrix, out: SvgImport) {
  for (const child of Array.from(el.children)) {
    const tag = child.localName.toLowerCase()
    if (SKIP_SUBTREES.has(tag) || hidden(child)) continue
    const m = matrix.clone().append(parseTransform(child.getAttribute('transform')))
    if (tag === 'g' || tag === 'svg') {
      // A nested <svg> at x/y is a translated group (its own viewBox is not modelled).
      if (tag === 'svg') m.translate(num(child, 'x'), num(child, 'y'))
      collect(child, m, out)
      continue
    }
    if (IGNORED.has(tag)) {
      out.skipped++
      continue
    }
    const item = shapeItem(child)
    if (!item) continue
    item.transform(m)
    const paths = item instanceof kernel().CompoundPath ? (item.children as paper.Path[]) : [item as paper.Path]
    for (const p of paths) if (p.segments.length >= 2) out.shapes.push(rounded(fromPaperPath(p)))
  }
}

/** Shapes in an SVG document, in mm. Throws SvgImportError if the text isn't an SVG. */
export function importSvg(text: string): SvgImport {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml')
  const svg = doc.documentElement
  if (!svg || svg.localName.toLowerCase() !== 'svg' || doc.getElementsByTagName('parsererror').length > 0) {
    throw new SvgImportError('Not an SVG file')
  }
  const out: SvgImport = { shapes: [], skipped: 0 }
  collect(svg, rootMatrix(svg).append(parseTransform(svg.getAttribute('transform'))), out)
  return out
}
