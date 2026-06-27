export interface WidgetState {
  message: string
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function renderWidget(state: WidgetState): string {
  return `
    <article class="widget">
      <p class="widget-label">Current message</p>
      <p class="widget-message">${escapeHtml(state.message)}</p>
    </article>
  `
}

export function renderSkeleton(): string {
  return `
    <article class="widget widget--loading" aria-busy="true" aria-label="Loading">
      <div class="skeleton skeleton-label"></div>
      <div class="skeleton skeleton-message"></div>
    </article>
  `
}

export function formatToolResponse(state: WidgetState): string {
  return `Updated widget: ${state.message}`
}
