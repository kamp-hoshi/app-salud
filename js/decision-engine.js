/**
 * PIT CREW TELEMETRY & HEALTH (DISAUTONOMÍA / POTS / PACING V4.0 MASTER)
 * MODULE 4: TACTICAL DAILY HEALTH DASHBOARD & PACING ENGINE
 * REAL-TIME SUMMARY OF TODAY'S VITALS, F1 SEMAPHORE, SYMPTOMS & DIRECTIVES
 */

import { store } from './state.js';
import { SYMPTOMS_CATALOG } from './symptoms.js';

export class DecisionEngine {
  constructor() {
    this.batterySlider = document.getElementById('battery-perceived-slider');
    this.batteryDisplay = document.getElementById('battery-percentage-text');
    this.batteryStateTag = document.getElementById('battery-state-tag');
    this.dashboardContainer = document.getElementById('pacing-dashboard-view');
  }

  init() {
    this.bindBatteryEvents();
    this.calculateAndRender();
    store.on('today:updated', () => this.calculateAndRender());
    store.on('profile:updated', () => this.calculateAndRender());
  }

  bindBatteryEvents() {
    if (this.batterySlider) {
      this.batterySlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        store.setBattery(val);
      });
    }

    document.querySelectorAll('.btn-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseInt(btn.dataset.val, 10);
        if (!isNaN(val)) {
          store.setBattery(val);
        }
      });
    });
  }

  evaluateState() {
    const t = store.today;
    const battery = t.battery || 70;
    const symptoms = t.symptoms || [];
    const symptomCount = symptoms.length;
    const weatherAlert = t.weather && t.weather.pressureAlert;
    const hasCriticalSymptom = symptoms.includes('chassis_horizontal') || symptoms.includes('vasc_mareo');

    const reasons = [];

    // Check battery
    if (battery < 40) {
      reasons.push(`Batería percibida en nivel crítico (${battery}%)`);
    } else if (battery <= 70) {
      reasons.push(`Batería percibida moderada (${battery}%)`);
    }

    // Check symptoms
    if (symptoms.includes('chassis_horizontal')) {
      reasons.push('Necesidad urgente de posición horizontal reportada');
    }
    if (symptoms.includes('vasc_mareo')) {
      reasons.push('Mareo o visión borrosa al pararse');
    }
    if (symptoms.includes('vasc_taquicardia')) {
      reasons.push('Taquicardia postural activa');
    }
    if (symptomCount >= 5) {
      reasons.push(`Sobrecarga sintomática alta (${symptomCount} síntomas activos)`);
    } else if (symptomCount >= 2) {
      reasons.push(`${symptomCount} síntomas reportados`);
    }

    // Check weather
    if (weatherAlert) {
      reasons.push(`Caída barométrica detectada (Δ ${t.weather.pressureDelta || -3} hPa)`);
    }

    // Check stress & sleep
    if (t.stressLevel && t.stressLevel > 70) {
      reasons.push(`Estrés elevado (${t.stressLevel}/100)`);
    }
    if (t.deepSleepHours !== null && t.deepSleepHours < 1.0) {
      reasons.push(`Sueño profundo reducido (${t.deepSleepHours}h)`);
    }

    // RED
    if (battery < 40 || symptomCount >= 5 || symptoms.includes('chassis_horizontal')) {
      return {
        status: 'RED',
        title: '🔴 MODO BÚNKER (Reposo Táctico Obligatorio)',
        reasons: reasons.length ? reasons : ['Déficit autonómico o fatiga severa detectada'],
        directive: 'La reserva fisiológica de tu chasis está agotada. Queda prohibida la exigencia ortostática, social o de productividad. El descanso horizontal es una necesidad fisiológica para restaurar la perfusión cerebral.',
        isBunker: true
      };
    }

    // AMBER
    if (battery <= 70 || symptomCount >= 2 || weatherAlert || (t.stressLevel && t.stressLevel > 60)) {
      return {
        status: 'AMBER',
        title: '🟡 SAFETY CAR (Precaución y Pacing Táctico)',
        reasons: reasons.length ? reasons : ['Reserva intermedia de energía', 'Prevención de crisis'],
        directive: 'Velocidad reducida. Intercala 20 minutos de tareas de baja demanda con pausas de descanso en posición sentada o pies elevados. Realiza las Misiones Cinéticas a Ras de Suelo y refuerza hidratación salina.',
        isSafetyCar: true
      };
    }

    // GREEN
    return {
      status: 'GREEN',
      title: '🟢 PISTA LIBRE (Energía y Chasis Estable)',
      reasons: reasons.length ? reasons : ['Batería > 70%', 'Biometría en rango óptimo'],
      directive: 'Condición favorable para avanzar en proyectos con foco. Aplica pacing preventivo: hidrátate constantemente y evita estar de pie inmóvil más de 30 minutos.',
      isGreen: true
    };
  }

  calculateAndRender() {
    const evaluation = this.evaluateState();
    store.today.f1Status = evaluation.status;

    // Update battery slider and display
    const battery = store.today.battery || 70;
    if (this.batterySlider) {
      this.batterySlider.value = battery;
      if (battery >= 70) {
        this.batterySlider.style.background = `linear-gradient(90deg, #00ff9d ${battery}%, #0a111a ${battery}%)`;
      } else if (battery >= 40) {
        this.batterySlider.style.background = `linear-gradient(90deg, #f59e0b ${battery}%, #0a111a ${battery}%)`;
      } else {
        this.batterySlider.style.background = `linear-gradient(90deg, #ef4444 ${battery}%, #0a111a ${battery}%)`;
      }
    }

    if (this.batteryDisplay) {
      this.batteryDisplay.textContent = `${battery}%`;
      if (battery >= 70) {
        this.batteryDisplay.style.color = 'var(--f1-green)';
      } else if (battery >= 40) {
        this.batteryDisplay.style.color = 'var(--f1-amber)';
      } else {
        this.batteryDisplay.style.color = 'var(--f1-red)';
      }
    }

    if (this.batteryStateTag) {
      if (battery >= 70) {
        this.batteryStateTag.className = 'battery-state-tag badge-green';
        this.batteryStateTag.textContent = 'Batería Alta';
      } else if (battery >= 40) {
        this.batteryStateTag.className = 'battery-state-tag badge-amber';
        this.batteryStateTag.textContent = 'Batería Media';
      } else {
        this.batteryStateTag.className = 'battery-state-tag badge-red';
        this.batteryStateTag.textContent = 'Batería Crítica';
      }
    }

    document.querySelectorAll('.btn-preset').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.val, 10) === battery);
    });

    // Render Semaphore on Dashboard and Home
    this.renderSemaphoreUI(evaluation);
    this.renderTacticalDashboard(evaluation);
  }

  renderSemaphoreUI(ev) {
    const semaphoreBox = document.getElementById('f1-semaphore-box');
    if (!semaphoreBox) return;

    const isGreen = ev.status === 'GREEN';
    const isAmber = ev.status === 'AMBER';
    const isRed = ev.status === 'RED';

    semaphoreBox.className = `f1-semaphore-container status-${ev.status.toLowerCase()}`;
    semaphoreBox.innerHTML = `
      <div class="f1-traffic-lights">
        <div class="traffic-bulb green ${isGreen ? 'active' : ''}"></div>
        <div class="traffic-bulb amber ${isAmber ? 'active' : ''}"></div>
        <div class="traffic-bulb red ${isRed ? 'active' : ''}"></div>
      </div>

      <div class="semaphore-status-title">${ev.title}</div>
      <div class="semaphore-directive">${ev.directive}</div>

      <div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 10px 12px; margin-top: 4px;">
        <div style="font-size: 0.78rem; font-weight: bold; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 4px;">
          🔍 Por qué este estado:
        </div>
        <ul style="padding-left: 18px; font-size: 0.8rem; color: var(--text-primary); line-height: 1.4;">
          ${ev.reasons.map(r => `<li>${r}</li>`).join('')}
        </ul>
      </div>

      ${isAmber ? `
        <div class="kinetic-missions-box">
          <div class="mission-title">
            <span>🛡️ MISIONES CINÉTICAS A RAS DE SUELO (Sin Ortostatismo)</span>
          </div>
          <ul class="mission-list">
            <li><strong>Piernas a 45° en pared:</strong> 10 a 15 min de retorno venoso pasivo hacia el cerebro.</li>
            <li><strong>Movilidad en suelo:</strong> Estiramientos suaves de gemelos y cuádriceps en colchoneta.</li>
            <li><strong>Bomba Muscular Salina:</strong> Beber 350-500 ml de agua con sal/electrolitos.</li>
            <li><strong>Preservación Cognitiva:</strong> Posponer reuniones o llamadas agotadoras.</li>
          </ul>
        </div>
      ` : ''}

      ${isRed ? `
        <div class="rest-certificate-card">
          <div class="certificate-seal">VÁLIDO HOY</div>
          <div class="certificate-header">🛡️ PERMISO TÁCTICO OFICIAL DE REPOSO</div>
          <div class="certificate-body">
            <strong>Prescripción de Preservación de Chasis:</strong><br>
            Tu cuerpo no está "siendo flojo"; tu sistema nervioso autónomo está en déficit hemodinámico. 
            El reposo absoluto en posición horizontal es una maniobra médica para oxigenar tu cerebro, no un fallo moral. 
            Delega responsabilidades y descansa sin culpas.
          </div>
          <div class="certificate-footer">
            PROTOCOLO PIT CREW DISAUTONOMÍA • ${store.today.date}
          </div>
        </div>

        <div style="display: flex; gap: 10px; margin-top: 6px;">
          <button id="btn-quick-sos-bunker" class="btn-primary-tactical" style="background: var(--f1-red); box-shadow: 0 4px 15px var(--f1-red-glow);">
            🚨 ABRIR SOS WHATSAPP
          </button>
          <button id="btn-quick-shield-bunker" class="btn-secondary-tactical" style="border-color: var(--f1-red); color: #fca5a5;">
            🛡️ ESCUDO MÉDICO
          </button>
        </div>
      ` : ''}
    `;

    const btnSosBunker = document.getElementById('btn-quick-sos-bunker');
    if (btnSosBunker) {
      btnSosBunker.addEventListener('click', () => {
        window.location.hash = '#sos';
      });
    }

    const btnShieldBunker = document.getElementById('btn-quick-shield-bunker');
    if (btnShieldBunker) {
      btnShieldBunker.addEventListener('click', () => {
        const shieldEl = document.getElementById('medical-shield-fullscreen');
        if (shieldEl) shieldEl.classList.remove('hidden');
      });
    }
  }

  // Full Tactical Dashboard for Pacing Tab
  renderTacticalDashboard(ev) {
    const container = document.getElementById('pacing-dashboard-view');
    if (!container) return;

    const t = store.today;
    const p = store.profile;
    const hydrationPct = Math.round(((t.hydrationMl || 0) / (p.hydrationTargetMl || 3000)) * 100);

    // Get Active Symptoms Names
    const activeSymptomLabels = [];
    const activeIds = new Set(t.symptoms || []);
    SYMPTOMS_CATALOG.forEach(cat => {
      cat.items.forEach(item => {
        if (activeIds.has(item.id)) {
          activeSymptomLabels.push(item.label);
        }
      });
    });

    container.innerHTML = `
      <!-- 1. SEMAFORO STATUS HEADER -->
      <div class="card-tactical ${ev.status === 'RED' ? 'accent-red' : ev.status === 'AMBER' ? 'accent-amber' : 'accent-green'}">
        <div class="flex-between">
          <div style="font-size: 1.15rem; font-weight: 900; color: var(--text-pure);">${ev.title}</div>
          <span class="badge ${ev.status === 'RED' ? 'badge-red' : ev.status === 'AMBER' ? 'badge-amber' : 'badge-green'}">${t.date}</span>
        </div>
        <div style="font-size: 0.9rem; line-height: 1.45; color: var(--text-primary); margin-top: 4px;">
          ${ev.directive}
        </div>
        <div style="background: var(--bg-card-elevated); padding: 10px 14px; border-radius: 8px; margin-top: 6px;">
          <div style="font-size: 0.8rem; font-weight: bold; color: var(--text-secondary); text-transform: uppercase;">
            📊 Fundamento Táctico:
          </div>
          <ul style="padding-left: 18px; font-size: 0.85rem; color: var(--text-primary); margin-top: 4px; line-height: 1.4;">
            ${ev.reasons.map(r => `<li>${r}</li>`).join('')}
          </ul>
        </div>
      </div>

      <!-- 2. GRID DE NÚMEROS Y TELEMETRÍA DE HOY -->
      <div class="card-tactical">
        <div class="card-header-clean">
          <div class="card-title-tactical">
            <span class="icon">📈</span>
            <span>Telemetría de Hoy (${t.date})</span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
          <div class="metric-card">
            <div class="metric-label">🔋 Batería Percibida</div>
            <div class="metric-value" style="color: ${t.battery < 40 ? 'var(--f1-red)' : t.battery <= 70 ? 'var(--f1-amber)' : 'var(--f1-green)'};">
              ${t.battery || 70}<span class="unit">%</span>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-label">❤️ Pulso Reposo (RHR)</div>
            <div class="metric-value">
              ${t.rhr ? `${t.rhr} <span class="unit">bpm</span>` : '<span style="font-size: 1rem; color: var(--text-muted);">Sin registro</span>'}
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-label">🌙 Sueño Profundo</div>
            <div class="metric-value">
              ${t.deepSleepHours ? `${t.deepSleepHours} <span class="unit">h</span>` : '<span style="font-size: 1rem; color: var(--text-muted);">--</span>'}
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-label">🛌 Sueño Total</div>
            <div class="metric-value">
              ${t.totalSleepHours ? `${t.totalSleepHours} <span class="unit">h</span>` : '<span style="font-size: 1rem; color: var(--text-muted);">--</span>'}
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-label">🫁 Oxígeno (SpO2)</div>
            <div class="metric-value">
              ${t.spo2 ? `${t.spo2} <span class="unit">%</span>` : '<span style="font-size: 1rem; color: var(--text-muted);">--</span>'}
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-label">⚡ Nivel de Estrés</div>
            <div class="metric-value">
              ${t.stressLevel ? `${t.stressLevel} <span class="unit">/100</span>` : '<span style="font-size: 1rem; color: var(--text-muted);">--</span>'}
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-label">💧 Combustible (Agua)</div>
            <div class="metric-value" style="color: var(--f1-green);">
              ${(t.hydrationMl || 0).toLocaleString()} <span class="unit">ml (${hydrationPct}%)</span>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-label">⛅ Presión Atmosférica</div>
            <div class="metric-value" style="font-size: 1.25rem;">
              ${t.weather && t.weather.pressureHpa ? `${t.weather.pressureHpa} <span class="unit">hPa</span>` : '<span style="font-size: 1rem; color: var(--text-muted);">--</span>'}
            </div>
          </div>
        </div>
      </div>

      <!-- 3. SÍNTOMAS MARCADOS HOY -->
      <div class="card-tactical">
        <div class="card-header-clean">
          <div class="card-title-tactical">
            <span class="icon">🩺</span>
            <span>Síntomas Auditados Hoy (${activeSymptomLabels.length})</span>
          </div>
          <a href="#symptoms" class="badge badge-green" style="text-decoration: none;">EDITAR</a>
        </div>

        ${activeSymptomLabels.length > 0 ? `
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${activeSymptomLabels.map(s => `
              <span class="badge badge-amber" style="padding: 6px 12px; font-size: 0.82rem; text-transform: none;">
                ⚠️ ${s}
              </span>
            `).join('')}
          </div>
          ${t.symptomsSavedAt ? `
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 6px;">
              Registrado oficialmente: ${t.symptomsSavedAt}
            </div>
          ` : ''}
        ` : `
          <div style="color: var(--f1-green); font-size: 0.88rem; font-weight: bold;">
            ✔ Cero síntomas críticos activos registrados en este momento.
          </div>
        `}
      </div>
    `;
  }
}
