#!/usr/bin/env python3
"""
Update README.md with modularity expansion section
"""

from pathlib import Path

def main():
    readme = Path("README.md")
    
    if not readme.exists():
        print("❌ README.md not found")
        return False
    
    content = readme.read_text()
    
    # Check if already added
    if "## Architecture: Modular Engine Design" in content:
        print("⚠️  Modularity section already exists")
        return True
    
    # Add section before the last line
    modularity_section = '''
## Architecture: Modular Engine Design

### Refactoring Overview (v2.0)

The core `engine.ts` (800+ lines) has been refactored into **5 isolated, single-responsibility engines**:

#### New Engine Modules

**1. AnalyticsEngine** (`src/engines/AnalyticsEngine.ts`)
- Tracks daily metrics (quests completed/failed, XP earned, damage taken)
- Manages streak system (current & longest streaks)
- Handles boss milestones and defeat tracking
- Generates weekly performance reports
- Manages achievements and game stats
- **Isolated**: Only reads/writes to `dayMetrics`, `weeklyReports`, `bossMilestones`, `streak`, `achievements`

**2. MeditationEngine** (`src/engines/MeditationEngine.ts`)
- Lockdown state management (6-hour cooldown after 50+ damage)
- Meditation cycling (432 Hz healing frequency audio)
- Meditation cooldown (30 seconds between clicks, 10 clicks = 5-hour reduction)
- Quest deletion quota tracking (3 free deletions/day, 10g cost after)
- **Isolated**: Only reads/writes to `lockdownUntil`, `isMeditating`, `meditationClicksThisLockdown`, `questDeletionsToday`

**3. ResearchEngine** (`src/engines/ResearchEngine.ts`)
- Research quest creation (surveys: 100-200 words, deep dives: 200-400 words)
- Word count validation (80-125% of limit, penalties for overage)
- 2:1 combat-to-research ratio enforcement
- Research quest completion and deletion
- **Isolated**: Only reads/writes to `researchQuests`, `researchStats`
- **Note**: Word count tracking is manual (feature in development)

**4. ChainsEngine** (`src/engines/ChainsEngine.ts`)
- Multi-quest chain creation and sequencing
- Quest locking/unlocking within chains (only active quest completable)
- Chain progress tracking and completion bonuses (+100 XP)
- Break chain functionality (keeps earned XP)
- Chain history records
- **Isolated**: Only reads/writes to `activeChains`, `chainHistory`, `currentChainId`, `chainQuestsCompleted`

**5. FiltersEngine** (`src/engines/FiltersEngine.ts`)
- Quest filtering by energy level (high/medium/low)
- Quest filtering by context (home/office/anywhere)
- Custom tag-based filtering
- Filter state management and clearing
- **Isolated**: Only reads/writes to `questFilters`, `filterState`

### Benefits of Modular Architecture

✅ **Single Responsibility**: Each engine handles one domain
✅ **Testability**: Engines can be tested independently
✅ **Maintainability**: Bug fixes isolated to one file
✅ **Scalability**: Add new DLC systems as new engines
✅ **Readability**: ~300-400 lines per file vs 800+ in monolith
✅ **Reusability**: Engines can be ported to other frameworks

### How Engines Integrate

Engines are instantiated in `SisyphusEngine` constructor:
```typescript
this.analyticsEngine = new AnalyticsEngine(this.settings, this.audio);
this.meditationEngine = new MeditationEngine(this.settings, this.audio);
// ... etc
```

Core methods delegate to engines:
```typescript
async completeQuest(file: TFile) {
    this.analyticsEngine.trackDailyMetrics("quest_complete", 1);
    this.researchStats.totalCombat++;
    // ... rest of logic
}

async failQuest(file: TFile) {
    if (this.settings.damageTakenToday > 50) {
        this.meditationEngine.triggerLockdown();
    }
    // ... rest of logic
}
```

### Known Limitations

⚠️ **Research Quest File Generation**: Currently, research quests are metadata-only. Word count tracking is manual. Future update will auto-generate note files and track word count automatically.

### Future Expansion

The modular architecture makes it easy to add new systems:
- **SkillsEngine**: Extract skill rust/leveling logic
- **DailyMissionsEngine**: Extract DLC 1 mission system
- **VaultEngine**: Centralize all file I/O with error handling

---
'''
    
    # Find where to insert (before the last section or at end before closing)
    insert_pos = content.rfind("## Troubleshooting")
    if insert_pos == -1:
        # If no troubleshooting section, add before end
        content = content.rstrip() + modularity_section
    else:
        # Insert before troubleshooting
        content = content[:insert_pos] + modularity_section + "\n" + content[insert_pos:]
    
    readme.write_text(content)
    print("✅ README.md updated with modularity section!")
    print("   - Added Architecture overview")
    print("   - Documented 5 new engines")
    print("   - Explained integration & benefits")
    print("   - Listed known limitations")
    
    return True

if __name__ == "__main__":
    main()
