export type BarOrientation = 'vertical' | 'horizontal'
export type BarSort = 'none' | 'value-desc' | 'value-asc' | 'title-asc' | 'title-desc'
export type BarColorScheme = 'default' | 'blue' | 'green' | 'warm' | 'mono'

export interface BarDataPoint {
  title: string
  value: number
}

export interface BarGraphOptions {
  chartTitle?: string
  orientation: BarOrientation
  showValues: boolean
  valuePrefix: string
  valueSuffix: string
  sort: BarSort
  colorScheme: BarColorScheme
  maxValue?: number
  decimalPlaces: number
}

export interface BarGraphState {
  data: BarDataPoint[]
  options: BarGraphOptions
}

export interface ParsedBarGraphInput {
  state: BarGraphState
}

const DEFAULT_OPTIONS: BarGraphOptions = {
  orientation: 'vertical',
  showValues: true,
  valuePrefix: '',
  valueSuffix: '',
  sort: 'none',
  colorScheme: 'default',
  decimalPlaces: 0,
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseDataPoint(raw: unknown, index: number): BarDataPoint {
  if (!isRecord(raw)) {
    throw new Error(`data[${index}] must be an object with title and value`)
  }

  const title = raw.title
  const value = raw.value

  if (typeof title !== 'string' || title.trim() === '') {
    throw new Error(`data[${index}].title must be a non-empty string`)
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`data[${index}].value must be a finite number`)
  }

  return { title: title.trim(), value }
}

function parseOrientation(raw: unknown): BarOrientation {
  if (raw === undefined) return DEFAULT_OPTIONS.orientation
  if (raw === 'vertical' || raw === 'horizontal') return raw
  throw new Error('orientation must be "vertical" or "horizontal"')
}

function parseSort(raw: unknown): BarSort {
  if (raw === undefined) return DEFAULT_OPTIONS.sort
  const allowed: BarSort[] = ['none', 'value-desc', 'value-asc', 'title-asc', 'title-desc']
  if (typeof raw === 'string' && (allowed as string[]).includes(raw)) {
    return raw as BarSort
  }
  throw new Error('sort must be one of: none, value-desc, value-asc, title-asc, title-desc')
}

function parseColorScheme(raw: unknown): BarColorScheme {
  if (raw === undefined) return DEFAULT_OPTIONS.colorScheme
  const allowed: BarColorScheme[] = ['default', 'blue', 'green', 'warm', 'mono']
  if (typeof raw === 'string' && (allowed as string[]).includes(raw)) {
    return raw as BarColorScheme
  }
  throw new Error('colorScheme must be one of: default, blue, green, warm, mono')
}

function parseDecimalPlaces(raw: unknown): number {
  if (raw === undefined) return DEFAULT_OPTIONS.decimalPlaces
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 0 || raw > 4) {
    throw new Error('decimalPlaces must be an integer from 0 to 4')
  }
  return raw
}

export function parseBarGraphInput(args: Record<string, unknown>): ParsedBarGraphInput {
  const rawData = args.data
  if (!Array.isArray(rawData) || rawData.length === 0) {
    throw new Error('data must be a non-empty array of { title, value } objects')
  }

  const data = rawData.map((item, index) => parseDataPoint(item, index))

  const maxValue = args.maxValue
  if (maxValue !== undefined) {
    if (typeof maxValue !== 'number' || !Number.isFinite(maxValue) || maxValue <= 0) {
      throw new Error('maxValue must be a positive number when provided')
    }
  }

  const chartTitle = args.chartTitle
  if (chartTitle !== undefined && typeof chartTitle !== 'string') {
    throw new Error('chartTitle must be a string when provided')
  }

  const valuePrefix = args.valuePrefix
  if (valuePrefix !== undefined && typeof valuePrefix !== 'string') {
    throw new Error('valuePrefix must be a string when provided')
  }

  const valueSuffix = args.valueSuffix
  if (valueSuffix !== undefined && typeof valueSuffix !== 'string') {
    throw new Error('valueSuffix must be a string when provided')
  }

  const showValues = args.showValues
  if (showValues !== undefined && typeof showValues !== 'boolean') {
    throw new Error('showValues must be a boolean when provided')
  }

  const options: BarGraphOptions = {
    chartTitle: chartTitle?.trim() || undefined,
    orientation: parseOrientation(args.orientation),
    showValues: showValues ?? DEFAULT_OPTIONS.showValues,
    valuePrefix: valuePrefix ?? DEFAULT_OPTIONS.valuePrefix,
    valueSuffix: valueSuffix ?? DEFAULT_OPTIONS.valueSuffix,
    sort: parseSort(args.sort),
    colorScheme: parseColorScheme(args.colorScheme),
    maxValue: maxValue,
    decimalPlaces: parseDecimalPlaces(args.decimalPlaces),
  }

  return { state: { data, options } }
}

export function sortBarData(data: BarDataPoint[], sort: BarSort): BarDataPoint[] {
  const copy = [...data]
  switch (sort) {
    case 'value-desc':
      return copy.sort((a, b) => b.value - a.value)
    case 'value-asc':
      return copy.sort((a, b) => a.value - b.value)
    case 'title-asc':
      return copy.sort((a, b) => a.title.localeCompare(b.title))
    case 'title-desc':
      return copy.sort((a, b) => b.title.localeCompare(a.title))
    default:
      return copy
  }
}

function scaleMax(data: BarDataPoint[], maxValue?: number): number {
  const dataMax = Math.max(...data.map((d) => d.value), 0)
  if (maxValue !== undefined) {
    return Math.max(maxValue, dataMax)
  }
  return dataMax === 0 ? 1 : dataMax
}

export function formatBarValue(
  value: number,
  prefix: string,
  suffix: string,
  decimalPlaces: number,
): string {
  const formatted =
    decimalPlaces === 0 ? String(Math.round(value)) : value.toFixed(decimalPlaces)
  return `${prefix}${formatted}${suffix}`
}

function barPercent(value: number, max: number): number {
  if (max <= 0) return 0
  return Math.max(0, Math.min(100, (value / max) * 100))
}

function renderVerticalBars(
  data: BarDataPoint[],
  options: BarGraphOptions,
  max: number,
): string {
  const bars = data
    .map((point, index) => {
      const height = barPercent(point.value, max)
      const valueLabel = formatBarValue(
        point.value,
        options.valuePrefix,
        options.valueSuffix,
        options.decimalPlaces,
      )
      const valueHtml = options.showValues
        ? `<span class="bar-chart__value">${escapeHtml(valueLabel)}</span>`
        : ''

      return `
        <div class="bar-chart__bar-group" style="--bar-index: ${index}">
          ${valueHtml}
          <div class="bar-chart__bar-wrap">
            <div class="bar-chart__bar" style="height: ${height}%"></div>
          </div>
          <span class="bar-chart__label">${escapeHtml(point.title)}</span>
        </div>
      `
    })
    .join('')

  return `
    <div class="bar-chart__plot bar-chart__plot--vertical">
      <div class="bar-chart__bars">${bars}</div>
    </div>
  `
}

function renderHorizontalBars(
  data: BarDataPoint[],
  options: BarGraphOptions,
  max: number,
): string {
  const rows = data
    .map((point, index) => {
      const width = barPercent(point.value, max)
      const valueLabel = formatBarValue(
        point.value,
        options.valuePrefix,
        options.valueSuffix,
        options.decimalPlaces,
      )
      const valueHtml = options.showValues
        ? `<span class="bar-chart__value">${escapeHtml(valueLabel)}</span>`
        : ''

      return `
        <div class="bar-chart__row" style="--bar-index: ${index}">
          <span class="bar-chart__label">${escapeHtml(point.title)}</span>
          <div class="bar-chart__bar-row">
            <div class="bar-chart__bar" style="width: ${width}%"></div>
            ${valueHtml}
          </div>
        </div>
      `
    })
    .join('')

  return `<div class="bar-chart__plot bar-chart__plot--horizontal">${rows}</div>`
}

export function renderBarGraph(state: BarGraphState): string {
  const sorted = sortBarData(state.data, state.options.sort)
  const max = scaleMax(sorted, state.options.maxValue)
  const { options } = state
  const titleHtml = options.chartTitle
    ? `<h1 class="bar-chart__title">${escapeHtml(options.chartTitle)}</h1>`
    : ''

  const plot =
    options.orientation === 'horizontal'
      ? renderHorizontalBars(sorted, options, max)
      : renderVerticalBars(sorted, options, max)

  return `
    <figure class="bar-chart" aria-label="${escapeHtml(options.chartTitle ?? 'Bar chart')}">
      ${titleHtml}
      ${plot}
    </figure>
  `
}

export function renderEmpty(): string {
  return `
    <article class="bar-chart-empty">
      <button type="button" class="bar-chart-empty__title" id="load-sample-chart">
        Bar graph widget
      </button>
      <p class="bar-chart-empty__hint">Click the title for a sample chart, or call <code>show-bar-graph</code> with a <code>data</code> array of <code>{ title, value }</code> objects.</p>
    </article>
  `
}

export const SAMPLE_BAR_GRAPH_STATE: BarGraphState = {
  data: [
    { title: 'Alpha', value: 42 },
    { title: 'Beta', value: 68 },
    { title: 'Gamma', value: 55 },
    { title: 'Delta', value: 31 },
  ],
  options: {
    chartTitle: 'Sample bar graph',
    orientation: 'horizontal',
    showValues: true,
    valuePrefix: '',
    valueSuffix: '',
    sort: 'none',
    colorScheme: 'default',
    decimalPlaces: 0,
  },
}

export function renderBarGraphSkeleton(orientation: BarOrientation = 'horizontal'): string {
  if (orientation === 'horizontal') {
    return `
      <article class="bar-chart bar-chart-skeleton" aria-busy="true" aria-label="Loading chart">
        <div class="skeleton skeleton-title"></div>
        <div class="bar-chart__plot bar-chart__plot--horizontal">
          ${[72, 48, 90, 56]
            .map(
              (width) => `
            <div class="bar-chart__row">
              <div class="skeleton skeleton-label-h"></div>
              <div class="bar-chart__bar-row">
                <div class="skeleton skeleton-bar-h" style="width: ${width}%"></div>
              </div>
            </div>
          `,
            )
            .join('')}
        </div>
      </article>
    `
  }

  return `
    <article class="bar-chart bar-chart-skeleton" aria-busy="true" aria-label="Loading chart">
      <div class="skeleton skeleton-title"></div>
      <div class="bar-chart__plot bar-chart__plot--vertical">
        <div class="bar-chart__bars">
          ${[72, 48, 90, 56]
            .map((height) => `<div class="skeleton skeleton-bar-v" style="height: ${height}%"></div>`)
            .join('')}
        </div>
      </div>
    </article>
  `
}

export function formatBarGraphText(state: BarGraphState): string {
  const sorted = sortBarData(state.data, state.options.sort)
  const lines = sorted.map(
    (point) =>
      `${point.title}: ${formatBarValue(point.value, state.options.valuePrefix, state.options.valueSuffix, state.options.decimalPlaces)}`,
  )
  const heading = state.options.chartTitle ? `${state.options.chartTitle}\n` : ''
  const meta = `(${state.options.orientation}, ${sorted.length} bars, sort: ${state.options.sort})`
  return `${heading}${lines.join(', ')} ${meta}`.trim()
}

export function barGraphStateClassName(state: BarGraphState): string {
  const { orientation, colorScheme } = state.options
  return `bar-graph-state bar-graph-state--${orientation} bar-graph-state--scheme-${colorScheme}`
}
