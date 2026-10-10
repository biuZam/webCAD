// The LeatherDraft MCP server (docs/MCP.md), without a transport: server.ts adds stdio, tests an in-memory one.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registrar } from './define'
import { registerResources } from './resources'
import { Sessions, type SessionOptions } from './sessions'
import { registerDrawTools } from './tools/draw'
import { registerIoTools } from './tools/io'
import { registerLeatherTools } from './tools/leather'
import { registerModifyTools } from './tools/modify'
import { registerProjectTools } from './tools/project'
import { registerQueryTools } from './tools/query'
import { registerShapeTools } from './tools/shape'

export const INSTRUCTIONS = `LeatherDraft: 2D CAD for leather patterns, printed and cut at true 1:1 scale.
Units and axes: every length is in millimetres; y points DOWN (like SVG); angles are degrees, positive = clockwise on screen.
Start with open_project or new_project and pass the returned docId to every other tool. Nothing is written to disk until save_project.
Layers: cut (outlines that get cut), stitch (stitch lines and holes), reference (construction), notes (labels).
Every call that changes the drawing is one undo step (undo/redo). Entities you create are marked aiCreated so a person can review them.
Results are JSON; bounds are [minX, minY, maxX, maxY] in mm.`

export function createServer(options: SessionOptions) {
  const sessions = new Sessions(options)
  const server = new McpServer(
    { name: 'leatherdraft', version: '0.1.0' },
    {
      instructions:
        INSTRUCTIONS + (options.readonly ? '\nThis server is READ-ONLY: drawing tools are unavailable.' : ''),
    },
  )
  const tool = registrar(server, sessions)
  registerProjectTools(tool, sessions)
  registerQueryTools(tool, sessions)
  registerDrawTools(tool, sessions)
  registerModifyTools(tool, sessions)
  registerShapeTools(tool, sessions)
  registerLeatherTools(tool, sessions)
  registerResources(server, sessions)
  registerIoTools(tool, sessions)
  return { server, sessions }
}
