/**
 * A 2D point or vector in millimetres, y pointing down. Tuples keep the JSON compact.
 * Not `readonly` so it passes straight to Paper.js as a PointLike; Immer freezes store state anyway.
 */
export type Vec2 = [number, number]

export const add = (a: Vec2, b: Vec2): Vec2 => [a[0] + b[0], a[1] + b[1]]
export const sub = (a: Vec2, b: Vec2): Vec2 => [a[0] - b[0], a[1] - b[1]]
export const scale = (a: Vec2, s: number): Vec2 => [a[0] * s, a[1] * s]
export const length = (a: Vec2): number => Math.hypot(a[0], a[1])
export const distance = (a: Vec2, b: Vec2): number => Math.hypot(a[0] - b[0], a[1] - b[1])
export const lerp = (a: Vec2, b: Vec2, t: number): Vec2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]

// Angles are in degrees, counter-clockwise from +x as the user sees the screen (y-up visually),
// which means negating y because model space is y-down.

/** Point at `length` from `origin` in direction `angleDeg`. */
export function polar(origin: Vec2, length: number, angleDeg: number): Vec2 {
  const a = (angleDeg * Math.PI) / 180
  return [origin[0] + length * Math.cos(a), origin[1] - length * Math.sin(a)]
}

/** Direction from `a` to `b` in degrees, normalised to [0, 360). */
export function angleOf(a: Vec2, b: Vec2): number {
  const deg = (Math.atan2(-(b[1] - a[1]), b[0] - a[0]) * 180) / Math.PI
  return deg < 0 ? deg + 360 : deg
}

/** Snap the direction a→b to the nearest multiple of `stepDeg`, keeping its length. */
export function constrainAngle(a: Vec2, b: Vec2, stepDeg: number): Vec2 {
  const angle = Math.round(angleOf(a, b) / stepDeg) * stepDeg
  return polar(a, distance(a, b), angle)
}
