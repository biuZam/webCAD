import { describe, expect, it } from 'vitest'
import { createTools, TOOL_ORDER } from '../tools'
import type { InputField } from '../tools/types'
import { activeVariant, GROUPS } from './palette-groups'

const circleGroup = GROUPS.find((g) => g?.some((v) => v.id === 'ellipse'))!
const mode = (live: number): InputField[] => [{ key: 'mode', kind: 'choice', labelKey: 'circle.mode', live }]

describe('palette groups', () => {
  it('puts every tool in exactly one group', () => {
    const tools = GROUPS.flatMap((g) => g ?? []).flatMap((v) => (v.tool && v.tool === v.id ? [v.tool] : []))
    expect([...tools].sort()).toEqual([...TOOL_ORDER.filter((id) => id !== null)].sort())
    expect(Object.keys(createTools()).sort()).toEqual([...tools].sort())
  })

  it('recognises the active member from the tool and its mode field', () => {
    expect(activeVariant(circleGroup, 'circle', mode(2))?.id).toBe('ellipse')
    expect(activeVariant(circleGroup, 'circle', mode(0))?.id).toBe('circle')
    expect(activeVariant(circleGroup, 'line', mode(2))).toBeUndefined()
    const penGroup = GROUPS.find((g) => g?.some((v) => v.id === 'arc'))!
    expect(activeVariant(penGroup, 'arc', [])?.id).toBe('arc')
  })
})
