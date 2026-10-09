import { ArcTool } from './arc'
import { CentreLineTool } from './centre-line'
import { CircleTool } from './circle'
import { ChamferTool, FilletTool } from './corner-tools'
import { LineTool } from './line'
import { MeasureTool } from './measure'
import { MirrorTool } from './mirror'
import { MoveTool } from './move'
import { OffsetTool } from './offset'
import { PenTool } from './pen'
import { PerpendicularTool } from './perpendicular'
import { RectangleTool } from './rectangle'
import { RotateTool } from './rotate'
import { ScaleTool } from './scale'
import { SelectTool } from './select'
import { StitchHolesTool } from './stitch-holes'
import { StitchLineTool } from './stitch-line'
import type { Tool, ToolId } from './types'

export function createTools(): Record<ToolId, Tool> {
  return {
    select: new SelectTool(),
    line: new LineTool(),
    rectangle: new RectangleTool(),
    circle: new CircleTool(),
    pen: new PenTool(),
    arc: new ArcTool(),
    centreLine: new CentreLineTool(),
    perpendicular: new PerpendicularTool(),
    measure: new MeasureTool(),
    move: new MoveTool(),
    rotate: new RotateTool(),
    scale: new ScaleTool(),
    mirror: new MirrorTool(),
    offset: new OffsetTool(),
    stitchLine: new StitchLineTool(),
    stitchHoles: new StitchHolesTool(),
    fillet: new FilletTool(),
    chamfer: new ChamferTool(),
  }
}

/** Single-key shortcuts (rebindable later, T4.8). */
export const TOOL_SHORTCUTS: Record<string, ToolId> = {
  v: 'select',
  l: 'line',
  r: 'rectangle',
  c: 'circle',
  p: 'pen',
  a: 'arc',
  x: 'centreLine',
  t: 'perpendicular',
  d: 'measure',
  m: 'move',
  o: 'rotate',
  s: 'scale',
  i: 'mirror',
  e: 'offset',
  k: 'stitchLine',
  h: 'stitchHoles',
  f: 'fillet',
  b: 'chamfer',
}

/** Palette order; `null` draws a divider between groups. */
export const TOOL_ORDER: readonly (ToolId | null)[] = [
  'select',
  null,
  'line',
  'rectangle',
  'circle',
  'pen',
  'arc',
  'centreLine',
  'perpendicular',
  null,
  'move',
  'rotate',
  'scale',
  'mirror',
  null,
  'fillet',
  'chamfer',
  'offset',
  'stitchLine',
  'stitchHoles',
  null,
  'measure',
]
