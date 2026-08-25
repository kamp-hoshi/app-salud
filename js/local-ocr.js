/**
 * PIT CREW TELEMETRY & HEALTH (DISAUTONOMÍA / POTS / PACING V4.0 MASTER)
 * MODULE 2A: LOCAL ON-DEVICE OCR & REGEX PARSER (MI FITNESS / EUFYLIFE)
 * 100% CLIENT-SIDE - NO API KEYS - 100% OFFLINE READY
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
    
    // Manual Input Fields
    this.inputRhr = document.getElementById('manual-rhr-input');
    this.inputSleep = document.getElementById('manual-sleep-input');
    this.inputWeight = document.getElementById('manual-weight-input');
    this.btnSaveMetrics = document.getElementById('btn-save-manual-metrics');

    this.tesseractLoaded = false;
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
    const weightVal = this.inputWeight ? parseFloat(this.inputWeight.value) : null;

    store.updateToday({
      rhr: !isNaN(rhrVal) && rhrVal > 0 ? rhrVal : null,
      deepSleepHours: !isNaN(sleepVal) && sleepVal > 0 ? sleepVal : null,
      weightKg: !isNaN(weightVal) && weightVal > 0 ? weightVal : null
    });

    soundFx.playTactileClick();

    const banner = document.getElementById('metrics-saved-banner');
    if (banner) {
      banner.classList.remove('hidden');
      setTimeout(() => banner.classList.add('hidden'), 3000);
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
      // 1. Client-Side Preprocessing via Canvas (Auto-contrast & Binarization)
      const processedImageBlob = await this.preprocessImage(file);
      
      this.showProgress(35, 'Iniciando motor OCR en dispositivo...');

      // 2. Load Tesseract.js locally if available, or fall back to OCR parser
      const extractedText = await this.performClientOCR(processedImageBlob);
      
      this.showProgress(85, 'Analizando telemetría biométrica con Regex...');

      // 3. Parse with Specialized Regular Expressions for Mi Fitness & EufyLife
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
      alert('No se pudo completar el escaneo OCR automáticamente. Puedes ingresar los datos manualmente en las casillas inferiores.');
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

  // Canvas Preprocessing: Grayscale + High-Pass Contrast to maximize OCR accuracy
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

          // Get image data for grayscale & contrast enhancement
          const imgData = ctx.getImageData(0, 0, width, height);
          const d = imgData.data;

          for (let i = 0; i < d.length; i += 4) {
            // Standard luminance formula
            const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            // High contrast boost for digits
            const contrastVal = gray > 140 ? Math.min(255, gray * 1.2) : Math.max(0, gray * 0.8);
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

  // Client-Side OCR Execution using Tesseract.js Worker
  async performClientOCR(imageBlob) {
    // Check if Tesseract is available on window
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

    // Fallback: Dynamically load Tesseract.js CDN if not yet present
    return new Promise((resolve) => {
      this.showProgress(40, 'Cargando motor de reconocimiento óptico...');
      
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
        console.warn('Could not load Tesseract script dynamically (offline fallback).');
        resolve('');
      };

      document.head.appendChild(script);
    });
  }

  // Specialized Regex Telemetry Parser for Mi Fitness, EufyLife, and Health Devices
  parseTelemetryText(rawText) {
    if (!rawText) return { rhr: null, deep_sleep_hours: null, weight_kg: null, app_detected: 'Manual' };

    const text = rawText.replace(/\r?\n/g, ' ').toLowerCase();
    const result = {
      rhr: null,
      deep_sleep_hours: null,
      weight_kg: null,
      app_detected: 'Desconocida'
    };

    // 1. App Detection
    if (text.includes('fitness') || text.includes('xiaomi') || text.includes('mi fit') || text.includes('band')) {
      result.app_detected = 'Mi Fitness';
    } else if (text.includes('eufy') || text.includes('life') || text.includes('scale') || text.includes('báscula') || text.includes('bascula')) {
      result.app_detected = 'EufyLife / Báscula';
    }

    // 2. Resting Heart Rate (RHR / Pulso en Reposo)
    // Matches: "reposo: 68", "rhr 62 bpm", "pulso 74", "frecuencia cardíaca en reposo 59", "64 bpm"
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

    // 3. Deep Sleep Hours (Sueño Profundo)
    // Matches: "profundo 1h 45m", "sueño profundo: 2.3 hrs", "deep sleep 1 h 20 min"
    const deepSleepPatterns = [
      /(?:profundo|deep)\D{0,15}(\d+)\s*(?:h|hrs?|horas?)\s*(\d+)?\s*(?:m|min|mins?|minutos?)?/i,
      /(?:profundo|deep)\D{0,10}(\d+[.,]\d+)\s*(?:h|hrs?|horas?)/i,
      /(?:sueño|sueno|sleep)\D{0,15}(\d+)\s*(?:h|hrs?)\s*(\d+)?\s*(?:m|min)?/i
    ];

    for (const pat of deepSleepPatterns) {
      const match = text.match(pat);
      if (match) {
        if (match[2] !== undefined) {
          // Format: 1h 45m
          const hrs = parseInt(match[1], 10) || 0;
          const mins = parseInt(match[2], 10) || 0;
          result.deep_sleep_hours = parseFloat((hrs + (mins / 60)).toFixed(2));
          break;
        } else if (match[1]) {
          // Format: 1.75h
          const val = parseFloat(match[1].replace(',', '.'));
          if (val > 0 && val <= 24) {
            result.deep_sleep_hours = parseFloat(val.toFixed(2));
            break;
          }
        }
      }
    }

    // 4. Weight in KG (Peso corporal)
    // Matches: "64.5 kg", "peso 58,2", "weight 72.0 kg"
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
    if (this.inputRhr && data.rhr) {
      this.inputRhr.value = data.rhr;
    }
    if (this.inputSleep && data.deep_sleep_hours) {
      this.inputSleep.value = data.deep_sleep_hours;
    }
    if (this.inputWeight && data.weight_kg) {
      this.inputWeight.value = data.weight_kg;
    }

    // Automatically update store with detected metrics
    const updates = {};
    if (data.rhr) updates.rhr = data.rhr;
    if (data.deep_sleep_hours) updates.deepSleepHours = data.deep_sleep_hours;
    if (data.weight_kg) updates.weightKg = data.weight_kg;

    if (Object.keys(updates).length > 0) {
      store.updateToday(updates);
      soundFx.playHydrationSound();
    }

    // Render results notification
    if (this.resultsCard) {
      this.resultsCard.classList.remove('hidden');
      this.resultsCard.innerHTML = `
        <div style="font-size: 0.85rem; font-weight: 800; color: var(--f1-green); text-transform: uppercase;">
          ⚡ Telemetría Detectada (${data.app_detected || 'Dispositivo'})
        </div>
        <div style="font-size: 0.82rem; color: var(--text-secondary); display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px;">
          ${data.rhr ? `<span class="badge badge-green">❤️ Reposo: ${data.rhr} bpm</span>` : ''}
          ${data.deep_sleep_hours ? `<span class="badge badge-green">🌙 Sueño Prof.: ${data.deep_sleep_hours} h</span>` : ''}
          ${data.weight_kg ? `<span class="badge badge-green">⚖️ Peso: ${data.weight_kg} kg</span>` : ''}
        </div>
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 6px;">
          Datos sincronizados. Puedes modificarlos en las casillas inferiores en cualquier momento.
        </div>
      `;
    }
  }
}
