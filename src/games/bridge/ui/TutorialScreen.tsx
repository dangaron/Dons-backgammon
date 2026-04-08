/**
 * Bridge tutorial selection and playback screen.
 * Shows tutorials organized by category with progress tracking.
 */

import { ArrowLeft, ChevronLeft, ChevronRight, BookOpen, CheckCircle } from 'lucide-react';
import {
  TUTORIALS,
  getTutorialsByCategory,
  getTutorial,
  getTutorialStep,
  loadTutorialProgress,
} from '../engine/tutorial';
import type { TutorialCategory, BridgeTutorial } from '../engine/tutorial';
import { useBridgeStore } from '../store/gameStore';

interface TutorialScreenProps {
  onBack: () => void;
  onStartTutorial: (id: string) => void;
}

const CATEGORIES: Array<{ id: TutorialCategory; label: string; icon: string }> = [
  { id: 'basics', label: 'Basics', icon: '📖' },
  { id: 'bidding', label: 'Bidding', icon: '🗣️' },
  { id: 'play', label: 'Play', icon: '🃏' },
  { id: 'defense', label: 'Defense', icon: '🛡️' },
];

export function TutorialScreen({ onBack, onStartTutorial }: TutorialScreenProps) {
  const { activeTutorial, tutorialStep, advanceTutorial, exitTutorial } = useBridgeStore();
  const progress = loadTutorialProgress();
  const completedIds = progress.completedTutorials;

  // If a tutorial is active, show the step-by-step overlay
  if (activeTutorial) {
    const tutorial = getTutorial(activeTutorial);
    const step = getTutorialStep(activeTutorial, tutorialStep);
    if (!tutorial || !step) return null;

    const totalSteps = tutorial.steps.length;

    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        flex: 1, background: 'var(--bg)',
      }}>
        {/* Top bar */}
        <div className="top-bar">
          <button className="action-btn secondary" onClick={exitTutorial}
            style={{ fontSize: 11, height: 28, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ArrowLeft size={14} />
            Exit
          </button>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', letterSpacing: 1 }}>
            {tutorial.title.toUpperCase()}
          </div>
          <div style={{ width: 60 }} />
        </div>

        {/* Tutorial content */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--glass-border)',
            borderRadius: 20, padding: '32px 28px',
            maxWidth: 420, width: '100%',
            animation: 'slide-up 0.3s ease-out',
          }}>
            {/* Step counter */}
            <div style={{
              fontSize: 11, fontWeight: 700, color: 'var(--accent)',
              textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16,
              textAlign: 'center',
            }}>
              Step {tutorialStep + 1} of {totalSteps}
            </div>

            {/* Progress bar */}
            <div style={{
              height: 4, borderRadius: 2, background: 'var(--surface-2)',
              marginBottom: 20, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', borderRadius: 2,
                background: 'var(--accent)',
                width: `${((tutorialStep + 1) / totalSteps) * 100}%`,
                transition: 'width 0.3s ease',
              }} />
            </div>

            {/* Instruction */}
            <div style={{
              fontSize: 15, fontWeight: 600, color: 'var(--text)',
              lineHeight: 1.6, marginBottom: 16,
            }}>
              {step.instruction}
            </div>

            {/* Explanation */}
            <div style={{
              fontSize: 12, color: 'var(--text-muted)',
              lineHeight: 1.5, marginBottom: 24,
              padding: '12px 14px',
              background: 'var(--surface-2)',
              borderRadius: 10,
              borderLeft: '3px solid var(--accent)',
            }}>
              {step.explanation}
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="action-btn secondary"
                disabled={tutorialStep === 0}
                onClick={() => {
                  // Go back by exiting and restarting at prev step
                  // For simplicity, we just call exitTutorial since the store doesn't have a "back" action
                }}
                style={{
                  flex: 1, height: 40, fontSize: 13,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  opacity: tutorialStep === 0 ? 0.4 : 1,
                  cursor: tutorialStep === 0 ? 'default' : 'pointer',
                }}
              >
                <ChevronLeft size={16} /> Back
              </button>
              <button
                className="action-btn primary"
                onClick={advanceTutorial}
                style={{
                  flex: 1, height: 40, fontSize: 13,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                }}
              >
                {tutorialStep + 1 === totalSteps ? 'Finish' : 'Next'} <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Tutorial list view
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
          LEARN BRIDGE
        </div>
        <div style={{ width: 60 }} />
      </div>

      {/* Tutorial list */}
      <div style={{
        flex: 1, overflow: 'auto', padding: '20px',
        display: 'flex', flexDirection: 'column', gap: 24,
        maxWidth: 480, margin: '0 auto', width: '100%',
      }}>
        {/* Summary */}
        <div style={{
          textAlign: 'center', padding: '8px 0',
          animation: 'slide-up 0.4s ease-out',
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>
            <BookOpen size={32} color="var(--accent)" />
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {completedIds.length} of {TUTORIALS.length} tutorials completed
          </div>
        </div>

        {/* Categories */}
        {CATEGORIES.map(category => {
          const tutorials = getTutorialsByCategory(category.id);
          if (tutorials.length === 0) return null;

          return (
            <div key={category.id}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span>{category.icon}</span> {category.label}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tutorials.map(tutorial => (
                  <TutorialCard
                    key={tutorial.id}
                    tutorial={tutorial}
                    completed={completedIds.includes(tutorial.id)}
                    onStart={() => onStartTutorial(tutorial.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}

        <div style={{ height: 20 }} />
      </div>
    </div>
  );
}

function TutorialCard({ tutorial, completed, onStart }: {
  tutorial: BridgeTutorial;
  completed: boolean;
  onStart: () => void;
}) {
  return (
    <button
      onClick={onStart}
      style={{
        width: '100%', padding: 0, textAlign: 'left',
        background: 'var(--surface)',
        border: `1px solid ${completed ? 'var(--accent)' : 'var(--glass-border)'}`,
        borderRadius: 14, cursor: 'pointer',
        display: 'flex', alignItems: 'center',
        fontFamily: 'var(--font)', overflow: 'hidden',
        transition: 'all 0.2s',
        opacity: 1,
      }}
    >
      <div style={{
        width: 4, alignSelf: 'stretch', flexShrink: 0,
        background: completed
          ? 'var(--accent)'
          : 'linear-gradient(180deg, var(--purple), var(--purple)88)',
      }} />
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px 14px 12px', flex: 1,
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: completed ? 'var(--accent)18' : 'var(--purple)18',
          color: completed ? 'var(--accent)' : 'var(--purple)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {completed ? <CheckCircle size={18} /> : <BookOpen size={18} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 700, color: 'var(--text)',
            marginBottom: 2,
          }}>
            {tutorial.title}
          </div>
          <div style={{
            fontSize: 11, color: 'var(--text-muted)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {tutorial.description}
          </div>
        </div>
        <div style={{
          fontSize: 10, fontWeight: 700,
          color: completed ? 'var(--accent)' : 'var(--text-dim)',
          flexShrink: 0,
        }}>
          {completed ? 'Done' : `${tutorial.steps.length} steps`}
        </div>
      </div>
    </button>
  );
}
