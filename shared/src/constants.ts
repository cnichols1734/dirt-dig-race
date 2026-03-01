export const BALANCE = {
  MAP_WIDTH: 60,
  MAP_HEIGHT: 40,
  TILE_SIZE: 32,
  MAX_CLICKS_PER_SECOND: 15,

  TILE_HP: {
    DIRT: 1,
    CLAY: 2,
    STONE: 5,
    HARD_ROCK: 12,
    GRANITE: 20,
    OBSIDIAN: 30,
    CRYSTAL_WALL: 15,
  },

  ORE_SPAWN_RATES: {
    COPPER: 0.15,
    IRON: 0.10,
    GOLD: 0.05,
    CRYSTAL: 0.03,
    EMBER_STONE: 0.01,
  },

  SONAR_RADIUS: 10,
  SONAR_DURATION_MS: 3000,
  SONAR_COOLDOWN_MS: 15000,
  DYNAMITE_RADIUS: 1,
  DYNAMITE_FUSE_MS: 2000,
  MAX_DYNAMITE_CHARGES: 3,

  TREMOR_THRESHOLDS: {
    NONE: 25,
    FAINT: 15,
    MODERATE: 10,
    STRONG: 5,
  },
  TREMOR_DEBOUNCE_MS: 5000,

  NODES: {
    HOME_PTS_PER_SEC: 1,
    MID_PTS_PER_SEC: 2,
    CORE_PTS_PER_SEC: 4,
    CLAIM_CLICKS: 40,
    STEAL_CLICKS: 60,
    CAPTURE_RANGE: 1.5,
    SUPERCHARGE_MULTIPLIER: 2,
    NODE_SIZE: 3,
    HARD_SHELL_RADIUS: 3,
    DISCOVER_RADIUS: 5,
    NODE_COUNT_PER_SIDE: 3,
    CORE_COUNT: 1,
    HOME_X_RANGE: [3, 8] as readonly number[],
    HOME_Y_RANGE: [5, 35] as readonly number[],
    MID_X_RANGE: [12, 22] as readonly number[],
    MID_Y_RANGE: [4, 36] as readonly number[],
    CORE_X_RANGE: [26, 34] as readonly number[],
    CORE_Y_RANGE: [10, 30] as readonly number[],
  },

  COMBAT: {
    PLAYER_HP: 50,
    RESPAWN_MS: 8000,
    ATTACK_RANGE: 2,
    KNOCKBACK_INVULN_MS: 1500,
  },

  SCORING: {
    WIN_THRESHOLD: 1000,
    GAME_DURATION_MS: 420000,
    SUDDEN_DEATH_DURATION_MS: 60000,
  },

  EVENTS: {
    VEIN_RUSH_INTERVAL_MIN_MS: 60000,
    VEIN_RUSH_INTERVAL_MAX_MS: 90000,
    VEIN_RUSH_DURATION_MS: 20000,
    TREMOR_SURGE_INTERVAL_MS: 45000,
    TREMOR_SURGE_DURATION_MS: 3000,
    CAVE_IN_START_MS: 270000,
    CAVE_IN_SPEED_TILES_PER_SEC: 0.5,
  },

  UPGRADES: {
    PICKAXE: [
      { level: 1, damage: 1, cost: {} },
      { level: 2, damage: 2, cost: { copper: 8 } },
      { level: 3, damage: 3, cost: { copper: 15, iron: 5 } },
      { level: 4, damage: 5, cost: { iron: 10, gold: 3 } },
      { level: 5, damage: 8, cost: { gold: 8, crystal: 2 } },
      { level: 6, damage: 12, cost: { crystal: 5, emberStone: 1 } },
    ],
    LANTERN: [
      { level: 1, radius: 1, cost: {} },
      { level: 2, radius: 2, cost: { copper: 5 } },
      { level: 3, radius: 3, cost: { copper: 10, iron: 3 } },
      { level: 4, radius: 5, cost: { iron: 5, gold: 2 } },
    ],
    SONAR: {
      unlockCost: { crystal: 3 },
      useCost: { crystal: 1 },
    },
    DYNAMITE: {
      unlockCost: { iron: 5, gold: 2 },
      chargeCost: { iron: 3, gold: 1 },
    },
    STEEL_BOOTS: [
      { level: 0, reduction: 0, cost: {} },
      { level: 1, reduction: 0.25, cost: { iron: 5 } },
      { level: 2, reduction: 0.50, cost: { iron: 5, gold: 3 } },
    ],
    TREMOR_SENSE: [
      { level: 1, cost: {} },
      { level: 2, cost: { crystal: 2 } },
      { level: 3, cost: { crystal: 4, gold: 1 } },
    ],
    MOMENTUM: [
      { level: 0, multiplier: 1.0, cost: {} },
      { level: 1, multiplier: 1.25, cost: { copper: 5, iron: 3 } },
      { level: 2, multiplier: 1.5, cost: { iron: 8, gold: 2 } },
      { level: 3, multiplier: 1.75, cost: { gold: 5, crystal: 2 } },
    ],
  },

  XP: {
    BASE_ROUND: 50,
    PER_TILE: 1,
    PER_NODE_CLAIMED: 30,
    PER_NODE_STOLEN: 50,
    PER_KILL: 40,
    PER_POINT: 2,
    WIN_BONUS: 200,
  },

  MINER_RANKS: [
    { name: 'Dirt Digger', xp: 0 },
    { name: 'Tunnel Rat', xp: 500 },
    { name: 'Rock Breaker', xp: 2000 },
    { name: 'Ore Hound', xp: 5000 },
    { name: 'Deep Delver', xp: 12000 },
    { name: 'Crystal Miner', xp: 25000 },
    { name: 'Obsidian Breaker', xp: 50000 },
    { name: 'Core Walker', xp: 100000 },
    { name: 'Earth Shaker', xp: 250000 },
    { name: 'The Underminer', xp: 500000 },
  ] as readonly { name: string; xp: number }[],

  CAVE_COUNT_MIN: 5,
  CAVE_COUNT_MAX: 8,
  CAVE_SIZE_MIN: 8,
  CAVE_SIZE_MAX: 20,

  BIOME_LAYERS: {
    SOIL: { start1: 0, end1: 8, start2: 52, end2: 59 },
    STONE: { start1: 9, end1: 18, start2: 42, end2: 51 },
    DEEP_ROCK: { start1: 19, end1: 26, start2: 34, end2: 41 },
    CORE: { start: 27, end: 33 },
  },
} as const;
