// Entity constructors shared by the interactive tools (src/tools) and the MCP server (src/mcp), so both build
// exactly the same entities. Pure: they read the project but never dispatch.

import { offsetEntity, shapeToPath, type OffsetResult } from '../geometry/offset'
import { newId } from './factory'
import type {
  CornerMode,
  Entity,
  HoleSetEntity,
  HoleShape,
  JoinStyle,
  Layer,
  LineStyle,
  PathEntity,
  Project,
  Segment,
} from './model'

/** Default export stroke width for new entities (mm). */
export const DEFAULT_STROKE_MM = 0.2

/** Default line style for new entities, by the kind of layer they're drawn on. */
export const LINE_STYLE_FOR_LAYER: Record<Layer['kind'], LineStyle> = {
  cut: 'solid',
  stitch: 'dashed',
  reference: 'dotted',
  notes: 'solid',
}

/** Default slant of slit holes relative to the stitch line, like a diamond chisel's marks. */
export const DEFAULT_SLIT_ANGLE = 45

/** Entity types that can be offset (stitch holes and text have no outline to offset). */
export function canOffset(e: Entity): boolean {
  return e.type === 'path' || e.type === 'circle' || e.type === 'centreLine'
}

/** Lines holes can follow, as path geometry. */
export function holeLine(e: Entity): { segments: Segment[]; closed: boolean } | null {
  switch (e.type) {
    case 'path':
      return e.segments.length >= 2 ? { segments: e.segments, closed: e.closed } : null
    case 'circle':
      return shapeToPath({ type: 'circle', center: e.center, rx: e.rx, ry: e.ry, rotation: e.rotation })
    case 'centreLine':
      return { segments: [{ p: e.from }, { p: e.to }], closed: false }
    default:
      return null
  }
}

/**
 * The layer stitch lines and holes for `source` go on: the Stitch layer, else the source's own layer.
 * Null if that layer is locked or hidden (nothing may be added to it).
 */
export function stitchLayer(project: Project, source: Entity): Layer | null {
  const layer = project.layers.find((l) => l.kind === 'stitch') ?? project.layers.find((l) => l.id === source.layerId)
  return layer && !layer.locked && layer.visible ? layer : null
}

/**
 * A stitch line: a dashed path linked to `source` at signed `margin` (offsetEntity's convention). Its geometry
 * is regenerated from the link by the derivation pass, so the geometry here is only the initial value.
 * Pass `result` when the offset was already computed (precise quality). Null if the offset is empty.
 */
export function stitchLine(
  source: Entity,
  layerId: string,
  margin: number,
  join: JoinStyle,
  result: OffsetResult = offsetEntity(source, margin, join),
): { entity: PathEntity; result: OffsetResult } | null {
  // One linked line per source (the first piece if an inset splits).
  if (result.shapes.length === 0) return null
  const entity: PathEntity = {
    id: newId(),
    type: 'path',
    layerId,
    lineStyle: 'dashed',
    strokeWidth: source.strokeWidth,
    ...shapeToPath(result.shapes[0]),
    derived: { kind: 'offset', sourceId: source.id, margin, join },
  }
  return { entity, result }
}

export interface HoleSetOptions {
  pitch: number
  holeSize: number
  holeShape?: HoleShape
  slitAngle?: number
  cornerMode?: CornerMode
  /** Signed offset from the source before distributing (offsetEntity's convention). Default 0. */
  margin?: number
}

/** A hole set linked to `source`; its holes are laid out by the derivation pass when the command runs. */
export function holeSet(source: Entity, layerId: string, o: HoleSetOptions): HoleSetEntity {
  return {
    id: newId(),
    type: 'holeSet',
    layerId,
    lineStyle: 'solid',
    strokeWidth: source.strokeWidth,
    sourceEntityId: source.id,
    margin: o.margin ?? 0,
    pitch: o.pitch,
    holeShape: o.holeShape ?? 'round',
    holeSize: o.holeSize,
    slitAngle: o.slitAngle ?? DEFAULT_SLIT_ANGLE,
    cornerMode: o.cornerMode ?? 'cornerAware',
    holes: [],
  }
}
