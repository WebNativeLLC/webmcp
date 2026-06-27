import { defineConfig } from 'vite'

// Relative asset URLs so the widget works when deployed under a subpath
// (e.g. https://example.com/bar-graph/) and not only at the site root.
export default defineConfig({
  base: './',
})
