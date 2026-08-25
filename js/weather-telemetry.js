/**
 * PIT CREW TELEMETRY & HEALTH (DISAUTONOMÍA / POTS / PACING V4.0 MASTER)
 * MODULE 2B: ENVIRONMENTAL TELEMETRY & BAROMETER (OPEN-METEO API)
 * FREE, NO API KEYS, ACCURATE ATMOSPHERIC PRESSURE & DROP ALERTS
 */

import { store } from './state.js';

export class WeatherTelemetry {
  constructor() {
    this.tempEl = document.getElementById('telemetry-temp');
    this.humidityEl = document.getElementById('telemetry-humidity');
    this.pressureEl = document.getElementById('telemetry-pressure');
    this.alertBanner = document.getElementById('weather-alert-banner');
    this.gpsStatusDot = document.getElementById('header-gps-dot');
  }

  init() {
    this.fetchWeather();
    // Refresh weather telemetry every 30 minutes
    setInterval(() => this.fetchWeather(), 30 * 60 * 1000);
  }

  async fetchWeather() {
    if (!('geolocation' in navigator)) {
      console.warn('Geolocation not supported on this browser.');
      this.useDefaultLocation();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        if (this.gpsStatusDot) {
          this.gpsStatusDot.classList.add('active');
        }
        await this.queryOpenMeteo(latitude, longitude);
      },
      (err) => {
        console.warn('GPS location denied or unavailable:', err);
        if (this.gpsStatusDot) {
          this.gpsStatusDot.classList.remove('active');
        }
        this.useDefaultLocation();
      },
      { timeout: 8000, enableHighAccuracy: false }
    );
  }

  async useDefaultLocation() {
    // Default fallback coordinates (e.g. Santiago / Madrid temperate standard)
    await this.queryOpenMeteo(-33.4489, -70.6693);
  }

  async queryOpenMeteo(lat, lon) {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,surface_pressure,weather_code&hourly=surface_pressure&timezone=auto`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Open-Meteo responded with status ${response.status}`);

      const data = await response.json();
      const current = data.current;
      const hourly = data.hourly;

      const temp = current ? Math.round(current.temperature_2m) : null;
      const humidity = current ? Math.round(current.relative_humidity_2m) : null;
      const pressureHpa = current ? Math.round(current.surface_pressure) : null;

      // Check sudden barometric pressure drop (e.g., in the last 3-6 hours)
      let pressureAlert = false;
      let pressureDelta = 0;

      if (hourly && hourly.surface_pressure && hourly.surface_pressure.length > 6) {
        const currentHourIndex = new Date().getHours();
        const pastHourIndex = Math.max(0, currentHourIndex - 4);
        const pastPressure = hourly.surface_pressure[pastHourIndex];
        
        if (pressureHpa && pastPressure) {
          pressureDelta = pressureHpa - pastPressure;
          // A drop of 3 hPa or more in a few hours is a known dysautonomia / POTS flare trigger
          if (pressureDelta <= -2.8) {
            pressureAlert = true;
          }
        }
      }

      const weatherData = {
        temp,
        humidity,
        pressureHpa,
        pressureDelta: parseFloat(pressureDelta.toFixed(1)),
        pressureAlert,
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      store.updateToday({ weather: weatherData });
      this.renderWeatherUI(weatherData);

    } catch (e) {
      console.warn('Could not fetch environmental telemetry:', e);
      // Fallback display from state if available
      if (store.today.weather && store.today.weather.pressureHpa) {
        this.renderWeatherUI(store.today.weather);
      }
    }
  }

  renderWeatherUI(w) {
    if (this.tempEl && w.temp !== null) {
      this.tempEl.innerHTML = `${w.temp} <span class="unit">°C</span>`;
    }
    if (this.humidityEl && w.humidity !== null) {
      this.humidityEl.innerHTML = `${w.humidity} <span class="unit">%</span>`;
    }
    if (this.pressureEl && w.pressureHpa !== null) {
      this.pressureEl.innerHTML = `${w.pressureHpa} <span class="unit">hPa</span>`;
    }

    if (this.alertBanner) {
      if (w.pressureAlert) {
        this.alertBanner.classList.remove('hidden');
        this.alertBanner.innerHTML = `
          <div class="card-tactical accent-amber" style="padding: 12px 14px; font-size: 0.85rem; line-height: 1.4;">
            <div style="font-weight: 800; color: var(--f1-amber); display: flex; align-items: center; gap: 6px;">
              ⚠️ ADVERTENCIA BAROMÉTRICA (Δ ${w.pressureDelta} hPa)
            </div>
            <div style="color: var(--text-primary); margin-top: 4px;">
              Se detectó una caída brusca de presión atmosférica. Mayor riesgo de vasodilatación periférica, taquicardia e hipotensión ortostática. Refuerza hidratación y compresión.
            </div>
          </div>
        `;
      } else {
        this.alertBanner.classList.add('hidden');
      }
    }
  }
}
