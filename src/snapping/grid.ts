// Grid spacing adapts to zoom so minor lines stay at least MIN_MINOR_PX apart on screen.

import type { Vec2 } from '../lib/vec2'

const MIN_MINOR_PX = 8
/** Minor spacings in mm; a major line falls every 10 minor lines. */
const MINOR_STEPS_MM = [0.1, 1, 10, 100, 1000]

export interface GridSpacing {
  minor: number
  major: number
}

/** `zoom` is CSS px per mm. */
export function gridSpacing(zoom: number): GridSpacing {
  const minor = MINOR_STEPS_MM.find((s) => s * zoom >= MIN_MINOR_PX) ?? MINOR_STEPS_MM[MINOR_STEPS_MM.length - 1]
  return { minor, major: minor * 10 }
}

export function snapToGrid(p: Vec2, step: number): Vec2 {
  // Round through the step count, then fix float noise (0.1 * 3 = 0.30000000000000004).
  const snap = (v: number) => Number((Math.round(v / step) * step).toFixed(6))
  return [snap(p[0]), snap(p[1])]
}
