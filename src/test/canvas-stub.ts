// For component tests (happy-dom): the headless geometry kernel still runs Paper.js setup, which asks a
// <canvas> for a 2D context that happy-dom doesn't implement. The kernel never draws, so a context whose
// methods do nothing is enough. Import this first in any DOM test that touches geometry.

const noop = () => {}
/** Half an em per character at the 16 px svg2pdf probes with: enough for layout code that needs a number. */
const measureText = (text: string) => ({ width: text.length * 8 })
const stubContext = new Proxy(
  {},
  {
    // Pixel-ratio probes must be falsy so Paper falls back to 1; text measuring (svg2pdf lays out labels with
    // it) gets a rough width; everything else is a no-op method.
    get: (_, key) =>
      typeof key === 'string' && /PixelRatio$/.test(key) ? undefined : key === 'measureText' ? measureText : noop,
  },
)

HTMLCanvasElement.prototype.getContext = function getContext() {
  return stubContext
} as unknown as HTMLCanvasElement['getContext']

// svg2pdf compares canvas and SVG text measuring once per font; happy-dom has no SVG layout, so give text
// elements the same rough box.
if (!('getBBox' in SVGElement.prototype)) {
  Object.defineProperty(SVGElement.prototype, 'getBBox', {
    value(this: SVGElement) {
      return { x: 0, y: 0, width: (this.textContent ?? '').length * 8, height: 16 }
    },
  })
}
