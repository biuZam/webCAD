// @vitest-environment happy-dom
import '../../test/canvas-stub'
import { describe, expect, it } from 'vitest'
import { acceptanceProject } from '../../document/fixtures'
import { exportPdf, type PdfOptions } from './index'

const PT_PER_MM = 72 / 25.4
const strings = {
  scale: 'Scale 1:1',
  calibration: '50 mm square',
  instructions: ['Print at 100 %.'],
  assembly: 'Sheets overlap by 10 mm.',
  sheets: 'Sheets',
}
const base: Omit<PdfOptions, 'mode'> = {
  paper: 'a4',
  orientation: 'auto',
  overlap: 10,
  svg: {},
  strings,
  date: '2026-10-09',
  uncompressed: true,
}

async function pdfText(opts: PdfOptions) {
  const blob = await exportPdf(acceptanceProject(), opts)
  // Uncompressed PDFs are ASCII apart from binary-marker comments; latin1 keeps byte offsets intact.
  return new TextDecoder('latin1').decode(await blob.arrayBuffer())
}
type M = [number, number, number, number, number, number]
const mul = (a: M, b: M): M => [
  a[0] * b[0] + a[1] * b[2],
  a[0] * b[1] + a[1] * b[3],
  a[2] * b[0] + a[3] * b[2],
  a[2] * b[1] + a[3] * b[3],
  a[4] * b[0] + a[5] * b[2] + b[4],
  a[4] * b[1] + a[5] * b[3] + b[5],
]

/** A tiny PDF content-stream interpreter: q/Q/cm and the points of m/l, mapped to page mm (y down). */
function pagePointsMm(stream: string, pageHeightPt: number): [number, number][] {
  let ctm: M = [1, 0, 0, 1, 0, 0]
  const stack: M[] = []
  const out: [number, number][] = []
  for (const line of stream.split('\n')) {
    const t = line.trim().split(/\s+/)
    const op = t.at(-1)
    const n = t.slice(0, -1).map(Number)
    if (op === 'q') stack.push(ctm)
    else if (op === 'Q') ctm = stack.pop()!
    else if (op === 'cm' && n.length === 6) ctm = mul(n as M, ctm)
    else if ((op === 'm' || op === 'l') && n.length === 2) {
      const xPt = n[0] * ctm[0] + n[1] * ctm[2] + ctm[4]
      const yPt = n[0] * ctm[1] + n[1] * ctm[3] + ctm[5]
      out.push([xPt / PT_PER_MM, (pageHeightPt - yPt) / PT_PER_MM])
    }
  }
  return out
}

const mediaBoxes = (pdf: string) =>
  [...pdf.matchAll(/\/MediaBox \[([\d.\s-]+)\]/g)].map((m) => m[1].trim().split(/\s+/).map(Number))

describe('PDF export', () => {
  it('single page: sized to the drawing in mm, with a true 50 mm calibration square', async () => {
    const pdf = await pdfText({ ...base, mode: 'single' })
    const [box] = mediaBoxes(pdf)
    // Page = margins + header + 100 mm drawing (+ stroke padding 0) + calibration block, converted to points.
    expect(box[2] / PT_PER_MM).toBeCloseTo(Math.max(100, 110) + 20, 1)
    // The calibration square is drawn with `re` (rectangle): its width and height must be 50 mm in points.
    const squares = [...pdf.matchAll(/([\d.]+) ([\d.]+) ([\d.]+) (-?[\d.]+) re\s+S/g)].map((m) => [
      Number(m[3]),
      Math.abs(Number(m[4])),
    ])
    expect(squares.some(([w, h]) => Math.abs(w - 50 * PT_PER_MM) < 0.01 && Math.abs(h - 50 * PT_PER_MM) < 0.01)).toBe(
      true,
    )
  })

  it('draws the 100 mm square at exactly 100 mm on paper, at the printable origin', async () => {
    const p = acceptanceProject()
    p.pieces[0].entities = [p.pieces[0].entities[0]] // just the outline
    const blob = await exportPdf(p, { ...base, mode: 'single' })
    const pdf = new TextDecoder('latin1').decode(await blob.arrayBuffer())
    // svg2pdf writes geometry in SVG units under nested `cm` matrices; interpret q/Q/cm and m/l to get every
    // path point in page millimetres (PDF space is points, y up; flip back to y-down mm).
    const pageHeightPt = mediaBoxes(pdf)[0][3]
    const points = pagePointsMm(pdf.slice(pdf.indexOf('stream'), pdf.indexOf('endstream')), pageHeightPt)
    const xs = points.map(([x]) => x)
    const ys = points.map(([, y]) => y)
    expect(Math.min(...xs)).toBeCloseTo(10, 6) // PAGE_MARGIN
    expect(Math.min(...ys)).toBeCloseTo(16, 6) // PAGE_MARGIN + HEADER_HEIGHT
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(100, 6)
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(100, 6)
  })

  it('tiled: an assembly page plus one page per non-empty tile, all A4', async () => {
    const pdf = await pdfText({ ...base, mode: 'tiled' })
    const boxes = mediaBoxes(pdf)
    // 100 × 100 mm fits on one A4 tile: assembly page + 1.
    expect(boxes).toHaveLength(2)
    for (const b of boxes) {
      const [w, h] = [b[2] / PT_PER_MM, b[3] / PT_PER_MM].sort((a, z) => a - z)
      expect(w).toBeCloseTo(210, 1)
      expect(h).toBeCloseTo(297, 1)
    }
  })

  it('tiles a large drawing over several pages', async () => {
    const big = acceptanceProject()
    // Scale the outline up to 500 mm wide by editing it directly (the test only needs geometry).
    const outline = big.pieces[0].entities[0]
    if (outline.type === 'path')
      outline.segments = outline.segments.map((s) => ({ p: [s.p[0] * 5, s.p[1] * 2] as [number, number] }))
    const blob = await exportPdf(big, { ...base, mode: 'tiled', uncompressed: true })
    const pdf = new TextDecoder('latin1').decode(await blob.arrayBuffer())
    expect(mediaBoxes(pdf).length).toBeGreaterThan(2)
  })
})
