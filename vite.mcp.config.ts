// Build of the headless MCP server (docs/MCP.md): a Node bundle at dist-mcp/server.mjs, separate from the app.
// Shares the app's `paper` → paper-core alias, so the geometry kernel and paperjs-offset use one Paper.js.

import { defineConfig } from 'vite'

export default defineConfig({
  // The app's icons and fonts aren't needed by the server.
  publicDir: false,
  resolve: {
    // `.js` spelled out: externals are resolved by Node's ESM loader, which needs the extension.
    alias: [{ find: /^paper$/, replacement: 'paper/dist/paper-core.js' }],
  },
  // Bundled so the alias reaches their `import 'paper'` (same reason as vitest's `server.deps.inline`).
  ssr: { noExternal: ['paperjs-offset', 'svg2pdf.js', 'jspdf'] },
  build: {
    ssr: 'src/mcp/server.ts',
    outDir: 'dist-mcp',
    emptyOutDir: true,
    target: 'node20',
    rollupOptions: { output: { entryFileNames: 'server.mjs' } },
  },
})
