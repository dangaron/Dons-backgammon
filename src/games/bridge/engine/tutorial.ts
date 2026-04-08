/**
 * Bridge tutorial system.
 * Structured lessons for learning Bridge from scratch.
 * Pure data, no UI imports.
 */

import type { CardId } from './types';

// ── Tutorial types ─────────────────────────────────────────────────────────────

export type TutorialCategory = 'basics' | 'bidding' | 'play' | 'defense';

export interface TutorialStep {
  instruction: string;
  highlightCards?: CardId[];
  requiredAction?: TutorialRequiredAction;
  explanation: string;
}

export type TutorialRequiredAction =
  | { type: 'play-card'; cardId: CardId }
  | { type: 'make-bid'; bidType: 'pass' | 'bid' | 'double' | 'redouble' }
  | { type: 'acknowledge' }
  | { type: 'any-card' }
  | { type: 'any-bid' };

export interface BridgeTutorial {
  id: string;
  title: string;
  description: string;
  category: TutorialCategory;
  steps: TutorialStep[];
}

// ── Tutorial definitions ───────────────────────────────────────────────────────

export const TUTORIALS: BridgeTutorial[] = [
  // ── 1. Card Basics ──
  {
    id: 'card-basics',
    title: 'Card Basics',
    description: 'Learn about suits, ranks, and how tricks work in Bridge',
    category: 'basics',
    steps: [
      {
        instruction: 'Welcome to Bridge! Bridge is played with a standard 52-card deck. There are four suits: Clubs, Diamonds, Hearts, and Spades.',
        explanation: 'The suits are ranked from lowest to highest: Clubs, Diamonds, Hearts, Spades. This ranking matters during the bidding phase.',
        requiredAction: { type: 'acknowledge' },
      },
      {
        instruction: 'Each suit has 13 cards ranked from 2 (lowest) to Ace (highest). The face cards are Jack (11), Queen (12), King (13), and Ace (14).',
        explanation: 'In Bridge, Ace is always high. The rank of a card determines who wins a trick when two cards of the same suit are played.',
        requiredAction: { type: 'acknowledge' },
      },
      {
        instruction: 'Bridge is a trick-taking game. A trick is a round where each of the four players plays one card. The highest card of the suit that was led wins the trick.',
        explanation: 'The player who leads (plays first) determines which suit must be followed. All other players must play a card of that suit if they have one.',
        requiredAction: { type: 'acknowledge' },
      },
      {
        instruction: 'If you cannot follow suit (you have no cards of the suit led), you may play any card. In a trump contract, you can play a trump card to win the trick even with a low card.',
        explanation: 'Being "void" in a suit (having no cards of it) creates opportunities to trump. This is a key strategic element in Bridge.',
        requiredAction: { type: 'acknowledge' },
      },
      {
        instruction: 'Bridge is played with four players in two partnerships: North-South and East-West. You and your partner across the table work together to win tricks.',
        explanation: 'Communication between partners happens through the bidding system, not through talking. Understanding your partner is key to success.',
        requiredAction: { type: 'acknowledge' },
      },
      {
        instruction: 'Each hand begins with dealing 13 cards to each player, followed by an auction (bidding), and then play of 13 tricks.',
        explanation: 'The goal is to win the number of tricks your partnership committed to during the bidding. Let us learn more about each phase!',
        requiredAction: { type: 'acknowledge' },
      },
    ],
  },

  // ── 2. Your First Trick ──
  {
    id: 'first-trick',
    title: 'Your First Trick',
    description: 'Learn how to lead, follow suit, and win your first trick',
    category: 'basics',
    steps: [
      {
        instruction: 'The player who leads plays any card from their hand to start the trick. Let us say West leads the 5 of Hearts.',
        explanation: 'The leader chooses which suit to play. This is an important decision since it forces all other players to follow that suit.',
        requiredAction: { type: 'acknowledge' },
      },
      {
        instruction: 'Now each player clockwise must follow suit if possible. North must play a Heart if they have one. If North has the King of Hearts, that is a strong play!',
        explanation: 'Following suit is mandatory. If you have any card of the led suit, you must play one of them. You choose which one.',
        requiredAction: { type: 'acknowledge' },
      },
      {
        instruction: 'East plays the 3 of Hearts (following suit with a low card). Now it is your turn (South). You should play a Heart if you have one.',
        explanation: 'Playing a high card when you want to win the trick, or a low card when your partner is already winning, is a key decision.',
        requiredAction: { type: 'acknowledge' },
      },
      {
        instruction: 'After all four players have played, the highest card of the led suit wins. If North played the King of Hearts, North wins this trick!',
        explanation: 'The winner of a trick leads the next trick. This means winning tricks gives you control over which suit is played next.',
        requiredAction: { type: 'acknowledge' },
      },
      {
        instruction: 'The winner of the trick collects the four cards and leads to the next trick. Try playing a card from your hand now!',
        explanation: 'In a real game, you would lead after winning a trick. Practice by clicking on a card in your hand.',
        requiredAction: { type: 'any-card' },
      },
      {
        instruction: 'Excellent! You have played your first card. Remember: follow suit if possible, and think about whether you want to win or save your high cards.',
        explanation: 'The balance between winning tricks now and preserving high cards for later is what makes Bridge strategic.',
        requiredAction: { type: 'acknowledge' },
      },
    ],
  },

  // ── 3. Trump Power ──
  {
    id: 'trump-power',
    title: 'Trump Power',
    description: 'Understand how the trump suit works and when to use it',
    category: 'basics',
    steps: [
      {
        instruction: 'In Bridge, the bidding determines a "trump suit" (or No Trump). The trump suit is special: any trump card beats any non-trump card.',
        explanation: 'For example, if Hearts are trump, even the 2 of Hearts beats the Ace of Spades! Trump power overrides normal rank.',
        requiredAction: { type: 'acknowledge' },
      },
      {
        instruction: 'You can only play a trump card if you cannot follow the suit that was led. Being "void" in a suit lets you trump (also called "ruffing").',
        explanation: 'If Spades are led and you have no Spades, you may play a Heart (if Hearts are trump) to win the trick.',
        requiredAction: { type: 'acknowledge' },
      },
      {
        instruction: 'If multiple trump cards are played on the same trick, the highest trump wins. So trumping with the 2 works only if no one plays a higher trump.',
        explanation: 'This is called "overruffing." If you see an opponent ruff with a low trump, you can overruff with a higher one.',
        requiredAction: { type: 'acknowledge' },
      },
      {
        instruction: 'As declarer, one common strategy is to "draw trumps" early by leading trump cards. This removes the opponents\' trumps so they cannot ruff your winners.',
        explanation: 'If you have 8 trumps between your hand and dummy, the opponents have 5. It usually takes 2-3 rounds to draw all their trumps.',
        requiredAction: { type: 'acknowledge' },
      },
      {
        instruction: 'Sometimes you should delay drawing trumps to use your short trump holding for ruffing. This is called "ruffing in the short hand."',
        explanation: 'If dummy has only 2 trumps, ruffing a loser in dummy creates an extra trick. Drawing trumps first would waste that opportunity.',
        requiredAction: { type: 'acknowledge' },
      },
      {
        instruction: 'In No Trump contracts, there is no trump suit. The highest card of the suit led always wins. No Trump rewards having long, established suits.',
        explanation: 'Without a trump suit, long suits become very powerful. Running a 5-card suit can produce many tricks.',
        requiredAction: { type: 'acknowledge' },
      },
    ],
  },

  // ── 4. Opening Bids ──
  {
    id: 'opening-bids',
    title: 'Opening Bids',
    description: 'Learn when and what to bid to start the auction',
    category: 'bidding',
    steps: [
      {
        instruction: 'Bidding is how you and your partner communicate about your hands. Each bid consists of a level (1-7) and a suit (or No Trump).',
        explanation: 'A bid of "1 Heart" means you promise to win at least 7 tricks (6 + the level) with Hearts as trump. The auction determines the final contract.',
        requiredAction: { type: 'acknowledge' },
      },
      {
        instruction: 'To decide whether to open the bidding, count your High Card Points (HCP): Ace=4, King=3, Queen=2, Jack=1. You need 12+ HCP to open.',
        explanation: 'With a standard deck, there are 40 total HCP. An "average" hand has 10 HCP. Opening shows you have more than average strength.',
        requiredAction: { type: 'acknowledge' },
      },
      {
        instruction: 'With 12-14 HCP, open your longest suit at the 1 level. If you have two 5-card suits, open the higher-ranking one.',
        explanation: 'Example: with 13 HCP and 5 Hearts + 4 Spades, open 1 Heart. With 5 Hearts + 5 Spades, open 1 Spade.',
        requiredAction: { type: 'acknowledge' },
      },
      {
        instruction: 'With 15-17 HCP and a balanced hand (no void, no singleton, at most one doubleton), open 1 No Trump (1NT).',
        explanation: 'A 1NT opening is very descriptive: it tells partner your exact point range and hand shape. This makes the rest of the auction easier.',
        requiredAction: { type: 'acknowledge' },
      },
      {
        instruction: 'With fewer than 12 HCP, pass. You do not have enough strength to open. Wait for your partner to bid, or compete later.',
        explanation: 'Passing is a valid and important bid. It tells your partner you have fewer than 12 points. Do not open light hands!',
        requiredAction: { type: 'acknowledge' },
      },
      {
        instruction: 'With 20+ HCP, you have a very strong hand. Open at the 2 level to show extra strength and force partner to respond.',
        explanation: 'Strong hands are rare but exciting. Opening 2 Clubs is often used as an artificial strong bid regardless of your club holding.',
        requiredAction: { type: 'acknowledge' },
      },
      {
        instruction: 'Try making a bid now! Look at your hand, count your HCP, and decide whether to bid or pass.',
        explanation: 'Remember: 12+ HCP = open your longest suit at the 1 level. 15-17 balanced = open 1NT. Under 12 HCP = pass.',
        requiredAction: { type: 'any-bid' },
      },
    ],
  },

  // ── 5. Responding to Partner ──
  {
    id: 'responding',
    title: 'Responding to Partner',
    description: 'Learn how to support your partner\'s opening bid',
    category: 'bidding',
    steps: [
      {
        instruction: 'When your partner opens the bidding, you are the "responder." Your job is to describe your hand to help find the best contract.',
        explanation: 'The opening bid started a conversation. Now you respond with information about your strength and distribution.',
        requiredAction: { type: 'acknowledge' },
      },
      {
        instruction: 'With 0-5 HCP, pass. You do not have enough to respond. Your partner opened with a minimum and the two of you do not have game strength.',
        explanation: 'Game typically requires about 25+ combined HCP. If partner opened with 12-14 and you have under 6, you are well short of game.',
        requiredAction: { type: 'acknowledge' },
      },
      {
        instruction: 'With 6-9 HCP and 3+ cards in partner\'s suit, raise to the 2 level. Example: partner opens 1 Heart and you have 3 Hearts with 8 HCP — bid 2 Hearts.',
        explanation: 'A simple raise shows support and a minimum responding hand. Partner can pass or bid further based on their strength.',
        requiredAction: { type: 'acknowledge' },
      },
      {
        instruction: 'With 6-9 HCP but no fit, bid a new suit at the 1 level if possible, or bid 1NT. This keeps the bidding low while showing your hand.',
        explanation: 'Bidding a new suit at the 1 level is "forcing" — partner must bid again. This gives you more room to find a fit.',
        requiredAction: { type: 'acknowledge' },
      },
      {
        instruction: 'With 10-12 HCP, you have an invitational hand. Raise partner\'s suit to the 3 level, or bid 2NT over a 1NT opening.',
        explanation: 'An invitational bid says "we might have game — bid on if you have extras." Partner can accept or decline the invitation.',
        requiredAction: { type: 'acknowledge' },
      },
      {
        instruction: 'With 13+ HCP, you want to reach game. Jump to game directly (e.g., 4 Hearts with a fit) or bid a new suit to explore the best game.',
        explanation: 'Game bonuses are large: 300+ points. With 25+ combined HCP, always try to reach game. Slam requires about 33+ HCP.',
        requiredAction: { type: 'acknowledge' },
      },
    ],
  },

  // ── 6. Playing as Declarer ──
  {
    id: 'declarer-play',
    title: 'Playing as Declarer',
    description: 'Learn how to count winners and plan your play as declarer',
    category: 'play',
    steps: [
      {
        instruction: 'After the bidding ends, the player who first bid the trump suit for the winning side becomes "declarer." Declarer plays both their own hand and the dummy.',
        explanation: 'The dummy (declarer\'s partner) lays their cards face-up on the table. Declarer can see 26 cards and must plan accordingly.',
        requiredAction: { type: 'acknowledge' },
      },
      {
        instruction: 'Step 1 of declarer play: COUNT YOUR WINNERS. Look at both hands and count the tricks you can win without losing the lead.',
        explanation: 'A "winner" is a card that will win a trick. Ace of any suit is always a winner. King is a winner if you also have the Ace.',
        requiredAction: { type: 'acknowledge' },
      },
      {
        instruction: 'In No Trump: Count your top tricks in each suit. AKQ = 3 winners. AK = 2 winners. A = 1 winner. If you need more tricks, you must develop them.',
        explanation: 'Developing tricks means playing a suit until the opponents\' high cards are gone, promoting your lower cards to winners.',
        requiredAction: { type: 'acknowledge' },
      },
      {
        instruction: 'In a trump contract: Count your winners, then count your losers. If you have too many losers, can you ruff them in dummy?',
        explanation: 'A loser is a card that will lose a trick. With 3 losers in a 4-Heart contract (need 10 tricks), you need to eliminate one loser.',
        requiredAction: { type: 'acknowledge' },
      },
      {
        instruction: 'Step 2: MAKE A PLAN before playing to the first trick. Decide how you will get enough tricks to make your contract.',
        explanation: 'Common plans include: draw trumps then run a long suit, ruff losers in dummy, set up a finesse, or establish a long side suit.',
        requiredAction: { type: 'acknowledge' },
      },
      {
        instruction: 'Step 3: EXECUTE your plan. Maintain control by drawing trumps when appropriate, but do not draw trumps if you need dummy\'s trumps for ruffing.',
        explanation: 'Timing is everything in declarer play. Sometimes you must delay drawing trumps; other times you must draw them immediately.',
        requiredAction: { type: 'acknowledge' },
      },
      {
        instruction: 'A finesse is a key technique: lead toward a high card hoping the missing higher card is positioned favorably. For example, lead toward KQ hoping the Ace is on your left.',
        explanation: 'A finesse works about 50% of the time. Repeated finesses (A-Q combinations facing small cards) are a core declarer skill.',
        requiredAction: { type: 'acknowledge' },
      },
    ],
  },

  // ── 7. Leading Against Contracts ──
  {
    id: 'opening-leads',
    title: 'Leading Against Contracts',
    description: 'Learn how to choose the right opening lead on defense',
    category: 'defense',
    steps: [
      {
        instruction: 'The opening lead is the first card played. It is made by the player to the left of the declarer, BEFORE dummy is revealed.',
        explanation: 'The opening lead is the only defensive play made without seeing dummy. It is one of the most important decisions in Bridge.',
        requiredAction: { type: 'acknowledge' },
      },
      {
        instruction: 'Against No Trump contracts, lead your longest suit. The goal is to establish your long cards as winners.',
        explanation: 'Example: With a 5-card Heart holding (K-J-8-5-3), lead the 5 (4th from your longest and strongest suit).',
        requiredAction: { type: 'acknowledge' },
      },
      {
        instruction: 'Against suit contracts, consider leading partner\'s bid suit (if they bid one). Partner has shown strength there.',
        explanation: 'Leading partner\'s suit is generally safe and helps develop tricks in a suit where your side has combined strength.',
        requiredAction: { type: 'acknowledge' },
      },
      {
        instruction: 'From a sequence (KQJ, QJ10, J109), lead the top of the sequence. This is safe and helps establish tricks.',
        explanation: 'Leading the King from KQJ tells partner you have the Queen and Jack behind it. This is one of the safest leads.',
        requiredAction: { type: 'acknowledge' },
      },
      {
        instruction: 'Avoid leading unsupported Aces against suit contracts. Leading Ace-third (A-x-x) often gives declarer a trick.',
        explanation: 'An Ace is a sure trick. Leading it may set up declarer\'s King. Wait to capture something with your Ace.',
        requiredAction: { type: 'acknowledge' },
      },
      {
        instruction: 'Against suit contracts, consider a short-suit lead (singleton or doubleton) if you have trump to ruff with later.',
        explanation: 'If you lead a singleton and partner gets the lead, they can return that suit and you can ruff it. This creates an extra trick.',
        requiredAction: { type: 'acknowledge' },
      },
      {
        instruction: 'Listen to the bidding! The auction tells you about declarer\'s and dummy\'s hands. Use this information to choose your lead.',
        explanation: 'If declarer bid two suits, lead a third suit. If they bid NT after showing a balanced hand, attack their weak suit.',
        requiredAction: { type: 'acknowledge' },
      },
    ],
  },

  // ── 8. The Dummy ──
  {
    id: 'the-dummy',
    title: 'The Dummy',
    description: 'Learn how the dummy works and how declarer controls both hands',
    category: 'play',
    steps: [
      {
        instruction: 'After the opening lead, the declarer\'s partner (the "dummy") places all their cards face up on the table, sorted by suit.',
        explanation: 'Dummy takes no active part in the play. Declarer chooses which cards to play from both their hand and dummy.',
        requiredAction: { type: 'acknowledge' },
      },
      {
        instruction: 'The dummy\'s cards are visible to all players. This gives both declarer and the defenders information to plan their play.',
        explanation: 'Declarer sees 26 of 52 cards (their hand + dummy). Defenders each see 26 cards (their hand + dummy) but not each other\'s.',
        requiredAction: { type: 'acknowledge' },
      },
      {
        instruction: 'When it is dummy\'s turn to play, declarer names the card to be played from dummy. In this game, you click on the card in dummy\'s hand.',
        explanation: 'Think of dummy as an extension of your hand. You control both hands but must manage entries (ways to get between the two hands).',
        requiredAction: { type: 'acknowledge' },
      },
      {
        instruction: 'Entries are crucial. An entry is a card that lets you switch between playing from your hand and playing from dummy.',
        explanation: 'If dummy has the Ace of Clubs and you need to get to dummy, you can lead a small Club and win with dummy\'s Ace.',
        requiredAction: { type: 'acknowledge' },
      },
      {
        instruction: 'When dummy wins a trick, the next card is led from dummy. When your hand wins, you lead from your hand. Keep track of which hand should lead.',
        explanation: 'Running out of entries to dummy is a common mistake. Plan your entries early and preserve them for when you need them.',
        requiredAction: { type: 'acknowledge' },
      },
      {
        instruction: 'As a defender, when dummy is on your right, you play after dummy and can see what was played. When dummy is on your left, you must play before seeing dummy\'s card.',
        explanation: 'Position relative to dummy matters. "Third hand high" (play a high card in third position) is a key defensive principle.',
        requiredAction: { type: 'acknowledge' },
      },
    ],
  },
];

// ── Tutorial helpers ───────────────────────────────────────────────────────────

export function getTutorial(id: string): BridgeTutorial | undefined {
  return TUTORIALS.find((t) => t.id === id);
}

export function getTutorialsByCategory(category: TutorialCategory): BridgeTutorial[] {
  return TUTORIALS.filter((t) => t.category === category);
}

export function getTutorialStep(tutorialId: string, stepIndex: number): TutorialStep | undefined {
  const tutorial = getTutorial(tutorialId);
  if (!tutorial) return undefined;
  if (stepIndex < 0 || stepIndex >= tutorial.steps.length) return undefined;
  return tutorial.steps[stepIndex];
}

export function isTutorialComplete(tutorialId: string, stepIndex: number): boolean {
  const tutorial = getTutorial(tutorialId);
  if (!tutorial) return true;
  return stepIndex >= tutorial.steps.length;
}

export function getTutorialProgress(tutorialId: string, stepIndex: number): number {
  const tutorial = getTutorial(tutorialId);
  if (!tutorial || tutorial.steps.length === 0) return 100;
  return Math.round((stepIndex / tutorial.steps.length) * 100);
}

const TUTORIAL_PROGRESS_KEY = 'bridge-tutorial-progress-v1';

export interface TutorialProgress {
  completedTutorials: string[];
  currentTutorial: string | null;
  currentStep: number;
}

export function loadTutorialProgress(): TutorialProgress {
  try {
    const raw = localStorage.getItem(TUTORIAL_PROGRESS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch { /* ignore */ }
  return {
    completedTutorials: [],
    currentTutorial: null,
    currentStep: 0,
  };
}

export function saveTutorialProgress(progress: TutorialProgress): void {
  localStorage.setItem(TUTORIAL_PROGRESS_KEY, JSON.stringify(progress));
}
