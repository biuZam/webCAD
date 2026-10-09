// The only module that touches Maker.js (docs/ARCHITECTURE.md A8). Converts model entities to a Maker.js model
// for its DXF exporter: straight segments → LINE, true circles → CIRCLE, Bézier curves → ARCs fitted within
// MAKER_ARC_ACCURACY (Maker.js's BezierCurve), or short LINEs when `polyline` is set. Lazy-loaded with the DXF
// export, so Maker.js never reaches the initial bundle.
//
// DXF is y-up, the model y-down: y is negated so the drawing reads the same way up.

import makerjs from 'makerjs'
import type { Entity, Layer, Segment } from '../document/model'
import type { Vec2 } from '../lib/vec2'
import { kernel } from './kernel'
import { slitEnds } from './leather/stitch-holes'
import { entityShape } from './query'

/** Max distance (mm) of the fitted arcs from the true Bézier curve; a quarter of the 0.02 mm offset budget. */
export const MAKER_ARC_ACCURACY = 0.005
/** Max deviation (mm) of flattened curves in polyline mode, as for SVG. */
const FLATTEN_TOLERANCE = 0.01

type Point = [number, number]
const pt = (p: Vec2): Point => [p[0], -p[1]]
const abs = (seg: Segment, part: 'hi' | 'ho'): Vec2 => {
  const h = seg[part]
  return h ? [seg.p[0] + h[0], seg.p[1] + h[1]] : seg.p
}

/** One open or closed chain of segments as Maker.js paths (lines) and models (Bézier curves). */
function chain(segments: readonly Segment[], closed: boolean, layer: string, into: makerjs.IModel, key: string) {
  const paths: makerjs.IPathMap = {}
  const models: makerjs.IModelMap = {}
  const n = closed ? segments.length : segments.length - 1
  for (let i = 0; i < n; i++) {
    const a = segments[i]
    const b = segments[(i + 1) % segments.length]
    if (!a.ho && !b.hi) {
      if (a.p[0] !== b.p[0] || a.p[1] !== b.p[1]) paths[`l${i}`] = new makerjs.paths.Line(pt(a.p), pt(b.p))
    } else {
      models[`c${i}`] = new makerjs.models.BezierCurve(
        [pt(a.p), pt(abs(a, 'ho')), pt(abs(b, 'hi')), pt(b.p)],
        MAKER_ARC_ACCURACY,
      )
    }
  }
  into.models![key] = { paths, models, layer }
}

/** The entity's outline flattened to points (polyline mode), via the geometry kernel. */
function flattened(entity: Entity): { points: Vec2[]; closed: boolean } | null {
  const shape = entityShape(entity).clone({ insert: false }) as paper.Path
  if (!(shape instanceof kernel().Path)) return null
  shape.flatten(FLATTEN_TOLERANCE)
  return { points: shape.segments.map((s) => [s.point.x, s.point.y]), closed: shape.closed }
}

function addEntity(entity: Entity, layer: string, polyline: boolean, into: makerjs.IModel) {
  const key = entity.id
  const asChain = (points: Vec2[], closed: boolean) =>
    chain(
      points.map((p) => ({ p })),
      closed,
      layer,
      into,
      key,
    )
  switch (entity.type) {
    case 'path': {
      if (entity.segments.length < 2) return
      const curved = entity.segments.some((s) => s.hi || s.ho)
      const flat = polyline && curved ? flattened(entity) : null
      if (flat) return asChain(flat.points, flat.closed)
      return chain(entity.segments, entity.closed, layer, into, key)
    }
    case 'circle': {
      if (entity.rx === entity.ry && !polyline) {
        const circle = new makerjs.paths.Circle(pt(entity.center), entity.rx)
        into.models![key] = { paths: { c: circle }, layer }
        return
      }
      const flat = polyline ? flattened(entity) : null
      if (flat) return asChain(flat.points, true)
      // Ellipses: their four-Bézier outline.
      const path = entityShape(entity) as paper.Path
      const segments: Segment[] = path.segments.map((s) => ({
        p: [s.point.x, s.point.y],
        hi: [s.handleIn.x, s.handleIn.y],
        ho: [s.handleOut.x, s.handleOut.y],
      }))
      return chain(segments, true, layer, into, key)
    }
    case 'centreLine':
      return asChain([entity.from, entity.to], false)
    case 'holeSet': {
      const paths: makerjs.IPathMap = {}
      entity.holes.forEach((h, i) => {
        if (entity.holeShape === 'slit') {
          const [a, b] = slitEnds(h, entity.angles?.[i], entity.slitAngle, entity.holeSize)
          paths[`h${i}`] = new makerjs.paths.Line(pt(a), pt(b))
        } else {
          paths[`h${i}`] = new makerjs.paths.Circle(pt(h), entity.holeSize / 2)
        }
      })
      into.models![key] = { paths, layer }
      return
    }
    case 'text':
      // Maker.js sets text height per layer, not per label; labels are left out of DXF.
      return
  }
}

export interface DxfOptions {
  /** Flatten curves to short lines instead of fitting arcs. */
  polyline?: boolean
}

/** A DXF (R12-style entities, $INSUNITS = mm) of `entities`, one DXF layer per model layer. */
export function toDxf(layers: readonly Layer[], entities: readonly Entity[], options: DxfOptions = {}): string {
  const names = new Map(layers.map((l) => [l.id, l.name]))
  const root: makerjs.IModel = { models: {}, units: makerjs.unitType.Millimeter }
  for (const e of entities) {
    const layer = names.get(e.layerId)
    if (layer !== undefined) addEntity(e, layer, options.polyline ?? false, root)
  }
  return makerjs.exporter.toDXF(root, { units: makerjs.unitType.Millimeter })
}
