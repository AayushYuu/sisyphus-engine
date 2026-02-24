# ⚔️ SISYPHUS ENGINE

An absurd gamification engine for [Obsidian](https://obsidian.md). Transform your note-taking into a Dark Souls-inspired survival RPG — complete quests, level skills, fight bosses, dodge death, and push the boulder up the hill, forever.

---

## ✨ Features

### Core Systems
- **Quest System** — Create quests as markdown files with difficulty, skill tags, deadlines, and energy/context metadata. Drag-and-drop organization.
- **Skill Tree** — SVG-based skill grid with neural connections, XP progression, and visual decay when skills are neglected.
- **HP & Survival** — Take damage from failed quests and inactivity. Drop to zero and you die — resetting your run but keeping permanent scars.
- **Gold Economy** — Earn gold from quests, spend it in the shop on potions, scrolls, and relics.
- **Rival AI** — A persistent AI opponent that taunts you, gains XP when you fail, and evolves based on your performance.
- **Achievement System** — 20+ achievements across combat, productivity, and exploration categories.

### Panopticon Sidebar
The **Panopticon** is your command center — a sidebar view showing real-time stats, active quests, bounties, notifications, and more. Features:
- **⚡ Command Hub** — A categorized feature grid (press ⚡ or `Ctrl+⚡`) for instant access to all commands.
- **🔔 Notification Center** — A persistent event feed tracking achievements, quest completions, rival actions, and system events.
- **🎯 Bounty Board** — Auto-generated quests based on neglected skills, with bonus XP/gold multipliers.
- **⚔️ Boss Rush Mode** — Queue multiple quests for a gauntlet — complete them all for massive bonus rewards, or fail for nothing.
- **📅 Recurring Quests** — Schedule quests to auto-deploy daily, weekly, or monthly.

### Smart Filters
- **Collapsible Filter Panel** — 5-dimension filtering: Energy, Context, Difficulty (★-★★★★★), Skill, and Tags.
- **Sort Modes** — Urgent First (deadline), Easy First, Hard First, Newest First.
- **Live Match Count** — Shows `X/Y` quests matching current filters.
- **Tag Chips** — One-click toggle for custom quest tags.

### Analytics Dashboard (Tabbed)
- **📊 Overview** — 4 summary cards (Today's Quests, Streak, Success Rate, Best Day), week-over-week comparison, skill radar chart.
- **📈 Activity** — GitHub-style 365-day heatmap, hourly productivity chart, 7-day line chart.
- **💡 Insights** — Success rate ring chart, difficulty tier breakdown with per-tier success bars, calibration suggestion banner, top skills ranking.
- **Difficulty Auto-Calibration** — Tracks completion rates per difficulty level and suggests adjustments.

### Customization
- **4 Visual Themes** — Default (Purple), Cyberpunk (Neon), Dark Souls (Gritty), Minimal (Monochrome), Terminal (Green-on-black).
- **Per-Module Settings** — Each game module exposes its own configuration in the settings tab.
- **Game Modes** — Full, Pacifist, Zen, Hardcore, or Custom module selection.
- **Quest Templates** — Pre-configured templates for rapid quest deployment.

### Additional Systems
- **Quest Chains** — Multi-step quest sequences with progress tracking.
- **Research Quests** — Long-form, word-count-based research projects.
- **Pomodoro Timer** — Built-in focus timer with audio notifications.
- **Meditation & Recovery** — Lockdown recovery mechanics and rest day system.
- **Focus Audio** — Brown noise generator for deep work sessions.
- **Character Profile** — Full character sheet modal with stats, skills, and history.

---

## 🚀 Installation

1. Copy the plugin folder to your vault's `.obsidian/plugins/sisyphus-engine/` directory.
2. Enable the plugin in Obsidian Settings → Community Plugins.
3. The Panopticon sidebar opens automatically. You can also run `Sisyphus: Open Panopticon` from the command palette.

---

## ⌨️ Hotkeys

| Hotkey | Action |
|---|---|
| `Ctrl+D` | Deploy Quest |
| `Ctrl+Shift+X` | Quick Capture |
| `Ctrl+Shift+C` | Complete Top Quest |
| `Ctrl+Shift+W` | Weekly Review |
| `Ctrl+Shift+P` | Character Profile |
| `Ctrl+Shift+M` | Start Meditation |
| `Ctrl+Shift+Z` | Undo Last Deletion |

---

## 🏗️ Architecture

The engine uses a **modular kernel architecture**:

- **Kernel** — Central event bus, state management, and service registry.
- **Modules** — 8 pluggable modules (Survival, Progression, Economy, Combat, Productivity, Analytics, Recovery, Daily Lifecycle) that subscribe to kernel events.
- **Engines** — Static utility classes (Achievement, Rival, Difficulty, Bounty, Recurring, Boss Rush, Notification) that operate on the shared state.
- **UI** — Panopticon sidebar view, modal dialogs, SVG renderers, and CSS-variable-based theming.

See [WIKI.md](./WIKI.md) for detailed documentation.

---

## 📄 License

MIT