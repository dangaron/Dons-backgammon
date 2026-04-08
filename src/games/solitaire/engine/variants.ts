/**
 * Solitaire variant registry. Maps variant names to metadata.
 * No browser or UI imports.
 */

export type SolitaireVariant = 'klondike' | 'spider' | 'freecell' | 'pyramid' | 'tripeaks';

export interface VariantInfo {
  id: SolitaireVariant;
  name: string;
  description: string;
  icon: string;       // emoji
  color: string;      // CSS variable
  difficulty: 'easy' | 'medium' | 'hard';
  deckCount: 1 | 2;
  hasFoundations: boolean;
}

export const VARIANTS: VariantInfo[] = [
  {
    id: 'klondike',
    name: 'Klondike',
    description: 'The classic. Build foundations A→K.',
    icon: '🃏',
    color: 'var(--accent)',
    difficulty: 'medium',
    deckCount: 1,
    hasFoundations: true,
  },
  {
    id: 'spider',
    name: 'Spider',
    description: 'Build K→A same-suit sequences.',
    icon: '🕷️',
    color: 'var(--purple)',
    difficulty: 'hard',
    deckCount: 2,
    hasFoundations: false,
  },
  {
    id: 'freecell',
    name: 'FreeCell',
    description: 'All cards visible. Nearly always solvable.',
    icon: '🧩',
    color: 'var(--player)',
    difficulty: 'medium',
    deckCount: 1,
    hasFoundations: true,
  },
  {
    id: 'pyramid',
    name: 'Pyramid',
    description: 'Pair cards that sum to 13.',
    icon: '🔺',
    color: 'var(--hit)',
    difficulty: 'easy',
    deckCount: 1,
    hasFoundations: false,
  },
  {
    id: 'tripeaks',
    name: 'TriPeaks',
    description: 'Clear the peaks with chain combos.',
    icon: '⛰️',
    color: 'var(--opponent)',
    difficulty: 'easy',
    deckCount: 1,
    hasFoundations: false,
  },
];

export function getVariantInfo(id: SolitaireVariant): VariantInfo {
  return VARIANTS.find(v => v.id === id)!;
}
