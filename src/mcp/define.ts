// `defineTool`: registers one MCP tool with the shared error handling and the read-only rule.

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import { fail, ok } from './result'
import type { Sessions } from './sessions'

export interface ToolSpec<S extends z.ZodRawShape> {
  description: string
  input: S
  /** Changes a document or writes a project file. Such tools are not registered in --readonly mode. */
  write: boolean
  destructive?: boolean
}

export type Registrar = <S extends z.ZodRawShape>(
  name: string,
  spec: ToolSpec<S>,
  handler: (args: z.infer<z.ZodObject<S>>) => object | Promise<object>,
) => void

export function registrar(server: McpServer, sessions: Sessions): Registrar {
  return (name, spec, handler) => {
    if (spec.write && sessions.readonly) return
    const run = async (args: never): Promise<CallToolResult> => {
      try {
        return ok(await handler(args))
      } catch (error) {
        return fail(error)
      }
    }
    server.registerTool(
      name,
      {
        description: spec.description,
        inputSchema: spec.input,
        annotations: { readOnlyHint: !spec.write, destructiveHint: spec.destructive ?? false },
      },
      run as never,
    )
  }
}
