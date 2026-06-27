# tarsk-webmcp

Embeddable WebMCP widgets for Tarsk. Each app in this repo is a small web page that exposes tools an AI agent can call — and renders a live UI the user sees when those tools run.

## Concept

**WebMCP** is a browser API for registering structured tools on a web page. An agent discovers tools by name, passes typed arguments, and reads back text results. The page can update its UI at the same time, so the user sees what the agent asked for.

In Tarsk, widgets run inside cross-origin iframes. The host cannot call `document.modelContext` directly in the child frame, so each widget includes a **`postMessage` bridge** that forwards Tarsk's `getTools` / `callTool` protocol to the WebMCP polyfill running inside the iframe.

```
Tarsk (parent)                    Widget (iframe)
     │                                  │
     │  getTools / callTool             │
     ├─────────────────────────────────►│  bridge.ts
     │                                  │       ↓
     │                                  │  document.modelContext
     │                                  │       ↓
     │  callToolResponse                │  your tool + UI
     │◄─────────────────────────────────┤
```

Each widget is a self-contained Vite + TypeScript app. Tools are registered with [`@mcp-b/webmcp-polyfill`](https://www.npmjs.com/package/@mcp-b/webmcp-polyfill). Deploy the built `dist/` folder to any static host that supports custom headers.

## Repository

| Folder | Description |
|--------|-------------|
| [`starter/`](./starter/) | Minimal template — copy this to start a new widget |
| [`weather/`](./weather/) | Full example — US weather by zip code with animated UI |
| [`bar-graph/`](./bar-graph/) | Bar chart from labeled numeric data with agent display options |

Each folder is an independent npm project with its own `package.json`. There is no root workspace; `cd` into the app you want to work on.

## Getting started

Copy the starter template and build your widget:

```bash
cp -r starter my-widget
cd my-widget
npm install
npm run dev
```

Replace the example `set-message` tool and UI in `src/widget.ts` and `src/main.ts` with your domain logic. See [`starter/AGENTS.md`](./starter/AGENTS.md) for architecture, tool conventions, embedding headers, and a implementation checklist.

To explore a complete app first:

```bash
cd weather
npm install
npm run dev
```

## How a widget is structured

Every app follows the same layout:

```
src/
  main.ts     Polyfill init, tool registration, UI orchestration
  bridge.ts   Parent ↔ iframe protocol (usually unchanged)
  widget.ts   Domain logic, rendering, agent-facing text (weather.ts in weather/)
  style.css   Full-viewport widget styles
public/
  _headers    COEP/CORP headers required for Tarsk embedding
```

Initialization order matters: **bridge first**, then polyfill, then `registerTool`.

## Embedding in Tarsk

Widgets must be deployed with cross-origin isolation headers so Tarsk can load them under `Cross-Origin-Embedder-Policy: require-corp`. The `public/_headers` file in each app sets:

- `Cross-Origin-Resource-Policy: cross-origin`
- `Cross-Origin-Embedder-Policy: require-corp`
- `Cross-Origin-Opener-Policy: same-origin`

When embedded, the widget announces readiness with a `widgetReady` message and handles tool discovery and execution over the `tarsk-webmcp` protocol. Details are in [`starter/AGENTS.md`](./starter/AGENTS.md).

## References

- WebMCP spec: [webmachinelearning/webmcp](https://github.com/webmachinelearning/webmcp)
- Polyfill: [`@mcp-b/webmcp-polyfill`](https://www.npmjs.com/package/@mcp-b/webmcp-polyfill)
- Implementation guide: [`starter/AGENTS.md`](./starter/AGENTS.md)
