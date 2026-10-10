// T5.2 Constraints in the Properties panel: the piece's constraints (those touching the selection, or all of
// them with nothing selected), editable dimensions, delete, and Solve for when the geometry has moved since.

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUiStore } from '../canvas/ui-store'
import { applySolution, removeConstraints, setConstraint } from '../document/commands'
import type { Constraint, Piece, PointRef } from '../document/model'
import { documentStore, useDocument } from '../document/store'
import { constraintEntities, constraintResidual, isSatisfied } from '../geometry/constraints'
import { solve, type SolveResult } from '../geometry/solver'
import { NumberField } from './fields'

/** What stays put when a dimension changes: the first point (distance) or the circle's centre (radius). */
function pinsFor(c: Constraint): PointRef[] {
  if (c.type === 'distance') return [c.a]
  if (c.type === 'radius') return [{ entityId: c.circle, index: 0 }]
  return []
}

export function ConstraintsSection() {
  const { t } = useTranslation()
  const selection = useUiStore((s) => s.selection)
  const project = useDocument((s) => s.project)
  const [error, setError] = useState<SolveResult | null>(null)

  const rows = project.pieces.flatMap((piece) =>
    (piece.constraints ?? [])
      .filter((c) => selection.length === 0 || constraintEntities(c).some((id) => selection.includes(id)))
      .map((c) => ({ piece, c })),
  )
  if (rows.length === 0) return null

  const run = async (
    piece: Piece,
    constraints: readonly Constraint[],
    pinned: PointRef[],
    apply: (s: SolveResult & { ok: true }) => void,
  ) => {
    const result = await solve({ piece, constraints, pinned }).catch((): SolveResult => ({
      ok: false,
      reason: 'failed',
    }))
    if (result.ok) {
      setError(null)
      apply(result)
    } else setError(result)
  }

  const setValue = (piece: Piece, c: Constraint & { value: number }, value: number) => {
    const changed = { ...c, value }
    void run(
      piece,
      (piece.constraints ?? []).map((x) => (x.id === c.id ? changed : x)),
      pinsFor(c),
      (r) => documentStore.getState().dispatch(setConstraint(piece.id, changed, r.entities)),
    )
  }
  const solveAll = (piece: Piece) =>
    void run(piece, piece.constraints ?? [], [], (r) =>
      documentStore.getState().dispatch(applySolution(piece.id, r.entities)),
    )

  const pieces = [...new Set(rows.map((r) => r.piece))]
  const stale = pieces.filter((p) => (p.constraints ?? []).some((c) => !isSatisfied(constraintResidual(p, c))))

  return (
    <div className="prop-group">
      <h3 className="panel-subtitle">{t('properties.constraints.title')}</h3>
      {rows.map(({ piece, c }) => {
        const residual = constraintResidual(piece, c)
        const label = t(`properties.constraints.${c.type}`)
        return (
          <div key={c.id} className="prop-row">
            {c.type === 'distance' || c.type === 'radius' ? (
              <NumberField
                label={label}
                kind="length"
                value={c.value}
                min={0}
                exclusiveMin
                onCommit={(v) => setValue(piece, c, v)}
              />
            ) : (
              <span>{label}</span>
            )}
            <span className="prop-value">
              {!isSatisfied(residual) && (
                <span
                  role="img"
                  title={
                    residual === null ? t('properties.constraints.broken') : t('properties.constraints.unsatisfied')
                  }
                  aria-label={
                    residual === null ? t('properties.constraints.broken') : t('properties.constraints.unsatisfied')
                  }
                >
                  ⚠
                </span>
              )}
              <button
                className="prop-button"
                title={t('properties.constraints.delete')}
                aria-label={t('properties.constraints.delete')}
                onClick={() => documentStore.getState().dispatch(removeConstraints([c.id]))}
              >
                ×
              </button>
            </span>
          </div>
        )
      })}
      {stale.length > 0 && (
        <div className="prop-row">
          <span />
          <span className="prop-value">
            <button className="prop-button" onClick={() => stale.forEach(solveAll)}>
              {t('properties.constraints.solve')}
            </button>
          </span>
        </div>
      )}
      {error && !error.ok && <p className="panel-hint">{t('properties.constraints.solveFailed')}</p>}
    </div>
  )
}
