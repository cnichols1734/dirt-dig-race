import React from 'react';
import { Resources, UpgradeState, OreNode, NodeTier } from '@dig/shared';
import { BALANCE } from '@dig/shared';
import { formatTime } from '../utils/helpers';
import { useIsMobile } from './hooks';

interface HUDProps {
  resources: Resources;
  upgrades: UpgradeState;
  tilesDug: number;
  scores: Record<string, number>;
  pps: Record<string, number>;
  timeRemainingMs: number;
  playerId: string;
  nodes: OreNode[];
  playerHp: number;
  playerMaxHp: number;
  dugTiles: Set<string>;
  opponentPos?: { x: number; y: number } | null;
  opponentRevealed?: boolean;
  onToggleUpgrades: () => void;
  onUseSonar?: () => void;
  onUseDynamite?: () => void;
  onAttack?: () => void;
}

const oreColors: Record<string, string> = {
  copper: '#D2691E', iron: '#4682B4', gold: '#FFD700',
  crystal: '#00CED1', emberStone: '#FF4500',
};
const oreLabels: Record<string, string> = {
  copper: 'Cu', iron: 'Fe', gold: 'Au', crystal: 'Cr', emberStone: 'Em',
};

export function HUD({
  resources, upgrades, tilesDug, scores, pps,
  timeRemainingMs, playerId, nodes, playerHp, playerMaxHp,
  dugTiles, opponentPos, opponentRevealed,
  onToggleUpgrades, onUseSonar, onUseDynamite, onAttack,
}: HUDProps) {
  const mobile = useIsMobile();
  const playerIds = Object.keys(scores);
  const opponentId = playerIds.find(id => id !== playerId) || '';
  const myScore = Math.floor(scores[playerId] || 0);
  const opScore = Math.floor(scores[opponentId] || 0);
  const myPps = pps[playerId] || 0;
  const opPps = pps[opponentId] || 0;
  const myNodes = nodes.filter(n => n.ownerId === playerId).length;
  const hpRatio = playerMaxHp > 0 ? playerHp / playerMaxHp : 1;
  const timeStr = formatTime(Math.max(0, timeRemainingMs));
  const isLowTime = timeRemainingMs < 30000;

  return (
    <>
      {/* Score Bar - Top */}
      <div style={{
        position: 'absolute',
        top: mobile ? 'env(safe-area-inset-top, 4px)' : 8,
        left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: mobile ? 8 : 16, zIndex: 50,
        background: 'rgba(10,10,26,0.9)', borderRadius: mobile ? 12 : 8,
        padding: mobile ? '6px 14px' : '8px 20px',
        border: '1px solid rgba(255,255,255,0.1)',
        pointerEvents: 'auto' as const,
        maxWidth: mobile ? 'calc(100vw - 16px)' : undefined,
      }}>
        <div style={{ textAlign: 'right', minWidth: mobile ? 50 : 80 }}>
          <div style={{ fontSize: mobile ? 16 : 20, color: '#4488FF', fontWeight: 'bold' }}>{myScore}</div>
          <div style={{ fontSize: mobile ? 7 : 8, color: '#4488FF88' }}>+{myPps}/s</div>
        </div>
        <div style={{
          textAlign: 'center', padding: mobile ? '0 8px' : '0 12px',
          borderLeft: '1px solid rgba(255,255,255,0.1)',
          borderRight: '1px solid rgba(255,255,255,0.1)',
        }}>
          <div style={{
            fontSize: mobile ? 12 : 14,
            color: isLowTime ? '#FF4444' : '#CCCCCC',
            animation: isLowTime ? 'blink 0.5s infinite' : undefined,
          }}>{timeStr}</div>
          <div style={{ fontSize: mobile ? 6 : 7, color: '#666', marginTop: 2 }}>
            FIRST TO {BALANCE.SCORING.WIN_THRESHOLD}
          </div>
        </div>
        <div style={{ textAlign: 'left', minWidth: mobile ? 50 : 80 }}>
          <div style={{ fontSize: mobile ? 16 : 20, color: '#FF4444', fontWeight: 'bold' }}>{opScore}</div>
          <div style={{ fontSize: mobile ? 7 : 8, color: '#FF444488' }}>+{opPps}/s</div>
        </div>
      </div>

      {/* HP Bar */}
      <div style={{
        position: 'absolute',
        top: mobile ? 'calc(env(safe-area-inset-top, 4px) + 48px)' : 60,
        left: '50%', transform: 'translateX(-50%)',
        width: mobile ? 120 : 160, zIndex: 50,
      }}>
        <div style={{
          background: 'rgba(10,10,26,0.7)', borderRadius: 4, padding: 2,
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div style={{ height: 6, borderRadius: 3, background: '#222' }}>
            <div style={{
              height: '100%', borderRadius: 3,
              width: `${Math.max(0, hpRatio * 100)}%`,
              background: hpRatio > 0.5 ? '#44FF44' : hpRatio > 0.25 ? '#FFFF44' : '#FF4444',
              transition: 'width 0.3s',
            }} />
          </div>
          <div style={{ fontSize: 7, color: '#888', textAlign: 'center', marginTop: 1 }}>
            HP {playerHp}/{playerMaxHp}
          </div>
        </div>
      </div>

      {/* Resources - Top Left on mobile, Bottom Left on desktop */}
      <div style={{
        position: 'absolute',
        ...(mobile
          ? { top: 'calc(env(safe-area-inset-top, 4px) + 4px)', left: 8 }
          : { bottom: 12, left: 12 }
        ),
        zIndex: 50,
        background: 'rgba(10,10,26,0.9)', borderRadius: mobile ? 10 : 8,
        padding: mobile ? '6px 8px' : '8px 12px',
        border: '1px solid rgba(255,255,255,0.08)',
        pointerEvents: 'auto' as const,
      }}>
        <div style={{ display: 'flex', gap: mobile ? 6 : 10, marginBottom: mobile ? 0 : 6 }}>
          {Object.entries(resources).map(([key, val]) => (
            <div key={key} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: mobile ? 10 : 12, color: oreColors[key], fontWeight: 'bold' }}>{val}</div>
              <div style={{ fontSize: mobile ? 6 : 7, color: oreColors[key] + '88' }}>{oreLabels[key]}</div>
            </div>
          ))}
        </div>
        {!mobile && (
          <div style={{ display: 'flex', gap: 8, fontSize: 8, color: '#666' }}>
            <span>Tiles: {tilesDug}</span>
            <span>Pick Lv.{upgrades.pickaxeLevel}</span>
          </div>
        )}
      </div>

      {/* Action Buttons - Bottom */}
      {mobile ? (
        <MobileActionBar
          upgrades={upgrades}
          onToggleUpgrades={onToggleUpgrades}
          onUseSonar={onUseSonar}
          onUseDynamite={onUseDynamite}
          onAttack={onAttack}
        />
      ) : (
        <DesktopActionBar
          upgrades={upgrades}
          onToggleUpgrades={onToggleUpgrades}
          onUseSonar={onUseSonar}
          onUseDynamite={onUseDynamite}
          onAttack={onAttack}
        />
      )}

      {/* Mini-map - Bottom Right */}
      <Minimap
        mobile={mobile}
        dugTiles={dugTiles}
        nodes={nodes}
        playerId={playerId}
        myNodes={myNodes}
        opponentPos={opponentPos}
        opponentRevealed={opponentRevealed}
      />

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes actionPulse {
          0% { transform: scale(1); }
          50% { transform: scale(0.92); }
          100% { transform: scale(1); }
        }
      `}</style>
    </>
  );
}

function MobileActionBar({
  upgrades, onToggleUpgrades, onUseSonar, onUseDynamite, onAttack,
}: {
  upgrades: UpgradeState;
  onToggleUpgrades: () => void;
  onUseSonar?: () => void;
  onUseDynamite?: () => void;
  onAttack?: () => void;
}) {
  const btnBase: React.CSSProperties = {
    width: 56, height: 56,
    borderRadius: 14,
    border: 'none',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    fontFamily: 'inherit', cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
    transition: 'transform 0.1s, box-shadow 0.1s',
    gap: 2,
  };

  return (
    <div style={{
      position: 'absolute',
      bottom: 'max(env(safe-area-inset-bottom, 8px), 12px)',
      left: '50%', transform: 'translateX(-50%)',
      display: 'flex', gap: 10, zIndex: 50,
      pointerEvents: 'auto' as const,
      padding: '8px 16px',
      background: 'rgba(10,10,26,0.85)',
      borderRadius: 20,
      border: '1px solid rgba(255,255,255,0.08)',
      backdropFilter: 'blur(8px)',
    }}>
      <button
        onClick={onToggleUpgrades}
        onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.9)'; }}
        onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        style={{
          ...btnBase,
          background: 'linear-gradient(180deg, rgba(0,206,209,0.25) 0%, rgba(0,100,105,0.3) 100%)',
          boxShadow: '0 0 12px rgba(0,206,209,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
          color: '#00CED1',
        }}
      >
        <span style={{ fontSize: 20 }}>⚒</span>
        <span style={{ fontSize: 7, letterSpacing: 0.5 }}>UPGRADE</span>
      </button>

      {upgrades.sonarUnlocked && (
        <button
          onClick={onUseSonar}
          onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.9)'; }}
          onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          style={{
            ...btnBase,
            background: 'linear-gradient(180deg, rgba(0,206,209,0.2) 0%, rgba(0,80,85,0.3) 100%)',
            boxShadow: '0 0 12px rgba(0,206,209,0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
            color: '#00CED1',
          }}
        >
          <span style={{ fontSize: 20 }}>📡</span>
          <span style={{ fontSize: 7, letterSpacing: 0.5 }}>SONAR</span>
        </button>
      )}

      {upgrades.dynamiteUnlocked && (
        <button
          onClick={onUseDynamite}
          onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.9)'; }}
          onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          style={{
            ...btnBase,
            background: 'linear-gradient(180deg, rgba(255,69,0,0.2) 0%, rgba(150,40,0,0.3) 100%)',
            boxShadow: '0 0 12px rgba(255,69,0,0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
            color: '#FF4500',
          }}
        >
          <span style={{ fontSize: 20 }}>💣</span>
          <span style={{ fontSize: 7, letterSpacing: 0.5 }}>TNT ×{upgrades.dynamiteCharges}</span>
        </button>
      )}

      <button
        onClick={onAttack}
        onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.9)'; }}
        onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        style={{
          ...btnBase,
          background: 'linear-gradient(180deg, rgba(255,68,68,0.2) 0%, rgba(150,30,30,0.3) 100%)',
          boxShadow: '0 0 12px rgba(255,68,68,0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
          color: '#FF4444',
        }}
      >
        <span style={{ fontSize: 20 }}>⚔</span>
        <span style={{ fontSize: 7, letterSpacing: 0.5 }}>ATTACK</span>
      </button>
    </div>
  );
}

function DesktopActionBar({
  upgrades, onToggleUpgrades, onUseSonar, onUseDynamite, onAttack,
}: {
  upgrades: UpgradeState;
  onToggleUpgrades: () => void;
  onUseSonar?: () => void;
  onUseDynamite?: () => void;
  onAttack?: () => void;
}) {
  const btnStyle: React.CSSProperties = {
    background: 'rgba(10,10,26,0.85)',
    border: '1px solid rgba(0,206,209,0.3)',
    color: '#00CED1', padding: '6px 14px', borderRadius: 6,
    fontSize: 9, fontFamily: 'inherit', cursor: 'pointer',
  };

  return (
    <div style={{
      position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', gap: 6, zIndex: 50,
      pointerEvents: 'auto' as const,
    }}>
      <button onClick={onToggleUpgrades} style={btnStyle}>
        [U] Upgrades
      </button>
      {upgrades.sonarUnlocked && (
        <button onClick={onUseSonar} style={btnStyle}>
          [Q] Sonar
        </button>
      )}
      {upgrades.dynamiteUnlocked && (
        <button onClick={onUseDynamite} style={{
          ...btnStyle,
          borderColor: 'rgba(255,69,0,0.3)', color: '#FF4500',
        }}>
          [E] TNT x{upgrades.dynamiteCharges}
        </button>
      )}
      <button onClick={onAttack} style={{
        ...btnStyle,
        borderColor: 'rgba(255,68,68,0.3)', color: '#FF4444',
      }}>
        [F] Attack
      </button>
    </div>
  );
}

function Minimap({
  mobile, dugTiles, nodes, playerId, myNodes, opponentPos, opponentRevealed,
}: {
  mobile: boolean;
  dugTiles: Set<string>;
  nodes: OreNode[];
  playerId: string;
  myNodes: number;
  opponentPos?: { x: number; y: number } | null;
  opponentRevealed?: boolean;
}) {
  const w = mobile ? 90 : 120;
  const h = mobile ? 60 : 80;

  return (
    <div style={{
      position: 'absolute',
      bottom: mobile ? 'calc(max(env(safe-area-inset-bottom, 8px), 12px) + 76px)' : 12,
      right: mobile ? 8 : 12,
      zIndex: 50,
      background: 'rgba(10,10,26,0.85)', borderRadius: mobile ? 10 : 8,
      padding: mobile ? 6 : 8,
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      {!mobile && (
        <div style={{ fontSize: 7, color: '#666', marginBottom: 4, textAlign: 'center' }}>
          NODES {myNodes} claimed
        </div>
      )}
      <div style={{ position: 'relative', width: w, height: h }}>
        <canvas
          ref={(el) => {
            if (!el) return;
            const ctx = el.getContext('2d');
            if (!ctx) return;
            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = '#0a0a14';
            ctx.fillRect(0, 0, w, h);

            ctx.fillStyle = 'rgba(100,100,120,0.4)';
            for (const key of dugTiles) {
              const [xs, ys] = key.split(',');
              const px = (parseInt(xs) / BALANCE.MAP_WIDTH) * w;
              const py = (parseInt(ys) / BALANCE.MAP_HEIGHT) * h;
              ctx.fillRect(Math.floor(px), Math.floor(py), mobile ? 1 : 2, mobile ? 1 : 2);
            }

            for (const node of nodes) {
              if (node.ownerId !== playerId) continue;
              const nx = (node.x / BALANCE.MAP_WIDTH) * w;
              const ny = (node.y / BALANCE.MAP_HEIGHT) * h;
              const size = node.tier === NodeTier.CORE ? 4 : node.tier === NodeTier.MID ? 3 : 2;
              ctx.fillStyle = '#4488FF';
              ctx.shadowColor = '#4488FF';
              ctx.shadowBlur = 4;
              ctx.beginPath();
              ctx.arc(nx, ny, size, 0, Math.PI * 2);
              ctx.fill();
              ctx.shadowBlur = 0;
            }

            if (opponentPos) {
              const ox = (opponentPos.x / BALANCE.MAP_WIDTH) * w;
              const oy = (opponentPos.y / BALANCE.MAP_HEIGHT) * h;

              if (opponentRevealed) {
                const blink = Math.sin(Date.now() * 0.008) > 0;
                ctx.fillStyle = blink ? '#FF4444' : '#FF8888';
                ctx.shadowColor = '#FF4444';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(ox, oy, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.strokeStyle = '#FF4444';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(ox, oy, 9, 0, Math.PI * 2);
                ctx.stroke();
              } else {
                ctx.fillStyle = 'rgba(255,68,68,0.7)';
                ctx.shadowColor = '#FF4444';
                ctx.shadowBlur = 4;
                ctx.beginPath();
                ctx.arc(ox, oy, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
              }
            }
          }}
          width={w}
          height={h}
          style={{ borderRadius: 4, border: '1px solid rgba(255,255,255,0.05)' }}
        />
      </div>
    </div>
  );
}
