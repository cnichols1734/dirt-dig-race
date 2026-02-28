import React from 'react';
import { TremorPayload } from '@dig/shared';

interface TremorAlertProps {
  tremors: TremorPayload[];
  sonarAlerts: string[];
  dynamiteAlerts: string[];
}

const intensityColors: Record<string, string> = {
  faint: '#666',
  moderate: '#FFB347',
  strong: '#FF8C42',
  extreme: '#FF4444',
};

export function TremorAlert({ tremors, sonarAlerts, dynamiteAlerts }: TremorAlertProps) {
  const allAlerts = [
    ...tremors.map(t => ({ message: t.message, color: intensityColors[t.intensity] || '#888', type: 'tremor' as const })),
    ...sonarAlerts.map(m => ({ message: m, color: '#00CED1', type: 'sonar' as const })),
    ...dynamiteAlerts.map(m => ({ message: m, color: '#FF4500', type: 'dynamite' as const })),
  ];

  if (allAlerts.length === 0) return null;

  return (
    <div style={{
      position: 'absolute', bottom: 70, left: 16, zIndex: 50,
      display: 'flex', flexDirection: 'column', gap: 6,
      maxWidth: 320,
    }}>
      {allAlerts.map((alert, i) => (
        <div
          key={`${alert.type}-${i}`}
          style={{
            background: 'rgba(10,10,26,0.85)',
            border: `1px solid ${alert.color}33`,
            borderLeft: `3px solid ${alert.color}`,
            borderRadius: 4, padding: '6px 10px',
            fontSize: 9, color: alert.color,
            animation: 'slideInLeft 0.3s ease-out',
          }}
        >
          {alert.message}
        </div>
      ))}
      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
