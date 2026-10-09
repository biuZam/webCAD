// T4.7 "Import SVG…": pick a file, convert its shapes (src/persistence/svg-import.ts) and add them to the
// Reference layer for tracing (or the active layer if Reference is locked or hidden), as one undo step,
// selected so they can be moved or scaled into place straight away.

import { toolSession } from '../canvas/tool-session'
import { useUiStore } from '../canvas/ui-store'
import { addEntities } from '../document/commands'
import { newId } from '../document/factory'
import type { PathEntity } from '../document/model'
import { documentStore } from '../document/store'
import { importSvg, SvgImportError } from '../persistence/svg-import'
import { DEFAULT_STROKE_MM } from '../tools/common'
import { LINE_STYLE_FOR_LAYER } from '../tools/session'

function pickSvgFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.svg,image/svg+xml' })
    input.addEventListener('change', () => resolve(input.files?.[0] ?? null))
    input.addEventListener('cancel', () => resolve(null))
    input.click()
  })
}

export async function importSvgFile() {
  const { showNotice, activeLayerId } = useUiStore.getState()
  const file = await pickSvgFile()
  if (!file) return
  try {
    const { shapes, skipped } = importSvg(await file.text())
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
      dispatch(addEntities(piece.id, entities, 'history.importSvg'))
      toolSession.select(entities.map((e) => e.id))
    }
    showNotice({ kind: 'info', key: 'file.imported', name: file.name, count: entities.length, skipped })
  } catch (e) {
    if (!(e instanceof SvgImportError)) console.error('[LeatherDraft] SVG import failed', e)
    showNotice({ kind: 'error', errorKey: e instanceof SvgImportError ? 'file.notSvg' : 'file.ioFailed' })
  }
}
