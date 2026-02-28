import { Container, Graphics } from 'pixi.js';
import { PlayerState, Resources, UpgradeState } from '@dig/shared';
import { SCALED_TILE } from '../utils/constants';

export class Player {
  container: Container;
  sprite: Graphics;
  x: number;
  y: number;
  resources: Resources;
  upgrades: UpgradeState;
  tilesDug: number = 0;
  encounterHp: number = 100;
  sonarCooldownEnd: number = 0;

  private headlampPhase: number = 0;

  constructor() {
    this.container = new Container();
    this.sprite = new Graphics();
    this.x = 2;
    this.y = 20;
    this.resources = { copper: 0, iron: 0, gold: 0, crystal: 0, emberStone: 0 };
    this.upgrades = {
      pickaxeLevel: 1, lanternLevel: 1,
      sonarUnlocked: false, dynamiteUnlocked: false, dynamiteCharges: 0,
      steelBootsLevel: 0, tremorSenseLevel: 1, momentumLevel: 0,
    };
    this.drawSprite();
    this.container.addChild(this.sprite);
  }

  private drawSprite() {
    this.sprite.clear();
    const s = SCALED_TILE;
    const cx = s / 2, cy = s / 2;

    this.sprite.roundRect(cx - 10, cy - 18, 20, 28, 3);
    this.sprite.fill(0x5c4033);

    this.sprite.roundRect(cx - 12, cy - 24, 24, 12, 4);
    this.sprite.fill(0x8B7355);

    this.sprite.circle(cx, cy - 20, 5);
    this.sprite.fill(0xFFB347);

    this.sprite.rect(cx - 3, cy - 8, 2, 6);
    this.sprite.fill(0xffffff);
    this.sprite.rect(cx + 1, cy - 8, 2, 6);
    this.sprite.fill(0xffffff);
    this.sprite.rect(cx - 2, cy - 7, 1, 2);
    this.sprite.fill(0x222222);
    this.sprite.rect(cx + 2, cy - 7, 1, 2);
    this.sprite.fill(0x222222);

    this.sprite.rect(cx - 14, cy - 8, 6, 3);
    this.sprite.fill(0x888888);
    this.sprite.moveTo(cx - 14, cy - 8);
    this.sprite.lineTo(cx - 20, cy - 16);
    this.sprite.lineTo(cx - 16, cy - 16);
    this.sprite.lineTo(cx - 10, cy - 8);
    this.sprite.fill(0x888888);
    this.sprite.rect(cx - 22, cy - 18, 8, 4);
    this.sprite.fill(0xA0A0A0);

    this.sprite.rect(cx - 6, cy + 10, 5, 8);
    this.sprite.fill(0x3a2a1a);
    this.sprite.rect(cx + 1, cy + 10, 5, 8);
    this.sprite.fill(0x3a2a1a);
  }

  setPosition(tx: number, ty: number) {
    this.x = tx;
    this.y = ty;
    this.container.x = tx * SCALED_TILE;
    this.container.y = ty * SCALED_TILE;
  }

  updateState(state: Partial<PlayerState>) {
    if (state.x !== undefined && state.y !== undefined) {
      this.setPosition(state.x, state.y);
    }
    if (state.resources) this.resources = state.resources;
    if (state.upgrades) this.upgrades = state.upgrades;
    if (state.tilesDug !== undefined) this.tilesDug = state.tilesDug;
    if (state.encounterHp !== undefined) this.encounterHp = state.encounterHp;
    if ((state as any).sonarCooldownEnd !== undefined) this.sonarCooldownEnd = (state as any).sonarCooldownEnd;
  }

  update(dt: number) {
    this.headlampPhase += dt * 0.003;
    const flicker = 0.9 + Math.sin(this.headlampPhase) * 0.1;
    this.sprite.alpha = flicker;
  }
}
