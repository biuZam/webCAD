// Test helper: a real MCP client connected to a fresh server over an in-memory transport, in a temp directory.

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createServer } from './create'

export async function startServer(options: { readonly?: boolean; dir?: string } = {}) {
  const dir = options.dir ?? mkdtempSync(path.join(tmpdir(), 'leatherdraft-mcp-'))
  const { server, sessions } = createServer({ roots: [dir], readonly: options.readonly ?? false })
  const [a, b] = InMemoryTransport.createLinkedPair()
  await server.connect(a)
  const client = new Client({ name: 'test', version: '1' })
  await client.connect(b)

  /** Call a tool; returns its parsed JSON result, or throws with the error text. */
  async function call(name: string, args: Record<string, unknown> = {}): Promise<any> {
    const result = (await client.callTool({ name, arguments: args })) as {
      content: { text: string }[]
      isError?: boolean
    }
    if (result.isError) throw new Error(result.content[0].text)
    return JSON.parse(result.content[0].text)
  }

  const entities = (docId: string) => sessions.get(docId).store.getState().project.pieces[0].entities
  return { dir, client, sessions, call, entities }
}
