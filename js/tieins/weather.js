import { createTieInRow } from "./common.js";
import { geocodeLocation } from "./geocode.js";

export function renderInputRow(data = {}) {
  return createTieInRow(
    [
      { key: "location", placeholder: "City/Location", value: data.location }
    ],
    "weather",
    async ({ location }) => {
      if (!location) return "⚠ Enter a location";
      try {
        const coords = await geocodeLocation(location);
        if (!coords) return "⚠ Could not geocode location";

        const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
        const res = await fetch(url);
        if (!res.ok) return "⚠ Failed to fetch weather";

        const data = await res.json();
        if (!data.daily || !data.daily.temperature_2m_max) {
          return "⚠ No daily weather data";
        }

        const max = data.daily.temperature_2m_max[0];
        const min = data.daily.temperature_2m_min[0];
        const precip = data.daily.precipitation_sum[0];
        const dateStr = data.daily.time[0];

        const formattedDate = new Date(dateStr).toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        });

        // Get local time at fetch
        const now = new Date();
        const localTime = now.toLocaleTimeString(undefined, {
          timeZone: data.timezone || 'UTC',
          hour: '2-digit',
          minute: '2-digit'
        });

        return `🌤 ${location} (${formattedDate}, local time ${localTime}): High ${max}°C / Low ${min}°C${precip !== undefined ? `, ${precip}mm rain` : ''}`;
      } catch (err) {
        console.error("Weather fetch failed:", err);
        return "⚠ Error loading weather";
      }
    }
  );
}

export async function getResult({ location }) {
  if (!location) return "⚠ Please enter a location.";
  try {
    const coords = await geocodeLocation(location);
    if (!coords) return "⚠ Could not geocode location";

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) return "⚠ Failed to fetch weather";

    const data = await res.json();
    if (!data.daily || !data.daily.temperature_2m_max || !data.current_weather) {
      return "⚠ Incomplete weather data";
    }

    const max = data.daily.temperature_2m_max[0];
    const min = data.daily.temperature_2m_min[0];
    const precip = data.daily.precipitation_sum[0];
    const current = data.current_weather.temperature;
    const dateStr = data.daily.time[0];

    const formattedDate = new Date(dateStr).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });

    const now = new Date();
    const localTime = now.toLocaleTimeString(undefined, {
      timeZone: data.timezone || 'UTC',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `Weather for ${location} (${formattedDate}, local time ${localTime}): <strong>${current}°C now</strong>, High ${max}°C / Low ${min}°C${precip !== undefined ? `, ${precip}mm rain` : ''}`;
  } catch (err) {
    console.error("Weather getResult error:", err);
    return "⚠ Error loading weather";
  }
}
