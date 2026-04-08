/**
 * Bridge settings panel — toggles, table color, animation speed.
 * Matches the solitaire settings pattern.
 */

import { useBridgeStore } from '../store/gameStore';
import type { BridgeSettings as BridgeSettingsType } from '../engine/stats';
import { ArrowLeft } from 'lucide-react';

interface BridgeSettingsProps {
  onBack: () => void;
}

const TABLE_COLORS = [
  { id: '#0f5132', label: 'Green', value: '#0f5132' },
  { id: '#1a3a6b', label: 'Blue', value: '#1a3a6b' },
  { id: '#6b1a2a', label: 'Red', value: '#6b1a2a' },
  { id: '#3d1a6b', label: 'Purple', value: '#3d1a6b' },
  { id: '#2a2d3a', label: 'Charcoal', value: '#2a2d3a' },
];

const ANIMATION_SPEEDS: Array<{ id: 1 | 2 | 3; label: string }> = [
  { id: 1, label: 'Slow' },
  { id: 2, label: 'Normal' },
  { id: 3, label: 'Fast' },
];

const TOGGLE_SETTINGS: Array<{
  key: keyof BridgeSettingsType;
  label: string;
  description: string;
}> = [
  { key: 'showPlayableCards', label: 'Show Playable Cards', description: 'Highlight cards you can legally play' },
  { key: 'autoPlaySingletons', label: 'Auto-Play Singletons', description: 'Automatically play when only one legal card' },
  { key: 'showBiddingHistory', label: 'Show Bidding History', description: 'Display full bidding sequence during play' },
  { key: 'showTrickCount', label: 'Show Trick Count', description: 'Show tricks won by each side' },
  { key: 'soundEnabled', label: 'Sound', description: 'Card and bid sound effects' },
  { key: 'showDummyAutoSort', label: 'Auto-Sort Dummy', description: 'Automatically sort dummy hand by suit' },
];

export function BridgeSettings({ onBack }: BridgeSettingsProps) {
  const { settings, updateSettings } = useBridgeStore();

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
          BRIDGE SETTINGS
        </div>
        <div style={{ width: 60 }} />
      </div>

      {/* Content */}
      <div style={{
        flex: 1, overflow: 'auto', padding: '20px',
        display: 'flex', flexDirection: 'column', gap: 24,
        maxWidth: 440, margin: '0 auto', width: '100%',
      }}>
        {/* Gameplay toggles */}
        <Section title="Gameplay">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {TOGGLE_SETTINGS.slice(0, 2).map(({ key, label, description }) => (
              <ToggleRow
                key={key}
                label={label}
                description={description}
                enabled={settings[key] as boolean}
                onToggle={() => updateSettings({ [key]: !(settings[key] as boolean) })}
              />
            ))}
          </div>
        </Section>

        {/* Display toggles */}
        <Section title="Display">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {TOGGLE_SETTINGS.slice(2, 4).map(({ key, label, description }) => (
              <ToggleRow
                key={key}
                label={label}
                description={description}
                enabled={settings[key] as boolean}
                onToggle={() => updateSettings({ [key]: !(settings[key] as boolean) })}
              />
            ))}
          </div>
        </Section>

        {/* Feedback */}
        <Section title="Feedback">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {TOGGLE_SETTINGS.slice(4, 6).map(({ key, label, description }) => (
              <ToggleRow
                key={key}
                label={label}
                description={description}
                enabled={settings[key] as boolean}
                onToggle={() => updateSettings({ [key]: !(settings[key] as boolean) })}
              />
            ))}
          </div>
        </Section>

        {/* Card Sort Order */}
        <Section title="Card Sort Order">
          <div style={{ display: 'flex', gap: 6 }}>
            {(['suit', 'rank'] as const).map(order => {
              const isActive = settings.cardSortOrder === order;
              return (
                <button
                  key={order}
                  onClick={() => updateSettings({ cardSortOrder: order })}
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
                  {order === 'suit' ? 'By Suit' : 'By Rank'}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Bid Box Position */}
        <Section title="Bid Box Position">
          <div style={{ display: 'flex', gap: 6 }}>
            {(['bottom', 'side'] as const).map(pos => {
              const isActive = settings.bidBoxPosition === pos;
              return (
                <button
                  key={pos}
                  onClick={() => updateSettings({ bidBoxPosition: pos })}
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
                  {pos === 'bottom' ? 'Bottom' : 'Side'}
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
