# WebMCP Widget Development

This document explains the concept and technique behind WebMCP widgets in this repo. Use it when building a new widget from the `starter` template or extending an existing app like `weather`.

## What is WebMCP?

WebMCP is a browser API that lets a web page expose **tools** — structured actions an AI agent can discover and call. Tools are registered on `document.modelContext` with a name, description, JSON Schema for inputs, and an `execute` handler.

When an agent calls a tool:

1. The runtime validates arguments against the schema.
2. Your `execute` function runs (fetch data, update UI, etc.).
3. You return a result the agent can read, usually `{ content: [{ type: 'text', text: '...' }] }`.

The [`@mcp-b/webmcp-polyfill`](https://www.npmjs.com/package/@mcp-b/webmcp-polyfill) package provides a strict polyfill for `document.modelContext` in browsers that do not yet ship WebMCP natively.

## Widget architecture

Each app in this repo is a small Vite + TypeScript SPA with four layers:

```
┌─────────────────────────────────────────┐
│  Parent host (e.g. Tarsk)               │
│  embeds widget in cross-origin iframe   │
└─────────────────┬───────────────────────┘
                  │ postMessage
                  │ (tarsk-webmcp protocol)
┌─────────────────▼───────────────────────┐
│  bridge.ts                              │
│  getTools / callTool ↔ modelContext     │
├─────────────────────────────────────────┤
│  main.ts                                │
│  polyfill init + registerTool(...)      │
├─────────────────────────────────────────┤
│  widget.ts (your domain code)           │
│  fetch, render, format responses        │
├─────────────────────────────────────────┤
│  style.css                              │
│  full-viewport widget UI                │
└─────────────────────────────────────────┘
```

### 1. Polyfill and tool registration (`main.ts`)

Always initialize in this order:

1. **`initializeWidgetBridge()`** — attach the parent iframe listener first, so `getTools` / `callTool` work even if the polyfill throws.
2. **`initializeWebMCPPolyfill()`** — install `document.modelContext`.
3. **`document.modelContext.registerTool(...)`** — declare tools the agent can use.

Minimal tool shape:

```ts
document.modelContext.registerTool({
  name: 'set-message',
  description: 'Update the widget with a short message',
  inputSchema: {
    type: 'object',
    properties: {
      message: { type: 'string', description: 'Text to display' },
    },
    required: ['message'],
  },
  async execute(args) {
    const message = String(args.message).trim()
    if (!message) {
      return {
        content: [{ type: 'text', text: 'Message cannot be empty' }],
        isError: true,
      }
    }

    // Update your UI here, then return text for the agent.
    return {
      content: [{ type: 'text', text: `Updated widget: ${message}` }],
    }
  },
})
```

**Tool result conventions**

| Field | Purpose |
|-------|---------|
| `content` | Array of content blocks; use `{ type: 'text', text: '...' }` for agent-readable output |
| `isError: true` | Signal failure without throwing; parent and agent treat this as an error |

Update the visible widget inside `execute` so the user sees the same outcome the agent requested.

### 2. Parent iframe bridge (`bridge.ts`)

The polyfill registers tools **inside** the iframe only. Tarsk (and similar hosts) embed the widget cross-origin and communicate over `postMessage`.

The bridge implements the `tarsk-webmcp` protocol:

| Message | Direction | Purpose |
|---------|-----------|---------|
| `widgetReady` | widget → parent | Beacon when the bridge is listening |
| `getTools` | parent → widget | List registered tools |
| `getToolsResponse` | widget → parent | Tool metadata (name, description, inputSchema) |
| `callTool` | parent → widget | Execute a tool by name with arguments |
| `callToolResponse` | widget → parent | Serialized tool result |

All messages include `source: "tarsk-webmcp"`. Request/response pairs are correlated with `requestId`.

You typically **do not edit** `bridge.ts` when creating a new widget. It forwards to `document.modelContext.getTools()` and `document.modelContext.executeTool()`.

**WebKit note:** replies use `window.parent` when `event.source` is null, which is common in WKWebView.

### 3. Domain and UI (`widget.ts`)

Keep domain logic separate from wiring:

- **State types** — what the widget displays
- **Data fetching** — async calls to your APIs
- **`renderWidget()`** — return HTML for the current state
- **`renderSkeleton()`** — optional loading placeholder
- **`formatToolResponse()`** — concise text summary for the agent

Escape user-controlled strings before inserting them into HTML (see `escapeHtml` in the starter).

`main.ts` should orchestrate: show skeleton → fetch → render → return formatted text.

### 4. Embedding headers (`public/_headers`)

Tarsk runs with cross-origin isolation (`Cross-Origin-Embedder-Policy: require-corp`). The widget must declare:

```
Cross-Origin-Resource-Policy: cross-origin
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
```

Without `Cross-Origin-Resource-Policy: cross-origin`, the parent cannot load the iframe.

If your widget fetches third-party APIs, those responses must be **CORS-enabled** to work under `require-corp`. Prefer APIs that send proper `Access-Control-Allow-Origin` headers.

## Development workflow

1. Copy `starter/` to a new folder (or work in place and rename).
2. Run `npm install && npm run dev`.
3. Implement your UI and tools in `widget.ts` and `main.ts`.
4. Test standalone in the browser (bridge logs to console; `widgetReady` is skipped when not embedded).
5. Run `npm run build` and deploy `dist/` with headers intact.
6. Test embedded in Tarsk.

## Patterns from the weather example

The [`weather`](../weather) app demonstrates patterns you can adopt for richer widgets:

| Pattern | Where | Why |
|---------|-------|-----|
| Async load with skeleton | `loadWeather()` in `main.ts` | Agent sees loading state in the iframe while data loads |
| External API fetch | `fetchWeather()` in `weather.ts` | Domain logic isolated from WebMCP wiring |
| Themed UI from data | `weatherCodeToTheme()` | Visual feedback tied to tool results |
| Single-instance constraint | `displayedZip` guard in `main.ts` | One widget, one primary view; errors guide the agent to open another instance |
| Animated backgrounds | `weather-backgrounds.css` | Optional polish; not required for WebMCP |

## Checklist for a new widget

- [ ] `initializeWidgetBridge()` called before polyfill init
- [ ] At least one `registerTool` with clear `name`, `description`, and `inputSchema`
- [ ] `execute` updates the UI and returns `{ content: [...] }`
- [ ] Errors return `isError: true` instead of uncaught exceptions
- [ ] User input escaped in HTML rendering
- [ ] `public/_headers` deployed with the build
- [ ] Third-party fetches verified CORS-compatible under COEP

## References

- WebMCP spec: [webmachinelearning/webmcp](https://github.com/webmachinelearning/webmcp)
- Polyfill: [`@mcp-b/webmcp-polyfill`](https://www.npmjs.com/package/@mcp-b/webmcp-polyfill)
- Full example: [`weather/`](../weather)
