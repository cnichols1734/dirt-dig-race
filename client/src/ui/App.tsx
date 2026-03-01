import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameManager } from '../game/GameManager';
import { HUD } from './HUD';
import { Lobby } from './Lobby';
import { UpgradeTree } from './UpgradeTree';
import { ScoreScreen } from './ScoreScreen';
import { TremorAlert } from './TremorAlert';
import { SonarDisplay } from './SonarDisplay';
import { GamePhase, Resources, UpgradeState, OreNode, GameOverPayload, TremorPayload } from '@dig/shared';

interface GameUIState {
  phase: GamePhase;
  resources: Resources;
  upgrades: UpgradeState;
  tilesDug: number;
  elapsedMs: number;
  countdownValue: number;
  showUpgrades: boolean;
  gameOverData: GameOverPayload | null;
  tremors: TremorPayload[];
  sonarAlerts: string[];
  dynamiteAlerts: string[];
  nodeAlerts: string[];
  playerId: string;
  playerIndex: number;
  scores: Record<string, number>;
  pps: Record<string, number>;
  timeRemainingMs: number;
  nodes: OreNode[];
  playerHp: number;
  playerMaxHp: number;
  dugTiles: Set<string>;
}

let gameManagerInstance: GameManager | null = null;

export function setGameManager(gm: GameManager) {
  gameManagerInstance = gm;
}

export function App() {
  const [state, setState] = useState<GameUIState>({
    phase: GamePhase.LOBBY,
    resources: { copper: 0, iron: 0, gold: 0, crystal: 0, emberStone: 0 },
    upgrades: {
      pickaxeLevel: 1, lanternLevel: 1,
      sonarUnlocked: false, dynamiteUnlocked: false, dynamiteCharges: 0,
      steelBootsLevel: 0, tremorSenseLevel: 1, momentumLevel: 0,
    },
    tilesDug: 0,
    elapsedMs: 0,
    countdownValue: 3,
    showUpgrades: false,
    gameOverData: null,
    tremors: [],
    sonarAlerts: [],
    dynamiteAlerts: [],
    nodeAlerts: [],
    playerId: '',
    playerIndex: 0,
    scores: {},
    pps: {},
    timeRemainingMs: 300000,
    nodes: [],
    playerHp: 50,
    playerMaxHp: 50,
    dugTiles: new Set<string>(),
  });

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!gameManagerInstance) return;
    const gm = gameManagerInstance;

    const handler = (event: string, data: any) => {
      switch (event) {
        case 'matchFound':
          setState(s => ({ ...s, phase: GamePhase.COUNTDOWN }));
          break;
        case 'countdown':
          setState(s => ({ ...s, countdownValue: data.count }));
          break;
        case 'gameStart':
          setState(s => ({
            ...s, phase: GamePhase.DIGGING,
            playerId: gm.playerId, playerIndex: gm.playerIndex,
            nodes: [...gm.nodes],
          }));
          if (timerRef.current) window.clearInterval(timerRef.current);
          timerRef.current = window.setInterval(() => {
            setState(s => ({
              ...s, elapsedMs: gm.elapsedMs,
              nodes: [...gm.nodes],
              dugTiles: new Set(gm.fog.revealed),
            }));
          }, 250);
          break;
        case 'playerState':
          setState(s => ({
            ...s,
            resources: data.resources ? { ...data.resources } : s.resources,
            upgrades: data.upgrades ? { ...data.upgrades } : s.upgrades,
            tilesDug: data.tilesDug ?? s.tilesDug,
            playerHp: data.hp ?? s.playerHp,
            playerMaxHp: data.maxHp ?? s.playerMaxHp,
          }));
          break;
        case 'upgradeResult':
          setState(s => ({
            ...s,
            resources: { ...data.resources },
            upgrades: { ...data.upgrades },
          }));
          break;
        case 'scoreUpdate':
          setState(s => ({
            ...s,
            scores: { ...data.scores },
            pps: { ...data.pps },
            timeRemainingMs: data.timeRemainingMs,
          }));
          break;
        case 'nodeUpdate':
        case 'nodeClaimed':
        case 'nodeLost':
          setState(s => ({ ...s, nodes: [...gm.nodes] }));
          break;
        case 'nodeContested': {
          const msg = `Node under attack from the ${data.direction}!`;
          setState(s => ({
            ...s,
            nodeAlerts: [...s.nodeAlerts, msg].slice(-2),
          }));
          setTimeout(() => {
            setState(s => ({ ...s, nodeAlerts: s.nodeAlerts.slice(1) }));
          }, 4000);
          break;
        }
        case 'veinRush': {
          const msg = data.message;
          setState(s => ({
            ...s,
            nodeAlerts: [...s.nodeAlerts, msg].slice(-2),
            nodes: [...gm.nodes],
          }));
          setTimeout(() => {
            setState(s => ({ ...s, nodeAlerts: s.nodeAlerts.slice(1) }));
          }, 5000);
          break;
        }
        case 'tremorSurge': {
          setState(s => ({
            ...s,
            nodeAlerts: [...s.nodeAlerts, 'TREMOR SURGE! All positions revealed!'].slice(-2),
          }));
          setTimeout(() => {
            setState(s => ({ ...s, nodeAlerts: s.nodeAlerts.slice(1) }));
          }, 3000);
          break;
        }
        case 'playerHit':
          setState(s => ({
            ...s,
            playerHp: data.targetId === s.playerId ? data.targetHp : s.playerHp,
          }));
          break;
        case 'playerKnockedOut':
          break;
        case 'playerRespawned':
          setState(s => ({ ...s, playerHp: 50, playerMaxHp: 50 }));
          break;
        case 'tremor':
          setState(s => ({
            ...s,
            tremors: [...s.tremors, data].slice(-3),
          }));
          setTimeout(() => {
            setState(s => ({ ...s, tremors: s.tremors.slice(1) }));
          }, 3000);
          break;
        case 'sonarAlert':
          setState(s => ({
            ...s,
            sonarAlerts: [...s.sonarAlerts, data.message].slice(-2),
          }));
          setTimeout(() => {
            setState(s => ({ ...s, sonarAlerts: s.sonarAlerts.slice(1) }));
          }, 3000);
          break;
        case 'dynamiteAlert':
          setState(s => ({
            ...s,
            dynamiteAlerts: [...s.dynamiteAlerts, data.message].slice(-2),
          }));
          setTimeout(() => {
            setState(s => ({ ...s, dynamiteAlerts: s.dynamiteAlerts.slice(1) }));
          }, 3000);
          break;
        case 'gameOver':
          if (timerRef.current) window.clearInterval(timerRef.current);
          setState(s => ({
            ...s, phase: GamePhase.GAME_OVER, gameOverData: data,
          }));
          break;
        case 'toggleUpgrades':
          setState(s => ({ ...s, showUpgrades: !s.showUpgrades }));
          break;
        case 'closeUpgrades':
          setState(s => ({ ...s, showUpgrades: false }));
          break;
      }
    };

    gm.onEvent(handler);
    return () => {
      gm.offEvent(handler);
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const handleJoinQueue = useCallback(() => {
    gameManagerInstance?.joinQueue();
  }, []);

  const handlePurchaseUpgrade = useCallback((id: string) => {
    gameManagerInstance?.purchaseUpgrade(id);
  }, []);

  const handlePlayAgain = useCallback(() => {
    setState(s => ({
      ...s, phase: GamePhase.LOBBY, gameOverData: null,
      showUpgrades: false, tremors: [], sonarAlerts: [],
      dynamiteAlerts: [], nodeAlerts: [], scores: {}, pps: {},
    }));
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', fontFamily: '"Press Start 2P", "VT323", monospace', color: '#fff', pointerEvents: 'none' }}>
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap" rel="stylesheet" />

      {state.phase === GamePhase.LOBBY && (
        <Lobby onJoinQueue={handleJoinQueue} />
      )}

      {state.phase === GamePhase.COUNTDOWN && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.75)', zIndex: 100,
          pointerEvents: 'auto' as const,
        }}>
          <div style={{ fontSize: 14, color: '#00CED188', marginBottom: 16, letterSpacing: 4 }}>
            GET READY
          </div>
          <div style={{
            fontSize: state.countdownValue > 0 ? 96 : 72,
            color: state.countdownValue > 0 ? '#00CED1' : '#FFD700',
            textShadow: '0 0 30px currentColor',
            fontWeight: 'bold',
          }}>
            {state.countdownValue > 0 ? state.countdownValue : 'CLAIM!'}
          </div>
          {state.countdownValue <= 0 && (
            <div style={{ fontSize: 10, color: '#FFD70088', marginTop: 12, letterSpacing: 2 }}>
              Explore, discover nodes, claim territory!
            </div>
          )}
        </div>
      )}

      {state.phase === GamePhase.DIGGING && (
        <>
          <HUD
            resources={state.resources}
            upgrades={state.upgrades}
            tilesDug={state.tilesDug}
            scores={state.scores}
            pps={state.pps}
            timeRemainingMs={state.timeRemainingMs}
            playerId={state.playerId}
            nodes={state.nodes}
            playerHp={state.playerHp}
            playerMaxHp={state.playerMaxHp}
            dugTiles={state.dugTiles}
            onToggleUpgrades={() => setState(s => ({ ...s, showUpgrades: !s.showUpgrades }))}
          />

          <TremorAlert tremors={state.tremors} sonarAlerts={state.sonarAlerts} dynamiteAlerts={[...state.dynamiteAlerts, ...state.nodeAlerts]} />
          <SonarDisplay />

          {state.showUpgrades && (
            <UpgradeTree
              resources={state.resources}
              upgrades={state.upgrades}
              onPurchase={handlePurchaseUpgrade}
              onClose={() => setState(s => ({ ...s, showUpgrades: false }))}
            />
          )}
        </>
      )}

      {state.phase === GamePhase.GAME_OVER && state.gameOverData && (
        <ScoreScreen
          data={state.gameOverData}
          playerId={state.playerId}
          onPlayAgain={handlePlayAgain}
        />
      )}
    </div>
  );
}
