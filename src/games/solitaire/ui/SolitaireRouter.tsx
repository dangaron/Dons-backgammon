/**
 * Routes to the correct solitaire board based on active variant.
 */

import { useSolitaireStore } from '../store/gameStore';
import { SolitaireBoard } from './SolitaireBoard';
import { SpiderBoard } from './SpiderBoard';
import { FreeCellBoard } from './FreeCellBoard';
import { PyramidBoard } from './PyramidBoard';
import { TriPeaksBoard } from './TriPeaksBoard';
import { WinAnimation } from './WinAnimation';
import { AchievementToast } from './AchievementToast';

interface SolitaireRouterProps {
  onQuit: () => void;
}

export function SolitaireRouter({ onQuit }: SolitaireRouterProps) {
  const { activeVariant, newAchievements, dismissAchievement, settings } = useSolitaireStore();

  const boardProps = { onQuit };

  return (
    <>
      {activeVariant === 'klondike' && <SolitaireBoard {...boardProps} />}
      {activeVariant === 'spider' && <SpiderBoard {...boardProps} />}
      {activeVariant === 'freecell' && <FreeCellBoard {...boardProps} />}
      {activeVariant === 'pyramid' && <PyramidBoard {...boardProps} />}
      {activeVariant === 'tripeaks' && <TriPeaksBoard {...boardProps} />}

      {/* Achievement toast */}
      {newAchievements.length > 0 && (
        <AchievementToast
          achievement={newAchievements[0]}
          onDismiss={dismissAchievement}
        />
      )}
    </>
  );
}
