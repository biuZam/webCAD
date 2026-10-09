// T1.5 Properties panel: editable numeric geometry and style for the selection.
// Every edit is a command (one undo step); geometry edits reuse the transform command where possible.

import { useTranslation } from 'react-i18next'
import { useUiStore } from '../canvas/ui-store'
import {
  detachDerived,
  findEntity,
  transformEntities,
  updateEntities,
  updateEntity,
  updateProjectSettings,
  type Command,
  type CommonEntityFields,
} from '../document/commands'
import type {
  CentreLineEntity,
  CircleEntity,
  Entity,
  HoleSetEntity,
  LineStyle,
  PathEntity,
  ProjectSettings,
  TextEntity,
} from '../document/model'
import { holeEdges } from '../document/derived'
import { documentStore, useDocument } from '../document/store'
import { emptyBounds, entityBounds } from '../geometry/bounds'
import { pathLength } from '../geometry/kernel'
import { scaleXYAbout, supportsNonUniformScale, translation } from '../geometry/transform'
import { distance } from '../lib/vec2'
import { NumberField, ReadOnlyRow, SelectField, TextField } from './fields'
import { useLayerName } from './layerName'

const LINE_STYLES: readonly LineStyle[] = ['solid', 'dashed', 'dotted', 'dashDot']

const dispatch = (command: Command) => documentStore.getState().dispatch(command)

/** The shared value of `pick` across entities, or null if they differ. */
/**
 * Model rotations are clockwise (y-down); the UI shows angles counter-clockwise, like every typed angle.
 * The conversion is its own inverse.
 */
const ccw = (deg: number) => (deg === 0 ? 0 : -deg)

function common<T>(entities: readonly Entity[], pick: (e: Entity) => T): T | null {
  const first = pick(entities[0])
  return entities.every((e) => pick(e) === first) ? first : null
}

export function PropertiesPanel() {
  const { t } = useTranslation()
  const selection = useUiStore((s) => s.selection)
  const project = useDocument((s) => s.project)
  const layerName = useLayerName()
  const entities = selection.map((id) => findEntity(project, id)?.entity).filter((e): e is Entity => !!e)

  if (entities.length === 0) {
    return (
      <section className="panel">
        <h2 className="panel-title">{t('properties.title')}</h2>
        <p className="panel-hint">{t('properties.empty')}</p>
        <ProjectSettingsFields />
      </section>
    )
  }

  const ids = entities.map((e) => e.id)
  const setCommon = (changes: Partial<CommonEntityFields>) => dispatch(updateEntities(ids, changes))
  const b = emptyBounds()
  for (const e of entities) entityBounds(e, b)
  const width = b.maxX - b.minX
  const height = b.maxY - b.minY
  const move = (dx: number, dy: number) =>
    dispatch(transformEntities(ids, translation(dx, dy), { copy: false, labelKey: 'history.move' }).command)
  // W/H scale about the top-left corner. Only for point-based entities: circles and text would distort.
  const canResize = entities.every(supportsNonUniformScale)
  const resize = (sx: number, sy: number) =>
    dispatch(
      transformEntities(ids, scaleXYAbout([b.minX, b.minY], sx, sy), { copy: false, labelKey: 'history.scale' })
        .command,
    )

  const single = entities.length === 1 ? entities[0] : null

  return (
    <section className="panel">
      <h2 className="panel-title">{t('properties.title')}</h2>
      <p className="panel-subtitle">
        {single?.type === 'path' && single.derived
          ? t('properties.type.stitchLine')
          : single
            ? t(`properties.type.${single.type}`)
            : t('properties.count', { count: entities.length })}
      </p>

      <div className="prop-group">
        <SelectField
          label={t('properties.layer')}
          value={common(entities, (e) => e.layerId)}
          options={project.layers.map((l) => ({ value: l.id, label: layerName(l) }))}
          onChange={(layerId) => setCommon({ layerId })}
        />
        <SelectField
          label={t('properties.lineStyle')}
          value={common(entities, (e) => e.lineStyle)}
          options={LINE_STYLES.map((s) => ({ value: s, label: t(`lineStyle.${s}`) }))}
          onChange={(lineStyle) => setCommon({ lineStyle })}
        />
        <NumberField
          label={t('properties.strokeWidth')}
          kind="length"
          value={common(entities, (e) => e.strokeWidth)}
          min={0}
          exclusiveMin
          onCommit={(strokeWidth) => setCommon({ strokeWidth })}
        />
      </div>

      <div className="prop-group">
        <NumberField label="X" kind="length" value={b.minX} onCommit={(x) => move(x - b.minX, 0)} />
        <NumberField label="Y" kind="length" value={b.minY} onCommit={(y) => move(0, y - b.minY)} />
        <NumberField
          label={t('properties.width')}
          kind="length"
          value={width}
          min={0}
          exclusiveMin
          onCommit={canResize && width > 0 ? (w) => resize(w / width, 1) : undefined}
        />
        <NumberField
          label={t('properties.height')}
          kind="length"
          value={height}
          min={0}
          exclusiveMin
          onCommit={canResize && height > 0 ? (h) => resize(1, h / height) : undefined}
        />
      </div>

      {single && <TypeFields entity={single} />}
    </section>
  )
}

/** A linked stitch line: what it follows, its margin (side kept), and Detach. */
function DerivedFields({ entity }: { entity: PathEntity }) {
  const { t } = useTranslation()
  const project = useDocument((s) => s.project)
  const link = entity.derived!
  const source = findEntity(project, link.sourceId)?.entity
  const side = link.margin < 0 ? -1 : 1
  return (
    <>
      <ReadOnlyRow label={t('properties.linkedTo')}>
        {source ? t(`properties.type.${source.type}`) : '—'} ({t(side < 0 ? 'properties.inside' : 'properties.outside')}
        )
      </ReadOnlyRow>
      <NumberField
        label={t('properties.margin')}
        kind="length"
        value={Math.abs(link.margin)}
        min={0}
        exclusiveMin
        onCommit={(m) => dispatch(updateEntity<PathEntity>(entity.id, { derived: { ...link, margin: side * m } }))}
      />
      <div className="prop-row">
        <span />
        <span className="prop-value">
          <button className="prop-button" onClick={() => dispatch(detachDerived(entity.id))}>
            {t('properties.detach')}
          </button>
        </span>
      </div>
    </>
  )
}

/** Stitch holes: layout settings (changing pitch or corners re-lays the holes), link and Detach. */
function HoleSetFields({ entity }: { entity: HoleSetEntity }) {
  const { t } = useTranslation()
  const project = useDocument((s) => s.project)
  const set = (changes: Partial<HoleSetEntity>) => dispatch(updateEntity<HoleSetEntity>(entity.id, changes))
  const source = entity.sourceEntityId ? findEntity(project, entity.sourceEntityId)?.entity : undefined
  const edges = holeEdges(project, entity)
  return (
    <div className="prop-group">
      {source && (
        <ReadOnlyRow label={t('properties.linkedTo')}>
          {source.type === 'path' && source.derived
            ? t('properties.type.stitchLine')
            : t(`properties.type.${source.type}`)}
        </ReadOnlyRow>
      )}
      <NumberField
        label={t('properties.pitch')}
        kind="length"
        value={entity.pitch}
        min={0}
        exclusiveMin
        onCommit={(pitch) => set({ pitch })}
      />
      <NumberField
        label={t('properties.holeSize')}
        kind="length"
        value={entity.holeSize}
        min={0}
        exclusiveMin
        onCommit={(holeSize) => set({ holeSize })}
      />
      <SelectField
        label={t('properties.holeShape')}
        value={entity.holeShape}
        options={[
          { value: 'round', label: t('properties.round') },
          { value: 'slit', label: t('properties.slit') },
        ]}
        onChange={(holeShape) => set({ holeShape })}
      />
      {entity.holeShape === 'slit' && (
        <NumberField
          label={t('properties.slitAngle')}
          kind="angle"
          value={entity.slitAngle}
          onCommit={(slitAngle) => set({ slitAngle })}
        />
      )}
      <SelectField
        label={t('properties.cornerAware')}
        value={entity.cornerMode}
        options={[
          { value: 'cornerAware', label: t('properties.yes') },
          { value: 'fixed', label: t('properties.no') },
        ]}
        onChange={(cornerMode) => set({ cornerMode })}
      />
      <ReadOnlyRow label={t('properties.holes')}>{entity.holes.length}</ReadOnlyRow>
      {edges.length > 1 && (
        <ReadOnlyRow label={t('properties.holesPerEdge')}>{edges.map((e) => e.length).join(' · ')}</ReadOnlyRow>
      )}
      {source && (
        <div className="prop-row">
          <span />
          <span className="prop-value">
            <button className="prop-button" onClick={() => set({ sourceEntityId: null })}>
              {t('properties.detach')}
            </button>
          </span>
        </div>
      )}
    </div>
  )
}

/** With nothing selected: project-wide defaults for new stitch lines and holes (T2.6). */
function ProjectSettingsFields() {
  const { t } = useTranslation()
  const settings = useDocument((s) => s.project.settings)
  const set = (changes: Partial<ProjectSettings>) => dispatch(updateProjectSettings(changes))
  return (
    <div className="prop-group">
      <p className="panel-subtitle">{t('properties.project')}</p>
      <p className="panel-hint">{t('properties.projectHint')}</p>
      <NumberField
        label={t('properties.stitchMargin')}
        kind="length"
        value={settings.stitchMargin}
        min={0}
        exclusiveMin
        onCommit={(stitchMargin) => set({ stitchMargin })}
      />
      <NumberField
        label={t('properties.defaultPitch')}
        kind="length"
        value={settings.pitch}
        min={0}
        exclusiveMin
        onCommit={(pitch) => set({ pitch })}
      />
      <NumberField
        label={t('properties.defaultHoleSize')}
        kind="length"
        value={settings.holeSize}
        min={0}
        exclusiveMin
        onCommit={(holeSize) => set({ holeSize })}
      />
    </div>
  )
}

/** Fields specific to one entity type. */
function TypeFields({ entity }: { entity: Entity }) {
  const { t } = useTranslation()
  switch (entity.type) {
    case 'path':
      return (
        <div className="prop-group">
          {entity.derived && <DerivedFields entity={entity} />}
          <NumberField label={t('properties.length')} kind="length" value={pathLength(entity)} />
          <ReadOnlyRow label={t('properties.points')}>{entity.segments.length}</ReadOnlyRow>
          <ReadOnlyRow label={t('properties.closed')}>
            {t(entity.closed ? 'properties.yes' : 'properties.no')}
          </ReadOnlyRow>
        </div>
      )
    case 'circle': {
      const set = (changes: Partial<CircleEntity>) => dispatch(updateEntity<CircleEntity>(entity.id, changes))
      const [cx, cy] = entity.center
      return (
        <div className="prop-group">
          <NumberField
            label={t('properties.centreX')}
            kind="length"
            value={cx}
            onCommit={(x) => set({ center: [x, cy] })}
          />
          <NumberField
            label={t('properties.centreY')}
            kind="length"
            value={cy}
            onCommit={(y) => set({ center: [cx, y] })}
          />
          {entity.rx === entity.ry ? (
            <>
              <NumberField
                label={t('properties.radius')}
                kind="length"
                value={entity.rx}
                min={0}
                exclusiveMin
                onCommit={(r) => set({ rx: r, ry: r })}
              />
              <NumberField
                label={t('properties.diameter')}
                kind="length"
                value={entity.rx * 2}
                min={0}
                exclusiveMin
                onCommit={(d) => set({ rx: d / 2, ry: d / 2 })}
              />
            </>
          ) : (
            <>
              <NumberField
                label={t('properties.radiusX')}
                kind="length"
                value={entity.rx}
                min={0}
                exclusiveMin
                onCommit={(rx) => set({ rx })}
              />
              <NumberField
                label={t('properties.radiusY')}
                kind="length"
                value={entity.ry}
                min={0}
                exclusiveMin
                onCommit={(ry) => set({ ry })}
              />
              <NumberField
                label={t('properties.rotation')}
                kind="angle"
                value={ccw(entity.rotation)}
                onCommit={(rotation) => set({ rotation: ccw(rotation) })}
              />
            </>
          )}
        </div>
      )
    }
    case 'centreLine': {
      const set = (changes: Partial<CentreLineEntity>) => dispatch(updateEntity<CentreLineEntity>(entity.id, changes))
      const { from, to } = entity
      return (
        <div className="prop-group">
          <NumberField
            label={t('properties.fromX')}
            kind="length"
            value={from[0]}
            onCommit={(x) => set({ from: [x, from[1]] })}
          />
          <NumberField
            label={t('properties.fromY')}
            kind="length"
            value={from[1]}
            onCommit={(y) => set({ from: [from[0], y] })}
          />
          <NumberField
            label={t('properties.toX')}
            kind="length"
            value={to[0]}
            onCommit={(x) => set({ to: [x, to[1]] })}
          />
          <NumberField
            label={t('properties.toY')}
            kind="length"
            value={to[1]}
            onCommit={(y) => set({ to: [to[0], y] })}
          />
          <NumberField label={t('properties.length')} kind="length" value={distance(from, to)} />
        </div>
      )
    }
    case 'holeSet':
      return <HoleSetFields entity={entity} />
    case 'text': {
      const set = (changes: Partial<TextEntity>) => dispatch(updateEntity<TextEntity>(entity.id, changes))
      return (
        <div className="prop-group">
          <TextField label={t('properties.text')} value={entity.text} onCommit={(text) => set({ text })} />
          <NumberField
            label={t('properties.textSize')}
            kind="length"
            value={entity.size}
            min={0}
            exclusiveMin
            onCommit={(size) => set({ size })}
          />
          <NumberField
            label={t('properties.rotation')}
            kind="angle"
            value={ccw(entity.rotation)}
            onCommit={(rotation) => set({ rotation: ccw(rotation) })}
          />
        </div>
      )
    }
  }
}
