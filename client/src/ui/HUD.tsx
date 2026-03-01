import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Resources, UpgradeState, EncounterType } from '@dig/shared';
import { formatTime } from '../utils/helpers';
import { BALANCE } from '@dig/shared';

interface HUDProps {
  resources: Resources;
  upgrades: UpgradeState;
  tilesDug: number;
  elapsedMs: number;
  encounterType: EncounterType | null;
  encounterHp: number;
  encounterMaxHp: number;
  encounterPlayerHp: number;
  onToggleUpgrades: () => void;
}

const oreColors: Record<string, string> = {
  copper: '#D2691E',
  iron: '#4682B4',
  gold: '#FFD700',
  crystal: '#00CED1',
  emberStone: '#FF4500',
};

const oreLabels: Record<string, string> = {
  copper: 'Cu',
  iron: 'Fe',
  gold: 'Au',
  crystal: 'Cr',
  emberStone: 'Em',
};

const oreIcons: Record<string, string> = {
  copper: '🟤',
  iron: '🔵',
  gold: '🟡',
  crystal: '💎',
  emberStone: '🔥',
};

function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gm = (window as any).__game;
    if (!gm || !gm.gameMap || !gm.gameMap.tiles || gm.gameMap.tiles.length === 0) return;

    const W = BALANCE.MAP_WIDTH;
    const H = BALANCE.MAP_HEIGHT;
    const scale = 3;
    canvas.width = W * scale;
    canvas.height = H * scale;

    ctx.fillStyle = '#080810';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const tileColors: Record<number, string> = {
      0: '#0a0a12',
      1: '#5a4010',
      2: '#6a3a20',
      3: '#3a3a3a',
      4: '#2a3a3a',
      5: '#505860',
      6: '#151528',
      7: '#0a2a2a',
      8: '#111111',
    };

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const key = `${x},${y}`;
        if (!gm.fog.revealed.has(key)) continue;

        const tile = gm.gameMap.tiles[y]?.[x];
        if (!tile) continue;
        ctx.fillStyle = tileColors[tile.type] || '#080810';
        ctx.fillRect(x * scale, y * scale, scale, scale);

        if (tile.ore > 0) {
          const oreClr: Record<number, string> = {
            1: '#D2691E', 2: '#4682B4', 3: '#FFD700', 4: '#00CED1', 5: '#FF4500',
          };
          ctx.fillStyle = oreClr[tile.ore] || '#fff';
          ctx.globalAlpha = 0.6;
          ctx.fillRect(x * scale, y * scale, scale, scale);
          ctx.globalAlpha = 1;
        }
      }
    }

    const cz = BALANCE.CENTER_ZONE;
    const t = Date.now() * 0.003;
    const pulseAlpha = 0.4 + Math.sin(t) * 0.3;
    ctx.fillStyle = `rgba(0, 206, 209, ${pulseAlpha})`;
    ctx.fillRect(cz.x * scale, cz.y * scale, cz.width * scale, cz.height * scale);
    ctx.strokeStyle = '#00CED1';
    ctx.lineWidth = 1;
    ctx.strokeRect(cz.x * scale - 1, cz.y * scale - 1, cz.width * scale + 2, cz.height * scale + 2);

    ctx.fillStyle = '#FFB347';
    ctx.shadowColor = '#FFB347';
    ctx.shadowBlur = 6;
    const px = gm.player.x * scale + scale / 2;
    const py = gm.player.y * scale + scale / 2;
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    animRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  return (
    <div style={{
      position: 'absolute', bottom: 70, right: 12, zIndex: 50,
      background: 'rgba(10,10,26,0.9)',
      border: '1px solid rgba(0,206,209,0.2)',
      borderRadius: 6, padding: 4,
    }}>
      <div style={{ fontSize: 8, color: '#00CED1', marginBottom: 2, textAlign: 'center', opacity: 0.7 }}>MAP</div>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', borderRadius: 3, imageRendering: 'pixelated' }}
      />
    </div>
  );
}

export function HUD({
  resources, upgrades, tilesDug, elapsedMs,
  encounterType, encounterHp, encounterMaxHp, encounterPlayerHp,
  onToggleUpgrades,
}: HUDProps) {
  const [bounceKey, setBounceKey] = useState('');
  const prevRef = useRef(resources);

  useEffect(() => {
    const prev = prevRef.current;
    for (const key of Object.keys(resources) as (keyof Resources)[]) {
      if (resources[key] > prev[key]) {
        setBounceKey(key);
        setTimeout(() => setBounceKey(''), 300);
        break;
      }
    }
    prevRef.current = resources;
  }, [resources.copper, resources.iron, resources.gold, resources.crystal, resources.emberStone]);

  const pickaxeDmg = BALANCE.UPGRADES.PICKAXE.find(p => p.level === upgrades.pickaxeLevel)?.damage || 1;

  return (
    <>
      {/* Resource bar */}
      <div style={{
        position: 'absolute', top: 12, left: 12, zIndex: 50,
        display: 'flex', gap: 10, background: 'rgba(8,8,20,0.9)',
        padding: '8px 14px', borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(4px)',
        pointerEvents: 'auto' as const,
      }}>
        {(Object.keys(oreLabels) as (keyof Resources)[]).map(key => (
          <div
            key={key}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              transform: bounceKey === key ? 'scale(1.4) translateY(-3px)' : 'scale(1)',
              transition: 'transform 0.15s cubic-bezier(.4,0,.2,1)',
            }}
          >
            <div style={{
              width: 16, height: 16, borderRadius: 4,
              background: `linear-gradient(135deg, ${oreColors[key]}, ${oreColors[key]}88)`,
              boxShadow: resources[key] > 0 ? `0 0 8px ${oreColors[key]}66` : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8,
            }}>
              {oreLabels[key]}
            </div>
            <span style={{
              fontSize: 11, color: resources[key] > 0 ? oreColors[key] : '#555',
              fontWeight: 'bold',
              textShadow: resources[key] > 0 ? `0 0 6px ${oreColors[key]}44` : 'none',
            }}>
              {resources[key]}
            </span>
          </div>
        ))}
      </div>

      {/* Stats - top right */}
      <div style={{
        position: 'absolute', top: 12, right: 12, zIndex: 50,
        background: 'rgba(8,8,20,0.9)',
        padding: '10px 14px', borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.08)',
        fontSize: 10, lineHeight: '20px',
        pointerEvents: 'auto' as const,
      }}>
        <div style={{ color: '#999', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12 }}>&#9201;</span>
          <span style={{ color: '#ddd', fontVariantNumeric: 'tabular-nums' }}>{formatTime(elapsedMs)}</span>
        </div>
        <div style={{ color: '#FFB347', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12 }}>&#9935;</span>
          <span>Lv.{upgrades.pickaxeLevel}</span>
          <span style={{ color: '#FF8C42', fontSize: 9 }}>({pickaxeDmg}dmg)</span>
        </div>
        <div style={{ color: '#00CED1', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12 }}>&#128161;</span>
          <span>Range {upgrades.lanternLevel}</span>
        </div>
        <div style={{ color: '#888' }}>
          Tiles: <span style={{ color: '#bbb' }}>{tilesDug}</span>
        </div>
      </div>

      {/* Objective hint */}
      <div style={{
        position: 'absolute', top: 56, left: '50%', transform: 'translateX(-50%)', zIndex: 50,
        fontSize: 9, color: 'rgba(0,206,209,0.5)', textAlign: 'center',
        letterSpacing: 1,
      }}>
        DIG TO THE CENTER
      </div>

      {/* Ability bar */}
      <div style={{
        position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 50,
        display: 'flex', gap: 8, background: 'rgba(8,8,20,0.9)',
        padding: '8px 14px', borderRadius: 10,
        border: '1px solid rgba(255,255,255,0.08)',
        pointerEvents: 'auto' as const,
      }}>
        <AbilityButton
          label="Sonar"
          hotkey="Q"
          unlocked={upgrades.sonarUnlocked}
          color="#00CED1"
        />
        <AbilityButton
          label={`TNT${upgrades.dynamiteUnlocked ? ` x${upgrades.dynamiteCharges}` : ''}`}
          hotkey="E"
          unlocked={upgrades.dynamiteUnlocked}
          color="#FF4500"
        />
        <div
          onClick={onToggleUpgrades}
          style={{
            padding: '8px 16px', borderRadius: 6, fontSize: 10,
            background: 'linear-gradient(180deg, rgba(255,179,71,0.2), rgba(255,140,66,0.1))',
            border: '1px solid rgba(255,179,71,0.4)', color: '#FFB347',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          <span style={{ fontSize: 8, color: '#FFB34788' }}>U </span>
          Upgrades
        </div>
      </div>

      {/* Encounter HUD */}
      {encounterType && (
        <div style={{
          position: 'absolute', top: 70, left: '50%', transform: 'translateX(-50%)', zIndex: 50,
          background: 'rgba(10,10,26,0.95)',
          padding: '14px 24px', borderRadius: 10,
          border: '1px solid rgba(255,68,68,0.3)',
          textAlign: 'center', minWidth: 240,
          boxShadow: '0 0 30px rgba(255,68,68,0.1)',
        }}>
          <div style={{
            fontSize: 14, color: '#FF4444', marginBottom: 10,
            textShadow: '0 0 10px rgba(255,68,68,0.3)',
            letterSpacing: 2,
          }}>
            {encounterType.replace('_', ' ')}
          </div>
          {encounterMaxHp > 0 && (
            <div style={{
              width: 220, height: 12, background: '#1a1a2e', borderRadius: 6, overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <div style={{
                width: `${(encounterHp / encounterMaxHp) * 100}%`,
                height: '100%',
                background: encounterHp / encounterMaxHp > 0.5
                  ? 'linear-gradient(90deg, #22CC22, #44FF44)'
                  : encounterHp / encounterMaxHp > 0.25
                    ? 'linear-gradient(90deg, #CCCC22, #FFFF44)'
                    : 'linear-gradient(90deg, #CC2222, #FF4444)',
                transition: 'width 0.2s',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
              }} />
            </div>
          )}
          {(encounterType === 'GUARDIAN' || encounterType === 'MIRROR') && (
            <div style={{
              fontSize: 10, color: '#FFB347', marginTop: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <span>Your HP:</span>
              <span style={{ color: encounterPlayerHp > 50 ? '#44FF44' : encounterPlayerHp > 25 ? '#FFFF44' : '#FF4444' }}>
                {encounterPlayerHp}
              </span>
            </div>
          )}
          <div style={{ fontSize: 8, color: '#666', marginTop: 8 }}>
            Click to attack!
          </div>
        </div>
      )}

      {/* Minimap */}
      <Minimap />
    </>
  );
}

function AbilityButton({ label, hotkey, unlocked, color }: {
  label: string; hotkey: string; unlocked: boolean; color: string;
}) {
  return (
    <div style={{
      padding: '8px 14px', borderRadius: 6, fontSize: 10,
      background: unlocked
        ? `linear-gradient(180deg, ${color}22, ${color}11)`
        : 'rgba(255,255,255,0.03)',
      border: unlocked ? `1px solid ${color}66` : '1px solid rgba(255,255,255,0.06)',
      color: unlocked ? color : '#444',
      cursor: unlocked ? 'pointer' : 'default',
      opacity: unlocked ? 1 : 0.6,
      transition: 'all 0.15s',
    }}>
      <span style={{ fontSize: 8, opacity: 0.6 }}>{hotkey} </span>
      {label}
      {!unlocked && <span style={{ marginLeft: 4, fontSize: 8 }}>&#128274;</span>}
    </div>
  );
}
