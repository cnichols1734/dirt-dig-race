export { BALANCE } from '@dig/shared';

export const TILE_RENDER_SIZE = 32;
export const TILE_SCALE = 2;
export const SCALED_TILE = TILE_RENDER_SIZE * TILE_SCALE;

export const TILE_COLORS: Record<number, number> = {
  0: 0x000000,
  1: 0x8B6914,
  2: 0xA0522D,
  3: 0x4A4A4A,
  4: 0x2F4F4F,
  5: 0x708090,
  6: 0x1C1C2E,
  7: 0x1a3a3a,
  8: 0x111111,
  9: 0x1a1a2e,
};

export const ORE_COLORS: Record<number, number> = {
  0: 0x000000,
  1: 0xD2691E,
  2: 0x4682B4,
  3: 0xFFD700,
  4: 0x00CED1,
  5: 0xFF4500,
};

export const NODE_COLORS = {
  UNCLAIMED: 0xCCCCCC,
  PLAYER1: 0x4488FF,
  PLAYER2: 0xFF4444,
  SUPERCHARGED: 0xFFD700,
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
