// SISYPHUS TYPE DEFINITIONS
// DLC 2: Combat Librarian
//

export interface ActiveBuff {
    id: string;
    name: string;
    expiresAt: string; // ISO string
    icon: string;
    effect: {
        xpMult?: number;
        goldMult?: number;
        damageMult?: number;
    }
}

export interface QuestTemplate {
    name: string;
    diff: number;
    skill: string;
    deadline: string; // e.g. "10:00" or "+2h"
}

export interface Skill {
    name: string;
    level: number;
    xp: number;
    xpReq: number;
    lastUsed: string;
    rust: number;
    connections: string[];
}

export interface Modifier {
    name: string;
    desc: string;
    xpMult: number;
    goldMult: number;
    priceMult: number;
    icon: string;
}

export interface Relic {
    name: string;
    desc: string;
    effect: string;
}

export interface LegacyStats {
    souls: number;
    perks: {
        startGold: number;
        startSkillPoints: number;
        rivalDelay: number;
    };
    relics: Relic[];
    deathCount: number;
}

export interface DayLog {
    date: string;
    status: "success" | "fail" | "skip" | "rot";
    xpEarned: number;
}

export interface DailyMission {
    id: string;
    name: string;
    desc: string;
    checkFunc: string;
    progress: number;
    target: number;
    reward: { xp: number; gold: number };
    completed: boolean;
}

// DLC 2: Research Quest System
export interface ResearchQuest {
    id: string;
    title: string;
    type: "survey" | "deep_dive";
    linkedSkill: string;
    wordLimit: number;
    wordCount: number;
    linkedCombatQuest: string;
    createdAt: string;
    completed: boolean;
    completedAt?: string;
}

export interface ResearchStats {
    totalResearch: number;
    totalCombat: number;
    researchCompleted: number;
    combatCompleted: number;
}

// DLC 6: Analytics & Endgame
export interface DayMetrics {
    date: string;
    questsCompleted: number;
    questsFailed: number;
    xpEarned: number;
    goldEarned: number;
    damagesTaken: number;
    skillsLeveled: string[];
    chainsCompleted: number;
}

export interface WeeklyReport {
    week: number;
    startDate: string;
    endDate: string;
    totalQuests: number;
    successRate: number;
    totalXp: number;
    totalGold: number;
    topSkills: string[];
    bestDay: string;
    worstDay: string;
}

export interface BossMilestone {
    level: number;
    name: string;
    unlocked: boolean;
    defeated: boolean;
    defeatedAt?: string;
    xpReward: number;
}

export interface Streak {
    current: number;
    longest: number;
    lastDate: string;
}

export interface Achievement {
    id: string;
    name: string;
    description: string;
    unlocked: boolean;
    unlockedAt?: string;
    rarity: "common" | "rare" | "epic" | "legendary";
}

// DLC 5: Context Filters
export type EnergyLevel = "high" | "medium" | "low";
export type QuestContext = "home" | "office" | "anywhere";

export interface ContextFilter {
    energyLevel: EnergyLevel;
    context: QuestContext;
    tags: string[];
}

export interface FilterState {
    activeEnergy: EnergyLevel | "any";
    activeContext: QuestContext | "any";
    activeTags: string[];
}

// DLC 4: Quest Chains
export interface QuestChain {
    id: string;
    name: string;
    quests: string[];
    currentIndex: number;
    completed: boolean;
    startedAt: string;
    completedAt?: string;
    isBoss: boolean;
}

export interface QuestChainRecord {
    chainId: string;
    chainName: string;
    totalQuests: number;
    completedAt: string;
    xpEarned: number;
}

export interface SisyphusSettings {


  // [NEW] Templates
    questTemplates: QuestTemplate[];

  // [NEW] Gamification
    comboCount: number;
    lastCompletionTime: number; // Timestamp in milliseconds

  // [NEW] Active Power-Ups
    activeBuffs: ActiveBuff[];




    // Core stats
    hp: number;
    maxHp: number;
    xp: number;
    gold: number;
    xpReq: number;
    level: number;
    rivalDmg: number;
    
    // Timestamps & locks
    lastLogin: string;
    shieldedUntil: string;
    restDayUntil: string;
    lockdownUntil: string;
    damageTakenToday: number;
    
    // Skills & progression
    skills: Skill[];
    dailyModifier: Modifier;
    legacy: LegacyStats;
    history: DayLog[];
    runCount: number;
    muted: boolean;
    
    // DLC 1: Daily Missions
    dailyMissions: DailyMission[];
    dailyMissionDate: string;
    questsCompletedToday: number;
    skillUsesToday: Record<string, number>;
    
    // DLC 2: Research Quest System
    researchQuests: ResearchQuest[];
    researchStats: ResearchStats;
    lastResearchQuestId: number;
    
    // DLC 3: Meditation & Recovery
    meditationCyclesCompleted: number;
    questDeletionsToday: number;
    lastDeletionReset: string;
    isMeditating: boolean;
    meditationClicksThisLockdown: number;
    
    // DLC 4: Quest Chains
    activeChains: QuestChain[];
    chainHistory: QuestChainRecord[];
    currentChainId: string;
    chainQuestsCompleted: number;
    questFilters: Record<string, ContextFilter>;
    filterState: FilterState;
    
    // DLC 6: Analytics & Endgame
    dayMetrics: DayMetrics[];
    weeklyReports: WeeklyReport[];
    bossMilestones: BossMilestone[];
    streak: Streak;
    achievements: Achievement[];
    gameWon: boolean;
    endGameDate?: string;

    /** Scars: persistent across deaths (death count, best streak, bosses defeated, achievements) */
    scars: Scar[];

    /** Neural Hub canvas path (default: Active_Run/Neural_Hub.canvas) */
    neuralHubPath: string;
}

export interface Scar {
    id: string;
    label: string;
    value: string | number;
    earnedAt: string;
}
