import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

/** Export the drawing as SVG through the Export dialog and return the downloaded file's text. */
async function exportSvg(page: Page): Promise<string> {
  await page.getByRole('button', { name: 'Export…' }).click()
  const dialog = page.getByRole('dialog', { name: 'Export' })
  await dialog.getByRole('radio', { name: /^SVG/ }).check()
  const download = page.waitForEvent('download')
  await dialog.getByRole('button', { name: /^Export SVG/ }).click()
  const file = await (await download).path()
  return readFile(file, 'utf8')
}

/** Export in another format through the Export dialog; returns the downloaded bytes. */
async function exportAs(page: Page, format: 'DXF' | 'PNG'): Promise<Buffer> {
  await page.getByRole('button', { name: 'Export…' }).click()
  const dialog = page.getByRole('dialog', { name: 'Export' })
  await dialog.getByRole('radio', { name: new RegExp(`^${format}`) }).check()
  const download = page.waitForEvent('download')
  await dialog.getByRole('button', { name: `Export ${format}` }).click()
  return readFile(await (await download).path())
}

/** Draw a rectangle with typed corner and size. */
async function typedRectangle(page: Page, x: number, y: number, w: number, h: number) {
  await page.getByRole('button', { name: 'Rectangle', exact: true }).click()
  const input = page.getByRole('group', { name: 'Typed input' })
  await input.getByRole('textbox', { name: /^X/ }).fill(String(x))
  await input.getByRole('textbox', { name: /^Y/ }).fill(String(y))
  await input.getByRole('textbox', { name: /^Y/ }).press('Enter')
  await input.getByRole('textbox', { name: /^Width/ }).fill(String(w))
  await input.getByRole('textbox', { name: /^Height/ }).fill(String(h))
  await input.getByRole('textbox', { name: /^Height/ }).press('Enter')
}

/** Page coordinates (CSS px) of a drawing point in mm, via the dev-only view hook. */
async function toPage(page: Page, mm: [number, number]): Promise<[number, number]> {
  return page.evaluate(([x, y]) => {
    type View = { projectToView(p: number[]): { x: number; y: number }; element: HTMLElement }
    const { view } = (window as unknown as { __leatherdraftDev: { view: View } }).__leatherdraftDev
    const p = view.projectToView([x, y])
    const r = view.element.getBoundingClientRect()
    return [r.left + p.x, r.top + p.y] as [number, number]
  }, mm)
}

/** Every `<path d>` in the exported SVG. */
const paths = (svg: string) => [...svg.matchAll(/<path\b[^>]*\sd="([^"]+)"/g)].map((m) => m[1])

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('application', { name: 'Drawing area' })).toBeVisible()
})

test('draw a rectangle with typed values and export it as true-scale SVG', async ({ page }) => {
  await typedRectangle(page, 10, 20, 100, 60)

  const svg = await exportSvg(page)
  // Sized in millimetres with a matching viewBox (1 user unit = 1 mm), cropped to the drawing.
  expect(svg).toMatch(/<svg\b[^>]* width="100mm" height="60mm" viewBox="10 20 100 60"/)
  // The rectangle's corners exactly where they were typed, on the cut layer.
  expect(svg).toMatch(/inkscape:label="cut"><path [^>]*d="M10 20L110 20L110 80L10 80Z"/)
})

test('draw a rectangle with the mouse; undo removes it', async ({ page }) => {
  const canvas = page.getByRole('application', { name: 'Drawing area' })
  await page.keyboard.press('r')
  const box = (await canvas.boundingBox())!
  const at = (fx: number, fy: number) => [box.x + box.width * fx, box.y + box.height * fy] as const
  await page.mouse.move(...at(0.3, 0.3))
  await page.mouse.click(...at(0.3, 0.3))
  await page.mouse.move(...at(0.6, 0.6), { steps: 5 })
  await page.mouse.click(...at(0.6, 0.6))
  expect(paths(await exportSvg(page))).toHaveLength(1)

  await page.getByRole('button', { name: 'Undo' }).click()
  expect(paths(await exportSvg(page))).toHaveLength(0)
})

test('select a rectangle and drag it to move it', async ({ page }) => {
  await typedRectangle(page, 10, 20, 100, 60)
  await page.keyboard.press('Escape') // back to Select
  const edge = await toPage(page, [10, 50])
  const target = await toPage(page, [30, 70])
  await page.mouse.move(...edge)
  await page.mouse.click(...edge)
  await page.mouse.down()
  await page.mouse.move(...target, { steps: 8 })
  await page.mouse.up()

  const [d] = paths(await exportSvg(page))
  const numbers = d.match(/-?[\d.]+/g)!.map(Number)
  const expected = [30, 40, 130, 40, 130, 100, 30, 100]
  expect(numbers).toHaveLength(expected.length)
  // Moved by (20, 20) mm, up to sub-pixel mouse rounding.
  numbers.forEach((n, i) => expect(Math.abs(n - expected[i])).toBeLessThan(0.05))
})

test('add a text label: the text field takes focus after placing it', async ({ page }) => {
  await page.keyboard.press('n')
  const spot = await toPage(page, [20, 30])
  await page.mouse.move(...spot)
  await page.mouse.click(...spot)
  await expect(page.getByRole('textbox', { name: 'Text' })).toBeFocused()
  await page.keyboard.type('Front · cut 2')
  await page.keyboard.press('Enter')

  const svg = await exportSvg(page)
  expect(svg).toMatch(/inkscape:label="notes"><text [^>]*>Front · cut 2<\/text>/)
})

test('export DXF (millimetres, y up) and a PNG preview with its resolution', async ({ page }) => {
  await typedRectangle(page, 10, 20, 100, 60)

  const dxf = (await exportAs(page, 'DXF')).toString('utf8')
  expect(dxf).toMatch(/\$INSUNITS\s+70\s+4\b/)
  expect(dxf.match(/\nLINE\n/g)).toHaveLength(4)
  expect(dxf).toMatch(/\n20\n-80\n/) // the rectangle's bottom edge, y = 80 → −80

  const png = await exportAs(page, 'PNG')
  expect([...png.subarray(1, 4)].map((c) => String.fromCharCode(c)).join('')).toBe('PNG')
  // 110 × 70 mm (5 mm margin) at the default 150 dpi.
  expect(png.readUInt32BE(16)).toBe(Math.round((110 * 150) / 25.4))
  expect(png.readUInt32BE(20)).toBe(Math.round((70 * 150) / 25.4))
  expect(png.subarray(37, 41).toString('latin1')).toBe('pHYs')
})

test('import an SVG for tracing: true size, on the Reference layer, selected', async ({ page }) => {
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Import…' }).click()
  await (
    await chooser
  ).setFiles({
    name: 'old-pattern.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="80mm" height="40mm" viewBox="0 0 80 40">' +
        '<rect x="0" y="0" width="80" height="40"/><circle cx="20" cy="20" r="5"/><text>Old</text></svg>',
    ),
  })
  await expect(page.getByText('Imported 2 shapes from old-pattern.svg, selected; 1 other item skipped.')).toBeVisible()
  await expect(page.getByText('2 objects')).toBeVisible() // Properties panel: the selection

  const svg = await exportSvg(page)
  expect(svg).toMatch(/width="80mm" height="40mm"/)
  expect(svg).toMatch(/inkscape:label="reference"><path [^>]*d="M0 40L0 0L80 0L80 40Z"/)
})

test('rebind a shortcut: the new key picks the tool, the old one is freed', async ({ page }) => {
  await page.getByRole('button', { name: 'Shortcuts…' }).click()
  const dialog = page.getByRole('dialog', { name: 'Keyboard shortcuts' })
  await dialog.getByRole('button', { name: 'Change the shortcut for Trim / extend / split' }).click()
  await page.keyboard.press('l')
  await expect(dialog.getByText('L now goes to Trim / extend / split; Line has no shortcut.')).toBeVisible()
  await dialog.getByRole('button', { name: 'Done' }).click()

  await page.keyboard.press('l')
  await expect(page.getByRole('button', { name: 'Trim / extend / split' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Trim / extend / split' })).toHaveAttribute(
    'title',
    'Trim / extend / split (L)',
  )
  // Remembered across a reload.
  await page.reload()
  await page.keyboard.press('l')
  await expect(page.getByRole('button', { name: 'Trim / extend / split' })).toHaveAttribute('aria-pressed', 'true')
})

test('a PDF exported in Chinese embeds the CJK font; an English one does not', async ({ page }) => {
  await typedRectangle(page, 0, 0, 50, 30)
  const exportPdf = async (button: string, dialogName: string, submit: RegExp) => {
    await page.getByRole('button', { name: button }).click()
    const dialog = page.getByRole('dialog', { name: dialogName })
    await dialog.getByRole('radio', { name: /^PDF/ }).check()
    const download = page.waitForEvent('download')
    await dialog.getByRole('button', { name: submit }).click()
    return (await readFile(await (await download).path())).toString('latin1')
  }
  expect(await exportPdf('Export…', 'Export', /^Export PDF/)).not.toContain('/FontFile2')

  await page.getByRole('combobox', { name: 'Language' }).selectOption('zh-CN')
  const pdf = await exportPdf('导出…', '导出', /^导出 PDF/)
  expect(pdf).toContain('/FontFile2')
  expect(pdf).toMatch(/\/BaseFont \/\w*NotoSansSC/)
})

test('import a DXF in inches: converted to mm, y flipped, on the Reference layer', async ({ page }) => {
  const dxf = [
    '0',
    'SECTION',
    '2',
    'HEADER',
    '9',
    '$INSUNITS',
    '70',
    '1',
    '0',
    'ENDSEC',
    '0',
    'SECTION',
    '2',
    'ENTITIES',
    '0',
    'LINE',
    '8',
    '0',
    '10',
    '0',
    '20',
    '0',
    '11',
    '2',
    '21',
    '1',
    '0',
    'ENDSEC',
    '0',
    'EOF',
    '',
  ].join('\n')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Import…' }).click()
  await (await chooser).setFiles({ name: 'strap.dxf', mimeType: 'application/dxf', buffer: Buffer.from(dxf) })
  await expect(page.getByText('Imported 1 shape from strap.dxf, selected.')).toBeVisible()
  const svg = await exportSvg(page)
  expect(svg).toMatch(/width="50.8mm" height="25.4mm"/)
  expect(svg).toMatch(/inkscape:label="reference"><path [^>]*d="M0 0L50.8 -25.4"/)
})

test('tool groups: right-click a slot to switch to Ellipse; the slot then shows it', async ({ page }) => {
  const palette = page.getByRole('navigation', { name: 'Tools' })
  await palette.getByRole('button', { name: 'Circle', exact: true }).click({ button: 'right' })
  const menu = page.getByRole('menu')
  await expect(menu.getByRole('menuitemradio', { name: /Circle/ })).toHaveAttribute('aria-checked', 'true')
  await menu.getByRole('menuitemradio', { name: /Ellipse/ }).click()
  await expect(menu).toBeHidden()
  const slot = palette.getByRole('button', { name: 'Ellipse', exact: true })
  await expect(slot).toHaveAttribute('aria-pressed', 'true')
  // The circle tool is now in ellipse mode.
  await expect(page.getByRole('combobox', { name: 'Mode' })).toHaveValue('2')
  // Keyboard: → opens the group, Esc closes it again.
  await slot.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('menu')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toBeHidden()
})

test('no browser context menu on the app; language picker is an icon; the side panel collapses', async ({ page }) => {
  const prevented = await page.evaluate(() => {
    const e = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    document.querySelector('.app-header')!.dispatchEvent(e)
    return e.defaultPrevented
  })
  expect(prevented).toBe(true)

  await expect(page.getByRole('combobox', { name: 'Language' })).toBeVisible()
  await expect(page.locator('.toolbar-language')).not.toContainText('Language')

  await page.getByRole('button', { name: 'Hide side panel' }).click()
  await expect(page.getByRole('heading', { name: 'Layers' })).toBeHidden()
  await page.reload()
  await page.getByRole('button', { name: 'Show side panel' }).click()
  await expect(page.getByRole('heading', { name: 'Layers' })).toBeVisible()
})
