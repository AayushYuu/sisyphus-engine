import { App, TFile, TFolder, Notice, moment } from 'obsidian';
import { SisyphusSettings, Skill, Modifier, DailyMission } from './types';
import { AudioController, TinyEmitter } from './utils';
import { ChaosModal } from './ui/modals';
import { BossEncounterModal } from './ui/review';
import { AnalyticsEngine } from './engines/AnalyticsEngine';
import { MeditationEngine } from './engines/MeditationEngine';
import { ResearchEngine } from './engines/ResearchEngine';
import { ChainsEngine } from './engines/ChainsEngine';
import { FiltersEngine } from './engines/FiltersEngine';
import {
    BOSS_DATA,
    getDifficultyNumber as getDifficultyNum,
    questRewardsByDifficulty,
    computeFailDamage,
    getBossHpPenalty,
} from './mechanics';

export const DEFAULT_MODIFIER: Modifier = { name: "Clear Skies", desc: "No effects.", xpMult: 1, goldMult: 1, priceMult: 1, icon: "☀️" };
export const CHAOS_TABLE: Modifier[] = [
    { name: "Clear Skies", desc: "Normal.", xpMult: 1, goldMult: 1, priceMult: 1, icon: "☀️" },
    { name: "Flow State", desc: "+50% XP.", xpMult: 1.5, goldMult: 1, priceMult: 1, icon: "🌊" },
    { name: "Windfall", desc: "+50% Gold.", xpMult: 1, goldMult: 1.5, priceMult: 1, icon: "💰" },
    { name: "Inflation", desc: "Prices 2x.", xpMult: 1, goldMult: 1, priceMult: 2, icon: "📈" },
    { name: "Brain Fog", desc: "XP 0.5x.", xpMult: 0.5, goldMult: 1, priceMult: 1, icon: "🌫️" },
    { name: "Rival Sabotage", desc: "Gold 0.5x.", xpMult: 1, goldMult: 0.5, priceMult: 1, icon: "🕵️" },
    { name: "Adrenaline", desc: "2x XP, -5 HP/Q.", xpMult: 2, goldMult: 1, priceMult: 1, icon: "💉" }
];
export const POWER_UPS = [
    { id: "focus_potion", name: "Focus Potion", icon: "🧪", desc: "2x XP (1h)", cost: 100, duration: 60, effect: { xpMult: 2 } },
    { id: "midas_touch", name: "Midas Touch", icon: "✨", desc: "3x Gold (30m)", cost: 150, duration: 30, effect: { goldMult: 3 } },
    { id: "iron_will", name: "Iron Will", icon: "🛡️", desc: "50% Dmg Reduct (2h)", cost: 200, duration: 120, effect: { damageMult: 0.5 } }
];

const MISSION_POOL = [
    { id: "morning_win", name: "☀️ Morning Win", desc: "Complete 1 Trivial quest before 10 AM", target: 1, reward: { xp: 0, gold: 15 }, check: "morning_trivial" },
    { id: "momentum", name: "🔥 Momentum", desc: "Complete 3 quests today", target: 3, reward: { xp: 20, gold: 0 }, check: "quest_count" },
    { id: "zero_inbox", name: "🧘 Zero Inbox", desc: "Process all files in 'Scraps'", target: 1, reward: { xp: 0, gold: 10 }, check: "zero_inbox" },
    { id: "specialist", name: "🎯 Specialist", desc: "Use the same skill 3 times", target: 3, reward: { xp: 15, gold: 0 }, check: "skill_repeat" },
    { id: "high_stakes", name: "💪 High Stakes", desc: "Complete 1 High Stakes quest", target: 1, reward: { xp: 0, gold: 30 }, check: "high_stakes" },
    { id: "speed_demon", name: "⚡ Speed Demon", desc: "Complete quest within 2h of creation", target: 1, reward: { xp: 25, gold: 0 }, check: "fast_complete" },
    { id: "synergist", name: "🔗 Synergist", desc: "Complete quest with Primary + Secondary skill", target: 1, reward: { xp: 0, gold: 10 }, check: "synergy" },
    { id: "survivor", name: "🛡️ Survivor", desc: "Don't take any damage today", target: 1, reward: { xp: 0, gold: 20 }, check: "no_damage" },
    { id: "risk_taker", name: "🎲 Risk Taker", desc: "Complete Difficulty 4+ quest", target: 1, reward: { xp: 15, gold: 0 }, check: "hard_quest" }
];

export class SisyphusEngine extends TinyEmitter {
    app: App;
    plugin: any;
    audio: AudioController;
    analyticsEngine: AnalyticsEngine;
    meditationEngine: MeditationEngine;
    researchEngine: ResearchEngine;
    chainsEngine: ChainsEngine;
    filtersEngine: FiltersEngine;

    // [FEATURE] Undo Buffer
    private deletedQuestBuffer: Array<{ name: string; content: string; path: string; deletedAt: number }> = [];

    constructor(app: App, plugin: any, audio: AudioController) {
        super();
        this.app = app;
        this.plugin = plugin;
        this.audio = audio;

        this.analyticsEngine = new AnalyticsEngine(this.plugin.settings, this.audio);
        this.meditationEngine = new MeditationEngine(this.plugin.settings, this.audio);
        this.researchEngine = new ResearchEngine(this.plugin.settings, this.app, this.audio);
        this.chainsEngine = new ChainsEngine(this.plugin.settings, this.audio);
        this.filtersEngine = new FiltersEngine(this.plugin.settings);
    }

    get settings(): SisyphusSettings { return this.plugin.settings; }
    set settings(val: SisyphusSettings) { this.plugin.settings = val; }

    async save() { await this.plugin.saveSettings(); this.trigger("update"); }

    /** Same sanitization as createQuest; use for lookup. */
    private toSafeQuestName(name: string): string {
        return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    }

    // [FIX] Safe Archiver: Handles duplicates by renaming (Quest -> Quest (1))
    async safeArchive(file: TFile, subfolder: string = "Archive") {
        const root = "Active_Run";
        const targetFolder = `${root}/${subfolder}`;

        if (!this.app.vault.getAbstractFileByPath(root)) await this.app.vault.createFolder(root);
        if (!this.app.vault.getAbstractFileByPath(targetFolder)) await this.app.vault.createFolder(targetFolder);

        let targetPath = `${targetFolder}/${file.name}`;

        // Collision Detection Loop
        let counter = 1;
        while (this.app.vault.getAbstractFileByPath(targetPath)) {
            targetPath = `${targetFolder}/${file.basename} (${counter}).${file.extension}`;
            counter++;
        }

        await this.app.fileManager.renameFile(file, targetPath);
    }

    activateBuff(item: any) {
        const expires = moment().add(item.duration, 'minutes').toISOString();
        this.settings.activeBuffs.push({
            id: item.id,
            name: item.name,
            icon: item.icon,
            expiresAt: expires,
            effect: item.effect
        });
        new Notice(`🥤 Gulp! ${item.name} active for ${item.duration}m`);
    }

    rollDailyMissions() {
        const available = [...MISSION_POOL];
        const selected: DailyMission[] = [];
        for (let i = 0; i < 3; i++) {
            if (available.length === 0) break;
            const idx = Math.floor(Math.random() * available.length);
            const mission = available.splice(idx, 1)[0];
            selected.push({ ...mission, checkFunc: mission.check, progress: 0, completed: false });
        }
        this.settings.dailyMissions = selected;
        this.settings.dailyMissionDate = moment().format("YYYY-MM-DD");
        this.settings.questsCompletedToday = 0;
        this.settings.skillUsesToday = {};
    }

    checkDailyMissions(context: { type?: string; difficulty?: number; skill?: string; secondarySkill?: string; highStakes?: boolean; questCreated?: number }) {
        const now = moment();
        let justFinishedAll = false;

        this.settings.dailyMissions.forEach(mission => {
            if (mission.completed) return;
            switch (mission.checkFunc) {
                case "zero_inbox":
                    const scraps = this.app.vault.getAbstractFileByPath("Scraps");
                    if (scraps instanceof TFolder) {
                        mission.progress = scraps.children.length === 0 ? 1 : 0;
                    } else {
                        mission.progress = 1;
                    }
                    break;
                case "morning_trivial": if (context.type === "complete" && context.difficulty === 1 && now.hour() < 10) mission.progress++; break;
                case "quest_count": if (context.type === "complete") mission.progress = this.settings.questsCompletedToday; break;
                case "high_stakes": if (context.type === "complete" && context.highStakes) mission.progress++; break;
                case "fast_complete": if (context.type === "complete" && context.questCreated && moment().diff(moment(context.questCreated), 'hours') <= 2) mission.progress++; break;
                case "synergy": if (context.type === "complete" && context.skill && context.secondarySkill && context.secondarySkill !== "None") mission.progress++; break;
                case "no_damage": if (context.type === "damage") mission.progress = 0; break;
                case "hard_quest": if (context.type === "complete" && context.difficulty && context.difficulty >= 4) mission.progress++; break;
                case "skill_repeat":
                    if (context.type === "complete" && context.skill) {
                        this.settings.skillUsesToday[context.skill] = (this.settings.skillUsesToday[context.skill] || 0) + 1;
                        mission.progress = Math.max(0, ...Object.values(this.settings.skillUsesToday));
                    }
                    break;
            }
            if (mission.progress >= mission.target && !mission.completed) {
                mission.completed = true;
                this.grantRewards(mission.reward.xp, mission.reward.gold, `mission:${mission.id}`);
                new Notice(`✅ Mission Complete: ${mission.name}`);
                this.audio.playSound("success");

                if (this.settings.dailyMissions.every(m => m.completed)) justFinishedAll = true;
            }
        });

        if (justFinishedAll) {
            this.grantRewards(0, 50, 'missions:all_complete_bonus');
            new Notice("🎉 All Missions Complete! +50 Bonus Gold");
            this.audio.playSound("success");
        }
    }

    getDifficultyNumber(diffLabel: string): number {
        return getDifficultyNum(diffLabel);
    }


    private grantRewards(xp: number, gold: number, reason: string) {
        this.plugin.kernel.events.emit('reward:granted', { xp, gold, reason });
    }

    async checkDailyLogin() {
        this.plugin.kernel.events.emit('session:start', { now: new Date().toISOString() });
    }

    async completeQuest(file: TFile) {
        if (this.meditationEngine.isLockedDown()) { new Notice("LOCKDOWN ACTIVE"); return; }

        // --- COMBO SYSTEM ---
        const now = Date.now();
        const timeDiff = now - this.settings.lastCompletionTime;
        const COMBO_WINDOW = 10 * 60 * 1000; // 10 minutes

        if (timeDiff < COMBO_WINDOW) {
            this.settings.comboCount++;
            this.audio.playSound("success");
        } else {
            this.settings.comboCount = 1;
        }
        this.settings.lastCompletionTime = now;
        // ---------------------------

        const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
        if (!fm) return;
        const questName = file.basename;

        if (this.chainsEngine.isQuestInChain(questName)) {
            const canStart = this.chainsEngine.canStartQuest(questName);
            if (!canStart) { new Notice("Locked by Chain."); return; }

            const chainResult = await this.chainsEngine.completeChainQuest(questName);
            if (chainResult.success) {
                new Notice(chainResult.message);
                if (chainResult.chainComplete) {
                    this.grantRewards(chainResult.bonusXp, 0, 'chain:completion_bonus');
                    new Notice(`🎉 Chain Bonus: +${chainResult.bonusXp} XP!`);
                }
            }
        }

        this.analyticsEngine.trackDailyMetrics("quest_complete", 1);
        this.settings.researchStats.totalCombat++;

        // Rewards
        let xpMult = this.settings.dailyModifier.xpMult;
        let goldMult = this.settings.dailyModifier.goldMult;

        this.settings.activeBuffs.forEach(b => {
            if (b.effect.xpMult) xpMult *= b.effect.xpMult;
            if (b.effect.goldMult) goldMult *= b.effect.goldMult;
        });

        let xp = (fm.xp_reward || 20) * xpMult;
        let gold = (fm.gold_reward || 0) * goldMult;

        if (this.settings.comboCount > 1) {
            const bonus = Math.floor(xp * 0.1 * (this.settings.comboCount - 1));
            xp += bonus;
            new Notice(`🔥 COMBO x${this.settings.comboCount}! +${bonus} Bonus XP`);
        }

        const skillName = fm.skill || "None";
        const secondary = fm.secondary_skill || "None";

        const bossMatch = fm.is_boss ? file.basename.match(/BOSS_LVL(\d+)/) : null;
        const bossLevel = bossMatch ? parseInt(bossMatch[1]) : null;

        this.plugin.kernel.events.emit('quest:completed', {
            questId: file.basename,
            difficulty: this.getDifficultyNumber(fm.difficulty),
            skillName,
            secondarySkill: secondary,
            highStakes: !!fm.high_stakes,
            isBoss: !!fm.is_boss,
            bossLevel,
            xpReward: xp,
            goldReward: gold
        });

        this.audio.playSound("success");

        if (this.settings.hp <= 0) {
            return;
        }

        this.settings.questsCompletedToday++;
        this.analyticsEngine.updateStreak();

        this.checkDailyMissions({
            type: "complete",
            difficulty: this.getDifficultyNumber(fm.difficulty),
            skill: skillName,
            secondarySkill: secondary,
            highStakes: fm.high_stakes
        });

        await this.app.fileManager.processFrontMatter(file, (f) => { f.status = "completed"; f.completed_at = new Date().toISOString(); });

        // [FIX] Use Safe Archive to prevent duplicates/zombies
        await this.safeArchive(file, "Archive");

        // *** RECURRING QUEST: auto-redeploy if marked recurring ***
        if (fm.recurring) {
            const nextDeadline = this.computeNextRecurringDeadline(fm.recurring_interval || 'daily', fm.deadline);
            await this.createQuest(
                file.basename,
                this.getDifficultyNumber(fm.difficulty),
                fm.skill || 'None',
                fm.secondary_skill || 'None',
                nextDeadline,
                !!fm.high_stakes,
                fm.priority || 'normal',
                !!fm.is_boss
            );
            // Mark the re-created quest as recurring in frontmatter
            const newFile = this.app.vault.getAbstractFileByPath(`Active_Run/Quests/${this.toSafeQuestName(file.basename)}.md`);
            if (newFile instanceof TFile) {
                await this.app.fileManager.processFrontMatter(newFile, (f) => {
                    f.recurring = true;
                    f.recurring_interval = fm.recurring_interval || 'daily';
                });
            }
        }

        await this.save();
    }

    async spawnBoss(level: number) {
        const boss = BOSS_DATA[level];
        if (!boss) return;
        this.audio.playSound("heartbeat");
        new Notice("⚠️ ANOMALY DETECTED...", 2000);

        setTimeout(async () => {
            this.audio.playSound("death");
            new BossEncounterModal(this.app, this.plugin, boss.name, level, boss.desc || 'A formidable adversary.').open();

            await this.createQuest(
                `BOSS_LVL${level} - ${boss.name}`, 5, "Boss", "None",
                moment().add(3, 'days').toISOString(), true, "Critical", true
            );

            setTimeout(async () => {
                const safeName = this.toSafeQuestName(`BOSS_LVL${level} - ${boss.name}`);
                const files = this.app.vault.getMarkdownFiles();
                const file = files.find(f => f.basename.toLowerCase() === safeName);

                if (file instanceof TFile) {
                    const maxHp = 100 + (level * 20);
                    await this.app.fileManager.processFrontMatter(file, (fm) => {
                        fm.boss_hp = maxHp;
                        fm.boss_max_hp = maxHp;
                    });
                    this.trigger("update");
                }
            }, 500);
        }, 3000);
    }

    async damageBoss(file: TFile) {
        const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
        if (!fm || !fm.is_boss) return;

        const damage = 25;
        const currentHp = fm.boss_hp || 100;
        const newHp = currentHp - damage;

        if (newHp <= 0) {
            await this.completeQuest(file);
            new Notice("⚔️ FINAL BLOW! Boss Defeated!");
        } else {
            await this.app.fileManager.processFrontMatter(file, (f) => {
                f.boss_hp = newHp;
            });
            this.audio.playSound("fail");
            new Notice(`⚔️ Boss Damaged! ${newHp}/${fm.boss_max_hp} HP remaining`);
            setTimeout(() => this.trigger("update"), 200);
        }
    }

    async failQuest(file: TFile, manualAbort: boolean = false) {
        if (this.isResting() && !manualAbort) { new Notice("Rest Day protection."); return; }
        if (this.isShielded() && !manualAbort) { new Notice("Shielded!"); return; }

        let damageMult = 1;
        this.settings.activeBuffs.forEach(b => {
            if (b.effect.damageMult) damageMult *= b.effect.damageMult;
        });

        const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
        let bossHpPenalty = 0;
        if (fm?.is_boss) {
            const match = file.basename.match(/BOSS_LVL(\d+)/);
            if (match) {
                const level = parseInt(match[1]);
                bossHpPenalty = getBossHpPenalty(level);
            }
        }

        const damage = computeFailDamage(
            this.settings.rivalDmg,
            this.settings.gold,
            damageMult,
            bossHpPenalty
        );

        this.plugin.kernel.events.emit('quest:failed', {
            questId: file.basename,
            reason: manualAbort ? 'manual_abort' : 'failed',
            damage,
            manualAbort,
            bossHpPenalty
        });

        if (this.settings.hp <= 0) {
            return;
        }

        const gravePath = "Graveyard/Failures";
        if (!this.app.vault.getAbstractFileByPath(gravePath)) await this.app.vault.createFolder(gravePath);

        await this.app.fileManager.renameFile(file, `${gravePath}/[FAILED] ${file.name}`);
        await this.save();
    }

    async createQuest(name: string, diff: number, skill: string, secSkill: string, deadlineIso: string, highStakes: boolean, priority: string, isBoss: boolean) {
        if (this.meditationEngine.isLockedDown()) { new Notice("LOCKDOWN ACTIVE"); return; }

        const { xpReward, goldReward, diffLabel } = questRewardsByDifficulty(diff, this.settings.xpReq, isBoss, highStakes);

        const rootPath = "Active_Run/Quests";
        if (!this.app.vault.getAbstractFileByPath(rootPath)) await this.app.vault.createFolder(rootPath);

        const safeName = this.toSafeQuestName(name);

        const existingFile = this.app.vault.getAbstractFileByPath(`${rootPath}/${safeName}.md`);
        if (existingFile) {
            new Notice("Quest with that name already exists!");
            return;
        }

        const content = `---
type: quest
status: active
difficulty: ${diffLabel}
priority: ${priority}
xp_reward: ${xpReward}
gold_reward: ${goldReward}
skill: ${skill}
secondary_skill: ${secSkill}
high_stakes: ${highStakes ? 'true' : 'false'}
is_boss: ${isBoss}
created: ${new Date().toISOString()}
deadline: ${deadlineIso}
---
# ⚔️ ${name}`;

        try {
            await this.app.vault.create(`${rootPath}/${safeName}.md`, content);
        } catch (e) {
            console.error("Failed to create quest file", e);
            new Notice("Failed to create quest. Check console for details.");
            return;
        }
        this.audio.playSound("click");
        this.save();
    }

    async deleteQuest(file: TFile) {
        const { cost } = this.meditationEngine.getDeletionCost();
        if (cost > 0 && this.settings.gold < cost) {
            new Notice("Insufficient gold for paid deletion!");
            return;
        }

        const costResult = this.meditationEngine.applyDeletionCost();

        try {
            const content = await this.app.vault.read(file);
            this.deletedQuestBuffer.push({
                name: file.name,
                content: content,
                path: file.path,
                deletedAt: Date.now()
            });
            if (this.deletedQuestBuffer.length > 5) this.deletedQuestBuffer.shift();
            this.trigger("undo:show", file.basename);
        } catch (e) { console.error("Buffer fail", e); }

        await this.app.vault.delete(file);
        if (costResult.message) new Notice(costResult.message);
        this.save();
    }

    async undoLastDeletion() {
        const last = this.deletedQuestBuffer.pop();
        if (!last) { new Notice("Nothing to undo."); return; }

        if (Date.now() - last.deletedAt > 60000) { new Notice("Too late to undo."); return; }

        try {
            await this.app.vault.create(last.path, last.content);
            new Notice(`Restored: ${last.name}`);

            setTimeout(() => {
                this.trigger("update");
            }, 100);

        } catch (e) {
            new Notice("Could not restore file (path may be taken).");
        }
    }

    async checkDeadlines() {
        if (!this.plugin.kernel) {
            const now = moment();
            const initialCount = this.settings.activeBuffs.length;
            this.settings.activeBuffs = this.settings.activeBuffs.filter(b => moment(b.expiresAt).isAfter(now));
            if (this.settings.activeBuffs.length < initialCount) {
                new Notice("A potion effect has worn off.");
                this.trigger("update");
            }
        }
        const folder = this.app.vault.getAbstractFileByPath("Active_Run/Quests");
        if (!(folder instanceof TFolder)) return;

        const zeroInbox = this.settings.dailyMissions.find(m => m.checkFunc === "zero_inbox" && !m.completed);
        if (zeroInbox) {
            const scraps = this.app.vault.getAbstractFileByPath("Scraps");
            if (scraps instanceof TFolder && scraps.children.length === 0) {
                this.checkDailyMissions({ type: "check" });
            }
        }

        for (const file of folder.children) {
            if (file instanceof TFile) {
                const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
                if (fm?.deadline && moment().isAfter(moment(fm.deadline))) await this.failQuest(file);
            }
        }
        await this.save();
    }

    async rollChaos(showModal: boolean = false) {
        const roll = Math.random();
        if (roll < 0.4) this.settings.dailyModifier = DEFAULT_MODIFIER;
        else {
            const idx = Math.floor(Math.random() * (CHAOS_TABLE.length - 1)) + 1;
            this.settings.dailyModifier = CHAOS_TABLE[idx];
        }
        await this.save();
        if (showModal) new ChaosModal(this.app, this.settings.dailyModifier).open();
    }

    async attemptRecovery() {
        if (!this.meditationEngine.isLockedDown()) { new Notice("Not in Lockdown."); return; }
        const { hours, minutes } = this.meditationEngine.getLockdownTimeRemaining();
        new Notice(`Recovering... ${hours}h ${minutes}m remaining.`);
    }

    isLockedDown() { return this.meditationEngine.isLockedDown(); }
    isResting(): boolean { return !!(this.settings.restDayUntil && moment().isBefore(moment(this.settings.restDayUntil))); }
    isShielded(): boolean { return !!(this.settings.shieldedUntil && moment().isBefore(moment(this.settings.shieldedUntil))); }

    async createResearchQuest(title: string, type: any, linkedSkill: string, linkedCombatQuest: string): Promise<{ success: boolean; message: string }> {
        const res = await this.researchEngine.createResearchQuest(title, type, linkedSkill, linkedCombatQuest);
        if (res.success) {
            new Notice(res.message);
            await this.save();
        } else {
            new Notice(res.message);
        }
        return res;
    }

    completeResearchQuest(id: string, words: number) { this.researchEngine.completeResearchQuest(id, words); this.save(); }
    async deleteResearchQuest(id: string) { await this.researchEngine.deleteResearchQuest(id); await this.save(); }
    updateResearchWordCount(id: string, words: number) {
        this.researchEngine.updateResearchWordCount(id, words);
        this.trigger("update");
    }
    getResearchRatio() { return this.researchEngine.getResearchRatio(); }
    canCreateResearchQuest() { return this.researchEngine.canCreateResearchQuest(); }

    async startMeditation() { const r = this.meditationEngine.meditate(); new Notice(r.message); await this.save(); }
    getMeditationStatus() { return this.meditationEngine.getMeditationStatus(); }
    async createScrap(content: string) {
        const folderPath = "Scraps";
        if (!this.app.vault.getAbstractFileByPath(folderPath)) await this.app.vault.createFolder(folderPath);
        const timestamp = moment().format("YYYY-MM-DD HH-mm-ss");
        await this.app.vault.create(`${folderPath}/${timestamp}.md`, content);
        new Notice("⚡ Scrap Captured"); this.audio.playSound("click");
    }

    async generateSkillGraph() {
        const skills = this.settings.skills;
        if (skills.length === 0) { new Notice("No neural nodes found."); return; }
        const nodes: any[] = []; const edges: any[] = [];
        const width = 250; const height = 140;
        const radius = Math.max(400, skills.length * 60);
        const centerX = 0; const centerY = 0; const angleStep = (2 * Math.PI) / skills.length;

        skills.forEach((skill, index) => {
            const angle = index * angleStep;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            let color = "4";
            if (skill.rust > 0) color = "1"; else if (skill.level >= 10) color = "6";
            const statusIcon = skill.rust > 0 ? "⚠️ RUSTY" : "🟢 ACTIVE";
            const progress = skill.xpReq > 0 ? Math.floor((skill.xp / skill.xpReq) * 100) : 0;
            const text = `## ${skill.name}\n**Lv ${skill.level}**\n${statusIcon}\nXP: ${skill.xp}/${skill.xpReq} (${progress}%)`;
            nodes.push({ id: skill.name, x: Math.floor(x), y: Math.floor(y), width, height, type: "text", text, color });
        });

        skills.forEach(skill => {
            if (skill.connections) {
                skill.connections.forEach(targetName => {
                    if (skills.find(s => s.name === targetName)) {
                        edges.push({ id: `${skill.name}-${targetName}`, fromNode: skill.name, fromSide: "right", toNode: targetName, toSide: "left", color: "4" });
                    }
                });
            }
        });

        const canvasData = { nodes, edges };
        const path = this.settings.neuralHubPath || "Active_Run/Neural_Hub.canvas";
        const file = this.app.vault.getAbstractFileByPath(path);
        if (file instanceof TFile) { await this.app.vault.modify(file, JSON.stringify(canvasData, null, 2)); new Notice("Neural Hub updated."); }
        else { await this.app.vault.create(path, JSON.stringify(canvasData, null, 2)); new Notice("Neural Hub created."); }
    }

    async createQuestChain(name: string, quests: string[]) { await this.chainsEngine.createQuestChain(name, quests); await this.save(); }
    getActiveChain() { return this.chainsEngine.getActiveChain(); }
    getChainProgress() { return this.chainsEngine.getChainProgress(); }
    async breakChain() { await this.chainsEngine.breakChain(); await this.save(); }

    setFilterState(energy: any, context: any, tags: string[]) { this.filtersEngine.setFilterState(energy, context, tags); this.save(); }
    clearFilters() { this.filtersEngine.clearFilters(); this.save(); }

    getGameStats() { return this.analyticsEngine.getGameStats(); }
    checkBossMilestones() { return this.analyticsEngine.checkBossMilestones(); }
    generateWeeklyReport() { return this.analyticsEngine.generateWeeklyReport(); }

    taunt(trigger: string) {
        const msgs: any = {
            "fail": ["Pathetic.", "Try again.", "Is that all?"],
            "level_up": ["Power overwhelming.", "Ascending."],
            "low_hp": ["Bleeding out...", "Hold on."]
        };
        const msg = msgs[trigger] ? msgs[trigger][Math.floor(Math.random() * msgs[trigger].length)] : "Observe.";
        new Notice(`SYSTEM: ${msg}`);
    }

    parseQuickInput(text: string) {
        const match = text.match(/(.+?)\s*\/(\d)/);
        if (match) {
            const diff = Math.min(5, Math.max(1, parseInt(match[2], 10) || 3));
            this.createQuest(match[1], diff, "None", "None", moment().add(24, 'hours').toISOString(), false, "Normal", false);
        } else {
            this.createQuest(text, 3, "None", "None", moment().add(24, 'hours').toISOString(), false, "Normal", false);
        }
    }

    async triggerDeath() {
        const nextDeath = (this.settings.legacy?.deathCount || 0) + 1;
        const runLevel = this.settings.level;
        const runStreak = this.settings.streak?.longest || 0;
        const bossesDefeated = (this.settings.bossMilestones || []).filter((b: { defeated?: boolean }) => b.defeated).length;

        if (!this.settings.scars) this.settings.scars = [];
        this.settings.scars.push({
            id: `death_${Date.now()}`,
            label: "Death",
            value: `#${nextDeath} · Lv ${runLevel} · Streak ${runStreak} · Bosses ${bossesDefeated}`,
            earnedAt: new Date().toISOString()
        });

        const activeFolder = this.app.vault.getAbstractFileByPath("Active_Run/Quests");
        const graveFolder = "Graveyard/Deaths/" + moment().format("YYYY-MM-DD-HHmm");
        if (!this.app.vault.getAbstractFileByPath(graveFolder)) await this.app.vault.createFolder(graveFolder);

        if (activeFolder instanceof TFolder) {
            for (const file of activeFolder.children) {
                if (file instanceof TFile) {
                    await this.app.fileManager.renameFile(file, `${graveFolder}/${file.name}`);
                }
            }
        }

        this.settings.level = 1;
        this.settings.hp = 100;
        this.settings.maxHp = 100;
        this.settings.gold = 0;
        this.settings.xp = 0;
        this.settings.xpReq = 100;
        this.settings.rivalDmg = 5;
        this.settings.comboCount = 0;
        this.settings.lastCompletionTime = 0;
        this.settings.questsCompletedToday = 0;
        this.settings.damageTakenToday = 0;
        this.settings.activeBuffs = [];
        this.settings.activeChains = [];
        this.settings.researchQuests = [];
        this.settings.lockdownUntil = '';
        this.settings.shieldedUntil = '';
        this.settings.restDayUntil = '';
        this.settings.dailyModifier = { ...DEFAULT_MODIFIER };
        this.settings.streak = { current: 0, longest: this.settings.streak?.longest || 0, lastDate: '' };
        this.settings.skills = [];
        this.settings.legacy.deathCount = nextDeath;
        await this.save();
    }

    /** Compute the next deadline for a recurring quest */
    computeNextRecurringDeadline(interval: string, currentDeadline?: string): string {
        const base = currentDeadline ? moment(currentDeadline) : moment();
        let next: ReturnType<typeof moment>;
        switch (interval) {
            case 'weekly':
                next = base.clone().add(7, 'days');
                break;
            case 'weekday':
                next = base.clone().add(1, 'day');
                // Skip weekends
                while (next.day() === 0 || next.day() === 6) {
                    next.add(1, 'day');
                }
                break;
            case 'daily':
            default:
                next = base.clone().add(1, 'day');
                break;
        }
        return next.toISOString();
    }
}
