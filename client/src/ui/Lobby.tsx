import React, { useState } from 'react';

interface LobbyProps {
  onJoinQueue: () => void;
}

export function Lobby({ onJoinQueue }: LobbyProps) {
  const [searching, setSearching] = useState(false);

  const handleClick = () => {
    setSearching(true);
    onJoinQueue();
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 100,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at center, #0a0a2e 0%, #050510 100%)',
      pointerEvents: 'auto' as const,
    }}>
      <div style={{
        fontSize: 80, fontWeight: 'bold', color: '#00CED1',
        textShadow: '0 0 30px #00CED1, 0 0 60px rgba(0,206,209,0.3)',
        marginBottom: 20, letterSpacing: 20,
        animation: 'pulse 2s ease-in-out infinite',
      }}>
        DIG
      </div>

      <div style={{
        fontSize: 11, color: '#888', marginBottom: 40,
        textAlign: 'center', maxWidth: 400, lineHeight: '22px',
      }}>
        Race through the underground. Mine ore. Upgrade your gear.
        Reach the center first. What awaits you there... changes every time.
      </div>

      {!searching ? (
        <button
          onClick={handleClick}
          style={{
            padding: '14px 36px',
            background: 'linear-gradient(180deg, #00CED1 0%, #008B8B 100%)',
            border: 'none', borderRadius: 6,
            color: '#000', fontSize: 14, fontWeight: 'bold',
            fontFamily: 'inherit', cursor: 'pointer',
            boxShadow: '0 0 20px rgba(0,206,209,0.3)',
            transition: 'transform 0.1s',
          }}
          onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.05)')}
          onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          FIND MATCH
        </button>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 12, color: '#00CED1',
            animation: 'blink 1s ease-in-out infinite',
          }}>
            Searching for opponent...
          </div>
          <div style={{ fontSize: 9, color: '#555', marginTop: 12 }}>
            A bot will join after 30 seconds
          </div>
        </div>
      )}

      <div style={{
        position: 'absolute', bottom: 20,
        fontSize: 9, color: '#444', textAlign: 'center',
      }}>
        Click to dig • Q for sonar • E for dynamite • U for upgrades
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
