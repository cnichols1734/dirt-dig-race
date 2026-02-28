import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameManager } from '../game/GameManager';
import { HUD } from './HUD';
import { Lobby } from './Lobby';
import { UpgradeTree } from './UpgradeTree';
import { ScoreScreen } from './ScoreScreen';
import { TremorAlert } from './TremorAlert';
import { SonarDisplay } from './SonarDisplay';
import { GamePhase, Resources, UpgradeState, EncounterType, GameOverPayload, TremorPayload } from '@dig/shared';

interface GameUIState {
  phase: GamePhase;
  resources: Resources;
  upgrades: UpgradeState;
  tilesDug: number;
  elapsedMs: number;
  encounterType: EncounterType | null;
  encounterHp: number;
  encounterMaxHp: number;
  encounterPlayerHp: number;
  countdownValue: number;
  showUpgrades: boolean;
  gameOverData: GameOverPayload | null;
  tremors: TremorPayload[];
  sonarAlerts: string[];
  dynamiteAlerts: string[];
  playerId: string;
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
    encounterType: null,
    encounterHp: 0,
    encounterMaxHp: 0,
    encounterPlayerHp: 100,
    countdownValue: 3,
    showUpgrades: false,
    gameOverData: null,
    tremors: [],
    sonarAlerts: [],
    dynamiteAlerts: [],
    playerId: '',
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
          setState(s => ({ ...s, phase: GamePhase.DIGGING, playerId: gm.playerId }));
          if (timerRef.current) cancelAnimationFrame(timerRef.current);
          const tick = () => {
            setState(s => ({
              ...s,
              elapsedMs: gm.elapsedMs,
              resources: { ...gm.player.resources },
              upgrades: { ...gm.player.upgrades },
              tilesDug: gm.player.tilesDug,
            }));
            timerRef.current = requestAnimationFrame(tick);
          };
          timerRef.current = requestAnimationFrame(tick);
          break;
        case 'playerState':
          setState(s => ({
            ...s,
            resources: data.resources ? { ...data.resources } : s.resources,
            upgrades: data.upgrades ? { ...data.upgrades } : s.upgrades,
            tilesDug: data.tilesDug ?? s.tilesDug,
          }));
          break;
        case 'upgradeResult':
          setState(s => ({
            ...s,
            resources: { ...data.resources },
            upgrades: { ...data.upgrades },
          }));
          break;
        case 'tremor':
          setState(s => ({
            ...s,
            tremors: [...s.tremors, data].slice(-3),
          }));
          setTimeout(() => {
            setState(s => ({
              ...s,
              tremors: s.tremors.slice(1),
            }));
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
        case 'encounterStart':
          setState(s => ({
            ...s,
            phase: GamePhase.ENCOUNTER,
            encounterType: data.type,
            encounterHp: data.hp || 0,
            encounterMaxHp: data.maxHp || 0,
          }));
          break;
        case 'encounterUpdate':
          setState(s => ({
            ...s,
            encounterHp: data.hp,
            encounterMaxHp: data.maxHp,
          }));
          break;
        case 'guardianAttack':
          setState(s => ({ ...s, encounterPlayerHp: data.hp }));
          break;
        case 'gameOver':
          if (timerRef.current) cancelAnimationFrame(timerRef.current);
          setState(s => ({
            ...s,
            phase: GamePhase.GAME_OVER,
            gameOverData: data,
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
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
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
      ...s,
      phase: GamePhase.LOBBY,
      gameOverData: null,
      showUpgrades: false,
      tremors: [],
      sonarAlerts: [],
      dynamiteAlerts: [],
      encounterType: null,
    }));
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', fontFamily: '"Press Start 2P", "VT323", monospace', color: '#fff' }}>
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap" rel="stylesheet" />

      {state.phase === GamePhase.LOBBY && (
        <Lobby onJoinQueue={handleJoinQueue} />
      )}

      {state.phase === GamePhase.COUNTDOWN && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.7)', zIndex: 100,
        }}>
          <div style={{ fontSize: 72, color: '#00CED1', textShadow: '0 0 20px #00CED1' }}>
            {state.countdownValue > 0 ? state.countdownValue : 'DIG!'}
          </div>
        </div>
      )}

      {(state.phase === GamePhase.DIGGING || state.phase === GamePhase.ENCOUNTER) && (
        <>
          <HUD
            resources={state.resources}
            upgrades={state.upgrades}
            tilesDug={state.tilesDug}
            elapsedMs={state.elapsedMs}
            encounterType={state.encounterType}
            encounterHp={state.encounterHp}
            encounterMaxHp={state.encounterMaxHp}
            encounterPlayerHp={state.encounterPlayerHp}
            onToggleUpgrades={() => setState(s => ({ ...s, showUpgrades: !s.showUpgrades }))}
          />

          <TremorAlert tremors={state.tremors} sonarAlerts={state.sonarAlerts} dynamiteAlerts={state.dynamiteAlerts} />
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
