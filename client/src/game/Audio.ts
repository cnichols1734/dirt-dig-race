import { TileType } from '@dig/shared';

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private ambientSource: OscillatorNode | null = null;
  private ambientNoise: AudioBufferSourceNode | null = null;
  private initialized = false;

  init() {
    if (this.initialized) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.5;
    this.masterGain.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.6;
    this.sfxGain.connect(this.masterGain);

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.value = 0.15;
    this.ambientGain.connect(this.masterGain);

    this.initialized = true;
    this.startAmbient();
  }

  private ensureCtx() {
    if (!this.ctx || this.ctx.state === 'suspended') {
      this.ctx?.resume();
    }
  }

  playDig(tileType: TileType, depth: number = 0) {
    if (!this.ctx || !this.sfxGain) return;
    this.ensureCtx();

    const pitchVariation = 0.85 + Math.random() * 0.3;

    switch (tileType) {
      case TileType.DIRT:
      case TileType.CLAY:
        this.playThud(80 * pitchVariation, 0.08, depth);
        break;
      case TileType.STONE:
      case TileType.HARD_ROCK:
        this.playCrack(200 * pitchVariation, 0.06, depth);
        break;
      case TileType.GRANITE:
        this.playCrack(150 * pitchVariation, 0.08, depth);
        break;
      case TileType.OBSIDIAN:
        this.playMetallic(120 * pitchVariation, 0.07, depth);
        break;
      case TileType.CRYSTAL_WALL:
        this.playCrystalHit(600 * pitchVariation, 0.05, depth);
        break;
      default:
        this.playThud(100 * pitchVariation, 0.06, depth);
    }
  }

  playBreak(tileType: TileType, depth: number = 0) {
    if (!this.ctx || !this.sfxGain) return;
    this.ensureCtx();

    const reverbTime = 0.1 + depth * 0.02;

    if (tileType === TileType.CRYSTAL_WALL) {
      this.playCrystalShatter(reverbTime);
    } else {
      this.playCrunch(reverbTime);
    }
  }

  playOreCollect(oreType: number) {
    if (!this.ctx || !this.sfxGain) return;
    this.ensureCtx();

    const freqs = [800, 900, 1100, 1300, 1500];
    const freq = freqs[Math.min(oreType, freqs.length - 1)];
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playUpgrade() {
    if (!this.ctx || !this.sfxGain) return;
    this.ensureCtx();
    this.playNote(300, 0.05, 'square');
    setTimeout(() => this.playNote(450, 0.05, 'square'), 80);
    setTimeout(() => this.playNote(600, 0.05, 'square'), 160);
  }

  playSonar() {
    if (!this.ctx || !this.sfxGain) return;
    this.ensureCtx();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.0);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 1.0);
  }

  playDynamiteFuse() {
    if (!this.ctx || !this.sfxGain) return;
    this.ensureCtx();
    this.playNoise(0.08, 2.0, 2000);
  }

  playExplosion() {
    if (!this.ctx || !this.sfxGain) return;
    this.ensureCtx();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.8);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.8);

    this.playNoise(0.3, 0.6, 800);
  }

  playTremor() {
    if (!this.ctx || !this.sfxGain) return;
    this.ensureCtx();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 40;
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);
  }

  playEncounterReveal() {
    if (!this.ctx || !this.sfxGain) return;
    this.ensureCtx();
    [200, 300, 400, 500, 600].forEach((freq, i) => {
      setTimeout(() => this.playNote(freq, 0.1, 'sine'), i * 100);
    });
  }

  playGuardianAttack() {
    if (!this.ctx || !this.sfxGain) return;
    this.ensureCtx();
    this.playNote(60, 0.15, 'sawtooth');
    this.playNoise(0.2, 0.2, 500);
  }

  playVictory() {
    if (!this.ctx || !this.sfxGain) return;
    this.ensureCtx();
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => this.playNote(f, 0.15, 'sine'), i * 150);
    });
  }

  playDefeat() {
    if (!this.ctx || !this.sfxGain) return;
    this.ensureCtx();
    [400, 350, 300, 250].forEach((f, i) => {
      setTimeout(() => this.playNote(f, 0.15, 'sine'), i * 200);
    });
  }

  private playThud(freq: number, duration: number, _depth: number) {
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.2, this.ctx!.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start();
    osc.stop(this.ctx!.currentTime + duration);
    this.playNoise(0.08, duration * 0.7, 400);
  }

  private playCrack(freq: number, duration: number, _depth: number) {
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, this.ctx!.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, this.ctx!.currentTime + duration);
    gain.gain.setValueAtTime(0.12, this.ctx!.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start();
    osc.stop(this.ctx!.currentTime + duration);
  }

  private playMetallic(freq: number, duration: number, _depth: number) {
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, this.ctx!.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + duration + 0.1);
    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start();
    osc.stop(this.ctx!.currentTime + duration + 0.1);
  }

  private playCrystalHit(freq: number, duration: number, _depth: number) {
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.1, this.ctx!.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + duration + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start();
    osc.stop(this.ctx!.currentTime + duration + 0.15);

    const osc2 = this.ctx!.createOscillator();
    const gain2 = this.ctx!.createGain();
    osc2.type = 'sine';
    osc2.frequency.value = freq * 1.5;
    gain2.gain.setValueAtTime(0.05, this.ctx!.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + duration + 0.2);
    osc2.connect(gain2);
    gain2.connect(this.sfxGain!);
    osc2.start();
    osc2.stop(this.ctx!.currentTime + duration + 0.2);
  }

  private playCrunch(reverbTime: number) {
    this.playNoise(0.25, 0.15 + reverbTime, 1200);
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, this.ctx!.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx!.currentTime + 0.15);
    gain.gain.setValueAtTime(0.2, this.ctx!.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + 0.2 + reverbTime);
    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start();
    osc.stop(this.ctx!.currentTime + 0.2 + reverbTime);
  }

  private playCrystalShatter(reverbTime: number) {
    for (let i = 0; i < 3; i++) {
      const freq = 1000 + Math.random() * 2000;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, this.ctx!.currentTime + i * 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + 0.3 + reverbTime);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(this.ctx!.currentTime + i * 0.02);
      osc.stop(this.ctx!.currentTime + 0.3 + reverbTime);
    }
    this.playNoise(0.1, 0.1, 3000);
  }

  private playNote(freq: number, duration: number, type: OscillatorType) {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  private playNoise(volume: number, duration: number, filterFreq: number) {
    if (!this.ctx || !this.sfxGain) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    source.start();
  }

  private startAmbient() {
    if (!this.ctx || !this.ambientGain) return;

    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }

    this.ambientNoise = this.ctx.createBufferSource();
    this.ambientNoise.buffer = buffer;
    this.ambientNoise.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    this.ambientNoise.connect(filter);
    filter.connect(this.ambientGain);
    this.ambientNoise.start();

    const drip = () => {
      if (!this.ctx || !this.ambientGain) return;
      const freq = 2000 + Math.random() * 2000;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(this.ambientGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
      setTimeout(drip, 3000 + Math.random() * 8000);
    };
    setTimeout(drip, 2000);
  }
}

export const audioManager = new SoundManager();
