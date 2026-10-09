// Affine transforms of model entities (M4 mirror, M5 rotate, M6 flip, M7 move/scale).
// Circles, ellipses and text need similarity transforms (translate, rotate, uniform scale, reflect), which
// keep them representable. Paths, centre lines and hole positions accept any affine, including
// scaleXYAbout; check supportsNonUniformScale before using it.

import type { Entity, Segment } from '../document/model'
import type { Vec2 } from '../lib/vec2'

/** [a, b, c, d, tx, ty]: x' = a·x + c·y + tx, y' = b·x + d·y + ty (same layout as SVG/Canvas matrices). */
export type Affine = readonly [number, number, number, number, number, number]

export const IDENTITY: Affine = [1, 0, 0, 1, 0, 0]

export function apply(m: Affine, [x, y]: Vec2): Vec2 {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]
}

/** Apply the linear part only (for handles and other relative vectors). */
export function applyLinear(m: Affine, [x, y]: Vec2): Vec2 {
  return [m[0] * x + m[2] * y, m[1] * x + m[3] * y]
}

/** Conjugate a linear map so it acts about `c` instead of the origin. */
function about(c: Vec2, a: number, b: number, cc: number, d: number): Affine {
  return [a, b, cc, d, c[0] - a * c[0] - cc * c[1], c[1] - b * c[0] - d * c[1]]
}

export const translation = (dx: number, dy: number): Affine => [1, 0, 0, 1, dx, dy]

/** Rotate by `deg` counter-clockwise as seen on screen (the app's angle convention; see lib/vec2). */
export function rotationAbout(c: Vec2, deg: number): Affine {
  // Screen-CCW is mathematically clockwise in y-down space, hence the negated angle.
  const t = (-deg * Math.PI) / 180
  const cos = Math.cos(t)
  const sin = Math.sin(t)
  return about(c, cos, sin, -sin, cos)
}

export function scaleAbout(c: Vec2, s: number): Affine {
  return about(c, s, 0, 0, s)
}

/**
 * Non-uniform scale about `c`. NOT a similarity transform: only valid for entities made of points
 * (paths, centre lines, hole positions). See `supportsNonUniformScale`.
 */
export function scaleXYAbout(c: Vec2, sx: number, sy: number): Affine {
  return about(c, sx, 0, 0, sy)
}

/** Whether transformEntity stays exact under a non-uniform scale for this entity. */
export function supportsNonUniformScale(entity: Entity): boolean {
  return entity.type === 'path' || entity.type === 'centreLine' || entity.type === 'holeSet'
}

/** Reflect across the infinite line through `p` and `q`. */
export function mirrorAcross(p: Vec2, q: Vec2): Affine {
  const len = Math.hypot(q[0] - p[0], q[1] - p[1])
  if (len === 0) return IDENTITY
  const ux = (q[0] - p[0]) / len
  const uy = (q[1] - p[1]) / len
  return about(p, 2 * ux * ux - 1, 2 * ux * uy, 2 * ux * uy, 2 * uy * uy - 1)
}

/** Uniform scale factor of a similarity transform. */
const scaleOf = (m: Affine) => Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]))

/** Direction (degrees, clockwise in y-down, the model's rotation convention) of the unit vector at `deg` after `m`. */
function rotatedDirection(m: Affine, deg: number): number {
  const r = (deg * Math.PI) / 180
  const [x, y] = applyLinear(m, [Math.cos(r), Math.sin(r)])
  const out = (Math.atan2(y, x) * 180) / Math.PI
  return Object.is(out, -0) ? 0 : Math.round(out * 1e9) / 1e9
}

function transformSegment(m: Affine, s: Segment): Segment {
  const out: Segment = { p: apply(m, s.p) }
  if (s.hi) out.hi = applyLinear(m, s.hi)
  if (s.ho) out.ho = applyLinear(m, s.ho)
  return out
}

/** A new entity transformed by `m`. The id is kept; callers give copies new ids. */
export function transformEntity<E extends Entity>(entity: E, m: Affine): E {
  const s = scaleOf(m)
  switch (entity.type) {
    case 'path':
      return { ...entity, segments: entity.segments.map((seg) => transformSegment(m, seg)) }
    case 'circle':
      return {
        ...entity,
        center: apply(m, entity.center),
        rx: entity.rx * s,
        ry: entity.ry * s,
        // A circle has no meaningful rotation; keep it 0 so files stay clean.
        rotation: entity.rx === entity.ry ? 0 : rotatedDirection(m, entity.rotation),
      }
    case 'centreLine':
      return { ...entity, from: apply(m, entity.from), to: apply(m, entity.to) }
    case 'holeSet': {
      // Pitch, margin and hole size are craft settings (the chisel), so scaling moves holes but keeps their size.
      // Linked hole sets are recomputed from their source anyway (src/document/derived.ts).
      // A reflection reverses the slit's slant relative to the path, hence the negated slit angle.
      const reflects = m[0] * m[3] - m[1] * m[2] < 0
      return {
        ...entity,
        holes: entity.holes.map((h) => apply(m, h)),
        angles: entity.angles?.map((a) => rotatedDirection(m, a)),
        slitAngle: reflects ? -entity.slitAngle : entity.slitAngle,
      }
    }
    case 'text':
      return {
        ...entity,
        position: apply(m, entity.position),
        size: entity.size * s,
        rotation: rotatedDirection(m, entity.rotation),
      }
  }
}
