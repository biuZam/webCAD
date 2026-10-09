// D4 Rectangle: corner to corner, or from the centre while Alt is held; typed width, height and corner radius.

import { addEntities } from '../document/commands'
import { rectangleSegments } from '../geometry/shapes'
import type { Vec2 } from '../lib/vec2'
import { entityBase, pointFields, typedPoint } from './common'
import type { InputValues, Tool, ToolContext, ToolPointerEvent } from './types'

export class RectangleTool implements Tool {
  readonly id = 'rectangle'
  readonly cursor = 'crosshair'
  readonly draws = true
  private first: Vec2 | null = null
  private mouse: Vec2 | null = null
  private fromCentre = false
  private typed: InputValues = {}
  /** Corner radius is a sticky tool option: it stays until the user types another value. */
  private radius = 0

  activate(ctx: ToolContext) {
    this.reset(ctx)
  }

  onPointerMove(e: ToolPointerEvent, ctx: ToolContext) {
    this.mouse = e.point
    this.fromCentre = e.alt
    this.update(ctx)
  }

  onPointerDown(e: ToolPointerEvent, ctx: ToolContext) {
    if (e.button !== 0) return
    this.mouse = e.point
    this.fromCentre = e.alt
    if (!this.first) {
      this.first = typedPoint(this.typed, this.mouse)
      this.typed = {}
      this.update(ctx)
    } else {
      this.commit(ctx)
    }
  }

  onInput(values: InputValues, commit: boolean, ctx: ToolContext) {
    this.typed = values
    if (!commit) return this.update(ctx)
    if (!this.first) {
      this.first = typedPoint(values, this.mouse)
      this.typed = {}
      this.update(ctx)
    } else {
      this.commit(ctx)
    }
  }

  cancel(ctx: ToolContext) {
    const busy = this.first !== null
    this.reset(ctx)
    return busy
  }

  /** Opposite corners of the rectangle being drawn, or null if not enough input yet. */
  private corners(): [Vec2, Vec2] | null {
    const first = this.first
    const mouse = this.mouse ?? first
    if (!first || !mouse) return null
    const dx = mouse[0] - first[0]
    const dy = mouse[1] - first[1]
    // Typed sizes are positive; the mouse decides which quadrant they extend into.
    const sx = dx < 0 ? -1 : 1
    const sy = dy < 0 ? -1 : 1
    const w = this.typed.width !== undefined ? Math.abs(this.typed.width) * sx : dx
    const h = this.typed.height !== undefined ? Math.abs(this.typed.height) * sy : dy
    if (this.fromCentre) {
      // In centre mode a typed size is the full width/height, centred on the first point.
      const hw = this.typed.width !== undefined ? w / 2 : w
      const hh = this.typed.height !== undefined ? h / 2 : h
      return [
        [first[0] - hw, first[1] - hh],
        [first[0] + hw, first[1] + hh],
      ]
    }
    return [first, [first[0] + w, first[1] + h]]
  }

  private currentRadius() {
    return this.typed.radius !== undefined ? Math.max(0, this.typed.radius) : this.radius
  }

  private commit(ctx: ToolContext) {
    const corners = this.corners()
    const target = ctx.target()
    if (corners && target) {
      const [a, b] = corners
      if (a[0] !== b[0] && a[1] !== b[1]) {
        ctx.dispatch(
          addEntities(
            target.pieceId,
            [
              {
                ...entityBase(ctx, target.layerId),
                type: 'path',
                segments: rectangleSegments(a, b, this.currentRadius()),
                closed: true,
              },
            ],
            'history.addRectangle',
          ),
        )
      }
    }
    if (this.typed.radius !== undefined) this.radius = Math.max(0, this.typed.radius)
    this.reset(ctx)
  }

  private reset(ctx: ToolContext) {
    this.first = null
    this.typed = {}
    this.update(ctx)
  }

  private update(ctx: ToolContext) {
    if (!this.first) {
      ctx.setPreview([])
      ctx.setPrompt('rectangle.promptFirst', pointFields(this.mouse))
      return
    }
    const corners = this.corners()
    ctx.setPreview(
      corners
        ? [{ kind: 'path', segments: rectangleSegments(corners[0], corners[1], this.currentRadius()), closed: true }]
        : [],
    )
    const size = corners ? [Math.abs(corners[1][0] - corners[0][0]), Math.abs(corners[1][1] - corners[0][1])] : []
    ctx.setPrompt(this.fromCentre ? 'rectangle.promptCentre' : 'rectangle.promptCorner', [
      { key: 'width', kind: 'length', labelKey: 'rectangle.width', live: size[0] },
      { key: 'height', kind: 'length', labelKey: 'rectangle.height', live: size[1] },
      { key: 'radius', kind: 'length', labelKey: 'rectangle.cornerRadius', live: this.radius },
    ])
  }
}
