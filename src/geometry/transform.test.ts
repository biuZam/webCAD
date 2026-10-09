import { describe, expect, it } from 'vitest'
import type { CircleEntity, PathEntity, TextEntity } from '../document/model'
import { apply, mirrorAcross, rotationAbout, scaleAbout, transformEntity, translation } from './transform'

const close = (a: readonly number[], b: readonly number[]) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 9))
const base = { id: 'e', layerId: 'l', lineStyle: 'solid', strokeWidth: 0.2 } as const

describe('affine builders', () => {
  it('rotates counter-clockwise as seen on screen (y-down model)', () => {
    // +x rotated 90° screen-CCW points up the screen, which is -y in the model.
    close(apply(rotationAbout([0, 0], 90), [10, 0]), [0, -10])
    close(apply(rotationAbout([5, 5], 180), [10, 5]), [0, 5])
  })

  it('scales about a fixed point', () => {
    close(apply(scaleAbout([10, 10], 2), [10, 10]), [10, 10])
    close(apply(scaleAbout([10, 10], 2), [15, 10]), [20, 10])
  })

  it('mirrors across an arbitrary line', () => {
    close(apply(mirrorAcross([50, 0], [50, 100]), [40, 7]), [60, 7])
    close(apply(mirrorAcross([0, 0], [1, 1]), [3, 1]), [1, 3])
  })
})

describe('transformEntity', () => {
  it('moves anchors and turns handles with the linear part only', () => {
    const path: PathEntity = {
      ...base,
      type: 'path',
      closed: false,
      segments: [{ p: [0, 0], ho: [5, 0] }, { p: [10, 0] }],
    }
    const moved = transformEntity(path, translation(3, 4))
    expect(moved.segments[0]).toEqual({ p: [3, 4], ho: [5, 0] })
    const turned = transformEntity(path, rotationAbout([0, 0], 90))
    close(turned.segments[0].ho!, [0, -5])
  })

  it('keeps circles circular with rotation 0, and turns ellipses', () => {
    const circle: CircleEntity = { ...base, type: 'circle', center: [10, 0], rx: 5, ry: 5, rotation: 0 }
    const c = transformEntity(circle, rotationAbout([0, 0], 45))
    expect(c.rotation).toBe(0)
    expect(c.rx).toBeCloseTo(5)
    const ellipse = transformEntity({ ...circle, ry: 2 }, rotationAbout([0, 0], 30))
    // Screen-CCW 30° is −30° in the model's clockwise convention.
    expect(ellipse.rotation).toBeCloseTo(-30)
    expect(transformEntity({ ...circle, ry: 2 }, scaleAbout([0, 0], 3)).rx).toBeCloseTo(15)
  })

  it('scales text size and position', () => {
    const text: TextEntity = { ...base, type: 'text', position: [10, 10], text: 'Cut 2', size: 4, rotation: 0 }
    const t = transformEntity(text, scaleAbout([0, 0], 2))
    expect(t.position).toEqual([20, 20])
    expect(t.size).toBeCloseTo(8)
  })
})
