import React, { useEffect, useState } from 'react';
import { GameOverPayload, Resources } from '@dig/shared';
import { formatTime } from '../utils/helpers';

interface ScoreScreenProps {
  data: GameOverPayload;
  playerId: string;
  onPlayAgain: () => void;
}

export function ScoreScreen({ data, playerId, onPlayAgain }: ScoreScreenProps) {
  const [revealStep, setRevealStep] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= 6; i++) {
      timers.push(setTimeout(() => setRevealStep(i), i * 350));
    }
    return () => timers.forEach(clearTimeout);
  }, []);

  const isWinner = data.winnerId === playerId;
  const myStats = data.stats.find(s => s.playerId === playerId);
  const opponentStats = data.stats.find(s => s.playerId !== playerId);

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 300,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at center, rgba(10,10,30,0.97), rgba(2,2,8,0.99))',
      pointerEvents: 'auto' as const,
    }}>
      {revealStep >= 1 && (
        <div style={{
          fontSize: 48, fontWeight: 'bold',
          color: isWinner ? '#FFD700' : '#FF4444',
          textShadow: `0 0 30px ${isWinner ? '#FFD700' : '#FF4444'}, 0 0 60px ${isWinner ? 'rgba(255,215,0,0.3)' : 'rgba(255,68,68,0.3)'}`,
          marginBottom: 8,
          animation: 'resultSlide 0.5s cubic-bezier(.4,0,.2,1)',
          letterSpacing: 6,
        }}>
          {isWinner ? 'VICTORY' : data.winnerId ? 'DEFEAT' : 'DRAW'}
        </div>
      )}

      {revealStep >= 2 && (
        <div style={{
          fontSize: 11, color: '#00CED1', marginBottom: 28,
          animation: 'fadeIn 0.3s ease-out',
          letterSpacing: 2,
        }}>
          {data.encounter.replace('_', ' ')}
          <span style={{ color: '#666', margin: '0 8px' }}>—</span>
          <span style={{ color: '#999' }}>{data.reason}</span>
        </div>
      )}

      {revealStep >= 3 && myStats && (
        <div style={{
          background: 'rgba(10,10,26,0.85)',
          border: `1px solid ${isWinner ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 10, padding: 20, width: 360,
          marginBottom: 14,
          animation: 'resultSlide 0.3s ease-out',
        }}>
          <div style={{ fontSize: 11, color: '#FFB347', marginBottom: 14, letterSpacing: 1 }}>YOUR STATS</div>
          <StatRow label="Tiles Dug" value={myStats.tilesDug.toString()} />
          <StatRow label="Time" value={formatTime(myStats.timeMs)} />
          <OreRow ore={myStats.oreCollected} />
          <StatRow label="Damage Dealt" value={myStats.damageDealt.toString()} />
          <div style={{ height: 8 }} />
          <StatRow label="XP Earned" value={`+${myStats.xpEarned}`} highlight />
        </div>
      )}

      {revealStep >= 4 && opponentStats && (
        <div style={{
          background: 'rgba(10,10,26,0.6)',
          border: '1px solid rgba(255,255,255,0.04)',
          borderRadius: 10, padding: 18, width: 360,
          marginBottom: 28,
          animation: 'resultSlide 0.3s ease-out',
        }}>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 12 }}>OPPONENT</div>
          <StatRow label="Tiles Dug" value={opponentStats.tilesDug.toString()} />
          <OreRow ore={opponentStats.oreCollected} />
          <StatRow label="Damage" value={opponentStats.damageDealt.toString()} />
        </div>
      )}

      {revealStep >= 5 && (
        <button
          onClick={onPlayAgain}
          style={{
            padding: '14px 40px',
            background: 'linear-gradient(180deg, #00E5E5 0%, #008B8B 100%)',
            border: 'none', borderRadius: 8,
            color: '#001A1A', fontSize: 14, fontWeight: 'bold',
            fontFamily: 'inherit', cursor: 'pointer',
            boxShadow: '0 0 30px rgba(0,206,209,0.3)',
            animation: 'fadeIn 0.3s ease-out',
            letterSpacing: 3,
          }}
          onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          PLAY AGAIN
        </button>
      )}

      <style>{`
        @keyframes resultSlide {
          from { transform: translateY(25px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      fontSize: 10, padding: '4px 0',
      color: highlight ? '#FFD700' : '#ccc',
    }}>
      <span style={{ color: '#777' }}>{label}</span>
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}

function OreRow({ ore }: { ore: Resources }) {
  const oreData = [
    { key: 'copper', label: 'Cu', color: '#D2691E' },
    { key: 'iron', label: 'Fe', color: '#4682B4' },
    { key: 'gold', label: 'Au', color: '#FFD700' },
    { key: 'crystal', label: 'Cr', color: '#00CED1' },
    { key: 'emberStone', label: 'Em', color: '#FF4500' },
  ];

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      fontSize: 10, padding: '4px 0',
    }}>
      <span style={{ color: '#777' }}>Ore</span>
      <div style={{ display: 'flex', gap: 8 }}>
        {oreData.map(o => {
          const val = ore[o.key as keyof Resources] || 0;
          return val > 0 ? (
            <span key={o.key} style={{ color: o.color }}>{o.label}:{val}</span>
          ) : null;
        })}
      </div>
    </div>
  );
}
