/**
 * Solitaire settings panel — toggles, table color, card back, animation speed.
 */

import { useSolitaireStore } from '../store/gameStore';
import { ArrowLeft } from 'lucide-react';

interface SolitaireSettingsProps {
  onBack: () => void;
}

const TABLE_COLORS = [
  { id: 'green', label: 'Green', value: '#1a6b3c' },
  { id: 'blue', label: 'Blue', value: '#1a3a6b' },
  { id: 'red', label: 'Red', value: '#6b1a2a' },
  { id: 'purple', label: 'Purple', value: '#3d1a6b' },
  { id: 'charcoal', label: 'Charcoal', value: '#2a2d3a' },
];

const CARD_BACKS = [
  { id: 'classic', label: 'Classic', pattern: 'repeating-linear-gradient(45deg, #c0392b 0, #c0392b 2px, #e74c3c 2px, #e74c3c 6px)' },
  { id: 'royal', label: 'Royal', pattern: 'repeating-linear-gradient(45deg, #2c3e50 0, #2c3e50 2px, #34495e 2px, #34495e 6px)' },
  { id: 'ocean', label: 'Ocean', pattern: 'linear-gradient(135deg, #2980b9, #3498db 50%, #2980b9)' },
  { id: 'forest', label: 'Forest', pattern: 'repeating-linear-gradient(45deg, #27ae60 0, #27ae60 2px, #2ecc71 2px, #2ecc71 6px)' },
  { id: 'midnight', label: 'Midnight', pattern: 'linear-gradient(135deg, #2c3e50, #1a252f 50%, #2c3e50)' },
];

const ANIMATION_SPEEDS = [
  { id: 'slow', label: 'Slow' },
  { id: 'normal', label: 'Normal' },
  { id: 'fast', label: 'Fast' },
];

type SettingKey =
  | 'fourColorDeck' | 'autoComplete' | 'autoMoveToFoundation'
  | 'showTimer' | 'showMoveCount' | 'sound' | 'haptics'
  | 'largeCards' | 'leftHanded' | 'zenMode' | 'winnableDealsOnly'
  | 'tableColor' | 'cardBack' | 'animationSpeed';

// Default settings — the store may not have these yet, so we provide defaults
const DEFAULT_SETTINGS: Record<SettingKey, boolean | string> = {
  fourColorDeck: false,
  autoComplete: true,
  autoMoveToFoundation: true,
  showTimer: true,
  showMoveCount: true,
  sound: true,
  haptics: true,
  largeCards: false,
  leftHanded: false,
  zenMode: false,
  winnableDealsOnly: false,
  tableColor: 'green',
  cardBack: 'classic',
  animationSpeed: 'normal',
};

const TOGGLE_SETTINGS: Array<{ key: SettingKey; label: string; description: string }> = [
  { key: 'fourColorDeck', label: 'Four-color deck', description: 'Different color per suit' },
  { key: 'autoComplete', label: 'Auto-complete', description: 'Auto-finish when all cards revealed' },
  { key: 'autoMoveToFoundation', label: 'Auto-move to foundation', description: 'Move safe cards up automatically' },
  { key: 'showTimer', label: 'Show timer', description: 'Display elapsed time during play' },
  { key: 'showMoveCount', label: 'Show move count', description: 'Display number of moves made' },
  { key: 'sound', label: 'Sound', description: 'Card flip and place sounds' },
  { key: 'haptics', label: 'Haptics', description: 'Vibration feedback on moves' },
  { key: 'largeCards', label: 'Large cards', description: 'Bigger card size for easier tapping' },
  { key: 'leftHanded', label: 'Left-handed mode', description: 'Mirror the layout for lefties' },
  { key: 'zenMode', label: 'Zen mode', description: 'Hide score, timer, and move count' },
  { key: 'winnableDealsOnly', label: 'Winnable deals only', description: 'Only deal hands that can be won' },
];

export function SolitaireSettings({ onBack }: SolitaireSettingsProps) {
  const store = useSolitaireStore();

  // Read settings from store, falling back to defaults
  const settings: Record<string, boolean | string> = {
    ...DEFAULT_SETTINGS,
    ...((store as Record<string, unknown>).settings as Record<string, boolean | string> || {}),
  };

  const setSetting = (key: SettingKey, value: boolean | string) => {
    const updateSettings = (store as Record<string, unknown>).updateSettings as
      ((patch: Record<string, boolean | string>) => void) | undefined;
    if (updateSettings) {
      updateSettings({ [key]: value });
    }
  };

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
          SOLITAIRE SETTINGS
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
            {TOGGLE_SETTINGS.slice(0, 3).map(({ key, label, description }) => (
              <ToggleRow
                key={key}
                label={label}
                description={description}
                enabled={settings[key] as boolean}
                onToggle={() => setSetting(key, !(settings[key] as boolean))}
              />
            ))}
          </div>
        </Section>

        <Section title="Display">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {TOGGLE_SETTINGS.slice(3, 5).map(({ key, label, description }) => (
              <ToggleRow
                key={key}
                label={label}
                description={description}
                enabled={settings[key] as boolean}
                onToggle={() => setSetting(key, !(settings[key] as boolean))}
              />
            ))}
          </div>
        </Section>

        <Section title="Feedback">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {TOGGLE_SETTINGS.slice(5, 7).map(({ key, label, description }) => (
              <ToggleRow
                key={key}
                label={label}
                description={description}
                enabled={settings[key] as boolean}
                onToggle={() => setSetting(key, !(settings[key] as boolean))}
              />
            ))}
          </div>
        </Section>

        <Section title="Accessibility">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {TOGGLE_SETTINGS.slice(7).map(({ key, label, description }) => (
              <ToggleRow
                key={key}
                label={label}
                description={description}
                enabled={settings[key] as boolean}
                onToggle={() => setSetting(key, !(settings[key] as boolean))}
              />
            ))}
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
                  onClick={() => setSetting('tableColor', color.id)}
                  style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: color.value,
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
                      ✓
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Card back selector */}
        <Section title="Card Back">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {CARD_BACKS.map(back => {
              const isActive = settings.cardBack === back.id;
              return (
                <button
                  key={back.id}
                  onClick={() => setSetting('cardBack', back.id)}
                  style={{
                    width: 48, height: 68, borderRadius: 8,
                    background: back.pattern,
                    border: isActive ? '3px solid var(--accent)' : '2px solid var(--glass-border)',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.2s',
                    boxShadow: isActive ? '0 0 12px var(--accent)40' : 'none',
                  }}
                  title={back.label}
                >
                  {isActive && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: 18, fontWeight: 700,
                      background: 'rgba(0,0,0,0.3)',
                      borderRadius: 5,
                    }}>
                      ✓
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
                  onClick={() => setSetting('animationSpeed', speed.id)}
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
