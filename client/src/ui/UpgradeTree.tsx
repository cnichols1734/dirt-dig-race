import React from 'react';
import { Resources, UpgradeState } from '@dig/shared';
import { BALANCE } from '@dig/shared';
import { useIsMobile } from './hooks';

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

const oreColorMap: Record<string, string> = {
  copper: '#D2691E', iron: '#4682B4', gold: '#FFD700',
  crystal: '#00CED1', emberStone: '#FF4500',
};

const oreAbbrev: Record<string, string> = {
  copper: 'Cu', iron: 'Fe', gold: 'Au',
  crystal: 'Cr', emberStone: 'Em',
};

function formatCost(cost: Record<string, number>): React.ReactNode {
  const entries = Object.entries(cost).filter(([, v]) => v > 0);
  return (
    <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
      {entries.map(([k, v]) => (
        <span key={k} style={{ color: oreColorMap[k] || '#888' }}>
          {v} {oreAbbrev[k] || k}
        </span>
      ))}
    </span>
  );
}

export function UpgradeTree({ resources, upgrades, onPurchase, onClose }: UpgradeTreeProps) {
  const mobile = useIsMobile();

  const upgradeDefs = [
    {
      id: 'pickaxe', name: 'Pickaxe Power', icon: '\u26CF',
      currentLevel: upgrades.pickaxeLevel,
      maxLevel: 6,
      getNext: () => BALANCE.UPGRADES.PICKAXE.find(p => p.level === upgrades.pickaxeLevel + 1),
      getDesc: () => {
        const cur = BALANCE.UPGRADES.PICKAXE.find(p => p.level === upgrades.pickaxeLevel);
        const next = BALANCE.UPGRADES.PICKAXE.find(p => p.level === upgrades.pickaxeLevel + 1);
        return next ? `${cur?.damage} \u2192 ${next.damage} damage` : 'MAX POWER';
      },
      color: '#FFB347',
    },
    {
      id: 'lantern', name: 'Lantern Range', icon: '\uD83D\uDCA1',
      currentLevel: upgrades.lanternLevel,
      maxLevel: 4,
      getNext: () => BALANCE.UPGRADES.LANTERN.find(p => p.level === upgrades.lanternLevel + 1),
      getDesc: () => {
        const cur = BALANCE.UPGRADES.LANTERN.find(p => p.level === upgrades.lanternLevel);
        const next = BALANCE.UPGRADES.LANTERN.find(p => p.level === upgrades.lanternLevel + 1);
        return next ? `${cur?.radius} \u2192 ${next.radius} tile radius` : 'MAX RANGE';
      },
      color: '#FFD700',
    },
    {
      id: 'sonar', name: 'Sonar Ping', icon: '\uD83D\uDCE1',
      currentLevel: upgrades.sonarUnlocked ? 1 : 0,
      maxLevel: 1,
      getNext: () => upgrades.sonarUnlocked ? null : { cost: BALANCE.UPGRADES.SONAR.unlockCost },
      getDesc: () => upgrades.sonarUnlocked ? 'ACTIVE' : 'Reveal area + detect opponent',
      color: '#00CED1',
    },
    {
      id: 'dynamite', name: 'Dynamite', icon: '\uD83D\uDCA3',
      currentLevel: upgrades.dynamiteUnlocked ? 1 : 0,
      maxLevel: 1,
      getNext: () => upgrades.dynamiteUnlocked ? null : { cost: BALANCE.UPGRADES.DYNAMITE.unlockCost },
      getDesc: () => upgrades.dynamiteUnlocked ? 'ACTIVE' : 'Blast 3x3 area clear',
      color: '#FF4500',
    },
    {
      id: 'dynamite_charge', name: 'TNT Charge', icon: '\uD83E\uDDE8',
      currentLevel: upgrades.dynamiteCharges,
      maxLevel: BALANCE.MAX_DYNAMITE_CHARGES,
      getNext: () => {
        if (!upgrades.dynamiteUnlocked || upgrades.dynamiteCharges >= BALANCE.MAX_DYNAMITE_CHARGES) return null;
        return { cost: BALANCE.UPGRADES.DYNAMITE.chargeCost };
      },
      getDesc: () => `${upgrades.dynamiteCharges}/${BALANCE.MAX_DYNAMITE_CHARGES} charges`,
      color: '#FF6347',
    },
    {
      id: 'steel_boots', name: 'Steel Boots', icon: '\uD83E\uDD7E',
      currentLevel: upgrades.steelBootsLevel,
      maxLevel: 2,
      getNext: () => BALANCE.UPGRADES.STEEL_BOOTS[upgrades.steelBootsLevel + 1] || null,
      getDesc: () => {
        const cur = BALANCE.UPGRADES.STEEL_BOOTS[upgrades.steelBootsLevel];
        return `${Math.round((cur?.reduction || 0) * 100)}% damage reduction`;
      },
      color: '#888',
    },
    {
      id: 'momentum', name: 'Momentum', icon: '\u26A1',
      currentLevel: upgrades.momentumLevel,
      maxLevel: 3,
      getNext: () => BALANCE.UPGRADES.MOMENTUM[upgrades.momentumLevel + 1] || null,
      getDesc: () => {
        const cur = BALANCE.UPGRADES.MOMENTUM[upgrades.momentumLevel];
        return cur ? `${cur.multiplier}x consecutive bonus` : '1x';
      },
      color: '#FFFF44',
    },
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        justifyContent: mobile ? 'center' : 'flex-end',
        alignItems: mobile ? 'flex-end' : 'stretch',
        pointerEvents: 'auto' as const,
        animation: 'upgradeFadeIn 0.2s ease-out',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: mobile ? '100%' : 360,
          height: mobile ? '85vh' : '100%',
          maxHeight: mobile ? '85vh' : undefined,
          background: 'rgba(8,8,22,0.97)',
          borderLeft: mobile ? 'none' : '1px solid rgba(0,206,209,0.15)',
          borderTop: mobile ? '1px solid rgba(0,206,209,0.15)' : 'none',
          borderRadius: mobile ? '20px 20px 0 0' : 0,
          padding: mobile ? '16px 16px 24px' : '20px',
          overflowY: 'auto',
          animation: mobile ? 'upgradeSlideUp 0.3s ease-out' : 'upgradeSlideIn 0.25s ease-out',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Drag handle on mobile */}
        {mobile && (
          <div style={{
            width: 40, height: 4, borderRadius: 2,
            background: 'rgba(255,255,255,0.2)',
            margin: '0 auto 12px',
          }} />
        )}

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: mobile ? 14 : 20,
        }}>
          <h2 style={{
            fontSize: mobile ? 16 : 14, color: '#FFB347', margin: 0, letterSpacing: 2,
          }}>UPGRADES</h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid #444', color: '#888',
              padding: mobile ? '8px 16px' : '4px 10px',
              cursor: 'pointer',
              fontSize: mobile ? 11 : 9,
              fontFamily: 'inherit', borderRadius: mobile ? 8 : 4,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {mobile ? '✕ CLOSE' : 'ESC'}
          </button>
        </div>

        <div style={{
          display: 'flex', gap: 8, marginBottom: mobile ? 14 : 18, flexWrap: 'wrap',
          padding: mobile ? '10px 12px' : '8px 10px',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: 6,
        }}>
          {Object.entries(resources).map(([key, val]) => (
            <span key={key} style={{
              fontSize: mobile ? 11 : 10,
              color: val > 0 ? (oreColorMap[key] || '#fff') : '#444',
              display: 'flex', alignItems: 'center', gap: 3,
            }}>
              <span style={{
                width: mobile ? 10 : 8, height: mobile ? 10 : 8, borderRadius: 2,
                background: oreColorMap[key] || '#888',
                opacity: val > 0 ? 1 : 0.3,
                display: 'inline-block',
              }} />
              {val}
            </span>
          ))}
        </div>

        {upgradeDefs.map(upg => {
          const next = upg.getNext();
          const affordable = next ? canAfford(resources, next.cost as Record<string, number>) : false;
          const maxed = upg.currentLevel >= upg.maxLevel && !next;

          return (
            <div
              key={upg.id}
              style={{
                marginBottom: mobile ? 8 : 10,
                padding: mobile ? 14 : 12, borderRadius: mobile ? 12 : 8,
                background: affordable ? `${upg.color}0A` : 'rgba(255,255,255,0.02)',
                border: affordable ? `1px solid ${upg.color}33` : '1px solid rgba(255,255,255,0.04)',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: mobile ? 13 : 11, color: '#ddd' }}>
                  <span style={{ marginRight: 6 }}>{upg.icon}</span>
                  {upg.name}
                </span>
                <span style={{ fontSize: mobile ? 10 : 9, color: upg.color, opacity: 0.7 }}>
                  {upg.currentLevel}/{upg.maxLevel}
                </span>
              </div>
              <div style={{ fontSize: mobile ? 10 : 9, color: '#888', marginBottom: 6 }}>
                {upg.getDesc()}
              </div>
              {next && !maxed ? (
                <>
                  <div style={{ fontSize: mobile ? 10 : 9, marginBottom: 6, opacity: affordable ? 1 : 0.5 }}>
                    {formatCost(next.cost as Record<string, number>)}
                  </div>
                  <button
                    onClick={() => onPurchase(upg.id)}
                    disabled={!affordable}
                    style={{
                      width: '100%', padding: mobile ? '12px 0' : '7px 0',
                      background: affordable
                        ? `linear-gradient(180deg, ${upg.color}, ${upg.color}88)`
                        : '#222',
                      color: affordable ? '#000' : '#555',
                      border: 'none', borderRadius: mobile ? 10 : 5,
                      fontSize: mobile ? 12 : 10, fontFamily: 'inherit',
                      cursor: affordable ? 'pointer' : 'default',
                      fontWeight: 'bold',
                      letterSpacing: 1,
                      transition: 'all 0.1s',
                      WebkitTapHighlightColor: 'transparent',
                      minHeight: mobile ? 44 : undefined,
                    }}
                  >
                    {affordable ? 'PURCHASE' : 'NEED MORE ORE'}
                  </button>
                </>
              ) : (
                <div style={{
                  fontSize: mobile ? 12 : 10, textAlign: 'center',
                  color: maxed ? '#44FF44' : upg.color,
                  padding: '4px 0',
                }}>
                  {maxed ? '\u2605 MAXED \u2605' : '\u2714 ACTIVE'}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes upgradeFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes upgradeSlideIn {
          from { transform: translateX(100px); }
          to { transform: translateX(0); }
        }
        @keyframes upgradeSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
