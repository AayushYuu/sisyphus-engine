import { TFile } from 'obsidian';
import { SisyphusSettings, ContextFilter, FilterState, EnergyLevel, QuestContext, SortMode } from '../types';

/**
 * DLC 5: Context Filters Engine
 * Handles quest filtering by energy level, location context, and custom tags
 * 
 * ISOLATED: Only reads/writes to questFilters, filterState
 * DEPENDENCIES: SisyphusSettings types, TFile (for quest metadata)
 * NOTE: This is primarily a VIEW LAYER concern, but keeping logic isolated is good
 */
export class FiltersEngine {
    settings: SisyphusSettings;

    constructor(settings: SisyphusSettings) {
        this.settings = settings;
    }
    /**
       * Handle file rename events to preserve filters
       * @param oldName The previous basename
       * @param newName The new basename
       */
    handleRename(oldName: string, newName: string): void {
        const filterData = this.settings.questFilters[oldName];

        if (filterData) {
            // 1. Assign data to new key
            this.settings.questFilters[newName] = filterData;

            // 2. Delete old key
            delete this.settings.questFilters[oldName];

            console.log(`[Sisyphus] Transferred filters: ${oldName} -> ${newName}`);
        }
    }

    /**
     * Garbage Collection: Clean up filters for files that no longer exist
     * Call this sparingly (e.g., on plugin load)
     */
    cleanupOrphans(existingFileNames: string[]) {
        const keys = Object.keys(this.settings.questFilters);
        let deleted = 0;

        keys.forEach(key => {
            if (!existingFileNames.includes(key)) {
                delete this.settings.questFilters[key];
                deleted++;
            }
        });

        if (deleted > 0) {
            console.log(`[Sisyphus] Cleaned up ${deleted} orphaned filter entries.`);
        }
    }

    /**
     * Set filter for a specific quest
     */
    setQuestFilter(questName: string, energy: EnergyLevel, context: QuestContext, tags: string[]): void {
        this.settings.questFilters[questName] = {
            energyLevel: energy,
            context: context,
            tags: tags
        };
    }

    /**
     * Get filter for a specific quest
     */
    getQuestFilter(questName: string): ContextFilter | null {
        return this.settings.questFilters[questName] || null;
    }

    /**
     * Update the active filter state
     */
    setFilterState(energy: EnergyLevel | "any", context: QuestContext | "any", tags: string[]): void {
        this.settings.filterState.activeEnergy = energy as any;
        this.settings.filterState.activeContext = context as any;
        this.settings.filterState.activeTags = tags;
    }

    /**
     * Get current filter state
     */
    getFilterState(): FilterState {
        return this.settings.filterState;
    }

    /**
     * Check if a quest matches current filter state
     */
    questMatchesFilter(questName: string, frontmatter?: any): boolean {
        const filters = this.settings.filterState;
        const questFilter = this.settings.questFilters[questName];

        // Energy filter (requires questFilter)
        if (questFilter) {
            if (filters.activeEnergy !== "any" && questFilter.energyLevel !== filters.activeEnergy) {
                return false;
            }
            if (filters.activeContext !== "any" && questFilter.context !== filters.activeContext) {
                return false;
            }
            if (filters.activeTags.length > 0) {
                const hasTag = filters.activeTags.some((tag: string) => questFilter.tags.includes(tag));
                if (!hasTag) return false;
            }
        }

        // Difficulty filter (from frontmatter)
        if (frontmatter && filters.activeDifficulty !== "any") {
            const diff = frontmatter.diff || frontmatter.difficulty || 1;
            if (diff !== filters.activeDifficulty) return false;
        }

        // Skill filter (from frontmatter)
        if (frontmatter && filters.activeSkill !== "any") {
            const skill = frontmatter.skill || '';
            const secondary = frontmatter.secondarySkill || '';
            if (skill !== filters.activeSkill && secondary !== filters.activeSkill) return false;
        }

        return true;
    }

    /**
     * Filter a list of quests based on current filter state
     */
    filterQuests(quests: Array<{ basename?: string; name?: string }>): Array<{ basename?: string; name?: string }> {
        return quests.filter(quest => {
            const questName = quest.basename || quest.name;
            return this.questMatchesFilter(questName);
        });
    }

    /**
     * Get quests by specific energy level
     */
    getQuestsByEnergy(energy: EnergyLevel, quests: Array<{ basename?: string; name?: string }>): Array<{ basename?: string; name?: string }> {
        return quests.filter(q => {
            const questName = q.basename || q.name;
            const filter = this.settings.questFilters[questName];
            return filter && filter.energyLevel === energy;
        });
    }

    /**
     * Get quests by specific context
     */
    getQuestsByContext(context: QuestContext, quests: Array<{ basename?: string; name?: string }>): Array<{ basename?: string; name?: string }> {
        return quests.filter(q => {
            const questName = q.basename || q.name;
            const filter = this.settings.questFilters[questName];
            return filter && filter.context === context;
        });
    }

    /**
     * Get quests by specific tags
     */
    getQuestsByTags(tags: string[], quests: Array<{ basename?: string; name?: string }>): Array<{ basename?: string; name?: string }> {
        return quests.filter(q => {
            const questName = q.basename || q.name;
            const filter = this.settings.questFilters[questName];
            if (!filter) return false;
            return tags.some(tag => filter.tags.includes(tag));
        });
    }

    /**
     * Clear all active filters
     */
    clearFilters(): void {
        this.settings.filterState = {
            activeEnergy: "any",
            activeContext: "any",
            activeTags: [],
            activeDifficulty: "any",
            activeSkill: "any",
            sortMode: "deadline",
        };
    }

    toggleDifficultyFilter(diff: number | "any"): void {
        if (this.settings.filterState.activeDifficulty === diff) {
            this.settings.filterState.activeDifficulty = "any";
        } else {
            this.settings.filterState.activeDifficulty = diff;
        }
    }

    toggleSkillFilter(skill: string | "any"): void {
        if (this.settings.filterState.activeSkill === skill) {
            this.settings.filterState.activeSkill = "any";
        } else {
            this.settings.filterState.activeSkill = skill;
        }
    }

    setSortMode(mode: SortMode): void {
        this.settings.filterState.sortMode = mode;
    }

    getActiveFilterCount(): number {
        const f = this.settings.filterState;
        let count = 0;
        if (f.activeEnergy !== "any") count++;
        if (f.activeContext !== "any") count++;
        if (f.activeDifficulty !== "any") count++;
        if (f.activeSkill !== "any") count++;
        if (f.activeTags.length > 0) count++;
        return count;
    }

    /**
     * Get all unique tags used across all quests
     */
    getAvailableTags(): string[] {
        const tags = new Set<string>();

        for (const questName in this.settings.questFilters) {
            const filter = this.settings.questFilters[questName];
            (filter.tags || []).forEach((tag: string) => tags.add(tag));
        }

        return Array.from(tags).sort();
    }

    /**
     * Get summary stats about filtered state
     */
    getFilterStats(allQuests: Array<{ basename?: string; name?: string }>): {
        total: number;
        filtered: number;
        activeFiltersCount: number;
    } {
        const filtered = this.filterQuests(allQuests);
        const activeFiltersCount = (this.settings.filterState.activeEnergy !== "any" ? 1 : 0) +
            (this.settings.filterState.activeContext !== "any" ? 1 : 0) +
            (this.settings.filterState.activeTags.length > 0 ? 1 : 0);

        return {
            total: allQuests.length,
            filtered: filtered.length,
            activeFiltersCount: activeFiltersCount
        };
    }

    /**
     * Toggle a specific filter value
     * Useful for UI toggle buttons
     */
    toggleEnergyFilter(energy: EnergyLevel | "any"): void {
        if (this.settings.filterState.activeEnergy === energy) {
            this.settings.filterState.activeEnergy = "any";
        } else {
            this.settings.filterState.activeEnergy = energy as any;
        }
    }

    /**
     * Toggle context filter
     */
    toggleContextFilter(context: QuestContext | "any"): void {
        if (this.settings.filterState.activeContext === context) {
            this.settings.filterState.activeContext = "any";
        } else {
            this.settings.filterState.activeContext = context as any;
        }
    }

    /**
     * Toggle a tag in the active tag list
     */
    toggleTag(tag: string): void {
        const idx = this.settings.filterState.activeTags.indexOf(tag);
        if (idx >= 0) {
            this.settings.filterState.activeTags.splice(idx, 1);
        } else {
            this.settings.filterState.activeTags.push(tag);
        }
    }
}
