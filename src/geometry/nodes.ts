// T1.2 Node editing on model segments: move anchors and handles, toggle smooth/corner. Pure functions.
// "Smooth" is not stored: an anchor is smooth when both handles exist and point in exactly opposite directions.

import type { Segment } from '../document/model'
import { scale, sub, type Vec2 } from '../lib/vec2'

export type NodePart = 'anchor' | 'hi' | 'ho'

/** Below this |cross product| of the unit handles, two opposite handles count as collinear. */
const COLLINEAR = 1e-6

const len = (v: Vec2) => Math.hypot(v[0], v[1])

export function isSmooth(seg: Segment): boolean {
  const { hi, ho } = seg
  if (!hi || !ho) return false
  const a = len(hi)
  const b = len(ho)
  if (a === 0 || b === 0) return false
  const cross = (hi[0] * ho[1] - hi[1] * ho[0]) / (a * b)
  const dot = (hi[0] * ho[0] + hi[1] * ho[1]) / (a * b)
  return Math.abs(cross) < COLLINEAR && dot < 0
}

function replace(segments: readonly Segment[], i: number, seg: Segment): Segment[] {
  const out = [...segments]
  out[i] = seg
  return out
}

/** Move anchor `i` to `p`; its handles are relative, so they come along. */
export function moveAnchor(segments: readonly Segment[], i: number, p: Vec2): Segment[] {
  return replace(segments, i, { ...segments[i], p })
}

/**
 * Put handle `part` of anchor `i` at absolute point `to`. If the anchor was smooth the opposite handle swings
 * to stay collinear, keeping its own length (like other vector editors). Dragging a handle onto its anchor
 * removes it.
 */
export function moveHandle(segments: readonly Segment[], i: number, part: 'hi' | 'ho', to: Vec2): Segment[] {
  const seg = segments[i]
  const handle = sub(to, seg.p)
  const next: Segment = { ...seg }
  if (len(handle) < 1e-9) {
    delete next[part]
    return replace(segments, i, next)
  }
  next[part] = handle
  const other = part === 'hi' ? 'ho' : 'hi'
  const otherHandle = seg[other]
  if (isSmooth(seg) && otherHandle) next[other] = scale(handle, -len(otherHandle) / len(handle))
  return replace(segments, i, next)
}

/**
 * Corner → smooth: handles along the line between the neighbours, a third of the way to each.
 * Smooth (or any handles) → corner: no handles.
 */
export function toggleSmooth(segments: readonly Segment[], closed: boolean, i: number): Segment[] {
  const seg = segments[i]
  if (seg.hi || seg.ho) {
    const { hi: _hi, ho: _ho, ...corner } = seg
    return replace(segments, i, corner)
  }
  const n = segments.length
  const prev = i > 0 ? segments[i - 1].p : closed ? segments[n - 1].p : null
  const next = i < n - 1 ? segments[i + 1].p : closed ? segments[0].p : null
  if (!prev && !next) return [...segments]
  // At an open end, use the single neighbour for the direction.
  const dir = sub(next ?? seg.p, prev ?? seg.p)
  const d = len(dir)
  if (d === 0) return [...segments]
  const u = scale(dir, 1 / d)
  const toPrev = prev ? len(sub(seg.p, prev)) / 3 : 0
  const toNext = next ? len(sub(next, seg.p)) / 3 : 0
  const smooth: Segment = { p: seg.p }
  if (prev) smooth.hi = scale(u, -toPrev)
  if (next) smooth.ho = scale(u, toNext)
  return replace(segments, i, smooth)
}

/** Absolute position of a node part. */
export function nodePosition(seg: Segment, part: NodePart): Vec2 | null {
  if (part === 'anchor') return seg.p
  const h = seg[part]
  return h ? [seg.p[0] + h[0], seg.p[1] + h[1]] : null
}

const lerp = (a: Vec2, b: Vec2, t: number): Vec2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
/** A relative handle, or undefined when it has zero length (a corner side). */
const handleTo = (from: Vec2, to: Vec2): Vec2 | undefined => {
  const h = sub(to, from)
  return len(h) < 1e-12 ? undefined : h
}

function withHandle(seg: Segment, part: 'hi' | 'ho', h: Vec2 | undefined): Segment {
  const next: Segment = { ...seg }
  if (h) next[part] = h
  else delete next[part]
  return next
}

/**
 * T1.2b Insert an anchor on the curve from anchor `i` to the next one (wrapping on a closed path) at curve
 * time `t` in (0, 1). The shape is unchanged: the cubic is split by de Casteljau, so neighbouring handles
 * shorten and the new anchor is smooth where the curve is curved.
 */
export function insertAnchor(segments: readonly Segment[], i: number, t: number): Segment[] {
  const j = (i + 1) % segments.length
  const a = segments[i]
  const b = segments[j]
  const out = [...segments]
  if (!a.ho && !b.hi) {
    out.splice(i + 1, 0, { p: lerp(a.p, b.p, t) })
    return out
  }
  const p1 = nodePosition(a, 'ho') ?? a.p
  const p2 = nodePosition(b, 'hi') ?? b.p
  const q0 = lerp(a.p, p1, t)
  const q1 = lerp(p1, p2, t)
  const q2 = lerp(p2, b.p, t)
  const r0 = lerp(q0, q1, t)
  const r1 = lerp(q1, q2, t)
  const s = lerp(r0, r1, t)
  let mid: Segment = { p: s }
  mid = withHandle(mid, 'hi', handleTo(s, r0))
  mid = withHandle(mid, 'ho', handleTo(s, r1))
  out[i] = withHandle(a, 'ho', handleTo(a.p, q0))
  out[j] = withHandle(b, 'hi', handleTo(b.p, q2))
  out.splice(i + 1, 0, mid)
  return out
}

/** Fewest anchors a path may keep: a line for open paths, a triangle for closed ones. */
export const minAnchors = (closed: boolean) => (closed ? 3 : 2)

/** T1.2b Remove anchor `i`; null if the path would be left with too few anchors. Neighbours keep their handles. */
export function removeAnchor(segments: readonly Segment[], closed: boolean, i: number): Segment[] | null {
  if (segments.length <= minAnchors(closed)) return null
  return segments.filter((_, k) => k !== i)
}
