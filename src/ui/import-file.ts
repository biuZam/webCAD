// T4.7 / T5.3 "Import…": pick an SVG or DXF file, convert its shapes (src/persistence/svg-import.ts,
// dxf-import.ts) and add them to the Reference layer for tracing (or the active layer if Reference is locked or hidden), as one undo step,
// selected so they can be moved or scaled into place straight away.

import { toolSession } from '../canvas/tool-session'
import { useUiStore } from '../canvas/ui-store'
import { addEntities } from '../document/commands'
import { newId } from '../document/factory'
import type { PathEntity } from '../document/model'
import { documentStore } from '../document/store'
import { DxfImportError, importDxf } from '../persistence/dxf-import'
import { importSvg, SvgImportError } from '../persistence/svg-import'
import { DEFAULT_STROKE_MM } from '../tools/common'
import { LINE_STYLE_FOR_LAYER } from '../tools/session'

function pickFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = Object.assign(document.createElement('input'), {
      type: 'file',
      accept: '.svg,.dxf,image/svg+xml,image/vnd.dxf,application/dxf',
    })
    input.addEventListener('change', () => resolve(input.files?.[0] ?? null))
    input.addEventListener('cancel', () => resolve(null))
    input.click()
  })
}

/** DXF by extension, else by content (a DXF starts with a group code, an SVG with markup). */
const isDxf = (name: string, text: string) => /\.dxf$/i.test(name) || /^\s*0\s*\r?\n\s*SECTION/.test(text)

export async function importFile() {
  const { showNotice, activeLayerId } = useUiStore.getState()
  const file = await pickFile()
  if (!file) return
  try {
    const text = await file.text()
    const { shapes, skipped } = isDxf(file.name, text) ? importDxf(text) : importSvg(text)
    const { project, dispatch } = documentStore.getState()
    const usable = (id: string | null | undefined) => project.layers.find((l) => l.id === id && l.visible && !l.locked)
    const layer = usable(project.layers.find((l) => l.kind === 'reference')?.id) ?? usable(activeLayerId)
    const piece = project.pieces[0]
    if (!layer || !piece) return showNotice({ kind: 'error', errorKey: 'file.importNoLayer' })
    const entities: PathEntity[] = shapes.map((s) => ({
      id: newId(),
      type: 'path',
      layerId: layer.id,
      lineStyle: LINE_STYLE_FOR_LAYER[layer.kind],
      strokeWidth: DEFAULT_STROKE_MM,
      segments: s.segments,
      closed: s.closed,
    }))
    if (entities.length > 0) {
      dispatch(addEntities(piece.id, entities, 'history.import'))
      toolSession.select(entities.map((e) => e.id))
    }
    showNotice({ kind: 'info', key: 'file.imported', name: file.name, count: entities.length, skipped })
  } catch (e) {
    const known = e instanceof SvgImportError || e instanceof DxfImportError
    if (!known) console.error('[LeatherDraft] Import failed', e)
    showNotice({ kind: 'error', errorKey: known ? 'file.notDrawing' : 'file.ioFailed' })
  }
}
