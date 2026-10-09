// Stitch holes are drawn on their own plain 2D canvas, not as Paper.js items.
//
// Measured on 2,000 entities with 17,600 holes (T1.20): a full Paper.js redraw took ~49 ms with holes and
// 7.4 ms without, because Paper pays per-item overhead for every hole even inside a CompoundPath. Drawing the
// same holes with raw canvas calls (one path per colour) takes ~7 ms. Trade-off: holes draw beneath the Paper
// layers instead of in layer order, which is fine for small solid marks.

import type { Entity, HoleSetEntity, Id, Layer, Project } from '../document/model'
import { entityBounds } from '../geometry/bounds'
import { slitEnds } from '../geometry/leather/stitch-holes'
import type { ViewWindow } from './chrome'

export interface HoleColors {
  selection: string
}

/** CSS px stroke widths, matching the Paper renderer's hairline and selected styles. */
const NORMAL_WIDTH = 1
const SELECTED_WIDTH = 2

function traceHoles(ctx: CanvasRenderingContext2D, set: HoleSetEntity) {
  set.holes.forEach((h, i) => {
    if (set.holeShape === 'slit') {
      const [a, b] = slitEnds(h, set.angles?.[i], set.slitAngle, set.holeSize)
      ctx.moveTo(a[0], a[1])
      ctx.lineTo(b[0], b[1])
    } else {
      const r = set.holeSize / 2
      ctx.moveTo(h[0] + r, h[1])
      ctx.arc(h[0], h[1], r, 0, Math.PI * 2)
    }
  })
}

export function drawHoles(
  canvas: HTMLCanvasElement,
  w: ViewWindow,
  project: Project,
  selection: ReadonlySet<Id>,
  colors: HoleColors,
) {
  const dpr = window.devicePixelRatio || 1
  const width = Math.max(1, Math.round(w.width * dpr))
  const height = Math.max(1, Math.round(w.height * dpr))
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }
  const ctx = canvas.getContext('2d')!
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, width, height)

  const right = w.left + w.width / w.zoom
  const bottom = w.top + w.height / w.zoom
  const layers = new Map<Id, Layer>(project.layers.map((l) => [l.id, l]))

  // Group visible, on-screen sets by stroke style so each style is one path and one stroke() call.
  const batches = new Map<string, { color: string; width: number; sets: HoleSetEntity[] }>()
  for (const piece of project.pieces) {
    for (const e of piece.entities as Entity[]) {
      if (e.type !== 'holeSet') continue
      const layer = layers.get(e.layerId)
      if (!layer?.visible) continue
      const b = entityBounds(e)
      if (b.maxX < w.left || b.minX > right || b.maxY < w.top || b.minY > bottom) continue
      const selected = selection.has(e.id)
      const color = selected ? colors.selection : layer.color
      const lineWidth = selected ? SELECTED_WIDTH : NORMAL_WIDTH
      const key = `${color}|${lineWidth}`
      let batch = batches.get(key)
      if (!batch) batches.set(key, (batch = { color, width: lineWidth, sets: [] }))
      batch.sets.push(e)
    }
  }

  // Unselected first so selected sets draw on top.
  const ordered = [...batches.values()].sort((a, b) => a.width - b.width)
  for (const batch of ordered) {
    // Trace in model space (mm), then stroke in device space so the line width stays a hairline.
    ctx.setTransform(w.zoom * dpr, 0, 0, w.zoom * dpr, -w.left * w.zoom * dpr, -w.top * w.zoom * dpr)
    ctx.beginPath()
    for (const set of batch.sets) traceHoles(ctx, set)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.lineWidth = batch.width * dpr
    ctx.strokeStyle = batch.color
    ctx.stroke()
  }
}
