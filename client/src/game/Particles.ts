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
  rotation: number;
  rotationSpeed: number;
  shrink: boolean;
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
    g.rotation = 0;
    this.pool.push(g);
  }

  private spawn(config: Omit<Particle, 'graphic' | 'alpha' | 'rotation' | 'rotationSpeed' | 'shrink'> & {
    rotation?: number; rotationSpeed?: number; shrink?: boolean;
    shape?: 'square' | 'circle' | 'diamond';
  }): Particle {
    const g = this.getGraphic();
    g.clear();
    const shape = config.shape || 'square';
    if (shape === 'circle') {
      g.circle(0, 0, config.size / 2);
    } else if (shape === 'diamond') {
      const hs = config.size / 2;
      g.moveTo(0, -hs);
      g.lineTo(hs, 0);
      g.lineTo(0, hs);
      g.lineTo(-hs, 0);
      g.closePath();
    } else {
      g.rect(-config.size / 2, -config.size / 2, config.size, config.size);
    }
    g.fill(config.color);
    g.x = config.x;
    g.y = config.y;
    const p: Particle = {
      ...config,
      alpha: 1,
      graphic: g,
      rotation: config.rotation ?? 0,
      rotationSpeed: config.rotationSpeed ?? 0,
      shrink: config.shrink ?? false,
    };
    this.particles.push(p);
    return p;
  }

  digDust(wx: number, wy: number, tileType: TileType) {
    const color = TILE_COLORS[tileType] || 0x4A4A4A;
    const count = 5 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
      this.spawn({
        x: wx + randomRange(-8, 8),
        y: wy + randomRange(-8, 8),
        vx: randomRange(-100, 100),
        vy: randomRange(-130, -30),
        life: 350, maxLife: 350,
        color: this.varyColor(color),
        size: randomRange(2, 6),
        gravity: 250,
        shape: Math.random() > 0.5 ? 'square' : 'circle',
        rotationSpeed: randomRange(-5, 5),
      });
    }

    for (let i = 0; i < 3; i++) {
      this.spawn({
        x: wx + randomRange(-4, 4),
        y: wy,
        vx: randomRange(-20, 20),
        vy: randomRange(-60, -20),
        life: 500, maxLife: 500,
        color: 0x888877,
        size: randomRange(6, 12),
        gravity: -10,
        shape: 'circle',
        shrink: true,
      });
    }
  }

  tileBreak(wx: number, wy: number, tileType: TileType) {
    const color = TILE_COLORS[tileType] || 0x4A4A4A;
    const count = 20 + Math.floor(Math.random() * 15);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomRange(100, 320);
      this.spawn({
        x: wx + randomRange(-10, 10),
        y: wy + randomRange(-10, 10),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        life: 600, maxLife: 600,
        color: this.varyColor(color),
        size: randomRange(3, 9),
        gravity: 350,
        shape: Math.random() > 0.6 ? 'square' : 'diamond',
        rotationSpeed: randomRange(-8, 8),
        shrink: true,
      });
    }

    for (let i = 0; i < 8; i++) {
      this.spawn({
        x: wx + randomRange(-15, 15),
        y: wy + randomRange(-15, 15),
        vx: randomRange(-30, 30),
        vy: randomRange(-50, -10),
        life: 600, maxLife: 600,
        color: 0x888877,
        size: randomRange(10, 20),
        gravity: -15,
        shape: 'circle',
        shrink: true,
      });
    }

    this.spawn({
      x: wx, y: wy,
      vx: 0, vy: 0,
      life: 200, maxLife: 200,
      color: 0xFFFFFF,
      size: SCALED_TILE * 0.8,
      gravity: 0,
      shape: 'circle',
      shrink: true,
    });
  }

  oreCollect(wx: number, wy: number, oreType: OreType) {
    const color = ORE_COLORS[oreType];
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      this.spawn({
        x: wx + randomRange(-5, 5),
        y: wy + randomRange(-5, 5),
        vx: Math.cos(angle) * randomRange(20, 60),
        vy: -randomRange(80, 180),
        life: 500, maxLife: 500,
        color,
        size: randomRange(2, 5),
        gravity: -60,
        shape: 'diamond',
        rotationSpeed: randomRange(-3, 3),
      });
    }

    this.spawn({
      x: wx, y: wy,
      vx: 0, vy: 0,
      life: 300, maxLife: 300,
      color,
      size: SCALED_TILE * 0.6,
      gravity: 0,
      shape: 'circle',
      shrink: true,
    });
  }

  dynamiteExplosion(wx: number, wy: number) {
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomRange(120, 450);
      const colors = [0xFF4500, 0xFF8C00, 0xFFD700, 0xFF6347, 0xFFAA00];
      this.spawn({
        x: wx + randomRange(-12, 12),
        y: wy + randomRange(-12, 12),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 700, maxLife: 700,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: randomRange(4, 12),
        gravity: 180,
        shape: Math.random() > 0.5 ? 'circle' : 'diamond',
        rotationSpeed: randomRange(-10, 10),
        shrink: true,
      });
    }
    for (let i = 0; i < 20; i++) {
      this.spawn({
        x: wx + randomRange(-25, 25),
        y: wy + randomRange(-25, 25),
        vx: randomRange(-40, 40),
        vy: randomRange(-50, -10),
        life: 1200, maxLife: 1200,
        color: this.varyColor(0x555555),
        size: randomRange(10, 22),
        gravity: -25,
        shape: 'circle',
        shrink: true,
      });
    }

    this.spawn({
      x: wx, y: wy,
      vx: 0, vy: 0,
      life: 300, maxLife: 300,
      color: 0xFFFFFF,
      size: SCALED_TILE * 2,
      gravity: 0,
      shape: 'circle',
      shrink: true,
    });
  }

  sonarPulse(wx: number, wy: number, radius: number) {
    const count = 48;
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
        shape: 'circle',
      });
    }
  }

  ambientDust(wx: number, wy: number) {
    if (Math.random() > 0.03) return;
    this.spawn({
      x: wx + randomRange(-250, 250),
      y: wy + randomRange(-250, 250),
      vx: randomRange(-8, 8),
      vy: randomRange(-5, 5),
      life: 4000, maxLife: 4000,
      color: 0x888888,
      size: 1,
      gravity: 0,
      shape: 'circle',
    });
  }

  lanternEmbers(wx: number, wy: number) {
    if (Math.random() > 0.07) return;
    this.spawn({
      x: wx + randomRange(-8, 8),
      y: wy - 24,
      vx: randomRange(-12, 12),
      vy: randomRange(-40, -15),
      life: 1000, maxLife: 1000,
      color: Math.random() > 0.5 ? 0xFFB347 : 0xFF8C42,
      size: randomRange(1, 3),
      gravity: -15,
      shape: 'circle',
    });
  }

  crystalGlow(wx: number, wy: number) {
    if (Math.random() > 0.012) return;
    const colors = [0x00CED1, 0x9B30FF, 0x00E5E5];
    this.spawn({
      x: wx + randomRange(-12, 12),
      y: wy + randomRange(-12, 12),
      vx: randomRange(-5, 5),
      vy: randomRange(-20, -5),
      life: 2500, maxLife: 2500,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: randomRange(1, 3),
      gravity: -8,
      shape: 'diamond',
      rotationSpeed: randomRange(-2, 2),
    });
  }

  treasureBurst(wx: number, wy: number) {
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomRange(120, 400);
      const colors = [0xFFD700, 0xFFA500, 0xFFFF00, 0xFFC0CB, 0xFFE4B5];
      this.spawn({
        x: wx, y: wy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 100,
        life: 900, maxLife: 900,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: randomRange(3, 8),
        gravity: 250,
        shape: 'diamond',
        rotationSpeed: randomRange(-8, 8),
      });
    }
  }

  guardianAura(wx: number, wy: number) {
    if (Math.random() > 0.12) return;
    const angle = Math.random() * Math.PI * 2;
    const r = 35;
    this.spawn({
      x: wx + Math.cos(angle) * r,
      y: wy + Math.sin(angle) * r,
      vx: -Math.cos(angle) * 25,
      vy: -Math.sin(angle) * 25,
      life: 1200, maxLife: 1200,
      color: Math.random() > 0.5 ? 0xFF4444 : 0x9B30FF,
      size: randomRange(2, 4),
      gravity: 0,
      shape: 'circle',
    });
  }

  collapseDust(wx: number, wy: number) {
    for (let i = 0; i < 10; i++) {
      this.spawn({
        x: wx + randomRange(-35, 35),
        y: wy + randomRange(-35, 35),
        vx: randomRange(-25, 25),
        vy: randomRange(-15, 15),
        life: 1800, maxLife: 1800,
        color: this.varyColor(0x666655),
        size: randomRange(8, 18),
        gravity: 12,
        shape: 'circle',
        shrink: true,
      });
    }
  }

  tremorShake() {
    for (let i = 0; i < 12; i++) {
      this.spawn({
        x: randomRange(0, window.innerWidth),
        y: -10,
        vx: randomRange(-15, 15),
        vy: randomRange(50, 120),
        life: 700, maxLife: 700,
        color: this.varyColor(0x666666),
        size: randomRange(2, 6),
        gravity: 250,
        shape: 'square',
        rotationSpeed: randomRange(-3, 3),
      });
    }
  }

  enemyBlip(wx: number, wy: number) {
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      this.spawn({
        x: wx, y: wy,
        vx: Math.cos(angle) * 40,
        vy: Math.sin(angle) * 40,
        life: 1800, maxLife: 1800,
        color: 0xFF4444,
        size: 4,
        gravity: 0,
        shape: 'diamond',
      });
    }

    this.spawn({
      x: wx, y: wy,
      vx: 0, vy: 0,
      life: 400, maxLife: 400,
      color: 0xFF4444,
      size: 30,
      gravity: 0,
      shape: 'circle',
      shrink: true,
    });
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

      const lifeRatio = p.life / p.maxLife;
      p.alpha = lifeRatio;

      if (p.rotationSpeed !== 0) {
        p.rotation += p.rotationSpeed * dtSec;
        p.graphic.rotation = p.rotation;
      }

      p.graphic.x = p.x;
      p.graphic.y = p.y;
      p.graphic.alpha = p.alpha;

      if (p.shrink) {
        const scale = lifeRatio;
        p.graphic.scale.set(scale);
      }
    }
  }

  private varyColor(base: number): number {
    const r = ((base >> 16) & 255) + Math.floor(randomRange(-25, 25));
    const g = ((base >> 8) & 255) + Math.floor(randomRange(-25, 25));
    const b = (base & 255) + Math.floor(randomRange(-25, 25));
    return (Math.max(0, Math.min(255, r)) << 16) |
           (Math.max(0, Math.min(255, g)) << 8) |
           Math.max(0, Math.min(255, b));
  }
}
