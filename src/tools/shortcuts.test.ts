import { describe, expect, it } from 'vitest'
import { assign, COMMAND_IDS, commandFor, DEFAULT_BINDINGS, keyOf, mergeSaved } from './shortcuts'

const ev = (code: string, mods: Partial<Record<'shiftKey' | 'ctrlKey' | 'metaKey' | 'altKey', boolean>> = {}) => ({
  code,
  shiftKey: false,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  ...mods,
})

describe('shortcut bindings (T4.8)', () => {
  it('has a distinct default key for every bound command', () => {
    const keys = Object.values(DEFAULT_BINDINGS)
    expect(new Set(keys).size).toBe(keys.length)
    expect(DEFAULT_BINDINGS.line).toBe('L')
    expect(DEFAULT_BINDINGS.join).toBe('Shift+J')
    for (const id of COMMAND_IDS) expect(DEFAULT_BINDINGS[id], id).toBeDefined()
  })

  it('reads letter keys by physical key, with Shift; ignores everything else', () => {
    expect(keyOf(ev('KeyL'))).toBe('L')
    expect(keyOf(ev('KeyJ', { shiftKey: true }))).toBe('Shift+J')
    expect(keyOf(ev('Digit1'))).toBeNull()
    expect(keyOf(ev('Space'))).toBeNull()
    expect(keyOf(ev('KeyS', { metaKey: true }))).toBeNull()
  })

  it('moves a key to its new command and reports the one that lost it', () => {
    const { bindings, displaced } = assign(DEFAULT_BINDINGS, 'trim', 'L')
    expect(bindings.trim).toBe('L')
    expect(bindings.line).toBeUndefined()
    expect(displaced).toBe('line')
    expect(commandFor(bindings, 'L')).toBe('trim')
    expect(assign(bindings, 'trim', null).bindings.trim).toBeUndefined()
  })

  it('restores saved bindings over the defaults, dropping junk', () => {
    const b = mergeSaved({ trim: 'T', line: null, rectangle: 'ctrl+r', bogus: 'Q' })
    expect(b.trim).toBe('T')
    expect(b.perpendicular).toBeUndefined() // its default T went to trim
    expect(b.line).toBeUndefined()
    expect(b.rectangle).toBe('R')
    expect(mergeSaved('nonsense')).toEqual(DEFAULT_BINDINGS)
  })
})
