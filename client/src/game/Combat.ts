import { Container, Graphics, Text } from 'pixi.js';
import { EncounterType } from '@dig/shared';
import { BALANCE } from '@dig/shared';
import { SCALED_TILE } from '../utils/constants';

export class CombatSystem {
  container: Container;
  private entityGraphic: Graphics;
  private entityGlow: Graphics;
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

    this.entityGlow = new Graphics();
    this.container.addChild(this.entityGlow);

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
        stroke: { color: 0x000000, width: 4 },
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
    this.label.y = -SCALED_TILE * 2.5;
  }

  private drawEntity() {
    this.entityGraphic.clear();
    const s = SCALED_TILE;

    switch (this.encounterType) {
      case EncounterType.TREASURE_VAULT:
        this.entityGraphic.roundRect(-s * 1.1, -s * 0.6, s * 2.2, s * 1.6, 6);
        this.entityGraphic.fill(0x6B4E14);
        this.entityGraphic.roundRect(-s + 2, -s * 0.5 + 2, s * 2 - 4, s * 1.5 - 4, 4);
        this.entityGraphic.fill(0xDAA520);
        this.entityGraphic.roundRect(-s + 8, -s * 0.5 + 8, s * 2 - 16, s * 1.5 - 16, 3);
        this.entityGraphic.fill(0xC49218);

        this.entityGraphic.roundRect(-8, -6, 16, 12, 3);
        this.entityGraphic.fill(0xFFD700);
        this.entityGraphic.circle(0, 0, 6);
        this.entityGraphic.fill(0xFFF8DC);
        this.entityGraphic.circle(0, 0, 3);
        this.entityGraphic.fill(0xFFD700);

        this.entityGraphic.rect(-s + 4, -2, s * 2 - 8, 4);
        this.entityGraphic.fill({ color: 0xFFD700, alpha: 0.3 });
        break;

      case EncounterType.GUARDIAN: {
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const r = s * 0.5;
          this.entityGraphic.circle(Math.cos(angle) * r, Math.sin(angle) * r, 10);
          this.entityGraphic.fill(0x3a0a1e);
        }
        this.entityGraphic.circle(0, 0, s * 0.65);
        this.entityGraphic.fill(0x2a0a1e);
        this.entityGraphic.circle(0, 0, s * 0.5);
        this.entityGraphic.fill(0x350a20);

        this.entityGraphic.circle(-10, -8, 7);
        this.entityGraphic.fill(0x220000);
        this.entityGraphic.circle(10, -8, 7);
        this.entityGraphic.fill(0x220000);
        this.entityGraphic.circle(-10, -8, 5);
        this.entityGraphic.fill(0xFF0000);
        this.entityGraphic.circle(10, -8, 5);
        this.entityGraphic.fill(0xFF0000);
        this.entityGraphic.circle(-9, -9, 2);
        this.entityGraphic.fill(0xFF6666);
        this.entityGraphic.circle(11, -9, 2);
        this.entityGraphic.fill(0xFF6666);

        this.entityGraphic.arc(0, 0, 12, 0.3, Math.PI - 0.3);
        this.entityGraphic.stroke({ color: 0x880000, width: 2 });
        break;
      }

      case EncounterType.PORTAL:
        for (let i = 3; i >= 0; i--) {
          const r = s * (0.4 + i * 0.2);
          this.entityGraphic.circle(0, 0, r);
          this.entityGraphic.fill({ color: i % 2 === 0 ? 0x6B3FA0 : 0x9B30FF, alpha: 0.3 - i * 0.05 });
        }
        this.entityGraphic.circle(0, 0, s * 0.3);
        this.entityGraphic.fill({ color: 0xBB70FF, alpha: 0.6 });
        this.entityGraphic.circle(0, 0, s * 0.15);
        this.entityGraphic.fill({ color: 0xFFFFFF, alpha: 0.4 });
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

    this.entityGlow.clear();
    const glowPulse = 0.3 + Math.sin(this.pulsePhase) * 0.15;
    let glowColor = 0x00CED1;
    if (this.encounterType === EncounterType.GUARDIAN) glowColor = 0xFF4444;
    else if (this.encounterType === EncounterType.TREASURE_VAULT) glowColor = 0xFFD700;
    else if (this.encounterType === EncounterType.PORTAL) glowColor = 0x9B30FF;
    else if (this.encounterType === EncounterType.COLLAPSE) glowColor = 0xFF4444;

    for (let i = 3; i >= 0; i--) {
      const r = SCALED_TILE * (1.5 + i * 0.5);
      this.entityGlow.circle(0, 0, r);
      this.entityGlow.fill({ color: glowColor, alpha: glowPulse * 0.05 * (1 - i * 0.2) });
    }

    this.hpBar.clear();
    if (this.encounterMaxHp > 0) {
      const w = SCALED_TILE * 3;
      const h = 10;
      const ratio = Math.max(0, this.encounterHp / this.encounterMaxHp);

      this.hpBar.roundRect(-w / 2, SCALED_TILE + 4, w, h, 4);
      this.hpBar.fill({ color: 0x111122, alpha: 0.9 });
      if (ratio > 0) {
        this.hpBar.roundRect(-w / 2 + 1, SCALED_TILE + 5, (w - 2) * ratio, h - 2, 3);
        this.hpBar.fill(ratio > 0.5 ? 0x44FF44 : ratio > 0.25 ? 0xFFFF44 : 0xFF4444);
      }
      this.hpBar.roundRect(-w / 2, SCALED_TILE + 4, w, h, 4);
      this.hpBar.stroke({ color: 0xFFFFFF, width: 1, alpha: 0.3 });
    }

    const pulse = 0.95 + Math.sin(this.pulsePhase) * 0.05;
    this.entityGraphic.scale.set(pulse);

    const floatY = Math.sin(this.pulsePhase * 0.7) * 3;
    this.entityGraphic.y = floatY;
    this.label.y = -SCALED_TILE * 2.5 + floatY;
  }

  endEncounter() {
    this.active = false;
    this.container.visible = false;
    this.encounterType = null;
  }
}
