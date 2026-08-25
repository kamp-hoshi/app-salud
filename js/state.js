/**
 * PIT CREW TELEMETRY & HEALTH (DISAUTONOMÍA / POTS / PACING V4.0 MASTER)
 * STATE MANAGEMENT - LOCAL-FIRST REACTIVE STORE WITH BASELINE CALIBRATION
 */

const STORAGE_KEYS = {
  PROFILE: 'pitcrew_profile_v4',
  TODAY: 'pitcrew_today_v4',
  HISTORY: 'pitcrew_history_v4',
  SETTINGS: 'pitcrew_settings_v4'
};

class StateStore {
  constructor() {
    this.listeners = new Map();
    this.profile = this.load(STORAGE_KEYS.PROFILE, {
      isOnboarded: false,
      diagnosis: 'POTS',
      weightKg: 62,
      heightCm: 165,
      workRoutine: 'sitting', // 'standing' | 'sitting' | 'mixed'
      orthostaticTolerance: '10-15min', // '<5min' | '10-15min' | '>30min'
      baselineChronicSymptoms: ['vasc_frio'], // Síntomas habituales de base
      hydrationTargetMl: 3000,
      sodiumTargetG: '5g (Suero)',
      medicationType: 'Tratamiento natural / Suplementos',
      medicationNotes: '',
      remindersEnabled: true,
      reminderTimes: ['09:00', '15:00', '21:00'],
      triggers: ['Calor', 'Cambios de clima/presión', 'Falta de sueño'],
      contacts: [
        { name: 'Contacto Principal', phone: '+56912345678', relation: 'Familiar' }
      ]
    });

    const todayDate = this.getTodayDateString();
    const savedToday = this.load(STORAGE_KEYS.TODAY, null);

    if (savedToday && savedToday.date === todayDate) {
      this.today = { ...this.createDefaultDayLog(todayDate), ...savedToday };
    } else {
      // Archive previous day if needed
      if (savedToday && savedToday.date) {
        this.archiveDay(savedToday);
      }
      this.today = this.createDefaultDayLog(todayDate);
      this.save(STORAGE_KEYS.TODAY, this.today);
    }

    this.history = this.load(STORAGE_KEYS.HISTORY, []);
    this.lastHydrationAction = null;
  }

  getTodayDateString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  createDefaultDayLog(dateStr) {
    return {
      date: dateStr,
      battery: 70, // 1% to 100%
      hydrationMl: 0,
      electrolytesLogged: false,
      rhr: null, // Resting Heart Rate (bpm)
      deepSleepHours: null, // Horas sueño profundo
      totalSleepHours: null, // Horas sueño total (ej. 6.1 h)
      spo2: null, // % Saturación oxígeno (ej. 95%)
      stressLevel: null, // Puntuación de estrés (1-100, ej. 32)
      symptoms: [],
      symptomsSavedAt: null, // Fecha y hora oficial de guardado
      meals: {
        breakfast: { enabled: true, time: '08:30', size: null },
        lunch: { enabled: true, time: '13:30', size: null },
        snack: { enabled: false, time: '17:30', size: null },
        dinner: { enabled: true, time: '20:30', size: null }
      },
      weather: {
        temp: null,
        humidity: null,
        pressureHpa: null,
        pressureDelta: 0,
        pressureAlert: false,
        lastUpdated: null
      },
      f1Status: 'GREEN', // GREEN | AMBER | RED
      notes: ''
    };
  }

  load(key, fallback) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      console.warn(`Error loading ${key} from storage:`, e);
      return fallback;
    }
  }

  save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`Error saving ${key} to storage:`, e);
    }
  }

  // Reactive Event Bus
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.listeners.get(event).delete(callback);
  }

  emit(event, payload) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => {
        try {
          cb(payload);
        } catch (err) {
          console.error(`Error in listener for ${event}:`, err);
        }
      });
    }
  }

  // Profile Actions
  updateProfile(updates) {
    this.profile = { ...this.profile, ...updates };
    this.save(STORAGE_KEYS.PROFILE, this.profile);
    this.emit('profile:updated', this.profile);
  }

  // Today Log Actions
  updateToday(updates) {
    this.today = { ...this.today, ...updates };
    this.save(STORAGE_KEYS.TODAY, this.today);
    this.emit('today:updated', this.today);
  }

  // Hydration with Undo Support
  addHydration(ml) {
    const prev = this.today.hydrationMl;
    const next = Math.max(0, prev + ml);
    this.lastHydrationAction = { type: 'ADD', amount: ml, prev };
    this.updateToday({ hydrationMl: next });
    this.emit('hydration:action', { action: 'ADD', amount: ml, total: next });
  }

  subtractHydration(ml) {
    const prev = this.today.hydrationMl;
    const next = Math.max(0, prev - ml);
    this.lastHydrationAction = { type: 'SUBTRACT', amount: ml, prev };
    this.updateToday({ hydrationMl: next });
    this.emit('hydration:action', { action: 'SUBTRACT', amount: ml, total: next });
  }

  setHydrationExact(ml) {
    const prev = this.today.hydrationMl;
    const next = Math.max(0, parseInt(ml, 10) || 0);
    this.lastHydrationAction = { type: 'SET', prev };
    this.updateToday({ hydrationMl: next });
    this.emit('hydration:action', { action: 'SET', total: next });
  }

  undoLastHydration() {
    if (!this.lastHydrationAction) return false;
    const prev = this.lastHydrationAction.prev;
    this.lastHydrationAction = null;
    this.updateToday({ hydrationMl: prev });
    this.emit('hydration:action', { action: 'UNDO', total: prev });
    return true;
  }

  toggleElectrolytes() {
    const next = !this.today.electrolytesLogged;
    this.updateToday({ electrolytesLogged: next });
  }

  // Battery Update
  setBattery(value) {
    const battery = Math.min(100, Math.max(1, parseInt(value, 10) || 50));
    this.updateToday({ battery });
  }

  // Symptoms Toggle & Official Save
  toggleSymptom(symptomId) {
    const symptoms = new Set(this.today.symptoms || []);
    if (symptoms.has(symptomId)) {
      symptoms.delete(symptomId);
    } else {
      symptoms.add(symptomId);
    }
    this.updateToday({ symptoms: Array.from(symptoms) });
  }

  clearSymptoms() {
    this.updateToday({ symptoms: [] });
  }

  saveSymptomsOfficial() {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const fullTimestamp = `${this.today.date} ${timeString}`;
    this.updateToday({ symptomsSavedAt: fullTimestamp });
    this.saveCurrentDayToHistory();
    this.emit('symptoms:saved', { timestamp: fullTimestamp, count: (this.today.symptoms || []).length });
    return fullTimestamp;
  }

  // History Archiving
  archiveDay(dayLog) {
    try {
      const history = this.load(STORAGE_KEYS.HISTORY, []);
      const index = history.findIndex(item => item.date === dayLog.date);
      if (index >= 0) {
        history[index] = dayLog;
      } else {
        history.unshift(dayLog);
      }
      // Keep last 90 days
      const trimmed = history.slice(0, 90);
      this.history = trimmed;
      this.save(STORAGE_KEYS.HISTORY, trimmed);
    } catch (e) {
      console.warn('Error archiving day log:', e);
    }
  }

  saveCurrentDayToHistory() {
    this.archiveDay(this.today);
  }
}

export const store = new StateStore();
