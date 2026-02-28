import { Container, Graphics } from 'pixi.js';
import { TileType, OreType, TileData } from '@dig/shared';
import { BALANCE } from '@dig/shared';
import { SCALED_TILE, TILE_COLORS, ORE_COLORS } from '../utils/constants';
import { SeededRandom } from '../utils/helpers';

export class GameMap {
  container: Container;
  bgContainer: Container;
  tiles: TileData[][];
  tileSprites: (Graphics | null)[][];
  crackOverlays: (Graphics | null)[][];
  oreOverlays: (Graphics | null)[][];
  width: number;
  height: number;

  constructor() {
    this.container = new Container();
    this.bgContainer = new Container();
    this.tiles = [];
    this.tileSprites = [];
    this.crackOverlays = [];
    this.oreOverlays = [];
    this.width = BALANCE.MAP_WIDTH;
    this.height = BALANCE.MAP_HEIGHT;
  }

  generate(seed: number) {
    const rng = new SeededRandom(seed);
    this.tiles = [];

    for (let y = 0; y < this.height; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < this.width; x++) {
        this.tiles[y][x] = {
          type: TileType.STONE,
          ore: OreType.NONE,
          hp: BALANCE.TILE_HP.STONE,
          maxHp: BALANCE.TILE_HP.STONE,
          x, y,
        };
      }
    }

    this.applyBiomes(rng);
    this.smoothBiomes(rng);
    this.placeOre(rng);
    this.carveCaves(rng);
    this.placeCenterZone();
    this.placeBedrock();
    this.carveSpawns();
  }

  private applyBiomes(rng: SeededRandom) {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const biome = this.getBiome(x);
        const tile = this.tiles[y][x];
        const r = rng.next();

        switch (biome) {
          case 'SOIL':
            if (r < 0.6) { tile.type = TileType.DIRT; tile.hp = BALANCE.TILE_HP.DIRT; tile.maxHp = BALANCE.TILE_HP.DIRT; }
            else { tile.type = TileType.CLAY; tile.hp = BALANCE.TILE_HP.CLAY; tile.maxHp = BALANCE.TILE_HP.CLAY; }
            break;
          case 'STONE':
            if (r < 0.5) { tile.type = TileType.STONE; tile.hp = BALANCE.TILE_HP.STONE; tile.maxHp = BALANCE.TILE_HP.STONE; }
            else if (r < 0.8) { tile.type = TileType.HARD_ROCK; tile.hp = BALANCE.TILE_HP.HARD_ROCK; tile.maxHp = BALANCE.TILE_HP.HARD_ROCK; }
            else { tile.type = TileType.CLAY; tile.hp = BALANCE.TILE_HP.CLAY; tile.maxHp = BALANCE.TILE_HP.CLAY; }
            break;
          case 'DEEP_ROCK':
            if (r < 0.4) { tile.type = TileType.GRANITE; tile.hp = BALANCE.TILE_HP.GRANITE; tile.maxHp = BALANCE.TILE_HP.GRANITE; }
            else if (r < 0.7) { tile.type = TileType.HARD_ROCK; tile.hp = BALANCE.TILE_HP.HARD_ROCK; tile.maxHp = BALANCE.TILE_HP.HARD_ROCK; }
            else if (r < 0.85) { tile.type = TileType.OBSIDIAN; tile.hp = BALANCE.TILE_HP.OBSIDIAN; tile.maxHp = BALANCE.TILE_HP.OBSIDIAN; }
            else { tile.type = TileType.CRYSTAL_WALL; tile.hp = BALANCE.TILE_HP.CRYSTAL_WALL; tile.maxHp = BALANCE.TILE_HP.CRYSTAL_WALL; }
            break;
          case 'CORE':
            if (r < 0.3) { tile.type = TileType.CRYSTAL_WALL; tile.hp = BALANCE.TILE_HP.CRYSTAL_WALL; tile.maxHp = BALANCE.TILE_HP.CRYSTAL_WALL; }
            else if (r < 0.6) { tile.type = TileType.OBSIDIAN; tile.hp = BALANCE.TILE_HP.OBSIDIAN; tile.maxHp = BALANCE.TILE_HP.OBSIDIAN; }
            else { tile.type = TileType.GRANITE; tile.hp = BALANCE.TILE_HP.GRANITE; tile.maxHp = BALANCE.TILE_HP.GRANITE; }
            break;
        }
      }
    }
  }

  private smoothBiomes(rng: SeededRandom) {
    for (let iter = 0; iter < 3; iter++) {
      for (let y = 1; y < this.height - 1; y++) {
        for (let x = 1; x < this.width - 1; x++) {
          const neighbors: TileType[] = [];
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              neighbors.push(this.tiles[y + dy][x + dx].type);
            }
          }
          const counts = new Map<TileType, number>();
          for (const n of neighbors) counts.set(n, (counts.get(n) || 0) + 1);
          let maxType = this.tiles[y][x].type;
          let maxCount = 0;
          for (const [t, c] of counts) {
            if (c > maxCount && t !== TileType.EMPTY && t !== TileType.BEDROCK) {
              maxCount = c; maxType = t;
            }
          }
          if (maxCount >= 5 && rng.next() < 0.4) {
            const hpMap: Record<number, number> = {
              [TileType.DIRT]: BALANCE.TILE_HP.DIRT, [TileType.CLAY]: BALANCE.TILE_HP.CLAY,
              [TileType.STONE]: BALANCE.TILE_HP.STONE, [TileType.HARD_ROCK]: BALANCE.TILE_HP.HARD_ROCK,
              [TileType.GRANITE]: BALANCE.TILE_HP.GRANITE, [TileType.OBSIDIAN]: BALANCE.TILE_HP.OBSIDIAN,
              [TileType.CRYSTAL_WALL]: BALANCE.TILE_HP.CRYSTAL_WALL,
            };
            this.tiles[y][x].type = maxType;
            this.tiles[y][x].hp = hpMap[maxType] || BALANCE.TILE_HP.STONE;
            this.tiles[y][x].maxHp = this.tiles[y][x].hp;
          }
        }
      }
    }
  }

  private placeOre(rng: SeededRandom) {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.tiles[y][x];
        if (tile.type === TileType.EMPTY || tile.type === TileType.BEDROCK) continue;
        const biome = this.getBiome(x);
        const r = rng.next();

        switch (biome) {
          case 'SOIL':
            if (r < BALANCE.ORE_SPAWN_RATES.COPPER) tile.ore = OreType.COPPER;
            break;
          case 'STONE':
            if (r < BALANCE.ORE_SPAWN_RATES.IRON) tile.ore = OreType.IRON;
            else if (r < BALANCE.ORE_SPAWN_RATES.IRON + BALANCE.ORE_SPAWN_RATES.COPPER) tile.ore = OreType.COPPER;
            break;
          case 'DEEP_ROCK':
            if (r < BALANCE.ORE_SPAWN_RATES.GOLD) tile.ore = OreType.GOLD;
            else if (r < BALANCE.ORE_SPAWN_RATES.GOLD + BALANCE.ORE_SPAWN_RATES.IRON) tile.ore = OreType.IRON;
            else if (r < BALANCE.ORE_SPAWN_RATES.GOLD + BALANCE.ORE_SPAWN_RATES.IRON + BALANCE.ORE_SPAWN_RATES.CRYSTAL) tile.ore = OreType.CRYSTAL;
            break;
          case 'CORE':
            if (r < BALANCE.ORE_SPAWN_RATES.EMBER_STONE) tile.ore = OreType.EMBER_STONE;
            else if (r < BALANCE.ORE_SPAWN_RATES.EMBER_STONE + BALANCE.ORE_SPAWN_RATES.CRYSTAL) tile.ore = OreType.CRYSTAL;
            else if (r < BALANCE.ORE_SPAWN_RATES.EMBER_STONE + BALANCE.ORE_SPAWN_RATES.CRYSTAL + BALANCE.ORE_SPAWN_RATES.GOLD) tile.ore = OreType.GOLD;
            break;
        }
      }
    }

    const visited = new Set<string>();
    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        if (visited.has(`${x},${y}`)) continue;
        if (this.tiles[y][x].ore === OreType.NONE) continue;
        visited.add(`${x},${y}`);
        const ore = this.tiles[y][x].ore;
        const count = rng.nextInt(2, 4);
        let cx = x, cy = y;
        for (let i = 0; i < count; i++) {
          const dx = rng.nextInt(-1, 1), dy = rng.nextInt(-1, 1);
          const nx = cx + dx, ny = cy + dy;
          if (nx > 0 && nx < this.width - 1 && ny > 0 && ny < this.height - 1) {
            const nt = this.tiles[ny][nx];
            if (nt.type !== TileType.EMPTY && nt.type !== TileType.BEDROCK && nt.ore === OreType.NONE) {
              nt.ore = ore;
              visited.add(`${nx},${ny}`);
            }
            cx = nx; cy = ny;
          }
        }
      }
    }
  }

  private carveCaves(rng: SeededRandom) {
    const count = rng.nextInt(BALANCE.CAVE_COUNT_MIN, BALANCE.CAVE_COUNT_MAX);
    const cz = BALANCE.CENTER_ZONE;
    for (let i = 0; i < count; i++) {
      const cx = rng.nextInt(5, this.width - 6);
      const cy = rng.nextInt(5, this.height - 6);
      if (Math.abs(cx - (cz.x + 1)) < 4 && Math.abs(cy - (cz.y + 1)) < 4) continue;
      const size = rng.nextInt(BALANCE.CAVE_SIZE_MIN, BALANCE.CAVE_SIZE_MAX);
      const radius = Math.ceil(Math.sqrt(size));
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = cx + dx, ny = cy + dy;
          if (nx <= 0 || nx >= this.width - 1 || ny <= 0 || ny >= this.height - 1) continue;
          if (Math.sqrt(dx * dx + dy * dy) <= radius && rng.next() < 0.65) {
            this.tiles[ny][nx].type = TileType.EMPTY;
            this.tiles[ny][nx].hp = 0;
            this.tiles[ny][nx].maxHp = 0;
            this.tiles[ny][nx].ore = OreType.NONE;
          }
        }
      }
    }
  }

  private placeCenterZone() {
    const cz = BALANCE.CENTER_ZONE;
    for (let dy = 0; dy < cz.height; dy++) {
      for (let dx = 0; dx < cz.width; dx++) {
        const x = cz.x + dx, y = cz.y + dy;
        this.tiles[y][x].type = TileType.CRYSTAL_WALL;
        this.tiles[y][x].hp = BALANCE.TILE_HP.CRYSTAL_WALL;
        this.tiles[y][x].maxHp = BALANCE.TILE_HP.CRYSTAL_WALL;
        this.tiles[y][x].ore = OreType.NONE;
      }
    }
  }

  private placeBedrock() {
    for (let x = 0; x < this.width; x++) {
      this.tiles[0][x] = { type: TileType.BEDROCK, ore: OreType.NONE, hp: 9999, maxHp: 9999, x, y: 0 };
      this.tiles[this.height - 1][x] = { type: TileType.BEDROCK, ore: OreType.NONE, hp: 9999, maxHp: 9999, x, y: this.height - 1 };
    }
    for (let y = 0; y < this.height; y++) {
      this.tiles[y][0] = { type: TileType.BEDROCK, ore: OreType.NONE, hp: 9999, maxHp: 9999, x: 0, y };
      this.tiles[y][this.width - 1] = { type: TileType.BEDROCK, ore: OreType.NONE, hp: 9999, maxHp: 9999, x: this.width - 1, y };
    }
  }

  private carveSpawns() {
    const spawnY = Math.floor(this.height / 2);
    for (let dx = 0; dx < 3; dx++) {
      const lx = 1 + dx, rx = this.width - 2 - dx;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = spawnY + dy;
        if (ny > 0 && ny < this.height - 1) {
          this.tiles[ny][lx].type = TileType.EMPTY;
          this.tiles[ny][lx].hp = 0; this.tiles[ny][lx].maxHp = 0;
          this.tiles[ny][lx].ore = OreType.NONE;
          this.tiles[ny][rx].type = TileType.EMPTY;
          this.tiles[ny][rx].hp = 0; this.tiles[ny][rx].maxHp = 0;
          this.tiles[ny][rx].ore = OreType.NONE;
        }
      }
    }
  }

  private getBiome(x: number): string {
    const b = BALANCE.BIOME_LAYERS;
    if ((x >= b.SOIL.start1 && x <= b.SOIL.end1) || (x >= b.SOIL.start2 && x <= b.SOIL.end2)) return 'SOIL';
    if ((x >= b.STONE.start1 && x <= b.STONE.end1) || (x >= b.STONE.start2 && x <= b.STONE.end2)) return 'STONE';
    if ((x >= b.DEEP_ROCK.start1 && x <= b.DEEP_ROCK.end1) || (x >= b.DEEP_ROCK.start2 && x <= b.DEEP_ROCK.end2)) return 'DEEP_ROCK';
    if (x >= b.CORE.start && x <= b.CORE.end) return 'CORE';
    return 'STONE';
  }

  buildSprites() {
    this.container.removeChildren();
    this.bgContainer.removeChildren();
    this.tileSprites = [];
    this.crackOverlays = [];
    this.oreOverlays = [];

    const bgRng = new SeededRandom(12345);

    const bg = new Graphics();
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const biome = this.getBiome(x);
        let bgColor: number;
        switch (biome) {
          case 'SOIL': bgColor = 0x0D0806; break;
          case 'STONE': bgColor = 0x08090B; break;
          case 'DEEP_ROCK': bgColor = 0x06060C; break;
          case 'CORE': bgColor = 0x040408; break;
          default: bgColor = 0x08090B;
        }
        bg.rect(x * SCALED_TILE, y * SCALED_TILE, SCALED_TILE, SCALED_TILE);
        bg.fill(bgColor);

        if (bgRng.next() < 0.15) {
          const dotX = x * SCALED_TILE + bgRng.next() * SCALED_TILE;
          const dotY = y * SCALED_TILE + bgRng.next() * SCALED_TILE;
          bg.circle(dotX, dotY, 1);
          bg.fill({ color: 0x444444, alpha: 0.2 });
        }
      }
    }
    this.container.addChild(bg);

    for (let y = 0; y < this.height; y++) {
      this.tileSprites[y] = [];
      this.crackOverlays[y] = [];
      this.oreOverlays[y] = [];

      for (let x = 0; x < this.width; x++) {
        const tile = this.tiles[y][x];

        if (tile.type === TileType.EMPTY) {
          this.tileSprites[y][x] = null;
          this.crackOverlays[y][x] = null;
          this.oreOverlays[y][x] = null;
          continue;
        }

        const g = new Graphics();
        this.drawTile(g, tile, x, y);
        g.x = x * SCALED_TILE;
        g.y = y * SCALED_TILE;
        this.container.addChild(g);
        this.tileSprites[y][x] = g;

        if (tile.ore !== OreType.NONE) {
          const oreG = new Graphics();
          this.drawOreOverlay(oreG, tile.ore, x, y);
          oreG.x = x * SCALED_TILE;
          oreG.y = y * SCALED_TILE;
          this.container.addChild(oreG);
          this.oreOverlays[y][x] = oreG;
        } else {
          this.oreOverlays[y][x] = null;
        }

        this.crackOverlays[y][x] = null;
      }
    }
  }

  private drawTile(g: Graphics, tile: TileData, tx: number, ty: number) {
    const baseColor = TILE_COLORS[tile.type] || 0x4A4A4A;
    const S = SCALED_TILE;

    g.rect(0, 0, S, S);
    g.fill(baseColor);

    const rng = new SeededRandom(tx * 1000 + ty);

    for (let i = 0; i < 4; i++) {
      const rx = rng.next() * S;
      const ry = rng.next() * S;
      const rs = 4 + rng.next() * 8;
      const variation = rng.next() > 0.5 ? 0.08 : -0.06;
      g.rect(rx, ry, rs, rs);
      g.fill({ color: variation > 0 ? 0xffffff : 0x000000, alpha: Math.abs(variation) });
    }

    g.rect(0, 0, S, 2);
    g.fill({ color: 0xffffff, alpha: 0.08 });
    g.rect(0, S - 2, S, 2);
    g.fill({ color: 0x000000, alpha: 0.18 });
    g.rect(S - 1, 0, 1, S);
    g.fill({ color: 0x000000, alpha: 0.12 });
    g.rect(0, 0, 1, S);
    g.fill({ color: 0xffffff, alpha: 0.04 });

    if (tile.type === TileType.CRYSTAL_WALL) {
      const cx1 = S * 0.3, cy1 = S * 0.5;
      g.moveTo(cx1, cy1 - 14);
      g.lineTo(cx1 + 10, cy1);
      g.lineTo(cx1, cy1 + 14);
      g.lineTo(cx1 - 10, cy1);
      g.closePath();
      g.fill({ color: 0x00CED1, alpha: 0.35 });

      const cx2 = S * 0.7, cy2 = S * 0.4;
      g.moveTo(cx2, cy2 - 8);
      g.lineTo(cx2 + 6, cy2);
      g.lineTo(cx2, cy2 + 8);
      g.lineTo(cx2 - 6, cy2);
      g.closePath();
      g.fill({ color: 0x9B30FF, alpha: 0.2 });

      g.rect(0, 0, S, S);
      g.fill({ color: 0x00CED1, alpha: 0.05 });
    }

    if (tile.type === TileType.GRANITE) {
      for (let i = 0; i < 6; i++) {
        const sx = rng.next() * S;
        const sy = rng.next() * S;
        g.circle(sx, sy, 1.5 + rng.next() * 2);
        g.fill({ color: 0xcccccc, alpha: 0.12 + rng.next() * 0.08 });
      }
    }

    if (tile.type === TileType.OBSIDIAN) {
      for (let i = 0; i < 3; i++) {
        const sx = rng.next() * S;
        const sy = rng.next() * S;
        const ex = sx + (rng.next() - 0.5) * 20;
        const ey = sy + (rng.next() - 0.5) * 20;
        g.moveTo(sx, sy);
        g.lineTo(ex, ey);
        g.stroke({ color: 0x2a2a4a, width: 1, alpha: 0.3 });
      }
    }

    if (tile.type === TileType.DIRT) {
      for (let i = 0; i < 3; i++) {
        const sx = rng.next() * S;
        const sy = rng.next() * S;
        g.circle(sx, sy, 1 + rng.next());
        g.fill({ color: 0x5a3a10, alpha: 0.25 });
      }
    }

    if (tile.type === TileType.BEDROCK) {
      g.rect(0, 0, S, S);
      g.fill({ color: 0x000000, alpha: 0.3 });
      for (let i = 0; i < 4; i++) {
        const sx = rng.next() * S;
        const sy = rng.next() * S;
        const ex = sx + rng.next() * 15;
        const ey = sy + rng.next() * 15;
        g.moveTo(sx, sy);
        g.lineTo(ex, ey);
        g.stroke({ color: 0x222222, width: 1.5, alpha: 0.4 });
      }
    }
  }

  private drawOreOverlay(g: Graphics, ore: OreType, tx: number, ty: number) {
    const color = ORE_COLORS[ore];
    const S = SCALED_TILE;
    const rng = new SeededRandom(tx * 997 + ty * 1013);

    const numClusters = 2 + Math.floor(rng.next() * 3);
    for (let c = 0; c < numClusters; c++) {
      const cx = 10 + rng.next() * (S - 20);
      const cy = 10 + rng.next() * (S - 20);
      const clusterSize = 2 + Math.floor(rng.next() * 3);

      for (let i = 0; i < clusterSize; i++) {
        const ox = cx + (rng.next() - 0.5) * 12;
        const oy = cy + (rng.next() - 0.5) * 12;
        const r = 2 + rng.next() * 3;
        g.circle(ox, oy, r);
        g.fill({ color, alpha: 0.7 + rng.next() * 0.3 });
      }
    }

    g.circle(S / 2, S / 2, 6);
    g.fill({ color, alpha: 0.4 });

    g.circle(S / 2 - 1, S / 2 - 1, 2);
    g.fill({ color: 0xffffff, alpha: 0.2 });
  }

  updateTile(x: number, y: number, hp: number, broken: boolean) {
    const tile = this.tiles[y][x];
    tile.hp = hp;

    if (broken) {
      tile.type = TileType.EMPTY;
      tile.hp = 0;
      const sprite = this.tileSprites[y]?.[x];
      if (sprite) { this.container.removeChild(sprite); this.tileSprites[y][x] = null; }
      const oreSprite = this.oreOverlays[y]?.[x];
      if (oreSprite) { this.container.removeChild(oreSprite); this.oreOverlays[y][x] = null; }
      const crackSprite = this.crackOverlays[y]?.[x];
      if (crackSprite) { this.container.removeChild(crackSprite); this.crackOverlays[y][x] = null; }
      tile.ore = OreType.NONE;
    } else {
      this.updateCracks(x, y, tile);
    }
  }

  private updateCracks(x: number, y: number, tile: TileData) {
    const ratio = tile.hp / tile.maxHp;
    if (ratio >= 0.85) return;

    let crackG = this.crackOverlays[y]?.[x];
    if (!crackG) {
      crackG = new Graphics();
      crackG.x = x * SCALED_TILE;
      crackG.y = y * SCALED_TILE;
      this.container.addChild(crackG);
      this.crackOverlays[y][x] = crackG;
    }

    crackG.clear();
    const S = SCALED_TILE;
    const rng = new SeededRandom(x * 1234 + y * 5678);

    const alpha = ratio < 0.2 ? 0.8 : ratio < 0.4 ? 0.6 : ratio < 0.6 ? 0.4 : 0.25;
    const lineCount = ratio < 0.2 ? 7 : ratio < 0.4 ? 5 : ratio < 0.6 ? 3 : 1;

    for (let i = 0; i < lineCount; i++) {
      const sx = rng.next() * S;
      const sy = rng.next() * S;
      const segments = 2 + Math.floor(rng.next() * 3);
      crackG.moveTo(sx, sy);
      let cx = sx, cy = sy;
      for (let s = 0; s < segments; s++) {
        cx += (rng.next() - 0.5) * 20;
        cy += (rng.next() - 0.5) * 20;
        cx = Math.max(0, Math.min(S, cx));
        cy = Math.max(0, Math.min(S, cy));
        crackG.lineTo(cx, cy);
      }
      crackG.stroke({ width: ratio < 0.3 ? 2 : 1, color: 0x000000, alpha });
    }

    if (ratio < 0.3) {
      for (let i = 0; i < 3; i++) {
        const px = rng.next() * S;
        const py = rng.next() * S;
        crackG.circle(px, py, 2);
        crackG.fill({ color: 0x000000, alpha: alpha * 0.5 });
      }
    }
  }

  getTile(x: number, y: number): TileData | null {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
    return this.tiles[y][x];
  }

  worldToTile(wx: number, wy: number): { x: number; y: number } {
    return {
      x: Math.floor(wx / SCALED_TILE),
      y: Math.floor(wy / SCALED_TILE),
    };
  }

  tileToWorld(tx: number, ty: number): { x: number; y: number } {
    return {
      x: tx * SCALED_TILE + SCALED_TILE / 2,
      y: ty * SCALED_TILE + SCALED_TILE / 2,
    };
  }
}
