/**
 * Yahtzee settings panel — toggles, dice style, table color, animation speed.
 */

import { useYahtzeeStore } from '../store/gameStore';
import type { DiceStyle, YahtzeeSettings as YahtzeeSettingsType } from '../engine/stats';
import { ArrowLeft } from 'lucide-react';

interface YahtzeeSettingsProps {
  onBack: () => void;
}

const TABLE_COLORS = [
  { id: '#1a1a2e', label: 'Midnight' },
  { id: '#1a3a6b', label: 'Blue' },
  { id: '#1a6b3c', label: 'Green' },
  { id: '#6b1a2a', label: 'Red' },
  { id: '#3d1a6b', label: 'Purple' },
  { id: '#2a2d3a', label: 'Charcoal' },
];

const DICE_STYLES: { id: DiceStyle; label: string }[] = [
  { id: 'classic', label: 'Classic' },
  { id: 'modern', label: 'Modern' },
  { id: 'minimal', label: 'Minimal' },
];

const ANIMATION_SPEEDS: { id: 1 | 2 | 3; label: string }[] = [
  { id: 1, label: 'Slow' },
  { id: 2, label: 'Normal' },
  { id: 3, label: 'Fast' },
];

const TOGGLE_SETTINGS: Array<{
  key: keyof Pick<YahtzeeSettingsType, 'showPotentialScores' | 'autoSortDice' | 'confirmEndTurn' | 'showOpponentHolds' | 'soundEnabled'>;
  label: string;
  description: string;
}> = [
  { key: 'showPotentialScores', label: 'Show Potential Scores', description: 'Preview score for each category before choosing' },
  { key: 'autoSortDice', label: 'Auto-Sort Dice', description: 'Automatically sort dice in ascending order' },
  { key: 'confirmEndTurn', label: 'Confirm End Turn', description: 'Ask for confirmation before ending your turn' },
  { key: 'showOpponentHolds', label: 'Show AI Holds', description: "Show which dice the AI chooses to hold" },
  { key: 'soundEnabled', label: 'Sound', description: 'Dice roll and scoring sounds' },
];

export function YahtzeeSettings({ onBack }: YahtzeeSettingsProps) {
  const { settings, updateSettings } = useYahtzeeStore();

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      flex: 1, background: 'var(--bg)',
    }}>
      {/* Top bar */}
      <div className="top-bar">
        <button className="action-btn secondary" onClick={onBack}
          style={{ fontSize: 11, height: 28, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
          <ArrowLeft size={14} />
          Back
        </button>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', letterSpacing: 1 }}>
          YAHTZEE SETTINGS
        </div>
        <div style={{ width: 60 }} />
      </div>

      {/* Content */}
      <div style={{
        flex: 1, overflow: 'auto', padding: '20px',
        display: 'flex', flexDirection: 'column', gap: 24,
        maxWidth: 440, margin: '0 auto', width: '100%',
      }}>
        {/* Toggle settings */}
        <Section title="Gameplay">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {TOGGLE_SETTINGS.map(({ key, label, description }) => (
              <ToggleRow
                key={key}
                label={label}
                description={description}
                enabled={settings[key] as boolean}
                onToggle={() => updateSettings({ [key]: !settings[key] })}
              />
            ))}
          </div>
        </Section>

        {/* Dice style selector */}
        <Section title="Dice Style">
          <div style={{ display: 'flex', gap: 6 }}>
            {DICE_STYLES.map(style => {
              const isActive = settings.diceStyle === style.id;
              return (
                <button
                  key={style.id}
                  onClick={() => updateSettings({ diceStyle: style.id })}
                  style={{
                    flex: 1, padding: '10px 0',
                    borderRadius: 10, border: 'none',
                    background: isActive ? 'var(--accent)' : 'var(--surface)',
                    color: isActive ? '#0a0b10' : 'var(--text-muted)',
                    fontWeight: 700, fontSize: 13, cursor: 'pointer',
                    fontFamily: 'var(--font)',
                    transition: 'all 0.2s',
                  }}
                >
                  {style.label}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Table color picker */}
        <Section title="Table Color">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {TABLE_COLORS.map(color => {
              const isActive = settings.tableColor === color.id;
              return (
                <button
                  key={color.id}
                  onClick={() => updateSettings({ tableColor: color.id })}
                  style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: color.id,
                    border: isActive ? '3px solid var(--accent)' : '2px solid var(--glass-border)',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.2s',
                    boxShadow: isActive ? '0 0 12px var(--accent)40' : 'none',
                  }}
                  title={color.label}
                >
                  {isActive && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: 18, fontWeight: 700,
                    }}>
                      &#10003;
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Animation speed */}
        <Section title="Animation Speed">
          <div style={{ display: 'flex', gap: 6 }}>
            {ANIMATION_SPEEDS.map(speed => {
              const isActive = settings.animationSpeed === speed.id;
              return (
                <button
                  key={speed.id}
                  onClick={() => updateSettings({ animationSpeed: speed.id })}
                  style={{
                    flex: 1, padding: '10px 0',
                    borderRadius: 10, border: 'none',
                    background: isActive ? 'var(--accent)' : 'var(--surface)',
                    color: isActive ? '#0a0b10' : 'var(--text-muted)',
                    fontWeight: 700, fontSize: 13, cursor: 'pointer',
                    fontFamily: 'var(--font)',
                    transition: 'all 0.2s',
                  }}
                >
                  {speed.label}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Spacer at bottom */}
        <div style={{ height: 20 }} />
      </div>
    </div>
  );
}

// ── Helper Components ────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
      }}>
        {title}
      </div>
      <div style={{
        background: 'var(--surface-2)', border: '1px solid var(--glass-border)',
        borderRadius: 14, padding: 16,
      }}>
        {children}
      </div>
    </div>
  );
}

function ToggleRow({ label, description, enabled, onToggle }: {
  label: string; description: string;
  enabled: boolean; onToggle: () => void;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1 }}>{description}</div>
      </div>
      <button onClick={onToggle} style={{
        width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
        background: enabled ? 'var(--accent)' : 'var(--surface)',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', top: 3, left: enabled ? 24 : 3,
          width: 20, height: 20, borderRadius: '50%', background: 'white',
          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }} />
      </button>
    </div>
  );
}
