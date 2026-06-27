import { initializeWebMCPPolyfill } from '@mcp-b/webmcp-polyfill'
import './style.css'
import {
  barGraphStateClassName,
  formatBarGraphText,
  parseBarGraphInput,
  renderBarGraph,
  renderEmpty,
  SAMPLE_BAR_GRAPH_STATE,
  type BarGraphState,
} from './bar-graph.ts'
import { initializeWidgetBridge } from './bridge.ts'

// Attach the parent<->iframe message bridge FIRST and unconditionally, so the
// widget always answers getTools/callTool even if polyfill init below throws
// (otherwise the parent's handshake would silently time out).
initializeWidgetBridge()

try {
  initializeWebMCPPolyfill()
} catch (error) {
  console.error('[webmcp-widget] initializeWebMCPPolyfill failed', error)
}

const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `<div id="bar-graph" class="bar-graph-state" aria-live="polite"></div>`

const barGraphEl = app.querySelector<HTMLDivElement>('#bar-graph')!

function showBarGraph(state: BarGraphState) {
  barGraphEl.className = barGraphStateClassName(state)
  barGraphEl.innerHTML = renderBarGraph(state)
}

function showEmpty() {
  barGraphEl.className = 'bar-graph-state bar-graph-state--empty'
  barGraphEl.innerHTML = renderEmpty()
}

function showError(message: string) {
  barGraphEl.className = 'bar-graph-state bar-graph-state--error'
  barGraphEl.textContent = message
}

function loadBarGraph(state: BarGraphState): BarGraphState {
  showBarGraph(state)
  return state
}

document.modelContext.registerTool({
  name: 'show-bar-graph',
  description:
    'Display a bar chart from labeled numeric data. Each row needs a title (category label) and value (bar length).',
  inputSchema: {
    type: 'object',
    properties: {
      chartTitle: {
        type: 'string',
        description: 'Optional heading shown above the chart',
      },
      data: {
        type: 'array',
        description: 'Rows to plot; each item has a category title and numeric value',
        items: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Category label for this bar',
            },
            value: {
              type: 'number',
              description: 'Numeric value determining bar length',
            },
          },
          required: ['title', 'value'],
        },
      },
      orientation: {
        type: 'string',
        enum: ['vertical', 'horizontal'],
        description: 'Bar direction. Default: vertical',
      },
      showValues: {
        type: 'boolean',
        description: 'Show formatted value labels on each bar. Default: true',
      },
      valuePrefix: {
        type: 'string',
        description: 'Text before each value (e.g. "$")',
      },
      valueSuffix: {
        type: 'string',
        description: 'Text after each value (e.g. "%", "k", " ms")',
      },
      sort: {
        type: 'string',
        enum: ['none', 'value-desc', 'value-asc', 'title-asc', 'title-desc'],
        description: 'Sort bars before rendering. Default: none (input order)',
      },
      colorScheme: {
        type: 'string',
        enum: ['default', 'blue', 'green', 'warm', 'mono'],
        description: 'Bar color palette. Default: default (multi-color)',
      },
      maxValue: {
        type: 'number',
        description:
          'Fixed scale maximum for bar lengths. Bars still grow to their true value; use when comparing across charts. Default: auto from data',
      },
      decimalPlaces: {
        type: 'integer',
        minimum: 0,
        maximum: 4,
        description: 'Decimal places in value labels. Default: 0',
      },
    },
    required: ['data'],
  },
  async execute(args) {
    try {
      const { state } = parseBarGraphInput(args)
      const chart = loadBarGraph(state)
      return {
        content: [{ type: 'text', text: formatBarGraphText(chart) }],
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid bar graph input'
      showError(message)
      return {
        content: [{ type: 'text', text: message }],
        isError: true,
      }
    }
  },
})

showEmpty()

barGraphEl.addEventListener('click', (event) => {
  const target = event.target
  if (!(target instanceof Element)) return
  if (target.closest('#load-sample-chart')) {
    loadBarGraph(SAMPLE_BAR_GRAPH_STATE)
  }
})
