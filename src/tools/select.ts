// T1.1 Selection: click, Shift-click to toggle, box select, Delete.
// Box direction follows CAD convention: dragging left→right selects entities fully inside ("window"),
// right→left selects anything the box touches ("crossing", drawn dashed).

import { removeEntities, updateEntity } from '../document/commands'
import type { Entity, Id, PathEntity, Project, Segment } from '../document/model'
import { entityBounds, type Bounds } from '../geometry/bounds'
import { entitiesInRect, entitiesNear, nearestPoint, touchesRect } from '../geometry/query'
import { isSmooth, moveAnchor, moveHandle, nodePosition, toggleSmooth, type NodePart } from '../geometry/nodes'
import { distance, type Vec2 } from '../lib/vec2'
import type { PreviewShape, Tool, ToolContext, ToolPointerEvent } from './types'

/** Pick tolerance around the cursor, in CSS px. */
export const PICK_TOLERANCE_PX = 6
/** A press that moves less than this (CSS px) is a click, not a box. */
const DRAG_THRESHOLD_PX = 4

/** The selectable entity closest to `p` within `tolerance` mm, or null. Text and holes are hit inside their area. */
export function hitTest(project: Project, p: Vec2, tolerance: number): Entity | null {
  let best: { entity: Entity; d: number } | null = null
  for (const { entity, layer } of entitiesNear(project, p, tolerance)) {
    if (layer.locked) continue
    let d: number
    if (entity.type === 'text') {
      const b = entityBounds(entity)
      d = p[0] >= b.minX && p[0] <= b.maxX && p[1] >= b.minY && p[1] <= b.maxY ? 0 : Infinity
    } else {
      d = nearestPoint(entity, p).distance
    }
    if (d <= tolerance && (!best || d < best.d)) best = { entity, d }
  }
  return best?.entity ?? null
}

/** Ids selected by a box from `a` to `b`; see the module comment for window vs crossing. */
export function boxSelect(project: Project, a: Vec2, b: Vec2): Id[] {
  const rect: Bounds = {
    minX: Math.min(a[0], b[0]),
    minY: Math.min(a[1], b[1]),
    maxX: Math.max(a[0], b[0]),
    maxY: Math.max(a[1], b[1]),
  }
  const crossing = b[0] < a[0]
  return entitiesInRect(project, rect)
    .filter(({ layer }) => !layer.locked)
    .filter(({ entity, minX, minY, maxX, maxY }) =>
      crossing
        ? touchesRect(entity, rect)
        : minX >= rect.minX && maxX <= rect.maxX && minY >= rect.minY && maxY <= rect.maxY,
    )
    .map(({ entity }) => entity.id)
}

function toggle(ids: readonly Id[], id: Id): Id[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
}

interface NodeRef {
  index: number
  part: NodePart
}

type Press =
  | { kind: 'box'; at: Vec2; shift: boolean; dragging: boolean }
  /** Dragging a point or handle of the single selected path (T1.2 node editing). */
  | { kind: 'node'; entity: PathEntity; node: NodeRef; at: Vec2; dragging: boolean; segments: Segment[] }

/** Points and handles are picked within this many CSS px. */
const NODE_PICK_PX = 6

export class SelectTool implements Tool {
  readonly id = 'select'
  readonly cursor = 'default'
  private press: Press | null = null
  private hover: Entity | null = null
  private hoverNode: NodeRef | null = null
  private readonly nodeEditing: boolean

  /** `nodeEditing` false: plain object picking (used inside the transform tools' "select objects" step). */
  constructor(nodeEditing = true) {
    this.nodeEditing = nodeEditing
  }

  /** Snap only while dragging an anchor (so it can land on other geometry); otherwise use the raw pointer. */
  get snaps() {
    return this.press?.kind === 'node' && this.press.node.part === 'anchor'
  }

  snapExclude() {
    return this.press?.kind === 'node' ? this.press.entity.id : null
  }

  /** The path whose points are shown: the only selected entity, if it's a path that may be edited. */
  private editable(ctx: ToolContext): PathEntity | null {
    if (!this.nodeEditing || ctx.selection.length !== 1) return null
    for (const piece of ctx.project.pieces) {
      for (const e of piece.entities) {
        if (e.id !== ctx.selection[0]) continue
        const layer = ctx.project.layers.find((l) => l.id === e.layerId)
        // Linked stitch lines are excluded: editing their points would detach them.
        return e.type === 'path' && !e.derived && layer?.visible && !layer.locked ? e : null
      }
    }
    return null
  }

  /** The handle or anchor under `p` (handles first: they sit on top). */
  private nodeAt(segments: readonly Segment[], p: Vec2, tolerance: number): NodeRef | null {
    for (const part of ['ho', 'hi'] as const) {
      for (let i = 0; i < segments.length; i++) {
        const q = nodePosition(segments[i], part)
        if (q && distance(q, p) <= tolerance) return { index: i, part }
      }
    }
    const i = segments.findIndex((seg) => distance(seg.p, p) <= tolerance)
    return i >= 0 ? { index: i, part: 'anchor' } : null
  }

  private nodeShapes(segments: readonly Segment[], active: NodeRef | null): PreviewShape[] {
    const out: PreviewShape[] = []
    segments.forEach((seg) => {
      for (const part of ['hi', 'ho'] as const) {
        const q = nodePosition(seg, part)
        if (q) out.push({ kind: 'handle', from: seg.p, to: q })
      }
    })
    segments.forEach((seg, i) =>
      out.push({
        kind: 'node',
        at: seg.p,
        smooth: isSmooth(seg),
        active: active?.index === i && active.part === 'anchor',
      }),
    )
    return out
  }

  private idlePreview(ctx: ToolContext) {
    const path = this.editable(ctx)
    const out: PreviewShape[] = []
    if (this.hover && this.hover.id !== path?.id) out.push({ kind: 'entity', entity: this.hover })
    if (path) out.push(...this.nodeShapes(path.segments, this.hoverNode))
    ctx.setPreview(out)
  }

  activate(ctx: ToolContext) {
    this.press = null
    this.hover = null
    this.hoverNode = null
    this.idlePreview(ctx)
    ctx.setPrompt('select.prompt', [])
  }

  onPointerDown(e: ToolPointerEvent, ctx: ToolContext) {
    if (e.button !== 0) return
    const path = this.editable(ctx)
    const node = path && this.nodeAt(path.segments, e.raw, NODE_PICK_PX * ctx.pixelSize)
    this.press =
      path && node
        ? { kind: 'node', entity: path, node, at: e.raw, dragging: false, segments: path.segments }
        : { kind: 'box', at: e.raw, shift: e.shift, dragging: false }
  }

  onPointerMove(e: ToolPointerEvent, ctx: ToolContext) {
    const press = this.press
    if (press) {
      if (!press.dragging && distance(press.at, e.raw) / ctx.pixelSize >= DRAG_THRESHOLD_PX) press.dragging = true
      if (press.dragging && press.kind === 'node') {
        const { index, part } = press.node
        const original = press.entity.segments
        // Anchors use the (snapped) point; handles the raw pointer, so snapping doesn't quantise the curve.
        press.segments =
          part === 'anchor' ? moveAnchor(original, index, e.point) : moveHandle(original, index, part, e.raw)
        ctx.setPreview([
          { kind: 'entity', entity: { ...press.entity, segments: press.segments } },
          ...this.nodeShapes(press.segments, press.node),
        ])
        return
      }
      if (press.dragging && press.kind === 'box') {
        const [a, b] = [press.at, e.raw]
        const box: PreviewShape = {
          kind: 'path',
          segments: [{ p: a }, { p: [b[0], a[1]] }, { p: b }, { p: [a[0], b[1]] }],
          closed: true,
          dashed: b[0] < a[0],
        }
        ctx.setPreview([box])
        return
      }
    }
    const path = this.editable(ctx)
    this.hoverNode = path ? this.nodeAt(path.segments, e.raw, NODE_PICK_PX * ctx.pixelSize) : null
    this.hover = hitTest(ctx.project, e.raw, PICK_TOLERANCE_PX * ctx.pixelSize)
    this.idlePreview(ctx)
  }

  onPointerUp(e: ToolPointerEvent, ctx: ToolContext) {
    const press = this.press
    this.press = null
    if (!press || e.button !== 0) return
    if (press.kind === 'node') {
      if (press.dragging && press.segments !== press.entity.segments) {
        ctx.dispatch(updateEntity<PathEntity>(press.entity.id, { segments: press.segments }, 'history.editNodes'))
      }
      this.idlePreview(ctx)
      return
    }
    if (press.dragging) {
      const ids = boxSelect(ctx.project, press.at, e.raw)
      ctx.setSelection(press.shift ? [...new Set([...ctx.selection, ...ids])] : ids)
      this.idlePreview(ctx)
      return
    }
    const hit = hitTest(ctx.project, press.at, PICK_TOLERANCE_PX * ctx.pixelSize)
    if (hit) ctx.setSelection(press.shift ? toggle(ctx.selection, hit.id) : [hit.id])
    else if (!press.shift) ctx.setSelection([])
    this.idlePreview(ctx)
  }

  /** Double-click a point of the selected path: toggle smooth ↔ corner. */
  onDoubleClick(e: ToolPointerEvent, ctx: ToolContext) {
    const path = this.editable(ctx)
    const node = path && this.nodeAt(path.segments, e.raw, NODE_PICK_PX * ctx.pixelSize)
    if (!path || !node || node.part !== 'anchor') return
    ctx.dispatch(
      updateEntity<PathEntity>(
        path.id,
        { segments: toggleSmooth(path.segments, path.closed, node.index) },
        'history.editNodes',
      ),
    )
  }

  onPointerLeave(ctx: ToolContext) {
    // A drag keeps going (pointer capture); only the hover feedback goes.
    if (this.press?.dragging) return
    this.hover = null
    this.hoverNode = null
    this.idlePreview(ctx)
  }

  onDelete(ctx: ToolContext) {
    if (ctx.selection.length === 0) return
    ctx.dispatch(removeEntities(ctx.selection))
    ctx.setSelection([])
  }

  deactivate(ctx: ToolContext) {
    this.press = null
    this.hover = null
    this.hoverNode = null
    ctx.setPreview([])
  }

  cancel(ctx: ToolContext) {
    if (this.press?.dragging) {
      // Abandon a box or a point drag; nothing has been committed yet.
      this.press = null
      this.idlePreview(ctx)
      return true
    }
    this.press = null
    if (ctx.selection.length > 0) {
      ctx.setSelection([])
      this.idlePreview(ctx)
      return true
    }
    return false
  }
}
