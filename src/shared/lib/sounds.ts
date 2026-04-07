/**
 * Sound manager. HTML5 Audio with preloading.
 * Shared across all games — each game registers its own sound set.
 */

type SoundName = 'diceRoll' | 'checkerPlace' | 'checkerHit' | 'win' | 'loss' | 'undo' | 'turnEnd' | 'cardPlace' | 'cardFlip';

const STORAGE_KEY = 'game-sound-settings';

interface SoundSettings {
  enabled: boolean;
  volume: number;
}

function loadSettings(): SoundSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { enabled: true, volume: 0.6 };
}

function saveSettings(s: SoundSettings) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

let settings = loadSettings();

// Synthesized sounds via Web Audio API (no mp3 files needed)
let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function synthSound(type: SoundName) {
  if (!settings.enabled) return;
  try {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const vol = settings.volume;

    switch (type) {
      case 'diceRoll': {
        // Short noise burst — sounds like dice rattling
        const duration = 0.15;
        const buf = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(vol * 0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 3000;
        filter.Q.value = 1;
        src.connect(filter).connect(gain).connect(ctx.destination);
        src.start();
        break;
      }
      case 'checkerPlace': {
        // Soft thud
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.08);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(vol * 0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
        break;
      }
      case 'checkerHit': {
        // Higher impact — two layered tones
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.12);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(vol * 0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
        break;
      }
      case 'win': {
        // Ascending arpeggio
        [523, 659, 784].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = freq;
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
          gain.gain.linearRampToValueAtTime(vol * 0.25, ctx.currentTime + i * 0.12 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.12 + 0.3);
          osc.connect(gain).connect(ctx.destination);
          osc.start(ctx.currentTime + i * 0.12);
          osc.stop(ctx.currentTime + i * 0.12 + 0.3);
        });
        break;
      }
      case 'loss': {
        // Descending tone
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.3);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(vol * 0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
        break;
      }
      case 'undo': {
        // Quick blip down
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.06);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(vol * 0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
        break;
      }
      case 'turnEnd': {
        // Soft click
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 800;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(vol * 0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
        break;
      }
      case 'cardPlace': {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.06);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(vol * 0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
        break;
      }
      case 'cardFlip': {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(500, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.04);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(vol * 0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.06);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.06);
        break;
      }
    }
  } catch { /* audio not supported */ }
}

export function playSound(name: SoundName) {
  synthSound(name);
}

export function isSoundEnabled(): boolean {
  return settings.enabled;
}

export function setSoundEnabled(enabled: boolean) {
  settings = { ...settings, enabled };
  saveSettings(settings);
}

export function getSoundVolume(): number {
  return settings.volume;
}

export function setSoundVolume(volume: number) {
  settings = { ...settings, volume: Math.max(0, Math.min(1, volume)) };
  saveSettings(settings);
}
