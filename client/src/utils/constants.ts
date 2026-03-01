export { BALANCE } from '@dig/shared';

export const TILE_RENDER_SIZE = 32;
export const TILE_SCALE = 2;
export const SCALED_TILE = TILE_RENDER_SIZE * TILE_SCALE;

export const TILE_COLORS: Record<number, number> = {
  0: 0x000000,        // EMPTY
  1: 0x8B6914,        // DIRT - warm brown
  2: 0xA0522D,        // CLAY - terra cotta
  3: 0x505560,        // STONE - blue-grey
  4: 0x384048,        // HARD_ROCK - dark steel
  5: 0x687880,        // GRANITE - light grey
  6: 0x181830,        // OBSIDIAN - deep purple-black
  7: 0x1a4040,        // CRYSTAL_WALL - dark teal
  8: 0x0a0a0a,        // BEDROCK - near black
};

export const ORE_COLORS: Record<number, number> = {
  0: 0x000000,
  1: 0xD2691E,        // COPPER - warm copper
  2: 0x5B8DB8,        // IRON - steel blue
  3: 0xFFD700,        // GOLD - bright gold
  4: 0x00E5E5,        // CRYSTAL - bright cyan
  5: 0xFF5500,        // EMBER_STONE - hot orange
};

export const BIOME_BG_COLORS: Record<string, number> = {
  SOIL: 0x1a0f0a,
  STONE: 0x0f1114,
  DEEP_ROCK: 0x0a0a14,
  CORE: 0x05050f,
};

export const BIOME_LIGHT_COLORS: Record<string, { color: number; alpha: number }> = {
  SOIL: { color: 0xFF8C42, alpha: 0.15 },
  STONE: { color: 0x4A7C9B, alpha: 0.10 },
  DEEP_ROCK: { color: 0x6B3FA0, alpha: 0.12 },
  CORE: { color: 0x00CED1, alpha: 0.20 },
};
