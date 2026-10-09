import { describe, expect, it } from 'vitest'
import { acceptanceProject } from '../document/fixtures'
import { createProject } from '../document/factory'
import { fileNameFor, parseProjectFile, serializeProject } from './files'
import { isDirty } from './file-session'

describe('project files', () => {
  it('round-trips a project through its JSON file format', () => {
    const project = acceptanceProject()
    expect(parseProjectFile(serializeProject(project))).toEqual(project)
  })

  it('reports non-JSON and non-project files with error keys', () => {
    expect(() => parseProjectFile('not json')).toThrow('errors:file.notJson')
    expect(() => parseProjectFile('{"hello": 1}')).toThrow('errors:file.notAProject')
    expect(() => parseProjectFile('{"schemaVersion": 1}')).toThrow('errors:file.notAProject')
  })

  it('derives a safe file name from the project name', () => {
    expect(fileNameFor({ ...createProject(), name: 'Card wallet / v2' })).toBe('Card wallet - v2.json')
    expect(fileNameFor({ ...createProject(), name: '  ' })).toBe('pattern.json')
  })
})

describe('isDirty', () => {
  it('treats an untouched new project as clean, and any change after saving as dirty', () => {
    const empty = createProject()
    expect(isDirty(empty, null)).toBe(false)
    const drawn = acceptanceProject()
    expect(isDirty(drawn, null)).toBe(true)
    expect(isDirty(drawn, drawn)).toBe(false)
    expect(isDirty({ ...drawn, name: 'x' }, drawn)).toBe(true)
  })
})
