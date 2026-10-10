# LeatherDraft User Guide

**English** · [简体中文](USER_GUIDE.zh-CN.md) · [繁體中文](USER_GUIDE.zh-TW.md) · [Deutsch](USER_GUIDE.de.md) · [Français](USER_GUIDE.fr.md) · [Español](USER_GUIDE.es.md) · [Italiano](USER_GUIDE.it.md) · [Português](USER_GUIDE.pt.md) · [日本語](USER_GUIDE.ja.md) · [한국어](USER_GUIDE.ko.md)

LeatherDraft is a 2D drafting tool for leather patterns. You draw in millimetres and print or cut at true 1:1 scale. It runs in the browser (or as a desktop app), needs no account, and your files stay on your device.

## Contents

1. [The screen](#1-the-screen)
2. [Basics: selecting, typing values, snapping, the view](#2-basics)
3. [Drawing tools](#3-drawing-tools)
4. [Changing shapes](#4-changing-shapes)
5. [Leather tools](#5-leather-tools)
6. [Constraints](#6-constraints)
7. [Measuring](#7-measuring)
8. [Layers and properties](#8-layers-and-properties)
9. [Files: save, open, import, autosave](#9-files)
10. [Export and printing at true size](#10-export-and-printing)
11. [Keyboard shortcuts](#11-keyboard-shortcuts)
12. [Walkthrough: a card wallet piece](#12-walkthrough-a-card-wallet-piece)
13. [Troubleshooting](#13-troubleshooting)
14. [License](#14-license)

---

## 1. The screen

| Area | What it holds |
| --- | --- |
| **Toolbar** (top) | Project name, New, Open…, Save, Import…, Export…, Undo / Redo, Shortcuts…, Language |
| **Tool palette** (left) | All tools, grouped. A slot with a small corner triangle holds more tools: **right-click** it (or long-press, or press → while it has focus) to pick another. The slot remembers the one you used last. |
| **Drawing area** (centre) | The canvas, in millimetres, with a grid. The tool prompt and the **input bar** for typed values appear here. |
| **Side panel** (right) | **Layers** and **Properties**. Fold it away with the arrow at its top. |
| **Status bar** (bottom) | Cursor X/Y, zoom, grid spacing, number of objects and how many are selected, display units, and the **Snaps** menu. |

Every tool shows a one-line prompt telling you what to click or type next. Read it when unsure.

## 2. Basics

### Selecting

Use **Select** (V):

- Click an object to select it; **Shift-click** adds or removes.
- Drag a box **left → right** to select objects fully inside it; **right → left** to select anything it touches.
- **Drag** a selected object to move it; hold **Alt** while dragging to move a copy.
- **Delete** removes the selection. **⌘/Ctrl+A** selects everything. **Esc** deselects.

**Editing points.** With one shape selected, its points and Bézier handles appear:

- Drag a point or handle to move it.
- **Double-click a point** to switch it between smooth and corner.
- **Double-click the outline** to add a point.
- Click a point, then press **Delete** to remove it.

### Typing exact values

Every drawing and editing tool accepts numbers. **Just start typing a number**: it goes into the input bar.

- **Tab** moves to the next field (for example Length → Angle, or X → Y).
- **Enter** applies, **Esc** clears.
- Lengths are in the display units chosen in the status bar (mm, cm or in). Angles are in degrees, counter-clockwise from the +X direction.

Hold **Shift** while drawing to lock angles to 15° steps.

### Snapping

The cursor snaps to existing geometry. Open **Snaps** in the status bar to turn each kind on or off:

Endpoint · Midpoint · Centre · Quadrant · Intersection · Perpendicular · Tangent · Nearest · Grid · Polar tracking (45°) · Object tracking

The marker at the cursor shows which snap is active.

### Moving around

- **Mouse wheel** or trackpad pinch: zoom at the cursor.
- **Space + drag** or **middle-button drag**: pan.
- The zoom level is in the status bar; at 100 %, 1 mm is drawn as 96/25.4 CSS pixels (nominal real size).

### Undo

**⌘/Ctrl+Z** undoes, **⇧⌘Z / Ctrl+Shift+Z** (or Ctrl+Y) redoes. Every action is exactly one undo step, including the linked stitch lines and holes it updates. Undo is unlimited within a session.

## 3. Drawing tools

New shapes go on the **active layer** (see [Layers](#8-layers-and-properties)). Most tools finish a shape with **Enter, double-click or right-click**, and **Backspace** removes the last point.

| Tool | Key | How to use it |
| --- | --- | --- |
| **Line** | L | Click points, or type length and angle. Each segment becomes its own object, as in CAD. Click the first point to close. |
| **Polyline** | (Line group) | Same as Line, but all segments make one path. Switch with the Line tool's *Mode* field. |
| **Rectangle** | R | Click two corners, or type width and height. Hold **Alt** on the first click to draw from the centre. Set *Corner radius* for rounded corners. |
| **Square** | (Rectangle group) | Rectangle with one *Side* value. |
| **Circle** | C | Click the centre, then a point on the circle or type the radius. |
| **3-point circle** | (Circle group) | Click three points the circle passes through. |
| **Ellipse** | (Circle group) | Click the centre, the end of the first axis, then set the other radius. |
| **Pen (curves)** | P | Click for a corner point, **drag** for a smooth curve point. Type length and angle for a straight edge. Click the first point to close. |
| **Arc (3 points)** | A | Click start, end, and a point the arc passes through. |
| **Centre line** | X | Click a shape to put a vertical or horizontal centre line through its middle, or draw one from two points. Centre lines serve as mirror axes. |
| **Perpendicular** | T | Click a straight edge, then place a line at right angles to it (or type the distance along the edge and the length). |
| **Parallel line** | G | Click a straight edge, then click the side and distance, or type the distance. |
| **Label** | N | *Text* mode: click where the text starts, type (e.g. "Front panel · cut 2"), Enter. *Grain arrow* mode: click both ends. Labels go on the Notes layer. |

## 4. Changing shapes

### Transform

**Move, Rotate, Scale, Mirror** and **Array** work on the selection. If nothing is selected, the tool first asks you to select objects; press **Enter** or right-click when done. Tick **Keep original (copy)** to transform a copy.

| Tool | Key | Steps |
| --- | --- | --- |
| **Move** | M | Base point → destination, or type ΔX and ΔY. |
| **Rotate** | O | Centre → click the angle, or type it. Shift rounds to 15°. |
| **Scale** | S | Base point (stays fixed) → type a factor, or click a reference point and where it should go. |
| **Mirror** | I | Click a centre line to mirror across it, or click two points of an axis (or one point and type the angle). |
| **Array** | Q | *Linear*: base point → where the next copy goes; *Count* includes the original. *Circular*: centre → Enter; 360° spreads copies evenly, less spans first to last. |
| **Flip horizontal / vertical** | Shift+H / Shift+V | Flips the selection in place, instantly. |

### Edit

| Tool | Key | Steps |
| --- | --- | --- |
| **Offset** | E | Click a path, circle or centre line, then click the side. The distance follows the cursor, or type it. *Corners*: sharp, round or bevel. Click again for more offsets; Esc to pick another source. |
| **Fillet** | F | Hover a corner between two straight edges and click to round it. **Shift-click** rounds every corner of the shape. Type a radius to change it; if it's too big, the prompt tells you the largest that fits. |
| **Chamfer** | B | Like Fillet but cuts the corner straight. Type two distances, or a distance and an angle. |
| **Trim / extend / split** | W | *Trim*: click the piece of a line to remove, back to the nearest crossings. *Extend*: click near a line's end to extend it to the next line. *Split*: click a line to cut it at that point. Shift-click swaps trim and extend. |
| **Join paths** | Shift+J | Joins the selected open paths that meet end to end; a single path whose ends meet gets closed. |
| **Explode** | Shift+X | Breaks the selected rectangles, polylines or outlines into separate segments. |
| **Union** | Shift+U | Merges two or more selected closed shapes into one outline. |
| **Difference** | Shift+D | Cuts the other selected closed shapes out of the largest one. |

## 5. Leather tools

These are what make LeatherDraft different from a general CAD program. Their results **stay linked**: edit an outline and its stitch line follows; the holes follow the stitch line. All of it updates in the same undo step.

### Stitch line (K)

1. Click an outline.
2. Click inside or outside to choose the side. The margin comes from the project settings (see below), or type another value.

The stitch line is drawn on the Stitch layer and follows its outline from then on. To break the link, select it and press **Detach** in Properties.

### Stitch holes (H)

1. Set the options in the input bar:
   - **Chisel** pitch: 2.7, 3.38, 3.85, 4.0 or 5.0 mm, or **Custom**.
   - **Hole size** and **Shape**: *Round* or *Slanted slit* (like a diamond chisel).
   - **Hole on every corner**: spacing is evened out per edge so a hole lands exactly on each corner, the way you'd walk a chisel.
2. Hover a stitch line (or any line) to preview the holes and their count.
3. Click to add them.

Change pitch, size or shape later in Properties; the **Per edge** list shows the hole count on each edge.

### Project defaults

With nothing selected, the **Project** section of Properties sets the defaults for new stitch lines and holes: **Stitch margin** (3.5 mm), **Pitch** (3.85 mm) and **Hole size** (1.2 mm); defaults in brackets.

### Seam allowance (Y)

1. Click a closed outline.
2. Type one value for every edge, or click edges (Shift-click for several) and type a value for just those.
3. Press **Enter** with nothing typed to add the outline.

### Punch hole / slot (U)

For rivets, snaps, screw posts and buckle tongues. Choose *Round hole* or *Slot*, pick a common **Punch** diameter or **Custom**, then click to place (it snaps to centres and points) or type X/Y and Enter. For a slot, *Length* is end to end and *Width* is the punch diameter.

### Notch (J)

Alignment marks for assembly. Choose *Single* or *Double*, and *Snip (line)* or *V notch*, set depth (and gap / width), then click an edge. Notches point into the piece; on open lines they go to the cursor's side.

### Line styles

In Properties, set a path's **Line style**: *Solid (cut)*, *Dashed (fold/score)*, *Dotted (reference)* or *Dash-dot (centre)*. **Stroke (export)** sets the line width used in exported files.

## 6. Constraints

The **Constraint** tool (Z) makes relationships between shapes exact. In each case the **first** thing you click stays put and the **second** one moves.

| Type | Click |
| --- | --- |
| **Parallel** / **Perpendicular** | Two straight edges. |
| **Tangent** | A straight edge or circle, then the circle (or edge) to make tangent. |
| **Coincident** | Two points. |
| **Distance** | Two points, then type the distance and Enter (Enter alone keeps the current one). |
| **Radius** | A circle, then type the radius and Enter. |

If a new constraint conflicts with existing ones, nothing changes and the prompt says so.

Selected objects list their constraints in the **Constraints** section of Properties. A constraint marked *Not satisfied* means the geometry was moved after solving; press **Solve** to restore it. *Broken* means something it refers to changed or was deleted; delete it with its × button.

## 7. Measuring

**Measure** (D) has four modes:

- **Distance**: click two points.
- **Angle**: click a point, the corner, then another point.
- **Length**: hover a shape to see its length.
- **Hole count**: click an edge of a hole set, then the edge it will be sewn to. The prompt says whether the counts match, or how many holes apart they are, so you can adjust the pitch or edge lengths before cutting.

## 8. Layers and properties

### Layers

Every drawing has four layers:

| Layer | Use |
| --- | --- |
| **Cut** | Outlines to cut. |
| **Stitch** | Stitch lines and holes. |
| **Reference** | Construction lines and imported drawings. |
| **Notes** | Labels and grain arrows. |

Per layer you can **show / hide** it (checkbox), change its **colour** (swatch), **lock / unlock** it (padlock), and click its name to **draw on** it. You can't draw on a locked or hidden layer.

### Properties

Select objects to see and edit their numbers: position, width and height, length, radius or diameter, rotation, layer, line style, text, pitch and so on. Type a value and press Enter. With several objects selected, differing values show as "—"; typing one sets all of them.

### Units

Choose **mm**, **cm** or **in** in the status bar. This only changes what is displayed and typed; the drawing is always stored in millimetres.

## 9. Files

- **Save** (⌘/Ctrl+S) writes a `.json` project file. **⌘/Ctrl+Shift+S** saves under a new name.
- **Open…** (⌘/Ctrl+O) opens a `.json` project.
- **New** starts an empty project (it asks first if there are unsaved changes).
- The project name is in the toolbar; a dot in the browser tab title means unsaved changes.
- **Import…** brings an **SVG or DXF** in at true size onto the Reference layer, selected, so you can trace an existing pattern.
- **Autosave**: your work is kept in the browser half a second after each change and restored the next time you open LeatherDraft. Autosave is a safety net, not a substitute for saving a file: clearing browser data deletes it.

**Desktop app**: Save, Open and Export use the system's file dialogs, and Save keeps writing to the same file.

**Offline**: once loaded, the web app works offline ("Ready to work offline"). When a new version is available, a notice offers **Reload**.

## 10. Export and printing

**Export…** opens the export dialog.

| Format | Use | Options |
| --- | --- | --- |
| **PDF** | Printing at 1:1 | Paper (A4, Letter, A3, or **One page, sized to the pattern** for large-format printers), orientation (*Fewest pages*, portrait, landscape), overlap between sheets |
| **SVG** | Laser cutters, cutting plotters, Inkscape, Illustrator | Curves as short straight lines (for laser software that doesn't read curves) |
| **DXF** | Laser and CNC software, in mm | Shapes only: labels are left out |
| **PNG** | Sharing a picture | Resolution: 96, 150 or 300 dpi. Not for making the pattern. |

Common options: **Cut layers only (laser)**, **Include labels**, **Line width**, and a **Watermark** (text and opacity; in PDFs it repeats on every page).

If the drawing has objects created by AI (through the MCP server) that nobody has reviewed yet, the dialog warns you. Select them via the status bar and press **Mark reviewed** in Properties once you've checked them.

### Printing at true size

A tiled PDF starts with an **assembly page**: a map of the sheets and a **50 mm calibration square**. Each sheet has crop marks and a label (A1, A2, B1…).

1. Print at **100 % / "Actual size"**. Never "Fit to page" or "Shrink oversized pages".
2. **Measure the 50 mm square.** If it isn't exactly 50 mm, fix the printer scaling and print again.
3. Trim along a dashed line or overlap the sheets, matching the corner marks and sheet labels, and tape them together.

## 11. Keyboard shortcuts

### Tools and actions

| Key | Tool | Key | Tool |
| --- | --- | --- | --- |
| V | Select | M | Move |
| L | Line / polyline | O | Rotate |
| R | Rectangle / square | S | Scale |
| C | Circle / 3-point / ellipse | I | Mirror |
| P | Pen (curves) | Q | Array |
| A | Arc (3 points) | W | Trim / extend / split |
| X | Centre line | E | Offset |
| T | Perpendicular | Y | Seam allowance |
| G | Parallel line | F | Fillet |
| N | Label / grain arrow | B | Chamfer |
| D | Measure | K | Stitch line |
| Z | Constraint | H | Stitch holes |
| U | Punch hole / slot | J | Notch |
| Shift+H / Shift+V | Flip horizontal / vertical | Shift+J | Join paths |
| Shift+X | Explode | Shift+U / Shift+D | Union / difference |

Change any of these under **Shortcuts…** in the toolbar. They are letter keys with or without Shift, matched by key position, so they work with any keyboard layout or input method. They are kept per browser; **Reset all** restores the defaults.

### General

| Key | Action |
| --- | --- |
| ⌘/Ctrl+Z, ⇧⌘Z / Ctrl+Y | Undo, redo |
| ⌘/Ctrl+S, ⌘/Ctrl+Shift+S | Save, save as |
| ⌘/Ctrl+O | Open |
| ⌘/Ctrl+A | Select all |
| Delete | Delete selection or selected point |
| Esc | Cancel / deselect |
| Enter, double-click, right-click | Finish a shape / confirm |
| Backspace | Remove last point while drawing |
| Shift (held) | Lock angle to 15° steps |
| Alt (held) | Rectangle from centre; copy while dragging |
| Number keys | Start typing a value |
| Tab | Next input field |
| Space + drag, middle drag | Pan |
| Wheel, pinch | Zoom |

## 12. Walkthrough: a card wallet piece

1. **Rectangle** (R): click once, type `95`, Tab, `65`, Enter. You have a 95 × 65 mm piece on the Cut layer.
2. **Fillet** (F): type `5`, then **Shift-click** a corner to round all four.
3. **Stitch line** (K): click the outline, then click inside. With the default margin you get a stitch line 3.5 mm in.
4. **Stitch holes** (H): choose pitch **3.85**, tick **Hole on every corner**, hover the stitch line and click.
5. **Label** (N): click inside the piece, type `Card wallet · cut 2`, Enter.
6. Try changing the outline: select the rectangle and set **W** to `100` in Properties. The stitch line and holes follow.
7. **Save** (⌘/Ctrl+S), then **Export…** → PDF → A4 → print at 100 % and measure the 50 mm square.

## 13. Troubleshooting

| Problem | Fix |
| --- | --- |
| Nothing gets drawn / "The active layer is locked or hidden" | Unlock or show the layer, or pick another in Layers. |
| The print is a little too small or large | The PDF was scaled. Print at 100 % / Actual size and re-check the 50 mm square. |
| Fillet says "too large for this corner" | Use the largest radius shown in the prompt, or lengthen the edges. |
| Hole counts don't match on two edges to sew | Use Measure → Hole count, then adjust the pitch or one edge's length. |
| Constraint "conflict" | The new constraint contradicts existing ones. Delete one in Properties → Constraints. |
| Laser software shows broken curves | Export SVG with **Curves as short straight lines**, or use DXF. |
| A tool shortcut doesn't respond | A text field may have focus: click the canvas first. Check **Shortcuts…** in case the key was reassigned. |

## 14. License

LeatherDraft is free for personal and other noncommercial use under the [PolyForm Noncommercial License 1.0.0](../LICENSE). **Everything you make with it is yours**: drawings, exported files and the leather goods made from them, which you may sell. Using the software itself commercially (selling it or a modified version, offering it as a service, building it into a product) needs a commercial license; see [COMMERCIAL.md](../COMMERCIAL.md).

Exported SVG files contain a short `<metadata>` note, and PDFs a Creator property, saying they were made with LeatherDraft. DXF files start with the same note as a comment. It holds nothing about you or your device, and you may remove it.
