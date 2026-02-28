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
      timers.push(setTimeout(() => setRevealStep(i), i * 300));
    }
    return () => timers.forEach(clearTimeout);
  }, []);

  const isWinner = data.winnerId === playerId;
  const myStats = data.stats.find(s => s.playerId === playerId);
  const opponentStats = data.stats.find(s => s.playerId !== playerId);

  const formatOre = (r: Resources) =>
    `Cu:${r.copper} Fe:${r.iron} Au:${r.gold} Cr:${r.crystal} Em:${r.emberStone}`;

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 300,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(5,5,15,0.95)',
      pointerEvents: 'auto' as const,
    }}>
      {revealStep >= 1 && (
        <div style={{
          fontSize: 36, fontWeight: 'bold',
          color: isWinner ? '#FFD700' : '#FF4444',
          textShadow: `0 0 20px ${isWinner ? '#FFD700' : '#FF4444'}`,
          marginBottom: 8,
          animation: 'slideIn 0.4s ease-out',
        }}>
          {isWinner ? 'VICTORY' : data.winnerId ? 'DEFEAT' : 'DRAW'}
        </div>
      )}

      {revealStep >= 2 && (
        <div style={{
          fontSize: 11, color: '#00CED1', marginBottom: 24,
          animation: 'fadeIn 0.3s ease-out',
        }}>
          {data.encounter.replace('_', ' ')} — {data.reason}
        </div>
      )}

      {revealStep >= 3 && myStats && (
        <div style={{
          background: 'rgba(10,10,26,0.8)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8, padding: 20, width: 340,
          marginBottom: 16,
          animation: 'slideIn 0.3s ease-out',
        }}>
          <div style={{ fontSize: 11, color: '#FFB347', marginBottom: 12 }}>YOUR STATS</div>
          <StatRow label="Tiles Dug" value={myStats.tilesDug.toString()} />
          <StatRow label="Time" value={formatTime(myStats.timeMs)} />
          <StatRow label="Ore" value={formatOre(myStats.oreCollected)} />
          <StatRow label="Damage Dealt" value={myStats.damageDealt.toString()} />
          <StatRow label="XP Earned" value={`+${myStats.xpEarned}`} highlight />
        </div>
      )}

      {revealStep >= 4 && opponentStats && (
        <div style={{
          background: 'rgba(10,10,26,0.6)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 8, padding: 20, width: 340,
          marginBottom: 24,
          animation: 'slideIn 0.3s ease-out',
        }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 12 }}>OPPONENT</div>
          <StatRow label="Tiles Dug" value={opponentStats.tilesDug.toString()} />
          <StatRow label="Ore" value={formatOre(opponentStats.oreCollected)} />
          <StatRow label="Damage" value={opponentStats.damageDealt.toString()} />
        </div>
      )}

      {revealStep >= 5 && (
        <button
          onClick={onPlayAgain}
          style={{
            padding: '12px 30px',
            background: 'linear-gradient(180deg, #00CED1 0%, #008B8B 100%)',
            border: 'none', borderRadius: 6,
            color: '#000', fontSize: 12, fontWeight: 'bold',
            fontFamily: 'inherit', cursor: 'pointer',
            boxShadow: '0 0 20px rgba(0,206,209,0.3)',
            animation: 'fadeIn 0.3s ease-out',
          }}
        >
          PLAY AGAIN
        </button>
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateY(20px); opacity: 0; }
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
      fontSize: 10, padding: '3px 0',
      color: highlight ? '#FFD700' : '#ccc',
    }}>
      <span style={{ color: '#888' }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
