// M8 / M9 path editing on model shapes: split, trim, extend, join, union and difference. Pure functions over
// model geometry; Paper.js (the headless kernel) does the curve work. Results are plain {segments, closed}
// shapes; callers decide ids and styles.

import type { Entity, Segment } from '../document/model'
import { distance, type Vec2 } from '../lib/vec2'
import { fromPaperPath, kernel, toPaperPath } from './kernel'
import { entityShape } from './query'

export interface Shape {
  segments: Segment[]
  closed: boolean
}

/** Cuts closer than this (mm) to a path end or to each other count as the same point. */
const EPS = 1e-6

/** Endpoints closer than this (mm) are merged when joining. */
export const JOIN_TOLERANCE = 0.01

/** The entity as a single editable Paper path (paths, circles/ellipses, centre lines), or null. */
function editablePath(entity: Entity): paper.Path | null {
  switch (entity.type) {
    case 'path':
      return entity.segments.length > 1 ? toPaperPath(entity) : null
    case 'circle':
    case 'centreLine':
      return entityShape(entity).clone({ insert: false }) as paper.Path
    default:
      return null
  }
}

/** True if the entity can be split, trimmed or extended. */
export const isEditable = (entity: Entity) =>
  entity.type === 'path' ? entity.segments.length > 1 : entity.type === 'circle' || entity.type === 'centreLine'

/** The part of an *open* path between two offsets along it. */
export function subPath(path: paper.Path, from: number, to: number): paper.Path | null {
  if (to - from < EPS) return null
  const part = path.clone({ insert: false })
  if (to < part.length - EPS) part.splitAt(to)
  if (from > EPS) return part.splitAt(from)
  return part
}

/** A closed path opened at `offset`, so it starts and ends there. */
export function openAt(path: paper.Path, offset: number): paper.Path {
  const open = path.clone({ insert: false })
  open.splitAt(offset > EPS && offset < open.length - EPS ? offset : 0)
  // Opening at the very start: Paper leaves it closed; open it explicitly, repeating the first point.
  if (open.closed) {
    open.closed = false
    open.add(open.firstSegment.point.clone())
  }
  return open
}

const toShape = (p: paper.Path): Shape => fromPaperPath(p)

/**
 * M8 Split at the point nearest `p`: an open path becomes two; a closed one becomes one open path starting
 * and ending there. Null if the point is at an open path's end (nothing to split).
 */
export function splitAt(entity: Entity, p: Vec2): Shape[] | null {
  const path = editablePath(entity)
  if (!path) return null
  const at = path.getNearestLocation(new (kernel().Point)(p)).offset
  if (path.closed) return [toShape(openAt(path, at))]
  if (at < EPS || at > path.length - EPS) return null
  const head = subPath(path, 0, at)
  const tail = subPath(path, at, path.length)
  return head && tail ? [toShape(head), toShape(tail)] : null
}

/** Offsets along `path` where it crosses or touches the other entities, sorted and de-duplicated. */
function cutOffsets(path: paper.Path, others: readonly Entity[]): number[] {
  const offsets: number[] = []
  for (const other of others) {
    for (const loc of path.getIntersections(entityShape(other))) offsets.push(loc.offset)
  }
  offsets.sort((a, b) => a - b)
  return offsets.filter((o, i) => i === 0 || o - offsets[i - 1] > EPS)
}

/**
 * M8 Trim: remove the piece of the entity between the cutting points (intersections with `others`) on either
 * side of `p`. Returns what is left (possibly nothing), or null when there is nothing to trim against.
 */
export function trim(entity: Entity, others: readonly Entity[], p: Vec2): Shape[] | null {
  const path = editablePath(entity)
  if (!path) return null
  const length = path.length
  const at = path.getNearestLocation(new (kernel().Point)(p)).offset
  if (path.closed) {
    const cuts = cutOffsets(path, others)
    if (cuts.length < 2) return null
    // The cut just after the click and the one just before it, wrapping round.
    const after = cuts.find((c) => c > at) ?? cuts[0]
    const before = [...cuts].reverse().find((c) => c < at) ?? cuts[cuts.length - 1]
    const keep = (before - after + length) % length
    const kept = subPath(openAt(path, after), 0, keep)
    return kept ? [toShape(kept)] : []
  }
  const cuts = cutOffsets(path, others).filter((c) => c > EPS && c < length - EPS)
  if (cuts.length === 0) return null
  const before = [...cuts].reverse().find((c) => c < at) ?? 0
  const after = cuts.find((c) => c > at) ?? length
  return [subPath(path, 0, before), subPath(path, after, length)].filter((x) => x !== null).map(toShape)
}

/** Longest extension looked for (mm): well beyond any leather pattern. */
const EXTEND_REACH = 10_000

/**
 * M8 Extend the end of an open path (or centre line) nearest `p` in its end direction until it meets one of
 * `others`. A straight end segment is lengthened; a curved end gets a straight segment added.
 * Null if the extension meets nothing.
 */
export function extend(entity: Entity, others: readonly Entity[], p: Vec2): Shape | null {
  const path = editablePath(entity)
  if (!path || path.closed) return null
  const atEnd =
    distance(p, [path.lastSegment.point.x, path.lastSegment.point.y]) <
    distance(p, [path.firstSegment.point.x, path.firstSegment.point.y])
  const ps = kernel()
  const endPoint = atEnd ? path.lastSegment.point : path.firstSegment.point
  const tangent = path.getTangentAt(atEnd ? path.length : 0).normalize()
  const dir = atEnd ? tangent : tangent.multiply(-1)
  const ray = new ps.Path.Line({
    from: endPoint.add(dir.multiply(EPS * 10)),
    to: endPoint.add(dir.multiply(EXTEND_REACH)),
    insert: false,
  })
  let best: paper.Point | null = null
  for (const other of others) {
    for (const loc of ray.getIntersections(entityShape(other))) {
      if (!best || loc.point.getDistance(endPoint) < best.getDistance(endPoint)) best = loc.point
    }
  }
  if (!best) return null
  const shape = toShape(path)
  const segs = shape.segments
  const target: Vec2 = [best.x, best.y]
  const end = atEnd ? segs.length - 1 : 0
  const neighbour = atEnd ? segs.length - 2 : 1
  const straight = atEnd ? !segs[neighbour].ho && !segs[end].hi : !segs[end].ho && !segs[neighbour].hi
  if (straight) {
    segs[end] = { ...segs[end], p: target }
  } else if (atEnd) {
    segs.push({ p: target })
  } else {
    segs.unshift({ p: target })
  }
  return shape
}

function reversed(segments: readonly Segment[]): Segment[] {
  return [...segments].reverse().map(({ p, hi, ho }) => {
    const out: Segment = { p }
    if (ho) out.hi = ho
    if (hi) out.ho = hi
    return out
  })
}

/** End-to-start concatenation; if the meeting points coincide, they merge into one anchor. */
function concat(a: readonly Segment[], b: readonly Segment[]): Segment[] {
  const last = a[a.length - 1]
  const first = b[0]
  if (distance(last.p, first.p) > JOIN_TOLERANCE) return [...a, ...b]
  const merged: Segment = { p: last.p }
  if (last.hi) merged.hi = last.hi
  if (first.ho) merged.ho = first.ho
  return [...a.slice(0, -1), merged, ...b.slice(1)]
}

/** Close a path whose ends coincide (merging them), or leave it open. */
function closeIfMeeting(segments: Segment[]): Shape {
  if (segments.length > 2 && distance(segments[0].p, segments[segments.length - 1].p) <= JOIN_TOLERANCE) {
    const last = segments[segments.length - 1]
    const first: Segment = { ...segments[0] }
    if (last.hi) first.hi = last.hi
    else delete first.hi
    return { segments: [first, ...segments.slice(1, -1)], closed: true }
  }
  return { segments, closed: false }
}

/**
 * M9 Join two open paths at their nearest ends (merging the ends if they meet, else bridging with a straight
 * segment). The result closes if its other ends meet too. With one path, closes it if its ends meet.
 */
export function join(a: Shape, b?: Shape): Shape | null {
  if (a.closed || a.segments.length < 2) return null
  if (!b) {
    const closed = closeIfMeeting([...a.segments])
    return closed.closed ? closed : null
  }
  if (b.closed || b.segments.length < 2) return null
  const ends = (s: Shape) => [s.segments[0].p, s.segments[s.segments.length - 1].p] as const
  const [a0, a1] = ends(a)
  const [b0, b1] = ends(b)
  // a's end to b's start, trying both directions of each.
  const options: [number, () => Segment[]][] = [
    [distance(a1, b0), () => concat(a.segments, b.segments)],
    [distance(a1, b1), () => concat(a.segments, reversed(b.segments))],
    [distance(a0, b0), () => concat(reversed(a.segments), b.segments)],
    [distance(a0, b1), () => concat(b.segments, a.segments)],
  ]
  options.sort((x, y) => x[0] - y[0])
  return closeIfMeeting(options[0][1]())
}

/** Area of a closed shape (mm²); used to pick the base shape of a difference. */
export function shapeArea(shape: Shape): number {
  return Math.abs(toPaperPath(shape).area)
}

function pieces(item: paper.PathItem): Shape[] {
  const ps = kernel()
  const paths = item instanceof ps.CompoundPath ? (item.children as paper.Path[]) : [item as paper.Path]
  return paths.filter((p) => p.segments.length > 1 && Math.abs(p.area) > EPS).map(toShape)
}

/** Closed entities usable in booleans: closed paths and circles/ellipses. */
export const isClosedShape = (e: Entity) =>
  (e.type === 'path' && e.closed && e.segments.length > 2) || e.type === 'circle'

function closedPath(e: Entity): paper.Path {
  return e.type === 'path' ? toPaperPath(e) : (entityShape(e).clone({ insert: false }) as paper.Path)
}

/** Area (mm²) of a closed path or circle. */
export function closedArea(e: Entity): number {
  return Math.abs(closedPath(e).area)
}

/**
 * M9 Union of closed shapes, or difference: the first minus all the others. The result may have several
 * outlines (separate islands, or holes cut from the inside), returned as separate closed shapes.
 */
export function booleanOp(op: 'union' | 'difference', entities: readonly Entity[]): Shape[] {
  const [first, ...rest] = entities.filter(isClosedShape)
  if (!first) return []
  let acc: paper.PathItem = closedPath(first)
  for (const e of rest) {
    const next = closedPath(e)
    acc = op === 'union' ? acc.unite(next, { insert: false }) : acc.subtract(next, { insert: false })
  }
  return pieces(acc)
}
