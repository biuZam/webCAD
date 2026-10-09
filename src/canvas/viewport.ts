// Pan and zoom for the on-screen Paper.js view. Project space is mm; view.zoom is CSS px per mm.

/** CSS pixels per mm at 96 dpi; shown to the user as "100%". */
export const PX_PER_MM = 96 / 25.4
export const MIN_ZOOM = PX_PER_MM * 0.05
export const MAX_ZOOM = PX_PER_MM * 200

/** Zoom by `factor`, keeping the project point under `viewPx` fixed on screen. */
export function zoomAt(view: paper.View, factor: number, viewPx: paper.Point) {
  const before = view.viewToProject(viewPx)
  view.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, view.zoom * factor))
  const after = view.viewToProject(viewPx)
  view.center = view.center.add(before.subtract(after))
}

/** Pan by a delta in CSS pixels. */
export function panBy(view: paper.View, dxPx: number, dyPx: number) {
  view.center = view.center.subtract([dxPx / view.zoom, dyPx / view.zoom])
}

/** Fit `bounds` (mm) into the view with a margin in CSS px. */
export function fitBounds(view: paper.View, bounds: paper.Rectangle, marginPx = 40) {
  if (bounds.width === 0 && bounds.height === 0) return
  const sx = (view.viewSize.width - 2 * marginPx) / bounds.width
  const sy = (view.viewSize.height - 2 * marginPx) / bounds.height
  view.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(sx, sy)))
  view.center = bounds.center
}
