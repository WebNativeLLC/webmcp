# WebMCP Widget Starter

Minimal template for building embeddable WebMCP widgets for Tarsk. Copy this folder, rename it, and replace the example UI and tool with your own domain logic.

See [`AGENTS.md`](./AGENTS.md) for the WebMCP concept, architecture, and implementation patterns used here.

For a full real-world example, see the [`weather`](../weather) app in this repo.

## Quick start

```bash
npm install
npm run dev
```

## Example tool

| Name | Description | Input |
|------|-------------|-------|
| `set-message` | Update the widget with a short message | `{ "message": "Hello from the agent" }` |

## Build

```bash
npm run build
npm run preview
```

Production output goes to `dist/`. Deploy the `dist/` folder to any static host that supports custom headers (for example Cloudflare Pages with `_headers`).

## Project structure

```
src/
  main.ts       Entry point — polyfill, bridge, tool registration
  bridge.ts     Parent ↔ iframe postMessage protocol (usually leave as-is)
  widget.ts     Your UI rendering and domain helpers
  style.css     Widget styles
public/
  _headers      Cross-origin isolation headers for Tarsk embedding
  favicon.svg
```

## Customizing

1. Rename the package in `package.json`.
2. Replace `widget.ts` with your state, fetch logic, and HTML rendering.
3. Register one or more tools in `main.ts` with `document.modelContext.registerTool(...)`.
4. Style the widget in `style.css`.
5. Keep `bridge.ts` and `public/_headers` unless you change the host integration.
