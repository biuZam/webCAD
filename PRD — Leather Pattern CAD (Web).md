# PRD — Leather Pattern CAD (Web)

Oct 9, 2026 · @ditto

## Overview

We will build a browser-based 2D CAD tool, working name **LeatherDraft**, that lets leatherworkers draft accurate patterns in millimetres and export them as 1:1 SVG and print-ready PDF. It runs entirely client-side, needs no install, and ships in English first, Simplified Chinese second.

**Problem.** Leatherworkers draft in Illustrator, Inkscape or general CAD (Fusion, LibreCAD). These tools are either expensive, not millimetre-first, or lack craft-specific operations: stitch-hole spacing along a curve, stitch-line offset from an edge, a chisel-pitch-aware hole layout, and tiled 1:1 printing on A4/Letter.

**Target users.**

- Hobby and small-studio leatherworkers making wallets, bags, belts, cases (primary)
- Textile/sewing pattern makers who need seam allowance and notches (secondary)
- Laser/CNC cutters who need clean closed outlines (secondary)

**Core job.** Draw a piece outline, add stitch lines and holes, mirror it for the other side, then print or cut it at true scale.

## Goals, non-goals, success metrics

**Goals (v1)**

1. Draft a complete leather piece (outline, stitch line, holes, centre line, labels) without leaving the app.
2. Exports are dimensionally exact: a 100 mm line prints at 100 mm ±0.2 mm on any printer at 100% scale.
3. Reuse proven libraries for geometry, export and i18n; custom code limited to UI, tool logic and leather-specific helpers.
4. Every UI string externalised; English complete at launch, Simplified Chinese complete within one release after.

**Non-goals (v1)**

- 3D preview, box/bag folding simulation
- Parametric/constraint-driven drafting (planned v2, see Roadmap)
- Grading/sizing across a size range
- Real-time multi-user collaboration and cloud accounts
- Direct machine control (laser/CNC G-code)

**Success metrics**

| Metric | Target |
| --- | --- |
| Print accuracy (100 mm test square, A4 + Letter) | within ±0.2 mm |
| Time to draft a card-wallet pattern (new user) | under 15 min |
| Exported SVG opens correctly in Inkscape, Illustrator, LightBurn | 3 of 3 |
| Untranslated strings in zh-CN build | 0 |
| Interaction latency, 2,000 entities | under 16 ms per frame |
| Initial JS bundle (gzipped) | under 600 KB |

## Functional requirements

All geometry is stored in millimetres; display units switch between mm, cm and inch. Every tool accepts typed numeric input (length, angle, radius, count) as well as mouse input. Priority: P0 = v1 launch, P1 = v1.x, P2 = later.

### Drawing tools

| ID | Tool | Behaviour | Pri |
| --- | --- | --- | --- |
| D1 | Line / polyline | Click-to-click; typed length + angle; close to form a shape | P0 |
| D2 | Line styles | Solid (cut), dashed (fold/score), dotted (reference), dash-dot (centre); style is an entity property | P0 |
| D3 | Curve | Cubic Bézier with handles; smooth/corner node toggle; 3-point arc | P0 |
| D4 | Rectangle | Corner-corner or centre + size; optional corner radius | P0 |
| D5 | Circle / ellipse | Centre + radius; 3-point circle; ellipse by axes | P0 |
| D6 | Centre line | Dash-dot axis through a shape's bounding-box centre, or between two points; acts as mirror axis | P0 |
| D7 | Midpoint | Snap target and placeable point at segment / arc midpoint | P0 |
| D8 | Perpendicular | Line perpendicular to a segment from a point or at a distance along it | P0 |
| D9 | Parallel line | Line parallel to a segment at a typed distance | P1 |
| D10 | Text / label | Piece name, quantity ("cut 2"), grain/backbone arrow | P1 |

### Modify tools

| ID | Tool | Behaviour | Pri |
| --- | --- | --- | --- |
| M1 | Fillet | Round a corner between two segments at typed radius | P0 |
| M2 | Chamfer | Cut a corner by two distances or distance + angle | P0 |
| M3 | Offset | Offset an open or closed path in/out by typed distance; round, miter or bevel joins | P0 |
| M4 | Mirror | Mirror across a centre line or any two points; copy or move | P0 |
| M5 | Rotate | Around a pick point by typed angle; copy or move | P0 |
| M6 | Invert / flip | Flip selection horizontally or vertically in place (for left/right pieces) | P0 |
| M7 | Move / copy / scale | Standard, with typed deltas | P0 |
| M8 | Trim / extend / split | Trim to intersection; split path at point | P1 |
| M9 | Join / boolean | Join open paths; union and difference of closed shapes | P1 |
| M10 | Linear / circular array | Repeat selection N times | P2 |

### Leather-specific tools

| ID | Tool | Behaviour | Pri |
| --- | --- | --- | --- |
| L1 | Stitch line | Offset of an edge at a set margin (default 3–4 mm), drawn dashed, linked to its source edge | P0 |
| L2 | Stitch holes | Holes placed along a path at a set pitch (preset 2.7, 3.0, 3.38, 3.85, 4.0 mm, or custom); hole shape round or slanted slit; hole size set | P0 |
| L3 | Corner-aware spacing | Pitch adjusts so a hole lands exactly on each corner and spacing stays even per segment | P0 |
| L4 | Hole count matching | Show hole count per edge; warn when two edges to be sewn together differ | P1 |
| L5 | Punch marks | Snap holes, rivets, snaps, slots, with diameter presets | P1 |
| L6 | Seam allowance (textile) | Offset outline outward with per-edge allowance values | P1 |
| L7 | Notches | Single/double notches on edges for alignment | P2 |

### Canvas, snapping and editing

- Infinite canvas with pan/zoom, mm grid, rulers, live cursor coordinates (P0)
- Object snaps: endpoint, midpoint, centre, intersection, perpendicular, tangent, nearest, grid; toggle each (P0)
- Layers (cut, stitch, reference, notes) with visibility and lock (P0)
- Properties panel with editable numeric geometry (P0)
- Measure tool: distance, angle, path length (P0)
- Unlimited undo/redo within session; autosave to browser storage; open/save native `.json` project file (P0)
- Keyboard shortcuts for every tool, rebindable (P1)
- Import SVG for tracing an existing pattern (P1); import DXF (P2)

## Export and import

SVG and PDF are P0 and must be true-scale vector output; nothing is rasterised.

**SVG export (P0)**

- Root `width`/`height` in `mm` with a matching `viewBox`, so 1 user unit = 1 mm
- One `<g>` per layer with `id` and `inkscape:label`; line styles via `stroke-dasharray`
- Options: all layers or selected layers; cut-only (for laser); stroke width; include/exclude labels
- Curves exported as native path commands (no flattening) unless "polyline for laser" is ticked

**PDF export (P0)**

- Single page sized to the drawing, at 1:1
- Tiled pages on A4, Letter, A3 with overlap margin (default 10 mm), crop/alignment marks, row/column labels, and a 50 mm calibration square on page 1
- Page header: project name, piece name, scale "1:1", date
- Vector paths; text embedded with a CJK-capable font when the UI or labels contain Chinese

**Other (P1–P2)**

- PNG preview (P1); DXF R12/R2000 export for laser/CNC software (P1); DXF import (P2)

**Acceptance test.** Export a 100 × 100 mm square with a 50 mm circle and 3.85 mm-pitch holes; print PDF at 100% on A4 and Letter; measure within ±0.2 mm; open SVG in Inkscape and confirm document size 100 mm.

## Internationalisation

English (`en`) is the source locale and ships complete in v1; Simplified Chinese (`zh-CN`) follows in v1.1. The architecture supports more locales without code changes.

- **Library:** i18next + react-i18next, with ICU message format for plurals and interpolation ("12 holes" / "12 个孔")
- **Files:** one JSON namespace per area (`common`, `tools`, `export`, `errors`) under `/locales/<lang>/`; keys are semantic (`tools.fillet.radius`), never English text
- **Detection:** browser language on first visit, then the user's choice saved locally; switch in Settings without reload
- **Numbers and units:** `Intl.NumberFormat` for decimals; unit symbols (mm, cm, in) stay Latin in both locales
- **Layout:** UI tolerates 30% string growth (English → other) and CJK line-breaking; no text baked into icons
- **Fonts:** UI uses system font stack with CJK fallbacks (PingFang SC, Microsoft YaHei, Noto Sans SC); PDF export embeds a subset of Noto Sans SC only when Chinese glyphs are present, to keep files small
- **Terminology:** a bilingual glossary of leather terms (e.g. stitch line 缝线, stitching chisel 菱斩, pitch 针距, edge 边缘, fillet 圆角, chamfer 倒角, offset 偏移, mirror 镜像) reviewed by a native-speaking leatherworker before zh-CN release
- **CI check:** build fails on missing keys in `en`; reports missing keys in `zh-CN` as a release blocker for v1.1

## Recommended open-source stack

**Recommendation:** build on **Paper.js** as the single scene graph and geometry model, and plug in focused libraries for offset, export, constraints and i18n. Paper.js already gives native Bézier paths, hit-testing, boolean ops, transforms (rotate, scale, mirror via negative scale) and SVG import/export, which covers roughly half of the P0 tool list out of the box.

| Need | Library | Licence | Covers | Custom code left |
| --- | --- | --- | --- | --- |
| Canvas, scene graph, Bézier, hit-test, booleans, SVG I/O | [Paper.js](http://paperjs.org) | MIT | D1–D5, M4–M7, M9, SVG import/export | Tool state machines, handles UI |
| Offset / stitch line | [paperjs-offset](https://github.com/glenzli/paperjs-offset) | MIT | M3, L1, L6 (round/miter joins) | Edge-to-stitch-line linking |
| Robust offset fallback | [clipper2-js](https://npmjs.com/package/clipper2-js) (port of Angus Johnson's Clipper2) | BSL-1.0 | Offsets on self-intersecting or complex outlines | Flatten curves ↔ polygons |
| Fillet maths, DXF export, unit conversion | [Maker.js](https://maker.js.org/docs/exporting) | Apache-2.0 | M1 fillet algorithm; DXF export (P1) | Adapter Paper.js ↔ Maker.js model |
| PDF export (vector) | [jsPDF](https://github.com/parallax/jsPDF) + [svg2pdf.js](https://www.github.com/yWorks/svg2pdf.js) | MIT | Single page + tiled pages from our own SVG | Tiling, marks, calibration square |
| Constraint solving (v2) | [@salusoft89/planegcs](https://github.com/Salusoft89/planegcs) (FreeCAD's solver in WASM) | LGPL-2.1 | Parallel, perpendicular, tangent, distance constraints | Constraint UI |
| i18n | i18next + react-i18next | MIT | All UI strings, plurals, language switch | Glossary, translations |
| UI shell | React + TypeScript + Vite; Radix UI primitives | MIT | Panels, menus, dialogs | App layout |
| State, undo/redo | Zustand + Immer patches | MIT | Document store, history stack | Command definitions |
| Local storage | idb-keyval (IndexedDB) | Apache-2.0 | Autosave, recent files | — |

**What we still write ourselves** (no good library exists): chamfer (simple: trim two segments, add a line), stitch-hole distribution with corner-aware pitch (L2–L3), centre line / midpoint / perpendicular construction tools, snapping engine, PDF tiling layout, and the leather-specific properties panel.

**Alternatives considered**

- *Maker.js as the core model* — strong CNC heritage, fillets and DXF, but its model is line/arc-first with no interactive editor; Bézier editing would be bolted on. Use it as a helper, not the core.
- *Fabric.js / Konva* — great for UI objects and images, weak on path geometry (no offset, fillet or booleans). Rejected.
- *FreeSewing core* (MIT) — excellent parametric sewing library with seam-allowance offsets and SVG rendering, but code-first, not an interactive editor. Mine it for ideas and possibly its tiling/print approach.
- *Seamly2D / Valentina* — mature desktop pattern CAD (GPL). Use as UX reference only; do not copy code into a non-GPL project.

## Architecture and data model

&#91;embedded content: application architecture · 4 layers\]

Tools never mutate geometry directly: they emit commands to the document store, which makes every action undoable and keeps the canvas, SVG, PDF and DXF in sync. PDF is produced from the same SVG the app exports, so screen, SVG and print can't drift apart.

**Document model (JSON, units = mm)**

- `Project` — id, name, units, locale, `layers[]`, `pieces[]`, settings (default stitch margin, pitch, hole size)
- `Layer` — id, name, kind (`cut` · `stitch` · `reference` · `notes`), visible, locked, colour
- `Piece` — id, name, quantity, mirrored flag, `entities[]`
- `Entity` — id, layerId, type (`path` · `circle` · `text` · `holeSet` · `centreLine`), Paper.js-compatible path data, lineStyle (`solid` · `dashed` · `dotted` · `dashDot`), strokeWidth
- `HoleSet` — sourceEntityId, margin, pitch, holeShape (`round` · `slit`), holeSize, cornerMode; regenerated when its source edge changes
- `Derived` links — stitch lines and hole sets store the id of the edge they follow, so editing an outline updates them

File format is versioned (`schemaVersion`) with migrations, so v2 constraints can be added without breaking v1 files.

## Non-functional requirements

- **Platforms:** latest two versions of Chrome, Edge, Safari, Firefox on desktop; tablet view-only in v1
- **Offline:** installable PWA; all drafting and export work offline
- **Privacy:** no account, no server; files never leave the device
- **Precision:** geometry in double-precision mm; displayed to 0.01 mm; export rounds to 0.001 mm
- **Accessibility:** keyboard-operable panels, WCAG 2.2 AA contrast, visible focus
- **Licensing:** app MIT or Apache-2.0; keep the LGPL constraint solver as a separately loaded WASM module

## Milestones

1. **M0 Spike (2 weeks)** — Paper.js canvas, mm grid, line/rect/circle, SVG export at true scale, i18n scaffold with `en`
2. **M1 Core drafting** — all P0 drawing and modify tools, snapping, layers, undo, autosave
3. **M2 Leather tools** — stitch line, stitch holes with corner-aware pitch, hole presets
4. **M3 PDF + v1 launch** — single-page and tiled PDF, calibration square, accuracy test passed
5. **M4 v1.1** — complete `zh-CN`, CJK PDF fonts, DXF export, SVG import, text labels
6. **M5 v2** — constraints (planegcs), parametric dimensions, notches, arrays

## Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| paperjs-offset is lightly maintained; edge cases on tight curves | Wrong stitch lines | Golden-file tests; fall back to Clipper2 on flattened path |
| svg2pdf.js gaps (dash patterns, fonts) | PDF differs from screen | Generate a restricted SVG subset for PDF; visual regression tests |
| Printer scaling ("fit to page") ruins 1:1 | Wrong-size patterns | Calibration square + on-screen print instructions |
| CJK font embedding bloats PDF | Slow export, large files | Subset font to used glyphs only |
| Paper.js and Maker.js models diverge | Double maintenance | Paper.js is source of truth; Maker.js only via one adapter module |

## Open questions

- [ ] Product name and licence (MIT vs Apache-2.0)?
- [ ] Stitch-hole shape: are slanted diamond chisel marks required in v1, or round only?
- [ ] Should P1 DXF export be pulled into v1 for laser-cutter users?
- [ ] Desktop-only, or must v1 support touch/pen on iPad?
- [ ] Do we need traditional Chinese (`zh-TW`) after `zh-CN`?

## Sources

- [Maker.js exporting docs](https://maker.js.org/docs/exporting) · [Maker.js fillet announcement](https://maker.js.org/2015/08/09/Added-fillet-capability.html)
- [paperjs-offset](https://github.com/glenzli/paperjs-offset)
- [svg2pdf.js](https://www.github.com/yWorks/svg2pdf.js)
- [clipper2-js](https://npmjs.com/package/clipper2-js)
- [planegcs (WASM)](https://github.com/Salusoft89/planegcs)
- [FreeSewing monorepo](https://github.com/RockerKitten/freesewing)
