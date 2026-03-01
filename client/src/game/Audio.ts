import { TileType } from '@dig/shared';

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private initialized = false;

  init() {
    if (this.initialized) return;
    this.ctx = new AudioContext();

    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -24;
    this.compressor.knee.value = 12;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.15;
    this.compressor.connect(this.ctx.destination);

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.55;
    this.masterGain.connect(this.compressor);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.7;
    this.sfxGain.connect(this.masterGain);

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.value = 0.12;
    this.ambientGain.connect(this.masterGain);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.06;
    this.musicGain.connect(this.masterGain);

    this.reverbNode = this.createCaveReverb();
    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.value = 0.3;
    this.reverbNode.connect(this.reverbGain);
    this.reverbGain.connect(this.masterGain);

    this.initialized = true;
    this.startAmbient();
    this.startCaveDrone();
  }

  private ensureCtx() {
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }

  private createCaveReverb(): ConvolverNode {
    const ctx = this.ctx!;
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * 2.5;
    const buffer = ctx.createBuffer(2, length, sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const decay = Math.exp(-t * 2.2);
        const earlyRef = i < sampleRate * 0.08
          ? Math.sin(i * 0.02) * 0.4
          : 0;
        data[i] = ((Math.random() * 2 - 1) * decay + earlyRef) * 0.5;
        if (i % Math.floor(sampleRate * 0.03) < 100) {
          data[i] += (Math.random() * 2 - 1) * decay * 0.3;
        }
      }
    }

    const convolver = ctx.createConvolver();
    convolver.buffer = buffer;
    return convolver;
  }

  private sendToReverb(node: AudioNode, amount: number = 0.3) {
    if (!this.reverbNode || !this.ctx) return;
    const wet = this.ctx.createGain();
    wet.gain.value = amount;
    node.connect(wet);
    wet.connect(this.reverbNode);
  }

  // ── DIG SOUNDS ──────────────────────────────────────────────

  playDig(tileType: TileType, depth: number = 0) {
    if (!this.ctx || !this.sfxGain) return;
    this.ensureCtx();
    const t = this.ctx.currentTime;
    const pitch = 0.88 + Math.random() * 0.24;
    const depthMod = Math.min(depth / 40, 1);

    switch (tileType) {
      case TileType.DIRT:
      case TileType.CLAY:
        this.digSoft(t, pitch, depthMod);
        break;
      case TileType.STONE:
        this.digStone(t, pitch, depthMod);
        break;
      case TileType.HARD_ROCK:
      case TileType.GRANITE:
        this.digHardRock(t, pitch, depthMod);
        break;
      case TileType.OBSIDIAN:
        this.digObsidian(t, pitch, depthMod);
        break;
      case TileType.CRYSTAL_WALL:
        this.digCrystal(t, pitch, depthMod);
        break;
      default:
        this.digSoft(t, pitch, depthMod);
    }
  }

  private digSoft(t: number, pitch: number, depthMod: number) {
    const ctx = this.ctx!;

    const thud = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(65 * pitch, t);
    thud.frequency.exponentialRampToValueAtTime(35 * pitch, t + 0.12);
    thudGain.gain.setValueAtTime(0.22, t);
    thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    thud.connect(thudGain);
    thudGain.connect(this.sfxGain!);
    thud.start(t);
    thud.stop(t + 0.12);

    this.playFilteredNoise(0.12, 0.08, 600 - depthMod * 200, 'lowpass', t);
    this.playFilteredNoise(0.04, 0.03, 2500, 'bandpass', t);

    const crumble = ctx.createOscillator();
    const crumbleGain = ctx.createGain();
    crumble.type = 'sawtooth';
    crumble.frequency.setValueAtTime(120 * pitch, t + 0.01);
    crumble.frequency.exponentialRampToValueAtTime(40, t + 0.08);
    crumbleGain.gain.setValueAtTime(0.06, t + 0.01);
    crumbleGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    crumble.connect(crumbleGain);
    crumbleGain.connect(this.sfxGain!);
    crumble.start(t + 0.01);
    crumble.stop(t + 0.08);

    this.sendToReverb(thudGain, 0.15);
  }

  private digStone(t: number, pitch: number, depthMod: number) {
    const ctx = this.ctx!;

    const impact = ctx.createOscillator();
    const impactGain = ctx.createGain();
    impact.type = 'triangle';
    impact.frequency.setValueAtTime(180 * pitch, t);
    impact.frequency.exponentialRampToValueAtTime(60, t + 0.06);
    impactGain.gain.setValueAtTime(0.2, t);
    impactGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    impact.connect(impactGain);
    impactGain.connect(this.sfxGain!);
    impact.start(t);
    impact.stop(t + 0.08);

    const chip = ctx.createOscillator();
    const chipGain = ctx.createGain();
    chip.type = 'square';
    chip.frequency.setValueAtTime(800 * pitch, t);
    chip.frequency.exponentialRampToValueAtTime(300, t + 0.04);
    chipGain.gain.setValueAtTime(0.06, t);
    chipGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    chip.connect(chipGain);
    chipGain.connect(this.sfxGain!);
    chip.start(t);
    chip.stop(t + 0.04);

    this.playFilteredNoise(0.15, 0.1, 1800 - depthMod * 400, 'lowpass', t);

    const metalClang = ctx.createOscillator();
    const metalGain = ctx.createGain();
    metalClang.type = 'sine';
    metalClang.frequency.setValueAtTime(1200 * pitch, t);
    metalClang.frequency.exponentialRampToValueAtTime(600, t + 0.15);
    metalGain.gain.setValueAtTime(0.035, t);
    metalGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    metalClang.connect(metalGain);
    metalGain.connect(this.sfxGain!);
    metalClang.start(t);
    metalClang.stop(t + 0.15);

    this.sendToReverb(impactGain, 0.25);
    this.sendToReverb(metalGain, 0.2);
  }

  private digHardRock(t: number, pitch: number, depthMod: number) {
    const ctx = this.ctx!;

    const slam = ctx.createOscillator();
    const slamGain = ctx.createGain();
    slam.type = 'sawtooth';
    slam.frequency.setValueAtTime(150 * pitch, t);
    slam.frequency.exponentialRampToValueAtTime(30, t + 0.1);
    slamGain.gain.setValueAtTime(0.25, t);
    slamGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    slam.connect(slamGain);
    slamGain.connect(this.sfxGain!);
    slam.start(t);
    slam.stop(t + 0.1);

    this.playFilteredNoise(0.2, 0.15, 2200 - depthMod * 500, 'lowpass', t);

    for (let i = 0; i < 2; i++) {
      const spark = ctx.createOscillator();
      const sparkGain = ctx.createGain();
      spark.type = 'sine';
      const sparkDelay = 0.01 + Math.random() * 0.03;
      spark.frequency.setValueAtTime((2000 + Math.random() * 2000) * pitch, t + sparkDelay);
      spark.frequency.exponentialRampToValueAtTime(500, t + sparkDelay + 0.08);
      sparkGain.gain.setValueAtTime(0.04, t + sparkDelay);
      sparkGain.gain.exponentialRampToValueAtTime(0.001, t + sparkDelay + 0.08);
      spark.connect(sparkGain);
      sparkGain.connect(this.sfxGain!);
      spark.start(t + sparkDelay);
      spark.stop(t + sparkDelay + 0.08);
    }

    const ring = ctx.createOscillator();
    const ringGain = ctx.createGain();
    ring.type = 'sine';
    ring.frequency.setValueAtTime(900 * pitch, t);
    ring.frequency.exponentialRampToValueAtTime(400, t + 0.25);
    ringGain.gain.setValueAtTime(0.04, t);
    ringGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    ring.connect(ringGain);
    ringGain.connect(this.sfxGain!);
    ring.start(t);
    ring.stop(t + 0.25);

    this.sendToReverb(slamGain, 0.35);
    this.sendToReverb(ringGain, 0.3);
  }

  private digObsidian(t: number, pitch: number, _depthMod: number) {
    const ctx = this.ctx!;

    const strike = ctx.createOscillator();
    const strikeGain = ctx.createGain();
    strike.type = 'triangle';
    strike.frequency.setValueAtTime(400 * pitch, t);
    strike.frequency.exponentialRampToValueAtTime(100, t + 0.15);
    strikeGain.gain.setValueAtTime(0.18, t);
    strikeGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    strike.connect(strikeGain);
    strikeGain.connect(this.sfxGain!);
    strike.start(t);
    strike.stop(t + 0.15);

    const glass = ctx.createOscillator();
    const glassGain = ctx.createGain();
    glass.type = 'sine';
    glass.frequency.setValueAtTime(2200 * pitch, t);
    glass.frequency.exponentialRampToValueAtTime(1100, t + 0.3);
    glassGain.gain.setValueAtTime(0.06, t);
    glassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    glass.connect(glassGain);
    glassGain.connect(this.sfxGain!);
    glass.start(t);
    glass.stop(t + 0.3);

    const harm = ctx.createOscillator();
    const harmGain = ctx.createGain();
    harm.type = 'sine';
    harm.frequency.setValueAtTime(3300 * pitch, t + 0.005);
    harm.frequency.exponentialRampToValueAtTime(1650, t + 0.2);
    harmGain.gain.setValueAtTime(0.025, t + 0.005);
    harmGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    harm.connect(harmGain);
    harmGain.connect(this.sfxGain!);
    harm.start(t + 0.005);
    harm.stop(t + 0.2);

    this.playFilteredNoise(0.1, 0.06, 3000, 'highpass', t);
    this.sendToReverb(glassGain, 0.4);
  }

  private digCrystal(t: number, pitch: number, _depthMod: number) {
    const ctx = this.ctx!;

    const freqs = [800, 1200, 1600, 2400];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f * pitch, t + i * 0.008);
      gain.gain.setValueAtTime(0.06 - i * 0.01, t + i * 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3 + i * 0.05);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t + i * 0.008);
      osc.stop(t + 0.3 + i * 0.05);
      this.sendToReverb(gain, 0.5);
    });

    this.playFilteredNoise(0.03, 0.08, 6000, 'highpass', t);

    const shimmer = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(4000 * pitch, t);
    shimmer.frequency.setValueAtTime(4200 * pitch, t + 0.05);
    shimmer.frequency.setValueAtTime(3800 * pitch, t + 0.1);
    shimmerGain.gain.setValueAtTime(0.02, t);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(this.sfxGain!);
    shimmer.start(t);
    shimmer.stop(t + 0.25);
    this.sendToReverb(shimmerGain, 0.6);
  }

  // ── BREAK SOUNDS ────────────────────────────────────────────

  playBreak(tileType: TileType, depth: number = 0) {
    if (!this.ctx || !this.sfxGain) return;
    this.ensureCtx();
    const t = this.ctx.currentTime;
    const depthMod = Math.min(depth / 40, 1);

    if (tileType === TileType.CRYSTAL_WALL) {
      this.breakCrystal(t);
    } else if (tileType === TileType.OBSIDIAN) {
      this.breakObsidian(t);
    } else if (tileType === TileType.HARD_ROCK || tileType === TileType.GRANITE) {
      this.breakHardRock(t, depthMod);
    } else {
      this.breakSoft(t, depthMod);
    }
  }

  private breakSoft(t: number, depthMod: number) {
    const ctx = this.ctx!;

    const crunch = ctx.createOscillator();
    const crunchGain = ctx.createGain();
    crunch.type = 'sawtooth';
    crunch.frequency.setValueAtTime(200, t);
    crunch.frequency.exponentialRampToValueAtTime(30, t + 0.2);
    crunchGain.gain.setValueAtTime(0.25, t);
    crunchGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    crunch.connect(crunchGain);
    crunchGain.connect(this.sfxGain!);
    crunch.start(t);
    crunch.stop(t + 0.25);

    this.playFilteredNoise(0.3, 0.2, 1500 - depthMod * 400, 'lowpass', t);

    for (let i = 0; i < 3; i++) {
      const delay = 0.02 + Math.random() * 0.1;
      const rubble = ctx.createOscillator();
      const rubbleGain = ctx.createGain();
      rubble.type = 'triangle';
      rubble.frequency.setValueAtTime(80 + Math.random() * 120, t + delay);
      rubble.frequency.exponentialRampToValueAtTime(20, t + delay + 0.08);
      rubbleGain.gain.setValueAtTime(0.08, t + delay);
      rubbleGain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.08);
      rubble.connect(rubbleGain);
      rubbleGain.connect(this.sfxGain!);
      rubble.start(t + delay);
      rubble.stop(t + delay + 0.08);
    }

    this.sendToReverb(crunchGain, 0.25);
  }

  private breakHardRock(t: number, depthMod: number) {
    const ctx = this.ctx!;

    const boom = ctx.createOscillator();
    const boomGain = ctx.createGain();
    boom.type = 'sawtooth';
    boom.frequency.setValueAtTime(120, t);
    boom.frequency.exponentialRampToValueAtTime(25, t + 0.2);
    boomGain.gain.setValueAtTime(0.3, t);
    boomGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    boom.connect(boomGain);
    boomGain.connect(this.sfxGain!);
    boom.start(t);
    boom.stop(t + 0.3);

    this.playFilteredNoise(0.35, 0.25, 2000 - depthMod * 500, 'lowpass', t);
    this.playFilteredNoise(0.08, 0.08, 4000, 'highpass', t + 0.01);

    for (let i = 0; i < 4; i++) {
      const delay = 0.01 + Math.random() * 0.15;
      const debris = ctx.createOscillator();
      const debrisGain = ctx.createGain();
      debris.type = 'square';
      debris.frequency.setValueAtTime(300 + Math.random() * 400, t + delay);
      debris.frequency.exponentialRampToValueAtTime(50, t + delay + 0.06);
      debrisGain.gain.setValueAtTime(0.06, t + delay);
      debrisGain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.06);
      debris.connect(debrisGain);
      debrisGain.connect(this.sfxGain!);
      debris.start(t + delay);
      debris.stop(t + delay + 0.06);
    }

    this.sendToReverb(boomGain, 0.35);
  }

  private breakObsidian(t: number) {
    const ctx = this.ctx!;

    const shatter = ctx.createOscillator();
    const shatterGain = ctx.createGain();
    shatter.type = 'sawtooth';
    shatter.frequency.setValueAtTime(300, t);
    shatter.frequency.exponentialRampToValueAtTime(40, t + 0.2);
    shatterGain.gain.setValueAtTime(0.28, t);
    shatterGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    shatter.connect(shatterGain);
    shatterGain.connect(this.sfxGain!);
    shatter.start(t);
    shatter.stop(t + 0.3);

    for (let i = 0; i < 5; i++) {
      const delay = Math.random() * 0.1;
      const shard = ctx.createOscillator();
      const shardGain = ctx.createGain();
      shard.type = 'sine';
      shard.frequency.setValueAtTime(1500 + Math.random() * 3000, t + delay);
      shard.frequency.exponentialRampToValueAtTime(400, t + delay + 0.15);
      shardGain.gain.setValueAtTime(0.04, t + delay);
      shardGain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.15);
      shard.connect(shardGain);
      shardGain.connect(this.sfxGain!);
      shard.start(t + delay);
      shard.stop(t + delay + 0.15);
      this.sendToReverb(shardGain, 0.35);
    }

    this.playFilteredNoise(0.2, 0.15, 5000, 'highpass', t);
    this.sendToReverb(shatterGain, 0.4);
  }

  private breakCrystal(t: number) {
    const ctx = this.ctx!;

    const chimes = [600, 900, 1200, 1800, 2400, 3000];
    chimes.forEach((f, i) => {
      const delay = i * 0.015;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f + Math.random() * 50, t + delay);
      gain.gain.setValueAtTime(0.07 - i * 0.008, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6 + i * 0.08);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t + delay);
      osc.stop(t + 0.6 + i * 0.08);
      this.sendToReverb(gain, 0.7);
    });

    this.playFilteredNoise(0.1, 0.15, 4000, 'highpass', t);

    const sweep = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    sweep.type = 'sine';
    sweep.frequency.setValueAtTime(5000, t);
    sweep.frequency.exponentialRampToValueAtTime(800, t + 0.4);
    sweepGain.gain.setValueAtTime(0.03, t);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    sweep.connect(sweepGain);
    sweepGain.connect(this.sfxGain!);
    sweep.start(t);
    sweep.stop(t + 0.4);
    this.sendToReverb(sweepGain, 0.6);
  }

  // ── ORE COLLECTION ──────────────────────────────────────────

  playOreCollect(oreType: number) {
    if (!this.ctx || !this.sfxGain) return;
    this.ensureCtx();
    const t = this.ctx.currentTime;
    const ctx = this.ctx;

    const configs = [
      { base: 440, color: '#D2691E', notes: [1, 1.25, 1.5] },       // copper
      { base: 523, color: '#4682B4', notes: [1, 1.2, 1.5, 1.8] },   // iron
      { base: 659, color: '#FFD700', notes: [1, 1.25, 1.5, 2] },    // gold
      { base: 880, color: '#00CED1', notes: [1, 1.5, 2, 2.5, 3] },  // crystal
      { base: 784, color: '#FF4500', notes: [1, 1.33, 1.67, 2] },   // emberstone
    ];

    const cfg = configs[Math.min(oreType, configs.length - 1)];

    cfg.notes.forEach((mult, i) => {
      const delay = i * 0.04;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(cfg.base * mult, t + delay);
      gain.gain.setValueAtTime(0.12 - i * 0.015, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.2);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t + delay);
      osc.stop(t + delay + 0.2);

      const harm = ctx.createOscillator();
      const harmGain = ctx.createGain();
      harm.type = 'sine';
      harm.frequency.setValueAtTime(cfg.base * mult * 2, t + delay);
      harmGain.gain.setValueAtTime(0.03, t + delay);
      harmGain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.15);
      harm.connect(harmGain);
      harmGain.connect(this.sfxGain!);
      harm.start(t + delay);
      harm.stop(t + delay + 0.15);

      this.sendToReverb(gain, 0.3);
    });

    this.playFilteredNoise(0.02, 0.05, 8000, 'highpass', t);
  }

  // ── UPGRADE SOUND ───────────────────────────────────────────

  playUpgrade() {
    if (!this.ctx || !this.sfxGain) return;
    this.ensureCtx();
    const t = this.ctx.currentTime;
    const ctx = this.ctx;

    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((freq, i) => {
      const delay = i * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + delay);
      gain.gain.setValueAtTime(0.14, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.2);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t + delay);
      osc.stop(t + delay + 0.2);

      const tri = ctx.createOscillator();
      const triGain = ctx.createGain();
      tri.type = 'triangle';
      tri.frequency.setValueAtTime(freq * 2, t + delay);
      triGain.gain.setValueAtTime(0.04, t + delay);
      triGain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.15);
      tri.connect(triGain);
      triGain.connect(this.sfxGain!);
      tri.start(t + delay);
      tri.stop(t + delay + 0.15);
      this.sendToReverb(gain, 0.4);
    });

    this.playFilteredNoise(0.04, 0.1, 6000, 'highpass', t);

    const sweep = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    sweep.type = 'sine';
    sweep.frequency.setValueAtTime(200, t);
    sweep.frequency.exponentialRampToValueAtTime(2000, t + 0.35);
    sweepGain.gain.setValueAtTime(0.03, t);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    sweep.connect(sweepGain);
    sweepGain.connect(this.sfxGain!);
    sweep.start(t);
    sweep.stop(t + 0.4);
    this.sendToReverb(sweepGain, 0.5);
  }

  // ── SONAR ───────────────────────────────────────────────────

  playSonar() {
    if (!this.ctx || !this.sfxGain) return;
    this.ensureCtx();
    const t = this.ctx.currentTime;
    const ctx = this.ctx;

    const ping = ctx.createOscillator();
    const pingGain = ctx.createGain();
    ping.type = 'sine';
    ping.frequency.setValueAtTime(1800, t);
    ping.frequency.exponentialRampToValueAtTime(600, t + 0.8);
    pingGain.gain.setValueAtTime(0.0001, t);
    pingGain.gain.linearRampToValueAtTime(0.2, t + 0.02);
    pingGain.gain.setValueAtTime(0.2, t + 0.05);
    pingGain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
    ping.connect(pingGain);
    pingGain.connect(this.sfxGain!);
    ping.start(t);
    ping.stop(t + 1.5);

    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(80, t);
    sub.frequency.exponentialRampToValueAtTime(40, t + 1.0);
    subGain.gain.setValueAtTime(0.08, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
    sub.connect(subGain);
    subGain.connect(this.sfxGain!);
    sub.start(t);
    sub.stop(t + 1.0);

    const echo1 = ctx.createOscillator();
    const echo1Gain = ctx.createGain();
    echo1.type = 'sine';
    echo1.frequency.setValueAtTime(1400, t + 0.3);
    echo1.frequency.exponentialRampToValueAtTime(500, t + 1.2);
    echo1Gain.gain.setValueAtTime(0.06, t + 0.3);
    echo1Gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
    echo1.connect(echo1Gain);
    echo1Gain.connect(this.sfxGain!);
    echo1.start(t + 0.3);
    echo1.stop(t + 1.5);

    this.sendToReverb(pingGain, 0.7);
    this.sendToReverb(echo1Gain, 0.5);
  }

  // ── DYNAMITE ────────────────────────────────────────────────

  playDynamiteFuse() {
    if (!this.ctx || !this.sfxGain) return;
    this.ensureCtx();
    const t = this.ctx.currentTime;
    const ctx = this.ctx;

    const hissLength = 1.5;
    const bufferSize = ctx.sampleRate * hissLength;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const progress = i / bufferSize;
      const crackle = Math.random() < 0.02 ? (Math.random() * 2 - 1) * 3 : 0;
      data[i] = (Math.random() * 2 - 1) * (0.3 + progress * 0.7) + crackle * 0.1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2000, t);
    filter.frequency.linearRampToValueAtTime(5000, t + hissLength);
    filter.Q.value = 2;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.linearRampToValueAtTime(0.2, t + hissLength * 0.8);
    gain.gain.exponentialRampToValueAtTime(0.001, t + hissLength);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain!);
    source.start(t);

    const tick = ctx.createOscillator();
    const tickGain = ctx.createGain();
    tick.type = 'square';
    tick.frequency.value = 15;
    tickGain.gain.setValueAtTime(0.03, t);
    tickGain.gain.linearRampToValueAtTime(0.08, t + hissLength * 0.8);
    tickGain.gain.exponentialRampToValueAtTime(0.001, t + hissLength);
    tick.connect(tickGain);
    tickGain.connect(this.sfxGain!);
    tick.start(t);
    tick.stop(t + hissLength);
  }

  // ── EXPLOSION ───────────────────────────────────────────────

  playExplosion() {
    if (!this.ctx || !this.sfxGain) return;
    this.ensureCtx();
    const t = this.ctx.currentTime;
    const ctx = this.ctx;

    const boom = ctx.createOscillator();
    const boomGain = ctx.createGain();
    boom.type = 'sawtooth';
    boom.frequency.setValueAtTime(100, t);
    boom.frequency.exponentialRampToValueAtTime(15, t + 0.6);
    boomGain.gain.setValueAtTime(0.45, t);
    boomGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    boom.connect(boomGain);
    boomGain.connect(this.sfxGain!);
    boom.start(t);
    boom.stop(t + 0.8);

    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(50, t);
    sub.frequency.exponentialRampToValueAtTime(18, t + 1.0);
    subGain.gain.setValueAtTime(0.35, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    sub.connect(subGain);
    subGain.connect(this.sfxGain!);
    sub.start(t);
    sub.stop(t + 1.2);

    this.playFilteredNoise(0.5, 0.8, 1200, 'lowpass', t);
    this.playFilteredNoise(0.25, 0.4, 4000, 'bandpass', t + 0.02);

    for (let i = 0; i < 6; i++) {
      const delay = 0.05 + Math.random() * 0.4;
      const debris = ctx.createOscillator();
      const debrisGain = ctx.createGain();
      debris.type = 'triangle';
      debris.frequency.setValueAtTime(200 + Math.random() * 600, t + delay);
      debris.frequency.exponentialRampToValueAtTime(30, t + delay + 0.15);
      debrisGain.gain.setValueAtTime(0.08, t + delay);
      debrisGain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.15);
      debris.connect(debrisGain);
      debrisGain.connect(this.sfxGain!);
      debris.start(t + delay);
      debris.stop(t + delay + 0.15);
    }

    const rumble = ctx.createOscillator();
    const rumbleGain = ctx.createGain();
    rumble.type = 'sine';
    rumble.frequency.setValueAtTime(30, t + 0.1);
    rumble.frequency.setValueAtTime(25, t + 0.5);
    rumble.frequency.setValueAtTime(20, t + 1.0);
    rumbleGain.gain.setValueAtTime(0.15, t + 0.1);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
    rumble.connect(rumbleGain);
    rumbleGain.connect(this.sfxGain!);
    rumble.start(t + 0.1);
    rumble.stop(t + 1.5);

    this.sendToReverb(boomGain, 0.6);
    this.sendToReverb(rumbleGain, 0.5);
  }

  // ── TREMOR ──────────────────────────────────────────────────

  playTremor() {
    if (!this.ctx || !this.sfxGain) return;
    this.ensureCtx();
    const t = this.ctx.currentTime;
    const ctx = this.ctx;

    const rumble = ctx.createOscillator();
    const rumbleGain = ctx.createGain();
    rumble.type = 'sine';
    rumble.frequency.setValueAtTime(35, t);
    rumble.frequency.setValueAtTime(25, t + 0.3);
    rumble.frequency.setValueAtTime(40, t + 0.5);
    rumble.frequency.setValueAtTime(20, t + 0.8);
    rumbleGain.gain.setValueAtTime(0.001, t);
    rumbleGain.gain.linearRampToValueAtTime(0.18, t + 0.15);
    rumbleGain.gain.setValueAtTime(0.18, t + 0.4);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
    rumble.connect(rumbleGain);
    rumbleGain.connect(this.sfxGain!);
    rumble.start(t);
    rumble.stop(t + 1.0);

    this.playFilteredNoise(0.15, 0.8, 300, 'lowpass', t + 0.05);

    const crack = ctx.createOscillator();
    const crackGain = ctx.createGain();
    crack.type = 'sawtooth';
    crack.frequency.setValueAtTime(200, t + 0.2);
    crack.frequency.exponentialRampToValueAtTime(50, t + 0.4);
    crackGain.gain.setValueAtTime(0.08, t + 0.2);
    crackGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    crack.connect(crackGain);
    crackGain.connect(this.sfxGain!);
    crack.start(t + 0.2);
    crack.stop(t + 0.5);

    for (let i = 0; i < 3; i++) {
      const delay = 0.1 + Math.random() * 0.6;
      const pebble = ctx.createOscillator();
      const pebbleGain = ctx.createGain();
      pebble.type = 'triangle';
      pebble.frequency.setValueAtTime(150 + Math.random() * 200, t + delay);
      pebble.frequency.exponentialRampToValueAtTime(30, t + delay + 0.06);
      pebbleGain.gain.setValueAtTime(0.04, t + delay);
      pebbleGain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.06);
      pebble.connect(pebbleGain);
      pebbleGain.connect(this.sfxGain!);
      pebble.start(t + delay);
      pebble.stop(t + delay + 0.06);
    }

    this.sendToReverb(rumbleGain, 0.5);
  }

  // ── ENCOUNTER / GUARDIAN ────────────────────────────────────

  playEncounterReveal() {
    if (!this.ctx || !this.sfxGain) return;
    this.ensureCtx();
    const t = this.ctx.currentTime;
    const ctx = this.ctx;

    const notes = [220, 330, 440, 550, 660, 880];
    notes.forEach((freq, i) => {
      const delay = i * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + delay);
      gain.gain.setValueAtTime(0.12, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.25);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t + delay);
      osc.stop(t + delay + 0.25);
      this.sendToReverb(gain, 0.4);
    });
  }

  playGuardianAttack() {
    if (!this.ctx || !this.sfxGain) return;
    this.ensureCtx();
    const t = this.ctx.currentTime;
    const ctx = this.ctx;

    const roar = ctx.createOscillator();
    const roarGain = ctx.createGain();
    roar.type = 'sawtooth';
    roar.frequency.setValueAtTime(80, t);
    roar.frequency.exponentialRampToValueAtTime(30, t + 0.4);
    roarGain.gain.setValueAtTime(0.25, t);
    roarGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    roar.connect(roarGain);
    roarGain.connect(this.sfxGain!);
    roar.start(t);
    roar.stop(t + 0.5);

    this.playFilteredNoise(0.3, 0.3, 600, 'lowpass', t);
    this.sendToReverb(roarGain, 0.5);
  }

  // ── VICTORY / DEFEAT ────────────────────────────────────────

  playVictory() {
    if (!this.ctx || !this.sfxGain) return;
    this.ensureCtx();
    const t = this.ctx.currentTime;
    const ctx = this.ctx;

    const fanfare = [
      { f: 523, d: 0.15 }, { f: 523, d: 0.15 }, { f: 523, d: 0.15 },
      { f: 659, d: 0.3 }, { f: 587, d: 0.15 }, { f: 659, d: 0.15 },
      { f: 784, d: 0.5 }, { f: 1047, d: 0.5 },
    ];

    let offset = 0;
    fanfare.forEach(({ f, d }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + offset);
      gain.gain.setValueAtTime(0.15, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + d);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t + offset);
      osc.stop(t + offset + d);

      const tri = ctx.createOscillator();
      const triGain = ctx.createGain();
      tri.type = 'triangle';
      tri.frequency.setValueAtTime(f * 2, t + offset);
      triGain.gain.setValueAtTime(0.04, t + offset);
      triGain.gain.exponentialRampToValueAtTime(0.001, t + offset + d * 0.8);
      tri.connect(triGain);
      triGain.connect(this.sfxGain!);
      tri.start(t + offset);
      tri.stop(t + offset + d * 0.8);

      this.sendToReverb(gain, 0.4);
      offset += d * 0.8;
    });

    const shimmer = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(2000, t + offset);
    shimmer.frequency.exponentialRampToValueAtTime(4000, t + offset + 0.5);
    shimmerGain.gain.setValueAtTime(0.03, t + offset);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.8);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(this.sfxGain!);
    shimmer.start(t + offset);
    shimmer.stop(t + offset + 0.8);
    this.sendToReverb(shimmerGain, 0.6);
  }

  playDefeat() {
    if (!this.ctx || !this.sfxGain) return;
    this.ensureCtx();
    const t = this.ctx.currentTime;
    const ctx = this.ctx;

    const notes = [440, 392, 349, 294, 262, 220];
    let offset = 0;
    notes.forEach((f, i) => {
      const dur = 0.2 + i * 0.03;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + offset);
      gain.gain.setValueAtTime(0.12 - i * 0.01, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + dur);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t + offset);
      osc.stop(t + offset + dur);

      const low = ctx.createOscillator();
      const lowGain = ctx.createGain();
      low.type = 'triangle';
      low.frequency.setValueAtTime(f * 0.5, t + offset);
      lowGain.gain.setValueAtTime(0.06, t + offset);
      lowGain.gain.exponentialRampToValueAtTime(0.001, t + offset + dur);
      low.connect(lowGain);
      lowGain.connect(this.sfxGain!);
      low.start(t + offset);
      low.stop(t + offset + dur);

      this.sendToReverb(gain, 0.4);
      offset += dur * 0.75;
    });

    const drone = ctx.createOscillator();
    const droneGain = ctx.createGain();
    drone.type = 'sawtooth';
    drone.frequency.setValueAtTime(55, t);
    droneGain.gain.setValueAtTime(0.04, t);
    droneGain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.5);
    drone.connect(droneGain);
    droneGain.connect(this.sfxGain!);
    drone.start(t);
    drone.stop(t + offset + 0.5);
    this.sendToReverb(droneGain, 0.5);
  }

  // ── UI SOUNDS ───────────────────────────────────────────────

  playButtonClick() {
    if (!this.ctx || !this.sfxGain) return;
    this.ensureCtx();
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.04);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  playMenuOpen() {
    if (!this.ctx || !this.sfxGain) return;
    this.ensureCtx();
    const t = this.ctx.currentTime;
    const ctx = this.ctx;

    [400, 600, 800].forEach((f, i) => {
      const delay = i * 0.03;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + delay);
      gain.gain.setValueAtTime(0.06, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.1);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t + delay);
      osc.stop(t + delay + 0.1);
    });
  }

  playMenuClose() {
    if (!this.ctx || !this.sfxGain) return;
    this.ensureCtx();
    const t = this.ctx.currentTime;
    const ctx = this.ctx;

    [800, 600, 400].forEach((f, i) => {
      const delay = i * 0.03;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + delay);
      gain.gain.setValueAtTime(0.05, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.08);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t + delay);
      osc.stop(t + delay + 0.08);
    });
  }

  // ── HELPER: FILTERED NOISE ──────────────────────────────────

  private playFilteredNoise(
    volume: number, duration: number, filterFreq: number,
    filterType: BiquadFilterType = 'lowpass', startAt?: number,
  ) {
    if (!this.ctx || !this.sfxGain) return;
    const t = startAt ?? this.ctx.currentTime;
    const bufferSize = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq;
    if (filterType === 'bandpass') filter.Q.value = 1.5;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain!);
    source.start(t);
  }

  // ── AMBIENT SYSTEM ──────────────────────────────────────────

  private startAmbient() {
    if (!this.ctx || !this.ambientGain) return;
    const ctx = this.ctx;

    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let prev = 0;
      for (let i = 0; i < bufferSize; i++) {
        prev = prev * 0.98 + (Math.random() * 2 - 1) * 0.02;
        data[i] = prev;
      }
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 180;
    noise.connect(lpf);
    lpf.connect(this.ambientGain);
    noise.start();

    this.scheduleDrips();
    this.scheduleDistantSounds();
  }

  private scheduleDrips() {
    if (!this.ctx || !this.ambientGain) return;
    const ctx = this.ctx;

    const drip = () => {
      if (!ctx || ctx.state === 'closed') return;
      const t = ctx.currentTime;
      const freq = 1500 + Math.random() * 3000;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.4, t + 0.08);
      gain.gain.setValueAtTime(0.04, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain);
      gain.connect(this.ambientGain!);
      this.sendToReverb(gain, 0.6);
      osc.start(t);
      osc.stop(t + 0.12);

      if (Math.random() < 0.3) {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(freq * 0.8, t + 0.15);
        osc2.frequency.exponentialRampToValueAtTime(freq * 0.3, t + 0.22);
        gain2.gain.setValueAtTime(0.02, t + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc2.connect(gain2);
        gain2.connect(this.ambientGain!);
        this.sendToReverb(gain2, 0.5);
        osc2.start(t + 0.15);
        osc2.stop(t + 0.25);
      }

      setTimeout(drip, 2500 + Math.random() * 6000);
    };

    setTimeout(drip, 1500);
  }

  private scheduleDistantSounds() {
    if (!this.ctx || !this.ambientGain) return;
    const ctx = this.ctx;

    const distant = () => {
      if (!ctx || ctx.state === 'closed') return;
      const t = ctx.currentTime;

      const type = Math.random();
      if (type < 0.4) {
        const rumble = ctx.createOscillator();
        const rumbleGain = ctx.createGain();
        rumble.type = 'sine';
        rumble.frequency.setValueAtTime(25 + Math.random() * 20, t);
        rumbleGain.gain.setValueAtTime(0.001, t);
        rumbleGain.gain.linearRampToValueAtTime(0.04, t + 0.5);
        rumbleGain.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
        rumble.connect(rumbleGain);
        rumbleGain.connect(this.ambientGain!);
        this.sendToReverb(rumbleGain, 0.3);
        rumble.start(t);
        rumble.stop(t + 2.0);
      } else if (type < 0.7) {
        const creak = ctx.createOscillator();
        const creakGain = ctx.createGain();
        creak.type = 'triangle';
        const baseFreq = 100 + Math.random() * 200;
        creak.frequency.setValueAtTime(baseFreq, t);
        creak.frequency.linearRampToValueAtTime(baseFreq * 1.3, t + 0.3);
        creak.frequency.linearRampToValueAtTime(baseFreq * 0.8, t + 0.8);
        creakGain.gain.setValueAtTime(0.001, t);
        creakGain.gain.linearRampToValueAtTime(0.025, t + 0.15);
        creakGain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
        creak.connect(creakGain);
        creakGain.connect(this.ambientGain!);
        this.sendToReverb(creakGain, 0.5);
        creak.start(t);
        creak.stop(t + 1.0);
      } else {
        const echo = ctx.createOscillator();
        const echoGain = ctx.createGain();
        echo.type = 'sine';
        echo.frequency.setValueAtTime(400 + Math.random() * 600, t);
        echo.frequency.exponentialRampToValueAtTime(100, t + 0.3);
        echoGain.gain.setValueAtTime(0.015, t);
        echoGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
        echo.connect(echoGain);
        echoGain.connect(this.ambientGain!);
        this.sendToReverb(echoGain, 0.8);
        echo.start(t);
        echo.stop(t + 0.8);
      }

      setTimeout(distant, 4000 + Math.random() * 10000);
    };

    setTimeout(distant, 3000);
  }

  // ── CAVE DRONE ──────────────────────────────────────────────

  private startCaveDrone() {
    if (!this.ctx || !this.musicGain) return;
    const ctx = this.ctx;

    const drone1 = ctx.createOscillator();
    const drone1Gain = ctx.createGain();
    drone1.type = 'sine';
    drone1.frequency.value = 55;
    drone1Gain.gain.value = 0.15;
    drone1.connect(drone1Gain);
    drone1Gain.connect(this.musicGain);
    drone1.start();

    const drone2 = ctx.createOscillator();
    const drone2Gain = ctx.createGain();
    drone2.type = 'sine';
    drone2.frequency.value = 82.5;
    drone2Gain.gain.value = 0.08;
    drone2.connect(drone2Gain);
    drone2Gain.connect(this.musicGain);
    drone2.start();

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.08;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 3;
    lfo.connect(lfoGain);
    lfoGain.connect(drone1.frequency);
    lfo.start();

    const lfo2 = ctx.createOscillator();
    lfo2.type = 'sine';
    lfo2.frequency.value = 0.05;
    const lfo2Gain = ctx.createGain();
    lfo2Gain.gain.value = 0.03;
    lfo2.connect(lfo2Gain);
    lfo2Gain.connect(drone1Gain.gain);
    lfo2.start();
  }
}

export const audioManager = new SoundManager();
