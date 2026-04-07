# Don's Backgammon — Design System

This document defines the UI/UX standards for the app. All screens, components, and
game boards must follow these patterns. Game-specific board rendering (SVG colors,
checker styles, etc.) lives in each game's own theme config but inherits from the
shared design tokens.

## Design Tokens (CSS Variables)

All colors, spacing, typography, and radii are defined as CSS custom properties in
`src/index.css` under `:root` (dark) and `[data-theme="light"]` (light). Never
hardcode hex/rgba values in components. Always use `var(--token-name)`.

### Colors

| Token | Dark | Light | Usage |
|-------|------|-------|-------|
| `--bg` | `#0a0b10` | `#f0f1f5` | Page background |
| `--surface` | `#13151e` | `#ffffff` | Card/panel background |
| `--surface-2` | `#1a1d2a` | `#e8eaef` | Elevated surface, inputs |
| `--border` | `rgba(255,255,255,0.06)` | `rgba(0,0,0,0.08)` | Subtle borders |
| `--text` | `#e2e4ea` | `#1a1d2a` | Primary text |
| `--text-muted` | `#6b7280` | `#6b7280` | Secondary text |
| `--text-dim` | `#3d4250` | `#9ca3af` | Tertiary/disabled text |
| `--player` | `#4ecdc4` | `#0ea5a0` | Player accent (teal) |
| `--player-dim` | `rgba(78,205,196,0.15)` | `rgba(14,165,160,0.12)` | Player tint |
| `--opponent` | `#ff6b6b` | `#e84545` | Opponent accent (coral) |
| `--opponent-dim` | `rgba(255,107,107,0.15)` | `rgba(232,69,69,0.15)` | Opponent tint |
| `--accent` | `#4ecdc4` | `#0ea5a0` | Primary action color |
| `--accent-hover` | `#5de0d7` | `#0d9590` | Hover state |
| `--hit` | `#ff9f43` | `#ff9f43` | Warning/amber |
| `--glass` | `rgba(19,21,30,0.8)` | `rgba(255,255,255,0.85)` | Frosted glass bg |
| `--glass-border` | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.08)` | Glass border |

### Typography

| Token | Value | Usage |
|-------|-------|-------|
| `--font` | `'Inter', -apple-system, system-ui, sans-serif` | All text |
| `--font-mono` | `'SF Mono', 'Fira Code', monospace` | Codes, seeds, invite codes |

**Font scale (use these consistently):**

| Size | Pixels | Usage |
|------|--------|-------|
| xs | 10px | Badges, labels, timestamps |
| sm | 11px | Captions, sub-labels |
| base | 13px | Body text, button labels |
| md | 14px | Card titles, form labels |
| lg | 16px | Section headers |
| xl | 20px | Scores, large numbers |
| 2xl | 24-28px | Page titles |

**Font weights:**
- 500: Normal text
- 600: Semi-bold (labels, captions)
- 700: Bold (card titles, buttons)
- 800: Extra-bold (headers, scores)
- 900: Black (page titles only)

### Spacing

Use multiples of 4px. Common values:

| Token | Value | Usage |
|-------|-------|-------|
| `--sp-1` | `4px` | Tight gaps |
| `--sp-2` | `8px` | Button gaps, small padding |
| `--sp-3` | `12px` | Card inner padding, section gaps |
| `--sp-4` | `16px` | Standard padding |
| `--sp-5` | `20px` | Page padding |
| `--sp-6` | `24px` | Section separators |
| `--sp-8` | `32px` | Large section gaps |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius` | `16px` | Cards, modals, large containers |
| `--radius-sm` | `8px` | Buttons, inputs, badges |
| `--radius-pill` | `9999px` | Pills, toggles, round buttons |

### Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow` | `0 8px 32px rgba(0,0,0,0.4)` | Modals, elevated cards |
| `--shadow-sm` | `0 2px 8px rgba(0,0,0,0.3)` | Buttons, small cards |

---

## Shared Components

### Buttons (`.action-btn`)

Three variants. Always use the CSS class, never build buttons from inline styles.

```tsx
<button className="action-btn primary">Primary Action</button>
<button className="action-btn secondary">Secondary</button>
<button className="action-btn secondary icon-only"><Icon size={16} /></button>
```

- Height: 38px (default), 28-32px (compact: inline style override)
- Border-radius: pill (19px)
- Font: 13px, 600 weight
- Press animation: `transform: scale(0.95)` on `:active`

### Cards

Cards use `var(--surface-2)` background, `1px solid var(--glass-border)` border,
and `var(--radius)` border-radius.

**Game card pattern** (used in HomeScreen, Dashboard):
```tsx
<button style={{
  background: 'var(--surface-2)',
  border: '1px solid var(--glass-border)',
  borderRadius: 'var(--radius)',
  padding: '16px 20px',
}}>
  <IconBox /> <Content /> <Chevron />
</button>
```

### Modals (`.overlay-backdrop` + `.overlay-card`)

```tsx
<div className="overlay-backdrop" onClick={onClose}>
  <div className="overlay-card" onClick={e => e.stopPropagation()}>
    <h2>Title</h2>
    <p>Description</p>
    {/* content */}
  </div>
</div>
```

- Backdrop: fixed, blur(8px), 0.6 dark overlay
- Card: max-width 360px, padding 32px 28px, centered
- Entry animation: `modal-bounce` (scale + opacity)

### Top Bar (`.top-bar`)

Every screen has a top bar with glass effect:
```tsx
<div className="top-bar">
  <LeftContent />   {/* back button or player info */}
  <CenterContent /> {/* title or match info */}
  <RightContent />  {/* controls or spacer */}
</div>
```

### Action Bar (`.action-bar`)

Bottom bar for contextual actions during gameplay:
```tsx
<div className="action-bar">
  {/* game state info, navigation, utilities */}
</div>
```

### Inputs (`.auth-input`)

```tsx
<input className="auth-input" placeholder="..." />
```

- Height: 44px (40px compact)
- Border: 1px solid var(--border), focus: 3px glow accent
- Background: var(--surface-2)

### Toggle Switch

Standard 48x26px toggle. Extract to shared component:

```tsx
<Toggle enabled={value} onToggle={() => setValue(!value)} />
```

- Width: 48px, height: 26px, border-radius: 13px
- Knob: 20px circle, transitions `left` property
- On: `var(--accent)` bg, Off: `var(--surface-2)` bg

### Avatar

Circular, with optional image or initial letter:

```tsx
<Avatar url={profile.avatar_url} name={profile.username} size={36} active={isMyTurn} />
```

- Sizes: 28px (compact), 36px (default), 72px (settings)
- Active: colored border + glow
- Fallback: first letter of name on `var(--player-dim)` background

---

## Navigation Patterns

### Screen Hierarchy

```
Home Screen
  ├── Play vs Computer → Game Board → (Quit → Home)
  ├── Play vs Friend → Dashboard → Game Board
  ├── Play vs Random → Dashboard → Game Board
  ├── Solo Challenges → Challenge List → Challenge Board → (Back → List)
  ├── My Games → Dashboard
  └── Settings → Settings Screen
```

### Navigation Rules

1. **Every screen has a Back action** in the top-left of the top bar
2. **Game board has a Quit button** in top-right with confirmation dialog if game active
3. **Modals dismiss** on backdrop click and escape key
4. **No deep linking yet** — all navigation is in-memory state

---

## Game Board Standards

Game-specific board rendering has its own color/style config but follows these rules:

### Board Container

```tsx
<div className="board-area">
  <div className="board-wrap">
    <svg className="board-svg" viewBox="..." preserveAspectRatio="xMidYMid meet">
      {/* game-specific rendering */}
    </svg>
  </div>
</div>
```

- Board fills available vertical space between top controls and action bar
- Maintains aspect ratio via `preserveAspectRatio`
- Drop shadow: dark mode heavy, light mode subtle

### Game Theme Config

Each game defines a `THEMES` object with dark/light variants. These should eventually
read from CSS variables, but for SVG rendering they're kept as JS objects:

```ts
const THEMES = {
  dark: { boardBg: '...', frameBg: '...', player: '...', opp: '...' },
  light: { boardBg: '...', frameBg: '...', player: '...', opp: '...' },
};
```

### Board-Level UI (above/below the SVG)

- **Controls** (Roll, Undo, Done): centered above the board
- **Dice**: centered between controls and board, not inside the SVG
- **Action bar**: bottom of screen, glass effect

---

## Animation Standards

### Entry Animations

| Animation | Duration | Easing | Usage |
|-----------|----------|--------|-------|
| `slide-up` | 0.4s | ease-out | Cards entering view |
| `bounce-in` | 0.5s | cubic-bezier(0.34,1.56,0.64,1) | Modals, celebration elements |
| `card-enter` | 0.3s | ease-out | List items, stagger by 80ms |
| `modal-bounce` | 0.3s | cubic-bezier(0.34,1.56,0.64,1) | Modal cards |

### State Animations

| Animation | Duration | Usage |
|-----------|----------|-------|
| `dest-pulse` | 1.5s infinite | Valid move indicators |
| `thinking-dots` | 1.4s infinite | AI thinking indicator |
| `dice-in` | 0.5s | Dice appearing |
| `glow-ring` | 2s infinite | Completed challenge badges |

### Interaction

- **Button press**: `transform: scale(0.95)` on `:active`
- **Card hover**: `translateY(-2px) scale(1.02)` with shadow increase
- **Toggle switch**: `transition: left 0.2s, background 0.2s`

---

## Responsive Breakpoints

| Breakpoint | Target |
|------------|--------|
| `max-height: 650px` | Short screens: compact top/action bar, smaller avatars |
| `max-width: 420px` | Mobile: smaller text, compact buttons, tighter padding |

---

## Icon System

Using [Lucide React](https://lucide.dev/) icons. Import only what you need:

```tsx
import { Cpu, Users, Globe, Puzzle, Settings, LogIn, LogOut, Sun, Moon } from 'lucide-react';
```

Default size: 16px for buttons, 18px for cards, 22px for card icons.
Always use `currentColor` (default) so icons inherit text color.

---

## Do's and Don'ts

**DO:**
- Use CSS variables for all colors
- Use `.action-btn` classes for buttons
- Use `.overlay-backdrop` + `.overlay-card` for modals
- Use `.auth-input` for form inputs
- Add entry animations to list items
- Test in both light and dark mode

**DON'T:**
- Hardcode hex colors in inline styles
- Create new button styles — use the existing variants
- Skip the top bar on any screen
- Use emojis as icons — use Lucide
- Mix border-radius values — stick to `--radius` and `--radius-sm`
- Forget the press/hover animations on interactive elements
