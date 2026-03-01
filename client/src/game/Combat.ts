import { Container, Graphics, Text } from 'pixi.js';
import { SCALED_TILE } from '../utils/constants';

export class CombatSystem {
  container: Container;
  private opponentMarker: Graphics;
  private opponentHpBar: Graphics;
  private knockoutOverlay: Graphics;
  private knockoutText: Text;
  private respawnTimer: number = 0;
  private opponentVisible = false;
  private opX = 0;
  private opY = 0;
  private opHp = 50;
  private opMaxHp = 50;
  private pulsePhase = 0;

  constructor() {
    this.container = new Container();

    this.opponentMarker = new Graphics();
    this.opponentMarker.visible = false;
    this.container.addChild(this.opponentMarker);

    this.opponentHpBar = new Graphics();
    this.opponentHpBar.visible = false;
    this.container.addChild(this.opponentHpBar);

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

  showOpponent(wx: number, wy: number, hp: number, maxHp: number) {
    this.opponentVisible = true;
    this.opX = wx;
    this.opY = wy;
    this.opHp = hp;
    this.opMaxHp = maxHp;
    this.opponentMarker.visible = true;
    this.opponentHpBar.visible = true;
  }

  hideOpponent() {
    this.opponentVisible = false;
    this.opponentMarker.visible = false;
    this.opponentHpBar.visible = false;
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

    if (this.opponentVisible) {
      this.opponentMarker.clear();
      const pulse = 0.6 + Math.sin(this.pulsePhase * 2) * 0.4;

      this.opponentMarker.circle(this.opX, this.opY - SCALED_TILE * 0.8, 6);
      this.opponentMarker.fill({ color: 0xFF4444, alpha: pulse * 0.8 });
      this.opponentMarker.circle(this.opX, this.opY - SCALED_TILE * 0.8, 12);
      this.opponentMarker.fill({ color: 0xFF4444, alpha: pulse * 0.2 });

      this.opponentHpBar.clear();
      if (this.opMaxHp > 0) {
        const w = SCALED_TILE * 1.5;
        const h = 6;
        const bx = this.opX - w / 2;
        const by = this.opY - SCALED_TILE * 1.2;
        const ratio = Math.max(0, this.opHp / this.opMaxHp);

        this.opponentHpBar.roundRect(bx, by, w, h, 3);
        this.opponentHpBar.fill({ color: 0x111122, alpha: 0.8 });
        if (ratio > 0) {
          this.opponentHpBar.roundRect(bx + 1, by + 1, (w - 2) * ratio, h - 2, 2);
          this.opponentHpBar.fill(0xFF4444);
        }
      }
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
