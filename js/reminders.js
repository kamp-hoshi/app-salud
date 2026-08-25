/**
 * PIT CREW TELEMETRY & HEALTH (DISAUTONOMÍA / POTS / PACING V4.0 MASTER)
 * MODULE 7: PROGRAMMABLE REMINDERS & TELEMETRY ALERTS (BOXES NOTIFICATIONS)
 */

import { store } from './state.js';
import { soundFx } from './audio-synth.js';

export class ReminderManager {
  constructor() {
    this.container = document.getElementById('reminders-times-container');
    this.btnAddTime = document.getElementById('btn-add-reminder-time');
    this.btnTestAlert = document.getElementById('btn-test-reminder-alert');
    this.toggleMaster = document.getElementById('toggle-reminders-master');
    this.permissionBanner = document.getElementById('reminder-permission-banner');
    this.btnGrantPermission = document.getElementById('btn-grant-notification-permission');

    this.checkInterval = null;
    this.lastTriggeredMinute = null;
  }

  init() {
    this.renderTimes();
    this.bindEvents();
    this.checkNotificationPermission();
    this.startScheduler();
  }

  checkNotificationPermission() {
    if (!('Notification' in window)) {
      if (this.permissionBanner) this.permissionBanner.classList.add('hidden');
      return;
    }

    if (Notification.permission === 'granted') {
      if (this.permissionBanner) this.permissionBanner.classList.add('hidden');
    } else if (Notification.permission === 'default') {
      if (this.permissionBanner) this.permissionBanner.classList.remove('hidden');
    }
  }

  async requestPermission() {
    if (!('Notification' in window)) {
      alert('Tu navegador no soporta notificaciones web directas.');
      return false;
    }

    const permission = await Notification.requestPermission();
    this.checkNotificationPermission();
    return permission === 'granted';
  }

  renderTimes() {
    if (!this.container) return;

    const reminders = store.profile.reminderTimes || ['09:00', '15:00', '21:00'];
    const isMasterEnabled = store.profile.remindersEnabled !== false;

    if (this.toggleMaster) {
      this.toggleMaster.checked = isMasterEnabled;
    }

    let html = '';
    reminders.forEach((time, index) => {
      html += `
        <div class="reminder-time-row" data-index="${index}" style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-card-elevated); padding: 10px 14px; border-radius: var(--radius-md); border: 1px solid var(--border-tactical); gap: 10px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.1rem;">⏰</span>
            <input type="time" class="input-tactical reminder-time-input" value="${time}" style="min-height: 40px; font-weight: bold; font-size: 1rem; width: 130px; text-align: center;">
          </div>
          <button type="button" class="btn-delete-reminder" data-index="${index}" style="background: none; border: 1px solid var(--border-tactical); color: var(--f1-red); border-radius: 6px; width: 38px; height: 38px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1rem;" title="Eliminar este horario">
            ✕
          </button>
        </div>
      `;
    });

    this.container.innerHTML = html;

    // Bind time input changes and delete buttons
    this.container.querySelectorAll('.reminder-time-input').forEach((input, idx) => {
      input.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val) {
          const times = [...(store.profile.reminderTimes || ['09:00', '15:00', '21:00'])];
          times[idx] = val;
          times.sort();
          store.updateProfile({ reminderTimes: times });
          this.renderTimes();
        }
      });
    });

    this.container.querySelectorAll('.btn-delete-reminder').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(btn.dataset.index, 10);
        const times = [...(store.profile.reminderTimes || ['09:00', '15:00', '21:00'])];
        if (times.length <= 1) {
          alert('Debes mantener al menos 1 horario configurado.');
          return;
        }
        times.splice(idx, 1);
        store.updateProfile({ reminderTimes: times });
        soundFx.playTactileClick();
        this.renderTimes();
      });
    });
  }

  bindEvents() {
    if (this.btnAddTime) {
      this.btnAddTime.addEventListener('click', () => {
        soundFx.playTactileClick();
        const times = [...(store.profile.reminderTimes || ['09:00', '15:00', '21:00'])];
        times.push('18:00');
        times.sort();
        store.updateProfile({ reminderTimes: times });
        this.renderTimes();
      });
    }

    if (this.toggleMaster) {
      this.toggleMaster.addEventListener('change', (e) => {
        soundFx.playTactileClick();
        store.updateProfile({ remindersEnabled: e.target.checked });
        if (e.target.checked && Notification.permission !== 'granted') {
          this.requestPermission();
        }
      });
    }

    if (this.btnGrantPermission) {
      this.btnGrantPermission.addEventListener('click', () => {
        this.requestPermission();
      });
    }

    if (this.btnTestAlert) {
      this.btnTestAlert.addEventListener('click', async () => {
        soundFx.playTactileClick();
        if (Notification.permission !== 'granted') {
          const ok = await this.requestPermission();
          if (!ok) {
            alert('Por favor autoriza las notificaciones en tu navegador para recibir alertas.');
            return;
          }
        }
        this.triggerAlertNow('Recordatorio de Prueba');
      });
    }
  }

  startScheduler() {
    if (this.checkInterval) clearInterval(this.checkInterval);

    // Check every 30 seconds
    this.checkInterval = setInterval(() => {
      this.evaluateScheduledReminders();
    }, 30000);
  }

  evaluateScheduledReminders() {
    if (store.profile.remindersEnabled === false) return;

    const now = new Date();
    const currentHour = String(now.getHours()).padStart(2, '0');
    const currentMin = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHour}:${currentMin}`;

    if (this.lastTriggeredMinute === currentTimeStr) return;

    const reminderTimes = store.profile.reminderTimes || ['09:00', '15:00', '21:00'];

    if (reminderTimes.includes(currentTimeStr)) {
      this.lastTriggeredMinute = currentTimeStr;
      this.triggerAlertNow(`Horario de Boxes: ${currentTimeStr}`);
    }
  }

  triggerAlertNow(contextLabel = '') {
    soundFx.playHydrationSound();

    const title = '🏎️ PIT CREW | Boxes';
    const body = '🏎️ Boxes: Hora de actualizar tu telemetría (Batería, Agua y Síntomas actuales).';
    const icon = './assets/f1-badge.svg';

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        if (navigator.serviceWorker && navigator.serviceWorker.ready) {
          navigator.serviceWorker.ready.then(reg => {
            reg.showNotification(title, {
              body,
              icon,
              badge: icon,
              vibrate: [200, 100, 200],
              tag: 'pitcrew-telemetry-reminder',
              renotify: true,
              data: { url: './#telemetry' }
            });
          }).catch(() => {
            new Notification(title, { body, icon });
          });
        } else {
          new Notification(title, { body, icon });
        }
      } catch (err) {
        console.warn('Notification trigger error:', err);
      }
    } else {
      // In-app alert fallback
      alert(`${title}\n\n${body}`);
    }
  }
}
