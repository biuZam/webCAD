// Import and export tools. Same importers and exporters as the App, so files are identical to an export from
// the Export dialog and imports land the same way as "Import…". PDF export and SVG import need a DOM:
// headless-dom.ts installs happy-dom the first time.

import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { DEFAULT_STROKE_MM, LINE_STYLE_FOR_LAYER } from '../../document/builders'
import { addEntities } from '../../document/commands'
import { newId } from '../../document/factory'
import type { PathEntity } from '../../document/model'
import { exportDxf } from '../../export/dxf'
import type { PdfStrings } from '../../export/pdf'
import { exportSvg, type SvgExportOptions } from '../../export/svg'
import en from '../../locales/en/export.json'
import de from '../../locales/de/export.json'
import es from '../../locales/es/export.json'
import fr from '../../locales/fr/export.json'
import it from '../../locales/it/export.json'
import pt from '../../locales/pt/export.json'
import zhCN from '../../locales/zh-CN/export.json'
import { importDxf } from '../../persistence/dxf-import'
import type { ImportedShape } from '../../persistence/svg-import'
import type { Registrar } from '../define'
import { commit, layerOf, pieceOf, writableLayer } from '../edit'
import { ensureDom } from '../headless-dom'
import { ToolError } from '../result'
import { docId, layerRef, pieceId } from '../schemas'
import type { Sessions } from '../sessions'

// Japanese, Korean and traditional Chinese print the English text: the bundled PDF font lacks their glyphs.
const LOCALES = { en, 'zh-CN': zhCN, de, es, fr, it, pt, ja: en, ko: en, 'zh-TW': en } as const

/** The text printed on PDF pages, from the App's own translations. */
function pdfStrings(language: keyof typeof LOCALES, overlap: number): PdfStrings {
  const t = LOCALES[language].pdf
  return {
    scale: t.scale,
    calibration: t.calibration,
    instructions: [t.instructions1, t.instructions2],
    assembly: t.assembly.replace('{overlap}', String(overlap)),
    sheets: t.sheets,
  }
}

const CJK_FONT_FILE = 'public/fonts/NotoSansSC-GB2312.ttf'

/** The CJK font from the repository (dist-mcp/ and src/mcp/tools/ are both below it). */
async function loadCjkFont(): Promise<ArrayBuffer> {
  for (let dir = path.dirname(fileURLToPath(import.meta.url)); ; dir = path.dirname(dir)) {
    const file = path.join(dir, CJK_FONT_FILE)
    if (existsSync(file)) {
      const bytes = await readFile(file)
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
    }
    if (path.dirname(dir) === dir) throw new Error(`CJK font not found (${CJK_FONT_FILE})`)
  }
}

const options = {
  layers: z.array(layerRef).optional().describe('Only these layers. Default: every visible layer.'),
  cutOnly: z.boolean().optional().describe('Only cut layers (for laser cutting).'),
  includeLabels: z.boolean().optional().describe('Include text labels. Default true (SVG only).'),
  margin: z.number().min(0).optional().describe('Empty space around the drawing, mm. Default 0.'),
  polyline: z.boolean().optional().describe('Flatten curves to straight segments within 0.01 mm.'),
}

export function registerIoTools(tool: Registrar, sessions: Sessions) {
  const exportOptions = (id: string, o: { layers?: string[] } & Omit<SvgExportOptions, 'layerIds'>) => {
    const { project } = sessions.get(id).store.getState()
    const { layers, ...rest } = o
    return { project, options: { ...rest, layerIds: layers?.map((ref) => layerOf(project, ref).id) } }
  }

  tool(
    'export_svg',
    {
      description:
        'Export true-scale SVG (width/height in mm, one group per layer). With a path, writes the file; ' +
        'without, returns the SVG text so you can inspect it.',
      input: { docId, path: z.string().optional().describe('.svg file to write.'), ...options },
      write: false,
    },
    async ({ docId, path, ...o }) => {
      const { project, options } = exportOptions(docId, o)
      const svg = exportSvg(project, { includeLabels: true, ...options })
      if (path === undefined) return { svg }
      const file = sessions.resolve(path, ['.svg'])
      await writeFile(file, svg, 'utf8')
      return { file, bytes: Buffer.byteLength(svg) }
    },
  )

  tool(
    'export_dxf',
    {
      description:
        'Export a DXF file in mm (R12 entities, one DXF layer per layer, y flipped up). Labels are left out.',
      input: { docId, path: z.string().describe('.dxf file to write.'), ...options },
      write: false,
    },
    async ({ docId, path, ...o }) => {
      const { project, options } = exportOptions(docId, o)
      const file = sessions.resolve(path, ['.dxf'])
      const dxf = exportDxf(project, options)
      await writeFile(file, dxf, 'utf8')
      return { file, bytes: Buffer.byteLength(dxf) }
    },
  )

  tool(
    'export_pdf',
    {
      description:
        'Export a 1:1 PDF for printing, with a 50 mm calibration square. tiled (default): the pattern split ' +
        "over sheets of `paper` with overlap and assembly marks; 'single': one page sized to the pattern. " +
        'Printed instructions in English or Chinese; Chinese text in labels is embedded with a CJK font.',
      input: {
        docId,
        path: z.string().describe('.pdf file to write.'),
        mode: z.enum(['tiled', 'single']).optional(),
        paper: z.enum(['a4', 'letter', 'a3']).optional().describe("Default 'a4'."),
        orientation: z.enum(['auto', 'portrait', 'landscape']).optional().describe("Default 'auto': fewest sheets."),
        overlap: z.number().min(0).max(50).optional().describe('Sheet overlap, mm. Default 10.'),
        language: z
          .enum(['en', 'zh-CN', 'zh-TW', 'de', 'fr', 'es', 'it', 'pt', 'ja', 'ko'])
          .optional()
          .describe("Printed instructions. Default 'en'."),
        ...options,
      },
      write: false,
    },
    async ({
      docId,
      path: out,
      mode = 'tiled',
      paper = 'a4',
      orientation = 'auto',
      overlap = 10,
      language = 'en',
      ...o
    }) => {
      const { project, options } = exportOptions(docId, o)
      const file = sessions.resolve(out, ['.pdf'])
      await ensureDom()
      const { exportPdf } = await import('../../export/pdf')
      const blob = await exportPdf(project, {
        mode,
        paper,
        orientation,
        overlap,
        svg: { includeLabels: true, ...options },
        strings: pdfStrings(language, overlap),
        date: new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(new Date()),
        loadCjkFont,
      })
      const bytes = new Uint8Array(await blob.arrayBuffer())
      await writeFile(file, bytes)
      return { file, bytes: bytes.byteLength }
    },
  )

  tool(
    'import_file',
    {
      description:
        'Import the shapes of an SVG or DXF file (units honoured, in mm) as paths, for tracing or reuse. Default ' +
        'layer: reference. Text, images and blocks are skipped and counted.',
      input: {
        docId,
        path: z.string().describe('.svg or .dxf file to read.'),
        layer: layerRef.optional(),
        pieceId: pieceId.optional(),
      },
      write: true,
    },
    async ({ docId, path: src, layer: ref, pieceId }) => {
      const doc = sessions.get(docId)
      const file = sessions.resolve(src, ['.svg', '.dxf'])
      const text = await readFile(file, 'utf8')
      let imported: { shapes: ImportedShape[]; skipped: number }
      try {
        if (file.toLowerCase().endsWith('.dxf')) imported = importDxf(text)
        else {
          await ensureDom()
          const { importSvg } = await import('../../persistence/svg-import')
          imported = importSvg(text)
        }
      } catch (error) {
        throw new ToolError(`Cannot read '${src}': ${error instanceof Error ? error.message : error}`)
      }
      const { project } = doc.store.getState()
      const layer = writableLayer(project, ref ?? 'reference')
      const entities: PathEntity[] = imported.shapes.map((s) => ({
        id: newId(),
        type: 'path',
        layerId: layer.id,
        lineStyle: LINE_STYLE_FOR_LAYER[layer.kind],
        strokeWidth: DEFAULT_STROKE_MM,
        segments: s.segments,
        closed: s.closed,
      }))
      if (entities.length === 0) return { created: [], skipped: imported.skipped, bounds: null }
      const result = commit(doc, addEntities(pieceOf(project, pieceId).id, entities, 'history.import'), {
        created: entities.map((e) => e.id),
      })
      return { ...result, skipped: imported.skipped }
    },
  )
}
