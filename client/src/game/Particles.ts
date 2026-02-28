import { Container, Graphics } from 'pixi.js';
import { SCALED_TILE, TILE_COLORS, ORE_COLORS } from '../utils/constants';
import { TileType, OreType } from '@dig/shared';
import { randomRange } from '../utils/helpers';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: number;
  size: number;
  gravity: number;
  alpha: number;
  graphic: Graphics;
}

export class ParticleSystem {
  container: Container;
  particles: Particle[] = [];
  private pool: Graphics[] = [];

  constructor() {
    this.container = new Container();
  }

  private getGraphic(): Graphics {
    if (this.pool.length > 0) {
      const g = this.pool.pop()!;
      g.visible = true;
      return g;
    }
    const g = new Graphics();
    this.container.addChild(g);
    return g;
  }

  private releaseGraphic(g: Graphics) {
    g.visible = false;
    this.pool.push(g);
  }

  private spawn(config: Omit<Particle, 'graphic' | 'alpha'>): Particle {
    const g = this.getGraphic();
    g.clear();
    g.rect(-config.size / 2, -config.size / 2, config.size, config.size);
    g.fill(config.color);
    g.x = config.x;
    g.y = config.y;
    const p: Particle = { ...config, alpha: 1, graphic: g };
    this.particles.push(p);
    return p;
  }

  digDust(wx: number, wy: number, tileType: TileType) {
    const color = TILE_COLORS[tileType] || 0x4A4A4A;
    const count = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      this.spawn({
        x: wx, y: wy,
        vx: randomRange(-80, 80),
        vy: randomRange(-100, -20),
        life: 300, maxLife: 300,
        color: this.varyColor(color),
        size: randomRange(2, 5),
        gravity: 200,
      });
    }
  }

  tileBreak(wx: number, wy: number, tileType: TileType) {
    const color = TILE_COLORS[tileType] || 0x4A4A4A;
    const count = 15 + Math.floor(Math.random() * 11);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomRange(80, 250);
      this.spawn({
        x: wx + randomRange(-8, 8),
        y: wy + randomRange(-8, 8),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        life: 500, maxLife: 500,
        color: this.varyColor(color),
        size: randomRange(3, 8),
        gravity: 300,
      });
    }
  }

  oreCollect(wx: number, wy: number, oreType: OreType) {
    const color = ORE_COLORS[oreType];
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      this.spawn({
        x: wx, y: wy,
        vx: Math.cos(angle) * 30,
        vy: -randomRange(60, 150),
        life: 400, maxLife: 400,
        color,
        size: randomRange(2, 4),
        gravity: -50,
      });
    }
  }

  dynamiteExplosion(wx: number, wy: number) {
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomRange(100, 400);
      const colors = [0xFF4500, 0xFF8C00, 0xFFD700, 0xFF6347];
      this.spawn({
        x: wx + randomRange(-10, 10),
        y: wy + randomRange(-10, 10),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 600, maxLife: 600,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: randomRange(4, 10),
        gravity: 150,
      });
    }
    for (let i = 0; i < 15; i++) {
      this.spawn({
        x: wx + randomRange(-20, 20),
        y: wy + randomRange(-20, 20),
        vx: randomRange(-30, 30),
        vy: randomRange(-40, -10),
        life: 1000, maxLife: 1000,
        color: 0x444444,
        size: randomRange(8, 16),
        gravity: -20,
      });
    }
  }

  sonarPulse(wx: number, wy: number, radius: number) {
    const count = 40;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r = radius * SCALED_TILE;
      this.spawn({
        x: wx, y: wy,
        vx: Math.cos(angle) * r / 1.5,
        vy: Math.sin(angle) * r / 1.5,
        life: 1500, maxLife: 1500,
        color: 0x00CED1,
        size: 3,
        gravity: 0,
      });
    }
  }

  ambientDust(wx: number, wy: number) {
    if (Math.random() > 0.02) return;
    this.spawn({
      x: wx + randomRange(-200, 200),
      y: wy + randomRange(-200, 200),
      vx: randomRange(-5, 5),
      vy: randomRange(-3, 3),
      life: 3000, maxLife: 3000,
      color: 0x888888,
      size: 1,
      gravity: 0,
    });
  }

  lanternEmbers(wx: number, wy: number) {
    if (Math.random() > 0.05) return;
    this.spawn({
      x: wx + randomRange(-5, 5),
      y: wy - 20,
      vx: randomRange(-8, 8),
      vy: randomRange(-30, -15),
      life: 800, maxLife: 800,
      color: 0xFFB347,
      size: 2,
      gravity: -10,
    });
  }

  crystalGlow(wx: number, wy: number) {
    if (Math.random() > 0.01) return;
    const colors = [0x00CED1, 0x9B30FF];
    this.spawn({
      x: wx + randomRange(-10, 10),
      y: wy,
      vx: randomRange(-3, 3),
      vy: randomRange(-15, -5),
      life: 2000, maxLife: 2000,
      color: colors[Math.floor(Math.random() * 2)],
      size: 2,
      gravity: -5,
    });
  }

  treasureBurst(wx: number, wy: number) {
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomRange(100, 350);
      const colors = [0xFFD700, 0xFFA500, 0xFFFF00, 0xFFC0CB];
      this.spawn({
        x: wx, y: wy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 80,
        life: 800, maxLife: 800,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: randomRange(3, 7),
        gravity: 200,
      });
    }
  }

  guardianAura(wx: number, wy: number) {
    if (Math.random() > 0.1) return;
    const angle = Math.random() * Math.PI * 2;
    const r = 30;
    this.spawn({
      x: wx + Math.cos(angle) * r,
      y: wy + Math.sin(angle) * r,
      vx: -Math.cos(angle) * 20,
      vy: -Math.sin(angle) * 20,
      life: 1000, maxLife: 1000,
      color: Math.random() > 0.5 ? 0xFF4444 : 0x9B30FF,
      size: 3,
      gravity: 0,
    });
  }

  collapseDust(wx: number, wy: number) {
    for (let i = 0; i < 8; i++) {
      this.spawn({
        x: wx + randomRange(-30, 30),
        y: wy + randomRange(-30, 30),
        vx: randomRange(-20, 20),
        vy: randomRange(-10, 10),
        life: 1500, maxLife: 1500,
        color: 0x666655,
        size: randomRange(6, 14),
        gravity: 10,
      });
    }
  }

  tremorShake() {
    for (let i = 0; i < 8; i++) {
      this.spawn({
        x: randomRange(0, window.innerWidth),
        y: -10,
        vx: randomRange(-10, 10),
        vy: randomRange(40, 100),
        life: 600, maxLife: 600,
        color: 0x666666,
        size: randomRange(2, 5),
        gravity: 200,
      });
    }
  }

  enemyBlip(wx: number, wy: number) {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      this.spawn({
        x: wx, y: wy,
        vx: Math.cos(angle) * 30,
        vy: Math.sin(angle) * 30,
        life: 1500, maxLife: 1500,
        color: 0xFF4444,
        size: 4,
        gravity: 0,
      });
    }
  }

  update(dt: number) {
    const dtSec = dt / 1000;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        this.releaseGraphic(p.graphic);
        this.particles.splice(i, 1);
        continue;
      }

      p.vy += p.gravity * dtSec;
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      p.alpha = p.life / p.maxLife;

      p.graphic.x = p.x;
      p.graphic.y = p.y;
      p.graphic.alpha = p.alpha;
    }
  }

  private varyColor(base: number): number {
    const r = ((base >> 16) & 255) + Math.floor(randomRange(-20, 20));
    const g = ((base >> 8) & 255) + Math.floor(randomRange(-20, 20));
    const b = (base & 255) + Math.floor(randomRange(-20, 20));
    return (Math.max(0, Math.min(255, r)) << 16) |
           (Math.max(0, Math.min(255, g)) << 8) |
           Math.max(0, Math.min(255, b));
  }
}
