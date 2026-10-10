// Records the README demo: drives the app in Chromium and saves one screenshot per step plus a caption, which
// scripts/demo/make-gif.py turns into docs/media/demo.gif. Needs the dev server (dev-only view hook):
//
//   pnpm exec vite --port 5199 --strictPort &
//   pnpm exec tsx scripts/demo/record-demo.ts [out-dir]
//   python3 scripts/demo/make-gif.py [out-dir]

import { chromium, type Page } from '@playwright/test'
import { mkdir, rm, writeFile } from 'node:fs/promises'

const URL = process.env.DEMO_URL ?? 'http://localhost:5199/'
const OUT = process.argv[2] ?? 'demo-frames'
const VIEWPORT = { width: 1200, height: 660 }

/** A drawn arrow cursor that follows the mouse, so it shows in screenshots. */
const CURSOR_SCRIPT = `
addEventListener('DOMContentLoaded', () => {
  const c = document.createElement('div')
  c.innerHTML = '<svg width="20" height="26" viewBox="0 0 20 26"><path d="M1 1 L1 20 L6 15.5 L9.5 23.5 L12.5 22.2 L9 14.5 L15.5 14.5 Z" fill="#fff" stroke="#000" stroke-width="1.4" stroke-linejoin="round"/></svg>'
  Object.assign(c.style, { position: 'fixed', left: '0', top: '0', zIndex: 2147483647, pointerEvents: 'none', transform: 'translate(-200px,-200px)' })
  document.body.appendChild(c)
  addEventListener('mousemove', (e) => { c.style.transform = 'translate(' + (e.clientX - 1) + 'px,' + (e.clientY - 1) + 'px)' }, true)
})`

const frames: { file: string; caption: string; hold: number }[] = []

// The page's dev-only hook, typed locally (this script compiles without the DOM and Paper.js types).
interface Point {
  x: number
  y: number
  constructor: new (x: number, y: number) => Point
}
interface View {
  center: Point
  zoom: number
  element: { getBoundingClientRect(): { left: number; top: number; width: number; height: number } }
  projectToView(p: number[]): Point
}
type Dev = { view: View; zoomAt(factor: number): void }

async function shot(page: Page, caption: string, hold = 1) {
  await page.waitForTimeout(250)
  const file = `${String(frames.length).padStart(2, '0')}.png`
  await page.screenshot({ path: `${OUT}/${file}` })
  frames.push({ file, caption, hold })
}

/** Page coordinates (CSS px) of a drawing point in mm, via the dev-only view hook. */
async function at(page: Page, mm: [number, number]): Promise<[number, number]> {
  return page.evaluate(([x, y]) => {
    const { view } = (globalThis as unknown as { __leatherdraftDev: Dev }).__leatherdraftDev
    const p = view.projectToView([x, y])
    const r = view.element.getBoundingClientRect()
    return [r.left + p.x, r.top + p.y] as [number, number]
  }, mm)
}

async function moveTo(page: Page, mm: [number, number], steps = 12) {
  await page.mouse.move(...(await at(page, mm)), { steps })
}

async function clickAt(page: Page, mm: [number, number]) {
  await moveTo(page, mm)
  await page.mouse.click(...(await at(page, mm)))
}

async function slowType(page: Page, text: string) {
  await page.keyboard.type(text, { delay: 60 })
}

async function main() {
  await rm(OUT, { recursive: true, force: true })
  await mkdir(OUT, { recursive: true })
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2, colorScheme: 'dark' })
  await context.addInitScript(CURSOR_SCRIPT)
  const page = await context.newPage()
  await page.goto(URL)
  await page.getByRole('application', { name: 'Drawing area' }).waitFor()

  // Frame the piece (up to 112 × 70 mm) with room around it.
  await page.evaluate(() => {
    const hook = (globalThis as unknown as { __leatherdraftDev: Dev }).__leatherdraftDev
    const view = hook.view
    const { width, height } = view.element.getBoundingClientRect()
    view.center = new view.center.constructor(56, 35)
    hook.zoomAt(Math.min(width / 135, height / 90) / view.zoom)
  })
  // A tiny real wheel step, so the status bar and rulers pick up the new zoom.
  await page.mouse.move(...(await at(page, [56, 35])))
  await page.mouse.wheel(0, 1)
  const name = page.getByRole('textbox', { name: 'Project name' })
  await name.fill('Card wallet')
  await name.press('Enter')
  await page.mouse.move(480, 300)
  await shot(page, 'LeatherDraft: leather patterns in millimetres, printed and cut at true 1:1 scale', 2)

  // Rectangle with typed values.
  await page.keyboard.press('r')
  await moveTo(page, [0, 0])
  await page.mouse.click(...(await at(page, [0, 0])))
  await moveTo(page, [60, 40], 15)
  await slowType(page, '100')
  await page.keyboard.press('Tab')
  await slowType(page, '70')
  await shot(page, 'Rectangle (R): click a corner, then type 100 Tab 70')
  await page.keyboard.press('Enter')
  await shot(page, 'Exact size: 100 × 70 mm on the Cut layer')

  // Fillet every corner.
  await page.keyboard.press('f')
  await moveTo(page, [3, 3])
  await slowType(page, '6')
  await page.keyboard.down('Shift')
  await moveTo(page, [1, 1], 4)
  await shot(page, 'Fillet (F): type 6, Shift-click rounds every corner')
  await page.mouse.click(...(await at(page, [1, 1])))
  await page.keyboard.up('Shift')
  await shot(page, 'All four corners rounded at r 6 mm')

  // Linked stitch line.
  await page.keyboard.press('k')
  await clickAt(page, [50, 0])
  await moveTo(page, [50, 20])
  await shot(page, 'Stitch line (K): click the outline, then the inside')
  await page.mouse.click(...(await at(page, [50, 20])))

  // Chisel holes on the stitch line.
  await page.keyboard.press('h')
  await moveTo(page, [50, 3.5])
  await shot(page, 'Stitch holes (H): 3.85 mm chisel pitch, a hole on every corner', 2)
  await page.mouse.click(...(await at(page, [50, 3.5])))

  // Label.
  await page.keyboard.press('n')
  await page.getByRole('combobox', { name: 'Mode' }).waitFor()
  await clickAt(page, [24, 38])
  const text = page.getByRole('textbox', { name: 'Text' })
  await text.waitFor()
  await text.focus()
  await slowType(page, 'Card wallet · cut 2')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Escape')
  await page.mouse.move(700, 470, { steps: 10 })
  await shot(page, 'Label (N): piece name and quantity on the Notes layer')

  // Resize the outline: stitch line and holes follow.
  await page.keyboard.press('v')
  await clickAt(page, [0, 35])
  await shot(page, 'Select the outline: its numbers are in Properties')
  const width = page.getByRole('textbox', { name: 'W', exact: true })
  await width.click()
  await width.fill('')
  await width.pressSequentially('112', { delay: 80 })
  await width.press('Enter')
  await shot(page, 'Make it 112 mm wide: the stitch line and holes follow', 2)

  await page.keyboard.press('Escape')

  // Export dialog.
  await page.getByRole('button', { name: 'Export…' }).click()
  const dialog = page.getByRole('dialog', { name: 'Export' })
  await dialog.getByRole('radio', { name: /^PDF/ }).check()
  await shot(page, 'Export: tiled PDF at 1:1 with a 50 mm check square, or SVG, DXF, PNG', 2)
  await dialog.getByRole('button', { name: 'Cancel' }).click()

  // Interface languages.
  await page.getByRole('combobox', { name: 'Language' }).selectOption('zh-CN')
  await page.getByRole('button', { name: '导出…' }).waitFor()
  await page.mouse.move(600, 300, { steps: 8 })
  await shot(page, 'Ten interface languages (here Simplified Chinese) · works offline, files stay on your device', 2)

  await writeFile(`${OUT}/frames.json`, JSON.stringify(frames, null, 2))
  await browser.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
