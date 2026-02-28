import { Container, Graphics, Text } from 'pixi.js';
import { EncounterType, EncounterState } from '@dig/shared';
import { BALANCE } from '@dig/shared';
import { SCALED_TILE } from '../utils/constants';

export class CombatSystem {
  container: Container;
  private entityGraphic: Graphics;
  private hpBar: Graphics;
  private label: Text;
  encounterType: EncounterType | null = null;
  encounterHp: number = 0;
  encounterMaxHp: number = 0;
  active: boolean = false;
  private pulsePhase: number = 0;

  constructor() {
    this.container = new Container();
    this.container.visible = false;

    this.entityGraphic = new Graphics();
    this.container.addChild(this.entityGraphic);

    this.hpBar = new Graphics();
    this.container.addChild(this.hpBar);

    this.label = new Text({
      text: '',
      style: {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: 12,
        fill: 0x00CED1,
        stroke: { color: 0x000000, width: 3 },
      },
    });
    this.label.anchor.set(0.5, 1);
    this.container.addChild(this.label);
  }

  startEncounter(type: EncounterType, hp: number, maxHp: number) {
    this.encounterType = type;
    this.encounterHp = hp;
    this.encounterMaxHp = maxHp;
    this.active = true;
    this.container.visible = true;

    const cz = BALANCE.CENTER_ZONE;
    const cx = (cz.x + cz.width / 2) * SCALED_TILE;
    const cy = (cz.y + cz.height / 2) * SCALED_TILE;
    this.container.x = cx;
    this.container.y = cy;

    this.drawEntity();

    switch (type) {
      case EncounterType.TREASURE_VAULT:
        this.label.text = 'TREASURE VAULT';
        this.label.style.fill = 0xFFD700;
        break;
      case EncounterType.GUARDIAN:
        this.label.text = 'THE GUARDIAN';
        this.label.style.fill = 0xFF4444;
        break;
      case EncounterType.MIRROR:
        this.label.text = 'MIRROR ARENA';
        this.label.style.fill = 0x9B30FF;
        break;
      case EncounterType.PORTAL:
        this.label.text = 'PORTAL';
        this.label.style.fill = 0x6B3FA0;
        break;
      case EncounterType.COLLAPSE:
        this.label.text = 'COLLAPSE!';
        this.label.style.fill = 0xFF4444;
        break;
    }
    this.label.y = -SCALED_TILE * 2;
  }

  private drawEntity() {
    this.entityGraphic.clear();
    const s = SCALED_TILE;

    switch (this.encounterType) {
      case EncounterType.TREASURE_VAULT:
        this.entityGraphic.roundRect(-s, -s * 0.5, s * 2, s * 1.5, 5);
        this.entityGraphic.fill(0x8B6914);
        this.entityGraphic.roundRect(-s + 4, -s * 0.5 + 4, s * 2 - 8, s * 1.5 - 8, 3);
        this.entityGraphic.fill(0xDAA520);
        this.entityGraphic.rect(-6, -4, 12, 8);
        this.entityGraphic.fill(0xFFD700);
        this.entityGraphic.circle(0, 0, 5);
        this.entityGraphic.fill(0xFFF8DC);
        break;

      case EncounterType.GUARDIAN:
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          const r = s * 1.2;
          this.entityGraphic.circle(Math.cos(angle) * r * 0.4, Math.sin(angle) * r * 0.4, 12);
          this.entityGraphic.fill(0x4a1a2e);
        }
        this.entityGraphic.circle(0, 0, s * 0.6);
        this.entityGraphic.fill(0x2a0a1e);
        this.entityGraphic.circle(-8, -5, 5);
        this.entityGraphic.fill(0xFF0000);
        this.entityGraphic.circle(8, -5, 5);
        this.entityGraphic.fill(0xFF0000);
        break;

      case EncounterType.PORTAL:
        this.entityGraphic.circle(0, 0, s);
        this.entityGraphic.fill({ color: 0x6B3FA0, alpha: 0.5 });
        this.entityGraphic.circle(0, 0, s * 0.7);
        this.entityGraphic.fill({ color: 0x9B30FF, alpha: 0.3 });
        this.entityGraphic.circle(0, 0, s * 0.4);
        this.entityGraphic.fill({ color: 0xBB70FF, alpha: 0.5 });
        break;

      default:
        this.entityGraphic.circle(0, 0, s * 0.5);
        this.entityGraphic.fill(0x00CED1);
        break;
    }
  }

  updateHp(hp: number, maxHp: number) {
    this.encounterHp = hp;
    this.encounterMaxHp = maxHp;
  }

  update(dt: number) {
    if (!this.active) return;
    this.pulsePhase += dt * 0.005;

    this.hpBar.clear();
    if (this.encounterMaxHp > 0) {
      const w = SCALED_TILE * 3;
      const h = 8;
      const ratio = Math.max(0, this.encounterHp / this.encounterMaxHp);

      this.hpBar.rect(-w / 2, SCALED_TILE, w, h);
      this.hpBar.fill({ color: 0x222222, alpha: 0.8 });
      this.hpBar.rect(-w / 2, SCALED_TILE, w * ratio, h);
      this.hpBar.fill(ratio > 0.5 ? 0x44FF44 : ratio > 0.25 ? 0xFFFF44 : 0xFF4444);
      this.hpBar.rect(-w / 2, SCALED_TILE, w, h);
      this.hpBar.stroke({ color: 0xFFFFFF, width: 1, alpha: 0.5 });
    }

    const pulse = 0.95 + Math.sin(this.pulsePhase) * 0.05;
    this.entityGraphic.scale.set(pulse);
  }

  endEncounter() {
    this.active = false;
    this.container.visible = false;
    this.encounterType = null;
  }
}
