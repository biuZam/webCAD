// Canonical true-scale SVG export: 1 user unit = 1 mm. PDF is rendered from this output.
// See docs/ARCHITECTURE.md §8.

import { LINE_DASH_MM, type Entity, type Layer, type Project, type Segment } from '../document/model'
import { emptyBounds, entityBounds, isEmpty } from '../geometry/bounds'
import { roundExport } from '../lib/units'
import { kernel } from '../geometry/kernel'
import { slitEnds } from '../geometry/leather/stitch-holes'
import { entityShape } from '../geometry/query'
import { add } from '../lib/vec2'

export interface SvgExportOptions {
  /** Only export these layer ids. Default: all visible layers. */
  layerIds?: readonly string[]
  /** Only export layers of kind `cut` (laser cutting). */
  cutOnly?: boolean
  includeLabels?: boolean
  /** Override every entity's stroke width (mm). */
  strokeWidth?: number
  /** Empty space around the drawing (mm). Default 0, so a 100 mm square gives a 100 mm document. */
  margin?: number
  /** Flatten curves and circles to straight segments (some laser software handles those better). */
  polyline?: boolean
}

/** Max deviation (mm) of a flattened curve from the true curve: far below laser kerf and print accuracy. */
export const POLYLINE_TOLERANCE = 0.01

/** Path data with curves flattened to line segments within POLYLINE_TOLERANCE. */
function flatPathData(entity: Entity): string | null {
  const shape = entityShape(entity)
  const flat = shape.clone({ insert: false }) as paper.Path
  if (!(flat instanceof kernel().Path)) return null
  flat.flatten(POLYLINE_TOLERANCE)
  return pathData(
    flat.segments.map((s) => ({ p: [s.point.x, s.point.y] })),
    flat.closed,
  )
}

const n = (mm: number) => String(roundExport(mm))
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function pathData(segments: readonly Segment[], closed: boolean): string {
  if (segments.length === 0) return ''
  const parts = [`M${n(segments[0].p[0])} ${n(segments[0].p[1])}`]
  const edge = (a: Segment, b: Segment) => {
    if (a.ho || b.hi) {
      const c1 = a.ho ? add(a.p, a.ho) : a.p
      const c2 = b.hi ? add(b.p, b.hi) : b.p
      parts.push(`C${n(c1[0])} ${n(c1[1])} ${n(c2[0])} ${n(c2[1])} ${n(b.p[0])} ${n(b.p[1])}`)
    } else {
      parts.push(`L${n(b.p[0])} ${n(b.p[1])}`)
    }
  }
  for (let i = 1; i < segments.length; i++) edge(segments[i - 1], segments[i])
  if (closed && segments.length > 1) {
    const last = segments[segments.length - 1]
    if (last.ho || segments[0].hi) edge(last, segments[0])
    parts.push('Z')
  }
  return parts.join('')
}

function styleAttrs(entity: Entity, layer: Layer, options: SvgExportOptions): string {
  const width = options.strokeWidth ?? entity.strokeWidth
  const dash = LINE_DASH_MM[entity.lineStyle]
  const attrs = [`stroke="${layer.color}"`, `stroke-width="${n(width)}"`, `fill="none"`]
  if (dash) attrs.push(`stroke-dasharray="${dash.map(n).join(' ')}"`)
  return attrs.join(' ')
}

function entityElement(entity: Entity, layer: Layer, options: SvgExportOptions): string | null {
  const style = styleAttrs(entity, layer, options)
  switch (entity.type) {
    case 'path': {
      const curved = entity.segments.some((s) => s.hi || s.ho)
      const d = options.polyline && curved ? flatPathData(entity) : pathData(entity.segments, entity.closed)
      return `<path id="${esc(entity.id)}" d="${d}" ${style}/>`
    }
    case 'circle': {
      if (options.polyline) return `<path id="${esc(entity.id)}" d="${flatPathData(entity)}" ${style}/>`
      const [cx, cy] = entity.center
      if (entity.rx === entity.ry) {
        return `<circle id="${esc(entity.id)}" cx="${n(cx)}" cy="${n(cy)}" r="${n(entity.rx)}" ${style}/>`
      }
      const rot = entity.rotation ? ` transform="rotate(${n(entity.rotation)} ${n(cx)} ${n(cy)})"` : ''
      return `<ellipse id="${esc(entity.id)}" cx="${n(cx)}" cy="${n(cy)}" rx="${n(entity.rx)}" ry="${n(entity.ry)}"${rot} ${style}/>`
    }
    case 'centreLine': {
      const [x1, y1] = entity.from
      const [x2, y2] = entity.to
      return `<line id="${esc(entity.id)}" x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" ${style}/>`
    }
    case 'holeSet': {
      // Hole outlines are always solid, whatever the set's line style: they are cut or punched.
      const solid = style.replace(/ stroke-dasharray="[^"]*"/, '')
      if (entity.holeShape === 'slit') {
        // One path for all slits keeps files small; laser software treats each M…L as a separate cut.
        const d = entity.holes
          .map((h, i) => {
            const [[x1, y1], [x2, y2]] = slitEnds(h, entity.angles?.[i], entity.slitAngle, entity.holeSize)
            return `M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}`
          })
          .join('')
        return `<path id="${esc(entity.id)}" d="${d}" ${solid}/>`
      }
      const r = n(entity.holeSize / 2)
      const holes = entity.holes.map(([x, y]) => `<circle cx="${n(x)}" cy="${n(y)}" r="${r}"/>`).join('')
      return `<g id="${esc(entity.id)}" ${solid}>${holes}</g>`
    }
    case 'text': {
      if (options.includeLabels === false) return null
      const [x, y] = entity.position
      const rot = entity.rotation ? ` transform="rotate(${n(entity.rotation)} ${n(x)} ${n(y)})"` : ''
      return `<text id="${esc(entity.id)}" x="${n(x)}" y="${n(y)}" font-size="${n(entity.size)}" fill="${layer.color}"${rot}>${esc(entity.text)}</text>`
    }
  }
}

export function exportSvg(project: Project, options: SvgExportOptions = {}): string {
  const layers = project.layers.filter((l) => {
    if (options.cutOnly && l.kind !== 'cut') return false
    return options.layerIds ? options.layerIds.includes(l.id) : l.visible
  })
  const layerIds = new Set(layers.map((l) => l.id))
  const entities = project.pieces.flatMap((p) => p.entities).filter((e) => layerIds.has(e.layerId))
  const exported = entities.filter((e) => !(e.type === 'text' && options.includeLabels === false))

  const b = emptyBounds()
  for (const e of exported) entityBounds(e, b)
  const margin = options.margin ?? 0
  const [x, y, w, h] = isEmpty(b)
    ? [0, 0, 1, 1]
    : [b.minX - margin, b.minY - margin, b.maxX - b.minX + 2 * margin, b.maxY - b.minY + 2 * margin]

  const groups = layers.map((layer) => {
    const children = exported
      .filter((e) => e.layerId === layer.id)
      .map((e) => entityElement(e, layer, options))
      .filter((s): s is string => s !== null)
    return `<g id="layer-${esc(layer.id)}" inkscape:groupmode="layer" inkscape:label="${esc(layer.name)}">${children.join('')}</g>`
  })

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"` +
      ` width="${n(w)}mm" height="${n(h)}mm" viewBox="${n(x)} ${n(y)} ${n(w)} ${n(h)}">`,
    `<title>${esc(project.name)}</title>`,
    ...groups,
    `</svg>`,
    '',
  ].join('\n')
}
