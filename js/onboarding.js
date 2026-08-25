/**
 * PIT CREW TELEMETRY & HEALTH (DISAUTONOMÍA / POTS / PACING V4.0 MASTER)
 * MODULE 1: ONBOARDING & BASELINE CALIBRATION (LÍNEA BASE Y CONTEXTO)
 */

import { store } from './state.js';
import { soundFx } from './audio-synth.js';
import { SYMPTOMS_CATALOG } from './symptoms.js';

export class OnboardingManager {
  constructor() {
    this.modal = document.getElementById('onboarding-modal');
    this.form = document.getElementById('onboarding-form');
    this.baselineChronicContainer = document.getElementById('onboard-chronic-symptoms-container');
    this.settingsChronicContainer = document.getElementById('settings-chronic-symptoms-container');
  }

  init() {
    this.renderChronicCheckboxes();
    if (!store.profile.isOnboarded) {
      this.showOnboarding();
    }
    this.bindEvents();
    this.renderSettings();
  }

  renderChronicCheckboxes() {
    const renderList = (container, prefix) => {
      if (!container) return;
      let html = '';
      const activeBaselines = new Set(store.profile.baselineChronicSymptoms || []);

      SYMPTOMS_CATALOG.forEach(cat => {
        cat.items.forEach(item => {
          const isChecked = activeBaselines.has(item.id);
          html += `
            <label style="display: flex; align-items: center; gap: 8px; font-size: 0.82rem; color: var(--text-primary); cursor: pointer; padding: 4px 0;">
              <input type="checkbox" name="${prefix}_chronic" value="${item.id}" ${isChecked ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--f1-green);">
              <span>${item.label}</span>
            </label>
          `;
        });
      });
      container.innerHTML = html;
    };

    renderList(this.baselineChronicContainer, 'onboard');
    renderList(this.settingsChronicContainer, 'settings');
  }

  showOnboarding() {
    if (this.modal) {
      this.modal.classList.remove('hidden');
    }
  }

  hideOnboarding() {
    if (this.modal) {
      this.modal.classList.add('hidden');
    }
  }

  bindEvents() {
    // Quick Diagnosis Chips in Onboarding
    document.querySelectorAll('.onboarding-diag-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        soundFx.playTactileClick();
        document.querySelectorAll('.onboarding-diag-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const input = document.getElementById('onboard-diagnosis-input');
        if (input) input.value = chip.dataset.val;
      });
    });

    // Quick Hydration Goal Chips
    document.querySelectorAll('.onboarding-water-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        soundFx.playTactileClick();
        document.querySelectorAll('.onboarding-water-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const input = document.getElementById('onboard-water-input');
        if (input) input.value = chip.dataset.val;
      });
    });

    // Quick Trigger Chips in Onboarding
    document.querySelectorAll('.onboarding-trigger-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        soundFx.playTactileClick();
        chip.classList.toggle('active');
      });
    });

    // Onboarding Form Submit
    if (this.form) {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveOnboardingData();
      });
    }

    // Settings Form Submit
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
      settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveSettingsData();
      });
    }
  }

  saveOnboardingData() {
    const diagInput = document.getElementById('onboard-diagnosis-input');
    const waterInput = document.getElementById('onboard-water-input');
    const sodiumSelect = document.getElementById('onboard-sodium-select');
    const medTypeSelect = document.getElementById('onboard-medtype-select');
    const medNotesInput = document.getElementById('onboard-mednotes-input');

    // Baseline fields
    const weightInput = document.getElementById('onboard-weight-input');
    const heightInput = document.getElementById('onboard-height-input');
    const routineSelect = document.getElementById('onboard-routine-select');
    const toleranceSelect = document.getElementById('onboard-tolerance-select');

    const c1Name = document.getElementById('onboard-c1-name');
    const c1Phone = document.getElementById('onboard-c1-phone');

    const selectedTriggers = [];
    document.querySelectorAll('.onboarding-trigger-chip.active').forEach(chip => {
      selectedTriggers.push(chip.dataset.val);
    });

    const selectedChronicSymptoms = [];
    if (this.baselineChronicContainer) {
      this.baselineChronicContainer.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
        selectedChronicSymptoms.push(cb.value);
      });
    }

    const contacts = [];
    if (c1Name && c1Phone && c1Phone.value.trim()) {
      contacts.push({
        name: c1Name.value.trim() || 'Contacto Principal',
        phone: c1Phone.value.trim(),
        relation: 'Principal'
      });
    }

    if (contacts.length === 0) {
      contacts.push({
        name: 'Contacto de Emergencia',
        phone: '+56900000000',
        relation: 'Principal'
      });
    }

    store.updateProfile({
      isOnboarded: true,
      diagnosis: diagInput ? diagInput.value : 'POTS',
      weightKg: weightInput ? parseFloat(weightInput.value) || 60 : 60,
      heightCm: heightInput ? parseInt(heightInput.value, 10) || 165 : 165,
      workRoutine: routineSelect ? routineSelect.value : 'sitting',
      orthostaticTolerance: toleranceSelect ? toleranceSelect.value : '10-15min',
      baselineChronicSymptoms: selectedChronicSymptoms,
      hydrationTargetMl: waterInput ? parseInt(waterInput.value, 10) || 3000 : 3000,
      sodiumTargetG: sodiumSelect ? sodiumSelect.value : '5g (Suero)',
      medicationType: medTypeSelect ? medTypeSelect.value : 'Tratamiento natural / Suplementos',
      medicationNotes: medNotesInput ? medNotesInput.value.trim() : '',
      triggers: selectedTriggers.length ? selectedTriggers : ['Calor', 'Cambios de clima/presión'],
      contacts
    });

    soundFx.playHydrationSound();
    this.hideOnboarding();
    this.renderSettings();
  }

  saveSettingsData() {
    const diagInput = document.getElementById('settings-diagnosis');
    const waterInput = document.getElementById('settings-water-target');
    const sodiumSelect = document.getElementById('settings-sodium-target');
    const medTypeSelect = document.getElementById('settings-medtype');
    const medNotesInput = document.getElementById('settings-mednotes');

    // Baseline fields in settings
    const weightInput = document.getElementById('settings-weight');
    const heightInput = document.getElementById('settings-height');
    const routineSelect = document.getElementById('settings-routine');
    const toleranceSelect = document.getElementById('settings-tolerance');

    const c1Name = document.getElementById('settings-c1-name');
    const c1Phone = document.getElementById('settings-c1-phone');
    const c2Name = document.getElementById('settings-c2-name');
    const c2Phone = document.getElementById('settings-c2-phone');
    const c3Name = document.getElementById('settings-c3-name');
    const c3Phone = document.getElementById('settings-c3-phone');

    const selectedChronicSymptoms = [];
    if (this.settingsChronicContainer) {
      this.settingsChronicContainer.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
        selectedChronicSymptoms.push(cb.value);
      });
    }

    const contacts = [];
    if (c1Name && c1Phone && c1Phone.value.trim()) {
      contacts.push({ name: c1Name.value.trim(), phone: c1Phone.value.trim(), relation: 'Principal' });
    }
    if (c2Name && c2Phone && c2Phone.value.trim()) {
      contacts.push({ name: c2Name.value.trim(), phone: c2Phone.value.trim(), relation: 'Contacto 2' });
    }
    if (c3Name && c3Phone && c3Phone.value.trim()) {
      contacts.push({ name: c3Name.value.trim(), phone: c3Phone.value.trim(), relation: 'Contacto 3' });
    }

    store.updateProfile({
      diagnosis: diagInput ? diagInput.value : store.profile.diagnosis,
      weightKg: weightInput ? parseFloat(weightInput.value) || 60 : store.profile.weightKg,
      heightCm: heightInput ? parseInt(heightInput.value, 10) || 165 : store.profile.heightCm,
      workRoutine: routineSelect ? routineSelect.value : store.profile.workRoutine,
      orthostaticTolerance: toleranceSelect ? toleranceSelect.value : store.profile.orthostaticTolerance,
      baselineChronicSymptoms: selectedChronicSymptoms,
      hydrationTargetMl: waterInput ? parseInt(waterInput.value, 10) || 3000 : 3000,
      sodiumTargetG: sodiumSelect ? sodiumSelect.value : '5g (Suero)',
      medicationType: medTypeSelect ? medTypeSelect.value : 'Tratamiento natural / Suplementos',
      medicationNotes: medNotesInput ? medNotesInput.value.trim() : '',
      contacts: contacts.length ? contacts : store.profile.contacts
    });

    soundFx.playHydrationSound();
    const statusBanner = document.getElementById('settings-saved-banner');
    if (statusBanner) {
      statusBanner.classList.remove('hidden');
      setTimeout(() => statusBanner.classList.add('hidden'), 3500);
    }
  }

  renderSettings() {
    const p = store.profile;
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val !== undefined && val !== null ? val : '';
    };

    setVal('settings-diagnosis', p.diagnosis);
    setVal('settings-weight', p.weightKg || 60);
    setVal('settings-height', p.heightCm || 165);
    setVal('settings-routine', p.workRoutine || 'sitting');
    setVal('settings-tolerance', p.orthostaticTolerance || '10-15min');
    setVal('settings-water-target', p.hydrationTargetMl);
    setVal('settings-sodium-target', p.sodiumTargetG);
    setVal('settings-medtype', p.medicationType);
    setVal('settings-mednotes', p.medicationNotes);

    if (p.contacts && p.contacts[0]) {
      setVal('settings-c1-name', p.contacts[0].name);
      setVal('settings-c1-phone', p.contacts[0].phone);
    }
    if (p.contacts && p.contacts[1]) {
      setVal('settings-c2-name', p.contacts[1].name);
      setVal('settings-c2-phone', p.contacts[1].phone);
    }
    if (p.contacts && p.contacts[2]) {
      setVal('settings-c3-name', p.contacts[2].name);
      setVal('settings-c3-phone', p.contacts[2].phone);
    }

    this.renderChronicCheckboxes();
  }
}
