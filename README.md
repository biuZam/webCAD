# LeatherDraft

A browser-based 2D CAD tool for drafting **leather patterns in millimetres** and printing or cutting them at **true 1:1 scale**.

It runs entirely in your browser: no account, no server, and your files never leave your device. It installs as an app and works offline.

![LeatherDraft: drawing a card-wallet piece, rounding its corners, adding a linked stitch line and chisel holes, resizing it, and exporting](docs/media/demo.gif)

> **Status: pre-1.0.** The v1 drafting, leather and export features are implemented and tested. Still open before release: a physical print-accuracy check on real printers, completing the Simplified Chinese translation, and a few smaller items (see [`docs/TASKS.md`](docs/TASKS.md)).

## What it does

**Drafting**

- Lines, rectangles (with corner radius), circles (centre + radius, 3 points, ellipse), Bézier pen, 3-point arcs
- Centre lines (usable as mirror axes) and perpendicular lines
- Labels: text (piece name, "cut 2"…) and grain arrows, on the notes layer
- Move, rotate, scale and mirror (each optionally as a copy), flip in place
- Offset, fillet and chamfer; parallel lines; trim, extend and split; join paths; union and difference of shapes
- Edit points and Bézier handles directly; switch points between smooth and corner; add and delete points; drag selected shapes to move them
- Object snapping: endpoint, midpoint, centre, intersection, perpendicular, tangent, nearest, grid
- Exact values: type coordinates, lengths, angles and radii while drawing; edit numbers in the properties panel
- Layers (cut, stitch, reference, notes) with visibility, lock and colour; mm, cm or inch display

**Leather-specific**

- **Stitch lines** at a set margin from an outline, linked to it: edit the outline and the stitch line follows
- **Stitch holes** at chisel pitches (2.7, 3.0, 3.38, 3.85, 4.0 mm or custom), round or slanted slit. With "hole on every corner", spacing is evened out per edge so a hole lands exactly on each corner, the way you'd walk a chisel.
- Holes follow their stitch line, which follows its outline, all in one undo step
- **Hole count per edge**, and a check that two edges to be sewn together have the same count (Measure → Hole count)
- **Punch holes and slots** for rivets, snaps and buckles, with common punch diameters

**Output**

- **SVG** at 1:1 (1 unit = 1 mm), one layer per group, with an option to turn curves into short straight lines for laser software
- **PDF** for home printers: tiled on A4, Letter or A3 with overlap, crop marks and sheet labels, plus an assembly page with a **50 mm calibration square**. Or a single page sized to the pattern, for large-format printers.
- Save and open `.json` project files. Work is autosaved in the browser and restored on reload.

### Printing at true size

Print the PDF at **100 % / "Actual size"**, never "Fit to page", then measure the 50 mm square on the first page. If it isn't 50 mm, check your printer's scaling settings.

## Keyboard shortcuts

| Key | Tool | Key | Tool |
| --- | --- | --- | --- |
| V | Select (and edit points) | M | Move |
| L | Line / polyline | O | Rotate |
| R | Rectangle | S | Scale |
| C | Circle / 3-point / ellipse | I | Mirror |
| P | Pen (curves) | Shift+H / Shift+V | Flip horizontal / vertical |
| A | Arc (3 points) | E | Offset |
| X | Centre line | F | Fillet |
| T | Perpendicular | B | Chamfer |
| D | Measure | K | Stitch line |
| N | Label / grain arrow | H | Stitch holes |
| G | Parallel line | W | Trim / extend / split |
| U | Punch hole / slot |  |  |
| Shift+J | Join paths | Shift+U / Shift+D | Union / difference |

While drawing: **start typing a number** to enter it in the input bar, **Tab** moves between fields, **Enter** applies, **Esc** cancels, **Backspace** removes the last point, **Shift** locks angles to 15° steps. **Space-drag** or middle-drag pans, the wheel zooms. **⌘/Ctrl+Z / ⇧⌘Z** undo/redo, **⌘/Ctrl+S** save, **⌘/Ctrl+O** open, **⌘/Ctrl+A** select all.

## Development

Requires **Node ≥ 20.19** and **pnpm 10** (`corepack enable` picks up the version from `package.json`).

```bash
pnpm install
pnpm dev                     # http://localhost:5173
```

Useful URLs in development:

- `?fixture=acceptance`: the PRD acceptance drawing (100 mm square, 50 mm circle, 3.85 mm stitch holes)
- `?fixture=perf`: 2,000 entities for performance checks

Fixture sessions are never autosaved, so they can't overwrite your own work.

| Command | What it does |
| --- | --- |
| `pnpm test` | Unit and component tests (Vitest); `pnpm test <file>` or `pnpm test -t "<name>"` for one |
| `pnpm check` | Typecheck, lint, tests and translation report |
| `pnpm verify` | Everything CI runs: the above plus formatting, production build and bundle budget |
| `pnpm build` / `pnpm preview` | Production build (with service worker) and a local preview of it |
| `pnpm i18n:check` | Keys missing from non-English locales |
| `pnpm bundle:check` | Initial download must stay under 600 KB gzipped |
| `BENCH=1 pnpm test perf.bench` | Performance probe on 2,000 entities |

If package installs are slow where you are, try a registry mirror, e.g. `pnpm install --registry=https://registry.npmmirror.com`.

### Tech stack

React 19 + TypeScript + Vite · [Paper.js](http://paperjs.org) for geometry and rendering · Zustand + Immer (document store, undo/redo as patches) · [paperjs-offset](https://github.com/glenzli/paperjs-offset) with a Clipper fallback for offsets · jsPDF + svg2pdf.js for PDF (loaded on demand) · i18next · vite-plugin-pwa · Vitest.

### How it fits together

- **The drawing is plain JSON in millimetres**, held in a store. Every change is a command, which gives unlimited undo and simple save files.
- **Paper.js** draws the screen and does the geometry maths, but doesn't own the data.
- **Linked entities are regenerated inside the same command** that changes their source, so stitch lines and holes are never out of date.
- **PDF is rendered from the same SVG** the app exports, so screen, SVG and print can't drift apart.

More detail:

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): design decisions, layers, data model, performance and accessibility notes
- [`docs/TASKS.md`](docs/TASKS.md): task list and progress by milestone
- [`PRD — Leather Pattern CAD (Web).md`](<PRD — Leather Pattern CAD (Web).md>): product requirements
- [`CLAUDE.md`](CLAUDE.md): conventions for working on the code

### Quality bars

- **Accuracy.** Offsets stay within 0.02 mm of the requested distance, and fillet arcs within 0.001 mm of a true circle. PDF scale is verified in tests by reading the PDF's drawing commands back as page millimetres.
- **Performance.** 2,000 entities (17,600 stitch holes) redraw in about 12 ms.
- **Accessibility.** WCAG 2.2 AA colour contrast is enforced in CI for light and dark themes, and an axe-core audit reports no violations.

## Languages

English is complete. Simplified Chinese (简体中文) is in progress, and the language can be switched in the header. PDF page text is English until CJK font embedding lands.

## License

[Apache-2.0](LICENSE)
