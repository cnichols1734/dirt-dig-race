import { Application, Container } from 'pixi.js';
import { GamePhase, TileType, OreType, OreNode, BotDifficulty } from '@dig/shared';
import { BALANCE } from '@dig/shared';
import { SCALED_TILE } from '../utils/constants';
import { GameMap } from './Map';
import { Player } from './Player';
import { Camera } from './Camera';
import { FogOfWar } from './Fog';
import { LightingSystem } from './Lighting';
import { ParticleSystem } from './Particles';
import { JuiceSystem } from './Juice';
import { SonarSystem } from './Sonar';
import { CombatSystem } from './Combat';
import { Minimap } from './Minimap';
import { audioManager } from './Audio';
import { socketManager } from '../network/Socket';

export type GameEventCallback = (event: string, data: any) => void;

export class GameManager {
  app: Application;
  worldContainer: Container;
  uiContainer: Container;
  gameMap: GameMap;
  player: Player;
  camera: Camera;
  fog: FogOfWar;
  lighting: LightingSystem;
  particles: ParticleSystem;
  juice: JuiceSystem;
  sonar: SonarSystem;
  combat: CombatSystem;
  minimap: Minimap;

  phase: GamePhase = GamePhase.LOBBY;
  playerId: string = '';
  playerIndex: number = 0;
  roomId: string = '';
  mapSeed: number = 0;
  startTime: number = 0;
  elapsedMs: number = 0;
  countdownValue: number = 3;

  nodes: OreNode[] = [];
  scores: Record<string, number> = {};
  pps: Record<string, number> = {};
  timeRemainingMs: number = 0;
  gameDurationMs: number = BALANCE.SCORING.GAME_DURATION_MS;

  private eventCallbacks: Set<GameEventCallback> = new Set();
  private lastClickTime: number = 0;
  private clickCount: number = 0;
  private initialized = false;
  private caveInCount: number = 0;

  constructor(app: Application) {
    this.app = app;
    this.worldContainer = new Container();
    this.uiContainer = new Container();

    this.gameMap = new GameMap();
    this.player = new Player();
    this.camera = new Camera(this.worldContainer);
    this.fog = new FogOfWar(BALANCE.MAP_WIDTH, BALANCE.MAP_HEIGHT);
    this.lighting = new LightingSystem();
    this.particles = new ParticleSystem();
    this.juice = new JuiceSystem();
    this.sonar = new SonarSystem();
    this.combat = new CombatSystem();
    this.minimap = new Minimap();

    this.app.stage.addChild(this.worldContainer);
    this.app.stage.addChild(this.uiContainer);

    this.worldContainer.addChild(this.gameMap.container);
    this.worldContainer.addChild(this.gameMap.nodeContainer);
    this.worldContainer.addChild(this.sonar.container);
    this.worldContainer.addChild(this.player.container);
    this.worldContainer.addChild(this.combat.container);
    this.worldContainer.addChild(this.lighting.container);
    this.worldContainer.addChild(this.particles.container);
    this.worldContainer.addChild(this.fog.container);
    this.uiContainer.addChild(this.juice.container);
    this.uiContainer.addChild(this.minimap.container);

    this.camera.setScreenSize(app.screen.width, app.screen.height);

    this.setupInput();
    this.setupNetworkHandlers();
    this.startGameLoop();
    this.initialized = true;
  }

  onEvent(cb: GameEventCallback) { this.eventCallbacks.add(cb); }
  offEvent(cb: GameEventCallback) { this.eventCallbacks.delete(cb); }

  private emit(event: string, data: any = {}) {
    for (const cb of this.eventCallbacks) cb(event, data);
  }

  private setupInput() {
    const canvas = this.app.canvas;

    const handleInteraction = (clientX: number, clientY: number) => {
      if (this.phase !== GamePhase.DIGGING) return;
      audioManager.init();

      const now = Date.now();
      if (now - this.lastClickTime < 60) {
        this.clickCount++;
        if (this.clickCount > BALANCE.MAX_CLICKS_PER_SECOND) return;
      } else {
        this.clickCount = 1;
        this.lastClickTime = now;
      }

      const rect = canvas.getBoundingClientRect();
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;
      const world = this.camera.screenToWorld(sx, sy);
      const tilePos = this.gameMap.worldToTile(world.x, world.y);

      const node = this.gameMap.getNodeAtTile(tilePos.x, tilePos.y, this.nodes);
      if (node) {
        const dx = this.player.x - node.x;
        const dy = this.player.y - node.y;
        const playerDist = Math.sqrt(dx * dx + dy * dy);
        if (playerDist <= BALANCE.NODES.CAPTURE_RANGE) {
          socketManager.send({ type: 'CLAIM_NODE', payload: { nodeId: node.id } });
          return;
        }
      }

      socketManager.send({ type: 'DIG', payload: { tileX: tilePos.x, tileY: tilePos.y } });
    };

    canvas.addEventListener('click', (e: MouseEvent) => {
      handleInteraction(e.clientX, e.clientY);
    });

    canvas.addEventListener('touchstart', (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      const touch = e.touches[0];
      if (touch) handleInteraction(touch.clientX, touch.clientY);
    }, { passive: false });

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'q' || e.key === 'Q') {
        if (this.phase === GamePhase.DIGGING) {
          socketManager.send({ type: 'USE_SONAR', payload: {} });
        }
      }
      if (e.key === 'e' || e.key === 'E') {
        if (this.phase === GamePhase.DIGGING) {
          socketManager.send({ type: 'USE_DYNAMITE', payload: { tileX: this.player.x, tileY: this.player.y } });
          audioManager.playDynamiteFuse();
        }
      }
      if (e.key === 'f' || e.key === 'F') {
        if (this.phase === GamePhase.DIGGING) {
          socketManager.send({ type: 'ATTACK', payload: {} });
        }
      }
      if (e.key === 'u' || e.key === 'U') {
        this.emit('toggleUpgrades', {});
      }
      if (e.key === 'Escape') {
        this.emit('closeUpgrades', {});
      }
    });

    canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      this.camera.adjustZoom(delta);
    }, { passive: false });

    window.addEventListener('resize', () => {
      this.camera.setScreenSize(window.innerWidth, window.innerHeight);
    });
  }

  private setupNetworkHandlers() {
    socketManager.onAny((msg) => {
      switch (msg.type) {
        case 'MATCH_FOUND': {
          const p = msg.payload;
          this.playerId = p.playerId;
          this.playerIndex = p.playerIndex;
          this.roomId = p.roomId;
          this.mapSeed = p.mapSeed;
          this.nodes = p.nodes;
          this.gameDurationMs = p.gameDurationMs;
          this.timeRemainingMs = p.gameDurationMs;
          this.phase = GamePhase.COUNTDOWN;
          this.caveInCount = 0;
          this.scores = {};
          this.pps = {};

          this.fog.reset();
          this.minimap.reset();
          this.juice.setCaveInIntensity(0);

          this.gameMap.generate(p.mapSeed);
          this.gameMap.buildSprites();
          this.gameMap.setLocalPlayerId(this.playerId);
          this.gameMap.buildNodeSprites(this.nodes, this.playerIndex);

          this.player.setPosition(p.spawnX, p.spawnY);
          this.camera.lookAt(p.spawnX, p.spawnY);
          this.camera.currentX = p.spawnX * SCALED_TILE + SCALED_TILE / 2;
          this.camera.currentY = p.spawnY * SCALED_TILE + SCALED_TILE / 2;

          this.revealSpawnArea(p.spawnX, p.spawnY);
          this.lighting.updateLantern(p.spawnX, p.spawnY, 1);
          this.lighting.updateOreGlows(this.gameMap.tiles, this.fog.revealed);

          this.emit('matchFound', { opponentName: p.opponentName });
          break;
        }

        case 'COUNTDOWN': {
          this.countdownValue = msg.payload.count;
          this.emit('countdown', { count: msg.payload.count });
          break;
        }

        case 'GAME_START': {
          this.phase = GamePhase.DIGGING;
          this.startTime = Date.now();
          audioManager.init();
          this.emit('gameStart', {});
          break;
        }

        case 'TILE_UPDATE': {
          const t = msg.payload;
          const tile = this.gameMap.getTile(t.x, t.y);
          if (!tile) break;

          const prevType = tile.type;
          const wx = t.x * SCALED_TILE + SCALED_TILE / 2;
          const wy = t.y * SCALED_TILE + SCALED_TILE / 2;

          if (t.broken) {
            this.gameMap.updateTile(t.x, t.y, 0, true);
            this.particles.tileBreak(wx, wy, prevType);
            this.camera.shake(6 + t.damageDealt * 0.5, 200);
            this.camera.microZoom(0.02, 200);
            this.juice.freezeFrame(33);
            this.lighting.flashBreak(wx, wy);
            audioManager.playBreak(prevType, this.player.x);

            this.fog.revealAround(t.x, t.y, this.player.upgrades.lanternLevel);
            this.lighting.updateLantern(this.player.x, this.player.y, this.player.upgrades.lanternLevel);
            this.lighting.updateOreGlows(this.gameMap.tiles, this.fog.revealed);
            this.minimap.markDirty();

            if (t.ore !== OreType.NONE && t.ore !== undefined) {
              this.particles.oreCollect(wx, wy, t.ore);
              audioManager.playOreCollect(t.ore);
              this.emit('oreCollected', { ore: t.ore });
            }
          } else {
            this.gameMap.updateTile(t.x, t.y, t.hp, false);
            this.particles.digDust(wx, wy, prevType);
            this.camera.shake(2 + t.damageDealt * 0.3, 100);
            this.lighting.flashHit(wx, wy);
            audioManager.playDig(prevType, this.player.x);
            this.juice.spawnDamageNumber(wx, wy, t.damageDealt);
          }
          break;
        }

        case 'TILE_BATCH_UPDATE': {
          const tiles = msg.payload.tiles;
          if (tiles.length > 0) {
            const wx = tiles[0].x * SCALED_TILE + SCALED_TILE / 2;
            const wy = tiles[0].y * SCALED_TILE + SCALED_TILE / 2;
            this.particles.dynamiteExplosion(wx, wy);
            this.camera.shake(15, 400);
            this.juice.flash(0xFF4500, 0.4, 200);
            audioManager.playExplosion();
          }
          for (const t of tiles) {
            this.gameMap.updateTile(t.x, t.y, 0, true);
            this.fog.revealAround(t.x, t.y, this.player.upgrades.lanternLevel);
          }
          this.lighting.updateLantern(this.player.x, this.player.y, this.player.upgrades.lanternLevel);
          this.lighting.updateOreGlows(this.gameMap.tiles, this.fog.revealed);
          break;
        }

        case 'PLAYER_STATE': {
          this.player.updateState(msg.payload);
          this.camera.lookAt(this.player.x, this.player.y);
          this.lighting.updateLantern(this.player.x, this.player.y, this.player.upgrades.lanternLevel);
          this.emit('playerState', msg.payload);
          break;
        }

        case 'UPGRADE_RESULT': {
          if (msg.payload.success) audioManager.playUpgrade();
          this.player.upgrades = msg.payload.upgrades;
          this.player.resources = msg.payload.resources;
          this.emit('upgradeResult', msg.payload);
          break;
        }

        case 'TREMOR': {
          this.particles.tremorShake();
          this.camera.shake(3, 300);
          audioManager.playTremor();
          this.emit('tremor', msg.payload);
          break;
        }

        case 'SONAR_RESULT': {
          const sr = msg.payload;
          const px = this.player.x, py = this.player.y;
          const wx = px * SCALED_TILE + SCALED_TILE / 2;
          const wy = py * SCALED_TILE + SCALED_TILE / 2;

          this.sonar.ping(px, py);
          this.particles.sonarPulse(wx, wy, BALANCE.SONAR_RADIUS);
          audioManager.playSonar();
          this.fog.sonarReveal(sr.revealedTiles, BALANCE.SONAR_DURATION_MS);

          if (sr.enemyVisible && sr.enemyX !== undefined && sr.enemyY !== undefined) {
            this.sonar.showEnemyBlip(sr.enemyX, sr.enemyY);
            this.particles.enemyBlip(
              sr.enemyX * SCALED_TILE + SCALED_TILE / 2,
              sr.enemyY * SCALED_TILE + SCALED_TILE / 2,
            );
          }
          break;
        }

        case 'SONAR_ALERT': {
          this.juice.flash(0x00CED1, 0.15, 300);
          this.emit('sonarAlert', msg.payload);
          break;
        }

        case 'DYNAMITE_ALERT': {
          this.camera.shake(4, 200);
          audioManager.playTremor();
          this.emit('dynamiteAlert', msg.payload);
          break;
        }

        case 'NODE_UPDATE': {
          const nodeData = msg.payload.node;
          const idx = this.nodes.findIndex(n => n.id === nodeData.id);
          if (idx >= 0) {
            this.nodes[idx] = nodeData;
          } else {
            this.nodes.push(nodeData);
          }
          this.gameMap.updateNodes(this.nodes, this.playerIndex);
          this.emit('nodeUpdate', nodeData);
          break;
        }

        case 'NODE_CLAIMED': {
          const nc = msg.payload;
          let node = this.nodes.find(n => n.id === nc.nodeId);
          if (node) {
            node.ownerId = nc.ownerId;
            node.claimProgress = node.claimMax;
          }
          this.gameMap.updateNodes(this.nodes, this.playerIndex);

          if (nc.ownerId === this.playerId) {
            this.juice.flash(0x4488FF, 0.2, 200);
            audioManager.playOreCollect(OreType.CRYSTAL);
          } else {
            this.juice.flash(0xFF4444, 0.15, 200);
          }
          this.emit('nodeClaimed', nc);
          break;
        }

        case 'NODE_CONTESTED': {
          this.camera.shake(3, 200);
          this.emit('nodeContested', msg.payload);
          break;
        }

        case 'NODE_LOST': {
          const nl = msg.payload;
          const node = this.nodes.find(n => n.id === nl.nodeId);
          if (node) {
            node.ownerId = null;
            node.claimProgress = 0;
          }
          this.gameMap.updateNodes(this.nodes, this.playerIndex);
          this.emit('nodeLost', nl);
          break;
        }

        case 'SCORE_UPDATE': {
          this.scores = msg.payload.scores;
          this.pps = msg.payload.pps;
          this.timeRemainingMs = msg.payload.timeRemainingMs;
          this.emit('scoreUpdate', msg.payload);
          break;
        }

        case 'VEIN_RUSH': {
          const vr = msg.payload;
          const node = this.nodes.find(n => n.id === vr.nodeId);
          if (node) {
            node.supercharged = true;
            const wx = node.x * SCALED_TILE + SCALED_TILE / 2;
            const wy = node.y * SCALED_TILE + SCALED_TILE / 2;
            this.particles.treasureBurst(wx, wy);
          }
          this.gameMap.updateNodes(this.nodes, this.playerIndex);
          this.juice.flash(0xFFD700, 0.2, 300);
          this.camera.shake(5, 300);
          this.emit('veinRush', vr);
          break;
        }

        case 'TREMOR_SURGE': {
          const ts = msg.payload;
          this.juice.flash(0xFFFFFF, 0.15, 200);
          this.camera.shake(6, 400);
          for (const p of ts.players) {
            if (p.id !== this.playerId) {
              const wx = p.x * SCALED_TILE + SCALED_TILE / 2;
              const wy = p.y * SCALED_TILE + SCALED_TILE / 2;
              this.combat.showOpponent(wx, wy, 50, 50);
              this.sonar.showEnemyBlip(p.x, p.y);
              this.minimap.showOpponentBlip(p.x, p.y, ts.durationMs);
              setTimeout(() => this.combat.hideOpponent(), ts.durationMs);
            }
          }
          this.emit('tremorSurge', ts);
          break;
        }

        case 'PLAYER_HIT': {
          const ph = msg.payload;
          if (ph.targetId === this.playerId) {
            this.player.hp = ph.targetHp;
            this.player.triggerDamageFlash();
            this.camera.shake(6, 200);
            this.juice.flash(0xFF0000, 0.25, 150);
          }
          this.juice.spawnDamageNumber(
            this.player.x * SCALED_TILE + SCALED_TILE / 2,
            this.player.y * SCALED_TILE - 10,
            ph.damage,
            ph.targetId === this.playerId ? 0xFF4444 : 0xFFFFFF,
          );
          this.emit('playerHit', ph);
          break;
        }

        case 'PLAYER_KNOCKED_OUT': {
          const ko = msg.payload;
          if (ko.playerId === this.playerId) {
            this.player.setKnockedOut(true);
            this.combat.showKnockout(ko.respawnMs);
            this.camera.shake(12, 500);
            this.juice.flash(0xFF0000, 0.4, 400);
          }
          this.emit('playerKnockedOut', ko);
          break;
        }

        case 'PLAYER_RESPAWNED': {
          const pr = msg.payload;
          if (pr.playerId === this.playerId) {
            this.player.setKnockedOut(false);
            this.player.hp = BALANCE.COMBAT.PLAYER_HP;
            this.combat.clearKnockout();
            this.juice.flash(0x4488FF, 0.2, 200);
          }
          this.emit('playerRespawned', pr);
          break;
        }

        case 'OPPONENT_TILE_UPDATE': {
          const ot = msg.payload;
          const tile = this.gameMap.getTile(ot.x, ot.y);
          if (!tile) break;
          const prevType = tile.type;
          const wx = ot.x * SCALED_TILE + SCALED_TILE / 2;
          const wy = ot.y * SCALED_TILE + SCALED_TILE / 2;

          if (ot.broken) {
            this.gameMap.updateTile(ot.x, ot.y, 0, true);
            this.particles.tileBreak(wx, wy, prevType);
            this.fog.revealTile(ot.x, ot.y);
          } else {
            this.gameMap.updateTile(ot.x, ot.y, ot.hp, false);
          }
          break;
        }

        case 'OPPONENT_POSITION': {
          const op = msg.payload;
          const wx = op.x * SCALED_TILE + SCALED_TILE / 2;
          const wy = op.y * SCALED_TILE + SCALED_TILE / 2;
          this.combat.showOpponent(wx, wy, op.hp || 50, op.maxHp || 50);
          if (this.fog.isRevealed(op.x, op.y)) {
            this.minimap.showOpponentBlip(op.x, op.y, 2000);
          }
          this.emit('opponentPosition', op);
          break;
        }

        case 'CAVE_IN': {
          const ci = msg.payload;
          this.caveInCount++;
          this.camera.shake(8, 400);
          audioManager.playTremor();
          for (const ct of ci.collapsedTiles) {
            this.gameMap.collapseTile(ct.x, ct.y);
            const wx = ct.x * SCALED_TILE + SCALED_TILE / 2;
            const wy = ct.y * SCALED_TILE + SCALED_TILE / 2;
            this.particles.collapseDust(wx, wy);
          }
          this.fog.markDirty();
          this.juice.setCaveInIntensity(Math.min(1, this.caveInCount * 0.15));
          this.gameMap.updateNodes(this.nodes, this.playerIndex);
          this.emit('caveIn', ci);
          break;
        }

        case 'GAME_OVER': {
          this.phase = GamePhase.GAME_OVER;
          const go = msg.payload;
          if (go.winnerId === this.playerId) {
            audioManager.playVictory();
          } else {
            audioManager.playDefeat();
          }
          this.combat.clearKnockout();
          this.emit('gameOver', go);
          break;
        }

        case 'ERROR': {
          console.error('[Game] Server error:', msg.payload);
          break;
        }
      }
    });
  }

  joinQueue() {
    socketManager.connect();
    setTimeout(() => {
      socketManager.send({ type: 'JOIN_QUEUE', payload: {} });
      this.emit('queueJoined', {});
    }, 500);
  }

  leaveQueue() {
    socketManager.send({ type: 'LEAVE_QUEUE', payload: {} });
  }

  playBot(difficulty: BotDifficulty = BotDifficulty.MEDIUM) {
    socketManager.connect();
    setTimeout(() => {
      socketManager.send({ type: 'PLAY_BOT', payload: { difficulty } });
    }, 500);
  }

  purchaseUpgrade(upgradeId: string) {
    socketManager.send({ type: 'PURCHASE_UPGRADE', payload: { upgradeId } });
  }

  useSonar() {
    if (this.phase === GamePhase.DIGGING) {
      socketManager.send({ type: 'USE_SONAR', payload: {} });
    }
  }

  useDynamite() {
    if (this.phase === GamePhase.DIGGING) {
      socketManager.send({ type: 'USE_DYNAMITE', payload: { tileX: this.player.x, tileY: this.player.y } });
      audioManager.playDynamiteFuse();
    }
  }

  attack() {
    if (this.phase === GamePhase.DIGGING) {
      socketManager.send({ type: 'ATTACK', payload: {} });
    }
  }

  private startGameLoop() {
    this.app.ticker.add((ticker) => {
      const dt = ticker.deltaMS;

      if (this.juice.isFrozen) {
        this.juice.update(dt);
        return;
      }

      if (this.phase === GamePhase.DIGGING) {
        this.elapsedMs = Date.now() - this.startTime;
        this.player.update(dt);
        this.gameMap.update(dt);
        this.gameMap.updateNodes(this.nodes, this.playerIndex);

        const px = this.player.x * SCALED_TILE + SCALED_TILE / 2;
        const py = this.player.y * SCALED_TILE + SCALED_TILE / 2;
        this.particles.ambientDust(px, py);
        this.particles.lanternEmbers(px, py);

        for (const key of this.fog.revealed) {
          const [xs, ys] = key.split(',');
          const x = parseInt(xs), y = parseInt(ys);
          const tile = this.gameMap.getTile(x, y);
          if (tile?.type === TileType.CRYSTAL_WALL) {
            this.particles.crystalGlow(
              x * SCALED_TILE + SCALED_TILE / 2,
              y * SCALED_TILE + SCALED_TILE / 2,
            );
          }
        }

        this.minimap.updatePlayer(this.player.x, this.player.y);
        this.minimap.update(dt, this.fog.revealed, this.gameMap.tiles);
      }

      this.camera.update(dt);
      this.fog.update(dt);
      this.lighting.update(dt);
      this.particles.update(dt);
      this.juice.update(dt);
      this.sonar.update(dt);
      this.combat.update(dt);
    });
  }

  private revealSpawnArea(sx: number, sy: number) {
    this.fog.revealAround(sx, sy, 3);
    const visited = new Set<string>();
    const queue: Array<{ x: number; y: number }> = [{ x: sx, y: sy }];
    visited.add(`${sx},${sy}`);

    while (queue.length > 0) {
      const { x, y } = queue.shift()!;
      this.fog.revealTile(x, y);

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx, ny = y + dy;
          const key = `${nx},${ny}`;
          if (visited.has(key)) continue;
          if (nx < 0 || nx >= this.gameMap.width || ny < 0 || ny >= this.gameMap.height) continue;
          visited.add(key);
          const tile = this.gameMap.getTile(nx, ny);
          if (tile && (tile.type === TileType.EMPTY || tile.type === TileType.NODE_FLOOR)) {
            queue.push({ x: nx, y: ny });
          }
        }
      }
    }
  }

  getState() {
    return {
      phase: this.phase,
      playerId: this.playerId,
      playerIndex: this.playerIndex,
      player: this.player,
      elapsedMs: this.elapsedMs,
      countdownValue: this.countdownValue,
      nodes: this.nodes,
      scores: this.scores,
      pps: this.pps,
      timeRemainingMs: this.timeRemainingMs,
    };
  }
}
