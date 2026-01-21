import { Notice, Plugin, TFile, WorkspaceLeaf } from 'obsidian';
import { SisyphusSettings, Skill, Modifier, DailyMission } from './types';
import { SisyphusEngine, DEFAULT_MODIFIER } from './engine';
import { AudioController } from './utils';
import { ResearchQuestModal, ChainBuilderModal, ResearchListModal } from "./ui/modals";
import { PanopticonView, VIEW_TYPE_PANOPTICON } from "./ui/view";

const DEFAULT_SETTINGS: SisyphusSettings = {
    hp: 100, maxHp: 100, xp: 0, gold: 0, xpReq: 100, level: 1, rivalDmg: 10,
    lastLogin: "", shieldedUntil: "", restDayUntil: "", skills: [],
    dailyModifier: DEFAULT_MODIFIER, 
    legacy: { souls: 0, perks: { startGold: 0, startSkillPoints: 0, rivalDelay: 0 }, relics: [], deathCount: 0 }, 
    muted: false, history: [], runCount: 1, lockdownUntil: "", damageTakenToday: 0,
    dailyMissions: [], 
    dailyMissionDate: "", 
    questsCompletedToday: 0, 
    skillUsesToday: {},
    researchQuests: [],
    researchStats: { totalResearch: 0, totalCombat: 0, researchCompleted: 0, combatCompleted: 0 },
    lastResearchQuestId: 0,
    meditationCyclesCompleted: 0,
    questDeletionsToday: 0,
    lastDeletionReset: "",
    isMeditating: false,
    meditationClicksThisLockdown: 0,
    activeChains: [],
    chainHistory: [],
    currentChainId: "",
    chainQuestsCompleted: 0,
    questFilters: {},
    filterState: { activeEnergy: "any", activeContext: "any", activeTags: [] },
    dayMetrics: [],
    weeklyReports: [],
    bossMilestones: [],
    streak: { current: 0, longest: 0, lastDate: "" },
    achievements: [],
    gameWon: false
}

export default class SisyphusPlugin extends Plugin {
    settings: SisyphusSettings;
    statusBarItem: HTMLElement;
    engine: SisyphusEngine;
    audio: AudioController;

    async onload() {
        await this.loadSettings();
        
        this.loadStyles();
        this.audio = new AudioController(this.settings.muted);
        this.engine = new SisyphusEngine(this.app, this, this.audio);

        this.registerView(VIEW_TYPE_PANOPTICON, (leaf) => new PanopticonView(leaf, this));

        this.statusBarItem = this.addStatusBarItem();
        // [AUTO-FIX] Expose for debug
        (window as any).sisyphusEngine = this.engine;
        
        await this.engine.checkDailyLogin();
        this.updateStatusBar();

        this.addCommand({ id: 'open-panopticon', name: 'Open Panopticon (Sidebar)', callback: () => this.activateView() });
        this.addCommand({ id: 'toggle-focus', name: 'Toggle Focus Noise', callback: () => this.audio.toggleBrownNoise() });
        this.addCommand({ id: 'reroll-chaos', name: 'Reroll Chaos', callback: () => this.engine.rollChaos(true) });
        this.addCommand({ id: 'accept-death', name: 'ACCEPT DEATH', callback: () => this.engine.triggerDeath() });
        this.addCommand({ id: 'recover', name: 'Recover (Lockdown)', callback: () => this.engine.attemptRecovery() });
        this.addCommand({
            id: 'create-research',
            name: 'Research: Create Research Quest',
            callback: () => new ResearchQuestModal(this.app, this).open()
        });

        this.addCommand({
            id: 'view-research',
            name: 'Research: View Research Library',
            callback: () => new ResearchListModal(this.app, this).open()
        });

        this.addCommand({
            id: 'meditate',
            name: 'Meditation: Start Meditation',
            callback: () => this.engine.startMeditation()
        });

        this.addCommand({
            id: 'create-chain',
            name: 'Chains: Create Quest Chain',
            callback: () => {
                new ChainBuilderModal(this.app, this).open();
            }
        });

        this.addCommand({
            id: 'view-chains',
            name: 'Chains: View Active Chain',
            callback: () => {
                const chain = this.engine.getActiveChain();
                if (chain) {
                    new Notice(`Active Chain: ${chain.name} (${this.engine.getChainProgress().completed}/${chain.quests.length})`);
                } else {
                    new Notice("No active chain");
                }
            }
        });

        this.addCommand({
            id: 'filter-high-energy',
            name: 'Filters: Show High Energy Quests',
            callback: () => this.engine.setFilterState("high", "any", [])
        });

        this.addCommand({
            id: 'filter-medium-energy',
            name: 'Filters: Show Medium Energy Quests',
            callback: () => this.engine.setFilterState("medium", "any", [])
        });

        this.addCommand({
            id: 'filter-low-energy',
            name: 'Filters: Show Low Energy Quests',
            callback: () => this.engine.setFilterState("low", "any", [])
        });

        this.addCommand({
            id: 'clear-filters',
            name: 'Filters: Clear All Filters',
            callback: () => this.engine.clearFilters()
        });

        this.addCommand({
            id: 'weekly-report',
            name: 'Analytics: Generate Weekly Report',
            callback: () => {
                const report = this.engine.generateWeeklyReport();
                new Notice(`Week ${report.week}: ${report.totalQuests} quests, ${report.successRate}% success`);
            }
        });

        this.addCommand({
            id: 'game-stats',
            name: 'Analytics: View Game Stats',
            callback: () => {
                const stats = this.engine.getGameStats();
                new Notice(`Level: ${stats.level} | Streak: ${stats.currentStreak} | Quests: ${stats.totalQuests}`);
            }
        });

        this.addCommand({
            id: 'check-bosses',
            name: 'Endgame: Check Boss Milestones',
            callback: () => this.engine.checkBossMilestones()
        });

        this.addRibbonIcon('skull', 'Sisyphus Sidebar', () => this.activateView());
        this.registerInterval(window.setInterval(() => this.engine.checkDeadlines(), 60000));
        
        // [AUTO-FIX] Research Word Counter
        this.registerEvent(this.app.workspace.on('editor-change', (editor, info) => {
            if (!info || !info.file) return;
            const cache = this.app.metadataCache.getFileCache(info.file);
            if (cache?.frontmatter?.research_id) {
                const words = editor.getValue().trim().split(/\s+/).length;
                this.engine.updateResearchWordCount(cache.frontmatter.research_id, words);
            }
        }));
    }

    async loadStyles() {
        try {
            const cssFile = this.app.vault.getAbstractFileByPath(this.manifest.dir + "/styles.css");
            if (cssFile instanceof TFile) {
                const css = await this.app.vault.read(cssFile);
                const style = document.createElement("style");
                style.id = "sisyphus-styles";
                style.innerHTML = css;
                document.head.appendChild(style);
            }
        } catch (e) { console.error("Could not load styles.css", e); }
    }

    async onunload() {
        this.app.workspace.detachLeavesOfType(VIEW_TYPE_PANOPTICON);
        if(this.audio.audioCtx) this.audio.audioCtx.close();
        const style = document.getElementById("sisyphus-styles");
        if (style) style.remove();
    }

    async activateView() {
        const { workspace } = this.app;
        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_PANOPTICON);
        if (leaves.length > 0) {
            leaf = leaves[0];
        } else {
            leaf = workspace.getRightLeaf(false);
            await leaf.setViewState({ type: VIEW_TYPE_PANOPTICON, active: true });
        }
        workspace.revealLeaf(leaf);
    }

    refreshUI() {
        this.updateStatusBar();
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_PANOPTICON);
        if (leaves.length > 0) (leaves[0].view as PanopticonView).refresh();
    }

    updateStatusBar() {
        let shield = (this.engine.isShielded() || this.engine.isResting()) ? (this.engine.isResting() ? "D" : "S") : "";
        
        const completedMissions = this.settings.dailyMissions.filter(m => m.completed).length;
        const totalMissions = this.settings.dailyMissions.length;
        const missionProgress = totalMissions > 0 ? `M${completedMissions}/${totalMissions}` : "";
        
        const statusText = `${this.settings.dailyModifier.icon} ${shield} HP${this.settings.hp}/${this.settings.maxHp} G${this.settings.gold} Lvl${this.settings.level} ${missionProgress}`;
        this.statusBarItem.setText(statusText);
        
        if (this.settings.hp < 30) this.statusBarItem.style.color = "red"; 
        else if (this.settings.gold < 0) this.statusBarItem.style.color = "orange";
        else this.statusBarItem.style.color = "";
    }
    
    async loadSettings() { 
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        if (!this.settings.legacy) this.settings.legacy = { souls: 0, perks: { startGold: 0, startSkillPoints: 0, rivalDelay: 0 }, relics: [], deathCount: 0 };
        if (this.settings.legacy.deathCount === undefined) this.settings.legacy.deathCount = 0; 
        if (!this.settings.history) this.settings.history = [];
        
        if (!this.settings.dailyMissions) this.settings.dailyMissions = [];
        if (!this.settings.dailyMissionDate) this.settings.dailyMissionDate = "";
        if (this.settings.questsCompletedToday === undefined) this.settings.questsCompletedToday = 0;
        if (!this.settings.skillUsesToday) this.settings.skillUsesToday = {};
        if (!this.settings.researchQuests) this.settings.researchQuests = [];
        if (!this.settings.researchStats) this.settings.researchStats = { 
            totalResearch: 0, 
            totalCombat: 0, 
            researchCompleted: 0, 
            combatCompleted: 0 
        };
        if (this.settings.lastResearchQuestId === undefined) this.settings.lastResearchQuestId = 0;
        if (this.settings.meditationCyclesCompleted === undefined) this.settings.meditationCyclesCompleted = 0;
        if (this.settings.questDeletionsToday === undefined) this.settings.questDeletionsToday = 0;
        if (!this.settings.lastDeletionReset) this.settings.lastDeletionReset = "";
        if (this.settings.isMeditating === undefined) this.settings.isMeditating = false;
        if (this.settings.meditationClicksThisLockdown === undefined) this.settings.meditationClicksThisLockdown = 0;
        
        if (!this.settings.activeChains) this.settings.activeChains = [];
        if (!this.settings.chainHistory) this.settings.chainHistory = [];
        if (!this.settings.currentChainId) this.settings.currentChainId = "";
        if (this.settings.chainQuestsCompleted === undefined) this.settings.chainQuestsCompleted = 0;
        
        if (!this.settings.questFilters) this.settings.questFilters = {};
        if (!this.settings.filterState) this.settings.filterState = { activeEnergy: "any", activeContext: "any", activeTags: [] };
        
        if (!this.settings.dayMetrics) this.settings.dayMetrics = [];
        if (!this.settings.weeklyReports) this.settings.weeklyReports = [];
        if (!this.settings.bossMilestones) this.settings.bossMilestones = [];
        if (!this.settings.streak) this.settings.streak = { current: 0, longest: 0, lastDate: "" };
        if (!this.settings.achievements) this.settings.achievements = [];
        if (this.settings.gameWon === undefined) this.settings.gameWon = false;
        
        this.settings.skills = this.settings.skills.map(s => ({
            ...s,
            rust: (s as any).rust || 0,
            lastUsed: (s as any).lastUsed || new Date().toISOString(),
            connections: (s as any).connections || []
        }));
    }
    async saveSettings() { await this.saveData(this.settings); }
}
