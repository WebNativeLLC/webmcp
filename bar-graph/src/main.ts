import { initializeWebMCPPolyfill } from '@mcp-b/webmcp-polyfill'
import './style.css'
import { initializeWidgetBridge } from './bridge.ts'
import {
  formatToolResponse,
  parseBarGraphInput,
  renderEmpty,
  renderSkeleton,
  renderWidget,
  type BarGraphState,
} from './widget.ts'

initializeWidgetBridge()

try {
  initializeWebMCPPolyfill()
} catch (error) {
  console.error('[webmcp-widget] initializeWebMCPPolyfill failed', error)
}

const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `<div id="widget-root" class="widget-root" aria-live="polite"></div>`

const rootEl = app.querySelector<HTMLDivElement>('#widget-root')!

function showSkeleton() {
  rootEl.className = 'widget-root widget-root--loading'
  rootEl.innerHTML = renderSkeleton()
}

function showChart(state: BarGraphState) {
  rootEl.className = 'widget-root'
  rootEl.innerHTML = renderWidget(state)
}

function showEmpty() {
  rootEl.className = 'widget-root widget-root--empty'
  rootEl.innerHTML = renderEmpty()
}

function showError(message: string) {
  rootEl.className = 'widget-root widget-root--error'
  rootEl.textContent = message
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
      showSkeleton()
      await new Promise((resolve) => setTimeout(resolve, 200))
      showChart(state)
      return {
        content: [{ type: 'text', text: formatToolResponse(state) }],
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
