// CLI entry of the MCP server: `node dist-mcp/server.mjs [--root DIR]... [--readonly]`, over stdio.
// stdout carries the protocol, so anything else goes to stderr.

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { parseArgs } from 'node:util'
import { createServer } from './create'

const { values } = parseArgs({
  options: {
    root: { type: 'string', multiple: true },
    readonly: { type: 'boolean', default: false },
  },
})

const roots = values.root?.length ? values.root : [process.cwd()]
const { server, sessions } = createServer({ roots, readonly: values.readonly })
await server.connect(new StdioServerTransport())
console.error(
  `LeatherDraft MCP server ready${sessions.readonly ? ' (read-only)' : ''}; files in ${sessions.roots.join(', ')}`,
)
