// Read-only resources per open document, so a client can attach the drawing as context without a tool call.

import { ResourceTemplate, type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { exportSvg } from '../export/svg'
import { serializeProject } from '../persistence/files'
import type { Sessions } from './sessions'

const FILES = {
  'project.json': {
    mimeType: 'application/json',
    description: 'The whole project (LeatherDraft file format, millimetres, y down).',
    render: serializeProject,
  },
  'drawing.svg': {
    mimeType: 'image/svg+xml',
    description: 'The drawing as true-scale SVG (visible layers, with labels).',
    render: (p: Parameters<typeof exportSvg>[0]) => exportSvg(p, { includeLabels: true }),
  },
} as const

export function registerResources(server: McpServer, sessions: Sessions) {
  for (const [name, f] of Object.entries(FILES)) {
    server.registerResource(
      name,
      new ResourceTemplate(`leatherdraft://{docId}/${name}`, {
        list: () => ({
          resources: sessions.list().map((d) => ({
            uri: `leatherdraft://${d.id}/${name}`,
            name: `${d.store.getState().project.name} (${d.id}) ${name}`,
            mimeType: f.mimeType,
          })),
        }),
      }),
      { description: f.description, mimeType: f.mimeType },
      (uri, { docId }) => {
        const project = sessions.get(String(docId)).store.getState().project
        return { contents: [{ uri: uri.href, mimeType: f.mimeType, text: f.render(project) }] }
      },
    )
  }
}
