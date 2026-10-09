# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**LeatherDraft** — browser-only 2D CAD for leather patterns (mm-accurate, true-scale SVG/PDF export, en + zh-CN). Requirements: `PRD — Leather Pattern CAD (Web).md`. Design: `docs/ARCHITECTURE.md`. Work plan and progress: `docs/TASKS.md` (tick tasks off there as they land).

## Commands

pnpm, Node ≥ 20.19. React 19 + TypeScript 6 + Vite 8, Vitest, oxlint, Prettier.

```bash
pnpm dev                     # dev server; append ?fixture=acceptance to load the PRD acceptance drawing
pnpm build                   # tsc -b && vite build
pnpm typecheck               # tsc -b (also fails on any t() key missing from en)
pnpm lint                    # oxlint
pnpm format                  # prettier --write (no semicolons, single quotes, 120 cols)
pnpm test                    # vitest run
pnpm test src/export/svg.test.ts      # one file
pnpm test -t "rounds coordinates"     # tests matching a name
pnpm e2e                     # Playwright browser tests in e2e/ (starts its own dev server on :5199; first run: pnpm exec playwright install chromium-headless-shell)
# DOM/component tests: `// @vitest-environment happy-dom` at the top (+ `import '../test/canvas-stub'` if they touch geometry).
# Never add jsdom: Paper.js's Node build picks it up and then every geometry test fails (needs native `canvas`).
pnpm i18n:check [--strict]   # keys missing from non-en locales; --strict exits non-zero (check/verify/CI use --strict)
pnpm check                   # typecheck + lint + test + i18n:check (quick)
pnpm verify                  # everything CI runs: check + format:check + build + bundle:check
pnpm bundle:check            # after build: initial download must stay < 600 KB gzipped
```

The default npm registry is very slow from this machine; if installs stall, add `--registry=https://registry.npmmirror.com`.

## Architecture in brief

Layers, importing only downward: `app`/`ui`/`i18n` (React) → `canvas`/`tools`/`snapping` → `document`/`persistence` → `geometry`/`export`/`lib`. `geometry`, `export`, `document` and `lib` must not import React, stores or `canvas`, so they stay testable in Node.

- **The document is plain JSON in a Zustand store** (`src/document/store.ts`), not Paper.js items. Paper.js is the on-screen renderer (`src/canvas`) and, separately, a headless geometry kernel (`src/geometry/kernel.ts`, uses `paper/dist/paper-core`).
- **Every change is a `Command`** (`src/document/commands.ts`) applied via `dispatch` with Immer `produceWithPatches`; one command = one undo step. Recipes must mutate in place and not reassign arrays unconditionally, or no-op commands create empty undo steps. Tools draw previews in the canvas overlay and dispatch once on commit.
- **Derived entities** store their source id and are regenerated inside `dispatch`, in the same draft (`src/document/derived.ts`): stitch lines (`PathEntity.derived`) now; hole sets in T2.3. `HoleSetEntity.holes` is a cached output. Regeneration triggers on *geometry* changes of the source only, and an entity whose own geometry is edited alone gets detached.
- **The renderer diffs entities by reference** (`src/canvas/renderer.ts`); this relies on Immer structural sharing, so never clone untouched entities.
- **Millimetres and y-down everywhere**: store, kernel, Paper project space, SVG user units. `view.zoom` = CSS px per mm (`PX_PER_MM` = 100%). Display units only in `src/lib/units.ts`.
- **SVG export** (`src/export/svg.ts`) is hand-written from the model, not `paper.exportSVG`: `width/height` in mm + matching `viewBox`, one `<g inkscape:label>` per layer, coordinates rounded to 0.001 mm, curves as native `C` commands. PDF must be rendered from this SVG.
- **Hit-testing and snapping run on the model, not the on-screen Paper items**: `src/geometry/query.ts` (R-tree + cached kernel shapes keyed by entity object) and `src/snapping/engine.ts`. Selection is owned by `ToolSession`.
- **Tools are pure state machines** (`src/tools`): no React or Paper imports. They talk only through `ToolContext` (dispatch, `setPreview` with `PreviewShape` data, `setPrompt` with input fields). Test them through a real `ToolSession` + `createDocumentStore()`, as in `src/tools/tools.test.ts`.
- `paper` is aliased to `paper/dist/paper-core` in `vite.config.ts` (paperjs-offset imports the full build). Keep it: two Paper.js instances break `instanceof` checks between libraries.
- Offsets must stay within `OFFSET_TOLERANCE` (0.02 mm) of the requested distance; see `src/geometry/offset.ts` before changing offset code, and keep `quality: 'preview'` for live previews only.
- Paper.js types are the global `paper` namespace (`paper.Item`, `paper.View`); don't `import type paper`. `PaperScope#remove` exists at runtime but isn't typed.
- Model shape changes need a bump of `CURRENT_SCHEMA_VERSION` plus a new migration in `src/document/schema.ts`.
- Performance budget: 2,000 entities at < 16 ms/frame. Re-measure with `BENCH=1 pnpm test perf.bench` (Node) and `?fixture=perf` + `window.__leatherdraftDev` (dev only) in the browser. Hole sets are drawn on a raw canvas layer, not as Paper items. Keep it that way.
- Heavy or optional libraries (jsPDF, svg2pdf.js, Maker.js, clipper2, planegcs, CJK fonts) must be lazy-loaded; budget is 600 KB gzipped initial JS. planegcs is LGPL and must stay a separate WASM module. Maker.js is only reached through one adapter module.

## i18n

- All UI strings go in `src/locales/<lang>/{common,tools,export,errors}.json` with semantic keys (`tools.fillet.radius`); ICU syntax for plurals (`{count, plural, one {# hole} other {# holes}}`). Default namespace is `common`; other namespaces use `t('tools:…')`.
- `en` is bundled; other locales are lazy chunks (`setLanguage` in `src/i18n/index.ts`). Add new keys to `en` first, then `zh-CN` in the same change: `pnpm check` runs `i18n:check --strict`, and `src/i18n/locales.test.ts` fails if a translation's ICU placeholders differ from `en`.
- Number formatting via `Intl.NumberFormat`; unit symbols (mm, cm, in) stay Latin. No text in icons.
- PDF text: Helvetica unless something printed is outside Latin-1; then `exportPdf` loads `public/fonts/NotoSansSC-GB2312.ttf` through `loadCjkFont` (built by `scripts/build-cjk-font.py`; never import it into the bundle).
- Tool strings live in the `tools` namespace and are typed as `ParseKeys<'tools'>` (`I18nKey` in `src/tools/types.ts`); translate them with `useTranslation('tools')`. Namespace-prefixed keys like `'tools:line.name'` don't type-check with the default `t`.
- Default layer names equal their `kind` and are shown translated until the user renames them.
