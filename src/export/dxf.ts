// T4.6 DXF export for laser/CNC software: same layer and content choices as SVG, drawn through the Maker.js
// adapter. Loaded lazily (Maker.js stays out of the initial bundle).

import type { Project } from '../document/model'
import { toDxf } from '../geometry/maker-adapter'
import { GENERATOR_NOTE } from './provenance'
import { exportSelection, type SvgExportOptions } from './svg'

export function exportDxf(project: Project, options: SvgExportOptions = {}): string {
  const { layers, entities } = exportSelection(project, { ...options, includeLabels: false })
  // Group code 999 is a DXF comment; readers skip it.
  return `999\n${GENERATOR_NOTE}\n` + toDxf(layers, entities, { polyline: options.polyline })
}
