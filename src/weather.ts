export const DEFAULT_ZIP = '90210'

export type WeatherTheme =
  | 'clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'thunderstorm'

interface WeatherInfo {
  zipcode: string
  placeName: string
  state: string
  temperatureF: number
  apparentTemperatureF: number
  humidity: number
  windSpeedMph: number
  weatherDescription: string
  theme: WeatherTheme
}

interface ZippopotamResponse {
  'post code': string
  places: Array<{
    'place name': string
    latitude: string
    longitude: string
    'state abbreviation': string
  }>
}

interface OpenMeteoResponse {
  current: {
    temperature_2m: number
    relative_humidity_2m: number
    apparent_temperature: number
    weather_code: number
    wind_speed_10m: number
  }
}

function weatherCodeToDescription(code: number): string {
  if (code === 0) return 'Clear sky'
  if (code <= 3) return 'Partly cloudy'
  if (code <= 48) return 'Foggy'
  if (code <= 57) return 'Drizzle'
  if (code <= 67) return 'Rain'
  if (code <= 77) return 'Snow'
  if (code <= 82) return 'Rain showers'
  if (code <= 86) return 'Snow showers'
  if (code <= 99) return 'Thunderstorm'
  return 'Unknown'
}

export function weatherCodeToTheme(code: number): WeatherTheme {
  if (code === 0) return 'clear'
  if (code <= 2) return 'partly-cloudy'
  if (code <= 3) return 'cloudy'
  if (code <= 48) return 'fog'
  if (code <= 57) return 'drizzle'
  if (code <= 67) return 'rain'
  if (code <= 77) return 'snow'
  if (code <= 82) return 'rain'
  if (code <= 86) return 'snow'
  if (code <= 99) return 'thunderstorm'
  return 'cloudy'
}

export async function fetchWeather(zipcode: string): Promise<WeatherInfo> {
  const zip = zipcode.trim()
  const geoRes = await fetch(`https://api.zippopotam.us/us/${encodeURIComponent(zip)}`)
  if (!geoRes.ok) {
    throw new Error(`Unknown zip code: ${zip}`)
  }

  const geo = (await geoRes.json()) as ZippopotamResponse
  const place = geo.places[0]
  const params = new URLSearchParams({
    latitude: place.latitude,
    longitude: place.longitude,
    current:
      'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m',
    temperature_unit: 'fahrenheit',
    wind_speed_unit: 'mph',
  })

  const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
  if (!weatherRes.ok) {
    throw new Error('Failed to fetch weather data')
  }

  const weather = (await weatherRes.json()) as OpenMeteoResponse
  const current = weather.current

  return {
    zipcode: geo['post code'] ?? zip,
    placeName: place['place name'],
    state: place['state abbreviation'],
    temperatureF: current.temperature_2m,
    apparentTemperatureF: current.apparent_temperature,
    humidity: current.relative_humidity_2m,
    windSpeedMph: current.wind_speed_10m,
    weatherDescription: weatherCodeToDescription(current.weather_code),
    theme: weatherCodeToTheme(current.weather_code),
  }
}

export function formatWeatherText(weather: WeatherInfo): string {
  return `${weather.weatherDescription} in ${weather.placeName}, ${weather.state} ${weather.zipcode}: ${Math.round(weather.temperatureF)}°F (feels like ${Math.round(weather.apparentTemperatureF)}°F), humidity ${weather.humidity}%, wind ${weather.windSpeedMph} mph`
}

function renderWeatherScene(theme: WeatherTheme): string {
  const sun = '<div class="sun"></div>'
  const cloud1 = '<div class="cloud cloud-1"></div>'
  const cloud2 = '<div class="cloud cloud-2"></div>'
  const cloud3 = '<div class="cloud cloud-3"></div>'
  const rain = '<div class="rain"></div>'
  const snow = '<div class="snow"></div>'
  const fog = '<div class="fog fog-1"></div><div class="fog fog-2"></div><div class="fog fog-3"></div>'
  const lightning = '<div class="lightning"></div>'

  switch (theme) {
    case 'clear':
      return `<div class="weather-scene" aria-hidden="true">${sun}</div>`
    case 'partly-cloudy':
      return `<div class="weather-scene" aria-hidden="true">${sun}${cloud1}${cloud2}</div>`
    case 'cloudy':
      return `<div class="weather-scene" aria-hidden="true">${cloud1}${cloud2}${cloud3}</div>`
    case 'fog':
      return `<div class="weather-scene" aria-hidden="true">${fog}</div>`
    case 'drizzle':
      return `<div class="weather-scene" aria-hidden="true">${cloud2}${cloud3}${rain}</div>`
    case 'rain':
      return `<div class="weather-scene" aria-hidden="true">${cloud1}${cloud2}${cloud3}${rain}</div>`
    case 'snow':
      return `<div class="weather-scene" aria-hidden="true">${cloud2}${cloud3}${snow}</div>`
    case 'thunderstorm':
      return `<div class="weather-scene" aria-hidden="true">${cloud1}${cloud2}${cloud3}${rain}${lightning}</div>`
  }
}

export function renderWeatherWidget(weather: WeatherInfo): string {
  return `
    ${renderWeatherScene(weather.theme)}
    <article class="weather-widget">
      <div class="weather-main">
        <p class="weather-location">${weather.placeName}, ${weather.state} ${weather.zipcode}</p>
        <p class="weather-temp">${Math.round(weather.temperatureF)}°</p>
        <p class="weather-condition">${weather.weatherDescription}</p>
      </div>
      <dl class="weather-details">
        <div>
          <dt>Feels like</dt>
          <dd>${Math.round(weather.apparentTemperatureF)}°F</dd>
        </div>
        <div>
          <dt>Humidity</dt>
          <dd>${weather.humidity}%</dd>
        </div>
        <div>
          <dt>Wind</dt>
          <dd>${weather.windSpeedMph} mph</dd>
        </div>
      </dl>
    </article>
  `
}