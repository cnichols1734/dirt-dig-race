import { Container, Graphics, Text } from 'pixi.js';

interface DamageNumber {
  text: Text;
  vy: number;
  life: number;
  vx: number;
}

export class JuiceSystem {
  container: Container;
  private damageNumbers: DamageNumber[] = [];
  private freezeFrames: number = 0;
  private screenFlash: Graphics;
  private flashTimer: number = 0;
  private flashMaxTimer: number = 100;
  private flashMaxAlpha: number = 0.3;
  private caveInVignette: Graphics;
  private caveInIntensity: number = 0;
  private caveInPhase: number = 0;

  constructor() {
    this.container = new Container();
    this.screenFlash = new Graphics();
    this.screenFlash.alpha = 0;
    this.container.addChild(this.screenFlash);
    this.caveInVignette = new Graphics();
    this.caveInVignette.alpha = 0;
    this.container.addChild(this.caveInVignette);
  }

  setCaveInIntensity(intensity: number) {
    this.caveInIntensity = Math.min(1, Math.max(0, intensity));
  }

  spawnDamageNumber(wx: number, wy: number, damage: number, color: number = 0xFFFFFF) {
    const isBigHit = damage >= 5;
    const text = new Text({
      text: isBigHit ? `-${damage}!` : `-${damage}`,
      style: {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: isBigHit ? 18 : 13,
        fill: isBigHit ? 0xFFD700 : color,
        stroke: { color: 0x000000, width: isBigHit ? 4 : 3 },
      },
    });
    text.anchor.set(0.5);
    text.x = wx + (Math.random() - 0.5) * 24;
    text.y = wy - 10;
    this.container.addChild(text);

    this.damageNumbers.push({
      text,
      vy: -80 - (isBigHit ? 30 : 0),
      vx: (Math.random() - 0.5) * 40,
      life: 700,
    });
  }

  freezeFrame(durationMs: number = 33) {
    this.freezeFrames = durationMs;
  }

  flash(color: number, alpha: number = 0.3, duration: number = 100) {
    this.screenFlash.clear();
    this.screenFlash.rect(0, 0, window.innerWidth * 2, window.innerHeight * 2);
    this.screenFlash.fill({ color, alpha: 1 });
    this.screenFlash.alpha = alpha;
    this.flashTimer = duration;
    this.flashMaxTimer = duration;
    this.flashMaxAlpha = alpha;
  }

  get isFrozen(): boolean {
    return this.freezeFrames > 0;
  }

  update(dt: number) {
    if (this.freezeFrames > 0) {
      this.freezeFrames -= dt;
      return;
    }

    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      this.screenFlash.alpha = Math.max(0, this.flashTimer / this.flashMaxTimer) * this.flashMaxAlpha;
    }

    if (this.caveInIntensity > 0) {
      this.caveInPhase += dt * 0.004;
      const pulse = 0.6 + Math.sin(this.caveInPhase) * 0.4;
      const w = window.innerWidth * 2;
      const h = window.innerHeight * 2;
      const thickness = 40 + this.caveInIntensity * 80;
      this.caveInVignette.clear();
      this.caveInVignette.rect(0, 0, w, thickness);
      this.caveInVignette.fill({ color: 0xFF2200, alpha: 0.5 });
      this.caveInVignette.rect(0, h - thickness, w, thickness);
      this.caveInVignette.fill({ color: 0xFF2200, alpha: 0.5 });
      this.caveInVignette.rect(0, 0, thickness, h);
      this.caveInVignette.fill({ color: 0xFF2200, alpha: 0.5 });
      this.caveInVignette.rect(w - thickness, 0, thickness, h);
      this.caveInVignette.fill({ color: 0xFF2200, alpha: 0.5 });
      this.caveInVignette.alpha = this.caveInIntensity * 0.35 * pulse;
    } else {
      this.caveInVignette.alpha = 0;
    }

    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const dn = this.damageNumbers[i];
      dn.life -= dt;
      const dtSec = dt / 1000;
      dn.text.y += dn.vy * dtSec;
      dn.text.x += dn.vx * dtSec;
      dn.vy *= 0.97;
      dn.vx *= 0.95;

      const lifeRatio = Math.max(0, dn.life / 700);
      dn.text.alpha = lifeRatio;

      if (lifeRatio < 0.3) {
        dn.text.scale.set(lifeRatio / 0.3);
      } else if (lifeRatio > 0.85) {
        const t = (lifeRatio - 0.85) / 0.15;
        dn.text.scale.set(1 + t * 0.3);
      }

      if (dn.life <= 0) {
        this.container.removeChild(dn.text);
        dn.text.destroy();
        this.damageNumbers.splice(i, 1);
      }
    }
  }
}
