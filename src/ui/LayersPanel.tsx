import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useUiStore } from '../canvas/ui-store'
import { updateLayer } from '../document/commands'
import { useDocument } from '../document/store'
import { useLayerName } from './layerName'

/**
 * Colour input that commits once, when the picker closes (native `change`), not on every drag
 * movement (React's onChange is the `input` event), so a colour change is one undo step.
 */
function ColorSwatch({ value, label, onCommit }: { value: string; label: string; onCommit: (color: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const input = ref.current!
    input.value = value
    const onChange = () => onCommit(input.value)
    input.addEventListener('change', onChange)
    return () => input.removeEventListener('change', onChange)
  }, [value, onCommit])
  return <input ref={ref} type="color" className="layer-swatch" defaultValue={value} aria-label={label} />
}

const LOCK_ICON = {
  locked: 'M6 9V7a4 4 0 0 1 8 0v2M5 9h10v8H5z',
  unlocked: 'M6 9V7a4 4 0 0 1 7.5-2M5 9h10v8H5z',
}

export function LayersPanel() {
  const { t } = useTranslation()
  const layers = useDocument((s) => s.project.layers)
  const dispatch = useDocument((s) => s.dispatch)
  const activeLayerId = useUiStore((s) => s.activeLayerId) ?? layers[0]?.id
  const setActiveLayer = useUiStore((s) => s.setActiveLayer)
  const layerName = useLayerName()

  return (
    <section className="panel">
      <h2 className="panel-title">{t('layers.title')}</h2>
      <ul className="layer-list">
        {layers.map((layer) => {
          const name = layerName(layer)
          return (
            <li key={layer.id} className="layer-row" data-active={layer.id === activeLayerId}>
              <input
                type="checkbox"
                checked={layer.visible}
                aria-label={t(layer.visible ? 'layers.hide' : 'layers.show', { name })}
                onChange={() => dispatch(updateLayer(layer.id, { visible: !layer.visible }))}
              />
              <ColorSwatch
                value={layer.color}
                label={t('layers.color', { name })}
                onCommit={(color) => dispatch(updateLayer(layer.id, { color }))}
              />
              <label className="layer-name">
                <input
                  type="radio"
                  name="active-layer"
                  className="visually-hidden"
                  checked={layer.id === activeLayerId}
                  aria-label={t('layers.active', { name })}
                  onChange={() => setActiveLayer(layer.id)}
                />
                <span>{name}</span>
              </label>
              <button
                className="layer-lock"
                aria-pressed={layer.locked}
                aria-label={t(layer.locked ? 'layers.unlock' : 'layers.lock', { name })}
                title={t(layer.locked ? 'layers.unlock' : 'layers.lock', { name })}
                onClick={() => dispatch(updateLayer(layer.id, { locked: !layer.locked }))}
              >
                <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
                  <path
                    d={layer.locked ? LOCK_ICON.locked : LOCK_ICON.unlocked}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
