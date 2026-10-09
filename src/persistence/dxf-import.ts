// T5.3 DXF import (P2): shapes from the ENTITIES section as model geometry in millimetres, for tracing like
// SVG import. Pure (no DOM).
//
// Units from $INSUNITS (unitless is taken as mm). DXF is y-up, the model y-down: y is negated.
// Supported: LINE, LWPOLYLINE and POLYLINE/VERTEX (with bulge arcs), CIRCLE, ARC, ELLIPSE, SPLINE (non-rational
// splines become exact cubic Béziers by knot insertion; rational ones are sampled finely). Everything else
// (TEXT, DIMENSION, INSERT/blocks, HATCH…) is counted as skipped.

import type { Segment } from '../document/model'
import { fromPaperPath, kernel } from '../geometry/kernel'
import type { ImportedShape } from './svg-import'

export interface DxfImport {
  shapes: ImportedShape[]
  skipped: number
}

export class DxfImportError extends Error {}

/** mm per drawing unit, by $INSUNITS code. */
const INSUNITS_MM: Record<number, number> = {
  0: 1,
  1: 25.4,
  2: 304.8,
  4: 1,
  5: 10,
  6: 1000,
  8: 0.0000254,
  9: 0.0254,
  10: 914.4,
}

/** Samples per knot span for rational splines (no exact Bézier form without weights). */
const RATIONAL_SAMPLES = 24

interface Group {
  code: number
  value: string
}

function groups(text: string): Group[] {
  const lines = text.split(/\r?\n/)
  const out: Group[] = []
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = Number(lines[i].trim())
    if (!Number.isInteger(code)) throw new DxfImportError('Not a DXF file')
    out.push({ code, value: lines[i + 1].trim() })
  }
  return out
}

/** Entity records: type plus its groups, from the ENTITIES section. */
function entityRecords(gs: Group[]): { type: string; groups: Group[] }[] {
  const out: { type: string; groups: Group[] }[] = []
  let inEntities = false
  for (let i = 0; i < gs.length; i++) {
    const g = gs[i]
    if (g.code === 0 && g.value === 'SECTION' && gs[i + 1]?.code === 2) {
      inEntities = gs[i + 1].value === 'ENTITIES'
      i++
      continue
    }
    if (g.code === 0 && g.value === 'ENDSEC') inEntities = false
    if (!inEntities) continue
    if (g.code === 0) out.push({ type: g.value, groups: [] })
    else out[out.length - 1]?.groups.push(g)
  }
  return out
}

function insUnits(gs: Group[]): number {
  const i = gs.findIndex((g) => g.code === 9 && g.value === '$INSUNITS')
  const code = i >= 0 ? Number(gs[i + 1]?.value) : 0
  return INSUNITS_MM[code] ?? 1
}

const num = (gs: Group[], code: number, fallback = 0) => {
  const g = gs.find((x) => x.code === code)
  const v = g ? Number(g.value) : NaN
  return Number.isFinite(v) ? v : fallback
}
const nums = (gs: Group[], code: number) => gs.filter((g) => g.code === code).map((g) => Number(g.value))

type P = [number, number]

/** A vertex chain with bulges (bulge i applies to the edge from vertex i to i + 1) as a Paper path, DXF coords. */
function bulgePath(vertices: P[], bulges: number[], closed: boolean): paper.Path {
  const ps = kernel()
  const path = new ps.Path({ insert: false })
  path.moveTo(new ps.Point(vertices[0]))
  const n = closed ? vertices.length : vertices.length - 1
  for (let i = 0; i < n; i++) {
    const a = vertices[i]
    const b = vertices[(i + 1) % vertices.length]
    const bulge = bulges[i] ?? 0
    if (Math.abs(bulge) < 1e-12 || (a[0] === b[0] && a[1] === b[1])) {
      if (i + 1 < vertices.length) path.lineTo(new ps.Point(b))
      continue
    }
    // Arc midpoint: off the chord's midpoint by the sagitta, to the right of travel for a positive (CCW) bulge.
    const [cx, cy] = [b[0] - a[0], b[1] - a[1]]
    const len = Math.hypot(cx, cy)
    const s = (bulge * len) / 2
    const mid = new ps.Point((a[0] + b[0]) / 2 + (cy / len) * s, (a[1] + b[1]) / 2 - (cx / len) * s)
    path.arcTo(mid, new ps.Point(b))
  }
  if (closed) {
    // The closing edge ended on the first vertex: merge it into the first segment.
    if (path.segments.length > 1 && path.lastSegment.point.getDistance(path.firstSegment.point) < 1e-9) {
      path.firstSegment.handleIn = path.lastSegment.handleIn
      path.lastSegment.remove()
    }
    path.closed = true
  }
  return path
}

/** Insert knot `u` into a B-spline (Boehm). Returns the new knots and control points. */
function insertKnot(knots: number[], ctrl: P[], degree: number, u: number): [number[], P[]] {
  let k = knots.length - degree - 2
  while (k > degree && knots[k] > u) k--
  while (k + 1 < knots.length && knots[k + 1] <= u) k++
  const out: P[] = []
  for (let i = 0; i < ctrl.length + 1; i++) {
    if (i <= k - degree) out.push(ctrl[i])
    else if (i > k) out.push(ctrl[i - 1])
    else {
      const denom = knots[i + degree] - knots[i]
      const a = denom === 0 ? 0 : (u - knots[i]) / denom
      out.push([(1 - a) * ctrl[i - 1][0] + a * ctrl[i][0], (1 - a) * ctrl[i - 1][1] + a * ctrl[i][1]])
    }
  }
  return [[...knots.slice(0, k + 1), u, ...knots.slice(k + 1)], out]
}

/**
 * A clamped, non-rational B-spline of degree 1–3 as Bézier curves: every interior knot is raised to
 * multiplicity `degree`, after which consecutive control points form the Bézier segments.
 */
export function splineToBezier(degree: number, knots: number[], ctrl: P[]): Segment[] | null {
  if (degree < 1 || degree > 3 || ctrl.length < degree + 1 || knots.length !== ctrl.length + degree + 1) return null
  let [k, c] = [knots, ctrl]
  const interior = [...new Set(knots.slice(degree + 1, knots.length - degree - 1))]
  for (const u of interior) {
    const have = k.filter((x) => x === u).length
    for (let m = have; m < degree; m++) [k, c] = insertKnot(k, c, degree, u)
  }
  // Clamped ends assumed (first/last knot repeated degree + 1 times), as CAD exports write them.
  const segs: Segment[] = [{ p: c[0] }]
  for (let i = 0; i + degree < c.length; i += degree) {
    const [p0, p1, p2, p3] = [c[i], c[i + 1], c[i + 2], c[i + 3]]
    const last = segs[segs.length - 1]
    if (degree === 1) {
      segs.push({ p: p1 })
    } else if (degree === 2) {
      // Elevate the quadratic to a cubic: handles at 2/3 of the way to the control point.
      last.ho = [((p1[0] - p0[0]) * 2) / 3, ((p1[1] - p0[1]) * 2) / 3]
      segs.push({ p: p2, hi: [((p1[0] - p2[0]) * 2) / 3, ((p1[1] - p2[1]) * 2) / 3] })
    } else {
      last.ho = [p1[0] - p0[0], p1[1] - p0[1]]
      segs.push({ p: p3, hi: [p2[0] - p3[0], p2[1] - p3[1]] })
    }
  }
  return segs
}

/** Rational splines: sampled with de Boor's algorithm in homogeneous coordinates. */
function sampleRational(degree: number, knots: number[], ctrl: P[], weights: number[]): P[] {
  const point = (u: number): P => {
    let k = degree
    while (k < knots.length - degree - 2 && knots[k + 1] <= u) k++
    const d = Array.from({ length: degree + 1 }, (_, j) => {
      const w = weights[j + k - degree] ?? 1
      const [x, y] = ctrl[j + k - degree]
      return [x * w, y * w, w]
    })
    for (let r = 1; r <= degree; r++) {
      for (let j = degree; j >= r; j--) {
        const i = j + k - degree
        const denom = knots[i + degree - r + 1] - knots[i]
        const a = denom === 0 ? 0 : (u - knots[i]) / denom
        d[j] = d[j].map((v, n) => (1 - a) * d[j - 1][n] + a * v)
      }
    }
    return [d[degree][0] / d[degree][2], d[degree][1] / d[degree][2]]
  }
  const [lo, hi] = [knots[degree], knots[knots.length - degree - 1]]
  const spans = Math.max(1, ctrl.length - degree)
  const n = spans * RATIONAL_SAMPLES
  return Array.from({ length: n + 1 }, (_, i) => point(lo + ((hi - lo) * i) / n))
}

function shapeOf(type: string, gs: Group[]): paper.Path | null {
  const ps = kernel()
  const pt = (x: number, y: number) => new ps.Point(x, y)
  switch (type) {
    case 'LINE':
      return new ps.Path({ segments: [pt(num(gs, 10), num(gs, 20)), pt(num(gs, 11), num(gs, 21))], insert: false })
    case 'LWPOLYLINE': {
      // Vertices are 10/20 pairs; a bulge (42) belongs to the vertex before it.
      const vertices: P[] = []
      const bulges: number[] = []
      for (const g of gs) {
        if (g.code === 10) {
          vertices.push([Number(g.value), 0])
          bulges.push(0)
        } else if (g.code === 20 && vertices.length) vertices[vertices.length - 1][1] = Number(g.value)
        else if (g.code === 42 && vertices.length) bulges[bulges.length - 1] = Number(g.value)
      }
      return vertices.length >= 2 ? bulgePath(vertices, bulges, (num(gs, 70) & 1) === 1) : null
    }
    case 'CIRCLE':
      return num(gs, 40) > 0
        ? new ps.Path.Circle({ center: pt(num(gs, 10), num(gs, 20)), radius: num(gs, 40), insert: false })
        : null
    case 'ARC': {
      const [cx, cy, r] = [num(gs, 10), num(gs, 20), num(gs, 40)]
      let [a0, a1] = [num(gs, 50), num(gs, 51)]
      if (r <= 0) return null
      if (a1 <= a0) a1 += 360
      const at = (deg: number) => pt(cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180))
      return new ps.Path.Arc({ from: at(a0), through: at((a0 + a1) / 2), to: at(a1), insert: false })
    }
    case 'ELLIPSE': {
      const c = pt(num(gs, 10), num(gs, 20))
      const major = pt(num(gs, 11), num(gs, 21))
      const ratio = num(gs, 40, 1)
      let [t0, t1] = [num(gs, 41, 0), num(gs, 42, Math.PI * 2)]
      if (t1 <= t0) t1 += Math.PI * 2
      const minor = pt(-major.y * ratio, major.x * ratio)
      const at = (t: number) => c.add(major.multiply(Math.cos(t))).add(minor.multiply(Math.sin(t)))
      if (Math.abs(t1 - t0 - Math.PI * 2) < 1e-9) {
        const e = new ps.Path.Ellipse({ center: c, radius: [major.length, major.length * ratio], insert: false })
        e.rotate(major.angle, c)
        return e
      }
      // Partial ellipse: sampled at 1° steps of the parameter, then smoothed into curves.
      const n = Math.max(8, Math.ceil(((t1 - t0) * 180) / Math.PI))
      const path = new ps.Path({
        segments: Array.from({ length: n + 1 }, (_, i) => at(t0 + ((t1 - t0) * i) / n)),
        insert: false,
      })
      path.smooth({ type: 'catmull-rom' })
      return path
    }
    case 'SPLINE': {
      const degree = num(gs, 71, 3)
      const knots = nums(gs, 40)
      const xs = nums(gs, 10)
      const ys = nums(gs, 20)
      const ctrl = xs.map((x, i): P => [x, ys[i] ?? 0])
      const weights = nums(gs, 41)
      const closed = (num(gs, 70) & 1) === 1
      if (ctrl.length >= 2 && knots.length === ctrl.length + degree + 1) {
        const rational = weights.length > 0 && weights.some((w) => Math.abs(w - 1) > 1e-12)
        if (!rational) {
          const segs = splineToBezier(degree, knots, ctrl)
          if (segs) return new ps.Path({ ...toPaperSegments(segs), closed, insert: false })
        }
        return new ps.Path({ segments: sampleRational(degree, knots, ctrl, weights), closed, insert: false })
      }
      // No usable knots: go through the fit points.
      const fx = nums(gs, 11)
      const fy = nums(gs, 21)
      if (fx.length < 2) return null
      const path = new ps.Path({ segments: fx.map((x, i) => pt(x, fy[i] ?? 0)), closed, insert: false })
      path.smooth({ type: 'catmull-rom' })
      return path
    }
    default:
      return null
  }
}

function toPaperSegments(segs: Segment[]) {
  const ps = kernel()
  return {
    segments: segs.map(
      (s) => new ps.Segment(new ps.Point(s.p), s.hi && new ps.Point(s.hi), s.ho && new ps.Point(s.ho)),
    ),
  }
}

/** Old-style POLYLINE: the VERTEX records that follow it, up to SEQEND, folded into one record. */
function foldPolylines(records: { type: string; groups: Group[] }[]) {
  const out: { type: string; groups: Group[] }[] = []
  for (let i = 0; i < records.length; i++) {
    const r = records[i]
    if (r.type !== 'POLYLINE') {
      out.push(r)
      continue
    }
    const groups: Group[] = [{ code: 70, value: String(num(r.groups, 70)) }]
    while (records[i + 1]?.type === 'VERTEX') {
      const v = records[++i].groups
      groups.push(
        { code: 10, value: String(num(v, 10)) },
        { code: 20, value: String(num(v, 20)) },
        { code: 42, value: String(num(v, 42)) },
      )
    }
    if (records[i + 1]?.type === 'SEQEND') i++
    out.push({ type: 'LWPOLYLINE', groups })
  }
  return out
}

const r6 = (v: number) => Math.round(v * 1e6) / 1e6 || 0

/** Shapes in a DXF file, in mm (y down). Throws DxfImportError if the text isn't DXF. */
export function importDxf(text: string): DxfImport {
  const gs = groups(text)
  if (!gs.some((g) => g.code === 0 && g.value === 'SECTION')) throw new DxfImportError('Not a DXF file')
  const scale = insUnits(gs)
  const ps = kernel()
  const flip = new ps.Matrix(scale, 0, 0, -scale, 0, 0)
  const out: DxfImport = { shapes: [], skipped: 0 }
  for (const { type, groups: g } of foldPolylines(entityRecords(gs))) {
    const path = shapeOf(type, g)
    if (!path) {
      out.skipped++
      continue
    }
    path.transform(flip)
    if (path.segments.length < 2) continue
    const shape = fromPaperPath(path)
    out.shapes.push({
      closed: shape.closed,
      segments: shape.segments.map(({ p, hi, ho }) => {
        const s: Segment = { p: [r6(p[0]), r6(p[1])] }
        if (hi) s.hi = [r6(hi[0]), r6(hi[1])]
        if (ho) s.ho = [r6(ho[0]), r6(ho[1])]
        return s
      }),
    })
  }
  return out
}
