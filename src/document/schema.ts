import type { Project } from './model'

export const CURRENT_SCHEMA_VERSION = 1

type Migration = (doc: Record<string, unknown>) => Record<string, unknown>

/**
 * MIGRATIONS[n] upgrades a document from schemaVersion n to n + 1.
 * Add an entry here (never edit an old one) whenever the model changes shape.
 */
const MIGRATIONS: Record<number, Migration> = {}

export class SchemaError extends Error {}

export function migrateProject(input: unknown): Project {
  if (typeof input !== 'object' || input === null) throw new SchemaError('errors:file.notAProject')
  let doc = input as Record<string, unknown>
  let version = doc.schemaVersion
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new SchemaError('errors:file.notAProject')
  }
  if (version > CURRENT_SCHEMA_VERSION) throw new SchemaError('errors:file.newerVersion')
  while (version < CURRENT_SCHEMA_VERSION) {
    const migrate = MIGRATIONS[version]
    if (!migrate) throw new SchemaError('errors:file.noMigration')
    doc = { ...migrate(doc), schemaVersion: version + 1 }
    version += 1
  }
  // Shape check after migrating, since older versions may not have today's fields yet.
  if (!Array.isArray(doc.layers) || !Array.isArray(doc.pieces) || typeof doc.name !== 'string') {
    throw new SchemaError('errors:file.notAProject')
  }
  return doc as unknown as Project
}
