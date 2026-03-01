import React, { useEffect, useState } from 'react';
import { GameOverPayload } from '@dig/shared';
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
  const opStats = data.stats.find(s => s.playerId !== playerId);

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 300,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.85)',
      pointerEvents: 'auto' as const,
    }}>
      {revealStep >= 1 && (
        <div style={{
          fontSize: 36, fontWeight: 'bold', marginBottom: 8,
          color: isWinner ? '#FFD700' : '#FF4444',
          textShadow: `0 0 20px ${isWinner ? '#FFD700' : '#FF4444'}`,
        }}>
          {data.winnerId === null ? 'DRAW' : isWinner ? 'VICTORY!' : 'DEFEAT'}
        </div>
      )}

      {revealStep >= 2 && (
        <div style={{ fontSize: 10, color: '#999', marginBottom: 24 }}>
          {data.reason}
        </div>
      )}

      {revealStep >= 3 && (
        <div style={{
          display: 'flex', gap: 40, marginBottom: 24,
          fontSize: 11, color: '#CCC',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: '#4488FF', marginBottom: 4 }}>YOU</div>
            <div style={{ fontSize: 28, color: '#4488FF', fontWeight: 'bold' }}>
              {Math.floor(data.finalScores[playerId] || 0)}
            </div>
            <div style={{ fontSize: 8, color: '#666' }}>points</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: '#FF4444', marginBottom: 4 }}>RIVAL</div>
            <div style={{ fontSize: 28, color: '#FF4444', fontWeight: 'bold' }}>
              {Math.floor(opStats ? (data.finalScores[opStats.playerId] || 0) : 0)}
            </div>
            <div style={{ fontSize: 8, color: '#666' }}>points</div>
          </div>
        </div>
      )}

      {revealStep >= 4 && myStats && (
        <div style={{
          background: 'rgba(255,255,255,0.03)', borderRadius: 8,
          padding: '12px 24px', marginBottom: 16,
          border: '1px solid rgba(255,255,255,0.05)',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 32px',
          fontSize: 9, color: '#AAA',
        }}>
          <div>Tiles Dug: <span style={{ color: '#FFF' }}>{myStats.tilesDug}</span></div>
          <div>Nodes Claimed: <span style={{ color: '#4488FF' }}>{myStats.nodesClaimed}</span></div>
          <div>Nodes Stolen: <span style={{ color: '#FFD700' }}>{myStats.nodesStolen}</span></div>
          <div>Kills: <span style={{ color: '#FF4444' }}>{myStats.kills}</span></div>
          <div>Time: <span style={{ color: '#FFF' }}>{formatTime(myStats.timeMs)}</span></div>
          <div>XP Earned: <span style={{ color: '#00CED1' }}>+{myStats.xpEarned}</span></div>
        </div>
      )}

      {revealStep >= 5 && myStats && (
        <div style={{
          display: 'flex', gap: 12, marginBottom: 20,
          fontSize: 9,
        }}>
          {Object.entries(myStats.oreCollected).map(([key, val]) => (
            val > 0 ? (
              <span key={key} style={{
                color: key === 'copper' ? '#D2691E' : key === 'iron' ? '#4682B4'
                  : key === 'gold' ? '#FFD700' : key === 'crystal' ? '#00CED1' : '#FF4500',
              }}>
                {key}: {val}
              </span>
            ) : null
          ))}
        </div>
      )}

      {revealStep >= 6 && (
        <button
          onClick={onPlayAgain}
          style={{
            background: 'linear-gradient(180deg, #00CED1, #008B8B)',
            border: 'none', borderRadius: 8,
            color: '#000', padding: '12px 32px',
            fontSize: 12, fontFamily: 'inherit',
            cursor: 'pointer', fontWeight: 'bold',
          }}
        >
          PLAY AGAIN
        </button>
      )}
    </div>
  );
}
