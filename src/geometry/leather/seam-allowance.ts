// L6 Seam allowance with a value per edge: each edge of a closed outline (the spans between its corners, as for
// stitch holes) is offset outward by its own allowance with the precise offset, then neighbouring edges are
// joined: cut back where they cross (inside corners), extended along their end tangents to meet (outside
// corners, a miter), or bevelled when a miter would be longer than MITER_LIMIT × the allowance.

import type { PathEntity, Segment } from '../../document/model'
import { openAt, subPath, type Shape } from '../edit'
import { fromPaperPath, toPaperPath } from '../kernel'
import { MITER_LIMIT, offsetEntity, shapeToPath } from '../offset'
import { cornerOffsets } from './stitch-holes'

/** Edges shorter than this (mm), e.g. between coincident anchors, are ignored. */
const MIN_EDGE = 1e-6

/**
 * The edges of a closed outline: open pieces between its corners, in path order, starting at the first
 * corner. A closed outline without corners (a circle, a fully rounded shape) is a single closed edge.
 */
export function outlineEdges(shape: Shape): Shape[] {
  if (!shape.closed || shape.segments.length < 2) return []
  const path = toPaperPath(shape)
  const corners = cornerOffsets(path)
  if (corners.length === 0) return [shape]
  const open = openAt(path, corners[0])
  const stops = [...corners.map((c) => c - corners[0]), path.length]
  const out: Shape[] = []
  for (let i = 0; i + 1 < stops.length; i++) {
    const piece = stops[i + 1] - stops[i] > MIN_EDGE ? subPath(open, stops[i], stops[i + 1]) : null
    if (piece) out.push(fromPaperPath(piece))
  }
  return out
}

const asEntity = (s: Shape): PathEntity => ({
  id: '',
  type: 'path',
  layerId: '',
  lineStyle: 'solid',
  strokeWidth: 0,
  segments: s.segments,
  closed: s.closed,
})

/** One edge offset outward (`sign` turns Paper's normal side outward), as an open Paper path. */
function offsetEdge(edge: Shape, d: number, sign: number, quality: 'precise' | 'preview'): paper.Path {
  if (d === 0) return toPaperPath(edge)
  const [first] = offsetEntity(asEntity(edge), sign * d, 'miter', quality).shapes
  return toPaperPath(first ? shapeToPath(first) : edge)
}

/** Where line a + s·da meets line b + u·db, as (s, u); null if parallel. */
function lineMeet(a: paper.Point, da: paper.Point, b: paper.Point, db: paper.Point): [number, number] | null {
  const det = da.x * -db.y - da.y * -db.x
  if (Math.abs(det) < 1e-12) return null
  const rx = b.x - a.x
  const ry = b.y - a.y
  return [(rx * -db.y - ry * -db.x) / det, (da.x * ry - da.y * rx) / det]
}

/**
 * The seam-allowance outline of a closed `shape`: edge i (see outlineEdges) is moved out by `allowances[i]`
 * (missing values repeat the last one; 0 keeps the edge). Null if the shape isn't a closed outline.
 */
export function seamAllowance(
  shape: Shape,
  allowances: readonly number[],
  quality: 'precise' | 'preview' = 'precise',
): Shape | null {
  const edges = outlineEdges(shape)
  if (edges.length === 0) return null
  const at = (i: number) => allowances[Math.min(i, allowances.length - 1)] ?? 0
  if (edges.length === 1 && edges[0].closed) {
    const d = at(0)
    if (d === 0) return shape
    const [out] = offsetEntity(asEntity(shape), d, 'miter', quality).shapes
    return out ? shapeToPath(out) : null
  }

  const sign = toPaperPath(shape).clockwise ? 1 : -1
  const paths = edges.map((e, i) => offsetEdge(e, at(i), sign, quality))
  const n = paths.length
  // Per edge: where it starts and ends (offsets along it) and any straight extension at its end.
  const from = new Array<number>(n).fill(0)
  const to = paths.map((p) => p.length)
  const extendTo: (paper.Point | null)[] = new Array(n).fill(null)
  const limit = MITER_LIMIT * Math.max(...edges.map((_, i) => at(i)), 0)

  for (let i = 0; i < n; i++) {
    const a = paths[i]
    const j = (i + 1) % n
    const b = paths[j]
    const pa = a.lastSegment.point
    const pb = b.firstSegment.point
    if (pa.getDistance(pb) < 1e-9) continue
    // Inside corner: the offsets cross. Cut both at the crossing nearest this corner.
    const crossings = a.getIntersections(b)
    if (crossings.length > 0) {
      const x = crossings.reduce((best, c) => (c.offset > best.offset ? c : best))
      to[i] = x.offset
      from[j] = b.getOffsetOf(x.point)
      continue
    }
    // Outside corner: run on along both end tangents to where they meet (a miter), unless that is too far.
    const ta = a.getTangentAt(a.length).normalize()
    const tb = b.getTangentAt(0).normalize()
    const meet = lineMeet(pa, ta, pb, tb.multiply(-1))
    if (meet && meet[0] >= 0 && meet[1] >= 0 && meet[0] <= limit && meet[1] <= limit) {
      extendTo[i] = pa.add(ta.multiply(meet[0]))
    }
    // Otherwise the next edge's start is joined with a straight bevel when the pieces are concatenated.
  }

  const segments: Segment[] = []
  const push = (seg: Segment) => {
    const last = segments[segments.length - 1]
    if (last && Math.hypot(last.p[0] - seg.p[0], last.p[1] - seg.p[1]) < 1e-6) {
      // Same point: keep the incoming handle, take the outgoing one.
      if (seg.ho) last.ho = seg.ho
      else delete last.ho
      return
    }
    segments.push(seg)
  }
  for (let i = 0; i < n; i++) {
    const piece = subPath(paths[i], from[i], to[i]) ?? paths[i]
    for (const seg of fromPaperPath(piece).segments) push({ ...seg })
    const x = extendTo[i]
    if (x) push({ p: [x.x, x.y] })
  }
  // The last point meets the first: close.
  const first = segments[0]
  const last = segments[segments.length - 1]
  if (segments.length > 1 && Math.hypot(first.p[0] - last.p[0], first.p[1] - last.p[1]) < 1e-6) {
    if (last.hi) first.hi = last.hi
    segments.pop()
  }
  return { segments: dropStraightThrough(segments), closed: true }
}

/** Remove corner anchors in the middle of a straight run (left by extending edges to a miter). */
function dropStraightThrough(segments: Segment[]): Segment[] {
  const out = [...segments]
  for (let k = 0; k < out.length && out.length > 3;) {
    const prev = out[(k - 1 + out.length) % out.length]
    const seg = out[k]
    const next = out[(k + 1) % out.length]
    const straight = !prev.ho && !seg.hi && !seg.ho && !next.hi
    const ax = seg.p[0] - prev.p[0]
    const ay = seg.p[1] - prev.p[1]
    const bx = next.p[0] - seg.p[0]
    const by = next.p[1] - seg.p[1]
    const cross = ax * by - ay * bx
    if (straight && Math.abs(cross) < 1e-9 * Math.hypot(ax, ay) * Math.hypot(bx, by) + 1e-12 && ax * bx + ay * by > 0) {
      out.splice(k, 1)
    } else {
      k++
    }
  }
  return out
}
