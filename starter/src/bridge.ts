/**
 * Parent <-> iframe postMessage bridge for the WebMCP widget.
 *
 * `@mcp-b/webmcp-polyfill` installs `document.modelContext` (registerTool /
 * getTools / executeTool) inside this page, but does not expose those tools to
 * a parent frame. This bridge listens for the Tarsk WebMCP widget protocol and
 * answers `getTools` / `callTool` requests using `document.modelContext`.
 */

const WIDGET_MESSAGE_SOURCE = 'tarsk-webmcp'

const WIDGET_MESSAGE_ACTIONS = {
  widgetReady: 'widgetReady',
  getTools: 'getTools',
  getToolsResponse: 'getToolsResponse',
  callTool: 'callTool',
  callToolResponse: 'callToolResponse',
} as const

interface ToolInfo {
  name: string
  description: string
  /** JSON-stringified JSON Schema. */
  inputSchema?: string
  title?: string
}

interface ModelContextLike {
  getTools(): Promise<ToolInfo[]>
  executeTool(
    tool: { name: string },
    inputArgsJson: string,
    options?: unknown,
  ): Promise<string | null>
}

interface GetToolsRequest {
  source: typeof WIDGET_MESSAGE_SOURCE
  requestId: string
  action: typeof WIDGET_MESSAGE_ACTIONS.getTools
  options?: { fromOrigins?: string[] }
}

interface CallToolRequest {
  source: typeof WIDGET_MESSAGE_SOURCE
  requestId: string
  action: typeof WIDGET_MESSAGE_ACTIONS.callTool
  name: string
  arguments?: Record<string, unknown>
}

type WidgetRequest = GetToolsRequest | CallToolRequest

function getModelContext(): ModelContextLike | null {
  const ctx = (document as unknown as { modelContext?: ModelContextLike }).modelContext
  return ctx ?? null
}

function isWidgetRequest(value: unknown): value is WidgetRequest {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (
    candidate.source === WIDGET_MESSAGE_SOURCE &&
    typeof candidate.requestId === 'string' &&
    (candidate.action === WIDGET_MESSAGE_ACTIONS.getTools ||
      candidate.action === WIDGET_MESSAGE_ACTIONS.callTool)
  )
}

function wlog(...args: unknown[]): void {
  console.info('[webmcp-widget]', ...args)
}

function reply(event: MessageEvent, message: object): void {
  // WebKit / WKWebView frequently delivers messages from the parent frame with
  // a null `event.source`, so fall back to `window.parent` (the only frame that
  // talks to this widget). Without this, replies silently never get sent.
  const target = (event.source as Window | null) ?? (window.parent !== window ? window.parent : null)
  if (!target) {
    console.warn('[webmcp-widget] cannot reply: no target window (event.source and window.parent both unavailable)')
    return
  }
  // `event.origin` can be "null"/empty in sandboxed contexts; "*" is safe here.
  const targetOrigin = event.origin && event.origin !== 'null' ? event.origin : '*'
  wlog('-> reply', (message as { action?: string }).action, 'to', targetOrigin)
  target.postMessage(message, targetOrigin)
}

function parseInputSchema(raw: string | undefined): Record<string, unknown> | undefined {
  if (!raw) return undefined
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return undefined
  }
}

async function handleGetTools(event: MessageEvent, request: GetToolsRequest): Promise<void> {
  let tools: ReturnType<typeof mapTools> = []
  try {
    const ctx = getModelContext()
    if (!ctx) wlog('getTools: document.modelContext is not available')
    const rawTools = ctx ? await ctx.getTools() : []
    wlog('getTools ->', rawTools.length, 'tool(s):', rawTools.map((t) => t.name))
    tools = mapTools(rawTools)
  } catch (error) {
    // Always reply (with whatever we have) so the parent never just times out.
    console.error('[webmcp-widget] getTools failed', error)
  }
  reply(event, {
    source: WIDGET_MESSAGE_SOURCE,
    requestId: request.requestId,
    action: WIDGET_MESSAGE_ACTIONS.getToolsResponse,
    tools,
  })
}

function mapTools(rawTools: ToolInfo[]): Array<{
  name: string
  description: string
  inputSchema?: Record<string, unknown>
  title?: string
}> {
  return rawTools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: parseInputSchema(tool.inputSchema),
    title: tool.title,
  }))
}

async function handleCallTool(event: MessageEvent, request: CallToolRequest): Promise<void> {
  const ctx = getModelContext()
  if (!ctx) {
    reply(event, {
      source: WIDGET_MESSAGE_SOURCE,
      requestId: request.requestId,
      action: WIDGET_MESSAGE_ACTIONS.callToolResponse,
      result: null,
      isError: true,
      error: 'document.modelContext is not available',
    })
    return
  }

  try {
    wlog('callTool', request.name, 'args', request.arguments ?? {})
    const serialized = await ctx.executeTool(
      { name: request.name },
      JSON.stringify(request.arguments ?? {}),
    )
    const result = serialized ? JSON.parse(serialized) : null
    const isError = Boolean(result && typeof result === 'object' && result.isError)
    reply(event, {
      source: WIDGET_MESSAGE_SOURCE,
      requestId: request.requestId,
      action: WIDGET_MESSAGE_ACTIONS.callToolResponse,
      result,
      isError,
    })
  } catch (error) {
    reply(event, {
      source: WIDGET_MESSAGE_SOURCE,
      requestId: request.requestId,
      action: WIDGET_MESSAGE_ACTIONS.callToolResponse,
      result: null,
      isError: true,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

function announceReady(): void {
  const parent = window.parent
  if (!parent || parent === window) {
    wlog('not embedded in a parent frame; skipping widgetReady beacon')
    return
  }
  // Target origin "*" is fine: the beacon carries no sensitive data and the
  // widget does not reliably know the parent's origin.
  wlog('-> widgetReady beacon')
  parent.postMessage({ source: WIDGET_MESSAGE_SOURCE, action: WIDGET_MESSAGE_ACTIONS.widgetReady }, '*')
}

export function initializeWidgetBridge(): void {
  window.addEventListener('message', (event: MessageEvent) => {
    const data = event.data
    if (!isWidgetRequest(data)) return
    wlog('<- message', data.action, 'from', event.origin, { requestId: data.requestId })
    if (data.action === WIDGET_MESSAGE_ACTIONS.getTools) {
      void handleGetTools(event, data)
    } else if (data.action === WIDGET_MESSAGE_ACTIONS.callTool) {
      void handleCallTool(event, data)
    }
  })
  wlog('widget bridge initialized; listening for getTools / callTool')
  // Tell the parent the listener is attached and we are at our real origin.
  announceReady()
}
