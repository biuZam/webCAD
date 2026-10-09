import i18next from 'i18next'
import paper from 'paper/dist/paper-core'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { documentStore } from '../document/store'
import { emptyBounds, entityBounds, isEmpty } from '../geometry/bounds'
import { formatLength } from '../lib/units'
import { drawGrid, drawRuler, readChromeColors, type ViewWindow } from './chrome'
import { drawHoles } from './holes-layer'
import { renderOverlay } from './overlay'
import { DocumentRenderer } from './renderer'
import { toolSession } from './tool-session'
import { useUiStore } from './ui-store'
import { fitBounds, panBy, PX_PER_MM, zoomAt } from './viewport'

const WHEEL_ZOOM_STEP = 1.0015
/** Must match --ruler-size in app.css. */
const RULER_PX = 20

export function CanvasView() {
  const { t } = useTranslation()
  const stageRef = useRef<HTMLDivElement>(null)
  const paperRef = useRef<HTMLCanvasElement>(null)
  const gridRef = useRef<HTMLCanvasElement>(null)
  const holesRef = useRef<HTMLCanvasElement>(null)
  const rulerXRef = useRef<HTMLCanvasElement>(null)
  const rulerYRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const stage = stageRef.current!
    const canvas = paperRef.current!
    const ps = new paper.PaperScope()
    ps.setup(canvas)
    const view = ps.view

    let colors = readChromeColors(stage)
    const overlay = new ps.Layer({ name: 'overlay' })
    const renderer = new DocumentRenderer(ps, colors.selection)
    renderer.setSelection(useUiStore.getState().selection)
    const syncDocument = () => {
      renderer.sync(documentStore.getState().project)
      overlay.bringToFront()
    }
    syncDocument()
    const viewWindow = (): ViewWindow => ({
      left: view.bounds.x,
      top: view.bounds.y,
      zoom: view.zoom,
      width: view.viewSize.width,
      height: view.viewSize.height,
    })
    const drawOverlay = () => renderOverlay(ps, overlay, useUiStore.getState().preview, colors)

    // Coalesce grid/ruler redraws to one per animation frame.
    let frame = 0
    /** Holes are expensive-ish (~7 ms at 17,600): only redraw them when something they depend on changed. */
    let holesDirty = true
    const drawHoleLayer = () =>
      drawHoles(
        holesRef.current!,
        viewWindow(),
        documentStore.getState().project,
        new Set(useUiStore.getState().selection),
        colors,
      )
    const scheduleHoles = () => {
      holesDirty = true
      scheduleChrome()
    }
    const scheduleChrome = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const w = viewWindow()
        const cursor = useUiStore.getState().cursor
        // Ticks stay on the mm grid; labels follow the project's display unit.
        const unit = documentStore.getState().project.displayUnit
        const label = (mm: number) => formatLength(mm, unit, i18next.language, false)
        drawGrid(gridRef.current!, w, colors)
        if (holesDirty) {
          holesDirty = false
          drawHoleLayer()
        }
        drawRuler(rulerXRef.current!, 'x', w, RULER_PX, colors, label, cursor?.[0] ?? null)
        drawRuler(rulerYRef.current!, 'y', w, RULER_PX, colors, label, cursor?.[1] ?? null)
      })
    }
    /** Call after anything that moves or scales the view. */
    const viewChanged = () => {
      useUiStore.getState().setZoom(view.zoom)
      drawOverlay() // the cursor cross is sized in screen px
      scheduleHoles()
    }

    const resize = () => {
      view.viewSize = new ps.Size(stage.clientWidth, stage.clientHeight)
      viewChanged()
    }
    /** Zoom to fit the drawing, or show 100% around the origin when it's empty. */
    const fitContent = () => {
      view.zoom = PX_PER_MM
      view.center = new ps.Point(100, 60)
      const b = emptyBounds()
      for (const piece of documentStore.getState().project.pieces) for (const e of piece.entities) entityBounds(e, b)
      if (!isEmpty(b)) fitBounds(view, new ps.Rectangle(b.minX, b.minY, b.maxX - b.minX, b.maxY - b.minY))
      viewChanged()
    }
    resize()
    fitContent()

    if (import.meta.env.DEV) {
      // Dev-only hook for performance probes (T1.20); stripped from production builds.
      ;(window as unknown as { __leatherdraftDev?: unknown }).__leatherdraftDev = {
        view,
        renderer,
        zoomAt: (factor: number) => zoomAt(view, factor, view.projectToView(view.center)),
        redrawChrome: () => {
          const w = viewWindow()
          drawGrid(gridRef.current!, w, colors)
          drawHoleLayer()
          drawRuler(rulerXRef.current!, 'x', w, RULER_PX, colors, String, null)
          drawRuler(rulerYRef.current!, 'y', w, RULER_PX, colors, String, null)
        },
      }
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(stage)

    const unsubscribeDoc = documentStore.subscribe((s, prev) => {
      if (s.project !== prev.project) {
        syncDocument()
        scheduleHoles() // hole sets live on the raw-canvas layer
      }
      if (s.project.displayUnit !== prev.project.displayUnit) scheduleChrome()
      // A different project was loaded (restore, open, new): show all of it.
      if (s.loads !== prev.loads) fitContent()
    })
    const unsubscribeUi = useUiStore.subscribe((s, prev) => {
      if (s.preview !== prev.preview) drawOverlay()
      if (s.selection !== prev.selection) {
        renderer.setSelection(s.selection)
        scheduleHoles()
      }
      if (s.cursor !== prev.cursor) scheduleChrome()
      if (s.toolCursor !== prev.toolCursor) canvas.style.cursor = s.toolCursor
    })
    canvas.style.cursor = useUiStore.getState().toolCursor

    const scheme = matchMedia('(prefers-color-scheme: dark)')
    const onScheme = () => {
      colors = readChromeColors(stage)
      renderer.setSelection(useUiStore.getState().selection, colors.selection)
      drawOverlay()
      scheduleHoles()
    }
    scheme.addEventListener('change', onScheme)

    const viewPoint = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect()
      return new ps.Point(e.clientX - r.left, e.clientY - r.top)
    }
    const toolEvent = (e: PointerEvent) => {
      const p = view.viewToProject(viewPoint(e))
      return { raw: [p.x, p.y] as [number, number], button: e.button, shift: e.shiftKey, alt: e.altKey }
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (e.ctrlKey || e.metaKey || e.deltaMode !== 0 || Math.abs(e.deltaX) < 1e-6) {
        // Mouse wheel or trackpad pinch (ctrlKey) zooms at the cursor.
        zoomAt(view, Math.pow(WHEEL_ZOOM_STEP, -e.deltaY * (e.deltaMode === 1 ? 30 : 1)), viewPoint(e))
      } else {
        panBy(view, -e.deltaX, -e.deltaY)
      }
      viewChanged()
    }

    let spaceDown = false
    let panning: { x: number; y: number } | null = null
    const onPointerDown = (e: PointerEvent) => {
      if (e.button === 1 || (e.button === 0 && spaceDown)) {
        panning = { x: e.clientX, y: e.clientY }
        canvas.setPointerCapture(e.pointerId)
        canvas.style.cursor = 'grabbing'
        e.preventDefault()
        return
      }
      // Keep keyboard shortcuts working after typing in the input bar.
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
      toolSession.pointerDown(toolEvent(e))
    }
    const onPointerMove = (e: PointerEvent) => {
      if (panning) {
        panBy(view, e.clientX - panning.x, e.clientY - panning.y)
        panning = { x: e.clientX, y: e.clientY }
        viewChanged()
      }
      toolSession.pointerMove(toolEvent(e))
    }
    const onPointerUp = (e: PointerEvent) => {
      if (panning) {
        canvas.releasePointerCapture(e.pointerId)
        canvas.style.cursor = useUiStore.getState().toolCursor
        panning = null
        return
      }
      toolSession.pointerUp(toolEvent(e))
    }
    const onPointerLeave = () => toolSession.pointerLeave()
    const onContextMenu = (e: Event) => e.preventDefault()
    const onDoubleClick = (e: MouseEvent) => toolSession.doubleClick(toolEvent(e as PointerEvent))
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.target instanceof HTMLInputElement) return
      spaceDown = e.type === 'keydown'
      if (!panning) canvas.style.cursor = spaceDown ? 'grab' : useUiStore.getState().toolCursor
      if (spaceDown) e.preventDefault() // don't scroll or press a focused button
    }

    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointerleave', onPointerLeave)
    canvas.addEventListener('contextmenu', onContextMenu)
    canvas.addEventListener('dblclick', onDoubleClick)
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)

    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      unsubscribeDoc()
      unsubscribeUi()
      scheme.removeEventListener('change', onScheme)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointerleave', onPointerLeave)
      canvas.removeEventListener('contextmenu', onContextMenu)
      canvas.removeEventListener('dblclick', onDoubleClick)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
      // PaperScope#remove exists at runtime (clears its projects and tools) but is missing from the typings.
      ;(ps as unknown as { remove(): void }).remove()
    }
  }, [])

  return (
    <div className="canvas-host">
      <div className="ruler-corner" />
      <canvas ref={rulerXRef} className="ruler ruler-x" aria-hidden="true" />
      <canvas ref={rulerYRef} className="ruler ruler-y" aria-hidden="true" />
      <div ref={stageRef} className="stage">
        <canvas ref={gridRef} className="grid-canvas" aria-hidden="true" />
        <canvas ref={holesRef} className="grid-canvas" aria-hidden="true" />
        <canvas
          ref={paperRef}
          className="paper-canvas"
          role="application"
          aria-label={t('canvas.label')}
          aria-describedby="canvas-help"
        />
        <p id="canvas-help" className="visually-hidden">
          {t('canvas.help')}
        </p>
      </div>
    </div>
  )
}
