// T0.9: mm grid and rulers, drawn on plain 2D canvases behind/around the Paper.js canvas.
// Redrawing ~hundreds of lines per frame is far cheaper than rebuilding Paper items on every pan/zoom.

import { gridSpacing } from '../snapping/grid'

/** What part of model space is on screen. */
export interface ViewWindow {
  /** Model coordinates (mm) of the stage's top-left corner. */
  left: number
  top: number
  /** CSS px per mm. */
  zoom: number
  /** Stage size in CSS px. */
  width: number
  height: number
}

export interface ChromeColors {
  gridMinor: string
  gridMajor: string
  gridAxis: string
  rulerBg: string
  rulerTick: string
  rulerText: string
  accent: string
  selection: string
  snap: string
  /** Tool previews on the (always light) sheet. */
  preview: string
}

export function readChromeColors(el: Element): ChromeColors {
  const s = getComputedStyle(el)
  const v = (name: string) => s.getPropertyValue(name).trim()
  return {
    gridMinor: v('--grid-minor'),
    gridMajor: v('--grid-major'),
    gridAxis: v('--grid-axis'),
    rulerBg: v('--ruler-bg'),
    rulerTick: v('--ruler-tick'),
    rulerText: v('--ruler-text'),
    accent: v('--accent'),
    selection: v('--selection'),
    snap: v('--snap'),
    preview: v('--preview'),
  }
}

/** Size the backing store for the device pixel ratio and return a context in CSS px. */
function prepare(canvas: HTMLCanvasElement, width: number, height: number) {
  const dpr = window.devicePixelRatio || 1
  const w = Math.max(1, Math.round(width * dpr))
  const h = Math.max(1, Math.round(height * dpr))
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w
    canvas.height = h
  }
  const ctx = canvas.getContext('2d')!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)
  return ctx
}

/** Multiples of `step` within [from, to]. Computed by index to avoid accumulating float error. */
function* stepsIn(from: number, to: number, step: number) {
  // `+ 0` turns -0 (from Math.ceil of a small negative) into 0, which Intl would print as "-0".
  for (let i = Math.ceil(from / step) + 0; i * step <= to; i++) yield { i, v: i * step }
}

/** Snap a CSS-px coordinate to the pixel centre so 1 px lines stay crisp. */
const crisp = (x: number) => Math.round(x) + 0.5

export function drawGrid(canvas: HTMLCanvasElement, w: ViewWindow, colors: ChromeColors) {
  const ctx = prepare(canvas, w.width, w.height)
  const { minor } = gridSpacing(w.zoom)
  const right = w.left + w.width / w.zoom
  const bottom = w.top + w.height / w.zoom
  const toX = (x: number) => crisp((x - w.left) * w.zoom)
  const toY = (y: number) => crisp((y - w.top) * w.zoom)

  const pass = (color: string, keep: (i: number) => boolean) => {
    ctx.beginPath()
    for (const { i, v } of stepsIn(w.left, right, minor)) {
      if (!keep(i)) continue
      ctx.moveTo(toX(v), 0)
      ctx.lineTo(toX(v), w.height)
    }
    for (const { i, v } of stepsIn(w.top, bottom, minor)) {
      if (!keep(i)) continue
      ctx.moveTo(0, toY(v))
      ctx.lineTo(w.width, toY(v))
    }
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    ctx.stroke()
  }
  pass(colors.gridMinor, (i) => i % 10 !== 0)
  pass(colors.gridMajor, (i) => i % 10 === 0 && i !== 0)

  ctx.beginPath()
  if (w.left <= 0 && right >= 0) {
    ctx.moveTo(toX(0), 0)
    ctx.lineTo(toX(0), w.height)
  }
  if (w.top <= 0 && bottom >= 0) {
    ctx.moveTo(0, toY(0))
    ctx.lineTo(w.width, toY(0))
  }
  ctx.strokeStyle = colors.gridAxis
  ctx.stroke()
}

/**
 * Draw a ruler along one axis. `length` is the ruler's long side in CSS px (the stage size along that axis),
 * `start` the model coordinate at the stage edge, and `cursor` the model coordinate to mark, if any.
 */
export function drawRuler(
  canvas: HTMLCanvasElement,
  axis: 'x' | 'y',
  w: ViewWindow,
  thickness: number,
  colors: ChromeColors,
  formatLabel: (mm: number) => string,
  cursor: number | null,
) {
  const length = axis === 'x' ? w.width : w.height
  const start = axis === 'x' ? w.left : w.top
  const ctx = prepare(canvas, axis === 'x' ? length : thickness, axis === 'x' ? thickness : length)
  ctx.fillStyle = colors.rulerBg
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Draw as if horizontal. The y ruler is rotated 90° clockwise, so its labels read top-to-bottom and
  // `flip` puts the ticks on its right edge, next to the stage.
  if (axis === 'y') {
    ctx.translate(thickness, 0)
    ctx.rotate(Math.PI / 2)
  }
  const { minor, major } = gridSpacing(w.zoom)
  // Labels need more room than grid lines: label every major line if they fit, else every 5th / 10th.
  const labelEvery = [1, 2, 5, 10].find((n) => major * n * w.zoom >= 60) ?? 10
  const pos = (v: number) => crisp((v - start) * w.zoom)
  const flip = (y: number) => (axis === 'y' ? thickness - y : y)

  ctx.beginPath()
  for (const { i, v } of stepsIn(start, start + length / w.zoom, minor)) {
    const tick = i % 10 === 0 ? thickness * 0.6 : i % 5 === 0 ? thickness * 0.35 : thickness * 0.2
    ctx.moveTo(pos(v), flip(thickness))
    ctx.lineTo(pos(v), flip(thickness - tick))
  }
  ctx.strokeStyle = colors.rulerTick
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.fillStyle = colors.rulerText
  ctx.font = '10px system-ui, sans-serif'
  ctx.textBaseline = axis === 'y' ? 'bottom' : 'top'
  for (const { i, v } of stepsIn(start, start + length / w.zoom, major)) {
    if (i % labelEvery !== 0) continue
    ctx.fillText(formatLabel(v), pos(v) + 3, axis === 'y' ? thickness - 2 : 2)
  }

  if (cursor !== null) {
    ctx.beginPath()
    ctx.moveTo(pos(cursor), 0)
    ctx.lineTo(pos(cursor), thickness)
    ctx.strokeStyle = colors.accent
    ctx.stroke()
  }
}
