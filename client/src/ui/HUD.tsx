import React, { useState, useEffect } from 'react';
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

export function HUD({
  resources, upgrades, tilesDug, elapsedMs,
  encounterType, encounterHp, encounterMaxHp, encounterPlayerHp,
  onToggleUpgrades,
}: HUDProps) {
  const [bounceKey, setBounceKey] = useState('');
  const [prevResources, setPrevResources] = useState(resources);

  useEffect(() => {
    for (const key of Object.keys(resources) as (keyof Resources)[]) {
      if (resources[key] > prevResources[key]) {
        setBounceKey(key);
        setTimeout(() => setBounceKey(''), 300);
      }
    }
    setPrevResources(resources);
  }, [resources]);

  const pickaxeDmg = BALANCE.UPGRADES.PICKAXE.find(p => p.level === upgrades.pickaxeLevel)?.damage || 1;
  const depthPercent = Math.min(100, tilesDug);

  return (
    <>
      {/* Resource bar */}
      <div style={{
        position: 'absolute', top: 12, left: 12, zIndex: 50,
        display: 'flex', gap: 12, background: 'rgba(10,10,26,0.85)',
        padding: '8px 14px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)',
      }}>
        {(Object.keys(oreLabels) as (keyof Resources)[]).map(key => (
          <div
            key={key}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              transform: bounceKey === key ? 'scale(1.3)' : 'scale(1)',
              transition: 'transform 0.15s ease',
            }}
          >
            <div style={{
              width: 14, height: 14, borderRadius: 3,
              background: oreColors[key],
              boxShadow: `0 0 6px ${oreColors[key]}`,
            }} />
            <span style={{ fontSize: 10, color: oreColors[key] }}>
              {resources[key]}
            </span>
          </div>
        ))}
      </div>

      {/* Stats - top right */}
      <div style={{
        position: 'absolute', top: 12, right: 12, zIndex: 50,
        background: 'rgba(10,10,26,0.85)',
        padding: '8px 14px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)',
        fontSize: 10, lineHeight: '18px',
      }}>
        <div style={{ color: '#aaa' }}>⏱ {formatTime(elapsedMs)}</div>
        <div style={{ color: '#FFB347' }}>⛏ Lv.{upgrades.pickaxeLevel} ({pickaxeDmg}dmg)</div>
        <div style={{ color: '#00CED1' }}>💡 Range {upgrades.lanternLevel}</div>
        <div style={{ color: '#aaa' }}>Tiles: {tilesDug}</div>
      </div>

      {/* Ability bar */}
      <div style={{
        position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 50,
        display: 'flex', gap: 12, background: 'rgba(10,10,26,0.85)',
        padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
      }}>
        <div style={{
          padding: '6px 12px', borderRadius: 4, fontSize: 10,
          background: upgrades.sonarUnlocked ? 'rgba(0,206,209,0.2)' : 'rgba(255,255,255,0.05)',
          border: upgrades.sonarUnlocked ? '1px solid #00CED1' : '1px solid rgba(255,255,255,0.1)',
          color: upgrades.sonarUnlocked ? '#00CED1' : '#555',
          cursor: upgrades.sonarUnlocked ? 'pointer' : 'default',
        }}>
          [Q] Sonar {!upgrades.sonarUnlocked && '🔒'}
        </div>

        <div style={{
          padding: '6px 12px', borderRadius: 4, fontSize: 10,
          background: upgrades.dynamiteUnlocked ? 'rgba(255,69,0,0.2)' : 'rgba(255,255,255,0.05)',
          border: upgrades.dynamiteUnlocked ? '1px solid #FF4500' : '1px solid rgba(255,255,255,0.1)',
          color: upgrades.dynamiteUnlocked ? '#FF4500' : '#555',
        }}>
          [E] TNT {upgrades.dynamiteUnlocked ? `x${upgrades.dynamiteCharges}` : '🔒'}
        </div>

        <div
          onClick={onToggleUpgrades}
          style={{
            padding: '6px 12px', borderRadius: 4, fontSize: 10,
            background: 'rgba(255,179,71,0.2)',
            border: '1px solid #FFB347', color: '#FFB347',
            cursor: 'pointer',
          }}
        >
          [U] Upgrades
        </div>
      </div>

      {/* Encounter HUD */}
      {encounterType && (
        <div style={{
          position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)', zIndex: 50,
          background: 'rgba(10,10,26,0.9)',
          padding: '12px 20px', borderRadius: 8,
          border: '1px solid #FF4444', textAlign: 'center',
        }}>
          <div style={{ fontSize: 12, color: '#FF4444', marginBottom: 8 }}>
            {encounterType.replace('_', ' ')}
          </div>
          {encounterMaxHp > 0 && (
            <div style={{ width: 200, height: 10, background: '#222', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{
                width: `${(encounterHp / encounterMaxHp) * 100}%`,
                height: '100%',
                background: encounterHp / encounterMaxHp > 0.5 ? '#44FF44' : encounterHp / encounterMaxHp > 0.25 ? '#FFFF44' : '#FF4444',
                transition: 'width 0.2s',
              }} />
            </div>
          )}
          {(encounterType === 'GUARDIAN' || encounterType === 'MIRROR') && (
            <div style={{ fontSize: 10, color: '#FFB347', marginTop: 6 }}>
              Your HP: {encounterPlayerHp}
            </div>
          )}
        </div>
      )}
    </>
  );
}
