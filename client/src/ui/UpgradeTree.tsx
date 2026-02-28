import React from 'react';
import { Resources, UpgradeState } from '@dig/shared';
import { BALANCE } from '@dig/shared';

interface UpgradeTreeProps {
  resources: Resources;
  upgrades: UpgradeState;
  onPurchase: (id: string) => void;
  onClose: () => void;
}

function canAfford(resources: Resources, cost: Record<string, number>): boolean {
  for (const [key, val] of Object.entries(cost)) {
    if ((resources[key as keyof Resources] || 0) < val) return false;
  }
  return true;
}

function costString(cost: Record<string, number>): string {
  return Object.entries(cost)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${v} ${k}`)
    .join(', ');
}

const oreColorMap: Record<string, string> = {
  copper: '#D2691E', iron: '#4682B4', gold: '#FFD700',
  crystal: '#00CED1', emberStone: '#FF4500',
};

export function UpgradeTree({ resources, upgrades, onPurchase, onClose }: UpgradeTreeProps) {
  const upgradeDefs = [
    {
      id: 'pickaxe', name: '⛏ Pickaxe Power',
      currentLevel: upgrades.pickaxeLevel,
      maxLevel: 6,
      getNext: () => BALANCE.UPGRADES.PICKAXE.find(p => p.level === upgrades.pickaxeLevel + 1),
      getDesc: () => {
        const cur = BALANCE.UPGRADES.PICKAXE.find(p => p.level === upgrades.pickaxeLevel);
        const next = BALANCE.UPGRADES.PICKAXE.find(p => p.level === upgrades.pickaxeLevel + 1);
        return next ? `${cur?.damage} → ${next.damage} damage` : 'MAX';
      },
    },
    {
      id: 'lantern', name: '💡 Lantern Range',
      currentLevel: upgrades.lanternLevel,
      maxLevel: 4,
      getNext: () => BALANCE.UPGRADES.LANTERN.find(p => p.level === upgrades.lanternLevel + 1),
      getDesc: () => {
        const cur = BALANCE.UPGRADES.LANTERN.find(p => p.level === upgrades.lanternLevel);
        const next = BALANCE.UPGRADES.LANTERN.find(p => p.level === upgrades.lanternLevel + 1);
        return next ? `${cur?.radius} → ${next.radius} tile radius` : 'MAX';
      },
    },
    {
      id: 'sonar', name: '📡 Sonar Ping',
      currentLevel: upgrades.sonarUnlocked ? 1 : 0,
      maxLevel: 1,
      getNext: () => upgrades.sonarUnlocked ? null : { cost: BALANCE.UPGRADES.SONAR.unlockCost },
      getDesc: () => upgrades.sonarUnlocked ? 'UNLOCKED' : 'Reveal area + detect enemy',
    },
    {
      id: 'dynamite', name: '💣 Dynamite',
      currentLevel: upgrades.dynamiteUnlocked ? 1 : 0,
      maxLevel: 1,
      getNext: () => upgrades.dynamiteUnlocked ? null : { cost: BALANCE.UPGRADES.DYNAMITE.unlockCost },
      getDesc: () => upgrades.dynamiteUnlocked ? 'UNLOCKED' : 'Instant 3x3 area clear',
    },
    {
      id: 'dynamite_charge', name: '💣 TNT Charge',
      currentLevel: upgrades.dynamiteCharges,
      maxLevel: BALANCE.MAX_DYNAMITE_CHARGES,
      getNext: () => {
        if (!upgrades.dynamiteUnlocked || upgrades.dynamiteCharges >= BALANCE.MAX_DYNAMITE_CHARGES) return null;
        return { cost: BALANCE.UPGRADES.DYNAMITE.chargeCost };
      },
      getDesc: () => `${upgrades.dynamiteCharges}/${BALANCE.MAX_DYNAMITE_CHARGES} charges`,
    },
    {
      id: 'steel_boots', name: '🥾 Steel Boots',
      currentLevel: upgrades.steelBootsLevel,
      maxLevel: 2,
      getNext: () => {
        const next = BALANCE.UPGRADES.STEEL_BOOTS[upgrades.steelBootsLevel + 1];
        return next || null;
      },
      getDesc: () => {
        const cur = BALANCE.UPGRADES.STEEL_BOOTS[upgrades.steelBootsLevel];
        return `${Math.round((cur?.reduction || 0) * 100)}% damage reduction`;
      },
    },
    {
      id: 'tremor_sense', name: '🌊 Tremor Sense',
      currentLevel: upgrades.tremorSenseLevel,
      maxLevel: 3,
      getNext: () => BALANCE.UPGRADES.TREMOR_SENSE.find(t => t.level === upgrades.tremorSenseLevel + 1) || null,
      getDesc: () => {
        switch (upgrades.tremorSenseLevel) {
          case 1: return 'Basic direction';
          case 2: return 'Direction + distance';
          case 3: return 'Precise tracking';
          default: return 'Unknown';
        }
      },
    },
    {
      id: 'momentum', name: '⚡ Momentum',
      currentLevel: upgrades.momentumLevel,
      maxLevel: 3,
      getNext: () => BALANCE.UPGRADES.MOMENTUM[upgrades.momentumLevel + 1] || null,
      getDesc: () => {
        const cur = BALANCE.UPGRADES.MOMENTUM[upgrades.momentumLevel];
        return cur ? `${cur.multiplier}x consecutive hit bonus` : '1x';
      },
    },
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', justifyContent: 'flex-end',
        pointerEvents: 'auto' as const,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 340, height: '100%',
          background: 'rgba(10,10,26,0.92)',
          borderLeft: '1px solid rgba(255,255,255,0.1)',
          padding: 20, overflowY: 'auto',
        }}
      >
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 20,
        }}>
          <h2 style={{ fontSize: 14, color: '#FFB347', margin: 0 }}>UPGRADES</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: '1px solid #555', color: '#999',
              padding: '4px 8px', cursor: 'pointer', fontSize: 10,
              fontFamily: 'inherit',
            }}
          >
            ESC
          </button>
        </div>

        {/* Resource display */}
        <div style={{
          display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap',
        }}>
          {Object.entries(resources).map(([key, val]) => (
            <span key={key} style={{ fontSize: 10, color: oreColorMap[key] || '#fff' }}>
              {key}: {val}
            </span>
          ))}
        </div>

        {/* Upgrade items */}
        {upgradeDefs.map(upg => {
          const next = upg.getNext();
          const affordable = next ? canAfford(resources, next.cost as Record<string, number>) : false;
          const maxed = upg.currentLevel >= upg.maxLevel && !next;

          return (
            <div
              key={upg.id}
              style={{
                marginBottom: 12, padding: 12, borderRadius: 6,
                background: affordable ? 'rgba(0,206,209,0.08)' : 'rgba(255,255,255,0.03)',
                border: affordable ? '1px solid rgba(0,206,209,0.3)' : '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: '#ddd' }}>{upg.name}</span>
                <span style={{ fontSize: 9, color: '#888' }}>
                  Lv.{upg.currentLevel}/{upg.maxLevel}
                </span>
              </div>
              <div style={{ fontSize: 9, color: '#999', marginBottom: 6 }}>
                {upg.getDesc()}
              </div>
              {next && !maxed ? (
                <>
                  <div style={{ fontSize: 9, color: affordable ? '#00CED1' : '#664444', marginBottom: 6 }}>
                    Cost: {costString(next.cost as Record<string, number>)}
                  </div>
                  <button
                    onClick={() => onPurchase(upg.id)}
                    disabled={!affordable}
                    style={{
                      width: '100%', padding: '6px 0',
                      background: affordable ? '#00CED1' : '#333',
                      color: affordable ? '#000' : '#666',
                      border: 'none', borderRadius: 4,
                      fontSize: 10, fontFamily: 'inherit',
                      cursor: affordable ? 'pointer' : 'default',
                    }}
                  >
                    {affordable ? 'PURCHASE' : 'INSUFFICIENT'}
                  </button>
                </>
              ) : (
                <div style={{ fontSize: 10, color: '#44FF44', textAlign: 'center' }}>
                  {maxed ? '★ MAXED ★' : 'PURCHASED'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
