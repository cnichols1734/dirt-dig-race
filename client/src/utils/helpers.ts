export class SeededRandom {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  next(): number {
    this.seed = (this.seed * 16807 + 0) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function getBiome(x: number): string {
  if ((x >= 0 && x <= 8) || (x >= 52 && x <= 59)) return 'SOIL';
  if ((x >= 9 && x <= 18) || (x >= 42 && x <= 51)) return 'STONE';
  if ((x >= 19 && x <= 26) || (x >= 34 && x <= 41)) return 'DEEP_ROCK';
  if (x >= 27 && x <= 33) return 'CORE';
  return 'STONE';
}

export function hexToRgb(hex: number): { r: number; g: number; b: number } {
  return {
    r: (hex >> 16) & 255,
    g: (hex >> 8) & 255,
    b: hex & 255,
  };
}

export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
