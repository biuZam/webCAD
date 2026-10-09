// T0.12 Typed numeric input: the active tool's prompt plus its fields (length, angle, factor, and toggles).
// Typing a number anywhere outside a text field jumps into the first field, as in desktop CAD.

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toolSession } from '../canvas/tool-session'
import { useUiStore } from '../canvas/ui-store'
import { useDocument } from '../document/store'
import { formatLength, parseAngle, parseLength, parseNumber, type LengthUnit } from '../lib/units'
import type { InputField, InputValues } from '../tools/types'

const STARTS_NUMBER = /^[0-9.,-]$/

function parseValues(fields: InputField[], texts: Record<string, string>, unit: LengthUnit) {
  const values: InputValues = {}
  const invalid = new Set<string>()
  for (const f of fields) {
    const text = texts[f.key]?.trim()
    if (f.kind === 'toggle' || f.kind === 'choice' || !text) continue
    const v = f.kind === 'length' ? parseLength(text, unit) : f.kind === 'angle' ? parseAngle(text) : parseNumber(text)
    if (v === null) invalid.add(f.key)
    else values[f.key] = v
  }
  return { values, invalid }
}

export function InputBar() {
  const prompt = useUiStore((s) => s.prompt)
  // Remount the fields when the tool moves to another step, which clears anything typed.
  const step = `${prompt.key}|${prompt.fields.map((f) => f.key).join(',')}`
  return <InputFields key={step} />
}

function InputFields() {
  const { t, i18n } = useTranslation()
  const { t: tTools } = useTranslation('tools')
  const prompt = useUiStore((s) => s.prompt)
  const unit = useDocument((s) => s.project.displayUnit)
  const [texts, setTexts] = useState<Record<string, string>>({})
  const firstRef = useRef<HTMLInputElement>(null)
  const { fields } = prompt
  const textFields = fields.filter((f) => f.kind !== 'toggle' && f.kind !== 'choice' && !f.readOnly)
  const readouts = fields.filter((f) => f.readOnly)
  const { values, invalid } = parseValues(fields, texts, unit)

  const update = (next: Record<string, string>) => {
    setTexts(next)
    toolSession.input(parseValues(fields, next, unit).values, false)
  }

  useEffect(() => {
    const first = fields.find((f) => f.kind !== 'toggle' && f.kind !== 'choice' && !f.readOnly)
    if (!first) return
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest('input, select, textarea, [contenteditable]')) return
      if (e.metaKey || e.ctrlKey || e.altKey || !STARTS_NUMBER.test(e.key)) return
      e.preventDefault()
      firstRef.current?.focus()
      setTexts({ [first.key]: e.key })
      toolSession.input(parseValues(fields, { [first.key]: e.key }, unit).values, false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fields, unit])

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (invalid.size > 0) return
      if (Object.keys(values).length === 0) toolSession.finish()
      else toolSession.input(values, true)
      setTexts({})
      e.currentTarget.blur()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      if (Object.values(texts).some((s) => s.trim())) {
        update({})
      } else {
        e.currentTarget.blur()
        toolSession.cancel()
      }
    }
  }

  const placeholder = (f: InputField) => {
    if (f.live === undefined) return ''
    if (f.kind === 'length') return formatLength(f.live, unit, i18n.language, false)
    const n = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: f.kind === 'factor' ? 4 : 2 }).format(
      f.live,
    )
    return f.kind === 'angle' ? `${n}°` : n
  }

  const suffix = (f: InputField) => (f.kind === 'length' ? unit : f.kind === 'angle' ? '°' : '×')

  return (
    <div className="input-bar" role="group" aria-label={t('input.label')}>
      {/* Announced as each tool step changes, so screen-reader users hear what the tool expects next. */}
      <span className="input-prompt" aria-live="polite">
        {tTools(prompt.key, prompt.params ?? {})}
      </span>
      {textFields.map((f, i) => (
        <label key={f.key} className="input-field">
          <span>{tTools(f.labelKey)}</span>
          <input
            ref={i === 0 ? firstRef : undefined}
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            value={texts[f.key] ?? ''}
            placeholder={placeholder(f)}
            aria-invalid={invalid.has(f.key)}
            title={t('input.hint')}
            onChange={(e) => update({ ...texts, [f.key]: e.target.value })}
            onKeyDown={onKeyDown}
          />
          <span className="input-unit">{suffix(f)}</span>
        </label>
      ))}
      {readouts.map((f) => (
        <span key={f.key} className="input-field">
          <span>{tTools(f.labelKey)}</span>
          <output className="input-readout">{f.live === undefined ? '—' : placeholder(f)}</output>
          <span className="input-unit">{suffix(f)}</span>
        </span>
      ))}
      {fields
        .filter((f) => f.kind === 'choice')
        .map((f) => (
          <label key={f.key} className="input-field">
            <span>{tTools(f.labelKey)}</span>
            <select
              value={f.live ?? 0}
              onChange={(e) => toolSession.input({ ...values, [f.key]: Number(e.target.value) }, false)}
            >
              {(f.options ?? []).map((label, i) => (
                <option key={i} value={i}>
                  {typeof label === 'string' ? tTools(label) : label.text}
                </option>
              ))}
            </select>
          </label>
        ))}
      {fields
        .filter((f) => f.kind === 'toggle')
        .map((f) => (
          <label key={f.key} className="input-toggle">
            <input
              type="checkbox"
              checked={f.live === 1}
              onChange={(e) => toolSession.input({ ...values, [f.key]: e.target.checked ? 1 : 0 }, false)}
            />
            {tTools(f.labelKey)}
          </label>
        ))}
    </div>
  )
}
