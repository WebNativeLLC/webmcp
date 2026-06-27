# Weather WebMCP Widget

A small embeddable weather widget for Tarsk. It looks up current conditions for a US zip code, renders an animated weather UI, and exposes a WebMCP tool that a parent app can call over a `postMessage` bridge.

## Features

- **WebMCP tool** — registers `get-weather` on `document.modelContext` via [`@mcp-b/webmcp-polyfill`](https://www.npmjs.com/package/@mcp-b/webmcp-polyfill)
- **Parent iframe bridge** — answers Tarsk `getTools` / `callTool` messages so the widget works when embedded cross-origin
- **Live weather data** — resolves zip codes with [Zippopotam.us](https://zippopotam.us/) and fetches forecasts from [Open-Meteo](https://open-meteo.com/)
- **Animated UI** — background themes for clear, cloudy, fog, rain, snow, thunderstorm, and more

## MCP Tool

| Name | Description | Input |
|------|-------------|-------|
| `get-weather` | Get current weather for a US zip code | `{ "zipcode": "94107" }` |

On success, the tool returns a text summary and updates the widget. Each widget instance displays one zip code at a time; requesting a different zip returns an error asking you to open another widget.

Example response:

```text
Partly cloudy in San Francisco, CA 94107: 62°F (feels like 59°F), humidity 72%, wind 8 mph
```

## Development

```bash
npm install
npm run dev
```

Open the local Vite URL in a browser. The widget also works standalone, but the parent bridge only activates when the page is embedded in an iframe.

## Build

```bash
npm run build
npm run preview
```

Production output goes to `dist/`. Static assets in `public/` (including `_headers`) are copied into the build.

## Project structure

```
src/
  main.ts                 Entry point — polyfill, bridge, tool registration
  bridge.ts               Parent ↔ iframe postMessage protocol
  weather.ts              Fetch, format, and render weather data
  style.css               Widget layout and typography
  weather-backgrounds.css Animated scene styles
public/
  _headers                Cross-origin isolation headers for embedding
  favicon.svg
```

## Embedding

The widget is designed to run inside a cross-origin iframe in a cross-origin-isolated host (for example, the Tarsk desktop app). `public/_headers` sets:

- `Cross-Origin-Resource-Policy: cross-origin`
- `Cross-Origin-Embedder-Policy: require-corp`
- `Cross-Origin-Opener-Policy: same-origin`

These headers let the parent load the widget under `COEP: require-corp`. The widget’s own API calls to Zippopotam.us and Open-Meteo are CORS-enabled, so they remain allowed under that policy.

When embedded, the widget sends a `widgetReady` beacon to the parent and handles:

| Action | Purpose |
|--------|---------|
| `getTools` | List registered WebMCP tools |
| `callTool` | Execute a tool by name |

All messages use `source: "tarsk-webmcp"`.

## Data sources

| Service | Role |
|---------|------|
| [Zippopotam.us](https://api.zippopotam.us/) | US zip → latitude, longitude, place name |
| [Open-Meteo](https://open-meteo.com/en/docs) | Current temperature, humidity, wind, weather code |

No API keys are required for either service.

## License

Private — part of the `tarsk-webmcp` monorepo.
