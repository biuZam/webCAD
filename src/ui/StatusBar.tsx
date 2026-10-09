import { useTranslation } from 'react-i18next'
import { useUiStore } from '../canvas/ui-store'
import { PX_PER_MM } from '../canvas/viewport'
import { setDisplayUnit } from '../document/commands'
import { useDocument } from '../document/store'
import { formatLength, type LengthUnit } from '../lib/units'
import { SNAP_KINDS } from '../snapping/engine'
import { gridSpacing } from '../snapping/grid'

export function StatusBar() {
  const { t, i18n } = useTranslation()
  const cursor = useUiStore((s) => s.cursor)
  const zoom = useUiStore((s) => s.zoom)
  const snaps = useUiStore((s) => s.snaps)
  const toggleSnap = useUiStore((s) => s.toggleSnap)
  const selected = useUiStore((s) => s.selection.length)
  const unit = useDocument((s) => s.project.displayUnit)
  const dispatch = useDocument((s) => s.dispatch)
  const count = useDocument((s) => s.project.pieces.reduce((n, p) => n + p.entities.length, 0))
  const percent = new Intl.NumberFormat(i18n.language, { style: 'percent', maximumFractionDigits: 0 })
  const fmt = (mm: number) => formatLength(mm, unit, i18n.language)

  return (
    <footer className="status-bar">
      <span className="status-cursor">
        {cursor ? t('status.cursor', { x: fmt(cursor[0]), y: fmt(cursor[1]) }) : ' '}
      </span>
      <span>{t('status.zoom', { percent: percent.format(zoom / PX_PER_MM) })}</span>
      <span>{t('status.grid', { spacing: fmt(gridSpacing(zoom).minor) })}</span>
      <label className="status-toggle">
        <span>{t('status.unit')}</span>
        <select value={unit} onChange={(e) => dispatch(setDisplayUnit(e.target.value as LengthUnit))}>
          {(['mm', 'cm', 'in'] as const).map((u) => (
            <option key={u} value={u}>
              {t(`units.${u}`)}
            </option>
          ))}
        </select>
      </label>
      <details className="snap-menu">
        <summary>{t('snap.title', { count: snaps.size })}</summary>
        <fieldset className="snap-menu-list">
          <legend className="visually-hidden">{t('snap.legend')}</legend>
          {SNAP_KINDS.map((kind) => (
            <label key={kind} className="status-toggle">
              <input type="checkbox" checked={snaps.has(kind)} onChange={() => toggleSnap(kind)} />
              {t(`snap.kind.${kind}`)}
            </label>
          ))}
        </fieldset>
      </details>
      <span className="status-count">
        {selected > 0 && <>{t('status.selected', { count: selected })} · </>}
        {t('status.entities', { count })}
      </span>
    </footer>
  )
}
