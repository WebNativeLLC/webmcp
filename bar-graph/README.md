# Bar Graph WebMCP Widget

Embeddable bar chart widget for Tarsk. An agent passes labeled numeric data and display options; the widget renders a bar graph and returns a text summary.

## Tool: `show-bar-graph`

### Required input

| Field | Type | Description |
|-------|------|-------------|
| `data` | `{ title, value }[]` | Rows to plot — `title` is the category label, `value` is the bar length |

### Display options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `chartTitle` | string | — | Heading above the chart |
| `orientation` | `"vertical"` \| `"horizontal"` | `"vertical"` | Bar direction |
| `showValues` | boolean | `true` | Show value labels on bars |
| `valuePrefix` | string | `""` | Prefix for labels (e.g. `"$"`) |
| `valueSuffix` | string | `""` | Suffix for labels (e.g. `"%"`, `"k"`) |
| `sort` | see below | `"none"` | Sort before rendering |
| `colorScheme` | see below | `"default"` | Bar colors |
| `maxValue` | number | auto | Fixed scale maximum |
| `decimalPlaces` | 0–4 | `0` | Decimal places in labels |

**`sort` values:** `none`, `value-desc`, `value-asc`, `title-asc`, `title-desc`

**`colorScheme` values:** `default` (multi-color), `blue`, `green`, `warm`, `mono`

### Example

```json
{
  "chartTitle": "Q1 Revenue by Region",
  "data": [
    { "title": "North", "value": 420 },
    { "title": "South", "value": 580 },
    { "title": "East", "value": 310 },
    { "title": "West", "value": 495 }
  ],
  "orientation": "vertical",
  "valuePrefix": "$",
  "valueSuffix": "k",
  "sort": "value-desc",
  "colorScheme": "blue"
}
```

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

Production output goes to `dist/`. Deploy the **contents** of `dist/` (not the folder itself) to any static host that supports custom headers (for example Cloudflare Pages with `_headers`). Asset URLs are relative (`base: './'`), so the widget works at the site root or under a subpath such as `/bar-graph/`.

After deploying, confirm the browser can load `./assets/index-*.js` from the same URL you give Tarsk — a 404 on that script produces the handshake timeout error.

## Project structure

```
src/
  main.ts       Entry point — polyfill, bridge, tool registration
  bridge.ts     Parent ↔ iframe postMessage protocol
  bar-graph.ts  Parse, render, and format chart data
  style.css     Widget layout and chart styles
public/
  _headers      Cross-origin isolation headers for embedding
  favicon.svg
```
