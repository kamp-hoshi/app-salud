/**
 * PIT CREW TELEMETRY & HEALTH (DISAUTONOMÍA / POTS / PACING V4.0 MASTER)
 * MODULE 2A: LOCAL ON-DEVICE OCR & EXPANDED REGEX PARSER (MI FITNESS / EUFYLIFE)
 * EXTRACTS: RHR, DEEP SLEEP, TOTAL SLEEP, SPO2 %, STRESS LEVEL & WEIGHT
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
    
    // Manual Input Fields (Extended)
    this.inputRhr = document.getElementById('manual-rhr-input');
    this.inputSleep = document.getElementById('manual-sleep-input');
    this.inputTotalSleep = document.getElementById('manual-totalsleep-input');
    this.inputSpo2 = document.getElementById('manual-spo2-input');
    this.inputStress = document.getElementById('manual-stress-input');
    this.inputWeight = document.getElementById('manual-weight-input');
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
    if (this.inputSleep && t.deepSleepHours !== null && t.deepSleepHours !== undefined) {
      this.inputSleep.value = t.deepSleepHours;
    }
    if (this.inputTotalSleep && t.totalSleepHours !== null && t.totalSleepHours !== undefined) {
      this.inputTotalSleep.value = t.totalSleepHours;
    }
    if (this.inputSpo2 && t.spo2 !== null && t.spo2 !== undefined) {
      this.inputSpo2.value = t.spo2;
    }
    if (this.inputStress && t.stressLevel !== null && t.stressLevel !== undefined) {
      this.inputStress.value = t.stressLevel;
    }
    if (this.inputWeight && t.weightKg !== null && t.weightKg !== undefined) {
      this.inputWeight.value = t.weightKg;
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
    const totalSleepVal = this.inputTotalSleep ? parseFloat(this.inputTotalSleep.value) : null;
    const spo2Val = this.inputSpo2 ? parseInt(this.inputSpo2.value, 10) : null;
    const stressVal = this.inputStress ? parseInt(this.inputStress.value, 10) : null;
    const weightVal = this.inputWeight ? parseFloat(this.inputWeight.value) : null;

    store.updateToday({
      rhr: !isNaN(rhrVal) && rhrVal > 0 ? rhrVal : null,
      deepSleepHours: !isNaN(sleepVal) && sleepVal >= 0 ? sleepVal : null,
      totalSleepHours: !isNaN(totalSleepVal) && totalSleepVal >= 0 ? totalSleepVal : null,
      spo2: !isNaN(spo2Val) && spo2Val > 0 ? Math.min(100, spo2Val) : null,
      stressLevel: !isNaN(stressVal) && stressVal >= 0 ? Math.min(100, stressVal) : null,
      weightKg: !isNaN(weightVal) && weightVal > 0 ? weightVal : null
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
    this.showProgress(10, 'Pre-procesando imagen en chasis local...');

    try {
      // 1. Client-Side Preprocessing via Canvas
      const processedImageBlob = await this.preprocessImage(file);
      
      this.showProgress(35, 'Iniciando motor OCR en el dispositivo...');

      // 2. Perform On-Device OCR
      const extractedText = await this.performClientOCR(processedImageBlob);
      
      this.showProgress(85, 'Extrayendo RHR, Sueño, SpO2 y Estrés...');

      // 3. Parse with Expanded Regex for Mi Fitness & EufyLife
      const parsedData = this.parseTelemetryText(extractedText);

      this.showProgress(100, 'Telemetría extraída con éxito.');

      // 4. Update UI and Store
      setTimeout(() => {
        this.hideProgress();
        this.applyParsedData(parsedData);
      }, 500);

    } catch (err) {
      console.error('Error during local OCR processing:', err);
      this.hideProgress();
      alert('No se pudo leer la captura automáticamente. Puedes ingresar los datos manualmente en las casillas.');
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

  // Canvas Preprocessing
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

          // Contrast boost
          const imgData = ctx.getImageData(0, 0, width, height);
          const d = imgData.data;

          for (let i = 0; i < d.length; i += 4) {
            const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            const contrastVal = gray > 140 ? Math.min(255, gray * 1.25) : Math.max(0, gray * 0.75);
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

  // Client-Side OCR Execution
  async performClientOCR(imageBlob) {
    if (typeof window.Tesseract !== 'undefined') {
      const result = await window.Tesseract.recognize(
        imageBlob,
        'spa+eng',
        {
          logger: m => {
            if (m.status === 'recognizing text' && m.progress) {
              const p = Math.round(35 + m.progress * 45);
              this.showProgress(p, `Leyendo telemetría (${Math.round(m.progress * 100)}%)...`);
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

  // Expanded Regex Telemetry Parser for Mi Fitness & EufyLife
  parseTelemetryText(rawText) {
    if (!rawText) return { rhr: null, deep_sleep_hours: null, total_sleep_hours: null, spo2: null, stress_level: null, weight_kg: null, app_detected: 'Manual' };

    const text = rawText.replace(/\r?\n/g, ' ').toLowerCase();
    const result = {
      rhr: null,
      deep_sleep_hours: null,
      total_sleep_hours: null,
      spo2: null,
      stress_level: null,
      weight_kg: null,
      app_detected: 'Mi Fitness / Salud'
    };

    // 1. App Detection
    if (text.includes('fitness') || text.includes('xiaomi') || text.includes('mi fit') || text.includes('band')) {
      result.app_detected = 'Mi Fitness';
    } else if (text.includes('eufy') || text.includes('scale') || text.includes('báscula') || text.includes('bascula')) {
      result.app_detected = 'EufyLife / Báscula';
    }

    // 2. Resting Heart Rate (RHR / Pulso en Reposo)
    const rhrPatterns = [
      /(?:reposo|rhr|frecuencia\s+en\s+reposo|pulso\s+en\s+reposo)\D{0,15}(\d{2,3})/i,
      /(?:pulso|frecuencia|card[ií]ac[ao]|bpm)\D{0,10}(\d{2,3})\s*(?:bpm|lpm)?/i,
      /(\d{2,3})\s*(?:bpm|lpm|ppm)/i
    ];

    for (const pat of rhrPatterns) {
      const match = text.match(pat);
      if (match && match[1]) {
        const val = parseInt(match[1], 10);
        if (val >= 35 && val <= 220) {
          result.rhr = val;
          break;
        }
      }
    }

    // 3. Deep Sleep (Sueño Profundo)
    const deepSleepPatterns = [
      /(?:profundo|deep)\D{0,15}(\d+)\s*(?:h|hrs?|horas?)\s*(\d+)?\s*(?:m|min|mins?|minutos?)?/i,
      /(?:profundo|deep)\D{0,10}(\d+[.,]\d+)\s*(?:h|hrs?|horas?)/i
    ];

    for (const pat of deepSleepPatterns) {
      const match = text.match(pat);
      if (match) {
        if (match[2] !== undefined) {
          const hrs = parseInt(match[1], 10) || 0;
          const mins = parseInt(match[2], 10) || 0;
          result.deep_sleep_hours = parseFloat((hrs + (mins / 60)).toFixed(2));
          break;
        } else if (match[1]) {
          const val = parseFloat(match[1].replace(',', '.'));
          if (val > 0 && val <= 15) {
            result.deep_sleep_hours = parseFloat(val.toFixed(2));
            break;
          }
        }
      }
    }

    // 4. Total Sleep (Sueño Total)
    const totalSleepPatterns = [
      /(?:total|sueño\s+total|duraci[oó]n\s+del\s+sueño)\D{0,15}(\d+)\s*(?:h|hrs?|horas?)\s*(\d+)?\s*(?:m|min|mins?)?/i,
      /(?:sueño|sueno|sleep)\D{0,15}(\d+)\s*(?:h|hrs?|horas?)\s*(\d+)?\s*(?:m|min)?/i,
      /(\d+)\s*(?:h|hrs)\s*(\d+)\s*(?:m|min)/i
    ];

    for (const pat of totalSleepPatterns) {
      const match = text.match(pat);
      if (match) {
        if (match[2] !== undefined) {
          const hrs = parseInt(match[1], 10) || 0;
          const mins = parseInt(match[2], 10) || 0;
          result.total_sleep_hours = parseFloat((hrs + (mins / 60)).toFixed(2));
          break;
        } else if (match[1]) {
          const val = parseFloat(match[1].replace(',', '.'));
          if (val > 0 && val <= 24) {
            result.total_sleep_hours = parseFloat(val.toFixed(2));
            break;
          }
        }
      }
    }

    // 5. Blood Oxygen (SpO2 %)
    const spo2Patterns = [
      /(?:spo2|ox[ií]geno|saturaci[oó]n|o2)\D{0,10}(\d{2,3})\s*%?/i,
      /(\d{2,3})\s*%\s*(?:spo2|ox[ií]geno)?/i
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

    // 6. Stress Level (Estrés 1-100)
    const stressPatterns = [
      /(?:estr[eé]s|stress|puntuaci[oó]n\s+de\s+estr[eé]s)\D{0,10}(\d{1,3})/i,
      /(?:nivel\s+de\s+estr[eé]s)\D{0,8}(\d{1,3})/i
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

    // 7. Weight in KG
    const weightPatterns = [
      /(?:peso|weight)\D{0,10}(\d{2,3}(?:[.,]\d{1,2})?)\s*(?:kg|kilos?)/i,
      /(\d{2,3}[.,]\d{1,2})\s*(?:kg|kilos?)/i,
      /(?:peso|weight)\D{0,8}(\d{2,3}(?:[.,]\d{1,2})?)/i
    ];

    for (const pat of weightPatterns) {
      const match = text.match(pat);
      if (match && match[1]) {
        const val = parseFloat(match[1].replace(',', '.'));
        if (val >= 25 && val <= 300) {
          result.weight_kg = parseFloat(val.toFixed(1));
          break;
        }
      }
    }

    return result;
  }

  applyParsedData(data) {
    if (this.inputRhr && data.rhr) this.inputRhr.value = data.rhr;
    if (this.inputSleep && data.deep_sleep_hours) this.inputSleep.value = data.deep_sleep_hours;
    if (this.inputTotalSleep && data.total_sleep_hours) this.inputTotalSleep.value = data.total_sleep_hours;
    if (this.inputSpo2 && data.spo2) this.inputSpo2.value = data.spo2;
    if (this.inputStress && data.stress_level) this.inputStress.value = data.stress_level;
    if (this.inputWeight && data.weight_kg) this.inputWeight.value = data.weight_kg;

    const updates = {};
    if (data.rhr) updates.rhr = data.rhr;
    if (data.deep_sleep_hours) updates.deepSleepHours = data.deep_sleep_hours;
    if (data.total_sleep_hours) updates.totalSleepHours = data.total_sleep_hours;
    if (data.spo2) updates.spo2 = data.spo2;
    if (data.stress_level) updates.stressLevel = data.stress_level;
    if (data.weight_kg) updates.weightKg = data.weight_kg;

    if (Object.keys(updates).length > 0) {
      store.updateToday(updates);
      soundFx.playHydrationSound();
    }

    if (this.resultsCard) {
      this.resultsCard.classList.remove('hidden');
      this.resultsCard.innerHTML = `
        <div style="font-size: 0.88rem; font-weight: bold; color: var(--f1-green); text-transform: uppercase;">
          ⚡ Telemetría Mi Fitness Detectada
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px;">
          ${data.rhr ? `<span class="badge badge-green">❤️ Pulso: ${data.rhr} bpm</span>` : ''}
          ${data.deep_sleep_hours ? `<span class="badge badge-green">🌙 Profundo: ${data.deep_sleep_hours} h</span>` : ''}
          ${data.total_sleep_hours ? `<span class="badge badge-green">🛌 Total: ${data.total_sleep_hours} h</span>` : ''}
          ${data.spo2 ? `<span class="badge badge-green">🫁 SpO2: ${data.spo2}%</span>` : ''}
          ${data.stress_level ? `<span class="badge badge-green">⚡ Estrés: ${data.stress_level}/100</span>` : ''}
          ${data.weight_kg ? `<span class="badge badge-green">⚖️ Peso: ${data.weight_kg} kg</span>` : ''}
        </div>
        <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 6px;">
          Valores guardados y reflejados en tu tablero táctico.
        </div>
      `;
    }
  }
}
