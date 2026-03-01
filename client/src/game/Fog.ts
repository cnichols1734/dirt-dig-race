import { Container, Graphics } from 'pixi.js';
import { SCALED_TILE } from '../utils/constants';
import { TileType } from '@dig/shared';

export class FogOfWar {
  container: Container;
  fogGraphics: Graphics;
  revealed: Set<string> = new Set();
  sonarRevealed: Set<string> = new Set();
  sonarTimer: number = 0;
  width: number;
  height: number;
  private dirty = true;
  private fadingTiles: Map<string, number> = new Map();

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.container = new Container();
    this.fogGraphics = new Graphics();
    this.container.addChild(this.fogGraphics);
  }

  revealAround(tx: number, ty: number, radius: number) {
    for (let dy = -radius - 1; dy <= radius + 1; dy++) {
      for (let dx = -radius - 1; dx <= radius + 1; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius + 1) continue;
        const nx = tx + dx, ny = ty + dy;
        if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) continue;
        const key = `${nx},${ny}`;
        if (!this.revealed.has(key)) {
          this.revealed.add(key);
          this.fadingTiles.set(key, 1.0);
          this.dirty = true;
        }
      }
    }
  }

  revealTile(x: number, y: number) {
    const key = `${x},${y}`;
    if (!this.revealed.has(key)) {
      this.revealed.add(key);
      this.fadingTiles.set(key, 1.0);
      this.dirty = true;
    }
  }

  sonarReveal(tiles: Array<{ x: number; y: number }>, durationMs: number) {
    for (const t of tiles) {
      const key = `${t.x},${t.y}`;
      this.sonarRevealed.add(key);
    }
    this.sonarTimer = durationMs;
    this.dirty = true;
  }

  update(dt: number) {
    if (this.sonarTimer > 0) {
      this.sonarTimer -= dt;
      if (this.sonarTimer <= 0) {
        this.sonarRevealed.clear();
        this.dirty = true;
      }
    }

    let anyFading = false;
    for (const [key, alpha] of this.fadingTiles) {
      const newAlpha = alpha - dt * 0.005;
      if (newAlpha <= 0) {
        this.fadingTiles.delete(key);
      } else {
        this.fadingTiles.set(key, newAlpha);
        anyFading = true;
      }
    }

    if (anyFading) this.dirty = true;

    if (this.dirty) {
      this.redraw();
      this.dirty = false;
    }
  }

  private redraw() {
    this.fogGraphics.clear();

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const key = `${x},${y}`;
        const isRevealed = this.revealed.has(key);
        const isSonar = this.sonarRevealed.has(key);

        if (isRevealed && !this.fadingTiles.has(key)) continue;
        if (isSonar) continue;

        let alpha = 0.95;

        if (this.fadingTiles.has(key)) {
          alpha = Math.min(0.95, this.fadingTiles.get(key)!) * 0.95;
        }

        if (isRevealed) continue;

        const hasRevealedNeighbor = this.hasAdjacentRevealed(x, y);
        if (hasRevealedNeighbor) {
          alpha = 0.7;
        }

        if (alpha > 0.01) {
          this.fogGraphics.rect(x * SCALED_TILE, y * SCALED_TILE, SCALED_TILE, SCALED_TILE);
          this.fogGraphics.fill({ color: 0x050510, alpha });
        }
      }
    }
  }

  private hasAdjacentRevealed(x: number, y: number): boolean {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const key = `${x + dx},${y + dy}`;
        if (this.revealed.has(key) || this.sonarRevealed.has(key)) return true;
      }
    }
    return false;
  }

  isRevealed(x: number, y: number): boolean {
    return this.revealed.has(`${x},${y}`) || this.sonarRevealed.has(`${x},${y}`);
  }
}
