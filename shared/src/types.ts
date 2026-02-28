export enum TileType {
  EMPTY = 0,
  DIRT = 1,
  CLAY = 2,
  STONE = 3,
  HARD_ROCK = 4,
  GRANITE = 5,
  OBSIDIAN = 6,
  CRYSTAL_WALL = 7,
  BEDROCK = 8,
}

export enum OreType {
  NONE = 0,
  COPPER = 1,
  IRON = 2,
  GOLD = 3,
  CRYSTAL = 4,
  EMBER_STONE = 5,
}

export enum EncounterType {
  TREASURE_VAULT = 'TREASURE_VAULT',
  GUARDIAN = 'GUARDIAN',
  COLLAPSE = 'COLLAPSE',
  MIRROR = 'MIRROR',
  PORTAL = 'PORTAL',
}

export enum GamePhase {
  LOBBY = 'LOBBY',
  COUNTDOWN = 'COUNTDOWN',
  DIGGING = 'DIGGING',
  ENCOUNTER = 'ENCOUNTER',
  GAME_OVER = 'GAME_OVER',
}

export interface Resources {
  copper: number;
  iron: number;
  gold: number;
  crystal: number;
  emberStone: number;
}

export interface UpgradeState {
  pickaxeLevel: number;
  lanternLevel: number;
  sonarUnlocked: boolean;
  dynamiteUnlocked: boolean;
  dynamiteCharges: number;
  steelBootsLevel: number;
  tremorSenseLevel: number;
  momentumLevel: number;
}

export interface TileData {
  type: TileType;
  ore: OreType;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
}

export interface PlayerState {
  id: string;
  x: number;
  y: number;
  resources: Resources;
  upgrades: UpgradeState;
  encounterHp: number;
  knockedOut: boolean;
  knockoutEndTime: number;
  tilesDug: number;
  sonarCooldownEnd: number;
}

export interface GameState {
  phase: GamePhase;
  roomId: string;
  mapSeed: number;
  players: [PlayerState, PlayerState];
  encounter: EncounterState | null;
  startTime: number;
  elapsedMs: number;
}

export interface EncounterState {
  type: EncounterType;
  hp: number;
  maxHp: number;
  playersInZone: string[];
  collapseRadius?: number;
  portalTimeLeft?: number;
  damageContribution?: Record<string, number>;
}

export interface MapConfig {
  width: number;
  height: number;
  seed: number;
}

export type ClientMessageType =
  | 'JOIN_QUEUE'
  | 'LEAVE_QUEUE'
  | 'DIG'
  | 'USE_SONAR'
  | 'USE_DYNAMITE'
  | 'PURCHASE_UPGRADE'
  | 'ENCOUNTER_ACTION'
  | 'REQUEST_REMATCH';

export interface ClientMessage {
  type: ClientMessageType;
  payload: {
    tileX?: number;
    tileY?: number;
    upgradeId?: string;
    targetId?: string;
  };
}

export type ServerMessageType =
  | 'QUEUE_JOINED'
  | 'MATCH_FOUND'
  | 'COUNTDOWN'
  | 'GAME_START'
  | 'TILE_UPDATE'
  | 'TILE_BATCH_UPDATE'
  | 'RESOURCE_UPDATE'
  | 'UPGRADE_RESULT'
  | 'TREMOR'
  | 'SONAR_RESULT'
  | 'SONAR_ALERT'
  | 'DYNAMITE_ALERT'
  | 'ENCOUNTER_START'
  | 'ENCOUNTER_UPDATE'
  | 'ENCOUNTER_DAMAGE'
  | 'GUARDIAN_ATTACK'
  | 'COLLAPSE_UPDATE'
  | 'MIRROR_DAMAGE'
  | 'PORTAL_ENTER'
  | 'GAME_OVER'
  | 'PLAYER_STATE'
  | 'OPPONENT_TILE_UPDATE'
  | 'ERROR';

export interface ServerMessage {
  type: ServerMessageType;
  payload: any;
}

export interface MatchFoundPayload {
  roomId: string;
  mapSeed: number;
  playerId: string;
  playerIndex: number;
  spawnX: number;
  spawnY: number;
  opponentName: string;
}

export interface TileUpdatePayload {
  x: number;
  y: number;
  hp: number;
  broken: boolean;
  ore: OreType;
  damageDealt: number;
}

export interface TremorPayload {
  intensity: 'faint' | 'moderate' | 'strong' | 'extreme';
  direction: string;
  message: string;
}

export interface SonarResultPayload {
  revealedTiles: Array<{ x: number; y: number; type: TileType; ore: OreType }>;
  enemyVisible: boolean;
  enemyX?: number;
  enemyY?: number;
}

export interface SonarAlertPayload {
  direction: string;
  message: string;
}

export interface EncounterStartPayload {
  type: EncounterType;
  message: string;
  hp?: number;
  maxHp?: number;
}

export interface GameOverPayload {
  winnerId: string | null;
  reason: string;
  encounter: EncounterType;
  stats: {
    playerId: string;
    tilesDug: number;
    oreCollected: Resources;
    timeMs: number;
    damageDealt: number;
    xpEarned: number;
  }[];
}

export interface PlayerProfile {
  id: string;
  username: string;
  totalTilesDug: number;
  totalOreCollected: Resources;
  roundsPlayed: number;
  roundsWon: number;
  guardiansDefeated: number;
  collapseSurvived: number;
  mirrorWins: number;
  portalsEntered: number;
  deepestDig: number;
  fastestVault: number;
  currentRank: string;
  xp: number;
}
