import { describe, expect, it } from 'vitest'
import { pngSize, svgSizeMm, withResolution } from './png'

describe('PNG preview helpers (T4.6)', () => {
  it('reads the mm size of an SVG export and converts it to pixels at a dpi', () => {
    expect(svgSizeMm('<svg xmlns="x" width="100mm" height="60mm" viewBox="0 0 100 60">')).toEqual([100, 60])
    expect(pngSize(254, 127, 100)).toEqual([1000, 500]) // 254 mm = 10 in
    // Huge drawings are scaled down to fit the canvas limit, keeping proportions.
    expect(pngSize(2000, 1000, 300)).toEqual([8192, 4096])
  })

  it('inserts a pHYs chunk after IHDR with pixels per metre and a valid CRC', () => {
    // A 1×1 PNG header: signature + IHDR (CRC of IHDR is not checked here).
    const png = new Uint8Array(33 + 12)
    png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    const out = withResolution(png, 300)
    const chunk = out.subarray(33, 33 + 21)
    expect(String.fromCharCode(...chunk.subarray(4, 8))).toBe('pHYs')
    const view = new DataView(chunk.buffer, chunk.byteOffset)
    expect(view.getUint32(8)).toBe(11811) // 300 dpi
    expect(chunk[16]).toBe(1)
    // CRC of "pHYs" + data for 11811 ppm, unit 1 (computed independently with zlib.crc32).
    expect(view.getUint32(17)).toBe(0x78a53f76)
    expect(out.length).toBe(png.length + 21)
  })
})
