# LeatherDraft — Task breakdown

IDs in brackets (D1, M3, L2…) refer to the PRD requirement tables. `[x]` = done. Each task should land with tests where it touches `src/document`, `src/geometry`, `src/export` or `src/snapping`.

## M0 — Spike (2 weeks): canvas, true-scale SVG, i18n scaffold

- [x] T0.1 Vite + React + TS + pnpm scaffold; oxlint, Prettier, Vitest; scripts `dev/build/typecheck/lint/test/i18n:check`
- [x] T0.2 Folder layout and layering rule per `docs/ARCHITECTURE.md`
- [x] T0.3 Units module: mm/cm/in conversion, locale-aware formatting, input parsing (`12.5`, `3cm`, `1.5in`)
- [x] T0.4 Document model types, `createProject()` with default layers (cut, stitch, reference, notes), `schemaVersion` + migration runner
- [x] T0.5 Document store: `dispatch(command)` with Immer patches, undo/redo, history labels
- [x] T0.6 i18n: i18next + react-i18next + ICU, `en` namespaces, typed keys (tsc fails on missing `en` key), `zh-CN` stub, locale check script
- [x] T0.7 SVG exporter v0: mm-sized root, layer groups with `inkscape:label`, dash styles, paths/circles, 0.001 mm rounding; golden test
- [x] T0.8 Canvas shell: Paper.js view in mm, pan (middle-drag / space-drag) and zoom-to-cursor (wheel), reconciler from store, live cursor coordinates
- [x] T0.9 mm grid (adaptive minor/major spacing by zoom) and rulers
- [x] T0.10 Tool framework: `Tool` interface, tool manager (pointer → mm → tool), overlay API, Esc/Enter handling, toolbar wiring
- [x] T0.11 Tools: line/polyline [D1], rectangle corner-corner + centre [D4], circle centre+radius [D5]
- [x] T0.12 Typed numeric input bar (length/angle/radius) consumed by tools
- [x] T0.13a "Export SVG" action + download (verified in-browser: drawn geometry exports at exact mm)
- [ ] T0.13b Manual check of an exported file in Inkscape (100 mm document size) — needs a human

## M1 — Core drafting

Canvas & editing
- [x] T1.1 Selection tool: click, shift-click, window/crossing box, hover highlight, Delete, Select All; hit-testing via `src/geometry/query.ts`
- [x] T1.2 Node editing for paths: drag anchors/handles, smooth/corner toggle [D3] — in the Select tool when one path is selected; anchors snap (excluding the path itself), handles don't; smooth anchors stay smooth; double-click toggles; Esc reverts a drag; stitch lines excluded
- [x] T1.2b Add/delete anchors on a path — double-click the selected path's outline inserts a point (de Casteljau split, shape unchanged); click a point to pick it, Delete removes it (a path too short to lose one is deleted whole); Esc unpicks first; the status prompt switches to point-editing hints
- [x] T1.3 Snapping engine with `rbush` index: endpoint, midpoint [D7], centre, intersection, perpendicular, tangent, nearest, grid; per-type toggles; snap marker overlay
- [x] T1.3b Quadrant snap (circles and rotated ellipses); polar tracking (45° rays from the previous point, on by default); object tracking (horizontals/verticals through the last 4 snapped points and their crossings, opt-in in the Snaps menu). Tracking ranks below object snaps and above the grid; guides drawn dashed
- [x] T1.4 Layers panel: visibility, lock, colour, active layer [P0] (colour commits once when the picker closes; drawing on a locked/hidden layer explains itself)
- [x] T1.5 Properties panel: editable numeric geometry and line style [D2] (common fields across a mixed selection; bounds X/Y/W/H; per-type fields; hole-set fields read-only until T2.3)
- [x] T1.6 Measure tool: distance, angle, path length — tool D; read-only readouts in the input bar (display unit)
- [x] T1.7 Autosave to IndexedDB + restore; open/save `.json` (File System Access + fallback); New; unsaved marker in title; editable project name
- [ ] T1.7b Manual check of Open/Save/Save As through the native file pickers (Chrome) and the download/input fallback (Safari, Firefox) — needs a human
- [x] T1.8 Display-unit switch (mm/cm/in) — in the status bar; panel, input bar, status and ruler labels follow it (grid stays on mm)

Drawing tools
- [x] T1.9 Cubic Bézier pen tool, 3-point arc [D3] — Pen (P): click = corner, drag = smooth; Arc (A): start, end, through; arcs share `src/geometry/arcs.ts` with fillet
- [x] T1.10 3-point circle, ellipse by axes [D5] — modes of the Circle tool
- [x] T1.11 Centre line through bbox centre or two points; usable as mirror axis [D6] — tool X, on the Reference layer
- [x] T1.12 Perpendicular line from point / at distance [D8] — tool T: pick an edge; foot follows the cursor or typed "along"/"length"

Modify tools (all copy-or-move where applicable)
- [x] T1.13 Move / copy / scale with typed deltas [M7] (scale is uniform: by factor or reference → target)
- [x] T1.14 Rotate around pick point [M5]
- [x] T1.15 Mirror across centre line or two points [M4]; flip H/V in place [M6]
- [x] T1.21 Drag-to-move in the Select tool: press on a selected entity and drag (one `history.move` step via `transformEntities`); the cursor snaps to other geometry (moving entities excluded), Shift = 15° steps, Alt = move a copy, Esc abandons. Dragging an unselected entity still box-selects. The grab point itself isn't snapped — use Move (M) for point-to-point
- [x] T1.22 Render on the first frame: i18n initialises synchronously with bundled `en`. (The "ignored first interaction" seen in browser tests turned out to be the automation dropping input sent right after a navigation, not the app: the page loads in ~80 ms.)
- [x] T1.16 Offset open/closed paths, round/miter/bevel joins [M3]: paperjs-offset + adaptive subdivision, checked to ≤ 0.02 mm; Clipper (clipper-lib) fallback for closed shapes; exact circles/centre lines. Tool: E
- [x] T1.16b Speed up precise offsets: bounding-box-pruned nearest search (check 13.7 → 1 ms), 'adaptive' instead of 'auto' (we run the analysis ourselves), and jump to the predicted subdivision (error ∝ 1/n²). 24-curve outline 308 → 47 ms; rounded rect 23 → 10 ms. `BENCH=1 pnpm test offset.bench` to re-measure
- [x] T1.17 Fillet [M1] — native tangent-arc fit (`src/geometry/corners.ts`), one cubic per ≤ 90° (≤ 0.001 mm off a true arc); tool F, Shift = all corners; "too large" prompt gives the max radius. No Maker.js needed
- [x] T1.18 Chamfer by two distances or distance+angle [M2] — tool B

Quality
- [x] T1.19 Playwright setup + first E2E — `pnpm e2e` (`e2e/`, headless Chromium, own dev server on :5199; CI job `e2e`): typed rectangle → SVG export is exactly 100×60 mm at the typed corners; mouse-drawn rectangle + undo; drag-to-move (mm↔px via the dev view hook)
- [x] T1.20 Perf harness: 2,000 entities (400 pieces: outline, linked stitch line, 44 linked slit holes, circle, centre line; 17,600 holes), `?fixture=perf`, `BENCH=1 pnpm test perf.bench`. Results after fixes:
  - full redraw, everything on screen: Paper 10.1 ms + grid/rulers/holes 1.9 ms (was ~49 ms); zoomed in 4.5 ms
  - style-only command 1.7 ms (was 5.4); move an outline + regenerate its line and holes 10.7 ms (was 13.9)
  - first snap after an edit 4.9 ms (was 12.1); steady-state snap 0.07 ms, hit-test 0.03 ms; SVG export 14 ms
- [ ] T1.20b Re-measure in a visible tab and a production build (the automation tab is hidden, so frame-loop timings were taken by forcing synchronous paints), and on a mid-range laptop

## M2 — Leather tools

- [x] T2.1 Derivation pass in `dispatch` (regenerate derived entities whose source geometry changed, same undo step; dependency-ordered; detach on own edit or source deletion)
- [x] T2.2 Stitch line: offset at margin (default 3–4 mm), dashed, linked to source [L1] — tool K; panel shows the link, editable margin, Detach. Links to a whole outline; stitching part of an edge needs split (M8)
- [x] T2.3 Stitch-hole distribution, fixed pitch + presets 2.7/3.0/3.38/3.85/4.0 mm + custom [L2] — `src/geometry/leather/stitch-holes.ts`; tool H; linked hole sets follow their line
- [x] T2.4 Corner-aware spacing (hole on every corner, even per-segment pitch) [L3] — corners = turns > 20°; smooth joins are one span; spacing by arc length
- [x] T2.5 Hole shapes: round and slanted slit (path direction + slit angle, default 45°); hole size; render + export (slits as one path of M…L cuts; holes always solid)
- [x] T2.6 Project settings: default margin, pitch, hole size — Properties panel with nothing selected
- [x] T2.7 Golden tests for hole layouts: rect, rounded rect, circle, open L, D-shape (curve meets line), tiny spans, fixed pitch

## M3 — PDF + v1 launch

- [x] T3.1 Lazy-loaded PDF module (jsPDF + svg2pdf.js); single page 1:1 — own chunk (156 KB gz); 1:1 verified by interpreting the PDF content stream in tests
- [x] T3.2 Tiled export A4/Letter/A3, overlap (default 10 mm), crop marks, row/col labels — auto orientation (fewest pages), empty tiles skipped, neighbour labels and dashed overlap guides
- [x] T3.3 50 mm calibration square on page 1, page header (project, piece, "1:1", date), print instructions — assembly sheet as page 1 (square, instructions, sheet map); print hint in the export dialog. PDF page text is English/Latin-1 until T4.2
- [x] T3.4 Export options: layer selection, cut-only, stroke width, labels on/off, polyline-for-laser — Export… dialog (SVG or PDF), remembered per browser
- [ ] T3.5 Acceptance fixture (100×100 square, 50 mm circle, 3.85 mm holes): numeric check of SVG/PDF ✓ (automated); **manual print on A4 + Letter (±0.2 mm) and a visual look at the PDF pages — needs a human with a printer**
- [ ] T3.6 SVG compatibility check in Inkscape, Illustrator, LightBurn
- [x] T3.7 PWA (vite-plugin-pwa), offline drafting + export — whole build precached (20 files, 1.6 MB, incl. the PDF chunk); updates wait for the user ("A new version is ready · Reload"). Verified: production preview stopped → app reloads from the service worker and the PDF chunk still loads
- [ ] T3.7b Check install prompt and the update flow on a real browser (desktop Chrome/Edge; iOS Safari "Add to Home Screen") — needs a human
- [x] T3.8 Accessibility pass: keyboard panels, focus rings, WCAG 2.2 AA contrast — axe-core (WCAG 2.0–2.2 A/AA): 0 violations in default, selection, snap-menu, tool-fields and export-dialog states; contrast of every UI token pair enforced in CI for both themes (`src/app/contrast.test.ts`); 18 px checkboxes/radios in ≥ 24 px rows (2.5.8); live tool prompts; labelled drawing area with keyboard help
- [ ] T3.8b Screen-reader walkthrough (VoiceOver/NVDA) of drawing with typed coordinates — needs a human
- [x] T3.9 Bundle budget check in CI (< 600 KB gzipped initial) — `pnpm bundle:check` (initial = entry + modulepreloads + CSS; currently 235 KB; lazy chunks listed)
- [x] T3.10 CI pipeline: typecheck, lint, test, build, i18n check — `pnpm verify` locally; `.github/workflows/ci.yml` (Node 20.19, pnpm from packageManager, frozen lockfile). licence: Apache-2.0

## M4 — v1.1

- [x] T4.1 Complete `zh-CN` translation (397/397 keys) and the `i18n:check --strict` gate in `pnpm check`/`verify`/CI; `src/i18n/locales.test.ts` checks every translation compiles as ICU with exactly the `en` placeholders. Terms used: 菱斩 (chisel), 针距 (pitch), 缝孔 / 斜孔, 缝线, 缝份 (seam allowance), 圆冲 / 腰圆孔 (punch / slot), 纹理方向箭头 (grain arrow), 修剪 / 延伸 / 打断, 并集 / 差集
- [ ] T4.1b Glossary review of `src/locales/zh-CN` by a native-speaking leatherworker — needs a human
- [x] T4.2 CJK PDF font: `public/fonts/NotoSansSC-GB2312.ttf` (Noto Sans SC Regular, OFL, subset to GB2312 + Latin + CJK punctuation, glyf outlines for jsPDF; 2.25 MB, 1.4 MB gzipped; rebuilt with `scripts/build-cjk-font.py`). Fetched only when something printed is outside Latin-1 (page text, names, labels), registered with jsPDF for page text and as the SVG font-family for labels; jsPDF subsets again (a Chinese tiled PDF is ~56 KB). Runtime-cached by the service worker after first use, not precached. PDF page text now follows the UI language. Characters outside GB2312 (rare hanzi) print as missing glyphs
- [x] T4.3 Text/label tool [D10] — tool N, on the Notes layer (active layer if Notes is locked/hidden): click, type text (free-text input-bar field, focused automatically), size and angle; last text/size/angle reused. Grain arrow mode: double-headed arrow as one open path, two clicks or typed length/angle. Text boxes are estimated (0.6 em Latin, 1 em CJK) and rotate with the text, for hit-testing and export bounds. Properties now shows rotations counter-clockwise like typed angles. Piece name / quantity are typed as text (no auto-fields)
- [x] T4.4 Parallel line [D9] — tool G: pick a straight edge, click or type the distance (cursor picks the side); same length as the edge. Trim / extend / split [M8] — tool W with a mode choice, Shift swaps trim ↔ extend; every visible line, outline or circle is a cutting edge/boundary; edits replace the entity in place (first piece keeps the id, so linked stitch lines follow); circles trim to arcs; extending a curved end adds a straight segment along its tangent. Join + union/difference [M9] — selection actions Shift+J / Shift+U / Shift+D (palette buttons): join links nearest ends (merging coincident ones, else a straight bridge) and closes when the ends meet; difference = largest shape minus the others, inner cut-outs become their own outlines. `src/geometry/edit.ts`, `replaceEntities` command
- [x] T4.5 Hole count per edge [L4] — Properties "Per edge" for a hole set; Measure → Hole count compares two edges and warns on a mismatch (on demand; pairs aren't stored). Punch marks [L5] — tool U: round holes and slots, punch-diameter presets + typed size. Seam allowance per edge [L6] — tool Y: per-edge allowance, mitred/cut-back corners, bevel past MITER_LIMIT; result is a static path (not linked to the outline)
- [x] T4.6 DXF export via the Maker.js adapter (`src/geometry/maker-adapter.ts`, lazy 44 KB chunk): R12-style entities, $INSUNITS = mm, one DXF layer per layer, y flipped to y-up; LINE / CIRCLE, Béziers as ARCs within 0.005 mm (measured in tests) or short LINEs with the polyline option; labels left out (Maker.js has one text height per layer). PNG preview: SVG rasterised on white at 96/150/300 dpi (max 8192 px a side), with a pHYs chunk so it prints to size. Both in the Export dialog; e2e covers both downloads. Not checked in LightBurn/Inkscape yet (see T3.6)
- [x] T4.7 SVG import for tracing — toolbar "Import SVG…" (`src/persistence/svg-import.ts`): mm/cm/in/pt/px units + viewBox, transforms, path data incl. arcs (Paper parses `d`), rect/circle/ellipse/line/polyline/polygon, compound paths split; defs/hidden skipped, text/images/<use> counted as skipped. Lands on the Reference layer (active layer if that's locked/hidden), selected, one undo step. Not modelled: preserveAspectRatio, nested <svg> viewBoxes, CSS transforms
- [x] T4.8 Rebindable keyboard shortcuts — toolbar "Shortcuts…": every tool and selection action, letter keys ± Shift, matched by physical key (`KeyboardEvent.code`, so layouts/IMEs don't matter); taking a key from another command unbinds it and says so; Remove / Reset all; remembered per browser (`src/tools/shortcuts.ts` pure logic, `src/ui/shortcuts-store.ts`). Palette tooltips follow the bindings

## UI refinements (requested)

- [x] U1 Tool palette groups, Photoshop-style (`src/ui/palette-groups.ts`): one slot per group shows the active or last-used member (remembered per browser), corner triangle when there are more; right-click, long press (touch/pen) or → opens the group menu (role=menu, arrow keys, Esc). Groups: rectangle/square (new square mode in the Rectangle tool), circle/3-point/ellipse (Circle tool modes), pen/arc, perpendicular/parallel, fillet/chamfer, offset/seam allowance, punch/notch, flip H/V, union/difference
- [x] U2 No browser context menu over the app (text fields keep theirs for copy/paste)
- [x] U3 Language picker: a globe icon instead of the word "Language" (the select keeps its accessible name)
- [x] U4 Collapsible side panel (layers + properties), remembered per browser
- [x] U5 CAD-style lines: the Line tool makes one entity per segment by default (AutoCAD LINE), so each segment selects alone; Polyline mode (palette group with Line) makes one path (PLINE). New Explode action (Shift+X, grouped with Join) splits paths into segments, curves keeping their handles

## M5 — v2

- [ ] T5.1 planegcs WASM (separately loaded, LGPL) + constraint model in schema v2 with migration
- [ ] T5.2 Constraint UI: parallel, perpendicular, tangent, distance; parametric dimensions
- [x] T5.3 Notches [L7] — tool J: single/double, snip or V, inward on closed outlines (cursor side on open lines), on the edge's layer. Arrays [M10] — tool Q: linear (base + step, count incl. original) and circular (centre, count, sweep; 360° = even spacing), one undo step via `arrayEntities`. DXF import — toolbar "Import…" now takes SVG or DXF (`src/persistence/dxf-import.ts`): $INSUNITS, LINE, (LW)POLYLINE with bulges, CIRCLE, ARC, ELLIPSE, SPLINE (exact Béziers by knot insertion; rational ones sampled); blocks/text/dimensions skipped and counted

## Open questions blocking tasks (from PRD)

- ~~Licence MIT vs Apache-2.0~~ → resolved: Apache-2.0 (LICENSE in the GitHub repo; `license` in package.json)
- Slanted slit holes in v1? → affects T2.5 scope
- Pull DXF into v1? → may move T4.6 into M3
- Touch/pen on iPad in v1? → affects T0.10 pointer handling
