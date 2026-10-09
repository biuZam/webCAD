// Small form controls for the properties panel. Values are committed once (Enter or blur),
// so each edit is a single undo step; Esc reverts.

import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDocument } from '../document/store'
import { formatLength, parseAngle, parseLength, parseNumber } from '../lib/units'

export type NumberKind = 'length' | 'angle' | 'number'

/** Two values closer than this are the same (well below the 0.001 mm export precision). */
const EPSILON = 1e-9

interface NumberFieldProps {
  label: string
  /** mm for lengths, degrees for angles. null = mixed values across the selection. */
  value: number | null
  kind: NumberKind
  onCommit?: (value: number) => void
  /** Smallest accepted value (inclusive unless `exclusiveMin`). */
  min?: number
  exclusiveMin?: boolean
}

export function NumberField({ label, value, kind, onCommit, min, exclusiveMin }: NumberFieldProps) {
  const { t, i18n } = useTranslation()
  const unit = useDocument((s) => s.project.displayUnit)
  const id = useId()
  const [text, setText] = useState<string | null>(null)
  const [invalid, setInvalid] = useState(false)
  const skipCommit = useRef(false)
  const readOnly = !onCommit

  const format = (v: number) => {
    if (kind === 'length') return formatLength(v, unit, i18n.language, false)
    return new Intl.NumberFormat(i18n.language, { maximumFractionDigits: kind === 'angle' ? 2 : 4 }).format(v)
  }
  const parse = (s: string) =>
    kind === 'length' ? parseLength(s, unit) : kind === 'angle' ? parseAngle(s) : parseNumber(s)
  const acceptable = (v: number) => min === undefined || (exclusiveMin ? v > min : v >= min)

  const commit = () => {
    if (text === null) return
    const v = parse(text)
    setText(null)
    if (v === null || !acceptable(v)) {
      setInvalid(text.trim() !== '')
      return
    }
    setInvalid(false)
    if (value === null || Math.abs(v - value) > EPSILON) onCommit?.(v)
  }

  return (
    <div className="prop-row">
      <label htmlFor={id}>{label}</label>
      <span className="prop-value">
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          readOnly={readOnly}
          aria-invalid={invalid}
          placeholder={value === null ? t('properties.mixed') : undefined}
          value={text ?? (value === null ? '' : format(value))}
          onFocus={(e) => {
            if (readOnly) return
            setInvalid(false)
            setText(value === null ? '' : format(value))
            e.currentTarget.select()
          }}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            if (skipCommit.current) {
              skipCommit.current = false
              setText(null)
              return
            }
            commit()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') {
              skipCommit.current = true
              setInvalid(false)
              e.currentTarget.blur()
            }
          }}
        />
        <span className="prop-unit">{kind === 'length' ? unit : kind === 'angle' ? '°' : ''}</span>
      </span>
    </div>
  )
}

interface SelectFieldProps<V extends string> {
  label: string
  /** null = mixed. */
  value: V | null
  options: readonly { value: V; label: string }[]
  onChange: (value: V) => void
}

export function SelectField<V extends string>({ label, value, options, onChange }: SelectFieldProps<V>) {
  const { t } = useTranslation()
  const id = useId()
  return (
    <div className="prop-row">
      <label htmlFor={id}>{label}</label>
      <span className="prop-value">
        <select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value as V)}>
          {value === null && (
            <option value="" disabled>
              {t('properties.mixed')}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </span>
    </div>
  )
}

export function TextField({ label, value, onCommit }: { label: string; value: string; onCommit: (v: string) => void }) {
  const id = useId()
  const [text, setText] = useState<string | null>(null)
  const skipCommit = useRef(false)
  return (
    <div className="prop-row">
      <label htmlFor={id}>{label}</label>
      <span className="prop-value">
        <input
          id={id}
          value={text ?? value}
          onFocus={() => setText(value)}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            if (!skipCommit.current && text !== null && text !== value) onCommit(text)
            skipCommit.current = false
            setText(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') {
              skipCommit.current = true
              e.currentTarget.blur()
            }
          }}
        />
      </span>
    </div>
  )
}

export function ReadOnlyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="prop-row">
      <span>{label}</span>
      <span className="prop-value prop-readonly">{children}</span>
    </div>
  )
}
