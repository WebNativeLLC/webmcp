import { initializeWebMCPPolyfill } from '@mcp-b/webmcp-polyfill'
import './style.css'
import { initializeWidgetBridge } from './bridge.ts'
import {
  DEFAULT_ZIP,
  fetchWeather,
  formatWeatherText,
  renderWeatherWidget,
} from './weather.ts'

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
app.innerHTML = `
  <main class="page">
    <h1>Weather</h1>
    <div id="weather" class="weather-state" aria-live="polite">Loading weather for ${DEFAULT_ZIP}…</div>
  </main>
`

const weatherEl = app.querySelector<HTMLDivElement>('#weather')!

function showLoading(zipcode: string) {
  weatherEl.className = 'weather-state'
  weatherEl.textContent = `Loading weather for ${zipcode}…`
}

function showWeather(weather: Awaited<ReturnType<typeof fetchWeather>>) {
  weatherEl.className = 'weather-state'
  weatherEl.innerHTML = renderWeatherWidget(weather)
}

function showError(message: string) {
  weatherEl.className = 'weather-state weather-state--error'
  weatherEl.textContent = message
}

async function loadWeather(zipcode: string) {
  showLoading(zipcode)
  const weather = await fetchWeather(zipcode)
  showWeather(weather)
  return weather
}

document.modelContext.registerTool({
  name: 'get-weather',
  description: 'Get current weather for a US zip code',
  inputSchema: {
    type: 'object',
    properties: {
      zipcode: {
        type: 'string',
        description: 'US zip code (5 digits)',
      },
    },
    required: ['zipcode'],
  },
  async execute(args) {
    const zipcode = String(args.zipcode).trim()

    try {
      const weather = await loadWeather(zipcode)
      return {
        content: [{ type: 'text', text: formatWeatherText(weather) }],
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch weather'
      showError(message)
      return {
        content: [{ type: 'text', text: message }],
        isError: true,
      }
    }
  },
})

void loadWeather(DEFAULT_ZIP).catch(() => {})
