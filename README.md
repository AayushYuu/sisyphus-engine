# 🏔️ Sisyphus Engine for Obsidian

> **"One must imagine Sisyphus happy. But Sisyphus must also get to work."**

![Version](https://img.shields.io/badge/version-1.0.0--beta-blueviolet?style=for-the-badge) ![Platform](https://img.shields.io/badge/platform-Obsidian-black?style=for-the-badge) ![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)

**Sisyphus Engine** is a high-stakes gamification OS for Obsidian. It replaces your todo list with a roguelike RPG system where productivity dictates survival. 

**Core Rule:** If your HP hits 0, the run ends. Your level, gold, and progress are wiped. You keep only your "Scars."

## 📋 Command & Control Index

1. [Installation & Setup](#1-installation--setup)
2. [The Panopticon (Interface)](#2-the-panopticon-interface)
3. [Core Gameplay Loop](#3-core-gameplay-loop)
    - [Chaos & Entropy](#chaos--entropy)
    - [Daily Missions](#daily-missions)
4. [Economy & The Black Market](#4-economy--the-black-market)
5. [Neural Hub (Skill Tree)](#5-neural-hub-skill-tree)
6. [DLC 1: Combat Librarian (Research)](#6-dlc-1-combat-librarian-research)
7. [DLC 2: Meditation & Lockdown](#7-dlc-2-meditation--lockdown)
8. [DLC 3: Quest Chains](#8-dlc-3-quest-chains)
9. [DLC 4: Analytics & Endgame](#9-dlc-4-analytics--endgame)
10. [Full Command Reference](#10-full-command-reference)
11. [Troubleshooting](#11-troubleshooting)

---

## <a id="1-installation--setup"></a>1. Installation & Setup

### **Manual Installation**
The Sisyphus Engine is a complex system composed of multiple sub-engines.

1. **Clone/Download:** Get the source code from the repository.
2. **Build:** Run `npm install` followed by `npm run build` to compile the TypeScript engines.
3. **Deploy:** Move the following files to `.obsidian/plugins/sisyphus-engine/`:
    - `main.js` (The compiled engine)
    - `styles.css` (Critical for the HUD/Panopticon)
    - `manifest.json`
4. **Activate:** Enable **Sisyphus Engine** in Obsidian's Community Plugins settings.
5. **Initialize:** Run the command `Open Panopticon` to boot the HUD.

---

## <a id="2-the-panopticon-interface"></a>2. The Panopticon (Interface)

**Source:** `view.ts`

The Panopticon is your persistent Heads-Up Display (HUD) in the right sidebar. It monitors active threats and vitals.

* **Vitals Grid:**
    * **HP:** Health Points. Reaches 0 = Permadeath.
    * **Gold:** Currency. Negative Gold (Debt) doubles all incoming damage.
    * **Rival Dmg:** The current punishment value for failure. Scales with Level.
* **The Oracle:** An algorithmic prediction of your survival (in days) based on current burn rate.
* **Status Lights:**
    * **LOCKDOWN:** Active if you take >50 damage in one day.
    * **REST DAY:** Active if you purchased a Rest Day permit.
    * **DEBT:** Active if Gold < 0.
* **Quick Capture:** Input field at the bottom. Type a task and press Enter. 
    * *Syntax:* `Task Name /1` (Difficulty 1) through `Task Name /5` (Difficulty 5).

---

## <a id="3-core-gameplay-loop"></a>3. Core Gameplay Loop

**Source:** `engine.ts`

You do not simply "add tasks." You **Deploy Quests**.

* **Deploying:** Quests have Difficulty (1-5) and Priority.
    * **Difficulty 1 (Trivial):** Low Risk, Low Reward.
    * **Difficulty 5 (SUICIDE):** High Risk, Massive Reward.
    * **High Stakes:** Toggleable. Doubles Gold reward but also doubles Damage on failure.
* **Execution:** Completion grants XP and Gold. Failure deals Damage (`Rival Dmg`).
* **Leveling:** Earning XP increases Level. Leveling up heals you but **increases Rival Damage**. The game gets harder the longer you survive.

### <a id="chaos--entropy"></a>Chaos & Entropy
Every day you log in, the Engine rolls a **Daily Modifier**:

| Modifier | Effect | Icon |
| :--- | :--- | :--- |
| **Clear Skies** | No effects. | ☀️ |
| **Flow State** | +50% XP gain. | 🌊 |
| **Windfall** | +50% Gold gain. | 💰 |
| **Inflation** | Shop prices 2x. | 📈 |
| **Brain Fog** | XP gain halved (0.5x). | 🌫️ |
| **Rival Sabotage** | Gold gain halved (0.5x). | 🕵️ |
| **Adrenaline** | 2x XP, but -5 HP per quest completed. | 💉 |

### <a id="daily-missions"></a>Daily Missions
3 random objectives are assigned daily. Completing them grants bonus resources.
* *Examples:* **Morning Win** (Complete trivial quest before 10AM), **Speed Demon** (Complete within 2h), **Survivor** (No damage taken).

---

## <a id="4-economy--the-black-market"></a>4. Economy & The Black Market

**Source:** `modals.ts`

Gold is survival. You earn it by completing quests. You spend it in the **Shop**.

| Item | Cost | Effect |
| :--- | :--- | :--- |
| **Stimpack** | 50g | Heals 20 HP. |
| **Sabotage** | 200g | Permanently lowers Rival Damage by 5. |
| **Shield** | 150g | Prevents damage for 24 hours. |
| **Rest Day** | 100g | Pauses "Rust" accumulation and prevents damage for 24 hours. |

**Debt Mechanics:** If you go into negative gold, the "Debt" status light triggers. While in debt, **all damage taken is doubled**.

---

## <a id="5-neural-hub-skill-tree"></a>5. Neural Hub (Skill Tree)

**Source:** `types.ts`

Sisyphus tracks your skills (e.g., "Coding", "Writing").

* **Leveling Nodes:** Assign skills to quests. Completing the quest grants XP to that specific node.
* **Synergy:** Assign a "Secondary Skill" to a quest to create a Neural Link.
* **Rust:** If a skill is not used for **3 days**, it gains "Rust".
    * *Effect:* XP requirement for the next level increases by 10% per stack.
    * *Fix:* Use the skill to clear Rust, or buy a manual polish in the skill menu.

---

## <a id="6-dlc-1-combat-librarian-research"></a>6. DLC 1: Combat Librarian (Research)

**Source:** `ResearchEngine.ts`

The Engine prevents you from writing unless you have "earned" it.

* **The Ratio:** You must complete **2 Combat Quests** (standard tasks) to unlock **1 Research Quest** (writing/study).
* **Word Count Jail:**
    * **Survey:** Target 200 words.
    * **Deep Dive:** Target 400 words.
* **Validation:**
    * **< 80%:** Cannot complete. (Too short).
    * **100% - 125%:** Optimal.
    * **> 125%:** **Gold Tax applied.** (You are rambling).

---

## <a id="7-dlc-2-meditation--lockdown"></a>7. DLC 2: Meditation & Lockdown

**Source:** `MeditationEngine.ts`

* **Lockdown:** If you take >50 Damage in a single day, the system triggers LOCKDOWN.
    * *Effect:* You cannot deploy new quests for 6 hours.
* **Active Recovery:** You can reduce lockdown time by performing **Meditation**.
    * *Command:* `Meditation: Start`.
    * *Mechanic:* Triggers a 432Hz audio tone. You must wait 30 seconds between cycles. Completing 10 cycles reduces lockdown by 5 hours.
* **Deletion Quota:** You have **3 Free Deletions** per day. The 4th deletion costs Gold.

---

## <a id="8-dlc-3-quest-chains"></a>8. DLC 3: Quest Chains

**Source:** `ChainsEngine.ts`

Create linear dependencies between tasks.

* **Builder:** Select multiple active quests to link them.
* **Locking:** You cannot complete step 2 before step 1.
* **Momentum:** Completing a full chain grants a massive XP bonus.
* **Breaking:** You can break a chain to access locked quests, but you forfeit the chain completion bonus.

---

## <a id="9-dlc-4-analytics--endgame"></a>9. DLC 4: Analytics & Endgame

**Source:** `AnalyticsEngine.ts`

* **Reports:** Generate Weekly Reports to see success rates, gold earned, and top skills.
* **Boss Milestones:** At Levels 10, 20, 30, 40, and 50, special Boss Quests appear automatically.
    * *Example:* **The Gatekeeper (Lvl 10)**.
    * These quests have high difficulty and cannot be deleted (they respawn).
* **Win Condition:** Defeating the Level 50 Boss ("Sisyphus Prime").

---

## <a id="10-full-command-reference"></a>10. Full Command Reference

Access these via the Command Palette (`Ctrl/Cmd + P`).

### **HUD & System**
| Command | Description |
| :--- | :--- |
| `Open Panopticon (Sidebar)` | Opens the main dashboard. |
| `Toggle Focus Noise` | Turns Brown Noise audio On/Off. |
| `ACCEPT DEATH` | **HARD RESET.** Wipes save data. Resets Lvl to 1. |
| `Reroll Chaos` | Debug: Forces a new Daily Modifier roll. |

### **Quest Management**
| Command | Description |
| :--- | :--- |
| `Research: Create Research Quest` | Start a writing task (Requires Combat Tokens). |
| `Research: View Research Library` | Manage active/completed research drafts. |
| `Chains: Create Quest Chain` | Open Builder to link active quests. |
| `Chains: View Active Chain` | Check progress of current chain. |

### **Recovery & Filters**
| Command | Description |
| :--- | :--- |
| `Meditation: Start` | Begin 432Hz recovery cycle (Lockdown only). |
| `Recover (Lockdown)` | Check remaining Lockdown timer. |
| `Filters: Show High/Medium/Low Energy` | Filter the Quest list by energy tag. |
| `Filters: Clear All Filters` | Reset view to show all quests. |

### **Analytics**
| Command | Description |
| :--- | :--- |
| `Analytics: Generate Weekly Report` | Show summary of the week's performance. |
| `Analytics: View Game Stats` | View current Streak, Total Quests, etc. |
| `Endgame: Check Boss Milestones` | Force check for Boss Spawns. |

---

## <a id="11-troubleshooting"></a>11. Troubleshooting

* **"I can't create quests."**
    * Check if the HUD says **LOCKDOWN**. If so, you must meditate or wait.
    * Check if you have negative Gold (Debt).
* **"The Audio isn't working."**
    * Obsidian sometimes blocks audio contexts until user interaction. Click anywhere inside the Panopticon HUD to initialize the audio engine.
* **"My Skill keeps rusting."**
    * Skills rust after 3 days of disuse. You must complete a quest linked to that skill to polish it.
* **"I can't delete a Boss Quest."**
    * This is intentional. Bosses (Level 10+) respawn if deleted. You must defeat them.

