import { describe, expect, it } from 'vitest'
import { formatLength, parseAngle, parseLength, roundExport, toMm } from './units'

describe('units', () => {
  it('converts to mm', () => {
    expect(toMm(1, 'in')).toBe(25.4)
    expect(toMm(3, 'cm')).toBe(30)
  })

  it('parses typed lengths with optional unit', () => {
    expect(parseLength('12.5', 'mm')).toBe(12.5)
    expect(parseLength('3cm', 'mm')).toBe(30)
    expect(parseLength('1.5 in', 'mm')).toBeCloseTo(38.1)
    expect(parseLength('2"', 'mm')).toBeCloseTo(50.8)
    expect(parseLength('-2,5mm', 'cm')).toBe(-2.5)
    expect(parseLength('2', 'cm')).toBe(20)
    expect(parseLength('abc', 'mm')).toBeNull()
    expect(parseLength('', 'mm')).toBeNull()
  })

  it('parses angles', () => {
    expect(parseAngle('45°')).toBe(45)
    expect(parseAngle('-30deg')).toBe(-30)
    expect(parseAngle('x')).toBeNull()
  })

  it('rounds exports to 0.001 mm without negative zero', () => {
    expect(roundExport(1.23456)).toBe(1.235)
    expect(Object.is(roundExport(-0.0001), 0)).toBe(true)
  })

  it('formats per locale with Latin unit symbols', () => {
    expect(formatLength(12.345, 'mm', 'en')).toBe('12.35 mm')
    expect(formatLength(25.4, 'in', 'zh-CN')).toBe('1 in')
    expect(formatLength(1234.5, 'mm', 'de')).toBe('1.234,5 mm')
  })
})
