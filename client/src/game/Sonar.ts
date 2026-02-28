import { Container, Graphics } from 'pixi.js';
import { SCALED_TILE } from '../utils/constants';
import { BALANCE } from '@dig/shared';

interface SonarRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
}

export class SonarSystem {
  container: Container;
  private rings: SonarRing[] = [];
  private enemyBlip: { x: number; y: number; life: number } | null = null;
  private ringGraphics: Graphics;
  private blipGraphics: Graphics;

  constructor() {
    this.container = new Container();
    this.ringGraphics = new Graphics();
    this.blipGraphics = new Graphics();
    this.container.addChild(this.ringGraphics);
    this.container.addChild(this.blipGraphics);
  }

  ping(tileX: number, tileY: number) {
    const cx = tileX * SCALED_TILE + SCALED_TILE / 2;
    const cy = tileY * SCALED_TILE + SCALED_TILE / 2;
    const maxR = BALANCE.SONAR_RADIUS * SCALED_TILE;

    for (let i = 0; i < 3; i++) {
      this.rings.push({
        x: cx, y: cy,
        radius: 0,
        maxRadius: maxR,
        life: 1500 - i * 200,
      });
    }
  }

  showEnemyBlip(tileX: number, tileY: number) {
    this.enemyBlip = {
      x: tileX * SCALED_TILE + SCALED_TILE / 2,
      y: tileY * SCALED_TILE + SCALED_TILE / 2,
      life: 2000,
    };
  }

  update(dt: number) {
    this.ringGraphics.clear();
    this.blipGraphics.clear();

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i];
      ring.life -= dt;
      ring.radius += (ring.maxRadius / 1500) * dt;

      if (ring.life <= 0) {
        this.rings.splice(i, 1);
        continue;
      }

      const alpha = (ring.life / 1500) * 0.5;
      this.ringGraphics.setStrokeStyle({ width: 2, color: 0x00CED1, alpha });
      this.ringGraphics.circle(ring.x, ring.y, ring.radius);
      this.ringGraphics.stroke();
    }

    if (this.enemyBlip) {
      this.enemyBlip.life -= dt;
      if (this.enemyBlip.life <= 0) {
        this.enemyBlip = null;
      } else {
        const pulse = 0.5 + Math.sin(Date.now() * 0.01) * 0.5;
        const alpha = (this.enemyBlip.life / 2000) * pulse;
        this.blipGraphics.circle(this.enemyBlip.x, this.enemyBlip.y, 8);
        this.blipGraphics.fill({ color: 0xFF4444, alpha });
        this.blipGraphics.circle(this.enemyBlip.x, this.enemyBlip.y, 14);
        this.blipGraphics.fill({ color: 0xFF4444, alpha: alpha * 0.3 });
      }
    }
  }
}
