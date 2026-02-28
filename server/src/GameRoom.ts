import { Server, Socket } from 'socket.io';
import {
  TileData, TileType, OreType, PlayerState, GamePhase,
  Resources, UpgradeState, EncounterType, EncounterState,
  ClientMessage, MatchFoundPayload, TileUpdatePayload,
  TremorPayload, SonarResultPayload, EncounterStartPayload,
  GameOverPayload,
} from '@dig/shared';
import { BALANCE } from '@dig/shared';
import { generateMap, getSpawnPositions } from './MapGenerator.js';

function emptyResources(): Resources {
  return { copper: 0, iron: 0, gold: 0, crystal: 0, emberStone: 0 };
}

function defaultUpgrades(): UpgradeState {
  return {
    pickaxeLevel: 1,
    lanternLevel: 1,
    sonarUnlocked: false,
    dynamiteUnlocked: false,
    dynamiteCharges: 0,
    steelBootsLevel: 0,
    tremorSenseLevel: 1,
    momentumLevel: 0,
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

function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export class GameRoom {
  id: string;
  io: Server;
  players: Map<string, { socket: Socket; state: PlayerState; lastClickTime: number; clickCount: number; lastTremorTime: number; consecutiveClicks: { x: number; y: number; count: number; lastTime: number } }> = new Map();
  map: TileData[][];
  phase: GamePhase = GamePhase.COUNTDOWN;
  encounter: EncounterState | null = null;
  mapSeed: number;
  startTime: number = 0;
  encounterTimer: ReturnType<typeof setInterval> | null = null;
  collapseTimer: ReturnType<typeof setInterval> | null = null;
  gameOverSent = false;
  botTimer: ReturnType<typeof setInterval> | null = null;
  isBotGame = false;

  constructor(id: string, io: Server) {
    this.id = id;
    this.io = io;
    this.mapSeed = Math.floor(Math.random() * 2147483646) + 1;
    this.map = generateMap({ width: BALANCE.MAP_WIDTH, height: BALANCE.MAP_HEIGHT, seed: this.mapSeed });
  }

  addPlayer(socket: Socket, name: string): number {
    const spawns = getSpawnPositions(BALANCE.MAP_HEIGHT, BALANCE.MAP_WIDTH);
    const idx = this.players.size;
    const spawn = idx === 0 ? spawns.p1 : spawns.p2;

    const state: PlayerState = {
      id: socket.id,
      x: spawn.x,
      y: spawn.y,
      resources: emptyResources(),
      upgrades: defaultUpgrades(),
      encounterHp: BALANCE.ENCOUNTER.PLAYER_ENCOUNTER_HP,
      knockedOut: false,
      knockoutEndTime: 0,
      tilesDug: 0,
      sonarCooldownEnd: 0,
    };

    this.players.set(socket.id, {
      socket,
      state,
      lastClickTime: 0,
      clickCount: 0,
      lastTremorTime: 0,
      consecutiveClicks: { x: -1, y: -1, count: 0, lastTime: 0 },
    });

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
      x: spawn.x,
      y: spawn.y,
      resources: emptyResources(),
      upgrades: defaultUpgrades(),
      encounterHp: BALANCE.ENCOUNTER.PLAYER_ENCOUNTER_HP,
      knockedOut: false,
      knockoutEndTime: 0,
      tilesDug: 0,
      sonarCooldownEnd: 0,
    };

    this.players.set(botId, {
      socket: null as any,
      state,
      lastClickTime: 0,
      clickCount: 0,
      lastTremorTime: 0,
      consecutiveClicks: { x: -1, y: -1, count: 0, lastTime: 0 },
    });
  }

  start() {
    this.startTime = Date.now();

    const playerEntries = Array.from(this.players.entries());
    playerEntries.forEach(([id, p], idx) => {
      if (!p.socket?.emit) return;
      const otherIdx = idx === 0 ? 1 : 0;
      const otherName = playerEntries[otherIdx]?.[1]?.socket?.id
        ? 'Rival Miner' : 'Bot Miner';

      const payload: MatchFoundPayload = {
        roomId: this.id,
        mapSeed: this.mapSeed,
        playerId: id,
        playerIndex: idx,
        spawnX: p.state.x,
        spawnY: p.state.y,
        opponentName: otherName,
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
        if (this.isBotGame) this.startBot();
      }
    }, 1000);
  }

  handleMessage(socketId: string, msg: ClientMessage) {
    const player = this.players.get(socketId);
    if (!player) return;

    switch (msg.type) {
      case 'DIG': return this.handleDig(socketId, msg.payload.tileX!, msg.payload.tileY!);
      case 'USE_SONAR': return this.handleSonar(socketId);
      case 'USE_DYNAMITE': return this.handleDynamite(socketId, msg.payload.tileX!, msg.payload.tileY!);
      case 'PURCHASE_UPGRADE': return this.handleUpgrade(socketId, msg.payload.upgradeId!);
      case 'ENCOUNTER_ACTION': return this.handleEncounterAction(socketId, msg.payload.tileX, msg.payload.tileY);
    }
  }

  handleDig(playerId: string, tx: number, ty: number) {
    if (this.phase !== GamePhase.DIGGING) return;
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

    if (tile.type === TileType.EMPTY) {
      const dist = Math.abs(tx - player.state.x) + Math.abs(ty - player.state.y);
      if (dist <= 5 && this.canReach(player.state.x, player.state.y, tx, ty)) {
        player.state.x = tx;
        player.state.y = ty;
        if (player.socket?.emit) {
          player.socket.emit('message', {
            type: 'PLAYER_STATE',
            payload: { x: tx, y: ty, resources: player.state.resources, upgrades: player.state.upgrades, tilesDug: player.state.tilesDug },
          });
        }
      }
      return;
    }
    if (tile.type === TileType.BEDROCK) return;

    const px = player.state.x, py = player.state.y;
    const dx = Math.abs(tx - px), dy = Math.abs(ty - py);

    if (dx > 1 || dy > 1) {
      if (dx <= 2 && dy <= 2) {
        const moved = this.moveTowardTile(player, tx, ty);
        if (!moved) return;
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
      this.checkCenterReached(playerId, tx, ty);
    }

    const update: TileUpdatePayload = {
      x: tx, y: ty,
      hp: tile.hp,
      broken,
      ore: tile.ore,
      damageDealt: damage,
    };

    if (player.socket?.emit) {
      player.socket.emit('message', { type: 'TILE_UPDATE', payload: update });
      player.socket.emit('message', {
        type: 'PLAYER_STATE',
        payload: {
          x: player.state.x,
          y: player.state.y,
          resources: player.state.resources,
          upgrades: player.state.upgrades,
          tilesDug: player.state.tilesDug,
        },
      });
    }

    if (broken) {
      tile.ore = OreType.NONE;
    }
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

  checkTremor(diggerId: string) {
    const digger = this.players.get(diggerId);
    if (!digger) return;

    for (const [id, p] of this.players) {
      if (id === diggerId) continue;
      const now = Date.now();
      if (now - p.lastTremorTime < BALANCE.TREMOR_DEBOUNCE_MS) continue;

      const dist = distance(digger.state.x, digger.state.y, p.state.x, p.state.y);
      const dir = getDirection(p.state.x, p.state.y, digger.state.x, digger.state.y);
      let tremor: TremorPayload | null = null;

      const tLevel = p.state.upgrades.tremorSenseLevel;

      if (dist < BALANCE.TREMOR_THRESHOLDS.STRONG) {
        tremor = {
          intensity: 'extreme',
          direction: dir,
          message: tLevel >= 3
            ? `The ground shakes violently from the ${dir}! ${Math.round(dist)} tiles away!`
            : `The ground shakes violently from the ${dir}! They're right there!`,
        };
      } else if (dist < BALANCE.TREMOR_THRESHOLDS.MODERATE) {
        tremor = {
          intensity: 'strong',
          direction: dir,
          message: tLevel >= 2
            ? `Strong vibrations from the ${dir}! About ${Math.round(dist)} tiles away.`
            : `Strong vibrations from the ${dir}! They're getting close...`,
        };
      } else if (dist < BALANCE.TREMOR_THRESHOLDS.FAINT) {
        tremor = {
          intensity: 'moderate',
          direction: dir,
          message: `You feel vibrations from the ${dir}...`,
        };
      } else if (dist < BALANCE.TREMOR_THRESHOLDS.NONE) {
        tremor = {
          intensity: 'faint',
          direction: '',
          message: 'You feel faint vibrations...',
        };
      }

      if (tremor && p.socket?.emit) {
        p.lastTremorTime = now;
        p.socket.emit('message', { type: 'TREMOR', payload: tremor });
      }
    }
  }

  handleSonar(playerId: string) {
    if (this.phase !== GamePhase.DIGGING) return;
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
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;
        const nx = px + dx, ny = py + dy;
        if (nx < 0 || nx >= BALANCE.MAP_WIDTH || ny < 0 || ny >= BALANCE.MAP_HEIGHT) continue;
        const t = this.map[ny][nx];
        revealedTiles.push({ x: nx, y: ny, type: t.type, ore: t.ore });
      }
    }

    let enemyVisible = false;
    let enemyX: number | undefined, enemyY: number | undefined;

    for (const [id, p] of this.players) {
      if (id === playerId) continue;
      const dist = distance(px, py, p.state.x, p.state.y);
      if (dist <= radius) {
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

    const result: SonarResultPayload = { revealedTiles, enemyVisible, enemyX, enemyY };
    player.socket?.emit('message', { type: 'SONAR_RESULT', payload: result });
    player.socket?.emit('message', {
      type: 'PLAYER_STATE',
      payload: {
        x: player.state.x, y: player.state.y,
        resources: player.state.resources,
        upgrades: player.state.upgrades,
        sonarCooldownEnd: player.state.sonarCooldownEnd,
      },
    });
  }

  handleDynamite(playerId: string, tx: number, ty: number) {
    if (this.phase !== GamePhase.DIGGING) return;
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
          if (tile.type === TileType.BEDROCK) continue;
          if (tile.type === TileType.EMPTY) continue;

          const hadOre = tile.ore;
          tile.hp = 0;
          tile.type = TileType.EMPTY;
          player.state.tilesDug++;

          if (hadOre !== OreType.NONE) {
            this.collectOre(player.state, hadOre);
          }

          updates.push({
            x: nx, y: ny, hp: 0, broken: true, ore: hadOre, damageDealt: 999,
          });
          tile.ore = OreType.NONE;
        }
      }

      player.state.x = tx;
      player.state.y = ty;

      if (player.socket?.emit) {
        player.socket.emit('message', { type: 'TILE_BATCH_UPDATE', payload: { tiles: updates } });
        player.socket.emit('message', {
          type: 'PLAYER_STATE',
          payload: {
            x: player.state.x, y: player.state.y,
            resources: player.state.resources,
            upgrades: player.state.upgrades,
            tilesDug: player.state.tilesDug,
          },
        });
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

      this.checkCenterReached(playerId, tx, ty);
    }, BALANCE.DYNAMITE_FUSE_MS);

    player.socket?.emit('message', {
      type: 'PLAYER_STATE',
      payload: {
        x: player.state.x, y: player.state.y,
        resources: player.state.resources,
        upgrades: player.state.upgrades,
      },
    });
  }

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
        const nextLevel = u.tremorSenseLevel + 1;
        const next = BALANCE.UPGRADES.TREMOR_SENSE.find(t => t.level === nextLevel);
        if (next && canAfford(s.resources, next.cost as any)) {
          deductCost(s.resources, next.cost as any);
          u.tremorSenseLevel = nextLevel;
          success = true;
        }
        break;
      }
      case 'momentum': {
        const nextLevel = u.momentumLevel + 1;
        const next = BALANCE.UPGRADES.MOMENTUM[nextLevel];
        if (next && canAfford(s.resources, next.cost as any)) {
          deductCost(s.resources, next.cost as any);
          u.momentumLevel = nextLevel;
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

  checkCenterReached(playerId: string, tx: number, ty: number) {
    if (this.phase !== GamePhase.DIGGING) return;
    const cz = BALANCE.CENTER_ZONE;
    if (tx >= cz.x && tx < cz.x + cz.width && ty >= cz.y && ty < cz.y + cz.height) {
      this.startEncounter(playerId);
    }
  }

  startEncounter(triggerId: string) {
    this.phase = GamePhase.ENCOUNTER;
    const encounterType = this.pickEncounter();

    this.encounter = {
      type: encounterType,
      hp: 0,
      maxHp: 0,
      playersInZone: [triggerId],
      damageContribution: {},
    };

    let message = '';
    switch (encounterType) {
      case EncounterType.TREASURE_VAULT:
        this.encounter.hp = BALANCE.ENCOUNTER.VAULT_HP;
        this.encounter.maxHp = BALANCE.ENCOUNTER.VAULT_HP;
        message = 'A TREASURE VAULT has been discovered in the depths!';
        break;
      case EncounterType.GUARDIAN:
        this.encounter.hp = BALANCE.ENCOUNTER.GUARDIAN_HP;
        this.encounter.maxHp = BALANCE.ENCOUNTER.GUARDIAN_HP;
        message = 'A GUARDIAN stirs in the depths... you cannot face this alone.';
        this.startGuardianAttacks();
        break;
      case EncounterType.COLLAPSE:
        this.encounter.collapseRadius = 0;
        message = 'THE GROUND IS COLLAPSING!';
        this.startCollapse();
        break;
      case EncounterType.MIRROR:
        this.encounter.hp = BALANCE.ENCOUNTER.MIRROR_PLAYER_HP;
        this.encounter.maxHp = BALANCE.ENCOUNTER.MIRROR_PLAYER_HP;
        message = 'THE MIRROR SHATTERS! Face your rival!';
        for (const [, p] of this.players) {
          p.state.encounterHp = BALANCE.ENCOUNTER.MIRROR_PLAYER_HP;
        }
        break;
      case EncounterType.PORTAL:
        this.encounter.portalTimeLeft = BALANCE.ENCOUNTER.PORTAL_DURATION_MS;
        message = 'A PORTAL to the deep places opens...';
        this.startPortalTimer();
        break;
    }

    const payload: EncounterStartPayload = {
      type: encounterType,
      message,
      hp: this.encounter.hp,
      maxHp: this.encounter.maxHp,
    };
    this.broadcast({ type: 'ENCOUNTER_START', payload });
  }

  pickEncounter(): EncounterType {
    const weights = BALANCE.ENCOUNTER_WEIGHTS;
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    let r = Math.random() * total;

    for (const [key, w] of Object.entries(weights)) {
      r -= w;
      if (r <= 0) return key as EncounterType;
    }
    return EncounterType.TREASURE_VAULT;
  }

  handleEncounterAction(playerId: string, tx?: number, ty?: number) {
    if (this.phase !== GamePhase.ENCOUNTER || !this.encounter) return;
    const player = this.players.get(playerId);
    if (!player) return;

    if (player.state.knockedOut && Date.now() < player.state.knockoutEndTime) return;
    if (player.state.knockedOut && Date.now() >= player.state.knockoutEndTime) {
      player.state.knockedOut = false;
      player.state.encounterHp = Math.floor(BALANCE.ENCOUNTER.PLAYER_ENCOUNTER_HP * 0.5);
    }

    const damage = getPickaxeDamage(player.state.upgrades.pickaxeLevel);

    switch (this.encounter.type) {
      case EncounterType.TREASURE_VAULT:
      case EncounterType.GUARDIAN: {
        if (!this.encounter.playersInZone.includes(playerId)) {
          this.encounter.playersInZone.push(playerId);
        }
        this.encounter.hp -= damage;
        this.encounter.damageContribution![playerId] =
          (this.encounter.damageContribution![playerId] || 0) + damage;

        this.broadcast({
          type: 'ENCOUNTER_UPDATE',
          payload: {
            hp: Math.max(0, this.encounter.hp),
            maxHp: this.encounter.maxHp,
            damageContribution: this.encounter.damageContribution,
          },
        });

        if (this.encounter.hp <= 0) {
          this.endEncounter(playerId);
        }
        break;
      }
      case EncounterType.MIRROR: {
        for (const [id, p] of this.players) {
          if (id === playerId) continue;
          const reduction = BALANCE.UPGRADES.STEEL_BOOTS[p.state.upgrades.steelBootsLevel]?.reduction || 0;
          const actualDamage = Math.ceil(damage * (1 - reduction));
          p.state.encounterHp -= actualDamage;

          this.broadcast({
            type: 'MIRROR_DAMAGE',
            payload: {
              attackerId: playerId,
              targetId: id,
              damage: actualDamage,
              targetHp: Math.max(0, p.state.encounterHp),
            },
          });

          if (p.state.encounterHp <= 0) {
            this.endEncounter(playerId);
          }
        }
        break;
      }
      case EncounterType.COLLAPSE: {
        if (tx !== undefined && ty !== undefined) {
          this.handleDig(playerId, tx, ty);
          if (player.state.y <= 2) {
            this.endEncounter(playerId);
          }
        }
        break;
      }
      case EncounterType.PORTAL: {
        if (tx !== undefined && ty !== undefined) {
          this.handleDig(playerId, tx, ty);
        }
        break;
      }
    }
  }

  startGuardianAttacks() {
    this.encounterTimer = setInterval(() => {
      if (!this.encounter || this.encounter.type !== EncounterType.GUARDIAN) {
        if (this.encounterTimer) clearInterval(this.encounterTimer);
        return;
      }

      for (const pid of this.encounter.playersInZone) {
        const p = this.players.get(pid);
        if (!p || p.state.knockedOut) continue;

        const reduction = BALANCE.UPGRADES.STEEL_BOOTS[p.state.upgrades.steelBootsLevel]?.reduction || 0;
        const damage = Math.ceil(BALANCE.ENCOUNTER.GUARDIAN_ATTACK_DAMAGE * (1 - reduction));
        p.state.encounterHp -= damage;

        if (p.socket?.emit) {
          p.socket.emit('message', {
            type: 'GUARDIAN_ATTACK',
            payload: { damage, hp: Math.max(0, p.state.encounterHp) },
          });
        }

        if (p.state.encounterHp <= 0) {
          p.state.knockedOut = true;
          p.state.knockoutEndTime = Date.now() + BALANCE.ENCOUNTER.PLAYER_KNOCKOUT_DURATION_MS;
        }
      }

      const allKnockedOut = this.encounter.playersInZone.every(pid => {
        const p = this.players.get(pid);
        return p?.state.knockedOut;
      });

      if (allKnockedOut && this.encounter.playersInZone.length >= 2) {
        this.endEncounter(null);
      }
    }, BALANCE.ENCOUNTER.GUARDIAN_ATTACK_INTERVAL_MS);
  }

  startCollapse() {
    const cz = BALANCE.CENTER_ZONE;
    const centerX = cz.x + 1, centerY = cz.y + 1;

    this.collapseTimer = setInterval(() => {
      if (!this.encounter || this.encounter.type !== EncounterType.COLLAPSE) {
        if (this.collapseTimer) clearInterval(this.collapseTimer);
        return;
      }

      this.encounter.collapseRadius = (this.encounter.collapseRadius || 0) + 1;
      const r = this.encounter.collapseRadius;

      const collapsedTiles: Array<{ x: number; y: number }> = [];
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.sqrt(dx * dx + dy * dy) > r) continue;
          const nx = centerX + dx, ny = centerY + dy;
          if (nx < 0 || nx >= BALANCE.MAP_WIDTH || ny < 0 || ny >= BALANCE.MAP_HEIGHT) continue;
          if (this.map[ny][nx].type !== TileType.BEDROCK) {
            this.map[ny][nx].type = TileType.BEDROCK;
            this.map[ny][nx].hp = 9999;
            collapsedTiles.push({ x: nx, y: ny });
          }
        }
      }

      this.broadcast({
        type: 'COLLAPSE_UPDATE',
        payload: { radius: r, collapsedTiles },
      });

      for (const [id, p] of this.players) {
        const dist = distance(p.state.x, p.state.y, centerX, centerY);
        if (dist <= r) {
          this.endEncounter(this.getOtherPlayer(id));
          return;
        }
        if (p.state.y <= 2) {
          this.endEncounter(id);
          return;
        }
      }

      if (r > Math.max(BALANCE.MAP_WIDTH, BALANCE.MAP_HEIGHT)) {
        this.endEncounter(null);
      }
    }, 1000 / BALANCE.ENCOUNTER.COLLAPSE_SPEED_TILES_PER_SECOND);
  }

  startPortalTimer() {
    setTimeout(() => {
      if (this.encounter?.type === EncounterType.PORTAL) {
        this.endEncounter(null);
      }
    }, BALANCE.ENCOUNTER.PORTAL_DURATION_MS);
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
          if (this.map[ny][nx].type === TileType.EMPTY) {
            queue.push({ x: nx, y: ny });
          } else if (nx === toX && ny === toY) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private moveTowardTile(player: { state: PlayerState; socket: any }, tx: number, ty: number): boolean {
    const px = player.state.x, py = player.state.y;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = px + dx, ny = py + dy;
        if (nx < 0 || nx >= BALANCE.MAP_WIDTH || ny < 0 || ny >= BALANCE.MAP_HEIGHT) continue;
        if (this.map[ny][nx].type !== TileType.EMPTY) continue;
        const newDist = Math.abs(tx - nx) + Math.abs(ty - ny);
        if (newDist <= 1) {
          player.state.x = nx;
          player.state.y = ny;
          if (player.socket?.emit) {
            player.socket.emit('message', {
              type: 'PLAYER_STATE',
              payload: { x: nx, y: ny, resources: player.state.resources, upgrades: player.state.upgrades, tilesDug: player.state.tilesDug },
            });
          }
          return true;
        }
      }
    }

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = px + dx, ny = py + dy;
        if (nx < 0 || nx >= BALANCE.MAP_WIDTH || ny < 0 || ny >= BALANCE.MAP_HEIGHT) continue;
        if (this.map[ny][nx].type === TileType.EMPTY) {
          const oldDist = Math.abs(tx - px) + Math.abs(ty - py);
          const newDist = Math.abs(tx - nx) + Math.abs(ty - ny);
          if (newDist < oldDist) {
            player.state.x = nx;
            player.state.y = ny;
            if (player.socket?.emit) {
              player.socket.emit('message', {
                type: 'PLAYER_STATE',
                payload: { x: nx, y: ny, resources: player.state.resources, upgrades: player.state.upgrades, tilesDug: player.state.tilesDug },
              });
            }
            return this.moveTowardTile(player, tx, ty);
          }
        }
      }
    }
    return false;
  }

  getOtherPlayer(playerId: string): string | null {
    for (const [id] of this.players) {
      if (id !== playerId) return id;
    }
    return null;
  }

  endEncounter(winnerId: string | null) {
    if (this.gameOverSent) return;
    this.gameOverSent = true;
    this.phase = GamePhase.GAME_OVER;
    if (this.encounterTimer) clearInterval(this.encounterTimer);
    if (this.collapseTimer) clearInterval(this.collapseTimer);
    if (this.botTimer) clearInterval(this.botTimer);

    const encounterType = this.encounter?.type || EncounterType.TREASURE_VAULT;
    let reason = '';

    switch (encounterType) {
      case EncounterType.TREASURE_VAULT: reason = winnerId ? 'Cracked the vault!' : 'The vault remains sealed.'; break;
      case EncounterType.GUARDIAN: reason = winnerId ? 'Guardian defeated!' : 'The guardian prevails...'; break;
      case EncounterType.COLLAPSE: reason = winnerId ? 'Escaped the collapse!' : 'Buried alive...'; break;
      case EncounterType.MIRROR: reason = winnerId ? 'Victory in the mirror!' : 'Mutual destruction.'; break;
      case EncounterType.PORTAL: reason = 'Portal closed.'; break;
    }

    const elapsed = Date.now() - this.startTime;
    const stats: GameOverPayload['stats'] = [];

    for (const [id, p] of this.players) {
      const oreVal =
        p.state.resources.copper * BALANCE.XP.ORE_MULTIPLIER.COPPER +
        p.state.resources.iron * BALANCE.XP.ORE_MULTIPLIER.IRON +
        p.state.resources.gold * BALANCE.XP.ORE_MULTIPLIER.GOLD +
        p.state.resources.crystal * BALANCE.XP.ORE_MULTIPLIER.CRYSTAL +
        p.state.resources.emberStone * BALANCE.XP.ORE_MULTIPLIER.EMBER_STONE;

      const encBonus = BALANCE.XP.ENCOUNTER_BONUS[encounterType] || 0;
      const xp = BALANCE.XP.BASE_ROUND + p.state.tilesDug * BALANCE.XP.PER_TILE + oreVal +
        (id === winnerId ? encBonus : Math.floor(encBonus * 0.3));

      stats.push({
        playerId: id,
        tilesDug: p.state.tilesDug,
        oreCollected: { ...p.state.resources },
        timeMs: elapsed,
        damageDealt: this.encounter?.damageContribution?.[id] || 0,
        xpEarned: xp,
      });
    }

    const payload: GameOverPayload = {
      winnerId,
      reason,
      encounter: encounterType,
      stats,
    };

    this.broadcast({ type: 'GAME_OVER', payload });
  }

  broadcast(msg: { type: string; payload: any }) {
    for (const [, p] of this.players) {
      if (p.socket?.emit) {
        p.socket.emit('message', msg);
      }
    }
  }

  startBot() {
    let botId: string | null = null;
    for (const [id, p] of this.players) {
      if (!p.socket?.emit) { botId = id; break; }
    }
    if (!botId) return;

    const bot = this.players.get(botId)!;
    const targetX = BALANCE.CENTER_ZONE.x + 1;
    const targetY = BALANCE.CENTER_ZONE.y + 1;

    this.botTimer = setInterval(() => {
      if (this.phase !== GamePhase.DIGGING && this.phase !== GamePhase.ENCOUNTER) {
        if (this.botTimer) clearInterval(this.botTimer);
        return;
      }

      const bx = bot.state.x, by = bot.state.y;
      let dx = targetX - bx, dy = targetY - by;

      if (dx === 0 && dy === 0) return;

      let nx = bx, ny = by;
      const jitter = Math.random();
      if (jitter < 0.15) {
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

      if (tile.type === TileType.EMPTY) {
        bot.state.x = nx;
        bot.state.y = ny;
      } else {
        const damage = getPickaxeDamage(bot.state.upgrades.pickaxeLevel);
        tile.hp -= damage;
        if (tile.hp <= 0) {
          tile.hp = 0;
          if (tile.ore !== OreType.NONE) {
            this.collectOre(bot.state, tile.ore);
          }
          tile.type = TileType.EMPTY;
          tile.ore = OreType.NONE;
          bot.state.x = nx;
          bot.state.y = ny;
          bot.state.tilesDug++;
          this.checkTremor(botId!);
          this.checkCenterReached(botId!, nx, ny);
        }
      }

      this.tryBotUpgrades(bot.state);
    }, 500);
  }

  tryBotUpgrades(state: PlayerState) {
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

  removePlayer(socketId: string) {
    this.players.delete(socketId);
    if (this.phase !== GamePhase.GAME_OVER) {
      const remaining = Array.from(this.players.keys());
      if (remaining.length > 0 && !this.gameOverSent) {
        this.endEncounter(remaining[0]);
      }
    }
    if (this.botTimer) clearInterval(this.botTimer);
    if (this.encounterTimer) clearInterval(this.encounterTimer);
    if (this.collapseTimer) clearInterval(this.collapseTimer);
  }
}
