// L2/L3 Stitch-hole distribution along a path.
//
// fixed       → a hole every `pitch` mm from the start; the last gap takes what is left.
// cornerAware → the path is split at its corners and each span gets n = round(length / pitch) equal gaps,
//               so a hole lands exactly on every corner and the spacing is even within each span (it differs
//               from the nominal pitch by at most half a gap / n). This is how leatherworkers walk a chisel.
//
// A "corner" is an anchor where the direction turns by more than CORNER_ANGLE_DEG; smooth joins (a rounded
// corner's tangent arcs, a circle) are not corners. Pure geometry: no model, store or UI.

import type { CornerMode, Segment } from '../../document/model'
import type { Vec2 } from '../../lib/vec2'
import { toPaperPath } from '../kernel'

/** A turn sharper than this (degrees) at an anchor counts as a corner. */
export const CORNER_ANGLE_DEG = 20

export interface HoleLayout {
  holes: Vec2[]
  /** Path direction at each hole, degrees clockwise in y-down space. */
  angles: number[]
  /** Arc-length positions of the corners that got a hole (cornerAware only), for tests and diagnostics. */
  corners: number[]
  /**
   * L4 Indices into `holes` for each edge (the spans between corners, in path order). A hole on a corner
   * belongs to both edges it joins, as a leatherworker counts them. Without corners: one edge.
   */
  edges: number[][]
}

/**
 * End points of a slit hole (a chisel mark): length `size`, centred on the hole, at the path direction plus
 * `slitAngle` (both clockwise degrees, y-down). Missing angles (old or detached sets) count as 0.
 */
export function slitEnds(hole: Vec2, pathAngle: number | undefined, slitAngle: number, size: number): [Vec2, Vec2] {
  const a = (((pathAngle ?? 0) + slitAngle) * Math.PI) / 180
  const dx = (Math.cos(a) * size) / 2
  const dy = (Math.sin(a) * size) / 2
  return [
    [hole[0] - dx, hole[1] - dy],
    [hole[0] + dx, hole[1] + dy],
  ]
}

const EMPTY: HoleLayout = { holes: [], angles: [], corners: [], edges: [] }

/** Tolerance (mm) for a hole sitting exactly on an edge's end. */
const ON_EDGE = 1e-6

/** Group hole offsets into the spans between corners (see HoleLayout.edges). */
function edgesOf(offsets: readonly number[], corners: readonly number[], length: number, closed: boolean): number[][] {
  const all = offsets.map((_, i) => i)
  const inner = corners.filter((c) => c > ON_EDGE && c < length - ON_EDGE)
  if (closed && corners.length === 0) return [all]
  const stops = [0, ...inner, length]
  const spans: [number, number][] = closed
    ? corners.map((c, i) => [c, i + 1 < corners.length ? corners[i + 1] : corners[0] + length])
    : stops.slice(0, -1).map((a, i) => [a, stops[i + 1]])
  return spans.map(([a, b]) =>
    all
      // On a closed path a span may wrap past the start: try each offset one lap on too.
      .map((i) => {
        const o = offsets[i]
        const lap = closed && o + length <= b + ON_EDGE && o < a - ON_EDGE ? o + length : o
        return { i, o: lap }
      })
      .filter(({ o }) => o >= a - ON_EDGE && o <= b + ON_EDGE)
      .sort((x, y) => x.o - y.o)
      .map(({ i }) => i),
  )
}

/** Arc-length offsets of the anchors where the path turns sharply. */
function cornerOffsets(path: paper.Path): number[] {
  const curves = path.curves
  const out: number[] = []
  let offset = 0
  for (let i = 0; i < curves.length; i++) {
    const prev = i > 0 ? curves[i - 1] : path.closed ? curves[curves.length - 1] : null
    if (prev) {
      const turn = Math.abs(prev.getTangentAtTime(1).getDirectedAngle(curves[i].getTangentAtTime(0)))
      if (turn > CORNER_ANGLE_DEG) out.push(offset)
    }
    offset += curves[i].length
  }
  return out
}

/** Even positions over the half-open span [a, b): n = round(len / pitch) gaps, at least one. */
function evenSpan(a: number, b: number, pitch: number): number[] {
  const n = Math.max(1, Math.round((b - a) / pitch))
  const step = (b - a) / n
  return Array.from({ length: n }, (_, k) => a + k * step)
}

export function distributeHoles(
  geometry: { segments: Segment[]; closed: boolean },
  pitch: number,
  cornerMode: CornerMode,
): HoleLayout {
  if (geometry.segments.length < 2 || !(pitch > 0)) return EMPTY
  const path = toPaperPath(geometry)
  const length = path.length
  if (length === 0) return EMPTY

  let offsets: number[]
  let corners: number[] = []
  // Corners also split the edges for counting (L4), whatever the spacing mode.
  const pathCorners = cornerOffsets(path)
  if (cornerMode === 'fixed') {
    offsets = []
    // Closed: stop half a pitch before the start so the last gap isn't a sliver next to the first hole.
    const end = geometry.closed ? length - pitch / 2 : length + 1e-9
    for (let k = 0; k * pitch <= end; k++) offsets.push(k * pitch)
  } else {
    corners = pathCorners
    if (geometry.closed) {
      if (corners.length === 0) {
        offsets = evenSpan(0, length, pitch)
      } else {
        // Walk corner to corner, wrapping round the start.
        offsets = corners.flatMap((c, i) => {
          const next = i + 1 < corners.length ? corners[i + 1] : corners[0] + length
          return evenSpan(c, next, pitch).map((o) => o % length)
        })
      }
    } else {
      const stops = [0, ...corners.filter((c) => c > 0 && c < length), length]
      offsets = stops.slice(0, -1).flatMap((a, i) => evenSpan(a, stops[i + 1], pitch))
      offsets.push(length) // an open line also gets a hole at its end
    }
  }

  const holes: Vec2[] = []
  const angles: number[] = []
  const placed: number[] = []
  for (const o of offsets) {
    const at = Math.min(Math.max(o, 0), length)
    const p = path.getPointAt(at)
    const t = path.getTangentAt(at)
    if (!p || !t) continue
    holes.push([p.x, p.y])
    angles.push((Math.atan2(t.y, t.x) * 180) / Math.PI)
    placed.push(at)
  }
  return { holes, angles, corners, edges: edgesOf(placed, pathCorners, length, geometry.closed) }
}
