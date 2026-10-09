// For component tests (happy-dom): the headless geometry kernel still runs Paper.js setup, which asks a
// <canvas> for a 2D context that happy-dom doesn't implement. The kernel never draws, so a context whose
// methods do nothing is enough. Import this first in any DOM test that touches geometry.

const noop = () => {}
const stubContext = new Proxy(
  {},
  {
    // Pixel-ratio probes must be falsy so Paper falls back to 1; everything else is a no-op method.
    get: (_, key) => (typeof key === 'string' && /PixelRatio$/.test(key) ? undefined : noop),
  },
)

HTMLCanvasElement.prototype.getContext = function getContext() {
  return stubContext
} as unknown as HTMLCanvasElement['getContext']
