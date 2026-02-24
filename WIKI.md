# SISYPHUS ENGINE — WIKI

Comprehensive documentation for every system in the Sisyphus Engine.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Kernel & Module System](#kernel--module-system)
3. [Quest System](#quest-system)
4. [Skill Tree & Decay](#skill-tree--decay)
5. [HP, Survival & Death](#hp-survival--death)
6. [Gold Economy & Shop](#gold-economy--shop)
7. [Rival AI](#rival-ai)
8. [Achievement Engine](#achievement-engine)
9. [Difficulty Auto-Calibration](#difficulty-auto-calibration)
10. [Bounty Board](#bounty-board)
11. [Recurring Quests](#recurring-quests)
12. [Boss Rush Mode](#boss-rush-mode)
13. [Notification Center](#notification-center)
14. [Themes System](#themes-system)
15. [Command Hub](#command-hub)
16. [Analytics & Metrics](#analytics--metrics)
17. [Quest Chains](#quest-chains)
18. [Research Quests](#research-quests)
19. [Meditation & Recovery](#meditation--recovery)
20. [Pomodoro Timer](#pomodoro-timer)
21. [Daily Lifecycle](#daily-lifecycle)
22. [Settings & Configuration](#settings--configuration)
23. [Data Management](#data-management)
24. [File Structure](#file-structure)

---

## Architecture Overview

Sisyphus Engine follows a **modular kernel architecture** inspired by OS design:

```
┌───────────────────────────────────────────┐
│              SisyphusPlugin               │
│  (Obsidian Plugin entry point)            │
├───────────────────────────────────────────┤
│              SisyphusKernel               │
│  ┌─────────┐ ┌────────────┐ ┌─────────┐  │
│  │EventBus │ │StateManager│ │ModuleMgr│  │
│  └─────────┘ └────────────┘ └─────────┘  │
├───────────────────────────────────────────┤
│             Game Modules (8)              │
│  Survival | Progression | Economy | Combat│
│  Productivity | Analytics | Recovery      │
│  DailyLifecycle                           │
├───────────────────────────────────────────┤
│           Static Engines (7)              │
│  Achievement | Rival | Difficulty         │
│  Bounty | Recurring | BossRush            │
│  Notification                             │
├───────────────────────────────────────────┤
│             UI Layer                      │
│  PanopticonView | Modals | CommandHub     │
│  SkillTree | Charts | QuestCards          │
└───────────────────────────────────────────┘
```

### Event Flow
1. User action triggers a kernel event (e.g., `quest:completed`)
2. All subscribed modules process the event
3. Static engines perform calculations on shared state
4. The Panopticon view refreshes to reflect changes

---

## Kernel & Module System

### Kernel (`src/core/Kernel.ts`)
The `SisyphusKernel` manages:
- **EventBus** — Typed publish/subscribe for domain events
- **StateManager** — Migration-safe state persistence with versioning
- **ModuleManager** — Module registration, enabling, and lifecycle

### Kernel Events
| Event | Payload | Description |
|---|---|---|
| `clock:tick` | `{ now: string }` | Fired every 60 seconds |
| `session:start` | `{ now: string }` | Fired on daily login |
| `quest:completed` | `{ questId, difficulty, skillName, ... }` | Quest successfully completed |
| `quest:failed` | `{ questId, damage, manualAbort, ... }` | Quest failed or deadline missed |
| `reward:granted` | `{ xp, gold, reason }` | XP/Gold reward applied |

### Modules
Each module extends `GameModule` and implements:
- `onEnable()` — Subscribe to kernel events
- `onDisable()` — Unsubscribe from events
- `renderSettings(container)` — Render per-module settings in the settings tab

| Module | ID | Description |
|---|---|---|
| Survival | `survival` | HP damage from failures, lockdown, death checks |
| Progression | `progression` | XP calculations, level-ups, boss milestone spawning |
| Economy | `economy` | Gold rewards from quest completions |
| Combat | `combat` | Boss defeat processing, victory conditions |
| Productivity | `productivity` | Quest counters, streaks, daily mission progression |
| Analytics | `analytics` | Daily metric tracking, telemetry |
| Recovery | `recovery` | Buff expiration, timed recovery effects |
| Daily Lifecycle | `daily_lifecycle` | Daily login reset, rot damage, chaos rolls, skill rust |

### Game Modes
| Mode | Active Modules |
|---|---|
| **Full** | All 8 modules |
| **Pacifist** | Progression, Economy, Productivity, Analytics |
| **Zen** | Progression, Productivity |
| **Hardcore** | All 8 modules (with increased penalties) |
| **Custom** | User-selected modules |

---

## Quest System

Quests are markdown files stored in `Active_Run/Quests/`. Each quest has:

### Quest Properties (Frontmatter)
| Property | Type | Description |
|---|---|---|
| `diff` | 1-5 | Difficulty level |
| `skill` | string | Primary skill tag |
| `secondarySkill` | string | Secondary skill tag |
| `deadline` | string | Absolute time ("10:00") or relative ("+2h") |
| `energy` | string | Energy level (high/medium/low) |
| `context` | string | Context (home/office/transit) |
| `tags` | string[] | Custom tags for filtering |
| `highStakes` | boolean | Doubled rewards and penalties |

### Quest Lifecycle
1. **Deploy** — Created via modal, quick capture, template, or bounty accept
2. **Active** — Visible in Panopticon, countdown running
3. **Complete** — Triggers `quest:completed` event, grants rewards
4. **Failed** — Triggered by deadline expiry, deals HP damage
5. **Deleted** — Moved to trash (undoable via `Ctrl+Shift+Z`)

### Quest Filtering (Smart Filter Panel)
The Panopticon includes a **collapsible smart filter panel** with 5 dimensions:

| Dimension | Options | Behavior |
|---|---|---|
| **Energy** | ⚡ High, 🔋 Med, 🪫 Low | Pill toggles (tap to toggle on/off) |
| **Context** | 🏠 Home, 💼 Office, 🌍 Any | Pill toggles |
| **Difficulty** | ★ to ★★★★★ | Star buttons (reads `diff` from frontmatter) |
| **Skill** | Dropdown of all skills | Filters by `skill` or `secondarySkill` frontmatter |
| **Tags** | Clickable chip buttons | Requires ANY active tag to match |

**Sort Modes** (dropdown):
- ⏰ Urgent First — Sort by deadline (default)
- 🟢 Easy First — Sort by ascending difficulty
- 🔴 Hard First — Sort by descending difficulty
- 🆕 Newest First — Sort by creation date

**UI Behavior:**
- Panel header shows filter count badge and match count (`X/Y`)
- Panel auto-collapses when no filters are active
- "✕ CLEAR ALL" button resets all 5 dimensions and sort mode
- Manual order and boss quests always override sort mode

---

## Skill Tree & Decay

### Skills
Each skill tracks:
| Field | Description |
|---|---|
| `name` | Skill name (e.g., "Coding", "Fitness") |
| `level` | Current level (visual glow at 5+ and 10+) |
| `xp` / `xpReq` | Progress to next level |
| `rust` | Decay counter (0-10), increases when skill is neglected |
| `lastUsed` | Timestamp of last use |
| `connections` | Neural links to other skills |

### Skill Decay Visualization
Rust builds when a skill isn't used for 3+ days:
| Rust Level | Visual Effect | Class |
|---|---|---|
| 1-3 | Yellow overlay, subtle border | `sisy-rust-mild` |
| 4-6 | Orange overlay, pulsing border | `sisy-rust-medium` |
| 7-10 | Red overlay, grayscale filter, fast pulse | `sisy-rust-severe` |

Each skill node shows:
- **Rust progress bar** — Visual gradient from gold to red
- **Severity label** — "FADING", "DECAYING", or "CRITICAL"
- **Idle day counter** — Days since last use

### Skill Tree Rendering
Skills are rendered as an SVG-based grid with:
- **Connection lines** — Dashed SVG lines between linked skills
- **Level badges** — Color-coded by level tier (Adept 5+, Master 10+)
- **XP progress bars** — Real-time fill with exact XP counts

---

## HP, Survival & Death

### HP System
- **Base HP**: 100 + (Level × 5)
- **Recovery**: +20 HP per daily login
- **Damage Sources**: Failed quests, rot (inactivity), rival attacks
- **Shield**: Temporary damage immunity (purchasable in shop)

### Death & Rebirth
When HP drops to zero:
1. A **Death Modal** appears
2. **Scars** are recorded (death count, best streak, boss kills, achievements)
3. Run resets: HP, gold, quests, skills, and level return to defaults
4. Scars persist forever as a permanent record

### Vignette Effect
When HP is ≤ 20, a red vignette overlay pulses around the screen edge as a warning.

---

## Gold Economy & Shop

### Earning Gold
- Quest completion: Base reward scaled by difficulty
- Chaos modifier: Daily random multiplier (0.5x to 3x)
- Active buffs: Gold multiplier potions
- Boss Rush: Completion bonus

### Shop Items
| Item | Cost | Effect |
|---|---|---|
| HP Potion | Varies | Restores HP |
| XP Scroll | Varies | Grants bonus XP |
| Gold Relic | Varies | Permanent gold multiplier |
| Shield | Varies | Temporary damage immunity |

### Debt
Gold can go negative. While in debt, survival damage is doubled.

---

## Rival AI

### Rival Properties
| Field | Description |
|---|---|
| `name` | Rival's name |
| `personality` | aggressive, mocking, strategic, or chaotic |
| `level` / `xp` | Rival levels up when you fail |
| `damageDealt` | Total damage dealt to you |

### Rival Behavior
- **On quest complete**: Rival reacts with a personality-based taunt
- **On quest fail**: Rival gains 15 XP and taunts
- **Leveling**: Rival levels up independently, increasing its threat

### Rival Taunts
Personality-specific taunt pools that display as notifications.

---

## Achievement Engine

### Achievement Check
`AchievementEngine.checkAll(settings)` runs after every quest completion, checking conditions like:
- Total quests completed
- Streak milestones
- Boss defeats
- Gold accumulated
- Level thresholds

### Achievement Categories
- **Combat** — Quest completion milestones
- **Productivity** — Streak and consistency achievements
- **Exploration** — Skill diversity and research achievements

---

## Difficulty Auto-Calibration

### How It Works
The `DifficultyCalibrator` engine tracks completion rates per difficulty tier (1-5):

```
Tier 1: ████████░░ 80% (24/30)
Tier 2: ██████░░░░ 60% (12/20)
Tier 3: ████░░░░░░ 40% (8/20)
Tier 4: ██░░░░░░░░ 20% (2/10)
Tier 5: ░░░░░░░░░░  0% (0/0)
```

### Suggestion Algorithm
After 5+ attempts at your most-used tier:
- **>90% success rate** → Suggests increasing difficulty ("You're crushing it!")
- **<40% success rate** → Suggests decreasing difficulty ("Try lowering difficulty")
- **40-90%** → No suggestion (you're in the sweet spot)

### Data Stored
| Field | Type | Description |
|---|---|---|
| `completions` | number[5] | Completions per tier |
| `failures` | number[5] | Failures per tier |
| `avgCompletionTime` | number[5] | Average completion time per tier |
| `suggestedAdjustment` | -1, 0, 1 | Current suggestion |

---

## Bounty Board

### Overview
The **Bounty Board** auto-generates quests based on player behavior patterns, specifically targeting neglected skills.

### Bounty Generation
`BountyEngine.generateBounties(settings)` analyzes:
1. Skills with high rust levels
2. Skills not used recently
3. Overall skill distribution imbalances

### Bounty Structure
| Field | Description |
|---|---|
| `name` | Quest name (e.g., "Quick Exercise Session") |
| `description` | What to do |
| `reason` | Why this bounty was generated |
| `targetSkill` | The neglected skill this targets |
| `reward.xp` | XP reward (higher than normal) |
| `reward.gold` | Gold reward |
| `reward.multiplier` | Reward multiplier (1.5x - 3x) |
| `difficulty` | Auto-set difficulty |
| `expiresAt` | Expiration timestamp |

### Accept/Dismiss
- **Accept** — Creates the quest, removes the bounty
- **Dismiss** — Removes the bounty until next generation

---

## Recurring Quests

### Overview
**Recurring Quests** auto-deploy on a schedule. Perfect for daily routines, weekly reviews, or monthly goals.

### Recurring Quest Properties
| Field | Description |
|---|---|
| `name` | Quest name |
| `frequency` | `daily`, `weekly`, or `monthly` |
| `difficulty` | 1-5 |
| `skill` | Skill tag |
| `lastDeployed` | Last deployment date |
| `enabled` | Active/inactive toggle |
| `deployTime` | Time of day to deploy (e.g., "08:00") |

### Deployment
`RecurringEngine.checkAndDeploy(settings)` runs on session start:
1. Checks each enabled recurring quest
2. If due (based on frequency and lastDeployed), marks it for deployment
3. Returns the list of quests to deploy

---

## Boss Rush Mode

### Overview
**Boss Rush** is a gauntlet mode where you queue 2-5 quests and attempt to complete them all in sequence. Massive bonus rewards on completion, but quest failure ends the rush.

### States
| State | Description |
|---|---|
| **Inactive** | No rush active |
| **Active** | Rush in progress, tracking current quest index |
| **Completed** | All quests done — 2x total XP/Gold bonus |
| **Failed** | A quest failed — no bonus, rush ends |

### Mechanics
- **Start**: Via Command Hub or `Boss Rush: Start` command. Queues top 5 active quests.
- **Progress**: Each quest completion advances the index. The Panopticon shows the full queue with status indicators (✅ done, ⚔️ current, ⬜ pending).
- **Completion Bonus**: Total XP × 2 and Total Gold × 2 on full completion.
- **Failure**: Immediate rush end, no bonus rewards.
- **Abort**: Manual abort available via "ABORT RUSH" button.

---

## Notification Center

### Overview
A persistent event feed in the Panopticon that captures all significant events.

### Notification Categories
| Category | Events |
|---|---|
| `achievement` | Achievement unlocked |
| `rival` | Rival taunts, rival level-ups |
| `combat` | Quest complete, quest failed, boss rush events |
| `progression` | Level-ups, skill connections |
| `system` | Daily reset, chaos modifier changes |
| `bounty` | Bounty generation, acceptance |

### Storage
- Max 50 notifications stored
- Newest first ordering
- Read/unread tracking
- Badge in Panopticon header shows unread count

### Actions
- **Mark All Read** — Clears unread indicators
- **Clear** — Removes all notifications

---

## Themes System

### Available Themes
| Theme | Description | Variable Override Summary |
|---|---|---|
| **Default** | Purple/Blue with glass backgrounds | Base `--sisy-*` variables |
| **Cyberpunk** | Neon magenta/cyan with glowing text | Neon colors, text shadows |
| **Dark Souls** | Muted earth tones, gritty feel | Brown/gold palette, square edges |
| **Minimal** | Monochrome grays, no shadows | All grays, minimal decoration |
| **Terminal** | Green-on-black, monospace font | All green, Courier font, CRT glow |

### How Themes Work
1. Theme selection in Settings → Appearance → Theme dropdown
2. Stored as `settings.theme` string
3. Applied as CSS class `sisy-theme-{name}` on the Panopticon container
4. Themes override CSS custom properties (`--sisy-purple`, `--sisy-red`, etc.)
5. No runtime overhead — pure CSS variable cascade

### Creating Custom Themes
Add a new CSS class following the pattern:
```css
.sisy-theme-mytheme {
    --sisy-purple: #your-accent;
    --sisy-red: #your-danger;
    --sisy-green: #your-success;
    --sisy-blue: #your-info;
    --sisy-gold: #your-highlight;
    --sisy-bg-dim: rgba(r, g, b, 0.03);
    --sisy-bg-glass: rgba(r, g, b, 0.6);
}
```

---

## Command Hub

### Overview
A categorized feature grid (modal) providing instant access to all Sisyphus commands. Opened via:
- ⚡ button in the Panopticon header
- `Sisyphus: Command Hub` command

### Categories
| Category | Commands |
|---|---|
| **Combat** | Deploy Quest, Quick Capture, Complete Top, Accept Death, Boss Rush |
| **Analytics** | Game Stats, Export Stats, Weekly Review, Character Profile |
| **Skills** | Neural Hub Graph, View Scars |
| **Research** | Create Research, View Library |
| **Chains** | Create Chain, View Active |
| **Tools** | Focus Audio, Meditation, Pomodoro, Reroll Chaos, Templates, Undo Delete, Recurring Quests |

---

## Analytics & Metrics

The **Analytics Dashboard** is a 3-tab interface in the Panopticon:

### Tab 1: 📊 Overview
| Component | Description |
|---|---|
| **Summary Cards** | 2×2 grid: Today's Quests, Current Streak, Success Rate %, Best Day |
| **Week Comparison** | 4-column grid comparing this week vs last week (quests, XP, gold, damage) with ↑/↓ delta arrows |
| **Skill Radar** | SVG radar chart of top skills by level (requires 3+ skills) |

### Tab 2: 📈 Activity
| Component | Description |
|---|---|
| **GitHub Heatmap** | 365-day grid-style contribution heatmap (SVG, 4 intensity levels) |
| **Productivity by Hour** | 24-bar chart showing quest completions per hour of day |
| **7-Day Line Chart** | SVG line chart with gradient fill showing recent daily quest counts |

### Tab 3: 💡 Insights
| Component | Description |
|---|---|
| **Success Ring** | SVG donut chart showing overall success percentage (color-coded green/yellow/red) |
| **Difficulty Breakdown** | 5 horizontal bars showing success rate per difficulty tier (★ to ★★★★★) with color-coded fills |
| **Calibration Banner** | Suggestion from DifficultyCalibrator (📈 increase / 📉 decrease) |
| **Top Skills** | Ranked list of top 5 skills by level, with name, level badge, and XP progress bar |

### Day Metrics (`dayMetrics[]`)
Tracked daily:
- Quests completed/failed
- XP/Gold earned
- Damage taken
- Skills leveled
- Chains completed
- Hourly completions (24-element array)

### Weekly Reports
Generated via `Weekly Review` command:
- Total quests, success rate
- Top skills, best day
- Week-over-week comparison deltas

### Sparklines
Stats display inline 7-day sparkline charts with week-over-week delta indicators (↑ green / ↓ red).

---

## Quest Chains

### Structure
A chain is a sequence of quests that must be completed in order:
- **Name** — Chain title
- **Quests** — Ordered list of quest IDs
- **Progress** — Current step and completion percentage

### Chain Operations
- **Create** — Via Chain Builder modal
- **Break** — Manually abort the active chain
- **Complete** — Auto-advances when the current quest is completed

---

## Research Quests

### Overview
Long-form quests tracked by word count rather than completion.

### Properties
| Field | Description |
|---|---|
| `title` | Research topic |
| `wordCount` | Current word count |
| `wordLimit` | Target word count |
| `completed` | Completion status |

### Research Ratio
Tracks the balance between combat (regular) quests and research quests.

---

## Meditation & Recovery

### Meditation
- Triggered manually or on lockdown
- Multi-click breathing exercise
- Restores HP on completion

### Lockdown
Activated when `damageTakenToday > 50`:
- Prevents new quest deployment
- Forces meditation or rest
- Resets on daily login

### Rest Days
Mark a day as a rest day to prevent:
- Skill rust accumulation
- Rival damage

---

## Pomodoro Timer

Built-in focus timer:
- **Start/Pause** — Toggle via command or button
- **Reset** — Clear the current timer
- **Audio notification** — Sound alert on completion

---

## Daily Lifecycle

### Daily Login Reset
On first login each day:
1. HP regenerates (+20, capped at max)
2. Damage counter resets
3. Lockdown clears
4. Skill rust accumulates (3+ days idle → +1 rust)
5. Daily missions roll
6. Chaos modifier rerolls

### Rot Damage
If you miss 2+ days:
- Rot damage: (days away - 1) × 10 HP
- Can lead to death if HP drops to zero

---

## Settings & Configuration

### Global Settings
| Setting | Description | Default |
|---|---|---|
| Starting HP | Base HP for new runs | 100 |
| Rival Damage | Base damage for failed quests | 10 |
| Mute Audio | Disable all sounds | false |
| Theme | Visual theme | default |

### Per-Module Settings
Each enabled module displays its own settings section below the module toggles, showing:
- Current module state (HP, Gold, Level, etc.)
- Module-specific statistics
- Read-only diagnostic information

---

## Data Management

### Export
Downloads a full JSON backup of config and game state.

### Import
Restores from a backup file. **Warning**: Overwrites all current data.

### State Migration
The `StateManager` handles version migrations automatically, ensuring backward compatibility when the plugin updates.

---

## File Structure

```
sisyphus-engine/
├── src/
│   ├── main.ts                    # Plugin entry point, commands, event hooks
│   ├── engine.ts                  # SisyphusEngine (quest CRUD, combat, shop)
│   ├── settings.ts                # Settings tab (modules, theme, audio, data)
│   ├── types.ts                   # All type definitions
│   ├── utils.ts                   # AudioController, helpers
│   ├── core/
│   │   ├── Kernel.ts              # SisyphusKernel (event bus, state, services)
│   │   ├── EventBus.ts            # Typed pub/sub event system
│   │   ├── GameModule.ts          # Base module class
│   │   ├── ModuleManager.ts       # Module lifecycle management
│   │   ├── StateManager.ts        # State persistence and migration
│   │   └── services.ts            # Service type definitions
│   ├── engines/
│   │   ├── AchievementEngine.ts   # Achievement checking and unlocking
│   │   ├── RivalEngine.ts         # Rival AI behavior and taunts
│   │   ├── DifficultyCalibrator.ts# Quest difficulty analysis
│   │   ├── BountyEngine.ts        # Auto-generated bounty quests
│   │   ├── RecurringEngine.ts     # Scheduled quest deployment
│   │   ├── BossRushEngine.ts      # Boss Rush mode state machine
│   │   ├── NotificationEngine.ts  # Event feed management
│   │   └── PomodoroTimer.ts       # Focus timer
│   ├── modules/
│   │   ├── survival/SurvivalModule.ts
│   │   ├── progression/ProgressionModule.ts
│   │   ├── economy/EconomyModule.ts
│   │   ├── combat/CombatModule.ts
│   │   ├── productivity/ProductivityModule.ts
│   │   ├── analytics/AnalyticsModule.ts
│   │   ├── recovery/RecoveryModule.ts
│   │   └── recovery/DailyLifecycleModule.ts
│   └── ui/
│       ├── view.ts                # PanopticonView (main sidebar)
│       ├── commandhub.ts          # Command Hub modal
│       ├── modals.ts              # Quest, Shop, Skill, Scars modals
│       ├── profile.ts             # Character Profile modal
│       ├── review.ts              # Weekly Review, Boss Encounter modals
│       ├── card.ts                # Quest card renderer
│       ├── charts.ts              # Sparkline & chart renderers
│       ├── effects.ts             # Toasts, float rewards, empty states
│       └── skilltree.ts           # SVG skill tree renderer
├── styles.css                     # All CSS (~2200 lines)
├── manifest.json                  # Plugin manifest
├── package.json                   # Dependencies
├── rollup.config.mjs              # Build configuration
├── tsconfig.json                  # TypeScript config
├── README.md                      # Quick start guide
└── WIKI.md                        # This file
```