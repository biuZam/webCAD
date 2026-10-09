import { nanoid } from 'nanoid'
import type { Id, Layer, LayerKind, Piece, Project } from './model'
import { CURRENT_SCHEMA_VERSION } from './schema'

export const newId = (): Id => nanoid(10)

const DEFAULT_LAYERS: ReadonlyArray<{ kind: LayerKind; color: string }> = [
  { kind: 'cut', color: '#1f2937' },
  { kind: 'stitch', color: '#2563eb' },
  { kind: 'reference', color: '#9ca3af' },
  { kind: 'notes', color: '#b45309' },
]

export function createLayer(kind: LayerKind, color: string): Layer {
  // Layer names are user-editable data; the UI shows the translated kind until renamed.
  return { id: newId(), name: kind, kind, visible: true, locked: false, color }
}

export function createPiece(name = 'Piece 1'): Piece {
  return { id: newId(), name, quantity: 1, mirrored: false, entities: [] }
}

export function createProject(name = 'Untitled'): Project {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: newId(),
    name,
    displayUnit: 'mm',
    settings: { stitchMargin: 3.5, pitch: 3.85, holeSize: 1.2 },
    layers: DEFAULT_LAYERS.map(({ kind, color }) => createLayer(kind, color)),
    pieces: [createPiece()],
  }
}
