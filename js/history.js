/**
 * PIT CREW TELEMETRY & HEALTH (DISAUTONOMÍA / POTS / PACING V4.0 MASTER)
 * HISTORY & MEDICAL EXPORT (GOOGLE SHEETS CLIPBOARD, CSV & JSON TELEMETRY)
 */

import { store } from './state.js';
import { soundFx } from './audio-synth.js';

export class HistoryTelemetryManager {
  constructor() {
    this.container = document.getElementById('history-log-container');
    this.btnExportJson = document.getElementById('btn-export-json');
    this.btnExportCsv = document.getElementById('btn-export-csv');
    this.btnCopySheets = document.getElementById('btn-copy-sheets');
    this.fileImportInput = document.getElementById('import-file-input');
    this.btnImportTrigger = document.getElementById('btn-trigger-import');
    this.copyBanner = document.getElementById('sheets-copy-banner');
  }

  init() {
    this.render();
    this.bindEvents();
    store.on('today:updated', () => this.render());
  }

  bindEvents() {
    // Copy for Google Sheets
    if (this.btnCopySheets) {
      this.btnCopySheets.addEventListener('click', () => {
        soundFx.playTactileClick();
        this.copyForGoogleSheets();
      });
    }

    if (this.btnExportCsv) {
      this.btnExportCsv.addEventListener('click', () => {
        soundFx.playTactileClick();
        this.exportCSV();
      });
    }

    if (this.btnExportJson) {
      this.btnExportJson.addEventListener('click', () => {
        soundFx.playTactileClick();
        this.exportJSON();
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
            <span style="font-weight: bold; font-size: 0.95rem; color: var(--text-pure);">
              ${record.date} ${isToday ? '<span class="badge badge-green">HOY</span>' : ''}
            </span>
            <span class="badge" style="background: rgba(255,255,255,0.06); color: ${statusColor}; font-weight: bold;">
              ${record.f1Status || 'VERDE'}
            </span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 8px; font-size: 0.82rem; color: var(--text-secondary);">
            <div>🔋 Batería: <strong style="color: var(--text-pure);">${record.battery || 70}%</strong></div>
            <div>💧 Agua: <strong style="color: var(--text-pure);">${(record.hydrationMl || 0).toLocaleString()} ml</strong></div>
            <div>❤️ RHR: <strong style="color: var(--text-pure);">${record.rhr ? `${record.rhr} bpm` : '--'}</strong></div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">
            <div>🫁 SpO2: <strong style="color: var(--text-pure);">${record.spo2 ? `${record.spo2}%` : '--'}</strong></div>
            <div>⚡ Estrés: <strong style="color: var(--text-pure);">${record.stressLevel ? `${record.stressLevel}/100` : '--'}</strong></div>
            <div>🌙 Sueño: <strong style="color: var(--text-pure);">${record.deepSleepHours ? `${record.deepSleepHours}h prof.` : '--'}</strong></div>
          </div>

          <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 6px;">
            Síntomas auditados: <strong>${symptomCount}</strong> ${record.symptomsSavedAt ? `• Guardado: ${record.symptomsSavedAt}` : ''}
          </div>
        </div>
      `;
    });

    this.container.innerHTML = html;
  }

  // 1-Click Copy Formatted TSV Table for Google Sheets
  async copyForGoogleSheets() {
    const allRecords = [store.today, ...store.history.filter(h => h.date !== store.today.date)];
    
    const headers = [
      'Fecha',
      'Estado F1',
      'Batería (%)',
      'Hidratación (ml)',
      'Electrolitos',
      'FC Reposo (bpm)',
      'Sueño Profundo (h)',
      'Sueño Total (h)',
      'SpO2 (%)',
      'Estrés (1-100)',
      'Peso (kg)',
      'Cant. Síntomas',
      'Síntomas Detalle',
      'Comidas (Des/Alm/Onc/Cen)',
      'Temp (°C)',
      'Presión Barométrica (hPa)'
    ];

    let tsv = headers.join('\t') + '\n';

    allRecords.forEach(r => {
      const date = r.date || '';
      const f1 = r.f1Status || 'VERDE';
      const battery = r.battery || 70;
      const hyd = r.hydrationMl || 0;
      const elec = r.electrolytesLogged ? 'SÍ' : 'NO';
      const rhr = r.rhr || '';
      const deep = r.deepSleepHours || '';
      const totalSleep = r.totalSleepHours || '';
      const spo2 = r.spo2 || '';
      const stress = r.stressLevel || '';
      const weight = r.weightKg || store.profile.weightKg || '';
      const symList = (r.symptoms || []).join('; ');
      const symCount = (r.symptoms || []).length;
      
      const m = r.meals || {};
      const mealsStr = [
        m.breakfast && m.breakfast.size ? `Des:${m.breakfast.size}` : '',
        m.lunch && m.lunch.size ? `Alm:${m.lunch.size}` : '',
        m.snack && m.snack.enabled && m.snack.size ? `Onc:${m.snack.size}` : '',
        m.dinner && m.dinner.enabled && m.dinner.size ? `Cen:${m.dinner.size}` : ''
      ].filter(Boolean).join(', ');

      const temp = r.weather && r.weather.temp !== null ? r.weather.temp : '';
      const press = r.weather && r.weather.pressureHpa !== null ? r.weather.pressureHpa : '';

      const row = [
        date,
        f1,
        battery,
        hyd,
        elec,
        rhr,
        deep,
        totalSleep,
        spo2,
        stress,
        weight,
        symCount,
        symList,
        mealsStr,
        temp,
        press
      ];

      tsv += row.join('\t') + '\n';
    });

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(tsv);
      } else {
        // Fallback for older browsers / iframe
        const textarea = document.createElement('textarea');
        textarea.value = tsv;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      soundFx.playHydrationSound();
      if (this.copyBanner) {
        this.copyBanner.classList.remove('hidden');
        setTimeout(() => {
          if (this.copyBanner) this.copyBanner.classList.add('hidden');
        }, 5000);
      }
    } catch (e) {
      console.warn('Clipboard write failed, triggering CSV download fallback:', e);
      this.exportCSV();
    }
  }

  exportCSV() {
    const allRecords = [store.today, ...store.history.filter(h => h.date !== store.today.date)];
    
    let csv = 'Fecha,Estado_F1,Bateria_Percibida_Pct,Hidratacion_ml,Electrolitos_Registrado,FC_Reposo_bpm,Sueno_Profundo_h,Sueno_Total_h,SpO2_pct,Estres_Nivel,Peso_kg,Cantidad_Sintomas,Sintomas_Detalle,Comidas_Nutricion,Temp_C,Presion_hPa\n';

    allRecords.forEach(r => {
      const date = r.date || '';
      const f1 = r.f1Status || '';
      const battery = r.battery || '';
      const hyd = r.hydrationMl || 0;
      const elec = r.electrolytesLogged ? 'SI' : 'NO';
      const rhr = r.rhr || '';
      const deep = r.deepSleepHours || '';
      const totalSleep = r.totalSleepHours || '';
      const spo2 = r.spo2 || '';
      const stress = r.stressLevel || '';
      const weight = r.weightKg || store.profile.weightKg || '';
      const symList = (r.symptoms || []).join(';');
      const symCount = (r.symptoms || []).length;
      
      const m = r.meals || {};
      const mealsStr = [
        m.breakfast && m.breakfast.size ? `Des:${m.breakfast.size}` : '',
        m.lunch && m.lunch.size ? `Alm:${m.lunch.size}` : '',
        m.snack && m.snack.enabled && m.snack.size ? `Onc:${m.snack.size}` : '',
        m.dinner && m.dinner.enabled && m.dinner.size ? `Cen:${m.dinner.size}` : ''
      ].filter(Boolean).join('; ');

      const temp = r.weather && r.weather.temp !== null ? r.weather.temp : '';
      const press = r.weather && r.weather.pressureHpa !== null ? r.weather.pressureHpa : '';

      csv += `"${date}","${f1}",${battery},${hyd},"${elec}",${rhr},${deep},${totalSleep},${spo2},${stress},${weight},${symCount},"${symList}","${mealsStr}",${temp},${press}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reporte_Telemetria_GoogleSheets_${store.getTodayDateString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
