import { initializeWebMCPPolyfill } from '@mcp-b/webmcp-polyfill'
import './style.css'
import {
  DEFAULT_ZIP,
  fetchWeather,
  formatWeatherText,
  renderWeatherWidget,
} from './weather.ts'

initializeWebMCPPolyfill()

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
      const weather = await fetchWeather(zipcode)
      return {
        content: [{ type: 'text', text: formatWeatherText(weather) }],
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch weather'
      return {
        content: [{ type: 'text', text: message }],
        isError: true,
      }
    }
  },
})

const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `
  <main class="page">
    <h1>Weather</h1>
    <div id="weather" class="weather-state" aria-live="polite">Loading weather for ${DEFAULT_ZIP}…</div>
  </main>
`

const weatherEl = app.querySelector<HTMLDivElement>('#weather')!

fetchWeather(DEFAULT_ZIP)
  .then((weather) => {
    weatherEl.innerHTML = renderWeatherWidget(weather)
  })
  .catch((error) => {
    weatherEl.className = 'weather-state weather-state--error'
    weatherEl.textContent =
      error instanceof Error ? error.message : 'Failed to load weather'
  })
