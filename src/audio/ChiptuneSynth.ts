/**
 * Mantle Chapter 1 - Procedural Chiptune Audio Synthesizer
 * Pure Web Audio API synthesis with zero external audio file dependencies.
 * Provides speaker blips and retro 8-bit sound effects with safe fallbacks.
 */

export type SpeakerVoice = 'KRIS' | 'NARRATOR' | 'SUSIE' | 'RALSEI' | 'LANCER' | 'KING';

export type SfxType =
  | 'SWORD_SLASH'
  | 'SWORD_PULL'
  | 'OBSTACLE_DESTROY'
  | 'HURT'
  | 'SELECT'
  | 'CONFIRM'
  | 'LEVEL_UP';

export class ChiptuneSynth {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private masterGain: GainNode | null = null;

  constructor(audioContext?: AudioContext | null) {
    if (audioContext !== undefined) {
      this.ctx = audioContext;
      if (this.ctx) {
        this.initMasterGain();
      }
      return;
    }

    try {
      if (typeof window !== 'undefined') {
        const AudioCtxClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

        if (AudioCtxClass) {
          this.ctx = new AudioCtxClass();
          this.initMasterGain();
        }
      }
    } catch {
      // Graceful fallback for environments blocking AudioContext without user gesture
      this.ctx = null;
    }
  }

  private initMasterGain(): void {
    if (!this.ctx) return;
    try {
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    } catch {
      this.masterGain = null;
    }
  }

  public get isAvailable(): boolean {
    return this.ctx !== null;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
  }

  public resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  private ensureContextReady(): boolean {
    if (!this.ctx || this.muted) return false;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return true;
  }

  /**
   * Synthesizes speaker-specific retro speech dialogue blips.
   */
  public playBlip(speaker?: string): void {
    if (!this.ensureContextReady() || !this.ctx) return;

    try {
      const voice = (speaker || 'NARRATOR').toUpperCase();
      const ctx = this.ctx;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      gain.connect(this.masterGain || ctx.destination);
      osc.connect(gain);

      switch (voice) {
        case 'SUSIE':
          // Low gritty sawtooth wave (~160Hz, 45ms)
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(160, now);
          gain.gain.setValueAtTime(0.25, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.045);
          osc.start(now);
          osc.stop(now + 0.045);
          break;

        case 'RALSEI':
          // Gentle sine wave (~680Hz, 35ms)
          osc.type = 'sine';
          osc.frequency.setValueAtTime(680, now);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.035);
          osc.start(now);
          osc.stop(now + 0.035);
          break;

        case 'LANCER':
          // Playful square wave with slight pitch slide up (~320Hz -> 380Hz, 40ms)
          osc.type = 'square';
          osc.frequency.setValueAtTime(320, now);
          osc.frequency.linearRampToValueAtTime(380, now + 0.04);
          gain.gain.setValueAtTime(0.18, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.04);
          osc.start(now);
          osc.stop(now + 0.04);
          break;

        case 'KING':
          // Deep rumbling triangle wave (~90Hz, 60ms)
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(90, now);
          gain.gain.setValueAtTime(0.35, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.06);
          osc.start(now);
          osc.stop(now + 0.06);
          break;

        case 'KRIS':
        case 'NARRATOR':
        default:
          // Short square wave (~440Hz, 30ms)
          osc.type = 'square';
          osc.frequency.setValueAtTime(440, now);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.03);
          osc.start(now);
          osc.stop(now + 0.03);
          break;
      }
    } catch {
      // Audio execution gracefully handled
    }
  }

  /**
   * Synthesizes retro 8-bit sound effects.
   */
  public playSfx(type: SfxType): void {
    if (!this.ensureContextReady() || !this.ctx) return;

    try {
      const ctx = this.ctx;
      const now = ctx.currentTime;

      switch (type) {
        case 'SWORD_SLASH': {
          // Noise + square sweep down (100ms)
          this.playNoise(0.1, 0.2, 2000);
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(600, now);
          osc.frequency.linearRampToValueAtTime(100, now + 0.1);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
          osc.connect(gain);
          gain.connect(this.masterGain || ctx.destination);
          osc.start(now);
          osc.stop(now + 0.1);
          break;
        }

        case 'SWORD_PULL': {
          // Arpeggio jingle (C5 -> E5 -> G5 -> C6)
          const notes = [523.25, 659.25, 783.99, 1046.5];
          const noteLen = 0.06;
          notes.forEach((freq, idx) => {
            const startTime = now + idx * noteLen;
            const duration = idx === notes.length - 1 ? 0.14 : noteLen;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, startTime);
            gain.gain.setValueAtTime(0.18, startTime);
            gain.gain.linearRampToValueAtTime(0.01, startTime + duration);
            osc.connect(gain);
            gain.connect(this.masterGain || ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + duration);
          });
          break;
        }

        case 'OBSTACLE_DESTROY': {
          // Low noise burst
          this.playNoise(0.15, 0.35, 350);
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(110, now);
          osc.frequency.linearRampToValueAtTime(40, now + 0.15);
          gain.gain.setValueAtTime(0.25, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
          osc.connect(gain);
          gain.connect(this.masterGain || ctx.destination);
          osc.start(now);
          osc.stop(now + 0.15);
          break;
        }

        case 'HURT': {
          // Rapid noise + square sweep
          this.playNoise(0.12, 0.25, 1200);
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(360, now);
          osc.frequency.linearRampToValueAtTime(70, now + 0.12);
          gain.gain.setValueAtTime(0.25, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
          osc.connect(gain);
          gain.connect(this.masterGain || ctx.destination);
          osc.start(now);
          osc.stop(now + 0.12);
          break;
        }

        case 'SELECT': {
          // Clean high blip
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(880, now);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.04);
          osc.connect(gain);
          gain.connect(this.masterGain || ctx.destination);
          osc.start(now);
          osc.stop(now + 0.04);
          break;
        }

        case 'CONFIRM': {
          // Clean high double blip
          const osc1 = ctx.createOscillator();
          const gain1 = ctx.createGain();
          osc1.type = 'square';
          osc1.frequency.setValueAtTime(880, now);
          gain1.gain.setValueAtTime(0.18, now);
          gain1.gain.linearRampToValueAtTime(0.01, now + 0.035);
          osc1.connect(gain1);
          gain1.connect(this.masterGain || ctx.destination);
          osc1.start(now);
          osc1.stop(now + 0.035);

          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = 'square';
          osc2.frequency.setValueAtTime(1320, now + 0.04);
          gain2.gain.setValueAtTime(0.2, now + 0.04);
          gain2.gain.linearRampToValueAtTime(0.01, now + 0.09);
          osc2.connect(gain2);
          gain2.connect(this.masterGain || ctx.destination);
          osc2.start(now + 0.04);
          osc2.stop(now + 0.09);
          break;
        }

        case 'LEVEL_UP': {
          // Celebratory 4-note retro fanfare
          const notes = [392.0, 523.25, 659.25, 783.99];
          const noteLen = 0.08;
          notes.forEach((freq, idx) => {
            const startTime = now + idx * noteLen;
            const duration = idx === notes.length - 1 ? 0.25 : noteLen;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, startTime);
            gain.gain.setValueAtTime(0.2, startTime);
            gain.gain.linearRampToValueAtTime(0.01, startTime + duration);
            osc.connect(gain);
            gain.connect(this.masterGain || ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + duration);
          });
          break;
        }
      }
    } catch {
      // Audio execution safely handled
    }
  }

  private playNoise(duration: number, volume: number, cutoffHz: number): void {
    if (!this.ctx) return;
    try {
      const ctx = this.ctx;
      const sampleRate = ctx.sampleRate || 44100;
      const bufferSize = Math.max(1, Math.floor(sampleRate * duration));
      const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter ? ctx.createBiquadFilter() : null;
      if (filter) {
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(cutoffHz, ctx.currentTime);
      }

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + duration);

      if (filter) {
        noise.connect(filter);
        filter.connect(gain);
      } else {
        noise.connect(gain);
      }

      gain.connect(this.masterGain || ctx.destination);
      noise.start(ctx.currentTime);
      noise.stop(ctx.currentTime + duration);
    } catch {
      // Ignore noise generation errors
    }
  }
}
