import { initializeWebMCPPolyfill } from '@mcp-b/webmcp-polyfill'
import './style.css'
import { initializeWidgetBridge } from './bridge.ts'
import {
  fetchWeather,
  formatWeatherText,
  renderWeatherSkeleton,
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
app.innerHTML = `<div id="weather" class="weather-state" aria-live="polite"></div>`

const weatherEl = app.querySelector<HTMLDivElement>('#weather')!

let displayedZip: string | null = null

function showSkeleton() {
  weatherEl.className = 'weather-state weather-bg weather-bg--skeleton'
  weatherEl.innerHTML = renderWeatherSkeleton()
}

function showWeather(weather: Awaited<ReturnType<typeof fetchWeather>>) {
  weatherEl.className = `weather-state weather-bg weather-bg--${weather.theme}`
  weatherEl.innerHTML = renderWeatherWidget(weather)
}

function showError(message: string) {
  weatherEl.className = 'weather-state weather-state--error'
  weatherEl.textContent = message
}

async function loadWeather(zipcode: string) {
  showSkeleton()
  const weather = await fetchWeather(zipcode)
  showWeather(weather)
  displayedZip = weather.zipcode
  return weather
}

function alreadyDisplayingMessage(currentZip: string, requestedZip: string): string {
  return `Weather is already displaying for ${currentZip}. Open another widget for ${requestedZip}`
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

    if (displayedZip !== null && displayedZip !== zipcode) {
      return {
        content: [{ type: 'text', text: alreadyDisplayingMessage(displayedZip, zipcode) }],
        isError: true,
      }
    }

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

showSkeleton()
