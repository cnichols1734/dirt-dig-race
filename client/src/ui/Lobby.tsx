import React, { useState, useEffect } from 'react';

interface LobbyProps {
  onJoinQueue: () => void;
}

export function Lobby({ onJoinQueue }: LobbyProps) {
  const [searching, setSearching] = useState(false);
  const [showTips, setShowTips] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowTips(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleClick = () => {
    setSearching(true);
    onJoinQueue();
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 100,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at center, #0a0a2e 0%, #050510 70%, #020208 100%)',
      pointerEvents: 'auto' as const,
    }}>
      {/* Decorative pickaxes */}
      <div style={{
        fontSize: 40, position: 'absolute', top: '15%', opacity: 0.08,
        letterSpacing: 20,
      }}>
        &#9935; &#9935; &#9935;
      </div>

      {/* Title */}
      <div style={{
        fontSize: 96, fontWeight: 'bold', color: '#00CED1',
        textShadow: '0 0 40px #00CED1, 0 0 80px rgba(0,206,209,0.4), 0 4px 0 #006666',
        marginBottom: 8, letterSpacing: 24,
        animation: 'titlePulse 3s ease-in-out infinite',
      }}>
        DIG
      </div>

      <div style={{
        fontSize: 10, color: '#00CED188', marginBottom: 36,
        letterSpacing: 6, textTransform: 'uppercase',
      }}>
        Claim &amp; Control
      </div>

      {/* How to play section */}
      {showTips && (
        <div style={{
          maxWidth: 480, marginBottom: 36, padding: '16px 24px',
          background: 'rgba(0,206,209,0.04)',
          border: '1px solid rgba(0,206,209,0.1)',
          borderRadius: 10,
          animation: 'fadeInUp 0.6s ease-out',
        }}>
          <div style={{ fontSize: 11, color: '#00CED1', marginBottom: 12, textAlign: 'center', letterSpacing: 2 }}>
            HOW TO PLAY
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <TipItem icon="&#128433;" text="Click tiles to dig and explore" />
            <TipItem icon="&#128142;" text="Collect ore to upgrade your gear" />
            <TipItem icon="&#127919;" text="Find hidden nodes and claim them" />
            <TipItem icon="&#9889;" text="Steal rival nodes & fight for control" />
          </div>
          <div style={{
            fontSize: 9, color: '#555', marginTop: 12, textAlign: 'center',
            lineHeight: '16px',
          }}>
            Discover ore nodes, claim them for points, and reach 500 to win!
          </div>
        </div>
      )}

      {!searching ? (
        <button
          onClick={handleClick}
          style={{
            padding: '16px 48px',
            background: 'linear-gradient(180deg, #00E5E5 0%, #008B8B 100%)',
            border: 'none', borderRadius: 8,
            color: '#001A1A', fontSize: 16, fontWeight: 'bold',
            fontFamily: 'inherit', cursor: 'pointer',
            boxShadow: '0 0 30px rgba(0,206,209,0.3), 0 4px 15px rgba(0,0,0,0.3)',
            transition: 'all 0.15s cubic-bezier(.4,0,.2,1)',
            letterSpacing: 3,
          }}
          onMouseOver={e => {
            e.currentTarget.style.transform = 'scale(1.08) translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 0 40px rgba(0,206,209,0.5), 0 6px 20px rgba(0,0,0,0.3)';
          }}
          onMouseOut={e => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 0 30px rgba(0,206,209,0.3), 0 4px 15px rgba(0,0,0,0.3)';
          }}
        >
          FIND MATCH
        </button>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <div style={{ position: 'relative', width: 48, height: 48, margin: '0 auto 16px' }}>
            <div style={{
              width: 48, height: 48, border: '3px solid transparent',
              borderTopColor: '#00CED1', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
          </div>
          <div style={{
            fontSize: 12, color: '#00CED1',
            letterSpacing: 2,
          }}>
            Searching...
          </div>
          <div style={{ fontSize: 9, color: '#444', marginTop: 12 }}>
            A bot will join shortly if no opponent found
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={{
        position: 'absolute', bottom: 24,
        display: 'flex', gap: 20, fontSize: 9, color: '#333',
      }}>
        <ControlHint label="Click" action="Dig" />
        <ControlHint label="Q" action="Sonar" />
        <ControlHint label="E" action="TNT" />
        <ControlHint label="U" action="Upgrades" />
        <ControlHint label="ESC" action="Close" />
      </div>

      <style>{`
        @keyframes titlePulse {
          0%, 100% { opacity: 1; filter: brightness(1); }
          50% { opacity: 0.85; filter: brightness(1.2); }
        }
        @keyframes fadeInUp {
          from { transform: translateY(15px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

function TipItem({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8,
      fontSize: 9, color: '#999', lineHeight: '16px',
    }}>
      <span style={{ fontSize: 14 }} dangerouslySetInnerHTML={{ __html: icon }} />
      <span>{text}</span>
    </div>
  );
}

function ControlHint({ label, action }: { label: string; action: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{
        padding: '2px 6px', background: 'rgba(255,255,255,0.06)',
        borderRadius: 3, border: '1px solid rgba(255,255,255,0.1)',
        color: '#666', fontSize: 8,
      }}>
        {label}
      </span>
      <span>{action}</span>
    </div>
  );
}
