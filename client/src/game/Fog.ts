import { Container, Graphics, BlurFilter } from 'pixi.js';
import { SCALED_TILE } from '../utils/constants';
import { BALANCE } from '@dig/shared';

export class FogOfWar {
  container: Container;
  fogGraphics: Graphics;
  revealed: Set<string> = new Set();
  sonarRevealed: Set<string> = new Set();
  sonarTimer: number = 0;
  private animatingTiles: Map<string, { alpha: number; target: number }> = new Map();
  width: number;
  height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.container = new Container();
    this.fogGraphics = new Graphics();
    this.container.addChild(this.fogGraphics);
  }

  revealAround(tx: number, ty: number, radius: number) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius + 0.5) continue;
        const nx = tx + dx, ny = ty + dy;
        if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) continue;
        const key = `${nx},${ny}`;
        if (!this.revealed.has(key)) {
          this.revealed.add(key);
          this.animatingTiles.set(key, { alpha: 1, target: 0 });
        }
      }
    }
  }

  sonarReveal(tiles: Array<{ x: number; y: number }>, durationMs: number) {
    for (const t of tiles) {
      const key = `${t.x},${t.y}`;
      this.sonarRevealed.add(key);
    }
    this.sonarTimer = durationMs;
  }

  update(dt: number) {
    if (this.sonarTimer > 0) {
      this.sonarTimer -= dt;
      if (this.sonarTimer <= 0) {
        this.sonarRevealed.clear();
      }
    }

    for (const [key, anim] of this.animatingTiles) {
      anim.alpha += (anim.target - anim.alpha) * 0.15;
      if (Math.abs(anim.alpha - anim.target) < 0.01) {
        this.animatingTiles.delete(key);
      }
    }

    this.redraw();
  }

  private redraw() {
    this.fogGraphics.clear();

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const key = `${x},${y}`;
        const isRevealed = this.revealed.has(key);
        const isSonar = this.sonarRevealed.has(key);
        const anim = this.animatingTiles.get(key);

        if (isRevealed && !anim) continue;
        if (isSonar) continue;

        let alpha = 0.95;
        if (anim) alpha = anim.alpha * 0.95;

        if (isRevealed && !anim) continue;

        if (alpha > 0.02) {
          this.fogGraphics.rect(x * SCALED_TILE, y * SCALED_TILE, SCALED_TILE, SCALED_TILE);
          this.fogGraphics.fill({ color: 0x000000, alpha });
        }
      }
    }

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const key = `${x},${y}`;
        if (this.revealed.has(key) || this.sonarRevealed.has(key)) continue;

        let neighborRevealed = false;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nk = `${x + dx},${y + dy}`;
            if (this.revealed.has(nk) || this.sonarRevealed.has(nk)) {
              neighborRevealed = true;
              break;
            }
          }
          if (neighborRevealed) break;
        }

        if (!neighborRevealed) continue;
        this.fogGraphics.rect(x * SCALED_TILE - 4, y * SCALED_TILE - 4, SCALED_TILE + 8, SCALED_TILE + 8);
        this.fogGraphics.fill({ color: 0x000000, alpha: 0.4 });
      }
    }
  }

  isRevealed(x: number, y: number): boolean {
    return this.revealed.has(`${x},${y}`) || this.sonarRevealed.has(`${x},${y}`);
  }
}
