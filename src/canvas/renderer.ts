// Reconciles the document into the on-screen Paper.js scope. See docs/ARCHITECTURE.md §5.
// Immer keeps unchanged entities referentially equal, so diffing by reference rebuilds only what changed.

import type { Entity, Id, Layer, Project } from '../document/model'
import { buildEntityItem, restyleItem, type ItemStyle } from './items'

/** Selected entities are drawn in the selection colour at this stroke width (CSS px). */
const SELECTED_WIDTH_PX = 2

interface Rendered {
  entity: Entity
  layer: Layer
  item: paper.Item
}

export class DocumentRenderer {
  private readonly layers = new Map<Id, paper.Layer>()
  private readonly items = new Map<Id, Rendered>()
  private readonly ps: paper.PaperScope
  private selection: ReadonlySet<Id> = new Set()
  private selectionColor: string

  constructor(ps: paper.PaperScope, selectionColor: string) {
    this.ps = ps
    this.selectionColor = selectionColor
  }

  /** Highlight `ids`. Only entities whose selected state changed are restyled. */
  setSelection(ids: readonly Id[], selectionColor = this.selectionColor) {
    const next = new Set(ids)
    const recolor = selectionColor !== this.selectionColor
    const prev = this.selection
    this.selection = next
    this.selectionColor = selectionColor
    for (const [id, r] of this.items) {
      if (recolor ? next.has(id) : prev.has(id) !== next.has(id))
        restyleItem(this.ps, r.item, this.styleFor(r.entity, r.layer))
    }
  }

  private styleFor(entity: Entity, layer: Layer): ItemStyle {
    return this.selection.has(entity.id)
      ? { color: this.selectionColor, width: SELECTED_WIDTH_PX }
      : { color: layer.color, width: 1 }
  }

  sync(project: Project) {
    this.ps.activate()
    this.syncLayers(project.layers)

    const layersById = new Map(project.layers.map((l) => [l.id, l]))
    const seen = new Set<Id>()
    for (const piece of project.pieces) {
      for (const entity of piece.entities) {
        // Hole sets are drawn on their own raw-canvas layer (holes-layer.ts), not as Paper items.
        if (entity.type === 'holeSet') continue
        seen.add(entity.id)
        const layer = layersById.get(entity.layerId)
        if (!layer) continue
        const prev = this.items.get(entity.id)
        if (prev && prev.entity === entity && prev.layer === layer) continue
        prev?.item.remove()
        const item = buildEntityItem(this.ps, entity, this.styleFor(entity, layer))
        item.data.entityId = entity.id
        this.layers.get(layer.id)!.addChild(item)
        this.items.set(entity.id, { entity, layer, item })
      }
    }
    for (const [id, r] of this.items) {
      if (!seen.has(id)) {
        r.item.remove()
        this.items.delete(id)
      }
    }
  }

  private syncLayers(layers: readonly Layer[]) {
    const ids = new Set(layers.map((l) => l.id))
    for (const [id, pl] of this.layers) {
      if (!ids.has(id)) {
        pl.remove()
        this.layers.delete(id)
      }
    }
    // Document layers keep project order at the bottom of the stack; the overlay is brought to the front after sync.
    layers.forEach((layer, i) => {
      let pl = this.layers.get(layer.id)
      if (!pl) {
        pl = new this.ps.Layer({ name: `doc:${layer.id}` })
        this.layers.set(layer.id, pl)
      }
      pl.visible = layer.visible
      pl.locked = layer.locked
      this.ps.project.insertLayer(i, pl)
    })
  }
}
