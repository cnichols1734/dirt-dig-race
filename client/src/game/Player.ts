import { Container, Graphics } from 'pixi.js';
import { PlayerState, Resources, UpgradeState } from '@dig/shared';
import { SCALED_TILE } from '../utils/constants';
import { lerp } from '../utils/helpers';

export class Player {
  container: Container;
  private body: Container;
  private head: Graphics;
  private helmet: Graphics;
  private headlamp: Graphics;
  private torso: Graphics;
  private leftArm: Graphics;
  private rightArmPivot: Container;
  private rightArm: Graphics;
  private pickaxe: Graphics;
  private leftLeg: Graphics;
  private rightLeg: Graphics;
  private shadow: Graphics;
  private headlampBeam: Graphics;

  x: number;
  y: number;
  resources: Resources;
  upgrades: UpgradeState;
  tilesDug: number = 0;
  encounterHp: number = 100;
  sonarCooldownEnd: number = 0;

  private headlampPhase: number = 0;
  private breathPhase: number = 0;
  private walkPhase: number = 0;
  private isWalking: boolean = false;
  private walkTimer: number = 0;

  private digAnimPhase: number = -1; // -1 = not digging
  private digAnimSpeed: number = 12;
  private facingRight: boolean = true;
  private prevX: number = 0;
  private prevY: number = 0;

  private targetWorldX: number = 0;
  private targetWorldY: number = 0;
  private worldX: number = 0;
  private worldY: number = 0;
  private moveSmoothing: boolean = false;

  private squashTimer: number = 0;
  private squashIntensity: number = 0;

  constructor() {
    this.container = new Container();
    this.x = 2;
    this.y = 20;
    this.resources = { copper: 0, iron: 0, gold: 0, crystal: 0, emberStone: 0 };
    this.upgrades = {
      pickaxeLevel: 1, lanternLevel: 1,
      sonarUnlocked: false, dynamiteUnlocked: false, dynamiteCharges: 0,
      steelBootsLevel: 0, tremorSenseLevel: 1, momentumLevel: 0,
    };

    this.shadow = new Graphics();
    this.body = new Container();
    this.leftLeg = new Graphics();
    this.rightLeg = new Graphics();
    this.torso = new Graphics();
    this.leftArm = new Graphics();
    this.rightArmPivot = new Container();
    this.rightArm = new Graphics();
    this.pickaxe = new Graphics();
    this.head = new Graphics();
    this.helmet = new Graphics();
    this.headlamp = new Graphics();
    this.headlampBeam = new Graphics();

    this.buildCharacter();
    this.container.addChild(this.shadow);
    this.container.addChild(this.body);

    this.worldX = this.x * SCALED_TILE;
    this.worldY = this.y * SCALED_TILE;
    this.targetWorldX = this.worldX;
    this.targetWorldY = this.worldY;
  }

  private buildCharacter() {
    const cx = SCALED_TILE / 2;
    const cy = SCALED_TILE / 2;

    this.shadow.clear();
    this.shadow.ellipse(cx, cy + 22, 14, 4);
    this.shadow.fill({ color: 0x000000, alpha: 0.4 });

    this.body.x = cx;
    this.body.y = cy;

    this.drawLegs();
    this.body.addChild(this.leftLeg);
    this.body.addChild(this.rightLeg);

    this.drawTorso();
    this.body.addChild(this.torso);

    this.drawLeftArm();
    this.body.addChild(this.leftArm);

    this.rightArmPivot.x = 8;
    this.rightArmPivot.y = -10;
    this.drawRightArm();
    this.drawPickaxe();
    this.rightArmPivot.addChild(this.rightArm);
    this.rightArmPivot.addChild(this.pickaxe);
    this.body.addChild(this.rightArmPivot);

    this.drawHead();
    this.body.addChild(this.head);

    this.drawHelmet();
    this.body.addChild(this.helmet);

    this.drawHeadlamp();
    this.body.addChild(this.headlamp);

    this.drawHeadlampBeam();
    this.body.addChild(this.headlampBeam);
  }

  private drawLegs() {
    this.leftLeg.clear();
    this.leftLeg.roundRect(-7, 6, 6, 16, 2);
    this.leftLeg.fill(0x3B2820);
    this.leftLeg.roundRect(-8, 18, 8, 5, 1);
    this.leftLeg.fill(0x2A1A12);

    this.rightLeg.clear();
    this.rightLeg.roundRect(1, 6, 6, 16, 2);
    this.rightLeg.fill(0x3B2820);
    this.rightLeg.roundRect(0, 18, 8, 5, 1);
    this.rightLeg.fill(0x2A1A12);
  }

  private drawTorso() {
    this.torso.clear();
    this.torso.roundRect(-10, -14, 20, 22, 3);
    this.torso.fill(0x6B4226);
    this.torso.roundRect(-8, -12, 16, 18, 2);
    this.torso.fill(0x7A5230);

    this.torso.rect(-2, -8, 4, 10);
    this.torso.fill({ color: 0xFFB347, alpha: 0.15 });

    this.torso.rect(-6, -3, 3, 3);
    this.torso.fill({ color: 0xD2691E, alpha: 0.6 });
    this.torso.rect(3, -3, 3, 3);
    this.torso.fill({ color: 0xD2691E, alpha: 0.6 });
  }

  private drawLeftArm() {
    this.leftArm.clear();
    this.leftArm.roundRect(-14, -10, 6, 16, 2);
    this.leftArm.fill(0x6B4226);
    this.leftArm.roundRect(-13, 4, 5, 4, 1);
    this.leftArm.fill(0xDEB887);
  }

  private drawRightArm() {
    this.rightArm.clear();
    this.rightArm.roundRect(-3, -2, 6, 16, 2);
    this.rightArm.fill(0x6B4226);
    this.rightArm.roundRect(-2, 12, 5, 4, 1);
    this.rightArm.fill(0xDEB887);
  }

  private drawPickaxe() {
    this.pickaxe.clear();
    this.pickaxe.rect(0, 10, 3, 22);
    this.pickaxe.fill(0x8B6914);

    this.pickaxe.moveTo(-8, 10);
    this.pickaxe.lineTo(10, 10);
    this.pickaxe.lineTo(12, 8);
    this.pickaxe.lineTo(-6, 8);
    this.pickaxe.closePath();
    this.pickaxe.fill(0x888888);

    this.pickaxe.moveTo(10, 10);
    this.pickaxe.lineTo(16, 6);
    this.pickaxe.lineTo(14, 5);
    this.pickaxe.lineTo(10, 8);
    this.pickaxe.closePath();
    this.pickaxe.fill(0xA0A0A0);

    this.pickaxe.moveTo(-6, 8);
    this.pickaxe.lineTo(-10, 4);
    this.pickaxe.lineTo(-8, 3);
    this.pickaxe.lineTo(-6, 6);
    this.pickaxe.closePath();
    this.pickaxe.fill(0xA0A0A0);
  }

  private drawHead() {
    this.head.clear();
    this.head.circle(0, -20, 9);
    this.head.fill(0xDEB887);

    this.head.ellipse(-4, -20, 3, 4);
    this.head.fill(0xFFFFFF);
    this.head.ellipse(4, -20, 3, 4);
    this.head.fill(0xFFFFFF);

    this.head.circle(-3, -20, 1.5);
    this.head.fill(0x1A1A2E);
    this.head.circle(5, -20, 1.5);
    this.head.fill(0x1A1A2E);

    this.head.circle(-2.5, -20.5, 0.6);
    this.head.fill(0xFFFFFF);
    this.head.circle(5.5, -20.5, 0.6);
    this.head.fill(0xFFFFFF);

    this.head.arc(0, -17, 3, 0.2, Math.PI - 0.2);
    this.head.stroke({ color: 0x8B6347, width: 1 });
  }

  private drawHelmet() {
    this.helmet.clear();
    this.helmet.roundRect(-12, -32, 24, 14, 5);
    this.helmet.fill(0xDAA520);
    this.helmet.roundRect(-10, -30, 20, 10, 3);
    this.helmet.fill(0xE8B830);

    this.helmet.rect(-12, -20, 24, 3);
    this.helmet.fill(0xC49218);

    this.helmet.roundRect(-11, -31, 22, 4, 2);
    this.helmet.fill({ color: 0xFFFFFF, alpha: 0.15 });
  }

  private drawHeadlamp() {
    this.headlamp.clear();
    this.headlamp.circle(0, -26, 4);
    this.headlamp.fill(0xFFF8DC);
    this.headlamp.circle(0, -26, 3);
    this.headlamp.fill(0xFFFFEE);
    this.headlamp.circle(0, -26, 2);
    this.headlamp.fill(0xFFFFFF);
  }

  private drawHeadlampBeam() {
    this.headlampBeam.clear();
    this.headlampBeam.moveTo(-3, -28);
    this.headlampBeam.lineTo(3, -28);
    this.headlampBeam.lineTo(12, -50);
    this.headlampBeam.lineTo(-12, -50);
    this.headlampBeam.closePath();
    this.headlampBeam.fill({ color: 0xFFFFDD, alpha: 0.06 });
  }

  triggerDig(targetTileX: number, targetTileY: number) {
    this.digAnimPhase = 0;
    const dx = targetTileX - this.x;
    if (dx !== 0) {
      this.facingRight = dx > 0;
    }
    this.updateFacing();
  }

  triggerImpact() {
    this.squashTimer = 150;
    this.squashIntensity = 0.15;
  }

  private updateFacing() {
    this.body.scale.x = this.facingRight ? 1 : -1;
  }

  setPosition(tx: number, ty: number) {
    if (tx !== this.x || ty !== this.y) {
      this.prevX = this.x;
      this.prevY = this.y;
      const dx = tx - this.x;
      if (dx !== 0) {
        this.facingRight = dx > 0;
        this.updateFacing();
      }
      this.isWalking = true;
      this.walkTimer = 300;
      this.moveSmoothing = true;
    }
    this.x = tx;
    this.y = ty;
    this.targetWorldX = tx * SCALED_TILE;
    this.targetWorldY = ty * SCALED_TILE;
    if (!this.moveSmoothing) {
      this.worldX = this.targetWorldX;
      this.worldY = this.targetWorldY;
      this.container.x = this.worldX;
      this.container.y = this.worldY;
    }
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
    const dtSec = dt / 1000;
    this.headlampPhase += dt * 0.004;
    this.breathPhase += dt * 0.003;

    if (this.moveSmoothing) {
      this.worldX = lerp(this.worldX, this.targetWorldX, 0.18);
      this.worldY = lerp(this.worldY, this.targetWorldY, 0.18);
      if (Math.abs(this.worldX - this.targetWorldX) < 0.5 && Math.abs(this.worldY - this.targetWorldY) < 0.5) {
        this.worldX = this.targetWorldX;
        this.worldY = this.targetWorldY;
        this.moveSmoothing = false;
      }
      this.container.x = this.worldX;
      this.container.y = this.worldY;
    }

    if (this.walkTimer > 0) {
      this.walkTimer -= dt;
      this.walkPhase += dt * 0.015;
      const legSwing = Math.sin(this.walkPhase) * 8;
      this.leftLeg.y = legSwing;
      this.rightLeg.y = -legSwing;
      this.body.y = SCALED_TILE / 2 + Math.abs(Math.sin(this.walkPhase)) * -3;
    } else {
      this.isWalking = false;
      this.leftLeg.y = lerp(this.leftLeg.y, 0, 0.15);
      this.rightLeg.y = lerp(this.rightLeg.y, 0, 0.15);
      this.body.y = SCALED_TILE / 2;
    }

    const breathOffset = Math.sin(this.breathPhase) * 1.2;
    this.torso.y = breathOffset * 0.3;
    this.head.y = breathOffset * 0.5;
    this.helmet.y = breathOffset * 0.5;
    this.headlamp.y = breathOffset * 0.5;
    this.headlampBeam.y = breathOffset * 0.5;
    this.leftArm.y = breathOffset * 0.2;

    if (this.digAnimPhase >= 0) {
      this.digAnimPhase += dt * this.digAnimSpeed / 1000;
      if (this.digAnimPhase < 0.3) {
        const t = this.digAnimPhase / 0.3;
        this.rightArmPivot.rotation = -t * 1.8;
      } else if (this.digAnimPhase < 0.5) {
        const t = (this.digAnimPhase - 0.3) / 0.2;
        this.rightArmPivot.rotation = -1.8 + t * 2.4;
      } else if (this.digAnimPhase < 0.8) {
        const t = (this.digAnimPhase - 0.5) / 0.3;
        this.rightArmPivot.rotation = 0.6 * (1 - t);
      } else {
        this.rightArmPivot.rotation = 0;
        this.digAnimPhase = -1;
      }
    } else {
      const idleSwing = Math.sin(this.breathPhase * 0.7) * 0.05;
      this.rightArmPivot.rotation = idleSwing;
    }

    if (this.squashTimer > 0) {
      this.squashTimer -= dt;
      const t = this.squashTimer / 150;
      const squash = 1 + this.squashIntensity * t;
      const stretch = 1 - this.squashIntensity * 0.5 * t;
      this.body.scale.y = stretch;
      this.body.scale.x = (this.facingRight ? 1 : -1) * squash;
    } else {
      this.body.scale.y = 1;
      this.body.scale.x = this.facingRight ? 1 : -1;
    }

    const lampFlicker = 0.7 + Math.sin(this.headlampPhase) * 0.15 + Math.sin(this.headlampPhase * 3.7) * 0.1;
    this.headlamp.alpha = lampFlicker;
    this.headlampBeam.alpha = lampFlicker * 0.5;

    this.shadow.alpha = 0.3 + Math.sin(this.headlampPhase * 0.5) * 0.05;
  }
}
