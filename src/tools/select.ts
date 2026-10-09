// T1.1 Selection: click, Shift-click to toggle, box select, Delete.
// Box direction follows CAD convention: dragging left→right selects entities fully inside ("window"),
// right→left selects anything the box touches ("crossing", drawn dashed).
// T1.21 Pressing on a selected entity and dragging moves the selection (Alt: a moved copy, Shift: 15° steps).
// T1.2b With one path selected: click a point to select it, Delete removes it; double-click a segment adds one.

import { findEntity, removeEntities, transformEntities, updateEntity } from '../document/commands'
import type { Entity, Id, PathEntity, Project, Segment } from '../document/model'
import type { Bounds } from '../geometry/bounds'
import {
  entitiesInRect,
  entitiesNear,
  insideShape,
  nearestLocation,
  nearestPoint,
  touchesRect,
} from '../geometry/query'
import {
  insertAnchor,
  isSmooth,
  moveAnchor,
  moveHandle,
  nodePosition,
  removeAnchor,
  toggleSmooth,
  type NodePart,
} from '../geometry/nodes'
import { transformEntity, translation, type Affine } from '../geometry/transform'
import { constrainAngle, distance, type Vec2 } from '../lib/vec2'
import { ANGLE_STEP_DEG } from './common'
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
      // Anywhere on the (rotated) text box picks it.
      d = insideShape(entity, p) ? 0 : nearestPoint(entity, p).distance
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
  /** Pressed on a selected entity: a drag moves the selection, a click still selects (T1.21). */
  | { kind: 'move'; at: Vec2; shift: boolean; dragging: boolean; ids: readonly Id[]; delta: Affine | null }

/** Points and handles are picked within this many CSS px. */
const NODE_PICK_PX = 6

export class SelectTool implements Tool {
  readonly id = 'select'
  readonly cursor = 'default'
  private press: Press | null = null
  private hover: Entity | null = null
  private hoverNode: NodeRef | null = null
  /** The clicked anchor of the editable path (Delete removes it), with that path's id. */
  private pickedNode: { pathId: Id; index: number } | null = null
  private readonly editing: boolean
  private prompt: 'select.prompt' | 'select.promptPoints' | null = null

  /**
   * `editing` false: plain object picking, no point editing or drag-to-move (used inside the transform tools'
   * "select objects" step).
   */
  constructor(editing = true) {
    this.editing = editing
  }

  /** Snap only while dragging an anchor or the selection (to land on other geometry); otherwise use the raw pointer. */
  get snaps() {
    const press = this.press
    return (press?.kind === 'node' && press.node.part === 'anchor') || press?.kind === 'move'
  }

  snapExclude(): readonly Id[] {
    if (this.press?.kind === 'node') return [this.press.entity.id]
    if (this.press?.kind === 'move') return this.press.ids
    return []
  }

  /** The path whose points are shown: the only selected entity, if it's a path that may be edited. */
  private editable(ctx: ToolContext): PathEntity | null {
    if (!this.editing || ctx.selection.length !== 1) return null
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

  /** The picked anchor, if it still belongs to the editable path. */
  private picked(path: PathEntity | null): number | null {
    const picked = this.pickedNode
    return path && picked?.pathId === path.id && picked.index < path.segments.length ? picked.index : null
  }

  private nodeShapes(
    segments: readonly Segment[],
    active: NodeRef | null,
    picked: number | null = null,
  ): PreviewShape[] {
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
        active: (active?.index === i && active.part === 'anchor') || picked === i,
      }),
    )
    return out
  }

  private idlePreview(ctx: ToolContext) {
    const path = this.editable(ctx)
    const out: PreviewShape[] = []
    if (this.hover && this.hover.id !== path?.id) out.push({ kind: 'entity', entity: this.hover })
    if (path) out.push(...this.nodeShapes(path.segments, this.hoverNode, this.picked(path)))
    ctx.setPreview(out)
    const prompt = path ? 'select.promptPoints' : 'select.prompt'
    if (prompt !== this.prompt) {
      this.prompt = prompt
      ctx.setPrompt(prompt, [])
    }
  }

  activate(ctx: ToolContext) {
    this.press = null
    this.hover = null
    this.hoverNode = null
    this.pickedNode = null
    this.prompt = null
    this.idlePreview(ctx)
  }

  onPointerDown(e: ToolPointerEvent, ctx: ToolContext) {
    if (e.button !== 0) return
    const path = this.editable(ctx)
    const node = path && this.nodeAt(path.segments, e.raw, NODE_PICK_PX * ctx.pixelSize)
    if (path && node) {
      this.press = { kind: 'node', entity: path, node, at: e.raw, dragging: false, segments: path.segments }
      return
    }
    const hit = this.editing && hitTest(ctx.project, e.raw, PICK_TOLERANCE_PX * ctx.pixelSize)
    this.press =
      hit && ctx.selection.includes(hit.id)
        ? { kind: 'move', at: e.raw, shift: e.shift, dragging: false, ids: ctx.selection, delta: null }
        : { kind: 'box', at: e.raw, shift: e.shift, dragging: false }
  }

  /** The selection, as it would be after the pending move. */
  private movePreview(press: { at: Vec2; ids: readonly Id[]; delta: Affine | null }, ctx: ToolContext): PreviewShape[] {
    const m = press.delta
    if (!m) return []
    const out: PreviewShape[] = []
    for (const id of press.ids) {
      const found = findEntity(ctx.project, id)
      if (found) out.push({ kind: 'entity', entity: transformEntity(found.entity, m) })
    }
    const to: Vec2 = [press.at[0] + m[4], press.at[1] + m[5]]
    out.push({ kind: 'path', segments: [{ p: press.at }, { p: to }], closed: false, dashed: true })
    return out
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
      if (press.dragging && press.kind === 'move') {
        const to = e.shift ? constrainAngle(press.at, e.point, ANGLE_STEP_DEG) : e.point
        press.delta = translation(to[0] - press.at[0], to[1] - press.at[1])
        ctx.setPreview(this.movePreview(press, ctx))
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
      } else if (!press.dragging && press.node.part === 'anchor') {
        this.pickedNode = { pathId: press.entity.id, index: press.node.index }
      }
      this.idlePreview(ctx)
      return
    }
    if (press.kind === 'move' && press.dragging) {
      const m = press.delta
      if (m && (m[4] !== 0 || m[5] !== 0)) {
        const ids = press.ids.filter((id) => findEntity(ctx.project, id))
        const { command, resultIds } = transformEntities(ids, m, { copy: e.alt, labelKey: 'history.move' })
        ctx.dispatch(command)
        ctx.setSelection(resultIds)
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
    this.pickedNode = null
    this.idlePreview(ctx)
  }

  /** Double-click on the selected path: on a point, toggle smooth ↔ corner; on a segment, add a point there. */
  onDoubleClick(e: ToolPointerEvent, ctx: ToolContext) {
    const path = this.editable(ctx)
    if (!path) return
    const tolerance = NODE_PICK_PX * ctx.pixelSize
    const node = this.nodeAt(path.segments, e.raw, tolerance)
    if (!node) {
      const loc = path.segments.length > 1 ? nearestLocation(path, e.raw) : null
      if (!loc || loc.distance > PICK_TOLERANCE_PX * ctx.pixelSize || loc.time <= 0 || loc.time >= 1) return
      ctx.dispatch(
        updateEntity<PathEntity>(
          path.id,
          { segments: insertAnchor(path.segments, loc.index, loc.time) },
          'history.addPoint',
        ),
      )
      this.pickedNode = { pathId: path.id, index: loc.index + 1 }
      this.idlePreview(ctx)
      return
    }
    if (node.part !== 'anchor') return
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
    const path = this.editable(ctx)
    const picked = this.picked(path)
    this.pickedNode = null
    if (path && picked !== null) {
      // Removing a point; a path too short to lose one goes as a whole.
      const segments = removeAnchor(path.segments, path.closed, picked)
      if (segments) {
        ctx.dispatch(updateEntity<PathEntity>(path.id, { segments }, 'history.deletePoint'))
        this.idlePreview(ctx)
        return
      }
    }
    if (ctx.selection.length === 0) return
    ctx.dispatch(removeEntities(ctx.selection))
    ctx.setSelection([])
  }

  deactivate(ctx: ToolContext) {
    this.press = null
    this.hover = null
    this.hoverNode = null
    this.pickedNode = null
    ctx.setPreview([])
  }

  cancel(ctx: ToolContext) {
    if (this.press?.dragging) {
      // Abandon a box, point or move drag; nothing has been committed yet.
      this.press = null
      this.idlePreview(ctx)
      return true
    }
    this.press = null
    if (this.pickedNode) {
      this.pickedNode = null
      this.idlePreview(ctx)
      return true
    }
    if (ctx.selection.length > 0) {
      ctx.setSelection([])
      this.idlePreview(ctx)
      return true
    }
    return false
  }
}
