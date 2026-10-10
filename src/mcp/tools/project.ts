// Project tools: open, create, save, close, inspect; settings and layers.

import { readFile, writeFile } from 'node:fs/promises'
import { z } from 'zod'
import { renameProject, updateLayer, updateProjectSettings, type Command } from '../../document/commands'
import { createProject } from '../../document/factory'
import type { Project } from '../../document/model'
import { parseProjectFile, serializeProject } from '../../persistence/files'
import type { Registrar } from '../define'
import { commit, layerOf } from '../edit'
import { bounds, ToolError } from '../result'
import { docId, layerRef, length } from '../schemas'
import type { Doc, Sessions } from '../sessions'

function summary(sessions: Sessions, doc: Doc) {
  const { project, past, future } = doc.store.getState()
  const all = project.pieces.flatMap((p) => p.entities)
  return {
    docId: doc.id,
    file: doc.file,
    readonly: sessions.readonly,
    dirty: sessions.isDirty(doc),
    name: project.name,
    settings: project.settings,
    layers: project.layers.map(({ id, name, kind, visible, locked }) => ({ id, name, kind, visible, locked })),
    pieces: project.pieces.map((p) => ({ id: p.id, name: p.name, quantity: p.quantity, entities: p.entities.length })),
    bounds: bounds(all),
    aiUnreviewed: all.filter((e) => e.aiCreated).length,
    history: { undo: past.length, redo: future.length },
  }
}

export function registerProjectTools(tool: Registrar, sessions: Sessions) {
  tool('list_projects', { description: 'List the documents open in this session.', input: {}, write: false }, () => ({
    projects: sessions.list().map((d) => ({
      docId: d.id,
      file: d.file,
      name: d.store.getState().project.name,
      dirty: sessions.isDirty(d),
    })),
  }))

  tool(
    'new_project',
    {
      description:
        'Create an empty project in memory (layers cut, stitch, reference, notes; one piece). Save it with save_project.',
      input: { name: z.string().optional() },
      write: true,
    },
    ({ name }) => {
      const doc = sessions.add(createProject(name), null)
      return summary(sessions, doc)
    },
  )

  tool(
    'open_project',
    {
      description: 'Open a LeatherDraft project file (.json). Opening a file that is already open returns its docId.',
      input: { path: z.string().describe('Path of the .json file, relative to the first allowed directory.') },
      write: false,
    },
    async ({ path }) => {
      const file = sessions.resolve(path, ['.json'])
      const open = sessions.byFile(file)
      if (open) return summary(sessions, open)
      let project: Project
      try {
        project = parseProjectFile(await readFile(file, 'utf8'))
      } catch (error) {
        const reason = error instanceof Error ? error.message.replace(/^errors:file\./, '') : String(error)
        throw new ToolError(`Cannot open '${path}' as a LeatherDraft project (${reason}).`)
      }
      return summary(sessions, sessions.add(project, file))
    },
  )

  tool(
    'save_project',
    {
      description: 'Write the project to a .json file. Without a path, saves over the file it was opened from.',
      input: { docId, path: z.string().optional() },
      write: true,
    },
    async ({ docId, path }) => {
      const doc = sessions.get(docId)
      if (path === undefined && !doc.file) throw new ToolError('This project has no file yet: pass a path.')
      const file = path === undefined ? doc.file! : sessions.resolve(path, ['.json'])
      const other = sessions.byFile(file)
      if (other && other !== doc) throw new ToolError(`'${path}' is open as ${other.id}; close it first.`)
      const project = doc.store.getState().project
      await writeFile(file, serializeProject(project), 'utf8')
      doc.file = file
      doc.saved = project
      return { file }
    },
  )

  tool(
    'close_project',
    {
      description: 'Close a document. Refuses if it has unsaved changes unless discard is true.',
      input: { docId, discard: z.boolean().optional() },
      write: false,
    },
    ({ docId, discard }) => {
      const doc = sessions.get(docId)
      if (sessions.isDirty(doc) && !discard && !sessions.readonly)
        throw new ToolError('Unsaved changes. Call save_project, or close_project with discard: true.')
      sessions.close(docId)
      return {}
    },
  )

  tool(
    'get_project',
    {
      description:
        'Overview of a document: name, settings, layers, pieces, overall bounds [minX, minY, maxX, maxY] in mm, ' +
        'how many AI-created entities are unreviewed, and undo/redo depth.',
      input: { docId },
      write: false,
    },
    ({ docId }) => summary(sessions, sessions.get(docId)),
  )

  tool(
    'update_settings',
    {
      description:
        'Change the project name or defaults used by stitch tools: stitchMargin (distance of stitch lines from ' +
        'the edge), pitch (hole spacing; common chisels 2.7, 3.38, 3.85, 4.0, 5.0) and holeSize, all in mm.',
      input: {
        docId,
        name: z.string().min(1).optional(),
        stitchMargin: length.optional(),
        pitch: length.optional(),
        holeSize: length.optional(),
      },
      write: true,
    },
    ({ docId, name, ...settings }) => {
      const doc = sessions.get(docId)
      const changes = Object.fromEntries(Object.entries(settings).filter(([, v]) => v !== undefined))
      const commands: Command[] = [updateProjectSettings(changes)]
      if (name !== undefined) commands.push(renameProject(name))
      commit(doc, { labelKey: 'history.settings', recipe: (draft) => commands.forEach((c) => c.recipe(draft)) }, {})
      const { project } = doc.store.getState()
      return { name: project.name, settings: project.settings }
    },
  )

  tool(
    'update_layer',
    {
      description: 'Show, hide, lock, unlock, rename or recolour a layer.',
      input: {
        docId,
        layer: layerRef,
        visible: z.boolean().optional(),
        locked: z.boolean().optional(),
        name: z.string().min(1).optional(),
        color: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .optional(),
      },
      write: true,
    },
    ({ docId, layer: ref, ...changes }) => {
      const doc = sessions.get(docId)
      const layer = layerOf(doc.store.getState().project, ref)
      const defined = Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined))
      commit(doc, updateLayer(layer.id, defined), {})
      const { id, name, kind, visible, locked, color } = layerOf(doc.store.getState().project, layer.id)
      return { layer: { id, name, kind, visible, locked, color } }
    },
  )
}
