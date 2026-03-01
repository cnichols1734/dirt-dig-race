import React from 'react';
import { TremorPayload } from '@dig/shared';

interface TremorAlertProps {
  tremors: TremorPayload[];
  sonarAlerts: string[];
  dynamiteAlerts: string[];
}

const intensityColors: Record<string, string> = {
  faint: '#888',
  moderate: '#FFB347',
  strong: '#FF8C42',
  extreme: '#FF4444',
};

const intensityIcons: Record<string, string> = {
  faint: '~',
  moderate: '~~',
  strong: '~~~',
  extreme: '!!!!',
};

export function TremorAlert({ tremors, sonarAlerts, dynamiteAlerts }: TremorAlertProps) {
  const allAlerts = [
    ...tremors.map(t => ({
      message: t.message,
      color: intensityColors[t.intensity] || '#888',
      type: 'tremor' as const,
      icon: intensityIcons[t.intensity] || '~',
    })),
    ...sonarAlerts.map(m => ({
      message: m,
      color: '#00CED1',
      type: 'sonar' as const,
      icon: '((()))',
    })),
    ...dynamiteAlerts.map(m => ({
      message: m,
      color: '#FF4500',
      type: 'dynamite' as const,
      icon: '***',
    })),
  ];

  if (allAlerts.length === 0) return null;

  return (
    <div style={{
      position: 'absolute', bottom: 70, left: 16, zIndex: 50,
      display: 'flex', flexDirection: 'column', gap: 6,
      maxWidth: 340,
    }}>
      {allAlerts.map((alert, i) => (
        <div
          key={`${alert.type}-${i}`}
          style={{
            background: 'rgba(8,8,20,0.9)',
            border: `1px solid ${alert.color}22`,
            borderLeft: `3px solid ${alert.color}`,
            borderRadius: 6, padding: '8px 12px',
            fontSize: 9, color: alert.color,
            animation: 'alertSlideIn 0.3s cubic-bezier(.4,0,.2,1)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <span style={{
            fontFamily: 'monospace', fontSize: 8, opacity: 0.6,
            minWidth: 30, textAlign: 'center',
          }}>
            {alert.icon}
          </span>
          <span>{alert.message}</span>
        </div>
      ))}
      <style>{`
        @keyframes alertSlideIn {
          from { transform: translateX(-30px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
