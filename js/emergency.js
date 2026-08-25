/**
 * PIT CREW TELEMETRY & HEALTH (DISAUTONOMÍA / POTS / PACING V4.0 MASTER)
 * MODULE 5: CRISIS SYSTEM & MULTI-CONTACT 1-TOUCH SOS (FLARES, SHIELD, WALLPAPER)
 */

import { store } from './state.js';
import { soundFx } from './audio-synth.js';

export class EmergencyCrisisManager {
  constructor() {
    this.flaresContainer = document.getElementById('crisis-flares-container');
    this.shieldElement = document.getElementById('medical-shield-fullscreen');
    this.btnOpenShield = document.getElementById('btn-open-medical-shield');
    this.btnCloseShield = document.getElementById('btn-close-medical-shield');
    this.btnShieldAlarm = document.getElementById('btn-shield-alarm-toggle');
    this.shieldContactsContainer = document.getElementById('shield-contacts-list');

    // Wallpaper Generator
    this.btnOpenWallpaper = document.getElementById('btn-open-wallpaper-modal');
    this.wallpaperModal = document.getElementById('wallpaper-generator-modal');
    this.btnCloseWallpaper = document.getElementById('btn-close-wallpaper-modal');
    this.btnDownloadWallpaper = document.getElementById('btn-download-wallpaper');
    this.wallpaperCanvas = document.getElementById('sos-wallpaper-canvas');
  }

  init() {
    this.renderFlares();
    this.renderShieldContacts();
    this.bindEvents();
    store.on('profile:updated', () => {
      this.renderFlares();
      this.renderShieldContacts();
      this.generateWallpaper();
    });
  }

  bindEvents() {
    // Open / Close Medical Shield
    if (this.btnOpenShield && this.shieldElement) {
      this.btnOpenShield.addEventListener('click', () => {
        soundFx.playTactileClick();
        this.shieldElement.classList.remove('hidden');
      });
    }

    if (this.btnCloseShield && this.shieldElement) {
      this.btnCloseShield.addEventListener('click', () => {
        soundFx.playTactileClick();
        soundFx.stopMedicalAlarm();
        this.shieldElement.classList.add('hidden');
        if (this.btnShieldAlarm) {
          this.btnShieldAlarm.classList.remove('sounding');
          this.btnShieldAlarm.innerHTML = '<span>🔊</span> <span>ACTIVAR ALARMA SONORA</span>';
        }
      });
    }

    // Toggle Audio Alarm
    if (this.btnShieldAlarm) {
      this.btnShieldAlarm.addEventListener('click', () => {
        const isSounding = soundFx.toggleMedicalAlarm();
        if (isSounding) {
          this.btnShieldAlarm.classList.add('sounding');
          this.btnShieldAlarm.innerHTML = '<span>🔇</span> <span>SILENCIAR ALARMA</span>';
        } else {
          this.btnShieldAlarm.classList.remove('sounding');
          this.btnShieldAlarm.innerHTML = '<span>🔊</span> <span>ACTIVAR ALARMA SONORA</span>';
        }
      });
    }

    // Wallpaper Modal
    if (this.btnOpenWallpaper && this.wallpaperModal) {
      this.btnOpenWallpaper.addEventListener('click', () => {
        soundFx.playTactileClick();
        this.wallpaperModal.classList.remove('hidden');
        this.generateWallpaper();
      });
    }

    if (this.btnCloseWallpaper && this.wallpaperModal) {
      this.btnCloseWallpaper.addEventListener('click', () => {
        this.wallpaperModal.classList.add('hidden');
      });
    }

    if (this.btnDownloadWallpaper && this.wallpaperCanvas) {
      this.btnDownloadWallpaper.addEventListener('click', () => {
        this.downloadWallpaperImage();
      });
    }
  }

  // 1. Render Individual SOS Flare Buttons
  renderFlares() {
    if (!this.flaresContainer) return;

    const contacts = store.profile.contacts || [];
    if (contacts.length === 0) {
      this.flaresContainer.innerHTML = `
        <div class="card-tactical accent-amber" style="text-align: center; padding: 16px;">
          <p style="font-size: 0.9rem; color: var(--text-primary); margin-bottom: 8px;">
            ⚠️ No has configurado contactos de emergencia aún.
          </p>
          <button id="btn-configure-sos-contacts" class="btn-secondary-tactical" style="font-size: 0.85rem;">
            ⚙️ Configurar Contactos en Ajustes
          </button>
        </div>
      `;
      const btnCfg = document.getElementById('btn-configure-sos-contacts');
      if (btnCfg) {
        btnCfg.addEventListener('click', () => {
          window.location.hash = '#settings';
        });
      }
      return;
    }

    let html = '';
    contacts.forEach((contact, idx) => {
      if (!contact.phone || !contact.phone.trim()) return;
      html += `
        <button type="button" class="btn-sos-contact" data-index="${idx}">
          <div class="sos-contact-info">
            <div class="sos-contact-name">
              <span>🚨</span>
              <span>SOS ${this.escapeHtml(contact.name || `Contacto ${idx + 1}`)}</span>
            </div>
            <div class="sos-contact-phone">${this.escapeHtml(contact.phone)} • ${contact.relation || 'Apoyo'}</div>
          </div>
          <div class="sos-whatsapp-icon" title="Enviar SOS por WhatsApp">
            💬
          </div>
        </button>
      `;
    });

    this.flaresContainer.innerHTML = html;

    // Bind 1-touch click to GPS + WhatsApp
    this.flaresContainer.querySelectorAll('.btn-sos-contact').forEach(btn => {
      btn.addEventListener('click', () => {
        soundFx.playTactileClick();
        const index = parseInt(btn.dataset.index, 10);
        this.triggerSosFlare(contacts[index]);
      });
    });
  }

  // Trigger WhatsApp SOS with GPS location
  async triggerSosFlare(contact) {
    if (!contact || !contact.phone) return;

    const cleanPhone = contact.phone.replace(/\D/g, '');
    if (!cleanPhone) {
      alert('El número de teléfono del contacto no es válido.');
      return;
    }

    const contactName = contact.name || 'Apoyo';

    const sendWithLocation = (lat, lng) => {
      const mapsUrl = lat && lng ? `https://maps.google.com/?q=${lat},${lng}` : 'Ubicación no disponible';
      const message = `Hola ${contactName}, te escribo porque estoy teniendo una crisis de disautonomía / mareo fuerte y necesito tu ayuda o que estés atento/a. Estoy aquí: ${mapsUrl}`;
      const encodedMsg = encodeURIComponent(message);
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
      
      // Native window redirection to avoid mobile popup blockers
      window.location.href = waUrl;
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          sendWithLocation(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          console.warn('Geolocation failed in SOS, sending without exact GPS:', err);
          sendWithLocation(null, null);
        },
        { timeout: 3000, enableHighAccuracy: true }
      );
    } else {
      sendWithLocation(null, null);
    }
  }

  // 2. Render Fullscreen Bystander Medical Shield Contacts
  renderShieldContacts() {
    if (!this.shieldContactsContainer) return;

    const contacts = store.profile.contacts || [];
    if (contacts.length === 0) {
      this.shieldContactsContainer.innerHTML = `
        <div style="font-size: 0.9rem; color: #9ca3af;">No hay contactos de emergencia registrados.</div>
      `;
      return;
    }

    let html = '';
    contacts.forEach((c) => {
      if (!c.phone) return;
      const cleanPhone = c.phone.replace(/\s+/g, '');
      html += `
        <a href="tel:${cleanPhone}" class="shield-call-btn">
          <span>📞 Llamar a ${this.escapeHtml(c.name)} (${this.escapeHtml(c.relation || 'ICE')})</span>
          <span style="font-family: monospace;">${this.escapeHtml(c.phone)}</span>
        </a>
      `;
    });

    this.shieldContactsContainer.innerHTML = html;
  }

  // 3. SOS Lock Screen Wallpaper Generator (HTML5 Canvas 1080 x 1920)
  generateWallpaper() {
    const canvas = this.wallpaperCanvas;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = 1080;
    const height = 1920;

    canvas.width = width;
    canvas.height = height;

    const p = store.profile;

    // Background Pure Deep Black
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Subtle Tactical Grid Borders
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 4;
    ctx.strokeRect(30, 30, width - 60, height - 60);

    // Top Red Caution Banner
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(50, 60, width - 100, 180);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.strokeRect(50, 60, width - 100, 180);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 54px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠️ ALERTA MÉDICA ⚠️', width / 2, 140);
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('CRISIS DE DISAUTONOMÍA / POTS', width / 2, 200);

    // Bystander Instructions Title
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fde047'; // Bright Yellow
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText('INSTRUCCIONES PARA TRANSEÚNTES:', 70, 310);

    // 4 Crucial Steps Box
    const steps = [
      '1. NO ME LEVANTES BRUSCAMENTE.',
      '2. Ayúdame a recostarme en el suelo.',
      '3. Eleva mis piernas a 45° (retorno sanguíneo).',
      '4. Asegura aire fresco y afloja ropa ajustada.'
    ];

    let startY = 390;
    steps.forEach((step, i) => {
      ctx.fillStyle = i === 0 ? '#ff4d4d' : '#ffffff';
      ctx.font = i === 0 ? 'bold 38px sans-serif' : 'bold 34px sans-serif';
      ctx.fillText(step, 70, startY);
      startY += 80;
    });

    // Separator line
    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(70, startY + 20);
    ctx.lineTo(width - 70, startY + 20);
    ctx.stroke();

    // Emergency Contacts Section
    startY += 90;
    ctx.fillStyle = '#4ade80'; // Green
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText('CONTACTOS DE EMERGENCIA (LLAMAR):', 70, startY);

    startY += 70;
    const contacts = p.contacts || [];
    if (contacts.length > 0) {
      contacts.forEach(c => {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 38px sans-serif';
        ctx.fillText(`• ${c.name || 'Contacto'}:`, 70, startY);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 44px monospace';
        ctx.fillText(`${c.phone || ''}`, 520, startY);
        startY += 80;
      });
    } else {
      ctx.fillStyle = '#9ca3af';
      ctx.font = '32px sans-serif';
      ctx.fillText('No se han configurado contactos.', 70, startY);
      startY += 70;
    }

    // Medical Details & Diagnostic Box
    startY += 40;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(70, startY, width - 140, 260);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    ctx.strokeRect(70, startY, width - 140, 260);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('DIAGNÓSTICO BASAL:', 100, startY + 55);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText(p.diagnosis || 'POTS / Disautonomía', 100, startY + 105);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('TRATAMIENTO / NOTAS:', 100, startY + 165);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '28px sans-serif';
    ctx.fillText(p.medicationNotes ? p.medicationNotes.substring(0, 45) : (p.medicationType || 'Hidratación y electrolitos'), 100, startY + 215);

    // Footer
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TARJETA MÉDICA PIT CREW • PANTALLA DE BLOQUEO PERMANENTE', width / 2, height - 70);
  }

  downloadWallpaperImage() {
    const canvas = this.wallpaperCanvas;
    if (!canvas) return;

    soundFx.playTactileClick();
    const link = document.createElement('a');
    link.download = 'Fondo_Pantalla_SOS_Disautonomia.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m]));
  }
}
