// T1.20 performance probe on 2,000 entities. Opt-in: `BENCH=1 pnpm test perf.bench`.
// Budgets: per-pointer-move work (snap, hit-test) well under 16 ms; a command (dispatch incl. derivation)
// should feel instant (< 50 ms) unless it really regenerates a lot.
import { expect, it } from 'vitest'
import { transformEntities, updateEntities } from './document/commands'
import { perfProject } from './document/fixtures'
import { createDocumentStore } from './document/store'
import { exportSvg } from './export/svg'
import { translation } from './geometry/transform'
import { snap, SNAP_KINDS } from './snapping/engine'
import { hitTest } from './tools/select'

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {}

function time(f: () => unknown, runs = 10) {
  f()
  const samples: number[] = []
  for (let i = 0; i < runs; i++) {
    const t = performance.now()
    f()
    samples.push(performance.now() - t)
  }
  samples.sort((a, b) => a - b)
  return { median: +samples[runs >> 1].toFixed(2), max: +samples[runs - 1].toFixed(2) }
}

it.skipIf(!env.BENCH)('2,000 entities', () => {
  const t0 = performance.now()
  const project = perfProject(400)
  const buildMs = +(performance.now() - t0).toFixed(0)
  const store = createDocumentStore(project)
  const entities = project.pieces[0].entities
  const outline = entities[0].id
  const circle = entities[3].id
  let dx = 1

  const report = {
    entities: entities.length,
    holes: entities.reduce((n, e) => n + (e.type === 'holeSet' ? e.holes.length : 0), 0),
    buildFixtureMs: buildMs,
    // A style-only command: pure dispatch + derivation-scan overhead, nothing to regenerate.
    dispatchStyleOnly: time(() =>
      store.getState().dispatch(updateEntities([circle], { strokeWidth: (dx = -dx) > 0 ? 0.3 : 0.2 })),
    ),
    // Moving one outline regenerates its stitch line (precise offset) and its holes.
    dispatchMoveOutline: time(() =>
      store
        .getState()
        .dispatch(
          transformEntities([outline], translation((dx = -dx), 0), { copy: false, labelKey: 'history.move' }).command,
        ),
    ),
    // Moving a circle: no dependants, so this is dispatch + scan + index invalidation only.
    dispatchMoveCircle: time(() =>
      store
        .getState()
        .dispatch(
          transformEntities([circle], translation((dx = -dx), 0), { copy: false, labelKey: 'history.move' }).command,
        ),
    ),
    // Per pointer move, on a project that just changed (first query rebuilds the R-tree).
    snapAfterChange: time(() => {
      store.getState().dispatch(updateEntities([circle], { strokeWidth: (dx = -dx) > 0 ? 0.3 : 0.2 }))
      return snap(store.getState().project, [200, 120], { enabled: new Set(SNAP_KINDS), tolerance: 2, gridStep: 1 })
    }),
    snapAllKinds: time(() =>
      snap(store.getState().project, [200, 120], {
        enabled: new Set(SNAP_KINDS),
        tolerance: 2,
        gridStep: 1,
        from: [150, 90],
      }),
    ),
    hitTest: time(() => hitTest(store.getState().project, [200, 120], 1)),
    exportSvg: time(() => exportSvg(store.getState().project), 3),
  }
  expect(report).toEqual({})
})
