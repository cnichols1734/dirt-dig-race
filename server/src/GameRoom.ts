import { Server, Socket } from 'socket.io';
import {
  TileData, TileType, OreType, PlayerState, GamePhase,
  Resources, UpgradeState, OreNode, NodeTier,
  ClientMessage, MatchFoundPayload, TileUpdatePayload,
  TremorPayload, SonarResultPayload, NodeUpdatePayload,
  NodeClaimedPayload, NodeContestedPayload, ScoreUpdatePayload,
  VeinRushPayload, TremorSurgePayload, PlayerHitPayload,
  PlayerKnockedOutPayload, CaveInPayload, GameOverPayload,
} from '@dig/shared';
import { BALANCE } from '@dig/shared';
import { generateMap, getSpawnPositions, getNodeDefinitions } from './MapGenerator.js';

function emptyResources(): Resources {
  return { copper: 0, iron: 0, gold: 0, crystal: 0, emberStone: 0 };
}

function defaultUpgrades(): UpgradeState {
  return {
    pickaxeLevel: 1, lanternLevel: 1,
    sonarUnlocked: false, dynamiteUnlocked: false, dynamiteCharges: 0,
    steelBootsLevel: 0, tremorSenseLevel: 1, momentumLevel: 0,
  };
}

function getPickaxeDamage(level: number): number {
  const entry = BALANCE.UPGRADES.PICKAXE.find(p => p.level === level);
  return entry ? entry.damage : 1;
}

function canAfford(resources: Resources, cost: Partial<Resources>): boolean {
  for (const [key, val] of Object.entries(cost)) {
    if ((resources[key as keyof Resources] || 0) < (val as number)) return false;
  }
  return true;
}

function deductCost(resources: Resources, cost: Partial<Resources>) {
  for (const [key, val] of Object.entries(cost)) {
    (resources as any)[key] -= val as number;
  }
}

function getDirection(fromX: number, fromY: number, toX: number, toY: number): string {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const dirs: string[] = [];
  if (dy < -2) dirs.push('north');
  if (dy > 2) dirs.push('south');
  if (dx < -2) dirs.push('west');
  if (dx > 2) dirs.push('east');
  if (dirs.length === 0) {
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'east' : 'west';
    return dy > 0 ? 'south' : 'north';
  }
  return dirs.join('-');
}

function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

interface PlayerEntry {
  socket: Socket;
  state: PlayerState;
  lastClickTime: number;
  clickCount: number;
  lastTremorTime: number;
  lastAttackTime: number;
  consecutiveClicks: { x: number; y: number; count: number; lastTime: number };
}

export class GameRoom {
  id: string;
  io: Server;
  players: Map<string, PlayerEntry> = new Map();
  map: TileData[][];
  nodes: OreNode[];
  scores: Record<string, number> = {};
  phase: GamePhase = GamePhase.COUNTDOWN;
  mapSeed: number;
  startTime: number = 0;
  gameOverSent = false;
  isBotGame = false;

  private scoreInterval: ReturnType<typeof setInterval> | null = null;
  private veinRushTimeout: ReturnType<typeof setTimeout> | null = null;
  private tremorSurgeTimeout: ReturnType<typeof setTimeout> | null = null;
  private caveInInterval: ReturnType<typeof setInterval> | null = null;
  private caveInRadius = 0;
  private botTimer: ReturnType<typeof setInterval> | null = null;

  constructor(id: string, io: Server) {
    this.id = id;
    this.io = io;
    this.mapSeed = Math.floor(Math.random() * 2147483646) + 1;
    this.map = generateMap({ width: BALANCE.MAP_WIDTH, height: BALANCE.MAP_HEIGHT, seed: this.mapSeed });
    this.nodes = getNodeDefinitions(this.mapSeed);
  }

  addPlayer(socket: Socket, _name: string): number {
    const spawns = getSpawnPositions(BALANCE.MAP_HEIGHT, BALANCE.MAP_WIDTH);
    const idx = this.players.size;
    const spawn = idx === 0 ? spawns.p1 : spawns.p2;

    const state: PlayerState = {
      id: socket.id,
      x: spawn.x, y: spawn.y,
      resources: emptyResources(),
      upgrades: defaultUpgrades(),
      hp: BALANCE.COMBAT.PLAYER_HP,
      maxHp: BALANCE.COMBAT.PLAYER_HP,
      knockedOut: false, knockoutEndTime: 0,
      respawnX: spawn.x, respawnY: spawn.y,
      tilesDug: 0, sonarCooldownEnd: 0,
      score: 0, nodesClaimed: 0, nodesStolen: 0, kills: 0,
    };

    this.players.set(socket.id, {
      socket, state,
      lastClickTime: 0, clickCount: 0,
      lastTremorTime: 0, lastAttackTime: 0,
      consecutiveClicks: { x: -1, y: -1, count: 0, lastTime: 0 },
    });
    this.scores[socket.id] = 0;
    socket.join(this.id);
    return idx;
  }

  addBot() {
    this.isBotGame = true;
    const spawns = getSpawnPositions(BALANCE.MAP_HEIGHT, BALANCE.MAP_WIDTH);
    const spawn = spawns.p2;
    const botId = 'bot-' + Math.random().toString(36).slice(2, 8);

    const state: PlayerState = {
      id: botId,
      x: spawn.x, y: spawn.y,
      resources: emptyResources(),
      upgrades: defaultUpgrades(),
      hp: BALANCE.COMBAT.PLAYER_HP,
      maxHp: BALANCE.COMBAT.PLAYER_HP,
      knockedOut: false, knockoutEndTime: 0,
      respawnX: spawn.x, respawnY: spawn.y,
      tilesDug: 0, sonarCooldownEnd: 0,
      score: 0, nodesClaimed: 0, nodesStolen: 0, kills: 0,
    };

    this.players.set(botId, {
      socket: null as any, state,
      lastClickTime: 0, clickCount: 0,
      lastTremorTime: 0, lastAttackTime: 0,
      consecutiveClicks: { x: -1, y: -1, count: 0, lastTime: 0 },
    });
    this.scores[botId] = 0;
  }

  start() {
    this.startTime = Date.now();
    const playerEntries = Array.from(this.players.entries());

    playerEntries.forEach(([id, p], idx) => {
      if (!p.socket?.emit) return;
      const otherName = playerEntries.length > 1 && playerEntries[idx === 0 ? 1 : 0]?.[1]?.socket?.emit
        ? 'Rival Miner' : 'Bot Miner';

      const payload: MatchFoundPayload = {
        roomId: this.id, mapSeed: this.mapSeed,
        playerId: id, playerIndex: idx,
        spawnX: p.state.x, spawnY: p.state.y,
        opponentName: otherName,
        nodes: [],
        gameDurationMs: BALANCE.SCORING.GAME_DURATION_MS,
      };
      p.socket.emit('message', { type: 'MATCH_FOUND', payload });
    });

    let countdown = 3;
    const countdownInterval = setInterval(() => {
      this.broadcast({ type: 'COUNTDOWN', payload: { count: countdown } });
      countdown--;
      if (countdown < 0) {
        clearInterval(countdownInterval);
        this.phase = GamePhase.DIGGING;
        this.broadcast({ type: 'GAME_START', payload: {} });
        this.startScoring();
        this.scheduleVeinRush();
        this.scheduleTremorSurge();
        if (this.isBotGame) this.startBot();
      }
    }, 1000);
  }

  handleMessage(socketId: string, msg: ClientMessage) {
    const player = this.players.get(socketId);
    if (!player) return;
    if (this.phase !== GamePhase.DIGGING) return;

    if (player.state.knockedOut) {
      if (Date.now() >= player.state.knockoutEndTime) {
        this.respawnPlayer(socketId);
      } else {
        return;
      }
    }

    switch (msg.type) {
      case 'DIG': return this.handleDig(socketId, msg.payload.tileX!, msg.payload.tileY!);
      case 'CLAIM_NODE': return this.handleClaimNode(socketId, msg.payload.nodeId!);
      case 'ATTACK': return this.handleAttack(socketId);
      case 'USE_SONAR': return this.handleSonar(socketId);
      case 'USE_DYNAMITE': return this.handleDynamite(socketId, msg.payload.tileX!, msg.payload.tileY!);
      case 'PURCHASE_UPGRADE': return this.handleUpgrade(socketId, msg.payload.upgradeId!);
    }
  }

  // --- DIGGING ---

  handleDig(playerId: string, tx: number, ty: number) {
    const player = this.players.get(playerId);
    if (!player) return;

    const now = Date.now();
    if (now - player.lastClickTime < 60) {
      player.clickCount++;
      if (player.clickCount > BALANCE.MAX_CLICKS_PER_SECOND) return;
    } else {
      player.clickCount = 1;
      player.lastClickTime = now;
    }

    if (tx < 0 || tx >= BALANCE.MAP_WIDTH || ty < 0 || ty >= BALANCE.MAP_HEIGHT) return;
    const tile = this.map[ty][tx];

    if (tile.type === TileType.EMPTY || tile.type === TileType.NODE_FLOOR) {
      const d = Math.abs(tx - player.state.x) + Math.abs(ty - player.state.y);
      if (d <= 5 && this.canReach(player.state.x, player.state.y, tx, ty)) {
        player.state.x = tx;
        player.state.y = ty;
        this.checkNodeDiscovery(playerId, tx, ty);
        this.sendPlayerState(player);
      }
      return;
    }
    if (tile.type === TileType.BEDROCK) return;

    const px = player.state.x, py = player.state.y;
    const dx = Math.abs(tx - px), dy = Math.abs(ty - py);
    if (dx > 1 || dy > 1) {
      if (dx <= 2 && dy <= 2) {
        if (!this.moveTowardTile(player, tx, ty)) return;
      } else {
        return;
      }
    }

    let damage = getPickaxeDamage(player.state.upgrades.pickaxeLevel);
    if (player.state.upgrades.momentumLevel > 0) {
      const cc = player.consecutiveClicks;
      if (cc.x === tx && cc.y === ty && now - cc.lastTime < 250) {
        cc.count++;
        const mult = BALANCE.UPGRADES.MOMENTUM[player.state.upgrades.momentumLevel]?.multiplier || 1;
        damage = Math.ceil(damage * mult);
      } else {
        cc.count = 1;
      }
      cc.x = tx; cc.y = ty; cc.lastTime = now;
    }

    tile.hp -= damage;
    const broken = tile.hp <= 0;

    if (broken) {
      tile.hp = 0;
      tile.type = TileType.EMPTY;
      player.state.x = tx;
      player.state.y = ty;
      player.state.tilesDug++;
      if (tile.ore !== OreType.NONE) {
        this.collectOre(player.state, tile.ore);
      }
      this.checkTremor(playerId);
      this.checkNodeDiscovery(playerId, tx, ty);
    }

    const update: TileUpdatePayload = {
      x: tx, y: ty, hp: tile.hp, broken,
      ore: tile.ore, damageDealt: damage,
    };

    if (player.socket?.emit) {
      player.socket.emit('message', { type: 'TILE_UPDATE', payload: update });
      this.sendPlayerState(player);
    }

    if (broken) tile.ore = OreType.NONE;
  }

  collectOre(state: PlayerState, ore: OreType) {
    switch (ore) {
      case OreType.COPPER: state.resources.copper++; break;
      case OreType.IRON: state.resources.iron++; break;
      case OreType.GOLD: state.resources.gold++; break;
      case OreType.CRYSTAL: state.resources.crystal++; break;
      case OreType.EMBER_STONE: state.resources.emberStone++; break;
    }
  }

  private checkNodeDiscovery(playerId: string, px: number, py: number) {
    const discoverR = BALANCE.NODES.DISCOVER_RADIUS;
    for (const node of this.nodes) {
      if (node.discoveredBy.includes(playerId)) continue;
      if (dist(px, py, node.x, node.y) <= discoverR) {
        node.discoveredBy.push(playerId);
        const player = this.players.get(playerId);
        if (player?.socket?.emit) {
          player.socket.emit('message', { type: 'NODE_UPDATE', payload: { node: { ...node } } });
        }
      }
    }
  }

  // --- NODE CLAIMING ---

  handleClaimNode(playerId: string, nodeId: string) {
    const player = this.players.get(playerId);
    if (!player) return;

    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return;

    const d = dist(player.state.x, player.state.y, node.x, node.y);
    if (d > BALANCE.NODES.CAPTURE_RANGE) return;

    const claimPower = getPickaxeDamage(player.state.upgrades.pickaxeLevel);

    if (node.ownerId === null) {
      node.claimProgress = Math.min(node.claimMax, node.claimProgress + claimPower);
      if (node.claimProgress >= node.claimMax) {
        this.claimNodeForPlayer(node, playerId, false);
      }
    } else if (node.ownerId === playerId) {
      return;
    } else {
      node.claimProgress = Math.max(0, node.claimProgress - claimPower);

      const ownerId = node.ownerId;
      const owner = this.players.get(ownerId);
      if (owner?.socket?.emit) {
        const dir = getDirection(owner.state.x, owner.state.y, node.x, node.y);
        const payload: NodeContestedPayload = { nodeId, attackerId: playerId, direction: dir };
        owner.socket.emit('message', { type: 'NODE_CONTESTED', payload });
      }

      if (node.claimProgress <= 0) {
        this.broadcast({ type: 'NODE_LOST', payload: { nodeId, previousOwnerId: ownerId } });
        node.ownerId = null;
        node.claimProgress = 0;

        node.claimProgress = Math.min(node.claimMax, claimPower);
        if (node.claimProgress >= node.claimMax) {
          this.claimNodeForPlayer(node, playerId, true);
        }
      }
    }

    this.broadcastNodeUpdate(node);
  }

  private claimNodeForPlayer(node: OreNode, playerId: string, stolen: boolean) {
    node.ownerId = playerId;
    node.claimProgress = node.claimMax;
    const player = this.players.get(playerId);
    if (player) {
      player.state.nodesClaimed++;
      if (stolen) player.state.nodesStolen++;
    }

    const payload: NodeClaimedPayload = {
      nodeId: node.id, ownerId: playerId,
      tier: node.tier, pointsPerSecond: node.pointsPerSecond,
    };
    this.broadcast({ type: 'NODE_CLAIMED', payload });
  }

  private broadcastNodeUpdate(node: OreNode) {
    const payload: NodeUpdatePayload = { node: { ...node } };
    this.broadcast({ type: 'NODE_UPDATE', payload });
  }

  // --- COMBAT ---

  handleAttack(attackerId: string) {
    const attacker = this.players.get(attackerId);
    if (!attacker) return;

    const now = Date.now();
    if (now - attacker.lastAttackTime < 200) return;
    attacker.lastAttackTime = now;

    for (const [id, target] of this.players) {
      if (id === attackerId) continue;
      if (target.state.knockedOut) continue;

      const d = dist(attacker.state.x, attacker.state.y, target.state.x, target.state.y);
      if (d > BALANCE.COMBAT.ATTACK_RANGE) continue;

      let damage = getPickaxeDamage(attacker.state.upgrades.pickaxeLevel);
      const reduction = BALANCE.UPGRADES.STEEL_BOOTS[target.state.upgrades.steelBootsLevel]?.reduction || 0;
      damage = Math.ceil(damage * (1 - reduction));

      target.state.hp -= damage;

      const hitPayload: PlayerHitPayload = {
        attackerId, targetId: id,
        damage, targetHp: Math.max(0, target.state.hp),
      };
      this.broadcast({ type: 'PLAYER_HIT', payload: hitPayload });

      if (target.state.hp <= 0) {
        this.knockoutPlayer(id, attackerId);
      }
      break;
    }
  }

  private knockoutPlayer(playerId: string, killerId: string) {
    const player = this.players.get(playerId);
    if (!player) return;

    player.state.knockedOut = true;
    player.state.knockoutEndTime = Date.now() + BALANCE.COMBAT.RESPAWN_MS;
    player.state.hp = 0;

    const killer = this.players.get(killerId);
    if (killer) killer.state.kills++;

    const payload: PlayerKnockedOutPayload = {
      playerId, killerId, respawnMs: BALANCE.COMBAT.RESPAWN_MS,
    };
    this.broadcast({ type: 'PLAYER_KNOCKED_OUT', payload });

    setTimeout(() => {
      if (this.phase === GamePhase.DIGGING && player.state.knockedOut) {
        this.respawnPlayer(playerId);
      }
    }, BALANCE.COMBAT.RESPAWN_MS);
  }

  private respawnPlayer(playerId: string) {
    const player = this.players.get(playerId);
    if (!player) return;

    player.state.knockedOut = false;
    player.state.hp = BALANCE.COMBAT.PLAYER_HP;
    player.state.x = player.state.respawnX;
    player.state.y = player.state.respawnY;

    this.broadcast({ type: 'PLAYER_RESPAWNED', payload: { playerId, x: player.state.x, y: player.state.y } });
    this.sendPlayerState(player);
  }

  // --- SCORING ---

  private startScoring() {
    this.scoreInterval = setInterval(() => {
      if (this.phase !== GamePhase.DIGGING) return;

      for (const node of this.nodes) {
        if (node.ownerId && this.scores[node.ownerId] !== undefined) {
          const pts = node.supercharged
            ? node.pointsPerSecond * BALANCE.NODES.SUPERCHARGE_MULTIPLIER
            : node.pointsPerSecond;
          this.scores[node.ownerId] += pts;

          const p = this.players.get(node.ownerId);
          if (p) p.state.score = this.scores[node.ownerId];
        }
      }

      const elapsed = Date.now() - this.startTime;
      const remaining = BALANCE.SCORING.GAME_DURATION_MS - elapsed;

      const pps: Record<string, number> = {};
      for (const [id] of this.players) {
        pps[id] = 0;
        for (const node of this.nodes) {
          if (node.ownerId === id) {
            pps[id] += node.supercharged
              ? node.pointsPerSecond * BALANCE.NODES.SUPERCHARGE_MULTIPLIER
              : node.pointsPerSecond;
          }
        }
      }

      const payload: ScoreUpdatePayload = {
        scores: { ...this.scores },
        pps,
        timeRemainingMs: Math.max(0, remaining),
      };
      this.broadcast({ type: 'SCORE_UPDATE', payload });

      this.checkWinCondition();

      if (elapsed >= BALANCE.EVENTS.CAVE_IN_START_MS && !this.caveInInterval) {
        this.startCaveIn();
      }
    }, 1000);
  }

  private checkWinCondition() {
    for (const [id, score] of Object.entries(this.scores)) {
      if (score >= BALANCE.SCORING.WIN_THRESHOLD) {
        this.endGame(id, `Reached ${BALANCE.SCORING.WIN_THRESHOLD} points!`);
        return;
      }
    }

    const elapsed = Date.now() - this.startTime;
    if (elapsed >= BALANCE.SCORING.GAME_DURATION_MS) {
      let winnerId: string | null = null;
      let maxScore = -1;
      let tied = false;
      for (const [id, score] of Object.entries(this.scores)) {
        if (score > maxScore) {
          maxScore = score;
          winnerId = id;
          tied = false;
        } else if (score === maxScore) {
          tied = true;
        }
      }
      this.endGame(tied ? null : winnerId, 'Time expired!');
    }
  }

  // --- EVENTS ---

  private scheduleVeinRush() {
    const delay = BALANCE.EVENTS.VEIN_RUSH_INTERVAL_MIN_MS +
      Math.random() * (BALANCE.EVENTS.VEIN_RUSH_INTERVAL_MAX_MS - BALANCE.EVENTS.VEIN_RUSH_INTERVAL_MIN_MS);

    this.veinRushTimeout = setTimeout(() => {
      if (this.phase !== GamePhase.DIGGING) return;

      const candidates = this.nodes.filter(n => !n.supercharged);
      if (candidates.length === 0) return;

      const node = candidates[Math.floor(Math.random() * candidates.length)];
      node.supercharged = true;

      const payload: VeinRushPayload = {
        nodeId: node.id,
        durationMs: BALANCE.EVENTS.VEIN_RUSH_DURATION_MS,
        message: `VEIN RUSH! A node is supercharged for ${BALANCE.EVENTS.VEIN_RUSH_DURATION_MS / 1000}s!`,
      };
      this.broadcast({ type: 'VEIN_RUSH', payload });
      this.broadcastNodeUpdate(node);

      setTimeout(() => {
        node.supercharged = false;
        this.broadcastNodeUpdate(node);
      }, BALANCE.EVENTS.VEIN_RUSH_DURATION_MS);

      this.scheduleVeinRush();
    }, delay);
  }

  private scheduleTremorSurge() {
    this.tremorSurgeTimeout = setTimeout(() => {
      if (this.phase !== GamePhase.DIGGING) return;

      const playerPositions: Array<{ id: string; x: number; y: number }> = [];
      for (const [id, p] of this.players) {
        playerPositions.push({ id, x: p.state.x, y: p.state.y });
      }

      const payload: TremorSurgePayload = {
        players: playerPositions,
        durationMs: BALANCE.EVENTS.TREMOR_SURGE_DURATION_MS,
      };
      this.broadcast({ type: 'TREMOR_SURGE', payload });

      this.scheduleTremorSurge();
    }, BALANCE.EVENTS.TREMOR_SURGE_INTERVAL_MS);
  }

  private startCaveIn() {
    this.caveInRadius = 0;
    this.caveInInterval = setInterval(() => {
      if (this.phase !== GamePhase.DIGGING) {
        if (this.caveInInterval) clearInterval(this.caveInInterval);
        return;
      }

      this.caveInRadius++;
      const collapsedTiles: Array<{ x: number; y: number }> = [];
      const destroyedNodes: string[] = [];
      const w = BALANCE.MAP_WIDTH, h = BALANCE.MAP_HEIGHT;
      const r = this.caveInRadius;

      for (let x = 0; x < w; x++) {
        for (let y = 0; y < h; y++) {
          const edgeDist = Math.min(x, y, w - 1 - x, h - 1 - y);
          if (edgeDist < r && this.map[y][x].type !== TileType.BEDROCK) {
            this.map[y][x].type = TileType.BEDROCK;
            this.map[y][x].hp = 9999;
            collapsedTiles.push({ x, y });
          }
        }
      }

      for (const node of this.nodes) {
        const edgeDist = Math.min(node.x, node.y, w - 1 - node.x, h - 1 - node.y);
        if (edgeDist < r && node.ownerId !== null) {
          destroyedNodes.push(node.id);
          node.ownerId = null;
          node.claimProgress = 0;
        }
      }

      if (collapsedTiles.length > 0) {
        const payload: CaveInPayload = {
          collapsedTiles, destroyedNodes,
          message: 'The walls are closing in!',
        };
        this.broadcast({ type: 'CAVE_IN', payload });
      }
    }, 1000 / BALANCE.EVENTS.CAVE_IN_SPEED_TILES_PER_SEC);
  }

  // --- SONAR ---

  handleSonar(playerId: string) {
    const player = this.players.get(playerId);
    if (!player) return;
    if (!player.state.upgrades.sonarUnlocked) return;

    const now = Date.now();
    if (now < player.state.sonarCooldownEnd) return;
    if (!canAfford(player.state.resources, BALANCE.UPGRADES.SONAR.useCost as any)) return;

    deductCost(player.state.resources, BALANCE.UPGRADES.SONAR.useCost as any);
    player.state.sonarCooldownEnd = now + BALANCE.SONAR_COOLDOWN_MS;

    const px = player.state.x, py = player.state.y;
    const radius = BALANCE.SONAR_RADIUS;
    const revealedTiles: Array<{ x: number; y: number; type: TileType; ore: OreType }> = [];

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.sqrt(dx * dx + dy * dy) > radius) continue;
        const nx = px + dx, ny = py + dy;
        if (nx < 0 || nx >= BALANCE.MAP_WIDTH || ny < 0 || ny >= BALANCE.MAP_HEIGHT) continue;
        const t = this.map[ny][nx];
        revealedTiles.push({ x: nx, y: ny, type: t.type, ore: t.ore });
      }
    }

    const revealedNodes = this.nodes
      .filter(n => dist(px, py, n.x, n.y) <= radius)
      .map(n => {
        if (!n.discoveredBy.includes(playerId)) {
          n.discoveredBy.push(playerId);
        }
        return { id: n.id, x: n.x, y: n.y, tier: n.tier, ownerId: n.ownerId };
      });

    let enemyVisible = false;
    let enemyX: number | undefined, enemyY: number | undefined;
    for (const [id, p] of this.players) {
      if (id === playerId) continue;
      if (dist(px, py, p.state.x, p.state.y) <= radius) {
        enemyVisible = true;
        enemyX = p.state.x + Math.round((Math.random() - 0.5) * 2);
        enemyY = p.state.y + Math.round((Math.random() - 0.5) * 2);

        const dir = getDirection(p.state.x, p.state.y, px, py);
        if (p.socket?.emit) {
          p.socket.emit('message', {
            type: 'SONAR_ALERT',
            payload: { direction: dir, message: `A sonar pulse washes over you from the ${dir}...` },
          });
        }
      }
    }

    const result: SonarResultPayload = { revealedTiles, revealedNodes, enemyVisible, enemyX, enemyY };
    player.socket?.emit('message', { type: 'SONAR_RESULT', payload: result });
    this.sendPlayerState(player);
  }

  // --- DYNAMITE ---

  handleDynamite(playerId: string, tx: number, ty: number) {
    const player = this.players.get(playerId);
    if (!player) return;
    if (!player.state.upgrades.dynamiteUnlocked) return;
    if (player.state.upgrades.dynamiteCharges <= 0) return;

    const px = player.state.x, py = player.state.y;
    if (Math.abs(tx - px) > 1 || Math.abs(ty - py) > 1) return;

    player.state.upgrades.dynamiteCharges--;

    setTimeout(() => {
      const updates: TileUpdatePayload[] = [];
      for (let dy = -BALANCE.DYNAMITE_RADIUS; dy <= BALANCE.DYNAMITE_RADIUS; dy++) {
        for (let dx = -BALANCE.DYNAMITE_RADIUS; dx <= BALANCE.DYNAMITE_RADIUS; dx++) {
          const nx = tx + dx, ny = ty + dy;
          if (nx < 0 || nx >= BALANCE.MAP_WIDTH || ny < 0 || ny >= BALANCE.MAP_HEIGHT) continue;
          const tile = this.map[ny][nx];
          if (tile.type === TileType.BEDROCK || tile.type === TileType.EMPTY || tile.type === TileType.NODE_FLOOR) continue;

          const hadOre = tile.ore;
          tile.hp = 0;
          tile.type = TileType.EMPTY;
          player.state.tilesDug++;
          if (hadOre !== OreType.NONE) this.collectOre(player.state, hadOre);

          updates.push({ x: nx, y: ny, hp: 0, broken: true, ore: hadOre, damageDealt: 999 });
          tile.ore = OreType.NONE;
        }
      }

      player.state.x = tx;
      player.state.y = ty;

      if (player.socket?.emit) {
        player.socket.emit('message', { type: 'TILE_BATCH_UPDATE', payload: { tiles: updates } });
        this.sendPlayerState(player);
      }

      for (const [id, p] of this.players) {
        if (id === playerId) continue;
        if (p.socket?.emit) {
          p.socket.emit('message', {
            type: 'DYNAMITE_ALERT',
            payload: { message: 'A distant explosion echoes through the rock...' },
          });
        }
      }
    }, BALANCE.DYNAMITE_FUSE_MS);

    this.sendPlayerState(player);
  }

  // --- UPGRADES ---

  handleUpgrade(playerId: string, upgradeId: string) {
    const player = this.players.get(playerId);
    if (!player) return;
    const s = player.state;
    const u = s.upgrades;
    let success = false;

    switch (upgradeId) {
      case 'pickaxe': {
        const next = BALANCE.UPGRADES.PICKAXE.find(p => p.level === u.pickaxeLevel + 1);
        if (next && canAfford(s.resources, next.cost as any)) {
          deductCost(s.resources, next.cost as any);
          u.pickaxeLevel = next.level;
          success = true;
        }
        break;
      }
      case 'lantern': {
        const next = BALANCE.UPGRADES.LANTERN.find(p => p.level === u.lanternLevel + 1);
        if (next && canAfford(s.resources, next.cost as any)) {
          deductCost(s.resources, next.cost as any);
          u.lanternLevel = next.level;
          success = true;
        }
        break;
      }
      case 'sonar': {
        if (!u.sonarUnlocked && canAfford(s.resources, BALANCE.UPGRADES.SONAR.unlockCost as any)) {
          deductCost(s.resources, BALANCE.UPGRADES.SONAR.unlockCost as any);
          u.sonarUnlocked = true;
          success = true;
        }
        break;
      }
      case 'dynamite': {
        if (!u.dynamiteUnlocked && canAfford(s.resources, BALANCE.UPGRADES.DYNAMITE.unlockCost as any)) {
          deductCost(s.resources, BALANCE.UPGRADES.DYNAMITE.unlockCost as any);
          u.dynamiteUnlocked = true;
          u.dynamiteCharges = 1;
          success = true;
        }
        break;
      }
      case 'dynamite_charge': {
        if (u.dynamiteUnlocked && u.dynamiteCharges < BALANCE.MAX_DYNAMITE_CHARGES &&
            canAfford(s.resources, BALANCE.UPGRADES.DYNAMITE.chargeCost as any)) {
          deductCost(s.resources, BALANCE.UPGRADES.DYNAMITE.chargeCost as any);
          u.dynamiteCharges++;
          success = true;
        }
        break;
      }
      case 'steel_boots': {
        const nextLevel = u.steelBootsLevel + 1;
        const next = BALANCE.UPGRADES.STEEL_BOOTS[nextLevel];
        if (next && canAfford(s.resources, next.cost as any)) {
          deductCost(s.resources, next.cost as any);
          u.steelBootsLevel = nextLevel;
          success = true;
        }
        break;
      }
      case 'tremor_sense': {
        const next = BALANCE.UPGRADES.TREMOR_SENSE.find(t => t.level === u.tremorSenseLevel + 1);
        if (next && canAfford(s.resources, next.cost as any)) {
          deductCost(s.resources, next.cost as any);
          u.tremorSenseLevel = next.level;
          success = true;
        }
        break;
      }
      case 'momentum': {
        const next = BALANCE.UPGRADES.MOMENTUM[u.momentumLevel + 1];
        if (next && canAfford(s.resources, next.cost as any)) {
          deductCost(s.resources, next.cost as any);
          u.momentumLevel = u.momentumLevel + 1;
          success = true;
        }
        break;
      }
    }

    if (player.socket?.emit) {
      player.socket.emit('message', {
        type: 'UPGRADE_RESULT',
        payload: { upgradeId, success, upgrades: u, resources: s.resources },
      });
    }
  }

  // --- TREMOR ---

  checkTremor(diggerId: string) {
    const digger = this.players.get(diggerId);
    if (!digger) return;

    for (const [id, p] of this.players) {
      if (id === diggerId) continue;
      const now = Date.now();
      if (now - p.lastTremorTime < BALANCE.TREMOR_DEBOUNCE_MS) continue;

      const d = dist(digger.state.x, digger.state.y, p.state.x, p.state.y);
      const dir = getDirection(p.state.x, p.state.y, digger.state.x, digger.state.y);
      let tremor: TremorPayload | null = null;
      const tLevel = p.state.upgrades.tremorSenseLevel;

      if (d < BALANCE.TREMOR_THRESHOLDS.STRONG) {
        tremor = {
          intensity: 'extreme', direction: dir,
          message: tLevel >= 3
            ? `The ground shakes violently from the ${dir}! ${Math.round(d)} tiles away!`
            : `The ground shakes violently from the ${dir}!`,
        };
      } else if (d < BALANCE.TREMOR_THRESHOLDS.MODERATE) {
        tremor = {
          intensity: 'strong', direction: dir,
          message: tLevel >= 2
            ? `Strong vibrations from the ${dir}! ~${Math.round(d)} tiles away.`
            : `Strong vibrations from the ${dir}!`,
        };
      } else if (d < BALANCE.TREMOR_THRESHOLDS.FAINT) {
        tremor = { intensity: 'moderate', direction: dir, message: `You feel vibrations from the ${dir}...` };
      } else if (d < BALANCE.TREMOR_THRESHOLDS.NONE) {
        tremor = { intensity: 'faint', direction: '', message: 'You feel faint vibrations...' };
      }

      if (tremor && p.socket?.emit) {
        p.lastTremorTime = now;
        p.socket.emit('message', { type: 'TREMOR', payload: tremor });
      }
    }
  }

  // --- GAME END ---

  private endGame(winnerId: string | null, reason: string) {
    if (this.gameOverSent) return;
    this.gameOverSent = true;
    this.phase = GamePhase.GAME_OVER;
    this.clearTimers();

    const elapsed = Date.now() - this.startTime;
    const stats: GameOverPayload['stats'] = [];

    for (const [id, p] of this.players) {
      const score = this.scores[id] || 0;
      const xp = BALANCE.XP.BASE_ROUND +
        p.state.tilesDug * BALANCE.XP.PER_TILE +
        p.state.nodesClaimed * BALANCE.XP.PER_NODE_CLAIMED +
        p.state.nodesStolen * BALANCE.XP.PER_NODE_STOLEN +
        p.state.kills * BALANCE.XP.PER_KILL +
        score * BALANCE.XP.PER_POINT +
        (id === winnerId ? BALANCE.XP.WIN_BONUS : 0);

      stats.push({
        playerId: id, score,
        tilesDug: p.state.tilesDug,
        nodesClaimed: p.state.nodesClaimed,
        nodesStolen: p.state.nodesStolen,
        kills: p.state.kills,
        oreCollected: { ...p.state.resources },
        timeMs: elapsed, xpEarned: xp,
      });
    }

    const payload: GameOverPayload = {
      winnerId, reason,
      finalScores: { ...this.scores },
      stats,
    };
    this.broadcast({ type: 'GAME_OVER', payload });
  }

  // --- BOT AI ---

  private startBot() {
    let botId: string | null = null;
    for (const [id, p] of this.players) {
      if (!p.socket?.emit) { botId = id; break; }
    }
    if (!botId) return;

    const bot = this.players.get(botId)!;
    let currentTarget: OreNode | null = null;

    this.botTimer = setInterval(() => {
      if (this.phase !== GamePhase.DIGGING) {
        if (this.botTimer) clearInterval(this.botTimer);
        return;
      }
      if (bot.state.knockedOut) return;

      if (!currentTarget || currentTarget.ownerId === botId) {
        currentTarget = this.pickBotTarget(botId!);
      }
      if (!currentTarget) return;

      const bx = bot.state.x, by = bot.state.y;
      const d = dist(bx, by, currentTarget.x, currentTarget.y);

      if (d <= 2) {
        if (currentTarget.ownerId !== botId) {
          this.handleClaimNode(botId!, currentTarget.id);
        }
        return;
      }

      const dx = currentTarget.x - bx;
      const dy = currentTarget.y - by;
      let nx = bx, ny = by;

      if (Math.random() < 0.15) {
        ny += Math.random() < 0.5 ? 1 : -1;
      } else if (Math.abs(dx) > Math.abs(dy)) {
        nx += dx > 0 ? 1 : -1;
      } else if (dy !== 0) {
        ny += dy > 0 ? 1 : -1;
      } else {
        nx += dx > 0 ? 1 : -1;
      }

      if (nx < 0 || nx >= BALANCE.MAP_WIDTH || ny < 0 || ny >= BALANCE.MAP_HEIGHT) return;

      const tile = this.map[ny][nx];
      if (tile.type === TileType.BEDROCK) return;

      if (tile.type === TileType.EMPTY || tile.type === TileType.NODE_FLOOR) {
        bot.state.x = nx;
        bot.state.y = ny;
      } else {
        const damage = getPickaxeDamage(bot.state.upgrades.pickaxeLevel);
        tile.hp -= damage;
        if (tile.hp <= 0) {
          tile.hp = 0;
          if (tile.ore !== OreType.NONE) this.collectOre(bot.state, tile.ore);
          tile.type = TileType.EMPTY;
          tile.ore = OreType.NONE;
          bot.state.x = nx;
          bot.state.y = ny;
          bot.state.tilesDug++;
          this.checkTremor(botId!);
        }
      }

      this.tryBotUpgrades(bot.state);
    }, 400);
  }

  private pickBotTarget(botId: string): OreNode | null {
    const bot = this.players.get(botId);
    if (!bot) return null;

    const unowned = this.nodes.filter(n => n.ownerId === null);
    if (unowned.length > 0) {
      unowned.sort((a, b) => dist(bot.state.x, bot.state.y, a.x, a.y) - dist(bot.state.x, bot.state.y, b.x, b.y));
      return unowned[0];
    }

    const stealable = this.nodes.filter(n => n.ownerId !== null && n.ownerId !== botId);
    if (stealable.length > 0) {
      stealable.sort((a, b) => b.pointsPerSecond - a.pointsPerSecond);
      return stealable[0];
    }

    return null;
  }

  private tryBotUpgrades(state: PlayerState) {
    const u = state.upgrades;
    const r = state.resources;

    const pickNext = BALANCE.UPGRADES.PICKAXE.find(p => p.level === u.pickaxeLevel + 1);
    if (pickNext && canAfford(r, pickNext.cost as any)) {
      deductCost(r, pickNext.cost as any);
      u.pickaxeLevel = pickNext.level;
    }

    const lanternNext = BALANCE.UPGRADES.LANTERN.find(p => p.level === u.lanternLevel + 1);
    if (lanternNext && canAfford(r, lanternNext.cost as any)) {
      deductCost(r, lanternNext.cost as any);
      u.lanternLevel = lanternNext.level;
    }
  }

  // --- HELPERS ---

  private sendPlayerState(player: PlayerEntry) {
    if (!player.socket?.emit) return;
    player.socket.emit('message', {
      type: 'PLAYER_STATE',
      payload: {
        x: player.state.x, y: player.state.y,
        resources: player.state.resources,
        upgrades: player.state.upgrades,
        hp: player.state.hp, maxHp: player.state.maxHp,
        tilesDug: player.state.tilesDug,
        score: player.state.score,
        sonarCooldownEnd: player.state.sonarCooldownEnd,
      },
    });
  }

  private canReach(fromX: number, fromY: number, toX: number, toY: number): boolean {
    const visited = new Set<string>();
    const queue = [{ x: fromX, y: fromY }];
    visited.add(`${fromX},${fromY}`);

    while (queue.length > 0) {
      const { x, y } = queue.shift()!;
      if (x === toX && y === toY) return true;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx, ny = y + dy;
          const key = `${nx},${ny}`;
          if (visited.has(key)) continue;
          if (nx < 0 || nx >= BALANCE.MAP_WIDTH || ny < 0 || ny >= BALANCE.MAP_HEIGHT) continue;
          visited.add(key);
          const t = this.map[ny][nx].type;
          if (t === TileType.EMPTY || t === TileType.NODE_FLOOR) {
            queue.push({ x: nx, y: ny });
          } else if (nx === toX && ny === toY) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private moveTowardTile(player: PlayerEntry, tx: number, ty: number): boolean {
    const px = player.state.x, py = player.state.y;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = px + dx, ny = py + dy;
        if (nx < 0 || nx >= BALANCE.MAP_WIDTH || ny < 0 || ny >= BALANCE.MAP_HEIGHT) continue;
        const t = this.map[ny][nx].type;
        if (t !== TileType.EMPTY && t !== TileType.NODE_FLOOR) continue;
        if (Math.abs(tx - nx) + Math.abs(ty - ny) <= 1) {
          player.state.x = nx; player.state.y = ny;
          this.sendPlayerState(player);
          return true;
        }
      }
    }
    return false;
  }

  broadcast(msg: { type: string; payload: any }) {
    for (const [, p] of this.players) {
      if (p.socket?.emit) p.socket.emit('message', msg);
    }
  }

  private clearTimers() {
    if (this.scoreInterval) clearInterval(this.scoreInterval);
    if (this.veinRushTimeout) clearTimeout(this.veinRushTimeout);
    if (this.tremorSurgeTimeout) clearTimeout(this.tremorSurgeTimeout);
    if (this.caveInInterval) clearInterval(this.caveInInterval);
    if (this.botTimer) clearInterval(this.botTimer);
  }

  removePlayer(socketId: string) {
    this.players.delete(socketId);
    if (this.phase !== GamePhase.GAME_OVER) {
      const remaining = Array.from(this.players.keys());
      if (remaining.length > 0 && !this.gameOverSent) {
        this.endGame(remaining[0], 'Opponent disconnected');
      }
    }
    this.clearTimers();
  }
}
