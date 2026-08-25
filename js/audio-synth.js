/**
 * PIT CREW TELEMETRY & HEALTH (DISAUTONOMÍA / POTS / PACING V4.0 MASTER)
 * AUDIO SYNTHESIZER - WEB AUDIO API HIGH-POWER MEDICAL SIREN & SOUNDS
 */

class AudioSynthesizer {
  constructor() {
    this.audioCtx = null;
    this.alarmOsc1 = null;
    this.alarmOsc2 = null;
    this.alarmGain = null;
    this.alarmLfo = null;
    this.isPlayingAlarm = false;
  }

  getAudioContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Tactical subtle click / feedback tone (10ms)
  playTactileClick() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.04);
    } catch (e) {
      console.warn('Audio feedback failed:', e);
    }
  }

  // Hydration drink / drop sound
  playHydrationSound() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.08); // C6

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
      console.warn('Hydration audio failed:', e);
    }
  }

  // Continuous High-Power Medical Siren (Dual Tone Warble to Cut Through Street Noise)
  startMedicalAlarm() {
    if (this.isPlayingAlarm) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      this.isPlayingAlarm = true;

      // Master Gain for High Output
      this.alarmGain = ctx.createGain();
      this.alarmGain.gain.setValueAtTime(0.35, ctx.currentTime);
      this.alarmGain.connect(ctx.destination);

      // Main Ambulance / Paramedic Dual Oscillators
      this.alarmOsc1 = ctx.createOscillator();
      this.alarmOsc1.type = 'sawtooth';

      this.alarmOsc2 = ctx.createOscillator();
      this.alarmOsc2.type = 'square';

      // LFO (Low Frequency Oscillator) to modulate frequency between 650 Hz and 1250 Hz
      this.alarmLfo = ctx.createOscillator();
      this.alarmLfo.type = 'sawtooth';
      this.alarmLfo.frequency.setValueAtTime(2.2, ctx.currentTime); // 2.2 Hz warble rate

      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(320, ctx.currentTime); // Depth +/- 320 Hz

      this.alarmOsc1.frequency.setValueAtTime(950, ctx.currentTime);
      this.alarmOsc2.frequency.setValueAtTime(954, ctx.currentTime); // Detuned for piercing acoustic beating

      this.alarmLfo.connect(lfoGain);
      lfoGain.connect(this.alarmOsc1.frequency);
      lfoGain.connect(this.alarmOsc2.frequency);

      this.alarmOsc1.connect(this.alarmGain);
      this.alarmOsc2.connect(this.alarmGain);

      this.alarmOsc1.start();
      this.alarmOsc2.start();
      this.alarmLfo.start();
    } catch (e) {
      console.warn('Continuous alarm failed to start:', e);
    }
  }

  stopMedicalAlarm() {
    this.isPlayingAlarm = false;
    try {
      if (this.alarmOsc1) {
        this.alarmOsc1.stop();
        this.alarmOsc1.disconnect();
        this.alarmOsc1 = null;
      }
      if (this.alarmOsc2) {
        this.alarmOsc2.stop();
        this.alarmOsc2.disconnect();
        this.alarmOsc2 = null;
      }
      if (this.alarmLfo) {
        this.alarmLfo.stop();
        this.alarmLfo.disconnect();
        this.alarmLfo = null;
      }
      if (this.alarmGain) {
        this.alarmGain.disconnect();
        this.alarmGain = null;
      }
    } catch (e) {
      console.warn('Alarm stop error:', e);
    }
  }

  toggleMedicalAlarm() {
    if (this.isPlayingAlarm) {
      this.stopMedicalAlarm();
      return false;
    } else {
      this.startMedicalAlarm();
      return true;
    }
  }
}

export const soundFx = new AudioSynthesizer();
