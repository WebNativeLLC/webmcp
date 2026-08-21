import { defineConfig } from 'vite'

// Relative asset URLs so the widget works when deployed under a subpath
// (e.g. https://mcp.tarsk.io/weather/) and not only at the site root.
export default defineConfig({
  base: './',
  // The direct cross-origin iframe is only allowed because of the renderer's
  // COEP, so the dev server must send Cross-Origin-Resource-Policy: cross-origin
  // or the widget load is blocked and nothing renders.
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    },
  },
})
