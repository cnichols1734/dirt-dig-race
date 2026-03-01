import { Container, Graphics, Text } from 'pixi.js';
import { SCALED_TILE } from '../utils/constants';
import { lerp } from '../utils/helpers';

export class CombatSystem {
  container: Container;
  private opponentContainer: Container;
  private opponentBody: Container;
  private opponentHpBar: Graphics;
  private opponentNameTag: Graphics;
  private knockoutOverlay: Graphics;
  private knockoutText: Text;
  private respawnTimer: number = 0;
  private opponentVisible = false;
  private opX = 0;
  private opY = 0;
  private targetOpX = 0;
  private targetOpY = 0;
  private opHp = 50;
  private opMaxHp = 50;
  private pulsePhase = 0;
  private breathPhase = 0;
  private walkPhase = 0;
  private prevOpX = 0;
  private prevOpY = 0;
  private facingRight = false;
  private isMoving = false;
  private moveTimer = 0;

  constructor() {
    this.container = new Container();

    this.opponentContainer = new Container();
    this.opponentContainer.visible = false;
    this.container.addChild(this.opponentContainer);

    this.opponentBody = new Container();
    this.buildOpponentCharacter();
    this.opponentContainer.addChild(this.opponentBody);

    this.opponentHpBar = new Graphics();
    this.opponentContainer.addChild(this.opponentHpBar);

    this.opponentNameTag = new Graphics();
    this.opponentContainer.addChild(this.opponentNameTag);

    this.knockoutOverlay = new Graphics();
    this.knockoutOverlay.visible = false;
    this.container.addChild(this.knockoutOverlay);

    this.knockoutText = new Text({
      text: '',
      style: {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: 16,
        fill: 0xFF4444,
        stroke: { color: 0x000000, width: 4 },
      },
    });
    this.knockoutText.anchor.set(0.5);
    this.knockoutText.visible = false;
    this.container.addChild(this.knockoutText);
  }

  private buildOpponentCharacter() {
    const shadow = new Graphics();
    shadow.ellipse(0, 22, 14, 4);
    shadow.fill({ color: 0x000000, alpha: 0.4 });
    this.opponentBody.addChild(shadow);

    const leftLeg = new Graphics();
    leftLeg.roundRect(-7, 6, 6, 16, 2);
    leftLeg.fill(0x2B1818);
    leftLeg.roundRect(-8, 18, 8, 5, 1);
    leftLeg.fill(0x1A0E0E);
    leftLeg.name = 'leftLeg';
    this.opponentBody.addChild(leftLeg);

    const rightLeg = new Graphics();
    rightLeg.roundRect(1, 6, 6, 16, 2);
    rightLeg.fill(0x2B1818);
    rightLeg.roundRect(0, 18, 8, 5, 1);
    rightLeg.fill(0x1A0E0E);
    rightLeg.name = 'rightLeg';
    this.opponentBody.addChild(rightLeg);

    const torso = new Graphics();
    torso.roundRect(-10, -14, 20, 22, 3);
    torso.fill(0x8B2020);
    torso.roundRect(-8, -12, 16, 18, 2);
    torso.fill(0xA03030);
    torso.rect(-2, -8, 4, 10);
    torso.fill({ color: 0xFF6666, alpha: 0.15 });
    torso.rect(-6, -3, 3, 3);
    torso.fill({ color: 0xCC3333, alpha: 0.6 });
    torso.rect(3, -3, 3, 3);
    torso.fill({ color: 0xCC3333, alpha: 0.6 });
    this.opponentBody.addChild(torso);

    const leftArm = new Graphics();
    leftArm.roundRect(-14, -10, 6, 16, 2);
    leftArm.fill(0x8B2020);
    leftArm.roundRect(-13, 4, 5, 4, 1);
    leftArm.fill(0xDEB887);
    this.opponentBody.addChild(leftArm);

    const rightArmPivot = new Container();
    rightArmPivot.x = 8;
    rightArmPivot.y = -10;
    rightArmPivot.name = 'rightArmPivot';

    const rightArm = new Graphics();
    rightArm.roundRect(-3, -2, 6, 16, 2);
    rightArm.fill(0x8B2020);
    rightArm.roundRect(-2, 12, 5, 4, 1);
    rightArm.fill(0xDEB887);
    rightArmPivot.addChild(rightArm);

    const pickaxe = new Graphics();
    pickaxe.rect(0, 10, 3, 22);
    pickaxe.fill(0x5A3A0A);
    pickaxe.moveTo(-8, 10);
    pickaxe.lineTo(10, 10);
    pickaxe.lineTo(12, 8);
    pickaxe.lineTo(-6, 8);
    pickaxe.closePath();
    pickaxe.fill(0x666666);
    pickaxe.moveTo(10, 10);
    pickaxe.lineTo(16, 6);
    pickaxe.lineTo(14, 5);
    pickaxe.lineTo(10, 8);
    pickaxe.closePath();
    pickaxe.fill(0x888888);
    rightArmPivot.addChild(pickaxe);

    this.opponentBody.addChild(rightArmPivot);

    const head = new Graphics();
    head.circle(0, -20, 9);
    head.fill(0xDEB887);
    head.ellipse(-4, -20, 3, 4);
    head.fill(0xFFFFFF);
    head.ellipse(4, -20, 3, 4);
    head.fill(0xFFFFFF);
    head.circle(-3, -20, 1.5);
    head.fill(0x1A1A2E);
    head.circle(5, -20, 1.5);
    head.fill(0x1A1A2E);
    head.circle(-2.5, -20.5, 0.6);
    head.fill(0xFFFFFF);
    head.circle(5.5, -20.5, 0.6);
    head.fill(0xFFFFFF);
    head.arc(0, -17, 3, 0.2, Math.PI - 0.2);
    head.stroke({ color: 0x8B6347, width: 1 });
    this.opponentBody.addChild(head);

    const helmet = new Graphics();
    helmet.roundRect(-12, -32, 24, 14, 5);
    helmet.fill(0xAA2222);
    helmet.roundRect(-10, -30, 20, 10, 3);
    helmet.fill(0xCC3333);
    helmet.rect(-12, -20, 24, 3);
    helmet.fill(0x991111);
    helmet.roundRect(-11, -31, 22, 4, 2);
    helmet.fill({ color: 0xFFFFFF, alpha: 0.15 });
    this.opponentBody.addChild(helmet);

    const headlamp = new Graphics();
    headlamp.circle(0, -26, 4);
    headlamp.fill(0xFFDDDD);
    headlamp.circle(0, -26, 3);
    headlamp.fill(0xFFEEEE);
    headlamp.circle(0, -26, 2);
    headlamp.fill(0xFFFFFF);
    this.opponentBody.addChild(headlamp);
  }

  showOpponent(wx: number, wy: number, hp: number, maxHp: number) {
    if (!this.opponentVisible) {
      this.opX = wx;
      this.opY = wy;
    }
    this.prevOpX = this.targetOpX;
    this.prevOpY = this.targetOpY;
    this.targetOpX = wx;
    this.targetOpY = wy;

    if (this.prevOpX !== wx || this.prevOpY !== wy) {
      this.isMoving = true;
      this.moveTimer = 400;
      if (wx !== this.prevOpX) {
        this.facingRight = wx > this.prevOpX;
      }
    }

    this.opHp = hp;
    this.opMaxHp = maxHp;
    this.opponentVisible = true;
    this.opponentContainer.visible = true;
  }

  hideOpponent() {
    this.opponentVisible = false;
    this.opponentContainer.visible = false;
  }

  showKnockout(respawnMs: number) {
    this.respawnTimer = respawnMs;
    this.knockoutOverlay.visible = true;
    this.knockoutText.visible = true;
  }

  clearKnockout() {
    this.knockoutOverlay.visible = false;
    this.knockoutText.visible = false;
    this.respawnTimer = 0;
  }

  update(dt: number) {
    this.pulsePhase += dt * 0.005;
    this.breathPhase += dt * 0.003;

    if (this.opponentVisible) {
      this.opX = lerp(this.opX, this.targetOpX, 0.15);
      this.opY = lerp(this.opY, this.targetOpY, 0.15);

      this.opponentContainer.x = this.opX;
      this.opponentContainer.y = this.opY;

      this.opponentBody.scale.x = this.facingRight ? 1 : -1;

      const breathOffset = Math.sin(this.breathPhase) * 1.2;
      this.opponentBody.y = breathOffset * 0.3;

      if (this.moveTimer > 0) {
        this.moveTimer -= dt;
        this.walkPhase += dt * 0.015;
        const leftLeg = this.opponentBody.getChildByName('leftLeg');
        const rightLeg = this.opponentBody.getChildByName('rightLeg');
        if (leftLeg && rightLeg) {
          const legSwing = Math.sin(this.walkPhase) * 8;
          leftLeg.y = legSwing;
          rightLeg.y = -legSwing;
        }
      } else {
        this.isMoving = false;
        const leftLeg = this.opponentBody.getChildByName('leftLeg');
        const rightLeg = this.opponentBody.getChildByName('rightLeg');
        if (leftLeg) leftLeg.y = lerp(leftLeg.y, 0, 0.15);
        if (rightLeg) rightLeg.y = lerp(rightLeg.y, 0, 0.15);
      }

      const armPivot = this.opponentBody.getChildByName('rightArmPivot');
      if (armPivot) {
        const idleSwing = Math.sin(this.breathPhase * 0.7) * 0.05;
        armPivot.rotation = idleSwing;
      }

      this.opponentHpBar.clear();
      if (this.opMaxHp > 0) {
        const w = SCALED_TILE * 1.5;
        const h = 6;
        const bx = -w / 2;
        const by = -SCALED_TILE * 1.2;
        const ratio = Math.max(0, this.opHp / this.opMaxHp);

        this.opponentHpBar.roundRect(bx, by, w, h, 3);
        this.opponentHpBar.fill({ color: 0x111122, alpha: 0.8 });
        if (ratio > 0) {
          this.opponentHpBar.roundRect(bx + 1, by + 1, (w - 2) * ratio, h - 2, 2);
          this.opponentHpBar.fill(0xFF4444);
        }
      }

      this.opponentNameTag.clear();
      const tagY = -SCALED_TILE * 1.5;
      this.opponentNameTag.roundRect(-20, tagY, 40, 10, 3);
      this.opponentNameTag.fill({ color: 0xFF4444, alpha: 0.3 });
    }

    if (this.respawnTimer > 0) {
      this.respawnTimer -= dt;
      const secs = Math.ceil(Math.max(0, this.respawnTimer) / 1000);
      this.knockoutText.text = `KNOCKED OUT\nRespawn in ${secs}s`;

      this.knockoutOverlay.clear();
      this.knockoutOverlay.rect(0, 0, window.innerWidth, window.innerHeight);
      this.knockoutOverlay.fill({ color: 0x440000, alpha: 0.3 });

      if (this.respawnTimer <= 0) {
        this.clearKnockout();
      }
    }
  }
}
