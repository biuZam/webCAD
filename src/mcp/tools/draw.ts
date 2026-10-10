// Drawing tools. Every add_* tool is add_entities with one item, so a batch and single calls build the same
// entities. Defaults follow the App: lines are one entity per segment, styles come from the layer kind.

import { z } from 'zod'
import { DEFAULT_STROKE_MM, LINE_STYLE_FOR_LAYER } from '../../document/builders'
import { addEntities } from '../../document/commands'
import { newId } from '../../document/factory'
import type { Entity, LayerKind, Project, Segment } from '../../document/model'
import { arcSegments, arcThrough } from '../../geometry/arcs'
import { grainArrowSegments, rectangleSegments } from '../../geometry/shapes'
import type { Vec2 } from '../../lib/vec2'
import type { Registrar } from '../define'
import { commit, pieceOf, writableLayer } from '../edit'
import { ToolError } from '../result'
import { docId, length, placement, segment, vec2 } from '../schemas'
import type { Sessions } from '../sessions'

const DEFAULT_TEXT_SIZE = 5

const lines = z.object({
  kind: z.literal('lines'),
  points: z.array(vec2).min(2),
  closed: z.boolean().optional().describe('Add a segment from the last point back to the first.'),
  mode: z
    .enum(['segments', 'polyline'])
    .optional()
    .describe("'segments' (default): one entity per segment, like the App's Line tool. 'polyline': one path."),
  ...placement,
})
const rect = z.object({
  kind: z.literal('rect'),
  x: z.number().describe('Left edge (mm).'),
  y: z.number().describe('Top edge (mm, y down).'),
  width: length,
  height: length,
  cornerRadius: z.number().min(0).optional(),
  ...placement,
})
const circle = z.object({
  kind: z.literal('circle'),
  center: vec2,
  r: length.optional().describe('Radius. Or give rx and ry for an ellipse.'),
  rx: length.optional(),
  ry: length.optional(),
  rotation: z.number().optional().describe('Ellipse rotation, degrees clockwise.'),
  ...placement,
})
const arc = z.object({
  kind: z.literal('arc'),
  center: vec2.optional(),
  r: length.optional(),
  startAngle: z.number().optional().describe('Degrees; 0 = +x, 90 = +y (down), i.e. clockwise on screen.'),
  sweepAngle: z.number().optional().describe('Degrees, positive = clockwise on screen. Max ±360.'),
  start: vec2.optional().describe('Or three points: start, through, end.'),
  through: vec2.optional(),
  end: vec2.optional(),
  ...placement,
})
const path = z.object({
  kind: z.literal('path'),
  segments: z.array(segment).min(2),
  closed: z.boolean(),
  ...placement,
})
const text = z.object({
  kind: z.literal('text'),
  position: vec2.describe('Baseline start.'),
  text: z.string().min(1),
  size: length.optional().describe(`Font size in mm. Default ${DEFAULT_TEXT_SIZE}.`),
  rotation: z.number().optional().describe('Degrees clockwise.'),
  ...placement,
})
const centreLine = z.object({ kind: z.literal('centreLine'), from: vec2, to: vec2, ...placement })
const grainArrow = z.object({ kind: z.literal('grainArrow'), from: vec2, to: vec2, ...placement })

const item = z.discriminatedUnion('kind', [lines, rect, circle, arc, path, text, centreLine, grainArrow])
type Item = z.infer<typeof item>

const DEFAULT_LAYER: Record<Item['kind'], LayerKind> = {
  lines: 'cut',
  rect: 'cut',
  circle: 'cut',
  arc: 'cut',
  path: 'cut',
  text: 'notes',
  centreLine: 'reference',
  grainArrow: 'notes',
}

function arcGeometry(a: z.infer<typeof arc>): Segment[] {
  if (a.start && a.through && a.end) {
    const segments = arcThrough(a.start, a.through, a.end)
    if (!segments) throw new ToolError('The three arc points are (nearly) on one line.')
    return segments
  }
  if (!a.center || a.r === undefined || a.startAngle === undefined || a.sweepAngle === undefined)
    throw new ToolError('An arc needs center, r, startAngle and sweepAngle, or start, through and end.')
  if (a.sweepAngle === 0 || Math.abs(a.sweepAngle) > 360)
    throw new ToolError('sweepAngle must be in [-360, 360], not 0.')
  const rad = Math.PI / 180
  return arcSegments(a.center, a.r, a.startAngle * rad, a.sweepAngle * rad)
}

/** The entities for one item, on its layer, with the App's default styles. */
function build(project: Project, it: Item): Entity[] {
  const layer = writableLayer(project, it.layer ?? DEFAULT_LAYER[it.kind])
  const style = () => ({
    id: newId(),
    layerId: layer.id,
    lineStyle: it.lineStyle ?? (it.kind === 'centreLine' ? 'dashDot' : LINE_STYLE_FOR_LAYER[layer.kind]),
    strokeWidth: it.strokeWidth ?? DEFAULT_STROKE_MM,
  })
  const pathOf = (segments: Segment[], closed: boolean): Entity => ({ ...style(), type: 'path', segments, closed })
  switch (it.kind) {
    case 'lines': {
      const pts = it.points
      if (it.mode === 'polyline')
        return [
          pathOf(
            pts.map((p) => ({ p })),
            !!it.closed,
          ),
        ]
      const pairs: [Vec2, Vec2][] = pts.slice(1).map((p, i) => [pts[i], p])
      if (it.closed) pairs.push([pts[pts.length - 1], pts[0]])
      return pairs.map(([a, b]) => pathOf([{ p: a }, { p: b }], false))
    }
    case 'rect':
      return [pathOf(rectangleSegments([it.x, it.y], [it.x + it.width, it.y + it.height], it.cornerRadius), true)]
    case 'circle': {
      const rx = it.r ?? it.rx
      const ry = it.r ?? it.ry
      if (rx === undefined || ry === undefined) throw new ToolError('A circle needs r, or rx and ry.')
      return [{ ...style(), type: 'circle', center: it.center, rx, ry, rotation: it.r ? 0 : (it.rotation ?? 0) }]
    }
    case 'arc':
      return [pathOf(arcGeometry(it), false)]
    case 'path':
      return [pathOf(it.segments, it.closed)]
    case 'text':
      return [
        {
          ...style(),
          type: 'text',
          position: it.position,
          text: it.text,
          size: it.size ?? DEFAULT_TEXT_SIZE,
          rotation: it.rotation ?? 0,
        },
      ]
    case 'centreLine':
      return [{ ...style(), type: 'centreLine', from: it.from, to: it.to }]
    case 'grainArrow':
      return [pathOf(grainArrowSegments(it.from, it.to), false)]
  }
}

export function registerDrawTools(tool: Registrar, sessions: Sessions) {
  const add = (id: string, items: Item[]) => {
    const doc = sessions.get(id)
    const { project } = doc.store.getState()
    // Items may go to different pieces: group by piece, one command, one undo step.
    const byPiece = new Map<string, Entity[]>()
    for (const it of items) {
      const piece = pieceOf(project, it.pieceId)
      byPiece.set(piece.id, [...(byPiece.get(piece.id) ?? []), ...build(project, it)])
    }
    const created = [...byPiece.values()].flat().map((e) => e.id)
    const commands = [...byPiece].map(([pieceId, entities]) => addEntities(pieceId, entities))
    return commit(
      doc,
      { labelKey: 'history.add', recipe: (draft) => commands.forEach((c) => c.recipe(draft)) },
      { created },
    )
  }

  const single = <S extends z.ZodObject>(name: string, description: string, schema: S) =>
    tool(
      name,
      { description, input: { docId, ...schema.omit({ kind: true }).shape }, write: true },
      ({ docId, ...rest }) => add(docId, [{ ...rest, kind: schema.shape.kind.value } as Item]),
    )

  single(
    'add_lines',
    'Draw straight lines through points. By default each segment is its own entity (like the App); ' +
      "mode 'polyline' makes one path. Default layer: cut.",
    lines,
  )
  single('add_rect', 'Draw a rectangle (one closed path), optionally with rounded corners. Default layer: cut.', rect)
  single('add_circle', 'Draw a circle (r) or an ellipse (rx, ry, rotation). Default layer: cut.', circle)
  single(
    'add_arc',
    'Draw a circular arc from center, r, startAngle, sweepAngle, or through three points. Default layer: cut.',
    arc,
  )
  single(
    'add_path',
    'Draw a path from segments with optional Bézier handles (relative to each anchor). Default layer: cut.',
    path,
  )
  single('add_text', 'Place a text label. Default layer: notes.', text)
  single('add_centre_line', 'Draw a centre line (dash-dot). Default layer: reference.', centreLine)
  single('add_grain_arrow', 'Draw a grain-direction arrow from → to. Default layer: notes.', grainArrow)

  tool(
    'add_entities',
    {
      description:
        'Add several items in one undo step. Each item has `kind` (lines, rect, circle, arc, path, text, ' +
        'centreLine, grainArrow) and the same fields as the matching add_* tool.',
      input: { docId, items: z.array(item).min(1) },
      write: true,
    },
    ({ docId, items }) => add(docId, items),
  )
}
