import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // T3.7 Installable, offline PWA: every built file is precached, including the lazy PDF chunk, so drafting
    // and export both work offline (PRD). Updates wait for the user ("prompt"): reloading mid-drawing would be
    // disruptive even with autosave. See src/app/useAppUpdate.ts.
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      // The glob below already precaches the icons; don't list them twice.
      includeManifestIcons: false,
      manifest: {
        name: 'LeatherDraft',
        short_name: 'LeatherDraft',
        description: 'Draft leather patterns in millimetres and print them at true 1:1 scale.',
        theme_color: '#8a4b1f',
        background_color: '#f6f5f2',
        display: 'standalone',
        start_url: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        // (manifest.webmanifest is added by the plugin itself.)
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // Headroom above workbox's 2 MiB default (the app chunk is ~760 KB raw today).
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: 'index.html',
        // T4.2 The CJK PDF font isn't precached (most users never need its 2 MB); once a Chinese PDF has
        // fetched it, it is kept so that works offline too.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('.ttf'),
            handler: 'CacheFirst',
            options: { cacheName: 'leatherdraft-fonts', expiration: { maxEntries: 4 } },
          },
        ],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: {
    alias: [
      // paperjs-offset does `import paper from 'paper'` (the full build, with the PaperScript compiler).
      // Point it at the same paper-core module the app uses: one Paper.js instance (its instanceof checks
      // pass and items interoperate), and the full build stays out of the bundle.
      { find: /^paper$/, replacement: 'paper/dist/paper-core' },
    ],
  },
  build: {
    // The PRD budget is 600 KB *gzipped* for the initial bundle (enforced in CI by T3.9);
    // this raw-size warning would otherwise fire long before that.
    chunkSizeWarningLimit: 1500,
  },
  test: {
    // Geometry, model and export tests run in Node; component tests opt into a DOM with a
    // `// @vitest-environment happy-dom` comment.
    // Do NOT add jsdom to the dependency tree: when Paper.js's Node build can `require('jsdom')` it builds
    // its own jsdom window and then needs the native `canvas` package, so every geometry test fails.
    // Without jsdom it uses a headless stub, which is all the geometry kernel needs.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    // Inline so the `paper` alias above applies to it in tests too (Node would otherwise load the full build).
    // svg2pdf.js's ES build expects jspdf's ES build; left to Node, jspdf resolves to its CommonJS build and
    // svg2pdf finds no `jsPDF` export.
    server: { deps: { inline: ['paperjs-offset', 'svg2pdf.js', 'jspdf'] } },
  },
})
