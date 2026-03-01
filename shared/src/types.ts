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
  NODE_FLOOR = 9,
}

export enum OreType {
  NONE = 0,
  COPPER = 1,
  IRON = 2,
  GOLD = 3,
  CRYSTAL = 4,
  EMBER_STONE = 5,
}

export enum NodeTier {
  HOME = 'HOME',
  MID = 'MID',
  CORE = 'CORE',
}

export enum GamePhase {
  LOBBY = 'LOBBY',
  COUNTDOWN = 'COUNTDOWN',
  DIGGING = 'DIGGING',
  GAME_OVER = 'GAME_OVER',
}

export interface OreNode {
  id: string;
  x: number;
  y: number;
  tier: NodeTier;
  ownerId: string | null;
  claimProgress: number;
  claimMax: number;
  pointsPerSecond: number;
  supercharged: boolean;
  discoveredBy: string[];
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
  hp: number;
  maxHp: number;
  knockedOut: boolean;
  knockoutEndTime: number;
  respawnX: number;
  respawnY: number;
  tilesDug: number;
  sonarCooldownEnd: number;
  score: number;
  nodesClaimed: number;
  nodesStolen: number;
  kills: number;
}

export interface GameState {
  phase: GamePhase;
  roomId: string;
  mapSeed: number;
  players: [PlayerState, PlayerState];
  nodes: OreNode[];
  scores: Record<string, number>;
  startTime: number;
  elapsedMs: number;
  gameDurationMs: number;
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
  | 'CLAIM_NODE'
  | 'ATTACK'
  | 'USE_SONAR'
  | 'USE_DYNAMITE'
  | 'PURCHASE_UPGRADE'
  | 'REQUEST_REMATCH';

export interface ClientMessage {
  type: ClientMessageType;
  payload: {
    tileX?: number;
    tileY?: number;
    nodeId?: string;
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
  | 'NODE_UPDATE'
  | 'NODE_CLAIMED'
  | 'NODE_LOST'
  | 'NODE_CONTESTED'
  | 'SCORE_UPDATE'
  | 'VEIN_RUSH'
  | 'TREMOR_SURGE'
  | 'PLAYER_HIT'
  | 'PLAYER_KNOCKED_OUT'
  | 'PLAYER_RESPAWNED'
  | 'CAVE_IN'
  | 'GAME_OVER'
  | 'PLAYER_STATE'
  | 'OPPONENT_POSITION'
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
  nodes: OreNode[];
  gameDurationMs: number;
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
  revealedNodes: Array<{ id: string; x: number; y: number; tier: NodeTier; ownerId: string | null }>;
  enemyVisible: boolean;
  enemyX?: number;
  enemyY?: number;
}

export interface SonarAlertPayload {
  direction: string;
  message: string;
}

export interface NodeUpdatePayload {
  node: OreNode;
}

export interface NodeClaimedPayload {
  nodeId: string;
  ownerId: string;
  tier: NodeTier;
  pointsPerSecond: number;
}

export interface NodeContestedPayload {
  nodeId: string;
  attackerId: string;
  direction: string;
}

export interface ScoreUpdatePayload {
  scores: Record<string, number>;
  pps: Record<string, number>;
  timeRemainingMs: number;
}

export interface VeinRushPayload {
  nodeId: string;
  durationMs: number;
  message: string;
}

export interface TremorSurgePayload {
  players: Array<{ id: string; x: number; y: number }>;
  durationMs: number;
}

export interface PlayerHitPayload {
  attackerId: string;
  targetId: string;
  damage: number;
  targetHp: number;
}

export interface PlayerKnockedOutPayload {
  playerId: string;
  killerId: string;
  respawnMs: number;
}

export interface CaveInPayload {
  collapsedTiles: Array<{ x: number; y: number }>;
  destroyedNodes: string[];
  message: string;
}

export interface GameOverPayload {
  winnerId: string | null;
  reason: string;
  finalScores: Record<string, number>;
  stats: {
    playerId: string;
    score: number;
    tilesDug: number;
    nodesClaimed: number;
    nodesStolen: number;
    kills: number;
    oreCollected: Resources;
    timeMs: number;
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
  totalNodesClaimed: number;
  totalNodesStolen: number;
  totalKills: number;
  currentRank: string;
  xp: number;
}
