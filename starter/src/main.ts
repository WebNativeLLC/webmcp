import { initializeWebMCPPolyfill } from '@mcp-b/webmcp-polyfill'
import './style.css'
import { initializeWidgetBridge } from './bridge.ts'
import { formatToolResponse, renderSkeleton, renderWidget } from './widget.ts'

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
app.innerHTML = `<div id="widget-root" class="widget-root" aria-live="polite"></div>`

const rootEl = app.querySelector<HTMLDivElement>('#widget-root')!

const DEFAULT_MESSAGE = 'Ready. Call set-message to update this widget.'

function showSkeleton() {
  rootEl.className = 'widget-root widget-root--loading'
  rootEl.innerHTML = renderSkeleton()
}

function showMessage(message: string) {
  rootEl.className = 'widget-root'
  rootEl.innerHTML = renderWidget({ message })
}

function showError(message: string) {
  rootEl.className = 'widget-root widget-root--error'
  rootEl.textContent = message
}

document.modelContext.registerTool({
  name: 'set-message',
  description: 'Update the widget with a short message',
  inputSchema: {
    type: 'object',
    properties: {
      message: {
        type: 'string',
        description: 'Text to display in the widget',
      },
    },
    required: ['message'],
  },
  async execute(args) {
    const message = String(args.message).trim()

    if (!message) {
      showError('Message cannot be empty')
      return {
        content: [{ type: 'text', text: 'Message cannot be empty' }],
        isError: true,
      }
    }

    showSkeleton()
    // Simulate async work (fetch, computation, etc.) before updating the UI.
    await new Promise((resolve) => setTimeout(resolve, 300))
    showMessage(message)

    return {
      content: [{ type: 'text', text: formatToolResponse({ message }) }],
    }
  },
})

showMessage(DEFAULT_MESSAGE)
