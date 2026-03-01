import React, { useState, useEffect } from 'react';
import { BotDifficulty } from '@dig/shared';
import { useIsMobile } from './hooks';

interface LobbyProps {
  onJoinQueue: () => void;
  onPlayBot?: (difficulty: BotDifficulty) => void;
}

export function Lobby({ onJoinQueue, onPlayBot }: LobbyProps) {
  const [searching, setSearching] = useState(false);
  const [showBotSelect, setShowBotSelect] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const mobile = useIsMobile();

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
      padding: mobile ? '16px' : 0,
    }}>
      {!mobile && (
        <div style={{
          fontSize: 40, position: 'absolute', top: '15%', opacity: 0.08,
          letterSpacing: 20,
        }}>
          &#9935; &#9935; &#9935;
        </div>
      )}

      <div style={{
        fontSize: mobile ? 64 : 96, fontWeight: 'bold', color: '#00CED1',
        textShadow: '0 0 40px #00CED1, 0 0 80px rgba(0,206,209,0.4), 0 4px 0 #006666',
        marginBottom: 8, letterSpacing: mobile ? 12 : 24,
        animation: 'titlePulse 3s ease-in-out infinite',
      }}>
        DIG
      </div>

      <div style={{
        fontSize: mobile ? 9 : 10, color: '#00CED188', marginBottom: mobile ? 24 : 36,
        letterSpacing: mobile ? 4 : 6, textTransform: 'uppercase',
      }}>
        Claim &amp; Control
      </div>

      {showTips && (
        <div style={{
          maxWidth: mobile ? '100%' : 480,
          width: mobile ? '100%' : undefined,
          marginBottom: mobile ? 24 : 36, padding: mobile ? '12px 16px' : '16px 24px',
          background: 'rgba(0,206,209,0.04)',
          border: '1px solid rgba(0,206,209,0.1)',
          borderRadius: mobile ? 14 : 10,
          animation: 'fadeInUp 0.6s ease-out',
        }}>
          <div style={{
            fontSize: mobile ? 10 : 11, color: '#00CED1',
            marginBottom: mobile ? 10 : 12, textAlign: 'center', letterSpacing: 2,
          }}>
            HOW TO PLAY
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: mobile ? '1fr' : '1fr 1fr',
            gap: mobile ? 8 : 10,
          }}>
            <TipItem icon="⛏" text={mobile ? 'Tap tiles to dig' : 'Click tiles to dig and explore'} mobile={mobile} />
            <TipItem icon="💎" text="Collect ore to upgrade your gear" mobile={mobile} />
            <TipItem icon="🎯" text="Find hidden nodes and claim them" mobile={mobile} />
            <TipItem icon="⚡" text="Steal rival nodes & fight for control" mobile={mobile} />
          </div>
          <div style={{
            fontSize: mobile ? 8 : 9, color: '#555', marginTop: mobile ? 8 : 12,
            textAlign: 'center', lineHeight: '16px',
          }}>
            Discover ore nodes, claim them for points, and reach 1000 to win!
          </div>
        </div>
      )}

      {!searching && !showBotSelect ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: mobile ? 14 : 12 }}>
          <button
            onClick={handleClick}
            style={{
              padding: mobile ? '18px 56px' : '16px 48px',
              background: 'linear-gradient(180deg, #00E5E5 0%, #008B8B 100%)',
              border: 'none', borderRadius: mobile ? 14 : 8,
              color: '#001A1A',
              fontSize: mobile ? 18 : 16,
              fontWeight: 'bold',
              fontFamily: 'inherit', cursor: 'pointer',
              boxShadow: '0 0 30px rgba(0,206,209,0.3), 0 4px 15px rgba(0,0,0,0.3)',
              transition: 'all 0.15s cubic-bezier(.4,0,.2,1)',
              letterSpacing: 3,
              WebkitTapHighlightColor: 'transparent',
              minHeight: mobile ? 56 : undefined,
            }}
            onMouseOver={e => {
              if (!mobile) {
                e.currentTarget.style.transform = 'scale(1.08) translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 0 40px rgba(0,206,209,0.5), 0 6px 20px rgba(0,0,0,0.3)';
              }
            }}
            onMouseOut={e => {
              if (!mobile) {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 0 30px rgba(0,206,209,0.3), 0 4px 15px rgba(0,0,0,0.3)';
              }
            }}
            onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.95)'; }}
            onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            FIND MATCH
          </button>
          <button
            onClick={() => setShowBotSelect(true)}
            style={{
              padding: mobile ? '14px 40px' : '10px 32px',
              background: 'linear-gradient(180deg, #FF8C42 0%, #CC5500 100%)',
              border: 'none', borderRadius: mobile ? 12 : 6,
              color: '#1A0A00',
              fontSize: mobile ? 14 : 12,
              fontWeight: 'bold',
              fontFamily: 'inherit', cursor: 'pointer',
              boxShadow: '0 0 20px rgba(255,140,66,0.3)',
              letterSpacing: 2,
              transition: 'all 0.15s',
              WebkitTapHighlightColor: 'transparent',
              minHeight: mobile ? 50 : undefined,
            }}
            onMouseOver={e => {
              if (!mobile) {
                e.currentTarget.style.transform = 'scale(1.05) translateY(-1px)';
              }
            }}
            onMouseOut={e => {
              if (!mobile) {
                e.currentTarget.style.transform = 'scale(1)';
              }
            }}
            onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.95)'; }}
            onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            PLAY VS BOT
          </button>
        </div>
      ) : showBotSelect ? (
        <div style={{
          textAlign: 'center',
          animation: 'fadeInUp 0.3s ease-out',
        }}>
          <div style={{
            fontSize: mobile ? 11 : 12, color: '#FF8C42',
            letterSpacing: 3, marginBottom: mobile ? 18 : 16,
            textTransform: 'uppercase',
          }}>
            Select Difficulty
          </div>
          <div style={{
            display: 'flex', flexDirection: mobile ? 'column' : 'row',
            gap: mobile ? 10 : 12, justifyContent: 'center', alignItems: 'center',
          }}>
            <DifficultyButton
              label="EASY"
              subtitle="Learning the ropes"
              color="#4CAF50"
              darkColor="#2E7D32"
              mobile={mobile}
              onClick={() => onPlayBot?.(BotDifficulty.EASY)}
            />
            <DifficultyButton
              label="MEDIUM"
              subtitle="Fair challenge"
              color="#FF9800"
              darkColor="#E65100"
              mobile={mobile}
              onClick={() => onPlayBot?.(BotDifficulty.MEDIUM)}
            />
            <DifficultyButton
              label="HARD"
              subtitle="Prepare to sweat"
              color="#F44336"
              darkColor="#B71C1C"
              mobile={mobile}
              onClick={() => onPlayBot?.(BotDifficulty.HARD)}
            />
          </div>
          <button
            onClick={() => setShowBotSelect(false)}
            style={{
              marginTop: mobile ? 16 : 14,
              padding: '6px 16px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 4,
              color: '#666',
              fontSize: 9,
              fontFamily: 'inherit', cursor: 'pointer',
              letterSpacing: 1,
              transition: 'all 0.15s',
            }}
          >
            BACK
          </button>
        </div>
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
            fontSize: mobile ? 11 : 12, color: '#00CED1',
            letterSpacing: 2,
          }}>
            Searching for opponent...
          </div>
          <button
            onClick={() => setShowBotSelect(true)}
            style={{
              marginTop: 20,
              padding: mobile ? '14px 36px' : '10px 28px',
              background: 'linear-gradient(180deg, #FF8C42 0%, #CC5500 100%)',
              border: 'none', borderRadius: mobile ? 12 : 6,
              color: '#1A0A00',
              fontSize: mobile ? 13 : 11,
              fontWeight: 'bold',
              fontFamily: 'inherit', cursor: 'pointer',
              boxShadow: '0 0 20px rgba(255,140,66,0.3)',
              letterSpacing: 2,
              transition: 'all 0.15s',
              WebkitTapHighlightColor: 'transparent',
              minHeight: mobile ? 50 : undefined,
            }}
            onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.95)'; }}
            onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            PLAY VS BOT
          </button>
          <div style={{ fontSize: 8, color: '#444', marginTop: 10 }}>
            or wait for a real opponent
          </div>
        </div>
      )}

      {/* Controls hints - only on desktop */}
      {!mobile && (
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
      )}

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

function TipItem({ icon, text, mobile }: { icon: string; text: string; mobile: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      fontSize: mobile ? 10 : 9, color: '#999', lineHeight: '16px',
    }}>
      <span style={{ fontSize: mobile ? 16 : 14 }}>{icon}</span>
      <span>{text}</span>
    </div>
  );
}

function DifficultyButton({ label, subtitle, color, darkColor, mobile, onClick }: {
  label: string; subtitle: string; color: string; darkColor: string; mobile: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: mobile ? '16px 32px' : '14px 24px',
        minWidth: mobile ? 200 : 140,
        background: `linear-gradient(180deg, ${color} 0%, ${darkColor} 100%)`,
        border: 'none', borderRadius: mobile ? 12 : 8,
        color: '#fff',
        fontSize: mobile ? 14 : 13,
        fontWeight: 'bold',
        fontFamily: 'inherit', cursor: 'pointer',
        boxShadow: `0 0 20px ${color}44, 0 4px 12px rgba(0,0,0,0.3)`,
        transition: 'all 0.15s cubic-bezier(.4,0,.2,1)',
        letterSpacing: 2,
        WebkitTapHighlightColor: 'transparent',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      }}
      onMouseOver={e => {
        if (!mobile) {
          e.currentTarget.style.transform = 'scale(1.08) translateY(-2px)';
          e.currentTarget.style.boxShadow = `0 0 30px ${color}66, 0 6px 18px rgba(0,0,0,0.4)`;
        }
      }}
      onMouseOut={e => {
        if (!mobile) {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = `0 0 20px ${color}44, 0 4px 12px rgba(0,0,0,0.3)`;
        }
      }}
      onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.95)'; }}
      onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      <span>{label}</span>
      <span style={{ fontSize: mobile ? 8 : 7, opacity: 0.7, letterSpacing: 1, fontWeight: 'normal' }}>
        {subtitle}
      </span>
    </button>
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
