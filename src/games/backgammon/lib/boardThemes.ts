/**
 * Board theme definitions for backgammon.
 * Each theme provides colors for the SVG board rendering.
 */

export type BoardThemeName = 'modern-dark' | 'classic-wood' | 'tournament-green' | 'midnight-blue';

export interface BoardTheme {
  name: BoardThemeName;
  label: string;
  preview: string; // CSS gradient for the theme picker
  colors: {
    boardBg: string;
    frameBg: string;
    barBg: string;
    triA: string;
    triB: string;
    player: string;
    playerDim: string;
    opp: string;
    oppDim: string;
    destGlow: string;
    destHitGlow: string;
    dieBg: string;
    dieStroke: string;
    diePip: string;
    centerLine: string;
    checkerShadow: string;
    cubeText: string;
    thinkBg: string;
  };
}

export const BOARD_THEMES: Record<BoardThemeName, BoardTheme> = {
  'modern-dark': {
    name: 'modern-dark',
    label: 'Modern Dark',
    preview: 'linear-gradient(135deg, #13151e, #282b3a)',
    colors: {
      boardBg: '#13151e', frameBg: '#0e1018', barBg: '#0c0e16',
      triA: '#1e2030', triB: '#282b3a',
      player: '#4ecdc4', playerDim: 'rgba(78,205,196,0.12)',
      opp: '#ff6b6b', oppDim: 'rgba(255,107,107,0.12)',
      destGlow: 'rgba(78,205,196,0.5)', destHitGlow: 'rgba(255,159,67,0.6)',
      dieBg: '#2a2d3a', dieStroke: 'rgba(255,255,255,0.1)', diePip: 'rgba(255,255,255,0.9)',
      centerLine: 'rgba(255,255,255,0.03)', checkerShadow: 'rgba(0,0,0,0.35)',
      cubeText: 'rgba(255,255,255,0.7)', thinkBg: 'rgba(255,107,107,0.12)',
    },
  },
  'classic-wood': {
    name: 'classic-wood',
    label: 'Classic Wood',
    preview: 'linear-gradient(135deg, #8B6914, #D2B48C)',
    colors: {
      boardBg: '#6B4226', frameBg: '#4A2D12', barBg: '#3E2510',
      triA: '#D2B48C', triB: '#8B6914',
      player: '#F5F5DC', playerDim: 'rgba(245,245,220,0.15)',
      opp: '#8B0000', oppDim: 'rgba(139,0,0,0.15)',
      destGlow: 'rgba(245,245,220,0.5)', destHitGlow: 'rgba(255,159,67,0.6)',
      dieBg: '#F5F5DC', dieStroke: 'rgba(0,0,0,0.2)', diePip: '#1a1a1a',
      centerLine: 'rgba(0,0,0,0.1)', checkerShadow: 'rgba(0,0,0,0.4)',
      cubeText: '#F5F5DC', thinkBg: 'rgba(139,0,0,0.15)',
    },
  },
  'tournament-green': {
    name: 'tournament-green',
    label: 'Tournament Green',
    preview: 'linear-gradient(135deg, #1a472a, #2d6b3f)',
    colors: {
      boardBg: '#1a472a', frameBg: '#12331e', barBg: '#0f2a18',
      triA: '#2d6b3f', triB: '#1a472a',
      player: '#FFD700', playerDim: 'rgba(255,215,0,0.15)',
      opp: '#DC143C', oppDim: 'rgba(220,20,60,0.15)',
      destGlow: 'rgba(255,215,0,0.5)', destHitGlow: 'rgba(255,159,67,0.6)',
      dieBg: '#F0E68C', dieStroke: 'rgba(0,0,0,0.15)', diePip: '#1a1a1a',
      centerLine: 'rgba(255,255,255,0.05)', checkerShadow: 'rgba(0,0,0,0.4)',
      cubeText: '#FFD700', thinkBg: 'rgba(220,20,60,0.15)',
    },
  },
  'midnight-blue': {
    name: 'midnight-blue',
    label: 'Midnight Blue',
    preview: 'linear-gradient(135deg, #0a1628, #1a3a5c)',
    colors: {
      boardBg: '#0a1628', frameBg: '#06101e', barBg: '#050d18',
      triA: '#1a3a5c', triB: '#0f2440',
      player: '#C0C0C0', playerDim: 'rgba(192,192,192,0.12)',
      opp: '#FFD700', oppDim: 'rgba(255,215,0,0.12)',
      destGlow: 'rgba(192,192,192,0.5)', destHitGlow: 'rgba(255,215,0,0.6)',
      dieBg: '#1a3a5c', dieStroke: 'rgba(192,192,192,0.2)', diePip: '#C0C0C0',
      centerLine: 'rgba(192,192,192,0.05)', checkerShadow: 'rgba(0,0,0,0.5)',
      cubeText: '#C0C0C0', thinkBg: 'rgba(255,215,0,0.12)',
    },
  },
};

const STORAGE_KEY = 'backgammon-board-theme';

export function loadBoardTheme(): BoardThemeName {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved in BOARD_THEMES) return saved as BoardThemeName;
  } catch { /* ignore */ }
  return 'modern-dark';
}

export function saveBoardTheme(theme: BoardThemeName) {
  try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* ignore */ }
}
