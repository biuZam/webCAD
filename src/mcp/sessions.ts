// Open documents of one MCP server process, and the file-system sandbox (`--root`).

import { existsSync, realpathSync } from 'node:fs'
import path from 'node:path'
import type { Project } from '../document/model'
import { createDocumentStore, type DocumentStore } from '../document/store'
import { ToolError } from './result'

export interface Doc {
  id: string
  store: DocumentStore
  /** Absolute path of the project file, once opened from or saved to one. */
  file: string | null
  /** The project as last opened or saved: dirty = the current project is a different object. */
  saved: Project
}

export interface SessionOptions {
  /** Directories files may be read from and written to. */
  roots: readonly string[]
  /** Only tools that change nothing and write no project file are registered. */
  readonly: boolean
}

export class Sessions {
  readonly roots: string[]
  readonly readonly: boolean
  private readonly docs = new Map<string, Doc>()
  private next = 1

  constructor(options: SessionOptions) {
    if (options.roots.length === 0) throw new Error('At least one root directory is required')
    this.roots = options.roots.map((r) => realpathSync(r))
    this.readonly = options.readonly
  }

  add(project: Project, file: string | null): Doc {
    const doc: Doc = { id: `d${this.next++}`, store: createDocumentStore(project), file, saved: project }
    this.docs.set(doc.id, doc)
    return doc
  }

  get(id: string): Doc {
    const doc = this.docs.get(id)
    if (!doc) throw new ToolError(`Unknown docId '${id}'. Call open_project or new_project first.`)
    return doc
  }

  byFile(file: string): Doc | undefined {
    for (const doc of this.docs.values()) if (doc.file === file) return doc
    return undefined
  }

  list(): Doc[] {
    return [...this.docs.values()]
  }

  close(id: string) {
    this.docs.delete(id)
  }

  isDirty(doc: Doc): boolean {
    return doc.store.getState().project !== doc.saved
  }

  /**
   * An absolute path inside one of the roots for a file the client named (relative paths are relative to the
   * first root). Symlinks are resolved before the check; for a new file its directory must already exist.
   */
  resolve(file: string, extensions: readonly string[]): string {
    const ext = path.extname(file).toLowerCase()
    if (!extensions.includes(ext)) throw new ToolError(`Expected a ${extensions.join(' or ')} file, got '${file}'.`)
    const absolute = path.resolve(this.roots[0], file)
    let real: string
    if (existsSync(absolute)) real = realpathSync(absolute)
    else {
      const dir = path.dirname(absolute)
      if (!existsSync(dir)) throw new ToolError(`Directory '${dir}' does not exist.`)
      real = path.join(realpathSync(dir), path.basename(absolute))
    }
    const inside = this.roots.some((root) => {
      const rel = path.relative(root, real)
      return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel)
    })
    if (!inside) throw new ToolError(`'${file}' is outside the allowed directories: ${this.roots.join(', ')}.`)
    return real
  }
}
