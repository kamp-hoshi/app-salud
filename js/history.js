/**
 * PIT CREW TELEMETRY & HEALTH (DISAUTONOMÍA / POTS / PACING V4.0 MASTER)
 * HISTORY & MEDICAL EXPORT (CSV / JSON TELEMETRY LOGS)
 */

import { store } from './state.js';
import { soundFx } from './audio-synth.js';

export class HistoryTelemetryManager {
  constructor() {
    this.container = document.getElementById('history-log-container');
    this.btnExportJson = document.getElementById('btn-export-json');
    this.btnExportCsv = document.getElementById('btn-export-csv');
    this.fileImportInput = document.getElementById('import-file-input');
    this.btnImportTrigger = document.getElementById('btn-trigger-import');
  }

  init() {
    this.render();
    this.bindEvents();
    store.on('today:updated', () => this.render());
  }

  bindEvents() {
    if (this.btnExportJson) {
      this.btnExportJson.addEventListener('click', () => {
        soundFx.playTactileClick();
        this.exportJSON();
      });
    }

    if (this.btnExportCsv) {
      this.btnExportCsv.addEventListener('click', () => {
        soundFx.playTactileClick();
        this.exportCSV();
      });
    }

    if (this.btnImportTrigger && this.fileImportInput) {
      this.btnImportTrigger.addEventListener('click', () => {
        this.fileImportInput.click();
      });

      this.fileImportInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          this.importDataFile(e.target.files[0]);
        }
      });
    }
  }

  render() {
    if (!this.container) return;

    // Collect all records: today + history
    const allRecords = [store.today, ...store.history.filter(h => h.date !== store.today.date)];
    
    if (allRecords.length === 0) {
      this.container.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 20px;">
          No hay registros históricos aún.
        </div>
      `;
      return;
    }

    let html = '';
    allRecords.slice(0, 14).forEach(record => {
      const isToday = record.date === store.today.date;
      const statusColor = record.f1Status === 'RED' ? 'var(--f1-red)' : record.f1Status === 'AMBER' ? 'var(--f1-amber)' : 'var(--f1-green)';
      const symptomCount = (record.symptoms || []).length;

      html += `
        <div class="card-tactical" style="padding: 14px 16px; border-left: 4px solid ${statusColor};">
          <div class="flex-between">
            <span style="font-family: var(--font-mono); font-weight: 800; font-size: 0.95rem; color: var(--text-pure);">
              ${record.date} ${isToday ? '<span class="badge badge-green">HOY</span>' : ''}
            </span>
            <span class="badge" style="background: rgba(255,255,255,0.06); color: ${statusColor};">
              ${record.f1Status || 'VERDE'}
            </span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 8px; font-size: 0.8rem; color: var(--text-secondary);">
            <div>🔋 Batería: <strong style="color: var(--text-pure);">${record.battery || 70}%</strong></div>
            <div>💧 Agua: <strong style="color: var(--text-pure);">${(record.hydrationMl || 0).toLocaleString()} ml</strong></div>
            <div>❤️ RHR: <strong style="color: var(--text-pure);">${record.rhr ? `${record.rhr} bpm` : '--'}</strong></div>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 0.78rem; color: var(--text-muted); margin-top: 4px;">
            <span>🌙 Sueño Prof.: ${record.deepSleepHours ? `${record.deepSleepHours}h` : '--'}</span>
            <span>⚖️ Peso: ${record.weightKg ? `${record.weightKg}kg` : '--'}</span>
            <span>⚡ Síntomas: ${symptomCount}</span>
          </div>
        </div>
      `;
    });

    this.container.innerHTML = html;
  }

  exportJSON() {
    const data = {
      version: '4.0',
      exportedAt: new Date().toISOString(),
      profile: store.profile,
      today: store.today,
      history: store.history
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Telemetria_PitCrew_Salud_${store.getTodayDateString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  exportCSV() {
    const allRecords = [store.today, ...store.history.filter(h => h.date !== store.today.date)];
    
    let csv = 'Fecha,Estado_F1,Bateria_Percibida_Pct,Hidratacion_ml,Electrolitos_Registrado,FC_Reposo_bpm,Sueno_Profundo_h,Peso_kg,Cantidad_Sintomas,Sintomas_Detalle,Temp_C,Presion_hPa\n';

    allRecords.forEach(r => {
      const date = r.date || '';
      const f1 = r.f1Status || '';
      const battery = r.battery || '';
      const hyd = r.hydrationMl || 0;
      const elec = r.electrolytesLogged ? 'SI' : 'NO';
      const rhr = r.rhr || '';
      const deep = r.deepSleepHours || '';
      const weight = r.weightKg || '';
      const symList = (r.symptoms || []).join(';');
      const symCount = (r.symptoms || []).length;
      const temp = r.weather && r.weather.temp !== null ? r.weather.temp : '';
      const press = r.weather && r.weather.pressureHpa !== null ? r.weather.pressureHpa : '';

      csv += `"${date}","${f1}",${battery},${hyd},"${elec}",${rhr},${deep},${weight},${symCount},"${symList}",${temp},${press}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Telemetria_Clinica_POTS_${store.getTodayDateString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importDataFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (parsed.profile) {
          store.updateProfile(parsed.profile);
        }
        if (parsed.history && Array.isArray(parsed.history)) {
          store.history = parsed.history;
          store.save('pitcrew_history_v4', store.history);
        }
        if (parsed.today && parsed.today.date === store.getTodayDateString()) {
          store.updateToday(parsed.today);
        }
        soundFx.playHydrationSound();
        alert('Datos importados correctamente.');
        this.render();
      } catch (err) {
        alert('Archivo de copia de seguridad no válido.');
      }
    };
    reader.readAsText(file);
  }
}
