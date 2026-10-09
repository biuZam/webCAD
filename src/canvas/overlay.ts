// Draws tool previews (PreviewShape data from src/tools) into the Paper.js overlay layer.

import type { SnapKind } from '../snapping/engine'
import type { PreviewShape } from '../tools/types'
import { buildEntityItem } from './items'

/** Half-size of the cursor cross and snap markers, in CSS px. */
const CURSOR_PX = 6
const MARKER_PX = 5
const DASH_PX = [5, 4]

export interface OverlayColors {
  /** Tool previews and cursor, on the light sheet in both themes. */
  preview: string
  /** Hover highlight (same hue as selection). */
  selection: string
  /** Snap markers. */
  snap: string
}

/** Marker glyph per snap kind, as polylines in units of MARKER_PX around the snap point (CAD conventions). */
// prettier-ignore
const MARKERS: Record<Exclude<SnapKind, 'grid'>, { lines: [number, number][][]; circle?: boolean }> = {
  endpoint:      { lines: [[[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]]] },     // square
  midpoint:      { lines: [[[0, -1.2], [1.1, 0.8], [-1.1, 0.8], [0, -1.2]]] },    // triangle
  centre:        { lines: [], circle: true },                                     // circle
  intersection:  { lines: [[[-1, -1], [1, 1]], [[1, -1], [-1, 1]]] },             // X
  perpendicular: { lines: [[[-1, -1], [-1, 1], [1, 1]], [[-1, 0], [0, 0], [0, 1]]] }, // right-angle mark
  tangent:       { lines: [[[-1.2, -1], [1.2, -1]]], circle: true },              // circle with a tangent line
  nearest:       { lines: [[[-1, -1], [1, -1], [-1, 1], [1, 1], [-1, -1]]] },     // hourglass
}

export function renderOverlay(
  ps: paper.PaperScope,
  layer: paper.Layer,
  shapes: readonly PreviewShape[],
  colors: OverlayColors,
) {
  ps.activate()
  layer.removeChildren()
  const px = 1 / ps.view.zoom
  const style = { strokeColor: new ps.Color(colors.preview), strokeWidth: 1, strokeScaling: false, insert: false }
  for (const s of shapes) {
    switch (s.kind) {
      case 'path':
        layer.addChild(
          new ps.Path({
            ...style,
            segments: s.segments.map((seg) => [seg.p, seg.hi ?? [0, 0], seg.ho ?? [0, 0]]),
            closed: s.closed,
            dashArray: s.dashed ? DASH_PX : [],
          }),
        )
        break
      case 'circle':
        layer.addChild(new ps.Path.Circle({ ...style, center: s.center, radius: s.radius }))
        break
      case 'entity': {
        const item = buildEntityItem(ps, s.entity, { color: colors.selection, width: 2 })
        item.opacity = 0.55
        layer.addChild(item)
        break
      }
      case 'point': {
        const d = CURSOR_PX * px
        const [x, y] = s.at
        layer.addChild(new ps.Path.Line({ ...style, from: [x - d, y], to: [x + d, y] }))
        layer.addChild(new ps.Path.Line({ ...style, from: [x, y - d], to: [x, y + d] }))
        break
      }
      case 'handle': {
        layer.addChild(
          new ps.Path.Line({ ...style, strokeColor: new ps.Color(colors.selection), from: s.from, to: s.to }),
        )
        layer.addChild(
          new ps.Path.Circle({
            center: s.to,
            radius: 2.5 * px,
            fillColor: new ps.Color(colors.selection),
            insert: false,
          }),
        )
        break
      }
      case 'node': {
        const r = (s.active ? 4.5 : 3.5) * px
        const nodeStyle = {
          strokeColor: new ps.Color(colors.selection),
          strokeWidth: 1,
          strokeScaling: false,
          fillColor: new ps.Color(s.active ? colors.selection : '#ffffff'),
          insert: false,
        }
        layer.addChild(
          s.smooth
            ? new ps.Path.Circle({ ...nodeStyle, center: s.at, radius: r })
            : new ps.Path.Rectangle({ ...nodeStyle, from: [s.at[0] - r, s.at[1] - r], to: [s.at[0] + r, s.at[1] + r] }),
        )
        break
      }
      case 'snap': {
        if (s.snapKind === 'grid') break
        const marker = MARKERS[s.snapKind]
        const m = MARKER_PX * px
        const [x, y] = s.at
        const markerStyle = { ...style, strokeColor: new ps.Color(colors.snap), strokeWidth: 1.5 }
        for (const line of marker.lines) {
          layer.addChild(new ps.Path({ ...markerStyle, segments: line.map(([u, v]) => [x + u * m, y + v * m]) }))
        }
        if (marker.circle) layer.addChild(new ps.Path.Circle({ ...markerStyle, center: [x, y], radius: m }))
        break
      }
    }
  }
}
