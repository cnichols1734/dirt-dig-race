import { TileType, OreType, TileData, MapConfig } from '@dig/shared';
import { BALANCE } from '@dig/shared';

class SeededRandom {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  next(): number {
    this.seed = (this.seed * 16807 + 0) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

export function generateMap(config: MapConfig): TileData[][] {
  const rng = new SeededRandom(config.seed);
  const { width, height } = config;
  const map: TileData[][] = [];

  for (let y = 0; y < height; y++) {
    map[y] = [];
    for (let x = 0; x < width; x++) {
      map[y][x] = {
        type: TileType.STONE,
        ore: OreType.NONE,
        hp: BALANCE.TILE_HP.STONE,
        maxHp: BALANCE.TILE_HP.STONE,
        x, y,
      };
    }
  }

  applyBiomes(map, width, height, rng);
  smoothBiomes(map, width, height, rng);
  placeOreVeins(map, width, height, rng);
  carveCaves(map, width, height, rng);
  placeCenterZone(map);
  placeBedrock(map, width, height);
  carveSpawns(map, width, height);
  ensurePaths(map, width, height);

  return map;
}

function getBiome(x: number): string {
  const b = BALANCE.BIOME_LAYERS;
  if ((x >= b.SOIL.start1 && x <= b.SOIL.end1) || (x >= b.SOIL.start2 && x <= b.SOIL.end2)) return 'SOIL';
  if ((x >= b.STONE.start1 && x <= b.STONE.end1) || (x >= b.STONE.start2 && x <= b.STONE.end2)) return 'STONE';
  if ((x >= b.DEEP_ROCK.start1 && x <= b.DEEP_ROCK.end1) || (x >= b.DEEP_ROCK.start2 && x <= b.DEEP_ROCK.end2)) return 'DEEP_ROCK';
  if (x >= b.CORE.start && x <= b.CORE.end) return 'CORE';
  return 'STONE';
}

function applyBiomes(map: TileData[][], width: number, height: number, rng: SeededRandom) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const biome = getBiome(x);
      const tile = map[y][x];
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

function smoothBiomes(map: TileData[][], width: number, height: number, rng: SeededRandom) {
  for (let iter = 0; iter < 3; iter++) {
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const neighbors: TileType[] = [];
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            neighbors.push(map[y + dy][x + dx].type);
          }
        }
        const counts = new Map<TileType, number>();
        for (const n of neighbors) {
          counts.set(n, (counts.get(n) || 0) + 1);
        }
        let maxType = map[y][x].type;
        let maxCount = 0;
        for (const [t, c] of counts) {
          if (c > maxCount && t !== TileType.EMPTY && t !== TileType.BEDROCK) {
            maxCount = c;
            maxType = t;
          }
        }
        if (maxCount >= 5 && rng.next() < 0.4) {
          const hpMap: Record<number, number> = {
            [TileType.DIRT]: BALANCE.TILE_HP.DIRT,
            [TileType.CLAY]: BALANCE.TILE_HP.CLAY,
            [TileType.STONE]: BALANCE.TILE_HP.STONE,
            [TileType.HARD_ROCK]: BALANCE.TILE_HP.HARD_ROCK,
            [TileType.GRANITE]: BALANCE.TILE_HP.GRANITE,
            [TileType.OBSIDIAN]: BALANCE.TILE_HP.OBSIDIAN,
            [TileType.CRYSTAL_WALL]: BALANCE.TILE_HP.CRYSTAL_WALL,
          };
          map[y][x].type = maxType;
          map[y][x].hp = hpMap[maxType] || BALANCE.TILE_HP.STONE;
          map[y][x].maxHp = map[y][x].hp;
        }
      }
    }
  }
}

function placeOreVeins(map: TileData[][], width: number, height: number, rng: SeededRandom) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = map[y][x];
      if (tile.type === TileType.EMPTY || tile.type === TileType.BEDROCK) continue;

      const biome = getBiome(x);
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

  spreadOreVeins(map, width, height, rng);
}

function spreadOreVeins(map: TileData[][], width: number, height: number, rng: SeededRandom) {
  const visited = new Set<string>();
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const key = `${x},${y}`;
      if (visited.has(key)) continue;
      if (map[y][x].ore === OreType.NONE) continue;
      visited.add(key);

      const oreType = map[y][x].ore;
      const clusterSize = rng.nextInt(2, 4);
      let cx = x, cy = y;
      for (let i = 0; i < clusterSize; i++) {
        const dx = rng.nextInt(-1, 1);
        const dy = rng.nextInt(-1, 1);
        const nx = cx + dx, ny = cy + dy;
        if (nx > 0 && nx < width - 1 && ny > 0 && ny < height - 1) {
          const ntile = map[ny][nx];
          if (ntile.type !== TileType.EMPTY && ntile.type !== TileType.BEDROCK && ntile.ore === OreType.NONE) {
            ntile.ore = oreType;
            visited.add(`${nx},${ny}`);
          }
          cx = nx; cy = ny;
        }
      }
    }
  }
}

function carveCaves(map: TileData[][], width: number, height: number, rng: SeededRandom) {
  const caveCount = rng.nextInt(BALANCE.CAVE_COUNT_MIN, BALANCE.CAVE_COUNT_MAX);
  for (let i = 0; i < caveCount; i++) {
    const cx = rng.nextInt(5, width - 6);
    const cy = rng.nextInt(5, height - 6);
    const cz = BALANCE.CENTER_ZONE;
    if (Math.abs(cx - (cz.x + 1)) < 4 && Math.abs(cy - (cz.y + 1)) < 4) continue;

    const size = rng.nextInt(BALANCE.CAVE_SIZE_MIN, BALANCE.CAVE_SIZE_MAX);
    const radius = Math.ceil(Math.sqrt(size));

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = cx + dx, ny = cy + dy;
        if (nx <= 0 || nx >= width - 1 || ny <= 0 || ny >= height - 1) continue;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= radius && rng.next() < 0.65) {
          map[ny][nx].type = TileType.EMPTY;
          map[ny][nx].hp = 0;
          map[ny][nx].maxHp = 0;
          map[ny][nx].ore = OreType.NONE;
        }
      }
    }
  }
}

function placeCenterZone(map: TileData[][]) {
  const cz = BALANCE.CENTER_ZONE;
  for (let dy = 0; dy < cz.height; dy++) {
    for (let dx = 0; dx < cz.width; dx++) {
      const x = cz.x + dx;
      const y = cz.y + dy;
      map[y][x].type = TileType.CRYSTAL_WALL;
      map[y][x].hp = BALANCE.TILE_HP.CRYSTAL_WALL;
      map[y][x].maxHp = BALANCE.TILE_HP.CRYSTAL_WALL;
      map[y][x].ore = OreType.NONE;
    }
  }
}

function placeBedrock(map: TileData[][], width: number, height: number) {
  for (let x = 0; x < width; x++) {
    map[0][x] = { type: TileType.BEDROCK, ore: OreType.NONE, hp: 9999, maxHp: 9999, x, y: 0 };
    map[height - 1][x] = { type: TileType.BEDROCK, ore: OreType.NONE, hp: 9999, maxHp: 9999, x, y: height - 1 };
  }
  for (let y = 0; y < height; y++) {
    map[y][0] = { type: TileType.BEDROCK, ore: OreType.NONE, hp: 9999, maxHp: 9999, x: 0, y };
    map[y][width - 1] = { type: TileType.BEDROCK, ore: OreType.NONE, hp: 9999, maxHp: 9999, x: width - 1, y };
  }
}

function carveSpawns(map: TileData[][], width: number, _height: number) {
  const spawnY = Math.floor(_height / 2);
  for (let dx = 0; dx < 3; dx++) {
    const lx = 1 + dx;
    const rx = width - 2 - dx;
    for (let dy = -1; dy <= 1; dy++) {
      const ny = spawnY + dy;
      if (ny > 0 && ny < _height - 1) {
        map[ny][lx].type = TileType.EMPTY;
        map[ny][lx].hp = 0; map[ny][lx].maxHp = 0;
        map[ny][lx].ore = OreType.NONE;

        map[ny][rx].type = TileType.EMPTY;
        map[ny][rx].hp = 0; map[ny][rx].maxHp = 0;
        map[ny][rx].ore = OreType.NONE;
      }
    }
  }
}

function ensurePaths(map: TileData[][], width: number, height: number) {
  const spawnY = Math.floor(height / 2);
  const cx = BALANCE.CENTER_ZONE.x + 1;
  const cy = BALANCE.CENTER_ZONE.y + 1;

  ensurePath(map, 2, spawnY, cx, cy, width, height);
  ensurePath(map, width - 3, spawnY, cx, cy, width, height);
}

function ensurePath(map: TileData[][], sx: number, sy: number, ex: number, ey: number, _w: number, h: number) {
  let x = sx, y = sy;
  let steps = 0;
  while ((x !== ex || y !== ey) && steps < 200) {
    if (map[y][x].type === TileType.BEDROCK) break;

    const dx = ex - x;
    const dy = ey - y;
    if (Math.abs(dx) > Math.abs(dy)) {
      x += dx > 0 ? 1 : -1;
    } else {
      y += dy > 0 ? 1 : -1;
    }

    if (x <= 0 || x >= _w - 1 || y <= 0 || y >= h - 1) break;
    steps++;
  }
}

export function getSpawnPositions(height: number, width: number): { p1: { x: number; y: number }; p2: { x: number; y: number } } {
  const spawnY = Math.floor(height / 2);
  return {
    p1: { x: 2, y: spawnY },
    p2: { x: width - 3, y: spawnY },
  };
}
