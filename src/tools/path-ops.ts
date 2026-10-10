// M9 Join and booleans on the selection (palette buttons and Shift+J / Shift+U / Shift+D, like the flips);
// Explode (Shift+X), as in AutoCAD: paths into one entity per segment.
// Pure: each builds one command, or null when the selection doesn't qualify.

import { findEntity, replaceEntities, type Command } from '../document/commands'
import type { Entity, Id, PathEntity, Project } from '../document/model'
import { booleanOp, closedArea, isClosedShape, join, type Shape } from '../geometry/edit'
import { shapesToEntities } from './trim'

export interface PathOp {
  command: Command
  /** What to select afterwards. */
  resultIds: Id[]
}

function selected(project: Project, ids: readonly Id[]): Entity[] {
  return ids.map((id) => findEntity(project, id)?.entity).filter((e) => e !== undefined)
}

const isOpenPath = (e: Entity): e is PathEntity => e.type === 'path' && !e.closed && e.segments.length > 1

/**
 * Join the selected open paths into one, end to nearest end, starting from the first selected; with a single
 * path, close it if its ends meet. The result keeps the first path's id and style.
 */
export function joinSelection(project: Project, ids: readonly Id[]): PathOp | null {
  const paths = selected(project, ids).filter(isOpenPath)
  if (paths.length === 0) return null
  const [first, ...rest] = paths
  let acc: Shape | null = first
  if (rest.length === 0) acc = join(first)
  const left = [...rest]
  const used: PathEntity[] = [first]
  while (acc && !acc.closed && left.length > 0) {
    // Join whichever remaining path comes closest to either end of what we have.
    const ends = [acc.segments[0].p, acc.segments[acc.segments.length - 1].p]
    const gap = (p: PathEntity) =>
      Math.min(
        ...ends.flatMap((q) =>
          [p.segments[0].p, p.segments[p.segments.length - 1].p].map((r) => Math.hypot(q[0] - r[0], q[1] - r[1])),
        ),
      )
    left.sort((a, b) => gap(a) - gap(b))
    const next = left.shift()!
    used.push(next)
    acc = join(acc, next)
  }
  if (!acc) return null
  return {
    resultIds: [first.id],
    command: replaceEntities(
      used.map((p, i) => ({ id: p.id, with: i === 0 ? shapesToEntities(first, [acc]) : [] })),
      'history.join',
    ),
  }
}

/**
 * Explode the selected paths into one open path per segment (curves keep their handles). The first segment
 * keeps the path's id; circles, text and holes are left alone. Null if no selected path has two segments.
 */
export function explodeSelection(project: Project, ids: readonly Id[]): PathOp | null {
  const paths = selected(project, ids).filter(
    (e): e is PathEntity => e.type === 'path' && (e.closed ? e.segments.length >= 2 : e.segments.length >= 3),
  )
  if (paths.length === 0) return null
  const replacements = paths.map((p) => {
    const s = p.segments
    const n = p.closed ? s.length : s.length - 1
    const pieces: Shape[] = Array.from({ length: n }, (_, i) => {
      const a = s[i]
      const b = s[(i + 1) % s.length]
      const start: Shape['segments'][number] = { p: a.p }
      const end: Shape['segments'][number] = { p: b.p }
      if (a.ho) start.ho = a.ho
      if (b.hi) end.hi = b.hi
      return { segments: [start, end], closed: false }
    })
    return { id: p.id, with: shapesToEntities(p, pieces) }
  })
  const untouched = ids.filter((id) => !paths.some((p) => p.id === id))
  return {
    resultIds: [...untouched, ...replacements.flatMap((r) => r.with.map((e) => e.id))],
    command: replaceEntities(replacements, 'history.explode'),
  }
}

/**
 * Union of the selected closed shapes, or difference: the largest minus all the others (cutting windows out
 * of a piece). Results keep the base shape's id and style; inner cut-outs become their own outlines.
 */
export function booleanSelection(project: Project, ids: readonly Id[], op: 'union' | 'difference'): PathOp | null {
  const shapes = selected(project, ids).filter(isClosedShape)
  if (shapes.length < 2) return null
  if (op === 'difference') shapes.sort((a, b) => closedArea(b) - closedArea(a))
  const result = booleanOp(op, shapes)
  const [base, ...others] = shapes
  const entities = shapesToEntities(base, result)
  return {
    resultIds: entities.map((e) => e.id),
    command: replaceEntities(
      [{ id: base.id, with: entities }, ...others.map((e) => ({ id: e.id, with: [] }))],
      op === 'union' ? 'history.union' : 'history.difference',
    ),
  }
}
