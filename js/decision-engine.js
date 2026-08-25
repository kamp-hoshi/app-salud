/**
 * PIT CREW TELEMETRY & HEALTH (DISAUTONOMÍA / POTS / PACING V4.0 MASTER)
 * MODULE 4: F1 DECISION ENGINE & PACING SEMAPHORE (GREEN, SAFETY CAR, BUNKER)
 */

import { store } from './state.js';

export class DecisionEngine {
  constructor() {
    this.container = document.getElementById('decision-engine-view');
    this.batterySlider = document.getElementById('battery-perceived-slider');
    this.batteryDisplay = document.getElementById('battery-percentage-text');
    this.batteryStateTag = document.getElementById('battery-state-tag');
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

    // Battery Quick Presets (25%, 50%, 75%, 100%)
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
    const p = store.profile;
    const battery = t.battery || 70;
    const symptoms = t.symptoms || [];
    const symptomCount = symptoms.length;
    const hasCriticalSymptom = symptoms.includes('chassis_horizontal') || symptoms.includes('vasc_mareo');
    const weatherAlert = t.weather && t.weather.pressureAlert;

    // Red condition: Battery < 40% OR >= 5 symptoms OR urgent horizontal position needed
    if (battery < 40 || symptomCount >= 5 || symptoms.includes('chassis_horizontal')) {
      return {
        status: 'RED',
        title: '🔴 MODO BÚNKER (Reposo Táctico Obligatorio)',
        directive: 'ALERTA DE CHASIS: La reserva fisiológica está agotada. Queda prohibida la exigencia ortostática, social o de productividad. El descanso en posición horizontal es una prescripción médica táctica para restaurar el flujo cerebral.',
        isBunker: true
      };
    }

    // Amber condition: Battery 40%-70% OR 2-4 symptoms OR barometric pressure drop
    if (battery <= 70 || symptomCount >= 2 || weatherAlert) {
      return {
        status: 'AMBER',
        title: '🟡 SAFETY CAR (Precaución y Pacing Táctico)',
        directive: 'VELOCIDAD REDUCIDA: Chasis con reserva limitada. Se recomienda intercalar 20 min de tareas suaves con pausas horizontales o de bajo impacto. Realiza las Misiones Cinéticas a Ras de Suelo y refuerza electrolitos.',
        isSafetyCar: true
      };
    }

    // Green condition
    return {
      status: 'GREEN',
      title: '🟢 PISTA LIBRE (Energía Estable)',
      directive: 'CONDICIÓN ÓPTIMA: Batería y telemetría en rango favorable. Ventana adecuada para proyectos o actividad con foco. Aplica pacing preventivo: hidrátate constantemente y no permanezcas de pie inmóvil más de 30 min.',
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
      // Colorize slider track
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

    // Highlight active preset button
    document.querySelectorAll('.btn-preset').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.val, 10) === battery);
    });

    // Render Semaphore & Directives
    this.renderSemaphoreUI(evaluation);
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

      ${isAmber ? `
        <div class="kinetic-missions-box">
          <div class="mission-title">
            <span>🛡️ MISIONES CINÉTICAS A RAS DE SUELO (Sin Ortostatismo)</span>
          </div>
          <ul class="mission-list">
            <li><strong>Piernas a 45° en pared:</strong> 10 a 15 minutos de retorno venoso pasivo al cerebro.</li>
            <li><strong>Movilidad en colchoneta:</strong> Estiramientos suaves de gemelos y cuádriceps en el suelo.</li>
            <li><strong>Bomba Muscular Salina:</strong> Beber 350-500 ml de agua fría con sal/electrolitos.</li>
            <li><strong>Preservación Cognitiva:</strong> Posponer llamadas complejas o decisiones fatigosas.</li>
          </ul>
        </div>
      ` : ''}

      ${isRed ? `
        <div class="rest-certificate-card">
          <div class="certificate-seal">VÁLIDO HOY</div>
          <div class="certificate-header">🛡️ PERMISO TÁCTICO OFICIAL DE REPOSO</div>
          <div class="certificate-body">
            <strong>Certificación de Preservación de Chasis:</strong><br>
            Tu cuerpo no está "siendo flojo"; tu sistema nervioso autónomo está en déficit hemodinámico. 
            El reposo absoluto en posición horizontal es una maniobra médica de reparación, no un fallo moral. 
            Cancela tareas no esenciales y delega en tu red de apoyo.
          </div>
          <div class="certificate-footer">
            PROTOCOLO PIT CREW DISAUTONOMÍA • FECHA: ${store.today.date}
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

    // Bind Bunker quick buttons
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
}
