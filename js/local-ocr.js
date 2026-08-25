/**
 * PIT CREW TELEMETRY & HEALTH (DISAUTONOMÍA / POTS / PACING V4.0 MASTER)
 * MODULE 2A: LOCAL OCR & OPTIMIZED REGEX PARSER FOR MI FITNESS
 * EXTRACTS 4 CORE METRICS: PULSE (RHR), SLEEP, STRESS (1-100), AND SPO2 (%)
 */

import { store } from './state.js';
import { soundFx } from './audio-synth.js';

export class LocalOCRScanner {
  constructor() {
    this.dropzone = document.getElementById('ocr-dropzone');
    this.fileInput = document.getElementById('ocr-file-input');
    this.progressContainer = document.getElementById('ocr-progress-box');
    this.progressBar = document.getElementById('ocr-progress-fill');
    this.progressText = document.getElementById('ocr-progress-text');
    this.resultsCard = document.getElementById('ocr-results-card');
    
    // 4 Core Daily Manual Input Fields
    this.inputRhr = document.getElementById('manual-rhr-input');
    this.inputSleep = document.getElementById('manual-sleep-input');
    this.inputStress = document.getElementById('manual-stress-input');
    this.inputSpo2 = document.getElementById('manual-spo2-input');
    this.btnSaveMetrics = document.getElementById('btn-save-manual-metrics');
  }

  init() {
    this.bindEvents();
    this.syncManualInputsWithState();
    store.on('today:updated', () => this.syncManualInputsWithState());
  }

  syncManualInputsWithState() {
    const t = store.today;
    if (this.inputRhr && t.rhr !== null && t.rhr !== undefined) {
      this.inputRhr.value = t.rhr;
    }
    if (this.inputSleep && t.totalSleepHours !== null && t.totalSleepHours !== undefined) {
      this.inputSleep.value = t.totalSleepHours;
    } else if (this.inputSleep && t.deepSleepHours !== null && t.deepSleepHours !== undefined) {
      this.inputSleep.value = t.deepSleepHours;
    }
    if (this.inputStress && t.stressLevel !== null && t.stressLevel !== undefined) {
      this.inputStress.value = t.stressLevel;
    }
    if (this.inputSpo2 && t.spo2 !== null && t.spo2 !== undefined) {
      this.inputSpo2.value = t.spo2;
    }
  }

  bindEvents() {
    if (this.dropzone && this.fileInput) {
      this.dropzone.addEventListener('click', () => {
        this.fileInput.click();
      });

      this.dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        this.dropzone.style.borderColor = 'var(--f1-green)';
      });

      this.dropzone.addEventListener('dragleave', () => {
        this.dropzone.style.borderColor = '';
      });

      this.dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        this.dropzone.style.borderColor = '';
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          this.processImageFile(e.dataTransfer.files[0]);
        }
      });

      this.fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          this.processImageFile(e.target.files[0]);
        }
      });
    }

    if (this.btnSaveMetrics) {
      this.btnSaveMetrics.addEventListener('click', () => {
        this.saveManualInputs();
      });
    }
  }

  saveManualInputs() {
    const rhrVal = this.inputRhr ? parseInt(this.inputRhr.value, 10) : null;
    const sleepVal = this.inputSleep ? parseFloat(this.inputSleep.value) : null;
    const stressVal = this.inputStress ? parseInt(this.inputStress.value, 10) : null;
    const spo2Val = this.inputSpo2 ? parseInt(this.inputSpo2.value, 10) : null;

    store.updateToday({
      rhr: !isNaN(rhrVal) && rhrVal > 0 ? rhrVal : null,
      totalSleepHours: !isNaN(sleepVal) && sleepVal >= 0 ? sleepVal : null,
      deepSleepHours: !isNaN(sleepVal) && sleepVal >= 0 ? sleepVal : null,
      stressLevel: !isNaN(stressVal) && stressVal >= 0 ? Math.min(100, stressVal) : null,
      spo2: !isNaN(spo2Val) && spo2Val > 0 ? Math.min(100, spo2Val) : null
    });

    soundFx.playTactileClick();

    const banner = document.getElementById('metrics-saved-banner');
    if (banner) {
      banner.classList.remove('hidden');
      setTimeout(() => banner.classList.add('hidden'), 3500);
    }
  }

  async processImageFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      alert('Por favor selecciona una captura de pantalla válida (.png o .jpg).');
      return;
    }

    soundFx.playTactileClick();
    this.showProgress(10, 'Pre-procesando captura en chasis local...');

    try {
      const processedImageBlob = await this.preprocessImage(file);
      this.showProgress(35, 'Iniciando motor OCR en el dispositivo...');

      const extractedText = await this.performClientOCR(processedImageBlob);
      this.showProgress(85, 'Extrayendo Pulso, Sueño, Estrés y SpO2...');

      const parsedData = this.parseMiFitnessTelemetry(extractedText);
      this.showProgress(100, 'Telemetría Mi Fitness extraída con éxito.');

      setTimeout(() => {
        this.hideProgress();
        this.applyParsedData(parsedData);
      }, 500);

    } catch (err) {
      console.error('Error during local OCR processing:', err);
      this.hideProgress();
      alert('No se pudo leer la captura automáticamente. Puedes ingresar los datos en las 4 casillas.');
    }
  }

  showProgress(percent, message) {
    if (this.progressContainer) {
      this.progressContainer.classList.remove('hidden');
    }
    if (this.progressBar) {
      this.progressBar.style.width = `${percent}%`;
    }
    if (this.progressText) {
      this.progressText.textContent = message;
    }
  }

  hideProgress() {
    if (this.progressContainer) {
      this.progressContainer.classList.add('hidden');
    }
  }

  preprocessImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target.result;
      };

      img.onload = () => {
        try {
          const maxDim = 1200;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });

          ctx.drawImage(img, 0, 0, width, height);

          const imgData = ctx.getImageData(0, 0, width, height);
          const d = imgData.data;

          for (let i = 0; i < d.length; i += 4) {
            const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            const contrastVal = gray > 135 ? Math.min(255, gray * 1.3) : Math.max(0, gray * 0.7);
            d[i] = contrastVal;
            d[i + 1] = contrastVal;
            d[i + 2] = contrastVal;
          }

          ctx.putImageData(imgData, 0, 0);

          canvas.toBlob((blob) => {
            resolve(blob || file);
          }, 'image/jpeg', 0.92);
        } catch (err) {
          console.warn('Canvas pre-processing fallback:', err);
          resolve(file);
        }
      };

      img.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async performClientOCR(imageBlob) {
    if (typeof window.Tesseract !== 'undefined') {
      const result = await window.Tesseract.recognize(
        imageBlob,
        'spa+eng',
        {
          logger: m => {
            if (m.status === 'recognizing text' && m.progress) {
              const p = Math.round(35 + m.progress * 45);
              this.showProgress(p, `Leyendo tarjetas (${Math.round(m.progress * 100)}%)...`);
            }
          }
        }
      );
      return result.data ? result.data.text : '';
    }

    return new Promise((resolve) => {
      this.showProgress(40, 'Cargando motor OCR en dispositivo...');
      
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      script.crossOrigin = 'anonymous';

      script.onload = async () => {
        try {
          if (window.Tesseract) {
            const res = await window.Tesseract.recognize(imageBlob, 'spa+eng', {
              logger: m => {
                if (m.status === 'recognizing text' && m.progress) {
                  const p = Math.round(45 + m.progress * 40);
                  this.showProgress(p, `Escaneando texto (${Math.round(m.progress * 100)}%)...`);
                }
              }
            });
            resolve(res.data ? res.data.text : '');
          } else {
            resolve('');
          }
        } catch (e) {
          console.warn('Tesseract execution warning:', e);
          resolve('');
        }
      };

      script.onerror = () => {
        console.warn('Could not load Tesseract dynamically (offline fallback).');
        resolve('');
      };

      document.head.appendChild(script);
    });
  }

  // Optimized Parser for Mi Fitness Real Capture Cards
  parseMiFitnessTelemetry(rawText) {
    if (!rawText) return { rhr: null, sleep_hours: null, stress_level: null, spo2: null };

    const text = rawText.replace(/\r?\n/g, ' ').toLowerCase();
    const result = {
      rhr: null,
      sleep_hours: null,
      stress_level: null,
      spo2: null,
      raw_sleep_str: null
    };

    // 1. PULSO / RITMO CARDÍACO (ej. "68 LPM", "68 bpm", "pulso 68", "frecuencia 68")
    const pulsePatterns = [
      /(\d{2,3})\s*(?:lpm|bpm|ppm)/i,
      /(?:frecuencia|card[ií]ac[ao]|pulso|reposo|rhr)\D{0,15}(\d{2,3})\s*(?:lpm|bpm)?/i,
      /(?:ritmo\s*card[ií]aco)\D{0,10}(\d{2,3})/i
    ];

    for (const pat of pulsePatterns) {
      const match = text.match(pat);
      if (match && match[1]) {
        const val = parseInt(match[1], 10);
        if (val >= 35 && val <= 220) {
          result.rhr = val;
          break;
        }
      }
    }

    // 2. SUEÑO (ej. "6h 4min", "6h 4m", "6 h 4 min", "7h 30m", "6.1 h")
    const sleepPatterns = [
      /(\d+)\s*(?:h|hrs?|horas?)\s*(\d+)\s*(?:min|mins?|m|minutos?)/i,
      /(?:sueño|sueno|sleep|duraci[oó]n)\D{0,15}(\d+)\s*(?:h|hrs?)\s*(\d+)?\s*(?:m|min)?/i,
      /(\d+[.,]\d+)\s*(?:h|hrs?|horas?)/i
    ];

    for (const pat of sleepPatterns) {
      const match = text.match(pat);
      if (match) {
        if (match[2] !== undefined && match[2] !== null) {
          // Format: 6h 4min
          const hrs = parseInt(match[1], 10) || 0;
          const mins = parseInt(match[2], 10) || 0;
          const totalHours = hrs + (mins / 60);
          result.sleep_hours = parseFloat(totalHours.toFixed(1));
          result.raw_sleep_str = `${hrs}h ${mins}min`;
          break;
        } else if (match[1]) {
          const val = parseFloat(match[1].replace(',', '.'));
          if (val > 0 && val <= 24) {
            result.sleep_hours = parseFloat(val.toFixed(1));
            result.raw_sleep_str = `${val} h`;
            break;
          }
        }
      }
    }

    // 3. ESTRÉS (ej. "32", "estrés 32", "puntuación 32", "relajado 32", "32 relajado")
    const stressPatterns = [
      /(?:estr[eé]s|stress|puntuaci[oó]n)\D{0,12}(\d{1,3})/i,
      /(\d{1,3})\s*(?:relajado|moderado|alto|leve)/i,
      /(?:nivel\s*de\s*estr[eé]s)\D{0,8}(\d{1,3})/i
    ];

    for (const pat of stressPatterns) {
      const match = text.match(pat);
      if (match && match[1]) {
        const val = parseInt(match[1], 10);
        if (val >= 1 && val <= 100) {
          result.stress_level = val;
          break;
        }
      }
    }

    // 4. OXÍGENO EN SANGRE / SpO2 (ej. "95%", "95 %", "spo2 95", "oxígeno 95%")
    const spo2Patterns = [
      /(?:spo2|ox[ií]geno|saturaci[oó]n|o2)\D{0,10}(\d{2,3})\s*%?/i,
      /(\d{2,3})\s*%\s*(?:spo2|ox[ií]geno|saturaci[oó]n)?/i,
      /(\d{2,3})\s*%/i
    ];

    for (const pat of spo2Patterns) {
      const match = text.match(pat);
      if (match && match[1]) {
        const val = parseInt(match[1], 10);
        if (val >= 70 && val <= 100) {
          result.spo2 = val;
          break;
        }
      }
    }

    return result;
  }

  applyParsedData(data) {
    if (this.inputRhr && data.rhr) this.inputRhr.value = data.rhr;
    if (this.inputSleep && data.sleep_hours) this.inputSleep.value = data.sleep_hours;
    if (this.inputStress && data.stress_level) this.inputStress.value = data.stress_level;
    if (this.inputSpo2 && data.spo2) this.inputSpo2.value = data.spo2;

    const updates = {};
    if (data.rhr) updates.rhr = data.rhr;
    if (data.sleep_hours) {
      updates.totalSleepHours = data.sleep_hours;
      updates.deepSleepHours = data.sleep_hours;
    }
    if (data.stress_level) updates.stressLevel = data.stress_level;
    if (data.spo2) updates.spo2 = data.spo2;

    if (Object.keys(updates).length > 0) {
      store.updateToday(updates);
      soundFx.playHydrationSound();
    }

    if (this.resultsCard) {
      this.resultsCard.classList.remove('hidden');
      this.resultsCard.innerHTML = `
        <div style="font-size: 0.9rem; font-weight: bold; color: var(--f1-green); text-transform: uppercase;">
          ⚡ Telemetría Mi Fitness Extraída
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px;">
          ${data.rhr ? `<span class="badge badge-green">❤️ Pulso: ${data.rhr} LPM</span>` : ''}
          ${data.sleep_hours ? `<span class="badge badge-green">🌙 Sueño: ${data.raw_sleep_str || `${data.sleep_hours} h`}</span>` : ''}
          ${data.stress_level ? `<span class="badge badge-green">⚡ Estrés: ${data.stress_level}/100</span>` : ''}
          ${data.spo2 ? `<span class="badge badge-green">🫁 Oxígeno (SpO2): ${data.spo2}%</span>` : ''}
        </div>
        <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 6px;">
          Valores cargados en tu tablero diario. Puedes editarlos en las casillas inferiores si lo deseas.
        </div>
      `;
    }
  }
}
