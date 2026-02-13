import { Notice, Plugin, TFile, WorkspaceLeaf, debounce } from 'obsidian';
import { SisyphusSettings } from './types';
import { showToast, floatReward } from './ui/effects';
import { SisyphusEngine, DEFAULT_MODIFIER } from './engine';
import { AudioController } from './utils';
import { PanopticonView, VIEW_TYPE_PANOPTICON } from "./ui/view";
import { SisyphusSettingTab } from './settings';
import { ResearchQuestModal, ChainBuilderModal, ResearchListModal, QuickCaptureModal, QuestTemplateModal, QuestModal, ScarsModal } from "./ui/modals";
import { SisyphusKernel } from './core/Kernel';
import { GlobalConfig, StateManager } from './core/StateManager';
import { AchievementEngine } from './engines/AchievementEngine';
import { RivalEngine } from './engines/RivalEngine';
import { ProfileModal } from './ui/profile';
import { ProgressionModule } from './modules/progression/ProgressionModule';
import { EconomyModule } from './modules/economy/EconomyModule';
import { SurvivalModule } from './modules/survival/SurvivalModule';
import { CombatModule } from './modules/combat/CombatModule';
import { ProductivityModule } from './modules/productivity/ProductivityModule';
import { AnalyticsModule } from './modules/analytics/AnalyticsModule';
import { RecoveryModule } from './modules/recovery/RecoveryModule';
import { DailyLifecycleModule } from './modules/recovery/DailyLifecycleModule';
import { PomodoroTimer } from './engines/PomodoroTimer';
import { WeeklyReviewModal, BossEncounterModal } from './ui/review';

const DEFAULT_SETTINGS: SisyphusSettings = {
    // [NEW] Default Templates
    questTemplates: [
        { name: "Morning Routine", diff: 1, skill: "Discipline", deadline: "10:00" },
        { name: "Deep Work Block", diff: 3, skill: "Focus", deadline: "+2h" },
        { name: "Quick Exercise", diff: 2, skill: "Health", deadline: "+12h" }
    ], // Comma here, NO closing brace yet!
    // [NEW] Defaults
    comboCount: 0,
    lastCompletionTime: 0,
    // [NEW]
    activeBuffs: [],

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
    gameWon: false,
    scars: [],
    neuralHubPath: "Active_Run/Neural_Hub.canvas",
    rival: { name: '', avatar: '', personality: 'aggressive' as any, level: 1, xp: 0, xpReq: 100, damageDealt: 0, lastTaunt: '', lastTauntTime: '' },
}

export default class SisyphusPlugin extends Plugin {
    settings: SisyphusSettings;
    config: GlobalConfig;
    statusBarItem: HTMLElement;
    engine: SisyphusEngine;
    kernel: SisyphusKernel;
    audio: AudioController;
    pomodoro: PomodoroTimer;

    async onload() {
        // --- EVENT LISTENER: FILE RENAME ---
        this.registerEvent(this.app.vault.on('rename', (file, oldPath) => {
            if (!this.engine) return;
            if (file instanceof TFile && file.extension === 'md') {
                const newName = file.basename;

                // Extract old basename from the old path
                // oldPath looks like "Active_Run/Quests/OldName.md"
                const pathParts = oldPath.split('/');
                const oldFileName = pathParts[pathParts.length - 1];
                const oldName = oldFileName.replace(/\.md$/, ''); // Remove extension

                if (oldName !== newName) {
                    // Propagate rename to engines
                    this.engine.chainsEngine.handleRename(oldName, newName);
                    this.engine.filtersEngine.handleRename(oldName, newName);

                    // Force save to persist changes
                    this.engine.save();
                }
            }
        }));

        await this.loadSettings();

        this.loadStyles();
        this.audio = new AudioController(this.config.muteAudio);
        this.pomodoro = new PomodoroTimer(this.audio);
        this.engine = new SisyphusEngine(this.app, this, this.audio);
        this.kernel = new SisyphusKernel({
            config: this.config,
            state: this.settings,
            save: async (config, state) => {
                await this.saveData({ config, state });
            },
            services: {
                app: this.app,
                engine: this.engine,
                audio: this.audio,
                plugin: this
            }
        });
        this.kernel.registerModule(new SurvivalModule());
        this.kernel.registerModule(new ProgressionModule());
        this.kernel.registerModule(new EconomyModule());
        this.kernel.registerModule(new CombatModule());
        this.kernel.registerModule(new ProductivityModule());
        this.kernel.registerModule(new AnalyticsModule());
        this.kernel.registerModule(new RecoveryModule());
        this.kernel.registerModule(new DailyLifecycleModule());
        this.kernel.enableConfiguredModules();

        this.registerView(VIEW_TYPE_PANOPTICON, (leaf) => new PanopticonView(leaf, this));

        this.statusBarItem = this.addStatusBarItem();
        (window as any).sisyphusEngine = this.engine;

        await this.engine.checkDailyLogin();
        this.updateStatusBar();

        // --- REWARD VISUAL EFFECTS via KERNEL EVENTS ---
        this.kernel.events.on('reward:granted', (data: { xp: number; gold: number; reason: string }) => {
            if (data.xp > 0) floatReward(`+${data.xp} XP`, 'xp');
            if (data.gold > 0) floatReward(`+${data.gold} G`, 'gold');
        });
        this.kernel.events.on('quest:completed', (data: { questId: string; xpReward: number; goldReward: number }) => {
            showToast({ icon: '⚔️', title: 'Quest Complete!', message: `${data.questId} — +${data.xpReward}XP, +${data.goldReward}G`, variant: 'success' });
            // Achievement check
            AchievementEngine.checkAll(this.settings);
            // Rival reacts to player success
            if (this.settings.rival?.name) {
                RivalEngine.showTaunt(this.settings, 'quest_complete');
            }
            // Track hourly completion
            this.trackHourlyCompletion();
        });
        this.kernel.events.on('quest:failed', (data: { questId: string; damage: number }) => {
            if (data.damage > 0) floatReward(`-${data.damage} HP`, 'damage');
            // Rival gains XP on player failure
            if (this.settings.rival?.name) {
                RivalEngine.rivalGainXP(this.settings, 15);
                RivalEngine.showTaunt(this.settings, 'fail');
            }
            // HP critical vignette
            if (this.settings.hp <= 20) this.showHPVignette();
        });


        // --- COMMANDS ---
        this.addCommand({ id: 'open-panopticon', name: 'Open Panopticon', callback: () => this.activateView() });
        this.addCommand({ id: 'toggle-focus', name: 'Toggle Focus Audio', callback: () => this.audio.toggleBrownNoise() });
        this.addCommand({
            id: 'pomodoro-start', name: 'Pomodoro: Start/Pause', callback: () => {
                if (this.pomodoro.isRunning()) this.pomodoro.pause();
                else this.pomodoro.start();
            }
        });
        this.addCommand({ id: 'pomodoro-reset', name: 'Pomodoro: Reset', callback: () => this.pomodoro.reset() });
        this.addCommand({ id: 'weekly-review', name: 'Weekly Review', hotkeys: [{ modifiers: ["Mod", "Shift"], key: "w" }], callback: () => new WeeklyReviewModal(this.app, this).open() });
        this.addCommand({ id: 'create-research', name: 'Research: Create Quest', callback: () => new ResearchQuestModal(this.app, this).open() });
        this.addCommand({ id: 'view-research', name: 'Research: View Library', callback: () => new ResearchListModal(this.app, this).open() });
        this.addCommand({ id: 'meditate', name: 'Meditation: Start', callback: () => this.engine.startMeditation() });
        this.addCommand({ id: 'create-chain', name: 'Chains: Create', callback: () => new ChainBuilderModal(this.app, this).open() });
        this.addCommand({ id: 'view-chains', name: 'Chains: View Active', callback: () => { const c = this.engine.getActiveChain(); new Notice(c ? `Active: ${c.name}` : "No active chain"); } });
        this.addCommand({ id: 'filter-high', name: 'Filters: High Energy', callback: () => this.engine.setFilterState("high", "any", []) });
        this.addCommand({ id: 'clear-filters', name: 'Filters: Clear', callback: () => this.engine.clearFilters() });
        this.addCommand({ id: 'game-stats', name: 'Analytics: Stats', callback: () => { const s = this.engine.getGameStats(); new Notice(`Lvl ${s.level} | Streak ${s.currentStreak}`); } });
        this.addCommand({ id: 'scars', name: 'Scars: View', callback: () => new ScarsModal(this.app, this).open() });
        this.addCommand({
            id: 'character-profile',
            name: 'Character Profile',
            hotkeys: [{ modifiers: ["Mod", "Shift"], key: "p" }],
            callback: () => new ProfileModal(this.app, this).open()
        });

        this.addCommand({
            id: 'quest-templates',
            name: 'Deploy Quest from Template',
            callback: () => new QuestTemplateModal(this.app, this).open()
        });
        this.addCommand({
            id: 'deploy-quest-hotkey',
            name: 'Deploy Quest',
            hotkeys: [{ modifiers: ["Mod"], key: "d" }],
            callback: () => new QuestModal(this.app, this).open()
        });
        this.addCommand({
            id: 'undo-quest-delete',
            name: 'Undo Last Quest Deletion',
            hotkeys: [{ modifiers: ["Mod", "Shift"], key: "z" }],
            callback: () => this.engine.undoLastDeletion()
        });
        this.addCommand({
            id: 'complete-top-quest',
            name: 'Complete Top Quest',
            hotkeys: [{ modifiers: ["Mod", "Shift"], key: "c" }],
            callback: async () => {
                const folder = this.app.vault.getAbstractFileByPath("Active_Run/Quests");
                if (folder instanceof TFile) { new Notice('No active quests.'); return; }
                const files = (folder as any)?.children?.filter((f: any) => f instanceof TFile && f.extension === 'md') ?? [];
                if (files.length > 0) {
                    await this.engine.completeQuest(files[0]);
                    this.engine.trigger('update');
                } else {
                    new Notice('No active quests to complete.');
                }
            }
        });
        this.addCommand({
            id: 'start-meditation-hotkey',
            name: 'Start Meditation',
            hotkeys: [{ modifiers: ["Mod", "Shift"], key: "m" }],
            callback: () => this.engine.startMeditation()
        });
        this.addCommand({
            id: 'quick-capture-hotkey',
            name: 'Quick Capture',
            hotkeys: [{ modifiers: ["Mod", "Shift"], key: "x" }],
            callback: () => new QuickCaptureModal(this.app, this).open()
        });
        this.addCommand({
            id: 'export-stats',
            name: 'Analytics: Export Stats JSON',
            callback: async () => {
                const stats = this.engine.getGameStats();
                const path = `Sisyphus_Stats_${Date.now()}.json`;
                await this.app.vault.create(path, JSON.stringify(stats, null, 2));
                new Notice(`Stats exported to ${path}`);
            }
        });
        this.addCommand({
            id: 'accept-death',
            name: 'ACCEPT DEATH (Reset Run)',
            callback: () => this.engine.triggerDeath()
        });
        this.addCommand({
            id: 'reroll-chaos',
            name: 'Reroll Chaos',
            callback: () => this.engine.rollChaos(true)
        });
        this.addCommand({
            id: 'quick-capture',
            name: 'Quick Capture (Scrap)',
            callback: () => new QuickCaptureModal(this.app, this).open()
        });
        this.addCommand({
            id: 'generate-skill-graph',
            name: 'Neural Hub: Generate Skill Graph',
            callback: () => this.engine.generateSkillGraph()
        });

        this.addRibbonIcon('skull', 'Sisyphus Sidebar', () => this.activateView());
        // ... previous code ...

        // --- SETTINGS TAB ---
        this.addSettingTab(new SisyphusSettingTab(this.app, this));

        this.registerInterval(window.setInterval(() => {
            if (this.kernel) this.kernel.events.emit('clock:tick', { now: new Date().toISOString() });
            void this.engine.checkDeadlines();
        }, 60000));


        // [FIX] Debounced Word Counter (Typewriter Fix)
        const debouncedUpdate = debounce((file: TFile, content: string) => {
            // 1. Check if file still exists to prevent race condition errors
            if (!file || !file.path) return;
            const exists = this.app.vault.getAbstractFileByPath(file.path);
            if (!exists) return;

            const cache = this.app.metadataCache.getFileCache(file);
            if (cache?.frontmatter?.research_id) {
                const words = content.trim().split(/\s+/).length;
                this.engine.updateResearchWordCount(cache.frontmatter.research_id, words);
            }
        }, 1000, true);

        // Register the event listener to actually USE the debounce function
        this.registerEvent(this.app.workspace.on('editor-change', (editor, info) => {
            if (info && info.file) {
                debouncedUpdate(info.file, editor.getValue());
            }
        }));
    } // <--- THIS BRACE WAS MISSING

    async loadStyles() {
        try {
            const dir = (this.manifest && (this.manifest as { dir?: string }).dir) || "";
            const path = dir ? `${dir}/styles.css` : "styles.css";
            const cssFile = this.app.vault.getAbstractFileByPath(path);
            if (cssFile instanceof TFile) {
                const css = await this.app.vault.read(cssFile);
                const style = document.createElement("style");
                style.id = "sisyphus-styles";
                style.innerHTML = css;
                document.head.appendChild(style);
            }
        } catch (e) { console.error("Could not load styles.css", e); }
    }

    onunload() {
        this.app.workspace.detachLeavesOfType(VIEW_TYPE_PANOPTICON);
        if (this.kernel) this.kernel.shutdown();
        if (this.audio?.audioCtx) {
            this.audio.audioCtx.close().catch(() => { });
        }
        const style = document.getElementById("sisyphus-styles");
        if (style) style.remove();
    }

    async activateView() {
        const { workspace } = this.app;
        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_PANOPTICON);
        if (leaves.length > 0) leaf = leaves[0];
        else { leaf = workspace.getRightLeaf(false); await leaf.setViewState({ type: VIEW_TYPE_PANOPTICON, active: true }); }
        workspace.revealLeaf(leaf);
    }

    updateStatusBar() {
        const s = this.settings;
        const shield = (this.engine.isShielded() || this.engine.isResting()) ? (this.engine.isResting() ? '💤' : '🛡️') : '';
        const mCount = s.dailyMissions.filter(m => m.completed).length;
        const combo = s.comboCount > 1 ? ` 🔥x${s.comboCount}` : '';
        const streak = s.streak?.current > 0 ? ` ⚡${s.streak.current}` : '';

        const hpPct = Math.round((s.hp / s.maxHp) * 100);
        const hpColor = hpPct < 30 ? 'var(--sisy-red)' : hpPct < 60 ? 'var(--sisy-gold)' : 'var(--sisy-green)';

        this.statusBarItem.empty();
        this.statusBarItem.style.display = 'flex';
        this.statusBarItem.style.alignItems = 'center';
        this.statusBarItem.style.gap = '6px';
        this.statusBarItem.style.fontSize = '0.85em';

        // Shield/Rest indicator
        if (shield) {
            const shieldEl = this.statusBarItem.createSpan({ text: shield });
            shieldEl.style.fontSize = '1.1em';
        }

        // HP with inline mini bar
        const hpWrap = this.statusBarItem.createSpan();
        hpWrap.style.display = 'flex';
        hpWrap.style.alignItems = 'center';
        hpWrap.style.gap = '3px';
        hpWrap.createSpan({ text: '♥' }).style.color = hpColor;
        const hpBar = hpWrap.createSpan();
        hpBar.style.width = '30px';
        hpBar.style.height = '4px';
        hpBar.style.background = 'var(--background-modifier-border)';
        hpBar.style.borderRadius = '2px';
        hpBar.style.overflow = 'hidden';
        hpBar.style.display = 'inline-block';
        const hpFill = hpBar.createSpan();
        hpFill.style.display = 'block';
        hpFill.style.height = '100%';
        hpFill.style.width = `${hpPct}%`;
        hpFill.style.background = hpColor;
        hpFill.style.borderRadius = '2px';
        hpWrap.createSpan({ text: `${s.hp}` }).style.fontFamily = 'var(--font-monospace)';

        // Level
        const lvl = this.statusBarItem.createSpan({ text: `Lv${s.level}` });
        lvl.style.color = 'var(--sisy-purple)';
        lvl.style.fontWeight = '700';

        // Gold
        const gold = this.statusBarItem.createSpan({ text: `💰${s.gold}` });
        gold.style.color = s.gold < 0 ? 'var(--sisy-red)' : 'var(--sisy-gold)';

        // Missions
        this.statusBarItem.createSpan({ text: `📋${mCount}/3` });

        // Streak + combo
        if (streak || combo) {
            this.statusBarItem.createSpan({ text: `${streak}${combo}` });
        }

        // Chaos modifier icon
        this.statusBarItem.createSpan({ text: s.dailyModifier.icon });
    }

    async loadSettings() {
        const stateManager = new StateManager(DEFAULT_SETTINGS);
        const migration = stateManager.migrate(await this.loadData());
        this.config = migration.config;
        this.settings = migration.state;

        if (migration.migrated) {
            await this.saveData(stateManager.toPersistedState(this.config, this.settings));
        }
    }

    async saveSettings() {
        const stateManager = new StateManager(DEFAULT_SETTINGS);
        this.config.muteAudio = this.settings.muted;
        await this.saveData(stateManager.toPersistedState(this.config, this.settings));
    }

    /** Track quest completion hour for time-of-day analytics */
    trackHourlyCompletion() {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        let metric = this.settings.dayMetrics.find((d: any) => d.date === todayStr);
        if (metric) {
            if (!metric.hourlyCompletions) metric.hourlyCompletions = new Array(24).fill(0);
            metric.hourlyCompletions[now.getHours()]++;
        }
    }

    /** Show red vignette overlay when HP is critically low */
    showHPVignette() {
        const existing = document.querySelector('.sisy-hp-critical-vignette');
        if (existing) return; // Already showing
        const el = document.createElement('div');
        el.className = 'sisy-hp-critical-vignette';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 6000);
    }
}
