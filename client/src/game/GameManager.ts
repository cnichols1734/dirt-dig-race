import { Application, Container, Graphics, Text } from 'pixi.js';
import { GamePhase, TileType, OreType, EncounterType } from '@dig/shared';
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

  phase: GamePhase = GamePhase.LOBBY;
  playerId: string = '';
  roomId: string = '';
  mapSeed: number = 0;
  startTime: number = 0;
  elapsedMs: number = 0;
  countdownValue: number = 3;

  private centerIndicator: Container;
  private centerArrow: Graphics;
  private centerDistText: Text;
  private centerBeacon: Graphics;
  private beaconPhase: number = 0;

  private opponentIndicator: Container;
  private opponentArrow: Graphics;
  private opponentDot: Graphics;
  private lastKnownOpponentX: number = -1;
  private lastKnownOpponentY: number = -1;
  private opponentIndicatorLife: number = 0;

  private eventCallbacks: Set<GameEventCallback> = new Set();
  private lastClickTime: number = 0;
  private clickCount: number = 0;
  private initialized = false;

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

    this.app.stage.addChild(this.worldContainer);
    this.app.stage.addChild(this.uiContainer);

    this.worldContainer.addChild(this.gameMap.container);
    this.worldContainer.addChild(this.sonar.container);
    this.worldContainer.addChild(this.player.container);
    this.worldContainer.addChild(this.combat.container);
    this.worldContainer.addChild(this.lighting.container);
    this.worldContainer.addChild(this.particles.container);
    this.worldContainer.addChild(this.fog.container);
    this.uiContainer.addChild(this.juice.container);

    this.centerBeacon = new Graphics();
    this.worldContainer.addChild(this.centerBeacon);

    this.centerIndicator = new Container();
    this.centerArrow = new Graphics();
    this.centerDistText = new Text({
      text: '',
      style: {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: 10,
        fill: 0x00CED1,
        stroke: { color: 0x000000, width: 3 },
      },
    });
    this.centerDistText.anchor.set(0.5, 0);
    this.centerIndicator.addChild(this.centerArrow);
    this.centerIndicator.addChild(this.centerDistText);
    this.centerIndicator.visible = false;
    this.uiContainer.addChild(this.centerIndicator);

    this.opponentIndicator = new Container();
    this.opponentArrow = new Graphics();
    this.opponentDot = new Graphics();
    this.opponentIndicator.addChild(this.opponentArrow);
    this.opponentIndicator.addChild(this.opponentDot);
    this.opponentIndicator.visible = false;
    this.uiContainer.addChild(this.opponentIndicator);

    this.camera.setScreenSize(app.screen.width, app.screen.height);

    this.setupInput();
    this.setupNetworkHandlers();
    this.startGameLoop();
    this.initialized = true;
  }

  onEvent(cb: GameEventCallback) {
    this.eventCallbacks.add(cb);
  }

  offEvent(cb: GameEventCallback) {
    this.eventCallbacks.delete(cb);
  }

  private emit(event: string, data: any = {}) {
    for (const cb of this.eventCallbacks) {
      cb(event, data);
    }
  }

  private setupInput() {
    const canvas = this.app.canvas;

    canvas.addEventListener('click', (e: MouseEvent) => {
      if (this.phase !== GamePhase.DIGGING && this.phase !== GamePhase.ENCOUNTER) return;

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
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const world = this.camera.screenToWorld(sx, sy);
      const tilePos = this.gameMap.worldToTile(world.x, world.y);

      if (this.phase === GamePhase.ENCOUNTER && this.combat.active) {
        if (this.combat.encounterType === EncounterType.COLLAPSE) {
          socketManager.send({ type: 'ENCOUNTER_ACTION', payload: { tileX: tilePos.x, tileY: tilePos.y } });
        } else if (this.combat.encounterType === EncounterType.PORTAL) {
          socketManager.send({ type: 'ENCOUNTER_ACTION', payload: { tileX: tilePos.x, tileY: tilePos.y } });
        } else {
          socketManager.send({ type: 'ENCOUNTER_ACTION', payload: {} });
          const cz = BALANCE.CENTER_ZONE;
          const cwx = (cz.x + cz.width / 2) * SCALED_TILE;
          const cwy = (cz.y + cz.height / 2) * SCALED_TILE;
          this.particles.digDust(cwx, cwy, TileType.CRYSTAL_WALL);
          this.camera.shake(3, 80);
          this.player.triggerDig(cz.x + 1, cz.y + 1);
          audioManager.playDig(TileType.CRYSTAL_WALL);
        }
        return;
      }

      this.player.triggerDig(tilePos.x, tilePos.y);
      socketManager.send({ type: 'DIG', payload: { tileX: tilePos.x, tileY: tilePos.y } });
    });

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'q' || e.key === 'Q') {
        if (this.phase === GamePhase.DIGGING) {
          socketManager.send({ type: 'USE_SONAR', payload: {} });
        }
      }
      if (e.key === 'e' || e.key === 'E') {
        if (this.phase === GamePhase.DIGGING) {
          const tx = this.player.x;
          const ty = this.player.y;
          socketManager.send({ type: 'USE_DYNAMITE', payload: { tileX: tx, tileY: ty } });
          audioManager.playDynamiteFuse();
        }
      }
      if (e.key === 'u' || e.key === 'U') {
        this.emit('toggleUpgrades', {});
      }
      if (e.key === 'Escape') {
        this.emit('closeUpgrades', {});
      }
    });

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
          this.roomId = p.roomId;
          this.mapSeed = p.mapSeed;
          this.phase = GamePhase.COUNTDOWN;

          this.gameMap.generate(p.mapSeed);
          this.gameMap.buildSprites();

          this.player.setPosition(p.spawnX, p.spawnY);
          this.camera.lookAt(p.spawnX, p.spawnY);
          this.camera.currentX = p.spawnX * SCALED_TILE + SCALED_TILE / 2;
          this.camera.currentY = p.spawnY * SCALED_TILE + SCALED_TILE / 2;

          this.revealSpawnArea(p.spawnX, p.spawnY);
          this.lighting.updateLantern(p.spawnX, p.spawnY, 1);
          this.lighting.updateOreGlows(this.gameMap.tiles, this.fog.revealed);

          this.drawCenterBeacon();

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
          this.centerIndicator.visible = true;
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
            this.player.triggerImpact();
            audioManager.playBreak(prevType, this.player.x);

            this.fog.revealAround(t.x, t.y, this.player.upgrades.lanternLevel);
            this.lighting.updateLantern(this.player.x, this.player.y, this.player.upgrades.lanternLevel);
            this.lighting.updateOreGlows(this.gameMap.tiles, this.fog.revealed);

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

        case 'RESOURCE_UPDATE': {
          this.player.resources = msg.payload;
          this.emit('resourceUpdate', msg.payload);
          break;
        }

        case 'UPGRADE_RESULT': {
          if (msg.payload.success) {
            audioManager.playUpgrade();
          }
          this.player.upgrades = msg.payload.upgrades;
          this.player.resources = msg.payload.resources;
          this.emit('upgradeResult', msg.payload);
          break;
        }

        case 'TREMOR': {
          this.particles.tremorShake();
          this.camera.shake(3, 300);
          audioManager.playTremor();

          const dir = msg.payload.direction;
          if (dir) {
            this.showOpponentDirection(dir);
          }
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
            this.lastKnownOpponentX = sr.enemyX;
            this.lastKnownOpponentY = sr.enemyY;
            this.opponentIndicatorLife = 5000;
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

        case 'ENCOUNTER_START': {
          this.phase = GamePhase.ENCOUNTER;
          const es = msg.payload;
          this.combat.startEncounter(es.type, es.hp || 0, es.maxHp || 0);
          audioManager.playEncounterReveal();
          this.camera.shake(10, 500);
          this.juice.flash(0xFFFFFF, 0.3, 300);
          this.centerIndicator.visible = false;
          this.emit('encounterStart', es);
          break;
        }

        case 'ENCOUNTER_UPDATE': {
          this.combat.updateHp(msg.payload.hp, msg.payload.maxHp);
          this.emit('encounterUpdate', msg.payload);
          break;
        }

        case 'GUARDIAN_ATTACK': {
          this.camera.shake(8, 300);
          this.juice.flash(0xFF0000, 0.3, 200);
          audioManager.playGuardianAttack();
          this.player.encounterHp = msg.payload.hp;
          this.emit('guardianAttack', msg.payload);
          break;
        }

        case 'MIRROR_DAMAGE': {
          this.camera.shake(4, 150);
          this.emit('mirrorDamage', msg.payload);
          break;
        }

        case 'COLLAPSE_UPDATE': {
          const cu = msg.payload;
          this.camera.shake(5, 200);
          for (const ct of cu.collapsedTiles) {
            this.gameMap.updateTile(ct.x, ct.y, 9999, false);
            const wx = ct.x * SCALED_TILE + SCALED_TILE / 2;
            const wy = ct.y * SCALED_TILE + SCALED_TILE / 2;
            this.particles.collapseDust(wx, wy);
          }
          this.emit('collapseUpdate', cu);
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
          this.combat.endEncounter();
          this.centerIndicator.visible = false;
          this.opponentIndicator.visible = false;
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

  private showOpponentDirection(direction: string) {
    const dirMap: Record<string, [number, number]> = {
      'north': [0, -1], 'south': [0, 1],
      'east': [1, 0], 'west': [-1, 0],
      'northeast': [1, -1], 'northwest': [-1, -1],
      'southeast': [1, 1], 'southwest': [-1, 1],
    };
    const dir = dirMap[direction.toLowerCase()];
    if (!dir) return;

    const estimatedDist = 15;
    this.lastKnownOpponentX = this.player.x + dir[0] * estimatedDist;
    this.lastKnownOpponentY = this.player.y + dir[1] * estimatedDist;
    this.opponentIndicatorLife = 4000;
  }

  private drawCenterBeacon() {
    const cz = BALANCE.CENTER_ZONE;
    const cx = (cz.x + cz.width / 2) * SCALED_TILE;
    const cy = (cz.y + cz.height / 2) * SCALED_TILE;
    this.centerBeacon.x = cx;
    this.centerBeacon.y = cy;
  }

  private updateCenterBeacon(dt: number) {
    this.beaconPhase += dt * 0.003;
    this.centerBeacon.clear();

    const pulse = 0.5 + Math.sin(this.beaconPhase) * 0.3;
    const pulse2 = 0.5 + Math.sin(this.beaconPhase * 1.3 + 1) * 0.3;

    for (let i = 3; i >= 0; i--) {
      const r = (i + 1) * 20 + Math.sin(this.beaconPhase + i) * 5;
      this.centerBeacon.circle(0, 0, r);
      this.centerBeacon.fill({ color: 0x00CED1, alpha: (0.03 + pulse * 0.02) * (1 - i * 0.2) });
    }

    this.centerBeacon.circle(0, 0, 8 + Math.sin(this.beaconPhase * 2) * 2);
    this.centerBeacon.fill({ color: 0x00CED1, alpha: 0.15 + pulse2 * 0.1 });

    const rays = 6;
    for (let i = 0; i < rays; i++) {
      const angle = (i / rays) * Math.PI * 2 + this.beaconPhase * 0.5;
      const len = 30 + Math.sin(this.beaconPhase * 2 + i) * 10;
      this.centerBeacon.moveTo(0, 0);
      this.centerBeacon.lineTo(Math.cos(angle) * len, Math.sin(angle) * len);
      this.centerBeacon.stroke({ color: 0x00CED1, width: 1, alpha: 0.08 + pulse * 0.05 });
    }
  }

  private updateCenterIndicator() {
    if (this.phase !== GamePhase.DIGGING) return;

    const cz = BALANCE.CENTER_ZONE;
    const centerTileX = cz.x + cz.width / 2;
    const centerTileY = cz.y + cz.height / 2;

    const dx = centerTileX - this.player.x;
    const dy = centerTileY - this.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const centerScreenX = this.camera.screenWidth / 2 + (centerTileX * SCALED_TILE + SCALED_TILE / 2 - this.camera.currentX) * this.camera.zoom;
    const centerScreenY = this.camera.screenHeight / 2 + (centerTileY * SCALED_TILE + SCALED_TILE / 2 - this.camera.currentY) * this.camera.zoom;

    const margin = 60;
    const onScreen = centerScreenX > margin && centerScreenX < this.camera.screenWidth - margin &&
                     centerScreenY > margin && centerScreenY < this.camera.screenHeight - margin;

    if (onScreen && dist < 8) {
      this.centerIndicator.visible = false;
      return;
    }

    this.centerIndicator.visible = true;

    const angle = Math.atan2(dy, dx);
    const edgeMargin = 50;
    const hw = this.camera.screenWidth / 2 - edgeMargin;
    const hh = this.camera.screenHeight / 2 - edgeMargin;

    let indicatorX = this.camera.screenWidth / 2 + Math.cos(angle) * hw;
    let indicatorY = this.camera.screenHeight / 2 + Math.sin(angle) * hh;

    indicatorX = Math.max(edgeMargin, Math.min(this.camera.screenWidth - edgeMargin, indicatorX));
    indicatorY = Math.max(edgeMargin, Math.min(this.camera.screenHeight - edgeMargin, indicatorY));

    this.centerIndicator.x = indicatorX;
    this.centerIndicator.y = indicatorY;

    this.centerArrow.clear();
    const arrowSize = 12;
    this.centerArrow.moveTo(Math.cos(angle) * arrowSize, Math.sin(angle) * arrowSize);
    this.centerArrow.lineTo(Math.cos(angle + 2.5) * arrowSize * 0.7, Math.sin(angle + 2.5) * arrowSize * 0.7);
    this.centerArrow.lineTo(Math.cos(angle - 2.5) * arrowSize * 0.7, Math.sin(angle - 2.5) * arrowSize * 0.7);
    this.centerArrow.closePath();
    this.centerArrow.fill({ color: 0x00CED1, alpha: 0.8 });

    this.centerArrow.circle(0, 0, 4);
    this.centerArrow.fill({ color: 0x00CED1, alpha: 0.5 });

    this.centerDistText.text = `${Math.round(dist)}`;
    this.centerDistText.y = 16;
  }

  private updateOpponentIndicator(dt: number) {
    if (this.opponentIndicatorLife <= 0 || this.lastKnownOpponentX < 0) {
      this.opponentIndicator.visible = false;
      return;
    }

    this.opponentIndicatorLife -= dt;
    this.opponentIndicator.visible = true;

    const dx = this.lastKnownOpponentX - this.player.x;
    const dy = this.lastKnownOpponentY - this.player.y;
    const angle = Math.atan2(dy, dx);

    const edgeMargin = 50;
    const hw = this.camera.screenWidth / 2 - edgeMargin;
    const hh = this.camera.screenHeight / 2 - edgeMargin;

    let indicatorX = this.camera.screenWidth / 2 + Math.cos(angle) * hw;
    let indicatorY = this.camera.screenHeight / 2 + Math.sin(angle) * hh;

    indicatorX = Math.max(edgeMargin, Math.min(this.camera.screenWidth - edgeMargin, indicatorX));
    indicatorY = Math.max(edgeMargin, Math.min(this.camera.screenHeight - edgeMargin, indicatorY));

    this.opponentIndicator.x = indicatorX;
    this.opponentIndicator.y = indicatorY;

    const fadeAlpha = Math.min(1, this.opponentIndicatorLife / 1000);
    const pulse = 0.6 + Math.sin(Date.now() * 0.008) * 0.4;

    this.opponentArrow.clear();
    const arrowSize = 10;
    this.opponentArrow.moveTo(Math.cos(angle) * arrowSize, Math.sin(angle) * arrowSize);
    this.opponentArrow.lineTo(Math.cos(angle + 2.5) * arrowSize * 0.7, Math.sin(angle + 2.5) * arrowSize * 0.7);
    this.opponentArrow.lineTo(Math.cos(angle - 2.5) * arrowSize * 0.7, Math.sin(angle - 2.5) * arrowSize * 0.7);
    this.opponentArrow.closePath();
    this.opponentArrow.fill({ color: 0xFF4444, alpha: 0.7 * fadeAlpha * pulse });

    this.opponentDot.clear();
    this.opponentDot.circle(0, 0, 3);
    this.opponentDot.fill({ color: 0xFF4444, alpha: 0.5 * fadeAlpha });
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

  purchaseUpgrade(upgradeId: string) {
    socketManager.send({ type: 'PURCHASE_UPGRADE', payload: { upgradeId } });
  }

  private startGameLoop() {
    this.app.ticker.add((ticker) => {
      const dt = ticker.deltaMS;

      if (this.juice.isFrozen) {
        this.juice.update(dt);
        return;
      }

      if (this.phase === GamePhase.DIGGING || this.phase === GamePhase.ENCOUNTER) {
        this.elapsedMs = Date.now() - this.startTime;

        this.player.update(dt);

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

        if (this.combat.active && this.combat.encounterType === EncounterType.GUARDIAN) {
          const cz = BALANCE.CENTER_ZONE;
          const cwx = (cz.x + cz.width / 2) * SCALED_TILE;
          const cwy = (cz.y + cz.height / 2) * SCALED_TILE;
          this.particles.guardianAura(cwx, cwy);
        }

        this.updateCenterBeacon(dt);
        this.updateCenterIndicator();
        this.updateOpponentIndicator(dt);
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
          if (tile && tile.type === TileType.EMPTY) {
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
      player: this.player,
      elapsedMs: this.elapsedMs,
      countdownValue: this.countdownValue,
      combat: this.combat,
    };
  }
}
