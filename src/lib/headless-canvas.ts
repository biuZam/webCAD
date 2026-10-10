// A do-nothing 2D canvas for headless DOMs (happy-dom in component tests and in the MCP server): the geometry
// kernel still runs Paper.js setup, which asks a <canvas> for a 2D context that happy-dom doesn't implement,
// and svg2pdf measures text with it. The kernel never draws, so a context whose methods do nothing is enough.

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

/** Patch the global HTMLCanvasElement and SVGElement prototypes. Call once a DOM is installed. */
export function stubCanvas() {
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
}
