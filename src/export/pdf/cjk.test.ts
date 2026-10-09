// @vitest-environment happy-dom
import '../../test/canvas-stub'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { acceptanceProject } from '../../document/fixtures'
import type { TextEntity } from '../../document/model'
import { exportPdf, needsCjk, type PdfOptions } from './index'

const FONT = join(__dirname, '..', '..', '..', 'public', 'fonts', 'NotoSansSC-GB2312.ttf')

const strings = {
  scale: '比例 1:1',
  calibration: '50 mm：测量此方块以检查打印比例',
  instructions: ['请按 100% /“实际大小”打印。'],
  assembly: '各页重叠 10 mm。',
  sheets: '页面',
}

function options(mode: PdfOptions['mode'], s = strings): PdfOptions & { loadCjkFont: ReturnType<typeof vi.fn> } {
  const loadCjkFont = vi.fn(async () => {
    const b = readFileSync(FONT)
    return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer
  })
  return {
    mode,
    paper: 'a4',
    orientation: 'auto',
    overlap: 10,
    svg: {},
    strings: s,
    date: '2026年10月10日',
    loadCjkFont,
  }
}

const text = async (blob: Blob) => new TextDecoder('latin1').decode(await blob.arrayBuffer())

describe('CJK text in PDFs (T4.2)', () => {
  it('detects text Helvetica cannot print', () => {
    expect(needsCjk(['Strap', 'Café 1:1'])).toBe(false)
    expect(needsCjk(['Strap', '前片'])).toBe(true)
  })

  it('embeds the subset font only when needed, and the PDF carries only the glyphs used', async () => {
    const project = acceptanceProject()
    project.name = '钱包'
    const label: TextEntity = {
      id: 'lbl',
      type: 'text',
      layerId: project.layers.find((l) => l.kind === 'notes')!.id,
      lineStyle: 'solid',
      strokeWidth: 0.2,
      position: [10, 10],
      text: '前片 裁 2 片',
      size: 5,
      rotation: 0,
    }
    project.pieces[0].entities.push(label)
    const opts = { ...options('tiled'), uncompressed: true }
    const pdf = await text(await exportPdf(project, opts))
    expect(opts.loadCjkFont).toHaveBeenCalledOnce()
    expect(pdf).toMatch(/\/FontFile2/)
    expect(pdf).toMatch(/\/BaseFont \/\w*NotoSansSC/)
    // The ToUnicode map lets viewers copy the text back: 钱 U+94B1, 包 U+5305 (title), 前 U+524D (label).
    for (const code of ['94b1', '5305', '524d']) expect(pdf.toLowerCase()).toContain(`<${code}>`)
  })

  it('keeps Latin-only projects on Helvetica without loading the font', async () => {
    const opts = options('single', {
      scale: 'Scale 1:1',
      calibration: '50 mm',
      instructions: ['Print at 100 %.'],
      assembly: '',
      sheets: 'Sheets',
    })
    opts.date = '10 Oct 2026'
    const pdf = await text(await exportPdf(acceptanceProject(), opts))
    expect(opts.loadCjkFont).not.toHaveBeenCalled()
    expect(pdf).not.toMatch(/\/FontFile2/)
  })

  it('stays small: jsPDF subsets the 2 MB font down to the glyphs used', async () => {
    const project = acceptanceProject()
    project.name = '钱包'
    const blob = await exportPdf(project, options('single'))
    expect(blob.size).toBeLessThan(300_000)
  })
})
