import { Container, Graphics } from 'pixi.js';
import { SCALED_TILE } from '../utils/constants';
import { BALANCE } from '@dig/shared';

interface SonarRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
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

    for (let i = 0; i < 4; i++) {
      this.rings.push({
        x: cx, y: cy,
        radius: 0,
        maxRadius: maxR,
        life: 1800 - i * 250,
        maxLife: 1800 - i * 250,
      });
    }
  }

  showEnemyBlip(tileX: number, tileY: number) {
    this.enemyBlip = {
      x: tileX * SCALED_TILE + SCALED_TILE / 2,
      y: tileY * SCALED_TILE + SCALED_TILE / 2,
      life: 3000,
    };
  }

  update(dt: number) {
    this.ringGraphics.clear();
    this.blipGraphics.clear();

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i];
      ring.life -= dt;
      ring.radius += (ring.maxRadius / ring.maxLife) * dt;

      if (ring.life <= 0) {
        this.rings.splice(i, 1);
        continue;
      }

      const lifeRatio = ring.life / ring.maxLife;
      const alpha = lifeRatio * 0.5;
      this.ringGraphics.setStrokeStyle({ width: 2 + lifeRatio, color: 0x00CED1, alpha });
      this.ringGraphics.circle(ring.x, ring.y, ring.radius);
      this.ringGraphics.stroke();

      if (lifeRatio > 0.5) {
        this.ringGraphics.setStrokeStyle({ width: 1, color: 0x00CED1, alpha: alpha * 0.3 });
        this.ringGraphics.circle(ring.x, ring.y, ring.radius + 4);
        this.ringGraphics.stroke();
      }
    }

    if (this.enemyBlip) {
      this.enemyBlip.life -= dt;
      if (this.enemyBlip.life <= 0) {
        this.enemyBlip = null;
      } else {
        const lifeRatio = this.enemyBlip.life / 3000;
        const pulse = 0.5 + Math.sin(Date.now() * 0.012) * 0.5;
        const alpha = lifeRatio * pulse;

        this.blipGraphics.circle(this.enemyBlip.x, this.enemyBlip.y, 6);
        this.blipGraphics.fill({ color: 0xFF4444, alpha: alpha * 0.8 });

        this.blipGraphics.circle(this.enemyBlip.x, this.enemyBlip.y, 12);
        this.blipGraphics.fill({ color: 0xFF4444, alpha: alpha * 0.3 });

        this.blipGraphics.circle(this.enemyBlip.x, this.enemyBlip.y, 20);
        this.blipGraphics.fill({ color: 0xFF4444, alpha: alpha * 0.1 });

        const crossSize = 8 + pulse * 4;
        this.blipGraphics.moveTo(this.enemyBlip.x - crossSize, this.enemyBlip.y);
        this.blipGraphics.lineTo(this.enemyBlip.x + crossSize, this.enemyBlip.y);
        this.blipGraphics.moveTo(this.enemyBlip.x, this.enemyBlip.y - crossSize);
        this.blipGraphics.lineTo(this.enemyBlip.x, this.enemyBlip.y + crossSize);
        this.blipGraphics.stroke({ color: 0xFF4444, width: 1, alpha: alpha * 0.5 });
      }
    }
  }
}
