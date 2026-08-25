/**
 * PIT CREW TELEMETRY & HEALTH (DISAUTONOMÍA / POTS / PACING V4.0 MASTER)
 * MODULE 3: TACTICAL SYMPTOM AUDIT (1-TOUCH ERGONOMIC CHIPS & OFFICIAL SAVE)
 */

import { store } from './state.js';
import { soundFx } from './audio-synth.js';

export const SYMPTOMS_CATALOG = [
  {
    id: 'vascular',
    name: '⚡ Sistema Vascular y Respuesta Ortostática',
    className: 'category-vascular',
    items: [
      { id: 'vasc_mareo', label: 'Mareo / Visión borrosa al pararse' },
      { id: 'vasc_taquicardia', label: 'Palpitaciones / Taquicardia postural' },
      { id: 'vasc_frio', label: 'Extremidades frías / Sudorosas' },
      { id: 'vasc_pesadez', label: 'Pesadez extrema en piernas' },
      { id: 'vasc_sofocos', label: 'Sofocos / Desregulación térmica' },
      { id: 'vasc_temblor', label: 'Temblores internos / Debilidad muscular' }
    ]
  },
  {
    id: 'chassis',
    name: '🛡️ Chasis, Dolor y Sobrecarga Sensorial',
    className: 'category-chassis',
    items: [
      { id: 'chassis_horizontal', label: 'Necesidad urgente de posición horizontal', critical: true },
      { id: 'chassis_fotofobia', label: 'Fotofobia / Intolerancia a ruidos' },
      { id: 'chassis_ocular', label: 'Fatiga visual / Dolor ocular' },
      { id: 'chassis_gastrico', label: 'Molestia gástrica / Náuseas / Hinchazón' },
      { id: 'chassis_jaqueca', label: 'Presión en cabeza / Jaqueca' }
    ]
  },
  {
    id: 'cognitive',
    name: '🧠 Despliegue Operativo y Roles',
    className: 'category-cognitive',
    items: [
      { id: 'cog_brainfog', label: 'Brain fog / Cero foco cognitivo' },
      { id: 'cog_bateriasocial', label: 'Batería social en cero (modo silencio)' },
      { id: 'cog_delegar', label: 'Urgencia de delegar tareas en red de apoyo' },
      { id: 'cog_incapacidad', label: 'Incapacidad de interacción física activa' }
    ]
  }
];

export class SymptomAuditManager {
  constructor() {
    this.container = document.getElementById('symptoms-audit-container');
    this.counterBadge = document.getElementById('symptoms-total-count');
    this.btnSave = document.getElementById('btn-save-symptoms');
    this.btnClear = document.getElementById('btn-clear-symptoms');
    this.savedBanner = document.getElementById('symptoms-saved-banner');
    this.savedTimestampText = document.getElementById('symptoms-saved-timestamp');
  }

  init() {
    this.render();
    this.bindEvents();
    this.syncUI();
    store.on('today:updated', () => this.syncUI());
  }

  render() {
    if (!this.container) return;

    let html = '';
    const activeSymptoms = new Set(store.today.symptoms || []);

    SYMPTOMS_CATALOG.forEach(category => {
      html += `
        <div class="symptom-section-group ${category.className}">
          <div class="symptom-category-header">
            <span>${category.name}</span>
          </div>
          <div class="symptom-chips-grid">
      `;

      category.items.forEach(item => {
        const isSelected = activeSymptoms.has(item.id);
        html += `
          <button type="button" class="chip-tactical ${isSelected ? 'selected' : ''}" data-id="${item.id}">
            <div class="chip-checkbox">${isSelected ? '✔' : ''}</div>
            <span>${item.label}</span>
          </button>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    this.container.innerHTML = html;
    this.updateCountBadge();
    this.bindChipClicks();
  }

  bindChipClicks() {
    if (!this.container) return;
    this.container.querySelectorAll('.chip-tactical').forEach(chip => {
      chip.addEventListener('click', () => {
        soundFx.playTactileClick();
        const symptomId = chip.dataset.id;
        store.toggleSymptom(symptomId);
      });
    });
  }

  bindEvents() {
    // Official Save Button for Daily Symptoms
    if (this.btnSave) {
      this.btnSave.addEventListener('click', () => {
        soundFx.playHydrationSound();
        const savedTime = store.saveSymptomsOfficial();
        this.showSavedConfirmation(savedTime);
      });
    }

    if (this.btnClear) {
      this.btnClear.addEventListener('click', () => {
        soundFx.playTactileClick();
        store.clearSymptoms();
      });
    }
  }

  showSavedConfirmation(timeStr) {
    if (this.savedBanner) {
      this.savedBanner.classList.remove('hidden');
      if (this.savedTimestampText) {
        this.savedTimestampText.textContent = `Registrado: ${timeStr}`;
      }
      setTimeout(() => {
        if (this.savedBanner) this.savedBanner.classList.add('hidden');
      }, 4000);
    }
  }

  syncUI() {
    const activeSymptoms = new Set(store.today.symptoms || []);
    if (this.container) {
      this.container.querySelectorAll('.chip-tactical').forEach(chip => {
        const isSelected = activeSymptoms.has(chip.dataset.id);
        chip.classList.toggle('selected', isSelected);
        const checkEl = chip.querySelector('.chip-checkbox');
        if (checkEl) checkEl.textContent = isSelected ? '✔' : '';
      });
    }
    this.updateCountBadge();

    if (store.today.symptomsSavedAt && this.savedTimestampText) {
      this.savedTimestampText.textContent = `Último registro guardado: ${store.today.symptomsSavedAt}`;
    }
  }

  updateCountBadge() {
    const count = (store.today.symptoms || []).length;
    if (this.counterBadge) {
      this.counterBadge.textContent = `${count} SELECCIONADO${count !== 1 ? 'S' : ''}`;
      if (count > 4) {
        this.counterBadge.className = 'badge badge-red';
      } else if (count > 0) {
        this.counterBadge.className = 'badge badge-amber';
      } else {
        this.counterBadge.className = 'badge badge-green';
      }
    }
  }
}
