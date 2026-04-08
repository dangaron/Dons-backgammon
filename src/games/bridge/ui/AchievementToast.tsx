/**
 * Achievement unlock toast notification for Bridge.
 */

import { useEffect } from 'react';
import type { Achievement } from '../engine/stats';

interface AchievementToastProps {
  achievement: Achievement;
  onDismiss: () => void;
}

export function AchievementToast({ achievement, onDismiss }: AchievementToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [achievement.id, onDismiss]);

  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'fixed',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 300,
        background: 'var(--surface)',
        border: '1px solid var(--glass-border)',
        borderRadius: 16,
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
        animation: 'slide-down 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        cursor: 'pointer',
        maxWidth: 340,
      }}
    >
      <div style={{ fontSize: 28 }}>{achievement.icon}</div>
      <div>
        <div style={{
          fontSize: 10, fontWeight: 800, color: 'var(--accent)',
          textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2,
        }}>
          Achievement Unlocked!
        </div>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>
          {achievement.name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
          {achievement.description}
        </div>
      </div>
    </div>
  );
}
