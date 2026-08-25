/**
 * PIT CREW TELEMETRY & HEALTH (DISAUTONOMÍA / POTS / PACING V4.0 MASTER)
 * MODULE 2C: FUEL TANK HYDRATION WITH ANTI-TREMOR & UNDO SYSTEM
 */

import { store } from './state.js';
import { soundFx } from './audio-synth.js';

export class HydrationTracker {
  constructor() {
    this.fuelLevelFill = document.getElementById('fuel-level-fill');
    this.fuelAmountDisplay = document.getElementById('fuel-amount-display');
    this.fuelTargetSub = document.getElementById('fuel-target-sub');
    this.fuelBox = document.getElementById('fuel-gauge-box');

    this.btnAdd250 = document.getElementById('btn-add-250');
    this.btnAdd500 = document.getElementById('btn-add-500');
    this.btnSub250 = document.getElementById('btn-sub-250');
    this.btnElectrolytes = document.getElementById('btn-toggle-electrolytes');

    // Undo Snackbar
    this.snackContainer = document.getElementById('undo-snackbar-container');
    this.snackTimer = null;

    // Manual Edit Modal
    this.editModal = document.getElementById('hydration-edit-modal');
    this.editInput = document.getElementById('hydration-manual-input');
    this.btnSaveEdit = document.getElementById('btn-save-hydration-edit');
    this.btnCancelEdit = document.getElementById('btn-cancel-hydration-edit');
  }

  init() {
    this.bindEvents();
    this.render();
    store.on('today:updated', () => this.render());
    store.on('profile:updated', () => this.render());
    store.on('hydration:action', (payload) => this.handleHydrationAction(payload));
  }

  bindEvents() {
    if (this.btnAdd250) {
      this.btnAdd250.addEventListener('click', () => {
        soundFx.playHydrationSound();
        store.addHydration(250);
      });
    }

    if (this.btnAdd500) {
      this.btnAdd500.addEventListener('click', () => {
        soundFx.playHydrationSound();
        store.addHydration(500);
      });
    }

    if (this.btnSub250) {
      this.btnSub250.addEventListener('click', () => {
        soundFx.playTactileClick();
        store.subtractHydration(250);
      });
    }

    if (this.btnElectrolytes) {
      this.btnElectrolytes.addEventListener('click', () => {
        soundFx.playTactileClick();
        store.toggleElectrolytes();
      });
    }

    // Tap on Fuel Box to open precise edit modal
    if (this.fuelBox) {
      this.fuelBox.addEventListener('click', () => {
        this.openEditModal();
      });
    }

    // Modal Events
    if (this.btnSaveEdit && this.editInput) {
      this.btnSaveEdit.addEventListener('click', () => {
        const val = parseInt(this.editInput.value, 10);
        if (!isNaN(val) && val >= 0) {
          store.setHydrationExact(val);
          soundFx.playHydrationSound();
        }
        this.closeEditModal();
      });
    }

    if (this.btnCancelEdit) {
      this.btnCancelEdit.addEventListener('click', () => {
        this.closeEditModal();
      });
    }
  }

  handleHydrationAction(payload) {
    if (payload.action === 'ADD') {
      this.showUndoSnackbar(`+${payload.amount} ml sumados al Chasis`);
    } else if (payload.action === 'SUBTRACT') {
      this.showUndoSnackbar(`-${payload.amount} ml restados`);
    }
  }

  showUndoSnackbar(message) {
    if (!this.snackContainer) return;

    if (this.snackTimer) {
      clearTimeout(this.snackTimer);
      this.snackTimer = null;
    }

    this.snackContainer.innerHTML = `
      <div class="snackbar-undo">
        <span class="snack-text">💧 ${message}</span>
        <button id="btn-do-undo" class="btn-snack-undo">DESHACER</button>
        <div class="snack-countdown-bar"></div>
      </div>
    `;

    const undoBtn = document.getElementById('btn-do-undo');
    if (undoBtn) {
      undoBtn.addEventListener('click', () => {
        soundFx.playTactileClick();
        store.undoLastHydration();
        this.snackContainer.innerHTML = '';
      });
    }

    this.snackTimer = setTimeout(() => {
      if (this.snackContainer) {
        this.snackContainer.innerHTML = '';
      }
      this.snackTimer = null;
    }, 4000);
  }

  openEditModal() {
    if (this.editModal && this.editInput) {
      this.editInput.value = store.today.hydrationMl || 0;
      this.editModal.classList.remove('hidden');
    }
  }

  closeEditModal() {
    if (this.editModal) {
      this.editModal.classList.add('hidden');
    }
  }

  render() {
    const current = store.today.hydrationMl || 0;
    const target = store.profile.hydrationTargetMl || 3000;
    const percent = Math.min(130, Math.round((current / target) * 100));

    if (this.fuelAmountDisplay) {
      this.fuelAmountDisplay.innerHTML = `${current.toLocaleString()} <span class="unit">ml</span>`;
    }

    if (this.fuelTargetSub) {
      this.fuelTargetSub.textContent = `META: ${target.toLocaleString()} ML (${percent}%)`;
    }

    if (this.fuelLevelFill) {
      this.fuelLevelFill.style.width = `${Math.min(100, percent)}%`;
      if (percent >= 100) {
        this.fuelLevelFill.classList.add('overload');
      } else {
        this.fuelLevelFill.classList.remove('overload');
      }
    }

    if (this.btnElectrolytes) {
      if (store.today.electrolytesLogged) {
        this.btnElectrolytes.classList.add('logged');
        this.btnElectrolytes.innerHTML = `<span>⚡</span> <span>Electrolitos / Sodio: REGISTRADO</span>`;
      } else {
        this.btnElectrolytes.classList.remove('logged');
        this.btnElectrolytes.innerHTML = `<span>⚡</span> <span>+ Electrolitos / Sodio (Dosis)</span>`;
      }
    }
  }
}
