import { Container, Graphics } from 'pixi.js';
import { TileType, OreType, TileData, OreNode, NodeTier } from '@dig/shared';
import { BALANCE } from '@dig/shared';
import { SCALED_TILE, TILE_COLORS, ORE_COLORS, NODE_COLORS } from '../utils/constants';
import { SeededRandom } from '../utils/helpers';

export class GameMap {
  container: Container;
  nodeContainer: Container;
  tiles: TileData[][];
  tileSprites: (Graphics | null)[][];
  crackOverlays: (Graphics | null)[][];
  oreOverlays: (Graphics | null)[][];
  private nodeGraphics: Map<string, Graphics> = new Map();
  private nodeGlows: Map<string, Graphics> = new Map();
  private nodeProgressRings: Map<string, Graphics> = new Map();
  width: number;
  height: number;
  private pulsePhase = 0;
  private mapSeed = 0;

  constructor() {
    this.container = new Container();
    this.nodeContainer = new Container();
    this.tiles = [];
    this.tileSprites = [];
    this.crackOverlays = [];
    this.oreOverlays = [];
    this.width = BALANCE.MAP_WIDTH;
    this.height = BALANCE.MAP_HEIGHT;
  }

  generate(seed: number) {
    this.mapSeed = seed;
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
    this.placeNodeFloors();
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
            if (c > maxCount && t !== TileType.EMPTY && t !== TileType.BEDROCK && t !== TileType.NODE_FLOOR) {
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
        if (tile.type === TileType.EMPTY || tile.type === TileType.BEDROCK || tile.type === TileType.NODE_FLOOR) continue;
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
            if (nt.type !== TileType.EMPTY && nt.type !== TileType.BEDROCK &&
                nt.type !== TileType.NODE_FLOOR && nt.ore === OreType.NONE) {
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
    const nodePositions = this.generateNodePositions(this.mapSeed);
    for (let i = 0; i < count; i++) {
      const cx = rng.nextInt(5, this.width - 6);
      const cy = rng.nextInt(5, this.height - 6);
      const tooClose = nodePositions.some(n => Math.abs(cx - n.x) < 6 && Math.abs(cy - n.y) < 6);
      if (tooClose) continue;
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

  private placeNodeFloors() {
    const positions = this.generateNodePositions(this.mapSeed);
    const size = BALANCE.NODES.NODE_SIZE;
    const half = Math.floor(size / 2);
    const shellR = BALANCE.NODES.HARD_SHELL_RADIUS;

    for (const pos of positions) {
      for (let dy = -shellR; dy <= shellR; dy++) {
        for (let dx = -shellR; dx <= shellR; dx++) {
          const nx = pos.x + dx, ny = pos.y + dy;
          if (nx <= 0 || nx >= this.width - 1 || ny <= 0 || ny >= this.height - 1) continue;
          if (Math.abs(dx) <= half && Math.abs(dy) <= half) {
            this.tiles[ny][nx].type = TileType.NODE_FLOOR;
            this.tiles[ny][nx].hp = 0;
            this.tiles[ny][nx].maxHp = 0;
            this.tiles[ny][nx].ore = OreType.NONE;
          } else if (Math.abs(dx) <= half + 1 && Math.abs(dy) <= half + 1) {
            this.tiles[ny][nx].type = TileType.OBSIDIAN;
            this.tiles[ny][nx].hp = BALANCE.TILE_HP.OBSIDIAN;
            this.tiles[ny][nx].maxHp = BALANCE.TILE_HP.OBSIDIAN;
            this.tiles[ny][nx].ore = OreType.NONE;
          } else {
            this.tiles[ny][nx].type = TileType.GRANITE;
            this.tiles[ny][nx].hp = BALANCE.TILE_HP.GRANITE;
            this.tiles[ny][nx].maxHp = BALANCE.TILE_HP.GRANITE;
            this.tiles[ny][nx].ore = OreType.NONE;
          }
        }
      }
    }
  }

  private generateNodePositions(seed: number): Array<{ id: string; x: number; y: number; tier: string }> {
    const rng = new SeededRandom(seed + 999);
    const positions: Array<{ id: string; x: number; y: number; tier: string }> = [];
    const w = BALANCE.MAP_WIDTH;
    const tooClose = (x: number, y: number) =>
      positions.some(p => Math.abs(p.x - x) < 6 && Math.abs(p.y - y) < 6);

    for (let i = 0; i < BALANCE.NODES.NODE_COUNT_PER_SIDE; i++) {
      for (let attempt = 0; attempt < 30; attempt++) {
        let tier: string, xRange: readonly number[], yRange: readonly number[];
        if (i === 0) {
          tier = 'HOME';
          xRange = BALANCE.NODES.HOME_X_RANGE;
          yRange = BALANCE.NODES.HOME_Y_RANGE;
        } else {
          tier = 'MID';
          xRange = BALANCE.NODES.MID_X_RANGE;
          yRange = BALANCE.NODES.MID_Y_RANGE;
        }
        const lx = rng.nextInt(xRange[0], xRange[1]);
        const ly = rng.nextInt(yRange[0], yRange[1]);
        const rx = w - 1 - lx;
        const ry = ly;
        if (!tooClose(lx, ly) && !tooClose(rx, ry)) {
          positions.push({ id: `${tier.toLowerCase()}-left-${i}`, x: lx, y: ly, tier });
          positions.push({ id: `${tier.toLowerCase()}-right-${i}`, x: rx, y: ry, tier });
          break;
        }
      }
    }
    for (let attempt = 0; attempt < 30; attempt++) {
      const cx = rng.nextInt(BALANCE.NODES.CORE_X_RANGE[0], BALANCE.NODES.CORE_X_RANGE[1]);
      const cy = rng.nextInt(BALANCE.NODES.CORE_Y_RANGE[0], BALANCE.NODES.CORE_Y_RANGE[1]);
      if (!tooClose(cx, cy)) {
        positions.push({ id: 'core-center', x: cx, y: cy, tier: 'CORE' });
        break;
      }
    }
    return positions;
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
          this.tiles[ny][lx].hp = 0; this.tiles[ny][lx].maxHp = 0; this.tiles[ny][lx].ore = OreType.NONE;
          this.tiles[ny][rx].type = TileType.EMPTY;
          this.tiles[ny][rx].hp = 0; this.tiles[ny][rx].maxHp = 0; this.tiles[ny][rx].ore = OreType.NONE;
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
    this.tileSprites = [];
    this.crackOverlays = [];
    this.oreOverlays = [];

    for (let y = 0; y < this.height; y++) {
      this.tileSprites[y] = [];
      this.crackOverlays[y] = [];
      this.oreOverlays[y] = [];
      for (let x = 0; x < this.width; x++) {
        const tile = this.tiles[y][x];
        if (tile.type === TileType.EMPTY || tile.type === TileType.NODE_FLOOR) {
          const fg = new Graphics();
          this.drawFloorTile(fg, x, y, tile.type);
          fg.x = x * SCALED_TILE;
          fg.y = y * SCALED_TILE;
          this.container.addChild(fg);
          this.tileSprites[y][x] = fg;
          this.crackOverlays[y][x] = null;
          this.oreOverlays[y][x] = null;
          continue;
        }
        const g = new Graphics();
        this.drawTile(g, tile);
        g.x = x * SCALED_TILE;
        g.y = y * SCALED_TILE;
        this.container.addChild(g);
        this.tileSprites[y][x] = g;

        if (tile.ore !== OreType.NONE) {
          const oreG = new Graphics();
          this.drawOreOverlay(oreG, tile.ore);
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

  private localPlayerId: string = '';

  buildNodeSprites(nodes: OreNode[], playerIndex: number) {
    this.nodeContainer.removeChildren();
    this.nodeGraphics.clear();
    this.nodeGlows.clear();
    this.nodeProgressRings.clear();

    for (const node of nodes) {
      const cx = node.x * SCALED_TILE + SCALED_TILE / 2;
      const cy = node.y * SCALED_TILE + SCALED_TILE / 2;

      const glow = new Graphics();
      glow.x = cx;
      glow.y = cy;
      this.nodeContainer.addChild(glow);
      this.nodeGlows.set(node.id, glow);

      const g = new Graphics();
      g.x = cx;
      g.y = cy;
      this.nodeContainer.addChild(g);
      this.nodeGraphics.set(node.id, g);

      const ring = new Graphics();
      ring.x = cx;
      ring.y = cy;
      this.nodeContainer.addChild(ring);
      this.nodeProgressRings.set(node.id, ring);
    }
  }

  setLocalPlayerId(id: string) {
    this.localPlayerId = id;
  }

  updateNodes(nodes: OreNode[], playerIndex: number) {
    const s = SCALED_TILE;

    for (const node of nodes) {
      const isDiscovered = node.discoveredBy?.includes(this.localPlayerId);
      let g = this.nodeGraphics.get(node.id);
      let glow = this.nodeGlows.get(node.id);
      let ring = this.nodeProgressRings.get(node.id);

      if (!isDiscovered) {
        if (g) g.visible = false;
        if (glow) glow.visible = false;
        if (ring) ring.visible = false;
        continue;
      }

      if (!g || !glow || !ring) {
        const cx = node.x * SCALED_TILE + SCALED_TILE / 2;
        const cy = node.y * SCALED_TILE + SCALED_TILE / 2;
        if (!glow) {
          glow = new Graphics(); glow.x = cx; glow.y = cy;
          this.nodeContainer.addChild(glow); this.nodeGlows.set(node.id, glow);
        }
        if (!g) {
          g = new Graphics(); g.x = cx; g.y = cy;
          this.nodeContainer.addChild(g); this.nodeGraphics.set(node.id, g);
        }
        if (!ring) {
          ring = new Graphics(); ring.x = cx; ring.y = cy;
          this.nodeContainer.addChild(ring); this.nodeProgressRings.set(node.id, ring);
        }
      }

      g.visible = true;
      glow.visible = true;
      ring.visible = true;

      const pulse = 0.7 + Math.sin(this.pulsePhase + node.x * 0.3) * 0.3;

      let color = NODE_COLORS.UNCLAIMED;
      if (node.ownerId !== null) {
        color = node.ownerId === this.localPlayerId ? NODE_COLORS.PLAYER1 : NODE_COLORS.PLAYER2;
      }
      if (node.supercharged) color = NODE_COLORS.SUPERCHARGED;

      g.clear();
      const tierSize = node.tier === NodeTier.CORE ? s * 1.2 : node.tier === NodeTier.MID ? s * 0.9 : s * 0.7;

      g.moveTo(0, -tierSize);
      g.lineTo(tierSize * 0.7, -tierSize * 0.3);
      g.lineTo(tierSize * 0.5, tierSize * 0.5);
      g.lineTo(-tierSize * 0.5, tierSize * 0.5);
      g.lineTo(-tierSize * 0.7, -tierSize * 0.3);
      g.closePath();
      g.fill({ color, alpha: 0.6 + pulse * 0.2 });
      g.stroke({ color: 0xFFFFFF, width: 2, alpha: 0.5 });

      g.circle(0, -tierSize * 0.1, tierSize * 0.25);
      g.fill({ color: 0xFFFFFF, alpha: 0.3 * pulse });

      glow.clear();
      const glowRadius = node.supercharged ? s * 3.5 : s * 2.5;
      for (let i = 4; i >= 0; i--) {
        const r = glowRadius * (0.3 + i * 0.18);
        glow.circle(0, 0, r);
        glow.fill({ color, alpha: pulse * 0.04 * (1 - i * 0.15) });
      }

      ring.clear();
      if (node.claimProgress > 0 && node.claimProgress < node.claimMax) {
        const ratio = node.claimProgress / node.claimMax;
        const ringRadius = tierSize + 8;
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + ratio * Math.PI * 2;

        ring.setStrokeStyle({ width: 4, color: node.ownerId ? 0xFF4444 : color, alpha: 0.8 });
        ring.arc(0, 0, ringRadius, startAngle, endAngle);
        ring.stroke();
      }
    }
  }

  private drawTile(g: Graphics, tile: TileData) {
    const s = SCALED_TILE;
    const baseColor = TILE_COLORS[tile.type] || 0x4A4A4A;

    g.rect(0, 0, s, s);
    g.fill(baseColor);

    g.rect(0, 0, s, 3);
    g.fill({ color: 0xffffff, alpha: 0.08 });
    g.rect(0, s - 3, s, 3);
    g.fill({ color: 0x000000, alpha: 0.2 });
    g.rect(0, 0, 2, s);
    g.fill({ color: 0xffffff, alpha: 0.04 });
    g.rect(s - 2, 0, 2, s);
    g.fill({ color: 0x000000, alpha: 0.12 });

    const hash = (tile.x * 73 + tile.y * 137) & 0xFFFF;

    if (tile.type === TileType.DIRT || tile.type === TileType.CLAY) {
      for (let i = 0; i < 4; i++) {
        const px = ((hash + i * 19) % (s - 8)) + 4;
        const py = ((hash + i * 31) % (s - 8)) + 4;
        const sz = 2 + (hash + i) % 3;
        g.circle(px, py, sz);
        g.fill({ color: tile.type === TileType.DIRT ? 0x6B4B14 : 0x7A4030, alpha: 0.2 });
      }
      for (let i = 0; i < 2; i++) {
        const lx = ((hash + i * 23) % (s - 12)) + 6;
        const ly = ((hash + i * 41) % (s - 6)) + 3;
        g.moveTo(lx, ly);
        g.lineTo(lx + 6 + i * 3, ly + 2);
        g.stroke({ color: 0x000000, width: 1, alpha: 0.08 });
      }
    }

    if (tile.type === TileType.STONE || tile.type === TileType.HARD_ROCK) {
      for (let i = 0; i < 3; i++) {
        const lx = ((hash + i * 17) % (s - 20)) + 5;
        const ly = ((hash + i * 29) % (s - 10)) + 5;
        g.moveTo(lx, ly);
        g.lineTo(lx + 10 + i * 4, ly + 3 - i);
        g.stroke({ color: 0xffffff, width: 1, alpha: 0.04 });
      }
      for (let i = 0; i < 5; i++) {
        const px = ((hash + i * 13) % (s - 6)) + 3;
        const py = ((hash + i * 23) % (s - 6)) + 3;
        g.circle(px, py, 1 + hash % 2);
        g.fill({ color: tile.type === TileType.HARD_ROCK ? 0x556666 : 0x666666, alpha: 0.15 });
      }
    }

    if (tile.type === TileType.GRANITE) {
      for (let i = 0; i < 7; i++) {
        const px = ((hash + i * 13 + 7) % (s - 4)) + 2;
        const py = ((hash + i * 17 + 3) % (s - 4)) + 2;
        const sz = 1.5 + (hash + i) % 3;
        g.circle(px, py, sz);
        g.fill({ color: 0xbbbbcc, alpha: 0.18 });
      }
      g.moveTo(s * 0.2, s * 0.3);
      g.lineTo(s * 0.8, s * 0.7);
      g.stroke({ color: 0x000000, width: 1, alpha: 0.1 });
    }

    if (tile.type === TileType.OBSIDIAN) {
      g.rect(2, 2, s - 4, s - 4);
      g.fill({ color: 0x1a1a30, alpha: 0.3 });
      for (let i = 0; i < 3; i++) {
        const px = ((hash + i * 19) % (s - 10)) + 5;
        const py = ((hash + i * 31) % (s - 10)) + 5;
        g.moveTo(px, py);
        g.lineTo(px + 8, py - 4);
        g.lineTo(px + 4, py + 6);
        g.closePath();
        g.fill({ color: 0x3333aa, alpha: 0.08 });
      }
      g.rect(s * 0.3, 0, 2, s);
      g.fill({ color: 0x4444cc, alpha: 0.04 });
    }

    if (tile.type === TileType.CRYSTAL_WALL) {
      const cx1 = s * 0.3, cy1 = s * 0.5;
      g.moveTo(cx1, cy1 - 14);
      g.lineTo(cx1 + 10, cy1);
      g.lineTo(cx1, cy1 + 14);
      g.lineTo(cx1 - 10, cy1);
      g.closePath();
      g.fill({ color: 0x00CED1, alpha: 0.35 });

      const cx2 = s * 0.7, cy2 = s * 0.35;
      g.moveTo(cx2, cy2 - 8);
      g.lineTo(cx2 + 6, cy2);
      g.lineTo(cx2, cy2 + 8);
      g.lineTo(cx2 - 6, cy2);
      g.closePath();
      g.fill({ color: 0x9B30FF, alpha: 0.2 });

      g.circle(cx1 - 2, cy1 - 5, 2);
      g.fill({ color: 0xFFFFFF, alpha: 0.4 });
    }
  }

  private drawOreOverlay(g: Graphics, ore: OreType) {
    const color = ORE_COLORS[ore];
    const s = SCALED_TILE;
    const half = s / 2;

    g.circle(half, half, 7);
    g.fill({ color, alpha: 0.6 });
    g.circle(half, half, 5);
    g.fill({ color, alpha: 0.8 });

    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + 0.3;
      const r = 12 + (i % 3) * 4;
      const ox = half + Math.cos(angle) * r;
      const oy = half + Math.sin(angle) * r;
      const sz = 2 + i % 2;
      if (ore === OreType.CRYSTAL || ore === OreType.EMBER_STONE) {
        const hs = sz;
        g.moveTo(ox, oy - hs);
        g.lineTo(ox + hs, oy);
        g.lineTo(ox, oy + hs);
        g.lineTo(ox - hs, oy);
        g.closePath();
        g.fill({ color, alpha: 0.7 });
      } else {
        g.circle(ox, oy, sz);
        g.fill({ color, alpha: 0.65 });
      }
    }

    g.circle(half - 1, half - 2, 2);
    g.fill({ color: 0xFFFFFF, alpha: 0.3 });
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

      const fg = new Graphics();
      this.drawFloorTile(fg, x, y, TileType.EMPTY);
      fg.x = x * SCALED_TILE;
      fg.y = y * SCALED_TILE;
      this.container.addChild(fg);
      this.tileSprites[y][x] = fg;
    } else {
      this.updateCracks(x, y, tile);
    }
  }

  private drawFloorTile(g: Graphics, x: number, y: number, type: TileType) {
    const s = SCALED_TILE;
    const biome = this.getBiome(x);
    const hash = (x * 73 + y * 137) & 0xFFFF;

    let baseColor = 0x0c0c18;
    if (biome === 'SOIL') baseColor = 0x120d08;
    else if (biome === 'STONE') baseColor = 0x0e0e16;
    else if (biome === 'DEEP_ROCK') baseColor = 0x0a0a14;
    else if (biome === 'CORE') baseColor = 0x080810;

    g.rect(0, 0, s, s);
    g.fill(baseColor);

    for (let i = 0; i < 3; i++) {
      const px = ((hash + i * 19) % (s - 4)) + 2;
      const py = ((hash + i * 31) % (s - 4)) + 2;
      g.circle(px, py, 1);
      g.fill({ color: 0x333344, alpha: 0.2 });
    }

    g.rect(0, s - 1, s, 1);
    g.fill({ color: 0x222233, alpha: 0.15 });
    g.rect(s - 1, 0, 1, s);
    g.fill({ color: 0x222233, alpha: 0.1 });

    if (type === TileType.NODE_FLOOR) {
      g.rect(2, 2, s - 4, s - 4);
      g.fill({ color: 0x1a1a3a, alpha: 0.3 });
    }
  }

  private updateCracks(x: number, y: number, tile: TileData) {
    const ratio = tile.hp / tile.maxHp;
    if (ratio >= 0.75) return;
    let crackG = this.crackOverlays[y]?.[x];
    if (!crackG) {
      crackG = new Graphics();
      crackG.x = x * SCALED_TILE;
      crackG.y = y * SCALED_TILE;
      this.container.addChild(crackG);
      this.crackOverlays[y][x] = crackG;
    }
    crackG.clear();
    const alpha = ratio < 0.25 ? 0.7 : ratio < 0.5 ? 0.5 : 0.3;
    const lineCount = ratio < 0.25 ? 5 : ratio < 0.5 ? 3 : 1;
    crackG.setStrokeStyle({ width: 1, color: 0x000000, alpha });
    for (let i = 0; i < lineCount; i++) {
      const sx = (i * 17 + 5) % SCALED_TILE;
      const sy = (i * 13 + 3) % SCALED_TILE;
      const ex = (sx + 15 + i * 7) % SCALED_TILE;
      const ey = (sy + 20 + i * 3) % SCALED_TILE;
      crackG.moveTo(sx, sy);
      crackG.lineTo(ex, ey);
      crackG.stroke();
    }
  }

  update(dt: number) {
    this.pulsePhase += dt * 0.003;
  }

  isNodeTile(tx: number, ty: number): boolean {
    if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) return false;
    return this.tiles[ty][tx].type === TileType.NODE_FLOOR;
  }

  getNodeAtTile(tx: number, ty: number, nodes: OreNode[]): OreNode | null {
    const half = Math.floor(BALANCE.NODES.NODE_SIZE / 2);
    for (const node of nodes) {
      if (Math.abs(tx - node.x) <= half && Math.abs(ty - node.y) <= half) {
        return node;
      }
    }
    return null;
  }

  getTile(x: number, y: number): TileData | null {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
    return this.tiles[y][x];
  }

  worldToTile(wx: number, wy: number): { x: number; y: number } {
    return { x: Math.floor(wx / SCALED_TILE), y: Math.floor(wy / SCALED_TILE) };
  }

  tileToWorld(tx: number, ty: number): { x: number; y: number } {
    return { x: tx * SCALED_TILE + SCALED_TILE / 2, y: ty * SCALED_TILE + SCALED_TILE / 2 };
  }
}
