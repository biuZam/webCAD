// Headless Paper.js scope used as the geometry kernel (offset, booleans, lengths, intersections).
// It is separate from the on-screen scope in src/canvas and works in Node for tests.

import paper from 'paper/dist/paper-core'
import type { PathEntity, Segment } from '../document/model'
import type { Vec2 } from '../lib/vec2'

let scope: paper.PaperScope | undefined

/** Lazily created headless scope. Items are created with `insert: false` so nothing accumulates. */
export function kernel(): paper.PaperScope {
  if (!scope) {
    scope = new paper.PaperScope()
    scope.setup(new scope.Size(1, 1))
    scope.settings.insertItems = false
  }
  return scope
}

const toPoint = (v: Vec2 | undefined): [number, number] => (v ? [v[0], v[1]] : [0, 0])
const nonZero = (p: paper.Point): Vec2 | undefined => (p.isZero() ? undefined : [p.x, p.y])

export function toPaperPath(entity: Pick<PathEntity, 'segments' | 'closed'>): paper.Path {
  const ps = kernel()
  return new ps.Path({
    segments: entity.segments.map((s) => new ps.Segment(toPoint(s.p), toPoint(s.hi), toPoint(s.ho))),
    closed: entity.closed,
    insert: false,
  })
}

export function fromPaperPath(path: paper.Path): { segments: Segment[]; closed: boolean } {
  return {
    closed: path.closed,
    segments: path.segments.map((s) => {
      const seg: Segment = { p: [s.point.x, s.point.y] }
      const hi = nonZero(s.handleIn)
      const ho = nonZero(s.handleOut)
      if (hi) seg.hi = hi
      if (ho) seg.ho = ho
      return seg
    }),
  }
}

export function pathLength(entity: Pick<PathEntity, 'segments' | 'closed'>): number {
  return toPaperPath(entity).length
}
