import { describe, expect, it } from 'vitest'
import { createProject } from './factory'
import { CURRENT_SCHEMA_VERSION, migrateProject, SchemaError } from './schema'

describe('migrateProject', () => {
  it('accepts a current project', () => {
    const project = createProject()
    expect(migrateProject(JSON.parse(JSON.stringify(project)))).toEqual(project)
  })

  it('upgrades v1 files unchanged apart from the version', () => {
    const project = createProject()
    const v1 = { ...JSON.parse(JSON.stringify(project)), schemaVersion: 1 }
    expect(migrateProject(v1)).toEqual(project)
  })

  it('rejects non-projects and newer files', () => {
    expect(() => migrateProject(null)).toThrow(SchemaError)
    expect(() => migrateProject({ name: 'x' })).toThrow('errors:file.notAProject')
    expect(() => migrateProject({ schemaVersion: CURRENT_SCHEMA_VERSION + 1 })).toThrow('errors:file.newerVersion')
  })
})
