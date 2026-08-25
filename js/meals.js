/**
 * PIT CREW TELEMETRY & HEALTH (DISAUTONOMÍA / POTS / PACING V4.0 MASTER)
 * MODULE 8: MEAL NUTRITIONAL TRACKER & DIGESTIVE PACING (PREVENTS SPLANCHNIC POOLING)
 */

import { store } from './state.js';
import { soundFx } from './audio-synth.js';

export const DEFAULT_MEALS_STATE = {
  breakfast: { enabled: true, time: '08:30', size: 'normal' }, // 'light' | 'normal' | 'heavy'
  lunch: { enabled: true, time: '13:30', size: 'light' },
  snack: { enabled: false, time: '17:30', size: 'light' },
  dinner: { enabled: true, time: '20:30', size: 'light' }
};

export class MealTracker {
  constructor() {
    this.container = document.getElementById('meals-tracker-container');
  }

  init() {
    this.render();
    store.on('today:updated', () => this.render());
  }

  getCurrentTimeString() {
    const now = new Date();
    const hrs = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    return `${hrs}:${mins}`;
  }

  render() {
    if (!this.container) return;

    const meals = store.today.meals || DEFAULT_MEALS_STATE;

    const mealDefs = [
      { id: 'breakfast', label: 'Desayuno', icon: '☕', defaultTime: '08:30', optional: false },
      { id: 'lunch', label: 'Almuerzo', icon: '🍲', defaultTime: '13:30', optional: false },
      { id: 'snack', label: 'Once / Merienda', icon: '🥪', defaultTime: '17:30', optional: true },
      { id: 'dinner', label: 'Cena', icon: '🍽️', defaultTime: '20:30', optional: true }
    ];

    let html = '';

    mealDefs.forEach(def => {
      const data = meals[def.id] || { enabled: !def.optional, time: def.defaultTime, size: null };
      const isEnabled = def.optional ? Boolean(data.enabled) : true;
      const currentSize = data.size || null;

      html += `
        <div class="meal-card-item ${isEnabled ? 'active' : 'disabled'}" data-meal="${def.id}">
          <div class="meal-header-row">
            <div class="meal-title-group">
              <span class="meal-icon">${def.icon}</span>
              <span class="meal-name">${def.label}</span>
            </div>

            <div class="meal-controls-group">
              ${def.optional ? `
                <label class="meal-toggle-label">
                  <input type="checkbox" class="meal-toggle-checkbox" data-meal="${def.id}" ${isEnabled ? 'checked' : ''}>
                  <span class="toggle-text">${isEnabled ? 'Incluido' : 'Omitido'}</span>
                </label>
              ` : ''}

              <div class="meal-time-box ${isEnabled ? '' : 'hidden'}">
                <input type="time" class="input-tactical meal-time-input" data-meal="${def.id}" value="${data.time || def.defaultTime}">
              </div>
            </div>
          </div>

          ${isEnabled ? `
            <div class="meal-size-selector-row">
              <button type="button" class="btn-meal-size ${currentSize === 'light' ? 'active-light' : ''}" data-meal="${def.id}" data-size="light">
                <span class="size-dot">🟢</span>
                <span>Liviano</span>
              </button>

              <button type="button" class="btn-meal-size ${currentSize === 'normal' ? 'active-normal' : ''}" data-meal="${def.id}" data-size="normal">
                <span class="size-dot">🟡</span>
                <span>Normal</span>
              </button>

              <button type="button" class="btn-meal-size ${currentSize === 'heavy' ? 'active-heavy' : ''}" data-meal="${def.id}" data-size="heavy" title="Banquete o comida abundante (alerta de pooling esplácnico)">
                <span class="size-dot">🔴</span>
                <span>Copioso / Banquete</span>
              </button>
            </div>
          ` : ''}
        </div>
      `;
    });

    this.container.innerHTML = html;
    this.bindMealEvents();
  }

  bindMealEvents() {
    // 1. Size Button Selector (1-Touch)
    this.container.querySelectorAll('.btn-meal-size').forEach(btn => {
      btn.addEventListener('click', () => {
        soundFx.playTactileClick();
        const mealId = btn.dataset.meal;
        const size = btn.dataset.size;

        const currentMeals = { ...(store.today.meals || DEFAULT_MEALS_STATE) };
        const mealData = currentMeals[mealId] || { enabled: true, time: this.getCurrentTimeString() };

        // Toggle or set
        mealData.size = mealData.size === size ? null : size;
        if (!mealData.time) {
          mealData.time = this.getCurrentTimeString();
        }
        currentMeals[mealId] = mealData;

        store.updateToday({ meals: currentMeals });
      });
    });

    // 2. Time Input Change
    this.container.querySelectorAll('.meal-time-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const mealId = input.dataset.meal;
        const timeVal = e.target.value;

        const currentMeals = { ...(store.today.meals || DEFAULT_MEALS_STATE) };
        const mealData = currentMeals[mealId] || { enabled: true, size: 'normal' };
        mealData.time = timeVal;
        currentMeals[mealId] = mealData;

        store.updateToday({ meals: currentMeals });
      });
    });

    // 3. Optional Meal Toggle Checkbox
    this.container.querySelectorAll('.meal-toggle-checkbox').forEach(toggle => {
      toggle.addEventListener('change', (e) => {
        soundFx.playTactileClick();
        const mealId = toggle.dataset.meal;
        const isEnabled = e.target.checked;

        const currentMeals = { ...(store.today.meals || DEFAULT_MEALS_STATE) };
        const mealData = currentMeals[mealId] || { time: this.getCurrentTimeString(), size: 'light' };
        mealData.enabled = isEnabled;
        if (isEnabled && !mealData.time) {
          mealData.time = this.getCurrentTimeString();
        }
        currentMeals[mealId] = mealData;

        store.updateToday({ meals: currentMeals });
      });
    });
  }
}
