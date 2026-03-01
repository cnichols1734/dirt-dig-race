import React from 'react';
import { Resources, UpgradeState, OreNode, NodeTier } from '@dig/shared';
import { BALANCE } from '@dig/shared';
import { formatTime } from '../utils/helpers';

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
  onToggleUpgrades: () => void;
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
  dugTiles, onToggleUpgrades,
}: HUDProps) {
  const playerIds = Object.keys(scores);
  const opponentId = playerIds.find(id => id !== playerId) || '';
  const myScore = Math.floor(scores[playerId] || 0);
  const opScore = Math.floor(scores[opponentId] || 0);
  const myPps = pps[playerId] || 0;
  const opPps = pps[opponentId] || 0;
  const myNodes = nodes.filter(n => n.ownerId === playerId).length;
  const opNodes = nodes.filter(n => n.ownerId === opponentId).length;
  const hpRatio = playerMaxHp > 0 ? playerHp / playerMaxHp : 1;
  const timeStr = formatTime(Math.max(0, timeRemainingMs));
  const isLowTime = timeRemainingMs < 30000;

  return (
    <>
      {/* Score Bar - Top Center */}
      <div style={{
        position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: 16, zIndex: 50,
        background: 'rgba(10,10,26,0.85)', borderRadius: 8, padding: '8px 20px',
        border: '1px solid rgba(255,255,255,0.1)',
        pointerEvents: 'auto' as const,
      }}>
        {/* My Score */}
        <div style={{ textAlign: 'right', minWidth: 80 }}>
          <div style={{ fontSize: 20, color: '#4488FF', fontWeight: 'bold' }}>{myScore}</div>
          <div style={{ fontSize: 8, color: '#4488FF88' }}>+{myPps}/s</div>
        </div>

        {/* Timer */}
        <div style={{
          textAlign: 'center', padding: '0 12px',
          borderLeft: '1px solid rgba(255,255,255,0.1)',
          borderRight: '1px solid rgba(255,255,255,0.1)',
        }}>
          <div style={{
            fontSize: 14, color: isLowTime ? '#FF4444' : '#CCCCCC',
            animation: isLowTime ? 'blink 0.5s infinite' : undefined,
          }}>{timeStr}</div>
          <div style={{ fontSize: 7, color: '#666', marginTop: 2 }}>
            FIRST TO {BALANCE.SCORING.WIN_THRESHOLD}
          </div>
        </div>

        {/* Opponent Score */}
        <div style={{ textAlign: 'left', minWidth: 80 }}>
          <div style={{ fontSize: 20, color: '#FF4444', fontWeight: 'bold' }}>{opScore}</div>
          <div style={{ fontSize: 8, color: '#FF444488' }}>+{opPps}/s</div>
        </div>
      </div>

      {/* HP Bar - Below Score */}
      <div style={{
        position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)',
        width: 160, zIndex: 50,
      }}>
        <div style={{
          background: 'rgba(10,10,26,0.7)', borderRadius: 4, padding: 2,
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div style={{
            height: 6, borderRadius: 3, background: '#222',
          }}>
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

      {/* Resources - Bottom Left */}
      <div style={{
        position: 'absolute', bottom: 12, left: 12, zIndex: 50,
        background: 'rgba(10,10,26,0.85)', borderRadius: 8, padding: '8px 12px',
        border: '1px solid rgba(255,255,255,0.08)',
        pointerEvents: 'auto' as const,
      }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
          {Object.entries(resources).map(([key, val]) => (
            <div key={key} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: oreColors[key], fontWeight: 'bold' }}>{val}</div>
              <div style={{ fontSize: 7, color: oreColors[key] + '88' }}>{oreLabels[key]}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, fontSize: 8, color: '#666' }}>
          <span>Tiles: {tilesDug}</span>
          <span>Pick Lv.{upgrades.pickaxeLevel}</span>
        </div>
      </div>

      {/* Controls - Bottom Center */}
      <div style={{
        position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 6, zIndex: 50,
        pointerEvents: 'auto' as const,
      }}>
        <button onClick={onToggleUpgrades} style={{
          background: 'rgba(10,10,26,0.85)', border: '1px solid rgba(0,206,209,0.3)',
          color: '#00CED1', padding: '6px 14px', borderRadius: 6,
          fontSize: 9, fontFamily: 'inherit', cursor: 'pointer',
        }}>
          [U] Upgrades
        </button>
        {upgrades.sonarUnlocked && (
          <button style={{
            background: 'rgba(10,10,26,0.85)', border: '1px solid rgba(0,206,209,0.3)',
            color: '#00CED1', padding: '6px 10px', borderRadius: 6,
            fontSize: 9, fontFamily: 'inherit', cursor: 'pointer',
          }}>
            [Q] Sonar
          </button>
        )}
        {upgrades.dynamiteUnlocked && (
          <button style={{
            background: 'rgba(10,10,26,0.85)', border: '1px solid rgba(255,69,0,0.3)',
            color: '#FF4500', padding: '6px 10px', borderRadius: 6,
            fontSize: 9, fontFamily: 'inherit', cursor: 'pointer',
          }}>
            [E] TNT x{upgrades.dynamiteCharges}
          </button>
        )}
        <button style={{
          background: 'rgba(10,10,26,0.85)', border: '1px solid rgba(255,68,68,0.3)',
          color: '#FF4444', padding: '6px 10px', borderRadius: 6,
          fontSize: 9, fontFamily: 'inherit', cursor: 'pointer',
        }}>
          [F] Attack
        </button>
      </div>

      {/* Mini-map - Bottom Right */}
      <div style={{
        position: 'absolute', bottom: 12, right: 12, zIndex: 50,
        background: 'rgba(10,10,26,0.85)', borderRadius: 8, padding: 8,
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ fontSize: 7, color: '#666', marginBottom: 4, textAlign: 'center' }}>
          NODES {myNodes} claimed
        </div>
        <div style={{ position: 'relative', width: 120, height: 80 }}>
          <canvas
            ref={(el) => {
              if (!el) return;
              const ctx = el.getContext('2d');
              if (!ctx) return;
              ctx.clearRect(0, 0, 120, 80);
              ctx.fillStyle = '#0a0a14';
              ctx.fillRect(0, 0, 120, 80);

              ctx.fillStyle = 'rgba(100,100,120,0.4)';
              for (const key of dugTiles) {
                const [xs, ys] = key.split(',');
                const px = (parseInt(xs) / BALANCE.MAP_WIDTH) * 120;
                const py = (parseInt(ys) / BALANCE.MAP_HEIGHT) * 80;
                ctx.fillRect(Math.floor(px), Math.floor(py), 2, 2);
              }

              for (const node of nodes) {
                if (node.ownerId !== playerId) continue;
                const nx = (node.x / BALANCE.MAP_WIDTH) * 120;
                const ny = (node.y / BALANCE.MAP_HEIGHT) * 80;
                const size = node.tier === NodeTier.CORE ? 5 : node.tier === NodeTier.MID ? 4 : 3;
                ctx.fillStyle = '#4488FF';
                ctx.shadowColor = '#4488FF';
                ctx.shadowBlur = 4;
                ctx.beginPath();
                ctx.arc(nx, ny, size, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
              }
            }}
            width={120}
            height={80}
            style={{ borderRadius: 4, border: '1px solid rgba(255,255,255,0.05)' }}
          />
        </div>
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </>
  );
}
