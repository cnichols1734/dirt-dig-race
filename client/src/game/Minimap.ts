import { Container, Graphics } from 'pixi.js';
import { TileType } from '@dig/shared';
import { BALANCE } from '@dig/shared';

const MAP_W = BALANCE.MAP_WIDTH;
const MAP_H = BALANCE.MAP_HEIGHT;
const MINI_SCALE = 2;
const PADDING = 10;

export class Minimap {
  container: Container;
  private bg: Graphics;
  private mapGraphics: Graphics;
  private playerDot: Graphics;
  private opponentDot: Graphics;
  private border: Graphics;
  private dirty = true;
  private redrawTimer = 0;

  constructor() {
    this.container = new Container();

    this.bg = new Graphics();
    this.mapGraphics = new Graphics();
    this.playerDot = new Graphics();
    this.opponentDot = new Graphics();
    this.border = new Graphics();

    this.container.addChild(this.bg);
    this.container.addChild(this.mapGraphics);
    this.container.addChild(this.playerDot);
    this.container.addChild(this.opponentDot);
    this.container.addChild(this.border);

    this.opponentDot.visible = false;

    const w = MAP_W * MINI_SCALE;
    const h = MAP_H * MINI_SCALE;
    this.bg.rect(0, 0, w, h);
    this.bg.fill({ color: 0x050510, alpha: 0.85 });

    this.border.rect(0, 0, w, h);
    this.border.stroke({ color: 0x444466, width: 1, alpha: 0.6 });

    this.container.x = PADDING;
    this.container.y = PADDING;
    this.container.alpha = 0.8;
  }

  markDirty() {
    this.dirty = true;
  }

  updateMap(revealed: Set<string>, tiles: { type: TileType }[][]) {
    this.mapGraphics.clear();

    for (const key of revealed) {
      const [xs, ys] = key.split(',');
      const x = parseInt(xs), y = parseInt(ys);
      if (x < 0 || y < 0 || !tiles[y] || !tiles[y][x]) continue;
      const tile = tiles[y][x];

      let color = 0x1a1a2e;
      switch (tile.type) {
        case TileType.EMPTY: color = 0x1a1a2e; break;
        case TileType.NODE_FLOOR: color = 0x2a2a4e; break;
        case TileType.DIRT: color = 0x5a4010; break;
        case TileType.CLAY: color = 0x6a3520; break;
        case TileType.STONE: color = 0x3a3a3a; break;
        case TileType.HARD_ROCK: color = 0x2a3a3a; break;
        case TileType.GRANITE: color = 0x4a4a5a; break;
        case TileType.OBSIDIAN: color = 0x141420; break;
        case TileType.CRYSTAL_WALL: color = 0x1a3a3a; break;
        case TileType.BEDROCK: color = 0x0a0a0a; break;
      }

      this.mapGraphics.rect(x * MINI_SCALE, y * MINI_SCALE, MINI_SCALE, MINI_SCALE);
      this.mapGraphics.fill(color);
    }
    this.dirty = false;
  }

  updatePlayer(tx: number, ty: number) {
    this.playerDot.clear();
    this.playerDot.circle(tx * MINI_SCALE + MINI_SCALE / 2, ty * MINI_SCALE + MINI_SCALE / 2, 3);
    this.playerDot.fill(0x44AAFF);
    this.playerDot.circle(tx * MINI_SCALE + MINI_SCALE / 2, ty * MINI_SCALE + MINI_SCALE / 2, 5);
    this.playerDot.fill({ color: 0x44AAFF, alpha: 0.3 });
  }

  updateOpponent(tx: number, ty: number) {
    this.opponentDot.visible = true;
    this.opponentDot.clear();
    this.opponentDot.circle(tx * MINI_SCALE + MINI_SCALE / 2, ty * MINI_SCALE + MINI_SCALE / 2, 3);
    this.opponentDot.fill(0xFF4444);
  }

  hideOpponent() {
    this.opponentDot.visible = false;
  }

  update(dt: number, revealed: Set<string>, tiles: { type: TileType }[][]) {
    this.redrawTimer -= dt;
    if (this.redrawTimer <= 0 || this.dirty) {
      this.updateMap(revealed, tiles);
      this.redrawTimer = 1000;
    }
  }
}
