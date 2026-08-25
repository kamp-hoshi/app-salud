/**
 * PIT CREW TELEMETRY & HEALTH (DISAUTONOMÍA / POTS / PACING V4.0 MASTER)
 * AUDIO SYNTHESIZER - WEB AUDIO API TACTICAL ALARM & PULSE SOUNDS
 */

class AudioSynthesizer {
  constructor() {
    this.audioCtx = null;
    this.alarmInterval = null;
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

  // Medical Alert Siren (High-Pitch Dual Tone Pulse for Bystanders)
  startMedicalAlarm() {
    if (this.isPlayingAlarm) return;
    this.isPlayingAlarm = true;

    const playBeep = () => {
      try {
        const ctx = this.getAudioContext();
        if (!ctx || !this.isPlayingAlarm) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(950, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(1400, ctx.currentTime + 0.25);

        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.28);
      } catch (e) {
        console.warn('Alarm tone error:', e);
      }
    };

    playBeep();
    this.alarmInterval = setInterval(playBeep, 450);
  }

  stopMedicalAlarm() {
    this.isPlayingAlarm = false;
    if (this.alarmInterval) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
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
