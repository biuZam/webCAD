// Builds on-screen Paper.js items for entities. Shared by the document renderer and the overlay.

import { LINE_DASH_MM, type Entity } from '../document/model'
import { slitEnds } from '../geometry/leather/stitch-holes'

/** On-screen dash lengths are in CSS px (strokes don't scale with zoom). */
const DASH_PX_PER_MM = 2

export interface ItemStyle {
  color: string
  /** CSS px. */
  width: number
}

export function buildEntityItem(ps: paper.PaperScope, entity: Entity, style: ItemStyle): paper.Item {
  const dash = LINE_DASH_MM[entity.lineStyle]
  const stroke = {
    strokeColor: new ps.Color(style.color),
    strokeWidth: style.width,
    strokeScaling: false,
    dashArray: dash ? dash.map((d) => d * DASH_PX_PER_MM) : [],
    insert: false,
  }
  switch (entity.type) {
    case 'path':
      return new ps.Path({
        ...stroke,
        segments: entity.segments.map((s) => [s.p, s.hi ?? [0, 0], s.ho ?? [0, 0]]),
        closed: entity.closed,
      })
    case 'circle': {
      const item = new ps.Path.Ellipse({ ...stroke, center: entity.center, radius: [entity.rx, entity.ry] })
      if (entity.rotation) item.rotate(entity.rotation, new ps.Point(entity.center))
      return item
    }
    case 'centreLine':
      return new ps.Path.Line({ ...stroke, from: entity.from, to: entity.to })
    case 'holeSet': {
      // One CompoundPath per set, not one item per hole: with 17,600 holes on screen, per-hole items made a
      // full redraw ~49 ms; Paper draws a compound path's sub-paths in a single stroke call.
      // Holes are cut or punched: always drawn solid, like in the export.
      const children = entity.holes.map((p, i) => {
        if (entity.holeShape === 'slit') {
          const [from, to] = slitEnds(p, entity.angles?.[i], entity.slitAngle, entity.holeSize)
          return new ps.Path.Line({ from, to, insert: false })
        }
        return new ps.Path.Circle({ center: p, radius: entity.holeSize / 2, insert: false })
      })
      return new ps.CompoundPath({ ...stroke, dashArray: [], children, insert: false })
    }
    case 'text':
      return new ps.PointText({
        point: entity.position,
        content: entity.text,
        fontSize: entity.size,
        fillColor: new ps.Color(style.color),
        rotation: entity.rotation,
        insert: false,
      })
  }
}

/** Restyle an item built by buildEntityItem (children of hole-set groups included). */
export function restyleItem(ps: paper.PaperScope, item: paper.Item, style: ItemStyle) {
  if (item instanceof ps.PointText) {
    item.fillColor = new ps.Color(style.color)
    return
  }
  for (const target of item instanceof ps.Group ? item.children : [item]) {
    target.strokeColor = new ps.Color(style.color)
    target.strokeWidth = style.width
  }
}
