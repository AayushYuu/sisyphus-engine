import { Achievement } from './types';

export const ACHIEVEMENT_DEFINITIONS: Omit<Achievement, "unlocked" | "unlockedAt">[] = [
    // ─── COMMON (easy milestones) ───
    { id: "first_blood", name: "First Blood", description: "Complete your first quest.", rarity: "common" },
    { id: "week_warrior", name: "Week Warrior", description: "Maintain a 7-day streak.", rarity: "common" },
    { id: "warm_up", name: "Warm Up", description: "Complete 10 total quests.", rarity: "common" },
    { id: "night_owl", name: "Night Owl", description: "Complete a quest after 10 PM.", rarity: "common" },
    { id: "early_bird", name: "Early Bird", description: "Complete a quest before 7 AM.", rarity: "common" },
    { id: "triple_threat", name: "Triple Threat", description: "Complete 3 quests in a single day.", rarity: "common" },

    // ─── RARE (mid-game) ───
    { id: "skill_adept", name: "Apprentice", description: "Reach Level 5 in any skill.", rarity: "rare" },
    { id: "chain_gang", name: "Chain Gang", description: "Complete a Quest Chain.", rarity: "rare" },
    { id: "researcher", name: "Scholar", description: "Complete 5 Research Quests.", rarity: "rare" },
    { id: "rich", name: "Capitalist", description: "Hold 500 gold at once.", rarity: "rare" },
    { id: "combo_king", name: "Combo King", description: "Reach a x5 combo.", rarity: "rare" },
    { id: "speed_demon", name: "Speed Demon", description: "Complete 5+ quests in one day.", rarity: "rare" },
    { id: "perfectionist", name: "Perfectionist", description: "7 consecutive days with 0 failures.", rarity: "rare" },
    { id: "iron_streak", name: "Iron Streak", description: "Maintain a 14-day streak.", rarity: "rare" },

    // ─── EPIC (late-game) ───
    { id: "boss_slayer", name: "Giant Slayer", description: "Defeat your first Boss.", rarity: "epic" },
    { id: "skill_master", name: "Skill Master", description: "Reach Level 10 in any skill.", rarity: "epic" },
    { id: "century", name: "Centurion", description: "Complete 100 total quests.", rarity: "epic" },
    { id: "phoenix", name: "Phoenix", description: "Die and reach Level 10 again.", rarity: "epic" },
    { id: "research_professor", name: "Professor", description: "Complete 20 Research Quests.", rarity: "epic" },
    { id: "gold_hoarder", name: "Gold Hoarder", description: "Hold 2000 gold at once.", rarity: "epic" },

    // ─── LEGENDARY (endgame) ───
    { id: "ascended", name: "Sisyphus Happy", description: "Reach Level 50.", rarity: "legendary" },
    { id: "immortal", name: "Immortal", description: "Reach Level 20 with 0 Deaths.", rarity: "legendary" },
    { id: "completionist", name: "Completionist", description: "Unlock all other achievements.", rarity: "legendary" },
    { id: "marathon", name: "Marathon", description: "Maintain a 30-day streak.", rarity: "legendary" },
    { id: "grand_master", name: "Grand Master", description: "Have 5 skills at Level 10+.", rarity: "legendary" },
];
