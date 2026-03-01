import { Container, Graphics } from 'pixi.js';
import { SCALED_TILE, ORE_COLORS } from '../utils/constants';
import { OreType, TileData } from '@dig/shared';

export class LightingSystem {
  container: Container;
  lanternLight: Graphics;
  hitFlash: Graphics;
  oreGlows: Graphics;
  private hitFlashTimer: number = 0;
  private lanternFlicker: number = 0;

  constructor() {
    this.container = new Container();
    this.container.blendMode = 'add';

    this.oreGlows = new Graphics();
    this.container.addChild(this.oreGlows);

    this.lanternLight = new Graphics();
    this.container.addChild(this.lanternLight);

    this.hitFlash = new Graphics();
    this.hitFlash.alpha = 0;
    this.container.addChild(this.hitFlash);
  }

  updateLantern(px: number, py: number, radius: number) {
    this.lanternLight.clear();
    const cx = px * SCALED_TILE + SCALED_TILE / 2;
    const cy = py * SCALED_TILE + SCALED_TILE / 2;
    const r = (radius + 1.5) * SCALED_TILE;

    const flicker = 0.85 + Math.sin(this.lanternFlicker) * 0.1 + Math.sin(this.lanternFlicker * 3.1) * 0.05;

    for (let i = 9; i >= 0; i--) {
      const ratio = i / 9;
      const cr = r * (0.15 + ratio * 0.85);
      const alpha = (1 - ratio) * 0.22 * flicker;
      this.lanternLight.circle(cx, cy, cr);
      this.lanternLight.fill({ color: 0xFFB347, alpha });
    }

    this.lanternLight.circle(cx, cy - 10, r * 0.12);
    this.lanternLight.fill({ color: 0xFFFFDD, alpha: 0.2 * flicker });

    this.lanternLight.circle(cx, cy, r * 0.06);
    this.lanternLight.fill({ color: 0xFFFFFF, alpha: 0.08 * flicker });

    const beamAngle = Math.sin(this.lanternFlicker * 0.3) * 0.3;
    const bx = cx + Math.cos(beamAngle) * r * 0.6;
    const by = cy - r * 0.5;
    this.lanternLight.circle(bx, by, r * 0.2);
    this.lanternLight.fill({ color: 0xFFFFDD, alpha: 0.04 * flicker });
  }

  flashHit(wx: number, wy: number) {
    this.hitFlash.clear();

    this.hitFlash.circle(wx, wy, SCALED_TILE * 0.5);
    this.hitFlash.fill({ color: 0xFFFFFF, alpha: 0.8 });
    this.hitFlash.circle(wx, wy, SCALED_TILE * 0.8);
    this.hitFlash.fill({ color: 0xFFB347, alpha: 0.3 });
    this.hitFlash.circle(wx, wy, SCALED_TILE * 1.2);
    this.hitFlash.fill({ color: 0xFF8C42, alpha: 0.1 });
    this.hitFlash.alpha = 1;
    this.hitFlashTimer = 120;
  }

  flashBreak(wx: number, wy: number) {
    this.hitFlash.clear();

    this.hitFlash.circle(wx, wy, SCALED_TILE * 0.6);
    this.hitFlash.fill({ color: 0xFFFFFF, alpha: 0.8 });
    this.hitFlash.circle(wx, wy, SCALED_TILE * 1.4);
    this.hitFlash.fill({ color: 0xFFD700, alpha: 0.35 });
    this.hitFlash.circle(wx, wy, SCALED_TILE * 2.2);
    this.hitFlash.fill({ color: 0xFFB347, alpha: 0.15 });
    this.hitFlash.circle(wx, wy, SCALED_TILE * 3.0);
    this.hitFlash.fill({ color: 0xFF8C42, alpha: 0.05 });
    this.hitFlash.alpha = 1;
    this.hitFlashTimer = 200;
  }

  updateOreGlows(tiles: TileData[][], revealedSet: Set<string>) {
    this.oreGlows.clear();

    for (const key of revealedSet) {
      const [xs, ys] = key.split(',');
      const x = parseInt(xs), y = parseInt(ys);
      if (x < 0 || y < 0 || !tiles[y] || !tiles[y][x]) continue;
      const tile = tiles[y][x];
      if (tile.ore === OreType.NONE || tile.type === 0) continue;

      const color = ORE_COLORS[tile.ore];
      const cx = x * SCALED_TILE + SCALED_TILE / 2;
      const cy = y * SCALED_TILE + SCALED_TILE / 2;
      const pulse = 0.8 + Math.sin(this.lanternFlicker + x * 0.5 + y * 0.3) * 0.2;

      this.oreGlows.circle(cx, cy, SCALED_TILE * 0.4);
      this.oreGlows.fill({ color, alpha: 0.15 * pulse });
      this.oreGlows.circle(cx, cy, SCALED_TILE * 0.8);
      this.oreGlows.fill({ color, alpha: 0.06 * pulse });
      this.oreGlows.circle(cx, cy, SCALED_TILE * 1.2);
      this.oreGlows.fill({ color, alpha: 0.02 * pulse });
    }
  }

  update(dt: number) {
    this.lanternFlicker += dt * 0.012;

    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= dt;
      const maxTimer = 200;
      const t = Math.max(0, this.hitFlashTimer / maxTimer);
      this.hitFlash.alpha = t * t * 0.9;
    }
  }
}
