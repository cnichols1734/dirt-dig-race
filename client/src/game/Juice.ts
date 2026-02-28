import { Container, Graphics, Text } from 'pixi.js';
import { SCALED_TILE } from '../utils/constants';

interface DamageNumber {
  text: Text;
  vy: number;
  life: number;
}

export class JuiceSystem {
  container: Container;
  private damageNumbers: DamageNumber[] = [];
  private freezeFrames: number = 0;
  private screenFlash: Graphics;
  private flashTimer: number = 0;

  constructor() {
    this.container = new Container();
    this.screenFlash = new Graphics();
    this.screenFlash.alpha = 0;
    this.container.addChild(this.screenFlash);
  }

  spawnDamageNumber(wx: number, wy: number, damage: number, color: number = 0xFFFFFF) {
    const text = new Text({
      text: `-${damage}`,
      style: {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: 14,
        fill: color,
        stroke: { color: 0x000000, width: 3 },
      },
    });
    text.anchor.set(0.5);
    text.x = wx + (Math.random() - 0.5) * 20;
    text.y = wy - 10;
    this.container.addChild(text);

    this.damageNumbers.push({
      text,
      vy: -60,
      life: 600,
    });
  }

  freezeFrame(durationMs: number = 33) {
    this.freezeFrames = durationMs;
  }

  flash(color: number, alpha: number = 0.3, duration: number = 100) {
    this.screenFlash.clear();
    this.screenFlash.rect(0, 0, window.innerWidth, window.innerHeight);
    this.screenFlash.fill({ color, alpha: 1 });
    this.screenFlash.alpha = alpha;
    this.flashTimer = duration;
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
      this.screenFlash.alpha = Math.max(0, this.flashTimer / 100) * 0.3;
    }

    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const dn = this.damageNumbers[i];
      dn.life -= dt;
      dn.text.y += dn.vy * (dt / 1000);
      dn.text.alpha = Math.max(0, dn.life / 600);

      if (dn.life <= 0) {
        this.container.removeChild(dn.text);
        dn.text.destroy();
        this.damageNumbers.splice(i, 1);
      }
    }
  }
}
