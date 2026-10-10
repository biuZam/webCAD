// L1 Stitch line: a dashed line on the Stitch layer at the stitch margin from an outline, linked to it.
// It is an offset with different defaults (fixed margin from project settings, not through-cursor), whose
// result carries a `derived` link, so it follows the outline when that is edited (src/document/derived.ts).

import { stitchLayer, stitchLine } from '../document/builders'
import type { Entity, Id } from '../document/model'
import type { OffsetResult } from '../geometry/offset'
import { OffsetTool } from './offset'
import type { ToolContext, ToolId } from './types'

export class StitchLineTool extends OffsetTool {
  override readonly id: ToolId = 'stitchLine'
  protected override readonly labelKey = 'history.stitchLine'
  protected override readonly prompts = {
    pick: 'stitchLine.promptPick',
    side: 'stitchLine.promptSide',
    approx: 'stitchLine.promptApprox',
  } as const
  protected override through = false

  protected override makeEntities(
    source: Entity,
    result: OffsetResult,
    margin: number,
    ctx: ToolContext,
  ): Entity[] | null {
    const layer = stitchLayer(ctx.project, source)
    if (!layer) {
      ctx.setPrompt('common.layerUnavailable', [])
      return null
    }
    const line = stitchLine(source, layer.id, margin, this.join, result)
    return line ? [line.entity] : null
  }

  /** A stitch line of a stitch line is rarely wanted: go back to picking the next outline. */
  protected override afterCommit(): Id[] {
    return []
  }
}
