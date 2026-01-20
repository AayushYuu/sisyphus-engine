'use strict';

var obsidian = require('obsidian');

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol, Iterator */


function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

class ChaosModal extends obsidian.Modal {
    constructor(app, m) { super(app); this.modifier = m; }
    onOpen() {
        const c = this.contentEl;
        const h1 = c.createEl("h1", { text: "THE OMEN" });
        h1.setAttribute("style", "text-align:center; color:#f55;");
        const ic = c.createEl("div", { text: this.modifier.icon });
        ic.setAttribute("style", "font-size:80px; text-align:center;");
        const h2 = c.createEl("h2", { text: this.modifier.name });
        h2.setAttribute("style", "text-align:center;");
        const p = c.createEl("p", { text: this.modifier.desc });
        p.setAttribute("style", "text-align:center");
        const b = c.createEl("button", { text: "Acknowledge" });
        b.addClass("mod-cta");
        b.style.display = "block";
        b.style.margin = "20px auto";
        b.onclick = () => this.close();
    }
    onClose() { this.contentEl.empty(); }
}
class ShopModal extends obsidian.Modal {
    constructor(app, plugin) { super(app); this.plugin = plugin; }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "🛒 BLACK MARKET" });
        contentEl.createEl("p", { text: `Purse: 🪙 ${this.plugin.settings.gold}` });
        this.item(contentEl, "💉 Stimpack", "Heal 20 HP", 50, () => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.hp = Math.min(this.plugin.settings.maxHp, this.plugin.settings.hp + 20);
        }));
        this.item(contentEl, "💣 Sabotage", "-5 Rival Dmg", 200, () => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.rivalDmg = Math.max(5, this.plugin.settings.rivalDmg - 5);
        }));
        this.item(contentEl, "🛡️ Shield", "24h Protection", 150, () => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.shieldedUntil = obsidian.moment().add(24, 'hours').toISOString();
        }));
        this.item(contentEl, "😴 Rest Day", "Safe for 24h", 100, () => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.restDayUntil = obsidian.moment().add(24, 'hours').toISOString();
        }));
    }
    item(el, name, desc, cost, effect) {
        const c = el.createDiv();
        c.setAttribute("style", "display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #333;");
        const i = c.createDiv();
        i.createEl("b", { text: name });
        i.createEl("div", { text: desc });
        const b = c.createEl("button", { text: `${cost} G` });
        if (this.plugin.settings.gold < cost) {
            b.setAttribute("disabled", "true");
            b.style.opacity = "0.5";
        }
        else {
            b.addClass("mod-cta");
            b.onclick = () => __awaiter(this, void 0, void 0, function* () {
                this.plugin.settings.gold -= cost;
                yield effect();
                yield this.plugin.engine.save();
                new obsidian.Notice(`Bought ${name}`);
                this.close();
                new ShopModal(this.app, this.plugin).open();
            });
        }
    }
    onClose() { this.contentEl.empty(); }
}
class QuestModal extends obsidian.Modal {
    constructor(app, plugin) {
        super(app);
        this.difficulty = 3;
        this.skill = "None";
        this.secSkill = "None";
        this.deadline = "";
        this.highStakes = false;
        this.isBoss = false;
        this.plugin = plugin;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "⚔️ DEPLOYMENT" });
        new obsidian.Setting(contentEl).setName("Objective").addText(t => {
            t.onChange(v => this.name = v);
            setTimeout(() => t.inputEl.focus(), 50);
        });
        new obsidian.Setting(contentEl).setName("Difficulty").addDropdown(d => d.addOption("1", "Trivial").addOption("2", "Easy").addOption("3", "Medium").addOption("4", "Hard").addOption("5", "SUICIDE").setValue("3").onChange(v => this.difficulty = parseInt(v)));
        const skills = { "None": "None" };
        this.plugin.settings.skills.forEach(s => skills[s.name] = s.name);
        skills["+ New"] = "+ New";
        new obsidian.Setting(contentEl).setName("Primary Node").addDropdown(d => d.addOptions(skills).onChange(v => {
            if (v === "+ New") {
                this.close();
                new SkillManagerModal(this.app, this.plugin).open();
            }
            else
                this.skill = v;
        }));
        new obsidian.Setting(contentEl).setName("Synergy Node").addDropdown(d => d.addOptions(skills).setValue("None").onChange(v => this.secSkill = v));
        new obsidian.Setting(contentEl).setName("Deadline").addText(t => { t.inputEl.type = "datetime-local"; t.onChange(v => this.deadline = v); });
        new obsidian.Setting(contentEl).setName("High Stakes").setDesc("Double Gold / Double Damage").addToggle(t => t.setValue(false).onChange(v => this.highStakes = v));
        new obsidian.Setting(contentEl).addButton(b => b.setButtonText("Deploy").setCta().onClick(() => {
            if (this.name) {
                this.plugin.engine.createQuest(this.name, this.difficulty, this.skill, this.secSkill, this.deadline, this.highStakes, "Normal", this.isBoss);
                this.close();
            }
        }));
    }
    onClose() { this.contentEl.empty(); }
}
class SkillManagerModal extends obsidian.Modal {
    constructor(app, plugin) { super(app); this.plugin = plugin; }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "Add New Node" });
        let n = "";
        new obsidian.Setting(contentEl).setName("Node Name").addText(t => t.onChange(v => n = v)).addButton(b => b.setButtonText("Create").setCta().onClick(() => __awaiter(this, void 0, void 0, function* () {
            if (n) {
                this.plugin.settings.skills.push({ name: n, level: 1, xp: 0, xpReq: 5, lastUsed: new Date().toISOString(), rust: 0, connections: [] });
                yield this.plugin.engine.save();
                this.close();
            }
        })));
    }
    onClose() { this.contentEl.empty(); }
}
class SkillDetailModal extends obsidian.Modal {
    constructor(app, plugin, index) { super(app); this.plugin = plugin; this.index = index; }
    onOpen() {
        const { contentEl } = this;
        const s = this.plugin.settings.skills[this.index];
        contentEl.createEl("h2", { text: `Node: ${s.name}` });
        new obsidian.Setting(contentEl).setName("Name").addText(t => t.setValue(s.name).onChange(v => s.name = v));
        new obsidian.Setting(contentEl).setName("Rust Status").setDesc(`Stacks: ${s.rust}`).addButton(b => b.setButtonText("Manual Polish").onClick(() => __awaiter(this, void 0, void 0, function* () {
            s.rust = 0;
            s.xpReq = Math.floor(s.xpReq / 1.1);
            yield this.plugin.engine.save();
            this.close();
            new obsidian.Notice("Rust polished.");
        })));
        const div = contentEl.createDiv();
        div.setAttribute("style", "margin-top:20px; display:flex; justify-content:space-between;");
        const bSave = div.createEl("button", { text: "Save" });
        bSave.addClass("mod-cta");
        bSave.onclick = () => __awaiter(this, void 0, void 0, function* () { yield this.plugin.engine.save(); this.close(); });
        const bDel = div.createEl("button", { text: "Delete Node" });
        bDel.setAttribute("style", "color:red;");
        bDel.onclick = () => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.skills.splice(this.index, 1);
            yield this.plugin.engine.save();
            this.close();
        });
    }
    onClose() { this.contentEl.empty(); }
}
class ResearchQuestModal extends obsidian.Modal {
    constructor(app, plugin) {
        super(app);
        this.title = "";
        this.type = "survey";
        this.linkedSkill = "None";
        this.linkedCombatQuest = "None";
        this.plugin = plugin;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "RESEARCH DEPLOYMENT" });
        new obsidian.Setting(contentEl)
            .setName("Research Title")
            .addText(t => {
            t.onChange(v => this.title = v);
            setTimeout(() => t.inputEl.focus(), 50);
        });
        new obsidian.Setting(contentEl)
            .setName("Research Type")
            .addDropdown(d => d
            .addOption("survey", "Survey (100-200 words)")
            .addOption("deep_dive", "Deep Dive (200-400 words)")
            .setValue("survey")
            .onChange(v => this.type = v));
        const skills = { "None": "None" };
        this.plugin.settings.skills.forEach(s => skills[s.name] = s.name);
        new obsidian.Setting(contentEl)
            .setName("Linked Skill")
            .addDropdown(d => d
            .addOptions(skills)
            .setValue("None")
            .onChange(v => this.linkedSkill = v));
        const combatQuests = { "None": "None" };
        const questFolder = this.app.vault.getAbstractFileByPath("Active_Run/Quests");
        if (questFolder instanceof obsidian.TFolder) {
            questFolder.children.forEach(f => {
                if (f instanceof obsidian.TFile && f.extension === "md") {
                    combatQuests[f.basename] = f.basename;
                }
            });
        }
        new obsidian.Setting(contentEl)
            .setName("Link Combat Quest")
            .addDropdown(d => d
            .addOptions(combatQuests)
            .setValue("None")
            .onChange(v => this.linkedCombatQuest = v));
        new obsidian.Setting(contentEl)
            .addButton(b => b
            .setButtonText("CREATE RESEARCH")
            .setCta()
            .onClick(() => {
            if (this.title) {
                this.plugin.engine.createResearchQuest(this.title, this.type, this.linkedSkill, this.linkedCombatQuest);
                this.close();
            }
        }));
    }
    onClose() {
        this.contentEl.empty();
    }
}
class ResearchListModal extends obsidian.Modal {
    constructor(app, plugin) {
        super(app);
        this.plugin = plugin;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "RESEARCH LIBRARY" });
        const stats = this.plugin.engine.getResearchRatio();
        const statsEl = contentEl.createDiv({ cls: "sisy-research-stats" });
        statsEl.createEl("p", { text: `Combat Quests: ${stats.combat}` });
        statsEl.createEl("p", { text: `Research Quests: ${stats.research}` });
        statsEl.createEl("p", { text: `Ratio: ${stats.ratio}:1` });
        if (!this.plugin.engine.canCreateResearchQuest()) {
            const warning = contentEl.createDiv();
            warning.setAttribute("style", "color: orange; font-weight: bold; margin: 10px 0;");
            warning.setText("RESEARCH BLOCKED: Need 2:1 combat to research ratio");
        }
        contentEl.createEl("h3", { text: "Active Research" });
        const quests = this.plugin.settings.researchQuests.filter(q => !q.completed);
        if (quests.length === 0) {
            contentEl.createEl("p", { text: "No active research quests." });
        }
        else {
            quests.forEach((q) => {
                const card = contentEl.createDiv({ cls: "sisy-research-card" });
                card.setAttribute("style", "border: 1px solid #444; padding: 10px; margin: 5px 0; border-radius: 4px;");
                const header = card.createEl("h4", { text: q.title });
                header.setAttribute("style", "margin: 0 0 5px 0;");
                const info = card.createEl("div");
                info.setText(`Type: ${q.type === "survey" ? "Survey" : "Deep Dive"} | Words: ${q.wordCount}/${q.wordLimit}`);
                info.setAttribute("style", "font-size: 0.9em; opacity: 0.8;");
                const actions = card.createDiv();
                actions.setAttribute("style", "margin-top: 8px; display: flex; gap: 5px;");
                const completeBtn = actions.createEl("button", { text: "COMPLETE" });
                completeBtn.setAttribute("style", "flex: 1; padding: 5px; background: green; color: white; border: none; border-radius: 3px; cursor: pointer;");
                completeBtn.onclick = () => {
                    this.plugin.engine.completeResearchQuest(q.id, q.wordCount);
                    this.close();
                };
                const deleteBtn = actions.createEl("button", { text: "DELETE" });
                deleteBtn.setAttribute("style", "flex: 1; padding: 5px; background: red; color: white; border: none; border-radius: 3px; cursor: pointer;");
                deleteBtn.onclick = () => {
                    this.plugin.engine.deleteResearchQuest(q.id);
                    this.close();
                };
            });
        }
        contentEl.createEl("h3", { text: "Completed Research" });
        const completed = this.plugin.settings.researchQuests.filter(q => q.completed);
        if (completed.length === 0) {
            contentEl.createEl("p", { text: "No completed research." });
        }
        else {
            completed.forEach((q) => {
                const item = contentEl.createEl("p");
                item.setText(`+ ${q.title} (${q.type === "survey" ? "Survey" : "Deep Dive"})`);
                item.setAttribute("style", "opacity: 0.6; font-size: 0.9em;");
            });
        }
    }
    onClose() {
        this.contentEl.empty();
    }
}
class ChainBuilderModal extends obsidian.Modal {
    constructor(app, plugin) {
        super(app);
        this.chainName = "";
        this.selectedQuests = [];
        this.plugin = plugin;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "CHAIN BUILDER" });
        new obsidian.Setting(contentEl)
            .setName("Chain Name")
            .addText(t => {
            t.onChange(v => this.chainName = v);
            setTimeout(() => t.inputEl.focus(), 50);
        });
        contentEl.createEl("h3", { text: "Select Quests" });
        const questFolder = this.app.vault.getAbstractFileByPath("Active_Run/Quests");
        const quests = [];
        if (questFolder instanceof obsidian.TFolder) {
            questFolder.children.forEach(f => {
                if (f instanceof obsidian.TFile && f.extension === "md") {
                    quests.push(f.basename);
                }
            });
        }
        quests.forEach((quest, idx) => {
            new obsidian.Setting(contentEl)
                .setName(quest)
                .addToggle(t => t.onChange(v => {
                if (v) {
                    this.selectedQuests.push(quest);
                }
                else {
                    this.selectedQuests = this.selectedQuests.filter(q => q !== quest);
                }
            }));
        });
        new obsidian.Setting(contentEl)
            .addButton(b => b
            .setButtonText("CREATE CHAIN")
            .setCta()
            .onClick(() => __awaiter(this, void 0, void 0, function* () {
            if (this.chainName && this.selectedQuests.length >= 2) {
                yield this.plugin.engine.createQuestChain(this.chainName, this.selectedQuests);
                this.close();
            }
            else {
                new obsidian.Notice("Chain needs a name and at least 2 quests");
            }
        })));
    }
    onClose() {
        this.contentEl.empty();
    }
}

/**
 * DLC 6: Analytics & Endgame Engine
 * Handles all metrics tracking, boss milestones, achievements, and win condition
 *
 * ISOLATED: Only reads/writes to settings.dayMetrics, weeklyReports, bossMilestones, streak, achievements
 * DEPENDENCIES: moment, SisyphusSettings types
 */
class AnalyticsEngine {
    constructor(settings, audioController) {
        this.settings = settings;
        this.audioController = audioController;
    }
    /**
     * Track daily metrics - called whenever a quest is completed/failed/etc
     */
    trackDailyMetrics(type, amount = 1) {
        const today = obsidian.moment().format("YYYY-MM-DD");
        let metric = this.settings.dayMetrics.find(m => m.date === today);
        if (!metric) {
            metric = {
                date: today,
                questsCompleted: 0,
                questsFailed: 0,
                xpEarned: 0,
                goldEarned: 0,
                damagesTaken: 0,
                skillsLeveled: [],
                chainsCompleted: 0
            };
            this.settings.dayMetrics.push(metric);
        }
        switch (type) {
            case "quest_complete":
                metric.questsCompleted += amount;
                break;
            case "quest_fail":
                metric.questsFailed += amount;
                break;
            case "xp":
                metric.xpEarned += amount;
                break;
            case "gold":
                metric.goldEarned += amount;
                break;
            case "damage":
                metric.damagesTaken += amount;
                break;
            case "skill_level":
                metric.skillsLeveled.push("Skill leveled");
                break;
            case "chain_complete":
                metric.chainsCompleted += amount;
                break;
        }
    }
    /**
     * Update daily streak - called once per day at login
     */
    updateStreak() {
        const today = obsidian.moment().format("YYYY-MM-DD");
        const lastDate = this.settings.streak.lastDate;
        if (lastDate === today) {
            return; // Already counted today
        }
        const yesterday = obsidian.moment().subtract(1, 'day').format("YYYY-MM-DD");
        if (lastDate === yesterday) {
            // Consecutive day
            this.settings.streak.current++;
            if (this.settings.streak.current > this.settings.streak.longest) {
                this.settings.streak.longest = this.settings.streak.current;
            }
        }
        else {
            // Streak broken, start new one
            this.settings.streak.current = 1;
        }
        this.settings.streak.lastDate = today;
    }
    /**
     * Initialize boss milestones on first run
     */
    initializeBossMilestones() {
        if (this.settings.bossMilestones.length === 0) {
            const milestones = [
                { level: 10, name: "The First Trial", unlocked: false, defeated: false, xpReward: 500 },
                { level: 20, name: "The Nemesis Returns", unlocked: false, defeated: false, xpReward: 1000 },
                { level: 30, name: "The Reaper Awakens", unlocked: false, defeated: false, xpReward: 1500 },
                { level: 50, name: "The Final Ascension", unlocked: false, defeated: false, xpReward: 5000 }
            ];
            this.settings.bossMilestones = milestones;
        }
    }
    /**
     * Check if any bosses should be unlocked based on current level
     */
    checkBossMilestones() {
        const messages = [];
        if (!this.settings.bossMilestones || this.settings.bossMilestones.length === 0) {
            this.initializeBossMilestones();
        }
        this.settings.bossMilestones.forEach((boss) => {
            var _a;
            if (this.settings.level >= boss.level && !boss.unlocked) {
                boss.unlocked = true;
                messages.push(`Boss Unlocked: ${boss.name} (Level ${boss.level})`);
                if ((_a = this.audioController) === null || _a === void 0 ? void 0 : _a.playSound) {
                    this.audioController.playSound("success");
                }
            }
        });
        return messages;
    }
    /**
     * Mark boss as defeated and award XP
     */
    defeatBoss(level) {
        var _a;
        const boss = this.settings.bossMilestones.find((b) => b.level === level);
        if (!boss) {
            return { success: false, message: "Boss not found", xpReward: 0 };
        }
        if (boss.defeated) {
            return { success: false, message: "Boss already defeated", xpReward: 0 };
        }
        boss.defeated = true;
        boss.defeatedAt = new Date().toISOString();
        this.settings.xp += boss.xpReward;
        if ((_a = this.audioController) === null || _a === void 0 ? void 0 : _a.playSound) {
            this.audioController.playSound("success");
        }
        // Check win condition
        if (level === 50) {
            this.winGame();
            return { success: true, message: `Boss Defeated: ${boss.name}! VICTORY!`, xpReward: boss.xpReward };
        }
        return { success: true, message: `Boss Defeated: ${boss.name}! +${boss.xpReward} XP`, xpReward: boss.xpReward };
    }
    /**
     * Trigger win condition
     */
    winGame() {
        var _a;
        this.settings.gameWon = true;
        this.settings.endGameDate = new Date().toISOString();
        if ((_a = this.audioController) === null || _a === void 0 ? void 0 : _a.playSound) {
            this.audioController.playSound("success");
        }
    }
    /**
     * Generate weekly report
     */
    generateWeeklyReport() {
        const week = obsidian.moment().week();
        const startDate = obsidian.moment().startOf('week').format("YYYY-MM-DD");
        const endDate = obsidian.moment().endOf('week').format("YYYY-MM-DD");
        const weekMetrics = this.settings.dayMetrics.filter((m) => obsidian.moment(m.date).isBetween(obsidian.moment(startDate), obsidian.moment(endDate), null, '[]'));
        const totalQuests = weekMetrics.reduce((sum, m) => sum + m.questsCompleted, 0);
        const totalFailed = weekMetrics.reduce((sum, m) => sum + m.questsFailed, 0);
        const successRate = totalQuests + totalFailed > 0 ? Math.round((totalQuests / (totalQuests + totalFailed)) * 100) : 0;
        const totalXp = weekMetrics.reduce((sum, m) => sum + m.xpEarned, 0);
        const totalGold = weekMetrics.reduce((sum, m) => sum + m.goldEarned, 0);
        const topSkills = this.settings.skills
            .sort((a, b) => (b.level - a.level))
            .slice(0, 3)
            .map((s) => s.name);
        const bestDay = weekMetrics.length > 0
            ? weekMetrics.reduce((max, m) => m.questsCompleted > max.questsCompleted ? m : max).date
            : startDate;
        const worstDay = weekMetrics.length > 0
            ? weekMetrics.reduce((min, m) => m.questsFailed > min.questsFailed ? m : min).date
            : startDate;
        const report = {
            week: week,
            startDate: startDate,
            endDate: endDate,
            totalQuests: totalQuests,
            successRate: successRate,
            totalXp: totalXp,
            totalGold: totalGold,
            topSkills: topSkills,
            bestDay: bestDay,
            worstDay: worstDay
        };
        this.settings.weeklyReports.push(report);
        return report;
    }
    /**
     * Unlock an achievement
     */
    unlockAchievement(achievementId) {
        var _a;
        const achievement = this.settings.achievements.find((a) => a.id === achievementId);
        if (!achievement || achievement.unlocked)
            return false;
        achievement.unlocked = true;
        achievement.unlockedAt = new Date().toISOString();
        if ((_a = this.audioController) === null || _a === void 0 ? void 0 : _a.playSound) {
            this.audioController.playSound("success");
        }
        return true;
    }
    /**
     * Get current game stats snapshot
     */
    getGameStats() {
        return {
            level: this.settings.level,
            currentStreak: this.settings.streak.current,
            longestStreak: this.settings.streak.longest,
            totalQuests: this.settings.dayMetrics.reduce((sum, m) => sum + m.questsCompleted, 0),
            totalXp: this.settings.xp + this.settings.dayMetrics.reduce((sum, m) => sum + m.xpEarned, 0),
            gameWon: this.settings.gameWon,
            bossesDefeated: this.settings.bossMilestones.filter((b) => b.defeated).length,
            totalBosses: this.settings.bossMilestones.length
        };
    }
    /**
     * Get survival estimate (rough calculation)
     */
    getSurvivalEstimate() {
        const damagePerFailure = 10 + Math.floor(this.settings.rivalDmg / 2);
        const actualDamage = this.settings.gold < 0 ? damagePerFailure * 2 : damagePerFailure;
        return Math.floor(this.settings.hp / Math.max(1, actualDamage));
    }
}

/**
 * DLC 3: Meditation & Recovery Engine
 * Handles lockdown state, meditation healing, and quest deletion quota
 *
 * ISOLATED: Only reads/writes to lockdownUntil, isMeditating, meditationClicksThisLockdown,
 *           questDeletionsToday, lastDeletionReset
 * DEPENDENCIES: moment, SisyphusSettings
 * SIDE EFFECTS: Plays audio (432 Hz tone)
 */
class MeditationEngine {
    constructor(settings, audioController) {
        this.meditationCooldownMs = 30000; // 30 seconds
        this.settings = settings;
        this.audioController = audioController;
    }
    /**
     * Check if currently locked down
     */
    isLockedDown() {
        if (!this.settings.lockdownUntil)
            return false;
        return obsidian.moment().isBefore(obsidian.moment(this.settings.lockdownUntil));
    }
    /**
     * Get lockdown time remaining in minutes
     */
    getLockdownTimeRemaining() {
        if (!this.isLockedDown()) {
            return { hours: 0, minutes: 0, totalMinutes: 0 };
        }
        const totalMinutes = obsidian.moment(this.settings.lockdownUntil).diff(obsidian.moment(), 'minutes');
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return { hours, minutes, totalMinutes };
    }
    /**
     * Trigger lockdown after taking 50+ damage
     */
    triggerLockdown() {
        this.settings.lockdownUntil = obsidian.moment().add(6, 'hours').toISOString();
        this.settings.meditationClicksThisLockdown = 0;
    }
    /**
     * Perform one meditation cycle (click)
     * Returns: { success, cyclesDone, cyclesRemaining, message }
     */
    meditate() {
        var _a;
        if (!this.isLockedDown()) {
            return {
                success: false,
                cyclesDone: 0,
                cyclesRemaining: 0,
                message: "Not in lockdown. No need to meditate.",
                lockdownReduced: false
            };
        }
        if (this.settings.isMeditating) {
            return {
                success: false,
                cyclesDone: this.settings.meditationClicksThisLockdown,
                cyclesRemaining: Math.max(0, 10 - this.settings.meditationClicksThisLockdown),
                message: "Already meditating. Wait 30 seconds.",
                lockdownReduced: false
            };
        }
        this.settings.isMeditating = true;
        this.settings.meditationClicksThisLockdown++;
        // Play healing frequency
        this.playMeditationSound();
        const remaining = 10 - this.settings.meditationClicksThisLockdown;
        // Check if 10 cycles complete
        if (this.settings.meditationClicksThisLockdown >= 10) {
            const reducedTime = obsidian.moment(this.settings.lockdownUntil).subtract(5, 'hours');
            this.settings.lockdownUntil = reducedTime.toISOString();
            this.settings.meditationClicksThisLockdown = 0;
            if ((_a = this.audioController) === null || _a === void 0 ? void 0 : _a.playSound) {
                this.audioController.playSound("success");
            }
            // Auto-reset meditation flag after cooldown
            setTimeout(() => {
                this.settings.isMeditating = false;
            }, this.meditationCooldownMs);
            return {
                success: true,
                cyclesDone: 0,
                cyclesRemaining: 0,
                message: "Meditation complete. Lockdown reduced by 5 hours.",
                lockdownReduced: true
            };
        }
        // Auto-reset meditation flag after cooldown
        setTimeout(() => {
            this.settings.isMeditating = false;
        }, this.meditationCooldownMs);
        return {
            success: true,
            cyclesDone: this.settings.meditationClicksThisLockdown,
            cyclesRemaining: remaining,
            message: `Meditation (${this.settings.meditationClicksThisLockdown}/10) - ${remaining} cycles left`,
            lockdownReduced: false
        };
    }
    /**
     * Play 432 Hz healing frequency for 1 second
     */
    playMeditationSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.frequency.value = 432;
            oscillator.type = "sine";
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 1);
        }
        catch (e) {
            console.log("Audio not available for meditation");
        }
    }
    /**
     * Get meditation status for current lockdown
     */
    getMeditationStatus() {
        const cyclesDone = this.settings.meditationClicksThisLockdown;
        const cyclesRemaining = Math.max(0, 10 - cyclesDone);
        const timeReduced = (10 - cyclesRemaining) * 30; // 30 min per cycle
        return {
            cyclesDone,
            cyclesRemaining,
            timeReduced
        };
    }
    /**
     * Reset deletion quota if new day
     */
    ensureDeletionQuotaReset() {
        const today = obsidian.moment().format("YYYY-MM-DD");
        if (this.settings.lastDeletionReset !== today) {
            this.settings.lastDeletionReset = today;
            this.settings.questDeletionsToday = 0;
        }
    }
    /**
     * Check if user has free deletions left today
     */
    canDeleteQuestFree() {
        this.ensureDeletionQuotaReset();
        return this.settings.questDeletionsToday < 3;
    }
    /**
     * Get deletion quota status
     */
    getDeletionQuota() {
        this.ensureDeletionQuotaReset();
        const remaining = Math.max(0, 3 - this.settings.questDeletionsToday);
        const paid = Math.max(0, this.settings.questDeletionsToday - 3);
        return {
            free: remaining,
            paid: paid,
            remaining: remaining
        };
    }
    /**
     * Delete a quest and charge gold if necessary
     * Returns: { cost, message }
     */
    applyDeletionCost() {
        this.ensureDeletionQuotaReset();
        let cost = 0;
        let message = "";
        if (this.settings.questDeletionsToday >= 3) {
            // Paid deletion
            cost = 10;
            message = `Quest deleted. Cost: -${cost}g`;
        }
        else {
            // Free deletion
            const remaining = 3 - this.settings.questDeletionsToday;
            message = `Quest deleted. (${remaining - 1} free deletions remaining)`;
        }
        this.settings.questDeletionsToday++;
        this.settings.gold -= cost;
        return { cost, message };
    }
}

/**
 * DLC 2: Research Quest System Engine
 * Handles research quest creation, completion, word count validation, and combat:research ratio
 *
 * ISOLATED: Only reads/writes to researchQuests, researchStats
 * DEPENDENCIES: SisyphusSettings types
 * REQUIREMENTS: Audio callbacks from parent for notifications
 */
class ResearchEngine {
    constructor(settings, audioController) {
        this.settings = settings;
        this.audioController = audioController;
    }
    /**
     * Create a new research quest
     * Checks 2:1 combat:research ratio before allowing creation
     */
    createResearchQuest(title, type, linkedSkill, linkedCombatQuest) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check 2:1 combat:research ratio
            if (!this.canCreateResearchQuest()) {
                return {
                    success: false,
                    message: "RESEARCH BLOCKED: Complete 2 combat quests per research quest"
                };
            }
            const wordLimit = type === "survey" ? 200 : 400;
            const questId = `research_${(this.settings.lastResearchQuestId || 0) + 1}`;
            const researchQuest = {
                id: questId,
                title: title,
                type: type,
                linkedSkill: linkedSkill,
                wordLimit: wordLimit,
                wordCount: 0,
                linkedCombatQuest: linkedCombatQuest,
                createdAt: new Date().toISOString(),
                completed: false
            };
            this.settings.researchQuests.push(researchQuest);
            this.settings.lastResearchQuestId = parseInt(questId.split('_')[1]);
            this.settings.researchStats.totalResearch++;
            return {
                success: true,
                message: `Research Quest Created: ${type === "survey" ? "Survey" : "Deep Dive"} (${wordLimit} words)`,
                questId: questId
            };
        });
    }
    /**
     * Complete a research quest
     * Validates word count (80-125%), applies penalties for overage, awards XP
     */
    completeResearchQuest(questId, finalWordCount) {
        var _a;
        const researchQuest = this.settings.researchQuests.find(q => q.id === questId);
        if (!researchQuest) {
            return { success: false, message: "Research quest not found", xpReward: 0, goldPenalty: 0 };
        }
        if (researchQuest.completed) {
            return { success: false, message: "Quest already completed", xpReward: 0, goldPenalty: 0 };
        }
        // Check minimum word count (80% of limit)
        const minWords = Math.ceil(researchQuest.wordLimit * 0.8);
        if (finalWordCount < minWords) {
            return {
                success: false,
                message: `Quest too short! Minimum ${minWords} words required (you have ${finalWordCount})`,
                xpReward: 0,
                goldPenalty: 0
            };
        }
        // Check maximum word count (125% is locked)
        if (finalWordCount > researchQuest.wordLimit * 1.25) {
            return {
                success: false,
                message: `Word count too high! Maximum ${Math.ceil(researchQuest.wordLimit * 1.25)} words allowed`,
                xpReward: 0,
                goldPenalty: 0
            };
        }
        // Calculate XP reward
        let xpReward = researchQuest.type === "survey" ? 5 : 20;
        // Calculate gold penalty for overage (100-125% range)
        let goldPenalty = 0;
        if (finalWordCount > researchQuest.wordLimit) {
            const overagePercent = ((finalWordCount - researchQuest.wordLimit) / researchQuest.wordLimit) * 100;
            if (overagePercent > 0) {
                goldPenalty = Math.floor(20 * (overagePercent / 100));
            }
        }
        // Award XP to linked skill
        const skill = this.settings.skills.find(s => s.name === researchQuest.linkedSkill);
        if (skill) {
            skill.xp += xpReward;
            if (skill.xp >= skill.xpReq) {
                skill.level++;
                skill.xp = 0;
            }
        }
        // Apply penalty and mark complete
        this.settings.gold -= goldPenalty;
        researchQuest.completed = true;
        researchQuest.completedAt = new Date().toISOString();
        this.settings.researchStats.researchCompleted++;
        if ((_a = this.audioController) === null || _a === void 0 ? void 0 : _a.playSound) {
            this.audioController.playSound("success");
        }
        let message = `Research Complete: ${researchQuest.title}! +${xpReward} XP`;
        if (goldPenalty > 0) {
            message += ` (-${goldPenalty}g overage penalty)`;
        }
        return { success: true, message, xpReward, goldPenalty };
    }
    /**
     * Delete a research quest
     */
    deleteResearchQuest(questId) {
        const index = this.settings.researchQuests.findIndex(q => q.id === questId);
        if (index !== -1) {
            const quest = this.settings.researchQuests[index];
            this.settings.researchQuests.splice(index, 1);
            // Decrement stats appropriately
            if (!quest.completed) {
                this.settings.researchStats.totalResearch = Math.max(0, this.settings.researchStats.totalResearch - 1);
            }
            else {
                this.settings.researchStats.researchCompleted = Math.max(0, this.settings.researchStats.researchCompleted - 1);
            }
            return { success: true, message: "Research quest deleted" };
        }
        return { success: false, message: "Research quest not found" };
    }
    /**
     * Update word count for a research quest (as user writes)
     */
    updateResearchWordCount(questId, newWordCount) {
        const researchQuest = this.settings.researchQuests.find(q => q.id === questId);
        if (researchQuest) {
            researchQuest.wordCount = newWordCount;
            return true;
        }
        return false;
    }
    /**
     * Get current combat:research ratio
     */
    getResearchRatio() {
        const stats = this.settings.researchStats;
        const ratio = stats.totalCombat / Math.max(1, stats.totalResearch);
        return {
            combat: stats.totalCombat,
            research: stats.totalResearch,
            ratio: ratio.toFixed(2)
        };
    }
    /**
     * Check if user can create more research quests
     * Rule: Must have 2:1 combat to research ratio
     */
    canCreateResearchQuest() {
        const stats = this.settings.researchStats;
        const ratio = stats.totalCombat / Math.max(1, stats.totalResearch);
        return ratio >= 2;
    }
    /**
     * Get active (not completed) research quests
     */
    getActiveResearchQuests() {
        return this.settings.researchQuests.filter(q => !q.completed);
    }
    /**
     * Get completed research quests
     */
    getCompletedResearchQuests() {
        return this.settings.researchQuests.filter(q => q.completed);
    }
    /**
     * Validate word count status for a quest
     * Returns: { status: 'too_short' | 'perfect' | 'overage' | 'locked', percent: number }
     */
    validateWordCount(questId, wordCount) {
        const quest = this.settings.researchQuests.find(q => q.id === questId);
        if (!quest) {
            return { status: 'too_short', percent: 0, message: "Quest not found" };
        }
        const percent = (wordCount / quest.wordLimit) * 100;
        if (percent < 80) {
            return { status: 'too_short', percent, message: `Too short (${Math.ceil(percent)}%). Need 80% minimum.` };
        }
        if (percent <= 100) {
            return { status: 'perfect', percent, message: `Perfect range (${Math.ceil(percent)}%)` };
        }
        if (percent <= 125) {
            const tax = Math.floor(20 * ((percent - 100) / 100));
            return { status: 'overage', percent, message: `Overage warning: -${tax}g tax` };
        }
        return { status: 'locked', percent, message: `Locked! Maximum 125% of word limit.` };
    }
}

/**
 * DLC 4: Quest Chains Engine
 * Handles multi-quest sequences with ordering, locking, and completion tracking
 *
 * ISOLATED: Only reads/writes to activeChains, chainHistory, currentChainId, chainQuestsCompleted
 * DEPENDENCIES: SisyphusSettings types
 * INTEGRATION POINTS: Needs to hook into completeQuest() in main engine for chain progression
 */
class ChainsEngine {
    constructor(settings, audioController) {
        this.settings = settings;
        this.audioController = audioController;
    }
    /**
     * Create a new quest chain
     */
    createQuestChain(name, questNames) {
        return __awaiter(this, void 0, void 0, function* () {
            if (questNames.length < 2) {
                return {
                    success: false,
                    message: "Chain must have at least 2 quests"
                };
            }
            const chainId = `chain_${Date.now()}`;
            const chain = {
                id: chainId,
                name: name,
                quests: questNames,
                currentIndex: 0,
                completed: false,
                startedAt: new Date().toISOString(),
                isBoss: questNames[questNames.length - 1].toLowerCase().includes("boss")
            };
            this.settings.activeChains.push(chain);
            this.settings.currentChainId = chainId;
            return {
                success: true,
                message: `Chain created: ${name} (${questNames.length} quests)`,
                chainId: chainId
            };
        });
    }
    /**
     * Get the current active chain
     */
    getActiveChain() {
        if (!this.settings.currentChainId)
            return null;
        const chain = this.settings.activeChains.find(c => c.id === this.settings.currentChainId);
        return (chain && !chain.completed) ? chain : null;
    }
    /**
     * Get the next quest that should be completed in the active chain
     */
    getNextQuestInChain() {
        const chain = this.getActiveChain();
        if (!chain)
            return null;
        return chain.quests[chain.currentIndex] || null;
    }
    /**
     * Check if a quest is part of an active (incomplete) chain
     */
    isQuestInChain(questName) {
        const chain = this.settings.activeChains.find(c => !c.completed);
        if (!chain)
            return false;
        return chain.quests.includes(questName);
    }
    /**
     * Check if a quest can be started (is it the next quest in the chain?)
     */
    canStartQuest(questName) {
        const chain = this.getActiveChain();
        if (!chain)
            return true; // Not in a chain, can start any quest
        const nextQuest = this.getNextQuestInChain();
        return nextQuest === questName;
    }
    /**
     * Mark a quest as completed in the chain
     * Advances chain if successful, awards bonus XP if chain completes
     */
    completeChainQuest(questName) {
        return __awaiter(this, void 0, void 0, function* () {
            const chain = this.getActiveChain();
            if (!chain) {
                return { success: false, message: "No active chain", chainComplete: false, bonusXp: 0 };
            }
            const currentQuest = chain.quests[chain.currentIndex];
            if (currentQuest !== questName) {
                return {
                    success: false,
                    message: "Quest is not next in chain",
                    chainComplete: false,
                    bonusXp: 0
                };
            }
            chain.currentIndex++;
            this.settings.chainQuestsCompleted++;
            // Check if chain is complete
            if (chain.currentIndex >= chain.quests.length) {
                return this.completeChain(chain);
            }
            const remaining = chain.quests.length - chain.currentIndex;
            const percent = Math.floor((chain.currentIndex / chain.quests.length) * 100);
            return {
                success: true,
                message: `Chain progress: ${chain.currentIndex}/${chain.quests.length} (${remaining} remaining, ${percent}% complete)`,
                chainComplete: false,
                bonusXp: 0
            };
        });
    }
    /**
     * Complete the entire chain
     */
    completeChain(chain) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            chain.completed = true;
            chain.completedAt = new Date().toISOString();
            const bonusXp = 100;
            this.settings.xp += bonusXp;
            const record = {
                chainId: chain.id,
                chainName: chain.name,
                totalQuests: chain.quests.length,
                completedAt: chain.completedAt,
                xpEarned: bonusXp
            };
            this.settings.chainHistory.push(record);
            if ((_a = this.audioController) === null || _a === void 0 ? void 0 : _a.playSound) {
                this.audioController.playSound("success");
            }
            return {
                success: true,
                message: `Chain complete: ${chain.name}! +${bonusXp} XP Bonus`,
                chainComplete: true,
                bonusXp: bonusXp
            };
        });
    }
    /**
     * Break an active chain
     * Keeps earned XP from completed quests
     */
    breakChain() {
        return __awaiter(this, void 0, void 0, function* () {
            const chain = this.getActiveChain();
            if (!chain) {
                return { success: false, message: "No active chain to break", xpKept: 0 };
            }
            const completed = chain.currentIndex;
            const xpKept = completed * 10; // Approximate XP from each quest
            // Save to history as broken
            const record = {
                chainId: chain.id,
                chainName: chain.name,
                totalQuests: chain.quests.length,
                completedAt: new Date().toISOString(),
                xpEarned: xpKept
            };
            this.settings.chainHistory.push(record);
            this.settings.activeChains = this.settings.activeChains.filter(c => c.id !== chain.id);
            this.settings.currentChainId = "";
            return {
                success: true,
                message: `Chain broken: ${chain.name}. Kept ${completed} quest completions (${xpKept} XP).`,
                xpKept: xpKept
            };
        });
    }
    /**
     * Get progress of active chain
     */
    getChainProgress() {
        const chain = this.getActiveChain();
        if (!chain)
            return { completed: 0, total: 0, percent: 0 };
        return {
            completed: chain.currentIndex,
            total: chain.quests.length,
            percent: Math.floor((chain.currentIndex / chain.quests.length) * 100)
        };
    }
    /**
     * Get all completed chain records (history)
     */
    getChainHistory() {
        return this.settings.chainHistory;
    }
    /**
     * Get all active chains (not completed)
     */
    getActiveChains() {
        return this.settings.activeChains.filter(c => !c.completed);
    }
    /**
     * Get detailed state of active chain (for UI rendering)
     */
    getChainDetails() {
        const chain = this.getActiveChain();
        if (!chain) {
            return { chain: null, progress: { completed: 0, total: 0, percent: 0 }, questStates: [] };
        }
        const progress = this.getChainProgress();
        const questStates = chain.quests.map((quest, idx) => {
            if (idx < chain.currentIndex) {
                return { quest, status: 'completed' };
            }
            else if (idx === chain.currentIndex) {
                return { quest, status: 'active' };
            }
            else {
                return { quest, status: 'locked' };
            }
        });
        return { chain, progress, questStates };
    }
}

/**
 * DLC 5: Context Filters Engine
 * Handles quest filtering by energy level, location context, and custom tags
 *
 * ISOLATED: Only reads/writes to questFilters, filterState
 * DEPENDENCIES: SisyphusSettings types, TFile (for quest metadata)
 * NOTE: This is primarily a VIEW LAYER concern, but keeping logic isolated is good
 */
class FiltersEngine {
    constructor(settings) {
        this.settings = settings;
    }
    /**
     * Set filter for a specific quest
     */
    setQuestFilter(questName, energy, context, tags) {
        this.settings.questFilters[questName] = {
            energyLevel: energy,
            context: context,
            tags: tags
        };
    }
    /**
     * Get filter for a specific quest
     */
    getQuestFilter(questName) {
        return this.settings.questFilters[questName] || null;
    }
    /**
     * Update the active filter state
     */
    setFilterState(energy, context, tags) {
        this.settings.filterState = {
            activeEnergy: energy,
            activeContext: context,
            activeTags: tags
        };
    }
    /**
     * Get current filter state
     */
    getFilterState() {
        return this.settings.filterState;
    }
    /**
     * Check if a quest matches current filter state
     */
    questMatchesFilter(questName) {
        const filters = this.settings.filterState;
        const questFilter = this.settings.questFilters[questName];
        // If no filter set for this quest, always show
        if (!questFilter)
            return true;
        // Energy filter
        if (filters.activeEnergy !== "any" && questFilter.energyLevel !== filters.activeEnergy) {
            return false;
        }
        // Context filter
        if (filters.activeContext !== "any" && questFilter.context !== filters.activeContext) {
            return false;
        }
        // Tags filter (requires ANY of the active tags)
        if (filters.activeTags.length > 0) {
            const hasTag = filters.activeTags.some((tag) => questFilter.tags.includes(tag));
            if (!hasTag)
                return false;
        }
        return true;
    }
    /**
     * Filter a list of quests based on current filter state
     */
    filterQuests(quests) {
        return quests.filter(quest => {
            const questName = quest.basename || quest.name;
            return this.questMatchesFilter(questName);
        });
    }
    /**
     * Get quests by specific energy level
     */
    getQuestsByEnergy(energy, quests) {
        return quests.filter(q => {
            const questName = q.basename || q.name;
            const filter = this.settings.questFilters[questName];
            return filter && filter.energyLevel === energy;
        });
    }
    /**
     * Get quests by specific context
     */
    getQuestsByContext(context, quests) {
        return quests.filter(q => {
            const questName = q.basename || q.name;
            const filter = this.settings.questFilters[questName];
            return filter && filter.context === context;
        });
    }
    /**
     * Get quests by specific tags
     */
    getQuestsByTags(tags, quests) {
        return quests.filter(q => {
            const questName = q.basename || q.name;
            const filter = this.settings.questFilters[questName];
            if (!filter)
                return false;
            return tags.some(tag => filter.tags.includes(tag));
        });
    }
    /**
     * Clear all active filters
     */
    clearFilters() {
        this.settings.filterState = {
            activeEnergy: "any",
            activeContext: "any",
            activeTags: []
        };
    }
    /**
     * Get all unique tags used across all quests
     */
    getAvailableTags() {
        const tags = new Set();
        for (const questName in this.settings.questFilters) {
            const filter = this.settings.questFilters[questName];
            filter.tags.forEach((tag) => tags.add(tag));
        }
        return Array.from(tags).sort();
    }
    /**
     * Get summary stats about filtered state
     */
    getFilterStats(allQuests) {
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
    toggleEnergyFilter(energy) {
        if (this.settings.filterState.activeEnergy === energy) {
            this.settings.filterState.activeEnergy = "any";
        }
        else {
            this.settings.filterState.activeEnergy = energy;
        }
    }
    /**
     * Toggle context filter
     */
    toggleContextFilter(context) {
        if (this.settings.filterState.activeContext === context) {
            this.settings.filterState.activeContext = "any";
        }
        else {
            this.settings.filterState.activeContext = context;
        }
    }
    /**
     * Toggle a tag in the active tag list
     */
    toggleTag(tag) {
        const idx = this.settings.filterState.activeTags.indexOf(tag);
        if (idx >= 0) {
            this.settings.filterState.activeTags.splice(idx, 1);
        }
        else {
            this.settings.filterState.activeTags.push(tag);
        }
    }
}

// DEFAULT CONSTANTS
const DEFAULT_MODIFIER = { name: "Clear Skies", desc: "No effects.", xpMult: 1, goldMult: 1, priceMult: 1, icon: "☀️" };
const CHAOS_TABLE = [
    { name: "Clear Skies", desc: "Normal.", xpMult: 1, goldMult: 1, priceMult: 1, icon: "☀️" },
    { name: "Flow State", desc: "+50% XP.", xpMult: 1.5, goldMult: 1, priceMult: 1, icon: "🌊" },
    { name: "Windfall", desc: "+50% Gold.", xpMult: 1, goldMult: 1.5, priceMult: 1, icon: "💰" },
    { name: "Inflation", desc: "Prices 2x.", xpMult: 1, goldMult: 1, priceMult: 2, icon: "📈" },
    { name: "Brain Fog", desc: "XP 0.5x.", xpMult: 0.5, goldMult: 1, priceMult: 1, icon: "🌫️" },
    { name: "Rival Sabotage", desc: "Gold 0.5x.", xpMult: 1, goldMult: 0.5, priceMult: 1, icon: "🕵️" },
    { name: "Adrenaline", desc: "2x XP, -5 HP/Q.", xpMult: 2, goldMult: 1, priceMult: 1, icon: "💉" }
];
// DLC 1: Mission Pool
const MISSION_POOL = [
    { id: "morning_win", name: "☀️ Morning Win", desc: "Complete 1 Trivial quest before 10 AM", target: 1, reward: { xp: 0, gold: 15 }, check: "morning_trivial" },
    { id: "momentum", name: "🔥 Momentum", desc: "Complete 3 quests today", target: 3, reward: { xp: 20, gold: 0 }, check: "quest_count" },
    { id: "zero_inbox", name: "🧘 Zero Inbox", desc: "Process all scraps (0 remaining)", target: 1, reward: { xp: 0, gold: 10 }, check: "zero_scraps" },
    { id: "specialist", name: "🎯 Specialist", desc: "Use the same skill 3 times", target: 3, reward: { xp: 15, gold: 0 }, check: "skill_repeat" },
    { id: "high_stakes", name: "💪 High Stakes", desc: "Complete 1 High Stakes quest", target: 1, reward: { xp: 0, gold: 30 }, check: "high_stakes" },
    { id: "speed_demon", name: "⚡ Speed Demon", desc: "Complete quest within 2h of creation", target: 1, reward: { xp: 25, gold: 0 }, check: "fast_complete" },
    { id: "synergist", name: "🔗 Synergist", desc: "Complete quest with Primary + Secondary skill", target: 1, reward: { xp: 0, gold: 10 }, check: "synergy" },
    { id: "survivor", name: "🛡️ Survivor", desc: "Don't take any damage today", target: 1, reward: { xp: 0, gold: 20 }, check: "no_damage" },
    { id: "risk_taker", name: "🎲 Risk Taker", desc: "Complete Difficulty 4+ quest", target: 1, reward: { xp: 15, gold: 0 }, check: "hard_quest" }
];
class SisyphusEngine {
    constructor(app, plugin, audio) {
        this.app = app;
        this.plugin = plugin;
        this.audio = audio;
        this.analyticsEngine = new AnalyticsEngine(this.settings, this.audio);
        this.meditationEngine = new MeditationEngine(this.settings, this.audio);
        this.researchEngine = new ResearchEngine(this.settings, this.audio);
        this.chainsEngine = new ChainsEngine(this.settings, this.audio);
        this.filtersEngine = new FiltersEngine(this.settings);
    }
    get settings() { return this.plugin.settings; }
    set settings(val) { this.plugin.settings = val; }
    save() {
        return __awaiter(this, void 0, void 0, function* () { yield this.plugin.saveSettings(); this.plugin.refreshUI(); });
    }
    // DLC 1: Daily Missions
    rollDailyMissions() {
        const available = [...MISSION_POOL];
        const selected = [];
        for (let i = 0; i < 3; i++) {
            if (available.length === 0)
                break;
            const idx = Math.floor(Math.random() * available.length);
            const mission = available.splice(idx, 1)[0];
            selected.push(Object.assign(Object.assign({}, mission), { checkFunc: mission.check, progress: 0, completed: false }));
        }
        this.settings.dailyMissions = selected;
        this.settings.dailyMissionDate = obsidian.moment().format("YYYY-MM-DD");
        this.settings.questsCompletedToday = 0;
        this.settings.skillUsesToday = {};
    }
    checkDailyMissions(context) {
        const now = obsidian.moment();
        this.settings.dailyMissions.forEach(mission => {
            if (mission.completed)
                return;
            switch (mission.checkFunc) {
                case "morning_trivial":
                    if (context.type === "complete" && context.difficulty === 1 && now.hour() < 10) {
                        mission.progress++;
                    }
                    break;
                case "quest_count":
                    if (context.type === "complete") {
                        mission.progress = this.settings.questsCompletedToday;
                    }
                    break;
                case "high_stakes":
                    if (context.type === "complete" && context.highStakes) {
                        mission.progress++;
                    }
                    break;
                case "fast_complete":
                    if (context.type === "complete" && context.questCreated) {
                        const elapsed = obsidian.moment().diff(obsidian.moment(context.questCreated), 'hours');
                        if (elapsed <= 2)
                            mission.progress++;
                    }
                    break;
                case "synergy":
                    if (context.type === "complete" && context.skill && context.secondarySkill && context.secondarySkill !== "None") {
                        mission.progress++;
                    }
                    break;
                case "no_damage":
                    if (context.type === "damage") {
                        mission.progress = 0;
                    }
                    break;
                case "hard_quest":
                    if (context.type === "complete" && context.difficulty && context.difficulty >= 4) {
                        mission.progress++;
                    }
                    break;
                case "skill_repeat":
                    if (context.type === "complete" && context.skill) {
                        this.settings.skillUsesToday[context.skill] = (this.settings.skillUsesToday[context.skill] || 0) + 1;
                        const skillUseValues = [];
                        for (const key in this.settings.skillUsesToday) {
                            skillUseValues.push(this.settings.skillUsesToday[key]);
                        }
                        const maxUses = skillUseValues.length > 0 ? Math.max(...skillUseValues) : 0;
                        mission.progress = maxUses;
                    }
                    break;
            }
            if (mission.progress >= mission.target && !mission.completed) {
                mission.completed = true;
                this.settings.xp += mission.reward.xp;
                this.settings.gold += mission.reward.gold;
                new obsidian.Notice(`✅ Daily Mission Complete: ${mission.name}`);
                this.audio.playSound("success");
            }
        });
        this.save();
    }
    getDifficultyNumber(diffLabel) {
        if (diffLabel === "Trivial")
            return 1;
        if (diffLabel === "Easy")
            return 2;
        if (diffLabel === "Medium")
            return 3;
        if (diffLabel === "Hard")
            return 4;
        if (diffLabel === "SUICIDE")
            return 5;
        return 3;
    }
    checkDailyLogin() {
        return __awaiter(this, void 0, void 0, function* () {
            const today = obsidian.moment().format("YYYY-MM-DD");
            if (this.settings.lastLogin) {
                const lastDate = obsidian.moment(this.settings.lastLogin);
                const todayMoment = obsidian.moment();
                const daysDiff = todayMoment.diff(lastDate, 'days');
                if (daysDiff > 1) {
                    const rotDamage = (daysDiff - 1) * 10;
                    if (rotDamage > 0) {
                        this.settings.hp -= rotDamage;
                        this.settings.history.push({ date: today, status: "rot", xpEarned: -rotDamage });
                    }
                }
            }
            if (this.settings.lastLogin !== today) {
                this.analyticsEngine.updateStreak();
                this.settings.maxHp = 100 + (this.settings.level * 5);
                this.settings.hp = Math.min(this.settings.maxHp, this.settings.hp + 20);
                this.settings.damageTakenToday = 0;
                this.settings.lockdownUntil = "";
                const todayMoment = obsidian.moment();
                this.settings.skills.forEach(s => {
                    if (s.lastUsed) {
                        const diff = todayMoment.diff(obsidian.moment(s.lastUsed), 'days');
                        if (diff > 3) {
                            if (!this.isResting()) {
                                s.rust = Math.min(10, (s.rust || 0) + 1);
                                s.xpReq = Math.floor(s.xpReq * 1.1);
                            }
                        }
                    }
                });
                if (!this.settings.history.find(h => h.date === this.settings.lastLogin)) {
                    this.settings.history.push({ date: this.settings.lastLogin, status: "skip", xpEarned: 0 });
                }
                this.settings.lastLogin = today;
                this.settings.history.push({ date: today, status: "success", xpEarned: 0 });
                if (this.settings.history.length > 14)
                    this.settings.history.shift();
                // DLC 1: Roll daily missions
                if (this.settings.dailyMissionDate !== today) {
                    this.rollDailyMissions();
                }
                yield this.rollChaos(true);
                yield this.save();
            }
        });
    }
    completeQuest(file) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            this.analyticsEngine.trackDailyMetrics("quest_complete", 1);
            this.settings.researchStats.totalCombat++;
            if (this.isLockedDown()) {
                new obsidian.Notice("LOCKDOWN ACTIVE");
                return;
            }
            const fm = (_a = this.app.metadataCache.getFileCache(file)) === null || _a === void 0 ? void 0 : _a.frontmatter;
            if (!fm)
                return;
            // DLC 4: Check if quest is in active chain and allowed
            const questName = file.basename;
            if (this.isQuestInChain(questName) && !this.canStartQuest(questName)) {
                new obsidian.Notice("Quest locked in chain. Complete the active quest first.");
                return;
            }
            let xp = (fm.xp_reward || 20) * this.settings.dailyModifier.xpMult;
            let gold = (fm.gold_reward || 0) * this.settings.dailyModifier.goldMult;
            const skillName = fm.skill || "None";
            const secondary = fm.secondary_skill || "None";
            this.audio.playSound("success");
            const skill = this.settings.skills.find(s => s.name === skillName);
            if (skill) {
                if (skill.rust > 0) {
                    skill.rust = 0;
                    skill.xpReq = Math.floor(skill.xpReq / 1.2);
                    new obsidian.Notice(`✨ ${skill.name}: Rust Cleared!`);
                }
                skill.lastUsed = new Date().toISOString();
                skill.xp += 1;
                if (skill.xp >= skill.xpReq) {
                    skill.level++;
                    skill.xp = 0;
                    new obsidian.Notice(`🧠 ${skill.name} Up!`);
                }
                if (secondary && secondary !== "None") {
                    const secSkill = this.settings.skills.find(s => s.name === secondary);
                    if (secSkill) {
                        if (!skill.connections)
                            skill.connections = [];
                        if (!skill.connections.includes(secondary)) {
                            skill.connections.push(secondary);
                            new obsidian.Notice(`🔗 Neural Link Established`);
                        }
                        xp += Math.floor(secSkill.level * 0.5);
                        secSkill.xp += 0.5;
                    }
                }
            }
            if (this.settings.dailyModifier.name === "Adrenaline")
                this.settings.hp -= 5;
            this.settings.xp += xp;
            this.settings.gold += gold;
            if (this.settings.xp >= this.settings.xpReq) {
                this.settings.level++;
                this.settings.rivalDmg += 5;
                this.settings.xp = 0;
                this.settings.xpReq = Math.floor(this.settings.xpReq * 1.1);
                this.settings.maxHp = 100 + (this.settings.level * 5);
                this.settings.hp = this.settings.maxHp;
                this.taunt("level_up");
            }
            // DLC 1: Track for daily missions
            this.settings.questsCompletedToday++;
            const questCreated = fm.created ? new Date(fm.created).getTime() : Date.now();
            const difficulty = this.getDifficultyNumber(fm.difficulty);
            this.checkDailyMissions({
                type: "complete",
                difficulty: difficulty,
                skill: skillName,
                secondarySkill: secondary,
                highStakes: fm.high_stakes,
                questCreated: questCreated
            });
            const archivePath = "Active_Run/Archive";
            if (!this.app.vault.getAbstractFileByPath(archivePath))
                yield this.app.vault.createFolder(archivePath);
            yield this.app.fileManager.processFrontMatter(file, (f) => { f.status = "completed"; f.completed_at = new Date().toISOString(); });
            yield this.app.fileManager.renameFile(file, `${archivePath}/${file.name}`);
            yield this.save();
        });
    }
    failQuest(file_1) {
        return __awaiter(this, arguments, void 0, function* (file, manualAbort = false) {
            if (this.isResting() && !manualAbort) {
                new obsidian.Notice("😴 Rest Day active. No damage.");
                return;
            }
            if (this.isShielded() && !manualAbort) {
                new obsidian.Notice(`🛡️ SHIELDED!`);
            }
            else {
                let damage = 10 + Math.floor(this.settings.rivalDmg / 2);
                if (this.settings.gold < -100)
                    damage *= 2;
                this.settings.hp -= damage;
                this.settings.damageTakenToday += damage;
                if (!manualAbort)
                    this.settings.rivalDmg += 1;
                this.audio.playSound("fail");
                this.taunt("fail");
                // DLC 1: Track damage
                this.checkDailyMissions({ type: "damage" });
                if (this.settings.damageTakenToday > 50) {
                    this.meditationEngine.triggerLockdown();
                    this.settings.lockdownUntil = obsidian.moment().add(6, 'hours').toISOString();
                    this.taunt("lockdown");
                    this.audio.playSound("death");
                }
                if (this.settings.hp <= 30) {
                    this.audio.playSound("heartbeat");
                    this.taunt("low_hp");
                }
            }
            const gravePath = "Graveyard/Failures";
            if (!this.app.vault.getAbstractFileByPath(gravePath))
                yield this.app.vault.createFolder(gravePath);
            yield this.app.fileManager.renameFile(file, `${gravePath}/[FAILED] ${file.name}`);
            yield this.save();
            if (this.settings.hp <= 0)
                this.triggerDeath();
        });
    }
    createQuest(name, diff, skill, secSkill, deadlineIso, highStakes, priority, isBoss) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isLockedDown()) {
                new obsidian.Notice("⛔ LOCKDOWN ACTIVE");
                return;
            }
            if (this.isResting() && highStakes) {
                new obsidian.Notice("Cannot deploy High Stakes on Rest Day.");
                return;
            }
            let xpReward = 0;
            let goldReward = 0;
            let diffLabel = "";
            if (isBoss) {
                xpReward = 1000;
                goldReward = 1000;
                diffLabel = "☠️ BOSS";
            }
            else {
                switch (diff) {
                    case 1:
                        xpReward = Math.floor(this.settings.xpReq * 0.05);
                        goldReward = 10;
                        diffLabel = "Trivial";
                        break;
                    case 2:
                        xpReward = Math.floor(this.settings.xpReq * 0.10);
                        goldReward = 20;
                        diffLabel = "Easy";
                        break;
                    case 3:
                        xpReward = Math.floor(this.settings.xpReq * 0.20);
                        goldReward = 40;
                        diffLabel = "Medium";
                        break;
                    case 4:
                        xpReward = Math.floor(this.settings.xpReq * 0.40);
                        goldReward = 80;
                        diffLabel = "Hard";
                        break;
                    case 5:
                        xpReward = Math.floor(this.settings.xpReq * 0.60);
                        goldReward = 150;
                        diffLabel = "SUICIDE";
                        break;
                }
            }
            if (highStakes && !isBoss) {
                goldReward = Math.floor(goldReward * 1.5);
            }
            let deadlineStr = "None";
            let deadlineFrontmatter = "";
            if (deadlineIso) {
                deadlineStr = obsidian.moment(deadlineIso).format("YYYY-MM-DD HH:mm");
                deadlineFrontmatter = `deadline: ${deadlineIso}`;
            }
            const rootPath = "Active_Run";
            const questsPath = "Active_Run/Quests";
            if (!this.app.vault.getAbstractFileByPath(rootPath))
                yield this.app.vault.createFolder(rootPath);
            if (!this.app.vault.getAbstractFileByPath(questsPath))
                yield this.app.vault.createFolder(questsPath);
            const safeName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const filename = `${questsPath}/${safeName}.md`;
            const content = `---
type: quest
status: active
difficulty: ${diffLabel}
priority: ${priority}
xp_reward: ${xpReward}
gold_reward: ${goldReward}
skill: ${skill}
secondary_skill: ${secSkill}
high_stakes: ${highStakes}
is_boss: ${isBoss}
created: ${new Date().toISOString()}
${deadlineFrontmatter}
---
# ⚔️ ${name}
> [!INFO] Mission
> **Pri:** ${priority} | **Diff:** ${diffLabel} | **Due:** ${deadlineStr}
> **Rwd:** ${xpReward} XP | ${goldReward} G
> **Neural Link:** ${skill} + ${secSkill}
`;
            if (this.app.vault.getAbstractFileByPath(filename)) {
                new obsidian.Notice("Exists!");
                return;
            }
            yield this.app.vault.create(filename, content);
            this.audio.playSound("click");
            setTimeout(() => this.plugin.refreshUI(), 200);
        });
    }
    deleteQuest(file) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.app.vault.delete(file);
            new obsidian.Notice("Deployment Aborted (Deleted)");
            this.plugin.refreshUI();
        });
    }
    checkDeadlines() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const folder = this.app.vault.getAbstractFileByPath("Active_Run/Quests");
            if (!(folder instanceof obsidian.TFolder))
                return;
            for (const file of folder.children) {
                if (file instanceof obsidian.TFile) {
                    const fm = (_a = this.app.metadataCache.getFileCache(file)) === null || _a === void 0 ? void 0 : _a.frontmatter;
                    if ((fm === null || fm === void 0 ? void 0 : fm.deadline) && obsidian.moment().isAfter(obsidian.moment(fm.deadline)))
                        yield this.failQuest(file);
                }
            }
            this.plugin.refreshUI();
        });
    }
    triggerDeath() {
        return __awaiter(this, void 0, void 0, function* () {
            this.audio.playSound("death");
            const earnedSouls = Math.floor(this.settings.level * 10 + this.settings.gold / 10);
            this.settings.legacy.souls += earnedSouls;
            this.settings.legacy.deathCount = (this.settings.legacy.deathCount || 0) + 1;
            const graveFile = "Graveyard/Chronicles.md";
            if (!this.app.vault.getAbstractFileByPath("Graveyard"))
                yield this.app.vault.createFolder("Graveyard");
            const deathMsg = `\n## Run #${this.settings.runCount} (${new Date().toISOString().split('T')[0]})\n- Lvl: ${this.settings.level}\n- Souls: ${earnedSouls}\n- Scars: ${this.settings.legacy.deathCount}`;
            const f = this.app.vault.getAbstractFileByPath(graveFile);
            if (f instanceof obsidian.TFile)
                yield this.app.vault.append(f, deathMsg);
            else
                yield this.app.vault.create(graveFile, "# Chronicles\n" + deathMsg);
            new obsidian.Notice(`💀 RUN ENDED.`);
            const activePath = "Active_Run";
            const graveyardPath = "Graveyard";
            const runName = `Run_Failed_${Date.now()}`;
            if (!this.app.vault.getAbstractFileByPath(graveyardPath))
                yield this.app.vault.createFolder(graveyardPath);
            const activeFolder = this.app.vault.getAbstractFileByPath(activePath);
            if (activeFolder instanceof obsidian.TFolder) {
                yield this.app.vault.createFolder(`${graveyardPath}/${runName}`);
                for (let child of activeFolder.children) {
                    yield this.app.fileManager.renameFile(child, `${graveyardPath}/${runName}/${child.name}`);
                }
            }
            const legacyBackup = this.settings.legacy;
            const runCount = this.settings.runCount + 1;
            this.settings.hp = 100;
            this.settings.maxHp = 100;
            this.settings.xp = 0;
            this.settings.gold = 0;
            this.settings.xpReq = 100;
            this.settings.level = 1;
            this.settings.rivalDmg = 10;
            this.settings.skills = [];
            this.settings.history = [];
            this.settings.damageTakenToday = 0;
            this.settings.lockdownUntil = "";
            this.settings.shieldedUntil = "";
            this.settings.restDayUntil = "";
            this.settings.dailyMissions = [];
            this.settings.dailyMissionDate = "";
            this.settings.questsCompletedToday = 0;
            this.settings.skillUsesToday = {};
            this.settings.legacy = legacyBackup;
            const baseStartGold = this.settings.legacy.perks.startGold || 0;
            const scarPenalty = Math.pow(0.9, this.settings.legacy.deathCount);
            this.settings.gold = Math.floor(baseStartGold * scarPenalty);
            this.settings.runCount = runCount;
            yield this.save();
        });
    }
    rollChaos() {
        return __awaiter(this, arguments, void 0, function* (showModal = false) {
            const roll = Math.random();
            if (roll < 0.4)
                this.settings.dailyModifier = DEFAULT_MODIFIER;
            else {
                const idx = Math.floor(Math.random() * (CHAOS_TABLE.length - 1)) + 1;
                this.settings.dailyModifier = CHAOS_TABLE[idx];
                if (this.settings.dailyModifier.name === "Rival Sabotage" && this.settings.gold > 10)
                    this.settings.gold = Math.floor(this.settings.gold * 0.9);
            }
            yield this.save();
            if (showModal)
                new ChaosModal(this.app, this.settings.dailyModifier).open();
        });
    }
    attemptRecovery() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isLockedDown()) {
                new obsidian.Notice("Not in Lockdown.");
                return;
            }
            const diff = obsidian.moment(this.settings.lockdownUntil).diff(obsidian.moment(), 'minutes');
            new obsidian.Notice(`Recovering... ${Math.floor(diff / 60)}h ${diff % 60}m remaining.`);
        });
    }
    isLockedDown() {
        if (!this.settings.lockdownUntil)
            return false;
        return obsidian.moment().isBefore(obsidian.moment(this.settings.lockdownUntil));
    }
    isResting() {
        if (!this.settings.restDayUntil)
            return false;
        return obsidian.moment().isBefore(obsidian.moment(this.settings.restDayUntil));
    }
    isShielded() {
        if (!this.settings.shieldedUntil)
            return false;
        return obsidian.moment().isBefore(obsidian.moment(this.settings.shieldedUntil));
    }
    taunt(trigger) {
        if (Math.random() < 0.2)
            return;
        const insults = {
            "fail": ["Focus.", "Again.", "Stay sharp."],
            "shield": ["Smart move.", "Bought some time."],
            "low_hp": ["Critical condition.", "Survive."],
            "level_up": ["Stronger.", "Scaling up."],
            "lockdown": ["Overheated. Cooling down.", "Forced rest."]
        };
        const msg = insults[trigger][Math.floor(Math.random() * insults[trigger].length)];
        new obsidian.Notice(`SYSTEM: "${msg}"`, 6000);
    }
    parseQuickInput(text) {
        if (this.isLockedDown()) {
            new obsidian.Notice("⛔ LOCKDOWN ACTIVE");
            return;
        }
        let diff = 3;
        let cleanText = text;
        if (text.match(/\/1/)) {
            diff = 1;
            cleanText = text.replace(/\/1/, "").trim();
        }
        else if (text.match(/\/2/)) {
            diff = 2;
            cleanText = text.replace(/\/2/, "").trim();
        }
        else if (text.match(/\/3/)) {
            diff = 3;
            cleanText = text.replace(/\/3/, "").trim();
        }
        else if (text.match(/\/4/)) {
            diff = 4;
            cleanText = text.replace(/\/4/, "").trim();
        }
        else if (text.match(/\/5/)) {
            diff = 5;
            cleanText = text.replace(/\/5/, "").trim();
        }
        const deadline = obsidian.moment().add(24, 'hours').toISOString();
        this.createQuest(cleanText, diff, "None", "None", deadline, false, "Normal", false);
    }
    // ===== DLC 2: RESEARCH QUEST SYSTEM =====
    createResearchQuest(title, type, linkedSkill, linkedCombatQuest) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.researchEngine.canCreateResearchQuest()) {
                new obsidian.Notice("BLOCKED");
                return;
            }
            if (this.isLockedDown()) {
                new obsidian.Notice("LOCKDOWN ACTIVE");
                return;
            }
            if (!this.settings.researchStats) {
                this.settings.researchStats = {
                    totalResearch: 0,
                    totalCombat: 0,
                    researchCompleted: 0,
                    combatCompleted: 0
                };
            }
            // Check 2:1 combat:research ratio enforcer
            const ratio = this.settings.researchStats.totalCombat / Math.max(1, this.settings.researchStats.totalResearch);
            if (ratio < 2) {
                new obsidian.Notice("RESEARCH BLOCKED: Complete 2 combat quests per research quest");
                return;
            }
            const wordLimit = type === "survey" ? 200 : 400;
            const questId = (this.settings.lastResearchQuestId || 0) + 1;
            const researchQuest = {
                id: `research_${questId}`,
                title: title,
                type: type,
                linkedSkill: linkedSkill,
                wordLimit: wordLimit,
                wordCount: 0,
                linkedCombatQuest: linkedCombatQuest,
                createdAt: new Date().toISOString(),
                completed: false
            };
            this.settings.researchQuests.push(researchQuest);
            this.settings.lastResearchQuestId = questId;
            this.settings.researchStats.totalResearch++;
            new obsidian.Notice(`Research Quest Created: ${type === "survey" ? "Survey" : "Deep Dive"} (${wordLimit} words)`);
            yield this.save();
        });
    }
    completeResearchQuest(questId, finalWordCount) {
        return __awaiter(this, void 0, void 0, function* () {
            const researchQuest = this.settings.researchQuests.find(q => q.id === questId);
            if (!researchQuest) {
                new obsidian.Notice("Research quest not found");
                return;
            }
            // Check word count
            if (finalWordCount < researchQuest.wordLimit * 0.8) {
                new obsidian.Notice("Quest too short! Minimum 80% of word limit required");
                return;
            }
            // Calculate penalty if over limit
            let xpReward = researchQuest.type === "survey" ? 5 : 20;
            let goldPenalty = 0;
            if (finalWordCount > researchQuest.wordLimit) {
                const overagePercent = ((finalWordCount - researchQuest.wordLimit) / researchQuest.wordLimit) * 100;
                if (overagePercent > 25) {
                    goldPenalty = Math.floor(20 * (overagePercent / 100));
                    new obsidian.Notice(`Word count tax: -${goldPenalty}g`);
                }
            }
            // Award XP to linked skill
            const skill = this.settings.skills.find(s => s.name === researchQuest.linkedSkill);
            if (skill) {
                skill.xp += xpReward;
                if (skill.xp >= skill.xpReq) {
                    skill.level++;
                    skill.xp = 0;
                    new obsidian.Notice(`Skill leveled: ${skill.name}`);
                }
            }
            this.settings.gold -= goldPenalty;
            researchQuest.completed = true;
            researchQuest.completedAt = new Date().toISOString();
            this.settings.researchStats.researchCompleted++;
            this.audio.playSound("success");
            yield this.save();
        });
    }
    deleteResearchQuest(questId) {
        const index = this.settings.researchQuests.findIndex(q => q.id === questId);
        if (index !== -1) {
            this.settings.researchQuests.splice(index, 1);
            this.settings.researchStats.totalResearch = Math.max(0, this.settings.researchStats.totalResearch - 1);
            new obsidian.Notice("Research quest deleted");
            this.save();
        }
    }
    updateResearchWordCount(questId, newWordCount) {
        const researchQuest = this.settings.researchQuests.find(q => q.id === questId);
        if (researchQuest) {
            researchQuest.wordCount = newWordCount;
            this.save();
        }
    }
    getResearchRatio() {
        const stats = this.settings.researchStats;
        const ratio = stats.totalCombat / Math.max(1, stats.totalResearch);
        return {
            combat: stats.totalCombat,
            research: stats.totalResearch,
            ratio: ratio.toFixed(2)
        };
    }
    canCreateResearchQuest() {
        const stats = this.settings.researchStats;
        const ratio = stats.totalCombat / Math.max(1, stats.totalResearch);
        return ratio >= 2;
    }
    // ===== DLC 3: MEDITATION & RECOVERY =====
    startMeditation() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isLockedDown()) {
                new obsidian.Notice("Not in lockdown. No need to meditate.");
                return;
            }
            if (this.settings.isMeditating) {
                new obsidian.Notice("Already meditating. Wait 30 seconds.");
                return;
            }
            this.settings.isMeditating = true;
            this.settings.meditationClicksThisLockdown++;
            this.playMeditationSound();
            const remaining = 10 - this.settings.meditationClicksThisLockdown;
            new obsidian.Notice(`Meditation (${this.settings.meditationClicksThisLockdown}/10) - ${remaining} cycles left`);
            if (this.settings.meditationClicksThisLockdown >= 10) {
                const reducedTime = obsidian.moment(this.settings.lockdownUntil).subtract(5, 'hours');
                this.settings.lockdownUntil = reducedTime.toISOString();
                this.settings.meditationClicksThisLockdown = 0;
                new obsidian.Notice("Meditation complete. Lockdown reduced by 5 hours.");
                this.audio.playSound("success");
            }
            // 30 second cooldown
            setTimeout(() => {
                this.settings.isMeditating = false;
                this.save();
            }, 30000);
            yield this.save();
        });
    }
    playMeditationSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.frequency.value = 432;
            oscillator.type = "sine";
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 1);
        }
        catch (e) {
            console.log("Audio not available");
        }
    }
    canDeleteQuest() {
        const today = obsidian.moment().format("YYYY-MM-DD");
        if (this.settings.lastDeletionReset !== today) {
            this.settings.lastDeletionReset = today;
            this.settings.questDeletionsToday = 0;
        }
        return this.settings.questDeletionsToday < 3;
    }
    deleteQuestWithCost(file) {
        return __awaiter(this, void 0, void 0, function* () {
            const today = obsidian.moment().format("YYYY-MM-DD");
            if (this.settings.lastDeletionReset !== today) {
                this.settings.lastDeletionReset = today;
                this.settings.questDeletionsToday = 0;
            }
            let cost = 0;
            if (this.settings.questDeletionsToday >= 3) {
                cost = 10;
                if (this.settings.gold < cost) {
                    new obsidian.Notice("Insufficient gold to delete this quest.");
                    return;
                }
            }
            this.settings.questDeletionsToday++;
            this.settings.gold -= cost;
            if (cost > 0) {
                new obsidian.Notice(`Quest deleted. Cost: -${cost}g`);
            }
            else {
                new obsidian.Notice(`Quest deleted. (${3 - this.settings.questDeletionsToday} free deletions remaining)`);
            }
            yield this.app.vault.delete(file);
            yield this.save();
        });
    }
    getMeditationStatus() {
        const cyclesDone = this.settings.meditationClicksThisLockdown;
        const cyclesRemaining = Math.max(0, 10 - cyclesDone);
        const timeReduced = (10 - cyclesRemaining) * 30;
        return {
            cyclesDone: cyclesDone,
            cyclesRemaining: cyclesRemaining,
            timeReduced: timeReduced
        };
    }
    getDeletionQuota() {
        const today = obsidian.moment().format("YYYY-MM-DD");
        if (this.settings.lastDeletionReset !== today) {
            this.settings.lastDeletionReset = today;
            this.settings.questDeletionsToday = 0;
        }
        const remaining = Math.max(0, 3 - this.settings.questDeletionsToday);
        return {
            free: Math.min(3, 3 - this.settings.questDeletionsToday),
            paid: Math.max(0, this.settings.questDeletionsToday - 3),
            remaining: remaining
        };
    }
    // ===== DLC 4: QUEST CHAINS =====
    createQuestChain(name, questNames) {
        return __awaiter(this, void 0, void 0, function* () {
            if (questNames.length < 2) {
                new obsidian.Notice("Chain must have at least 2 quests");
                return false;
            }
            const chainId = `chain_${Date.now()}`;
            const chain = {
                id: chainId,
                name: name,
                quests: questNames,
                currentIndex: 0,
                completed: false,
                startedAt: new Date().toISOString(),
                isBoss: questNames[questNames.length - 1].includes("boss")
            };
            this.settings.activeChains.push(chain);
            this.settings.currentChainId = chainId;
            new obsidian.Notice(`Chain created: ${name} (${questNames.length} quests)`);
            yield this.save();
            return true;
        });
    }
    getNextQuestInChain() {
        if (!this.settings.currentChainId)
            return null;
        const chain = this.settings.activeChains.find(c => c.id === this.settings.currentChainId);
        if (!chain || chain.completed)
            return null;
        return chain.quests[chain.currentIndex] || null;
    }
    isQuestInChain(questName) {
        const chain = this.settings.activeChains.find(c => !c.completed);
        if (!chain)
            return false;
        return chain.quests.includes(questName);
    }
    canStartQuest(questName) {
        const chain = this.settings.activeChains.find(c => !c.completed);
        if (!chain)
            return true;
        const nextQuest = this.getNextQuestInChain();
        return nextQuest === questName;
    }
    completeChainQuest(questName) {
        return __awaiter(this, void 0, void 0, function* () {
            const chain = this.settings.activeChains.find(c => !c.completed && c.quests.includes(questName));
            if (!chain)
                return;
            const currentQuest = chain.quests[chain.currentIndex];
            if (currentQuest !== questName) {
                new obsidian.Notice("Quest is not next in chain");
                return;
            }
            chain.currentIndex++;
            this.settings.chainQuestsCompleted++;
            if (chain.currentIndex >= chain.quests.length) {
                // Chain complete
                chain.completed = true;
                chain.completedAt = new Date().toISOString();
                this.settings.xp += 100;
                const record = {
                    chainId: chain.id,
                    chainName: chain.name,
                    totalQuests: chain.quests.length,
                    completedAt: chain.completedAt,
                    xpEarned: 100
                };
                this.settings.chainHistory.push(record);
                new obsidian.Notice(`Chain complete: ${chain.name}! +100 XP Bonus`);
                this.audio.playSound("success");
            }
            else {
                const remaining = chain.quests.length - chain.currentIndex;
                new obsidian.Notice(`Chain progress: ${chain.currentIndex + 1}/${chain.quests.length} (${remaining} remaining)`);
            }
            yield this.save();
        });
    }
    breakChain() {
        return __awaiter(this, void 0, void 0, function* () {
            const chain = this.settings.activeChains.find(c => c.id === this.settings.currentChainId);
            if (!chain)
                return;
            const completed = chain.currentIndex;
            const xpEarned = completed * 10;
            // Save to history even though broken
            const record = {
                chainId: chain.id,
                chainName: chain.name,
                totalQuests: chain.quests.length,
                completedAt: new Date().toISOString(),
                xpEarned: xpEarned
            };
            this.settings.chainHistory.push(record);
            this.settings.activeChains = this.settings.activeChains.filter(c => c.id !== chain.id);
            this.settings.currentChainId = "";
            new obsidian.Notice(`Chain broken: ${chain.name}. Kept ${completed} quest completions (${xpEarned} XP).`);
            yield this.save();
        });
    }
    getActiveChain() {
        return this.settings.activeChains.find(c => !c.completed && c.id === this.settings.currentChainId) || null;
    }
    getChainProgress() {
        const chain = this.getActiveChain();
        if (!chain)
            return { completed: 0, total: 0, percent: 0 };
        return {
            completed: chain.currentIndex,
            total: chain.quests.length,
            percent: Math.floor((chain.currentIndex / chain.quests.length) * 100)
        };
    }
    // ===== DLC 5: CONTEXT FILTERS =====
    setQuestFilter(questFile, energy, context, tags) {
        const questName = questFile.basename;
        this.settings.questFilters[questName] = {
            energyLevel: energy,
            context: context,
            tags: tags
        };
        new obsidian.Notice(`Quest tagged: ${energy} energy, ${context} context`);
        this.save();
    }
    setFilterState(energy, context, tags) {
        this.settings.filterState = {
            activeEnergy: energy,
            activeContext: context,
            activeTags: tags
        };
        new obsidian.Notice(`Filters set: ${energy} energy, ${context} context`);
        this.save();
    }
    getFilteredQuests(quests) {
        const filters = this.settings.filterState;
        return quests.filter(quest => {
            const questName = quest.basename || quest.name;
            const questFilter = this.settings.questFilters[questName];
            // If no filter set, show all
            if (!questFilter)
                return true;
            // Energy filter
            if (filters.activeEnergy !== "any" && questFilter.energyLevel !== filters.activeEnergy) {
                return false;
            }
            // Context filter
            if (filters.activeContext !== "any" && questFilter.context !== filters.activeContext) {
                return false;
            }
            // Tags filter
            if (filters.activeTags.length > 0) {
                const hasTag = filters.activeTags.some((tag) => questFilter.tags.includes(tag));
                if (!hasTag)
                    return false;
            }
            return true;
        });
    }
    getQuestsByEnergy(energy, quests) {
        return quests.filter(q => {
            const questName = q.basename || q.name;
            const filter = this.settings.questFilters[questName];
            return filter && filter.energyLevel === energy;
        });
    }
    getQuestsByContext(context, quests) {
        return quests.filter(q => {
            const questName = q.basename || q.name;
            const filter = this.settings.questFilters[questName];
            return filter && filter.context === context;
        });
    }
    getQuestsByTags(tags, quests) {
        return quests.filter(q => {
            const questName = q.basename || q.name;
            const filter = this.settings.questFilters[questName];
            if (!filter)
                return false;
            return tags.some(tag => filter.tags.includes(tag));
        });
    }
    clearFilters() {
        this.settings.filterState = {
            activeEnergy: "any",
            activeContext: "any",
            activeTags: []
        };
        new obsidian.Notice("All filters cleared");
        this.save();
    }
    getAvailableTags() {
        const tags = new Set();
        for (const questName in this.settings.questFilters) {
            const filter = this.settings.questFilters[questName];
            filter.tags.forEach((tag) => tags.add(tag));
        }
        return Array.from(tags).sort();
    }
    // ===== DLC 6: ANALYTICS & ENDGAME =====
    trackDailyMetrics(type, amount = 1) {
        const today = obsidian.moment().format("YYYY-MM-DD");
        let metric = this.settings.dayMetrics.find(m => m.date === today);
        if (!metric) {
            metric = {
                date: today,
                questsCompleted: 0,
                questsFailed: 0,
                xpEarned: 0,
                goldEarned: 0,
                damagesTaken: 0,
                skillsLeveled: [],
                chainsCompleted: 0
            };
            this.settings.dayMetrics.push(metric);
        }
        switch (type) {
            case "quest_complete":
                metric.questsCompleted += amount;
                break;
            case "quest_fail":
                metric.questsFailed += amount;
                break;
            case "xp":
                metric.xpEarned += amount;
                break;
            case "gold":
                metric.goldEarned += amount;
                break;
            case "damage":
                metric.damagesTaken += amount;
                break;
            case "skill_level":
                metric.skillsLeveled.push("Skill leveled");
                break;
            case "chain_complete":
                metric.chainsCompleted += amount;
                break;
        }
        this.save();
    }
    updateStreak() {
        const today = obsidian.moment().format("YYYY-MM-DD");
        const lastDate = this.settings.streak.lastDate;
        if (lastDate === today) {
            return; // Already counted today
        }
        const yesterday = obsidian.moment().subtract(1, 'day').format("YYYY-MM-DD");
        if (lastDate === yesterday) {
            this.settings.streak.current++;
            if (this.settings.streak.current > this.settings.streak.longest) {
                this.settings.streak.longest = this.settings.streak.current;
            }
        }
        else {
            this.settings.streak.current = 1;
        }
        this.settings.streak.lastDate = today;
        this.save();
    }
    initializeBossMilestones() {
        if (this.settings.bossMilestones.length === 0) {
            const milestones = [
                { level: 10, name: "The First Trial", unlocked: false, defeated: false, xpReward: 500 },
                { level: 20, name: "The Nemesis Returns", unlocked: false, defeated: false, xpReward: 1000 },
                { level: 30, name: "The Reaper Awakens", unlocked: false, defeated: false, xpReward: 1500 },
                { level: 50, name: "The Final Ascension", unlocked: false, defeated: false, xpReward: 5000 }
            ];
            this.settings.bossMilestones = milestones;
            this.save();
        }
    }
    checkBossMilestones() {
        if (!this.settings.bossMilestones || this.settings.bossMilestones.length === 0) {
            this.initializeBossMilestones();
        }
        this.settings.bossMilestones.forEach((boss) => {
            if (this.settings.level >= boss.level && !boss.unlocked) {
                boss.unlocked = true;
                new obsidian.Notice(`Boss Unlocked: ${boss.name} (Level ${boss.level})`);
                this.audio.playSound("success");
            }
        });
        this.save();
    }
    defeatBoss(level) {
        const boss = this.settings.bossMilestones.find((b) => b.level === level);
        if (!boss)
            return;
        boss.defeated = true;
        boss.defeatedAt = new Date().toISOString();
        this.settings.xp += boss.xpReward;
        new obsidian.Notice(`Boss Defeated: ${boss.name}! +${boss.xpReward} XP`);
        this.audio.playSound("success");
        // Check win condition
        if (level === 50) {
            this.winGame();
        }
        this.save();
    }
    winGame() {
        var _a;
        this.settings.gameWon = true;
        this.settings.endGameDate = new Date().toISOString();
        const totalTime = obsidian.moment(this.settings.endGameDate).diff(obsidian.moment((_a = this.settings.history[0]) === null || _a === void 0 ? void 0 : _a.date), 'days');
        this.settings.level;
        this.settings.gold;
        new obsidian.Notice(`VICTORY! You reached Level 50 in ${totalTime} days!`);
        this.audio.playSound("success");
        this.save();
    }
    generateWeeklyReport() {
        const week = obsidian.moment().week();
        const startDate = obsidian.moment().startOf('week').format("YYYY-MM-DD");
        const endDate = obsidian.moment().endOf('week').format("YYYY-MM-DD");
        const weekMetrics = this.settings.dayMetrics.filter((m) => obsidian.moment(m.date).isBetween(obsidian.moment(startDate), obsidian.moment(endDate), null, '[]'));
        const totalQuests = weekMetrics.reduce((sum, m) => sum + m.questsCompleted, 0);
        const totalFailed = weekMetrics.reduce((sum, m) => sum + m.questsFailed, 0);
        const successRate = totalQuests + totalFailed > 0 ? Math.round((totalQuests / (totalQuests + totalFailed)) * 100) : 0;
        const totalXp = weekMetrics.reduce((sum, m) => sum + m.xpEarned, 0);
        const totalGold = weekMetrics.reduce((sum, m) => sum + m.goldEarned, 0);
        const topSkills = this.settings.skills
            .sort((a, b) => (b.level - a.level))
            .slice(0, 3)
            .map((s) => s.name);
        const bestDay = weekMetrics.length > 0
            ? weekMetrics.reduce((max, m) => m.questsCompleted > max.questsCompleted ? m : max).date
            : startDate;
        const worstDay = weekMetrics.length > 0
            ? weekMetrics.reduce((min, m) => m.questsFailed > min.questsFailed ? m : min).date
            : startDate;
        const report = {
            week: week,
            startDate: startDate,
            endDate: endDate,
            totalQuests: totalQuests,
            successRate: successRate,
            totalXp: totalXp,
            totalGold: totalGold,
            topSkills: topSkills,
            bestDay: bestDay,
            worstDay: worstDay
        };
        this.settings.weeklyReports.push(report);
        new obsidian.Notice(`Weekly Report Generated (Week ${week})`);
        this.save();
        return report;
    }
    unlockAchievement(achievementId) {
        const achievement = this.settings.achievements.find((a) => a.id === achievementId);
        if (!achievement || achievement.unlocked)
            return;
        achievement.unlocked = true;
        achievement.unlockedAt = new Date().toISOString();
        new obsidian.Notice(`Achievement Unlocked: ${achievement.name}`);
        this.audio.playSound("success");
        this.save();
    }
    getGameStats() {
        return {
            level: this.settings.level,
            currentStreak: this.settings.streak.current,
            longestStreak: this.settings.streak.longest,
            totalQuests: this.settings.dayMetrics.reduce((sum, m) => sum + m.questsCompleted, 0),
            totalXp: this.settings.xp + this.settings.dayMetrics.reduce((sum, m) => sum + m.xpEarned, 0),
            gameWon: this.settings.gameWon,
            bossesFesDeated: this.settings.bossMilestones.filter((b) => b.defeated).length,
            totalBosses: this.settings.bossMilestones.length
        };
    }
}

class AudioController {
    constructor(muted) {
        this.audioCtx = null;
        this.brownNoiseNode = null;
        this.muted = false;
        this.muted = muted;
    }
    setMuted(muted) { this.muted = muted; }
    initAudio() { if (!this.audioCtx)
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    playTone(freq, type, duration, vol = 0.1) {
        if (this.muted)
            return;
        this.initAudio();
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        gain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, this.audioCtx.currentTime + duration);
        osc.stop(this.audioCtx.currentTime + duration);
    }
    playSound(type) {
        if (type === "success") {
            this.playTone(600, "sine", 0.1);
            setTimeout(() => this.playTone(800, "sine", 0.2), 100);
        }
        else if (type === "fail") {
            this.playTone(150, "sawtooth", 0.3);
            setTimeout(() => this.playTone(100, "sawtooth", 0.4), 150);
        }
        else if (type === "death") {
            this.playTone(50, "square", 1.0);
        }
        else if (type === "click") {
            this.playTone(800, "sine", 0.05);
        }
        else if (type === "heartbeat") {
            this.playTone(60, "sine", 0.1, 0.5);
            setTimeout(() => this.playTone(50, "sine", 0.1, 0.4), 150);
        }
        else if (type === "meditate") {
            this.playTone(432, "sine", 2.0, 0.05);
        }
    }
    toggleBrownNoise() {
        this.initAudio();
        if (this.brownNoiseNode) {
            this.brownNoiseNode.disconnect();
            this.brownNoiseNode = null;
            new obsidian.Notice("Focus Audio: OFF");
        }
        else {
            const bufferSize = 4096;
            this.brownNoiseNode = this.audioCtx.createScriptProcessor(bufferSize, 1, 1);
            let lastOut = 0;
            this.brownNoiseNode.onaudioprocess = (e) => {
                const output = e.outputBuffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    const white = Math.random() * 2 - 1;
                    output[i] = (lastOut + (0.02 * white)) / 1.02;
                    lastOut = output[i];
                    output[i] *= 3.5;
                }
            };
            const gain = this.audioCtx.createGain();
            gain.gain.value = 0.05;
            this.brownNoiseNode.connect(gain);
            gain.connect(this.audioCtx.destination);
            new obsidian.Notice("Focus Audio: ON");
        }
    }
}

const VIEW_TYPE_PANOPTICON = "sisyphus-panopticon";
class PanopticonView extends obsidian.ItemView {
    constructor(leaf, plugin) {
        super(leaf);
        this.plugin = plugin;
    }
    getViewType() { return VIEW_TYPE_PANOPTICON; }
    getDisplayText() { return "Eye Sisyphus"; }
    getIcon() { return "skull"; }
    onOpen() {
        return __awaiter(this, void 0, void 0, function* () { this.refresh(); });
    }
    refresh() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const c = this.contentEl;
            c.empty();
            const container = c.createDiv({ cls: "sisy-container" });
            const scroll = container.createDiv({ cls: "sisy-scroll-area" });
            // --- 1. HEADER & CRITICAL ALERTS ---
            scroll.createEl("h2", { text: "Eye SISYPHUS OS", cls: "sisy-header" });
            if (this.plugin.engine.isLockedDown()) {
                const l = scroll.createDiv({ cls: "sisy-alert sisy-alert-lockdown" });
                l.createEl("h3", { text: "LOCKDOWN ACTIVE" });
                const timeRemaining = obsidian.moment(this.plugin.settings.lockdownUntil).diff(obsidian.moment(), 'minutes');
                const hours = Math.floor(timeRemaining / 60);
                const mins = timeRemaining % 60;
                l.createEl("p", { text: `Time Remaining: ${hours}h ${mins}m` });
                const btn = l.createEl("button", { text: "ATTEMPT RECOVERY" });
                const medStatus = this.plugin.engine.getMeditationStatus();
                const medDiv = l.createDiv();
                medDiv.setAttribute("style", "margin-top: 10px; padding: 10px; background: rgba(170, 100, 255, 0.1); border-radius: 4px;");
                medDiv.createEl("p", { text: `Meditation: ${medStatus.cyclesDone}/10 (${medStatus.cyclesRemaining} left)` });
                const medBar = medDiv.createDiv();
                medBar.setAttribute("style", "height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; margin: 5px 0; overflow: hidden;");
                const medFill = medBar.createDiv();
                const medPercent = (medStatus.cyclesDone / 10) * 100;
                medFill.setAttribute("style", `width: ${medPercent}%; height: 100%; background: #aa64ff; transition: width 0.3s;`);
                const medBtn = medDiv.createEl("button", { text: "MEDITATE" });
                medBtn.setAttribute("style", "width: 100%; padding: 8px; margin-top: 5px; background: rgba(170, 100, 255, 0.3); border: 1px solid #aa64ff; color: #aa64ff; border-radius: 3px; cursor: pointer; font-weight: bold;");
                medBtn.onclick = () => {
                    this.plugin.engine.startMeditation();
                    setTimeout(() => this.refresh(), 100);
                };
                btn.addClass("sisy-btn");
                btn.onclick = () => this.plugin.engine.attemptRecovery();
            }
            if (this.plugin.engine.isResting()) {
                const r = scroll.createDiv({ cls: "sisy-alert sisy-alert-rest" });
                r.createEl("h3", { text: "REST DAY ACTIVE" });
                const timeRemaining = obsidian.moment(this.plugin.settings.restDayUntil).diff(obsidian.moment(), 'minutes');
                const hours = Math.floor(timeRemaining / 60);
                const mins = timeRemaining % 60;
                r.createEl("p", { text: `${hours}h ${mins}m remaining | No damage, Rust paused` });
            }
            // --- 2. HUD GRID (2x2) ---
            const hud = scroll.createDiv({ cls: "sisy-hud" });
            this.stat(hud, "HEALTH", `${this.plugin.settings.hp}/${this.plugin.settings.maxHp}`, this.plugin.settings.hp < 30 ? "sisy-critical" : "");
            this.stat(hud, "GOLD", `${this.plugin.settings.gold}`, this.plugin.settings.gold < 0 ? "sisy-val-debt" : "");
            this.stat(hud, "LEVEL", `${this.plugin.settings.level}`);
            this.stat(hud, "RIVAL DMG", `${this.plugin.settings.rivalDmg}`);
            // --- 3. THE ORACLE ---
            const oracle = scroll.createDiv({ cls: "sisy-oracle" });
            oracle.createEl("h4", { text: "ORACLE PREDICTION" });
            const survival = Math.floor(this.plugin.settings.hp / (this.plugin.settings.rivalDmg * (this.plugin.settings.gold < 0 ? 2 : 1)));
            let survText = `Survival: ${survival} days`;
            const isCrisis = this.plugin.settings.hp < 30 || this.plugin.settings.gold < 0;
            // Glitch Logic
            if (isCrisis && Math.random() < 0.3) {
                const glitches = ["[CORRUPTED]", "??? DAYS LEFT", "NO FUTURE", "RUN"];
                survText = glitches[Math.floor(Math.random() * glitches.length)];
            }
            const survEl = oracle.createDiv({ text: survText });
            if (survival < 2 || survText.includes("???") || survText.includes("CORRUPTED")) {
                survEl.setAttribute("style", "color:#ff5555; font-weight:bold; letter-spacing: 1px;");
            }
            const lights = oracle.createDiv({ cls: "sisy-status-lights" });
            if (this.plugin.settings.gold < 0)
                lights.createDiv({ text: "DEBT: YES", cls: "sisy-light-active" });
            // DLC 1: Scars display
            const scarCount = ((_a = this.plugin.settings.legacy) === null || _a === void 0 ? void 0 : _a.deathCount) || 0;
            if (scarCount > 0) {
                const scarEl = oracle.createDiv({ cls: "sisy-scar-display" });
                scarEl.createEl("span", { text: `Scars: ${scarCount}` });
                const penalty = Math.pow(0.9, scarCount);
                const percentLost = Math.floor((1 - penalty) * 100);
                scarEl.createEl("small", { text: `(-${percentLost}% starting gold)` });
            }
            // DLC 1: Next milestone
            const levelMilestones = [10, 20, 30, 50];
            const nextMilestone = levelMilestones.find(m => m > this.plugin.settings.level);
            if (nextMilestone) {
                const milestoneEl = oracle.createDiv({ cls: "sisy-milestone" });
                milestoneEl.createEl("span", { text: `Next Milestone: Level ${nextMilestone}` });
                if (nextMilestone === 10 || nextMilestone === 20 || nextMilestone === 30 || nextMilestone === 50) {
                    milestoneEl.createEl("small", { text: "(Boss Unlock)" });
                }
            }
            // --- 4. DAILY MISSIONS (DLC 1) ---
            scroll.createDiv({ text: "TODAYS OBJECTIVES", cls: "sisy-section-title" });
            this.renderDailyMissions(scroll);
            // --- 5. CONTROLS ---
            const ctrls = scroll.createDiv({ cls: "sisy-controls" });
            ctrls.createEl("button", { text: "DEPLOY", cls: "sisy-btn mod-cta" }).onclick = () => new QuestModal(this.app, this.plugin).open();
            ctrls.createEl("button", { text: "SHOP", cls: "sisy-btn" }).onclick = () => new ShopModal(this.app, this.plugin).open();
            ctrls.createEl("button", { text: "FOCUS", cls: "sisy-btn" }).onclick = () => this.plugin.audio.toggleBrownNoise();
            // --- 6. ACTIVE THREATS ---
            // --- DLC 5: CONTEXT FILTERS ---
            scroll.createDiv({ text: "FILTER CONTROLS", cls: "sisy-section-title" });
            this.renderFilterBar(scroll);
            // --- DLC 4: QUEST CHAINS ---
            const activeChain = this.plugin.engine.getActiveChain();
            if (activeChain) {
                scroll.createDiv({ text: "ACTIVE CHAIN", cls: "sisy-section-title" });
                this.renderChainSection(scroll);
            }
            // --- DLC 2: RESEARCH LIBRARY ---
            scroll.createDiv({ text: "RESEARCH LIBRARY", cls: "sisy-section-title" });
            this.renderResearchSection(scroll);
            // --- DLC 6: ANALYTICS & ENDGAME ---
            scroll.createDiv({ text: "ANALYTICS & PROGRESS", cls: "sisy-section-title" });
            this.renderAnalytics(scroll);
            // --- ACTIVE THREATS ---
            scroll.createDiv({ text: "ACTIVE THREATS", cls: "sisy-section-title" });
            yield this.renderQuests(scroll);
            scroll.createDiv({ text: "NEURAL HUB", cls: "sisy-section-title" });
            this.plugin.settings.skills.forEach((s, idx) => {
                const row = scroll.createDiv({ cls: "sisy-skill-row" });
                row.onclick = () => new SkillDetailModal(this.app, this.plugin, idx).open();
                const meta = row.createDiv({ cls: "sisy-skill-meta" });
                meta.createSpan({ text: s.name });
                meta.createSpan({ text: `Lvl ${s.level}` });
                if (s.rust > 0) {
                    meta.createSpan({ text: `RUST ${s.rust}`, cls: "sisy-rust-badge" });
                }
                const bar = row.createDiv({ cls: "sisy-bar-bg" });
                const fill = bar.createDiv({ cls: "sisy-bar-fill" });
                fill.setAttribute("style", `width: ${(s.xp / s.xpReq) * 100}%; background: ${s.rust > 0 ? '#d35400' : '#00b0ff'}`);
            });
            const addBtn = scroll.createDiv({ text: "+ Add Neural Node", cls: "sisy-add-skill" });
            addBtn.onclick = () => new SkillManagerModal(this.app, this.plugin).open();
            // --- 8. QUICK CAPTURE ---
            const footer = container.createDiv({ cls: "sisy-quick-capture" });
            const input = footer.createEl("input", { cls: "sisy-quick-input", placeholder: "Mission /1...5" });
            input.onkeydown = (e) => __awaiter(this, void 0, void 0, function* () {
                if (e.key === 'Enter' && input.value.trim()) {
                    this.plugin.engine.parseQuickInput(input.value.trim());
                    input.value = "";
                }
            });
        });
    }
    // DLC 1: Render Daily Missions
    renderDailyMissions(parent) {
        const missions = this.plugin.settings.dailyMissions || [];
        if (missions.length === 0) {
            parent.createDiv({ text: "No missions today. Check back tomorrow.", cls: "sisy-empty-state" });
            return;
        }
        const missionsDiv = parent.createDiv({ cls: "sisy-daily-missions" });
        missions.forEach((mission) => {
            const card = missionsDiv.createDiv({ cls: "sisy-mission-card" });
            if (mission.completed)
                card.addClass("sisy-mission-completed");
            const header = card.createDiv({ cls: "sisy-mission-header" });
            const statusIcon = mission.completed ? "YES" : "..";
            header.createEl("span", { text: statusIcon, cls: "sisy-mission-status" });
            header.createEl("span", { text: mission.name, cls: "sisy-mission-name" });
            card.createEl("p", { text: mission.desc, cls: "sisy-mission-desc" });
            const progress = card.createDiv({ cls: "sisy-mission-progress" });
            progress.createEl("span", { text: `${mission.progress}/${mission.target}`, cls: "sisy-mission-counter" });
            const bar = progress.createDiv({ cls: "sisy-bar-bg" });
            const fill = bar.createDiv({ cls: "sisy-bar-fill" });
            const percent = (mission.progress / mission.target) * 100;
            fill.setAttribute("style", `width: ${Math.min(percent, 100)}%`);
            const reward = card.createDiv({ cls: "sisy-mission-reward" });
            if (mission.reward.xp > 0)
                reward.createSpan({ text: `+${mission.reward.xp} XP`, cls: "sisy-reward-xp" });
            if (mission.reward.gold > 0)
                reward.createSpan({ text: `+${mission.reward.gold}g`, cls: "sisy-reward-gold" });
        });
        const allCompleted = missions.every(m => m.completed);
        if (allCompleted && missions.length > 0) {
            missionsDiv.createDiv({ text: "All Missions Complete! +50 Bonus Gold", cls: "sisy-mission-bonus" });
        }
    }
    // DLC 2: Render Research Quests Section
    renderResearchSection(parent) {
        const researchQuests = this.plugin.settings.researchQuests || [];
        const activeResearch = researchQuests.filter(q => !q.completed);
        const completedResearch = researchQuests.filter(q => q.completed);
        // Stats bar
        const stats = this.plugin.engine.getResearchRatio();
        const statsDiv = parent.createDiv({ cls: "sisy-research-stats" });
        statsDiv.setAttribute("style", "border: 1px solid #666; padding: 10px; border-radius: 4px; margin-bottom: 10px; background: rgba(170, 100, 255, 0.05);");
        const ratioText = statsDiv.createEl("p", { text: `Research Ratio: ${stats.combat}:${stats.research} (${stats.ratio}:1)` });
        ratioText.setAttribute("style", "margin: 5px 0; font-size: 0.9em;");
        if (!this.plugin.engine.canCreateResearchQuest()) {
            const warning = statsDiv.createEl("p", { text: "BLOCKED: Need 2 combat per 1 research" });
            warning.setAttribute("style", "color: orange; font-weight: bold; margin: 5px 0;");
        }
        // Active Research
        parent.createDiv({ text: "ACTIVE RESEARCH", cls: "sisy-section-title" });
        if (activeResearch.length === 0) {
            parent.createDiv({ text: "No active research.", cls: "sisy-empty-state" });
        }
        else {
            activeResearch.forEach((quest) => {
                const card = parent.createDiv({ cls: "sisy-research-card" });
                card.setAttribute("style", "border: 1px solid #aa64ff; padding: 10px; margin-bottom: 8px; border-radius: 4px; background: rgba(170, 100, 255, 0.05);");
                const header = card.createDiv();
                header.setAttribute("style", "display: flex; justify-content: space-between; margin-bottom: 6px;");
                const title = header.createEl("span", { text: quest.title });
                title.setAttribute("style", "font-weight: bold; flex: 1;");
                const typeLabel = header.createEl("span", { text: quest.type === "survey" ? "SURVEY" : "DEEP DIVE" });
                typeLabel.setAttribute("style", "font-size: 0.75em; padding: 2px 6px; background: rgba(170, 100, 255, 0.3); border-radius: 2px;");
                const wordCount = card.createEl("p", { text: `Words: ${quest.wordCount}/${quest.wordLimit}` });
                wordCount.setAttribute("style", "margin: 5px 0; font-size: 0.85em;");
                const bar = card.createDiv();
                bar.setAttribute("style", "height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; margin: 6px 0;");
                const fill = bar.createDiv();
                const percent = Math.min(100, (quest.wordCount / quest.wordLimit) * 100);
                fill.setAttribute("style", `width: ${percent}%; height: 100%; background: #aa64ff; transition: width 0.3s;`);
                const actions = card.createDiv();
                actions.setAttribute("style", "display: flex; gap: 5px; margin-top: 8px;");
                const viewBtn = actions.createEl("button", { text: "COMPLETE" });
                viewBtn.setAttribute("style", "flex: 1; padding: 6px; background: rgba(85, 255, 85, 0.2); border: 1px solid #55ff55; color: #55ff55; border-radius: 3px; cursor: pointer; font-size: 0.85em;");
                viewBtn.onclick = () => {
                    this.plugin.engine.completeResearchQuest(quest.id, quest.wordCount);
                    this.refresh();
                };
                const deleteBtn = actions.createEl("button", { text: "DELETE" });
                deleteBtn.setAttribute("style", "flex: 1; padding: 6px; background: rgba(255, 85, 85, 0.2); border: 1px solid #ff5555; color: #ff5555; border-radius: 3px; cursor: pointer; font-size: 0.85em;");
                deleteBtn.onclick = () => {
                    this.plugin.engine.deleteResearchQuest(quest.id);
                    this.refresh();
                };
            });
        }
        // Completed Research
        parent.createDiv({ text: "COMPLETED RESEARCH", cls: "sisy-section-title" });
        if (completedResearch.length === 0) {
            parent.createDiv({ text: "No completed research.", cls: "sisy-empty-state" });
        }
        else {
            completedResearch.forEach((quest) => {
                const item = parent.createEl("p", { text: `+ ${quest.title} (${quest.type === "survey" ? "Survey" : "Deep Dive"})` });
                item.setAttribute("style", "opacity: 0.6; font-size: 0.9em; margin: 3px 0;");
            });
        }
    }
    renderQuests(parent) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const folder = this.app.vault.getAbstractFileByPath("Active_Run/Quests");
            let count = 0;
            if (folder instanceof obsidian.TFolder) {
                const files = folder.children.filter(f => f instanceof obsidian.TFile);
                files.sort((a, b) => {
                    var _a, _b;
                    const fmA = (_a = this.app.metadataCache.getFileCache(a)) === null || _a === void 0 ? void 0 : _a.frontmatter;
                    const fmB = (_b = this.app.metadataCache.getFileCache(b)) === null || _b === void 0 ? void 0 : _b.frontmatter;
                    const dateA = (fmA === null || fmA === void 0 ? void 0 : fmA.deadline) ? obsidian.moment(fmA.deadline).valueOf() : 9999999999999;
                    const dateB = (fmB === null || fmB === void 0 ? void 0 : fmB.deadline) ? obsidian.moment(fmB.deadline).valueOf() : 9999999999999;
                    return dateA - dateB;
                });
                for (const file of files) {
                    count++;
                    const fm = (_a = this.app.metadataCache.getFileCache(file)) === null || _a === void 0 ? void 0 : _a.frontmatter;
                    const card = parent.createDiv({ cls: "sisy-card" });
                    if (fm === null || fm === void 0 ? void 0 : fm.is_boss)
                        card.addClass("sisy-card-boss");
                    const d = String((fm === null || fm === void 0 ? void 0 : fm.difficulty) || "").match(/\d/);
                    if (d)
                        card.addClass(`sisy-card-${d[0]}`);
                    // Top section with title and timer
                    const top = card.createDiv({ cls: "sisy-card-top" });
                    top.createDiv({ text: file.basename, cls: "sisy-card-title" });
                    // Timer
                    if (fm === null || fm === void 0 ? void 0 : fm.deadline) {
                        const diff = obsidian.moment(fm.deadline).diff(obsidian.moment(), 'minutes');
                        const hours = Math.floor(diff / 60);
                        const mins = diff % 60;
                        const timerText = diff < 0 ? "EXPIRED" : `${hours}h ${mins}m`;
                        const timer = top.createDiv({ text: timerText, cls: "sisy-timer" });
                        if (diff < 60)
                            timer.addClass("sisy-timer-late");
                    }
                    // Trash icon (inline, not absolute)
                    const trash = top.createDiv({ cls: "sisy-trash", text: "[X]" });
                    trash.style.cursor = "pointer";
                    trash.style.color = "#ff5555";
                    trash.onclick = (e) => {
                        e.stopPropagation();
                        this.plugin.engine.deleteQuest(file);
                    };
                    // Action buttons
                    const acts = card.createDiv({ cls: "sisy-actions" });
                    const bD = acts.createEl("button", { text: "OK", cls: "sisy-action-btn mod-done" });
                    bD.onclick = () => this.plugin.engine.completeQuest(file);
                    const bF = acts.createEl("button", { text: "XX", cls: "sisy-action-btn mod-fail" });
                    bF.onclick = () => this.plugin.engine.failQuest(file, true);
                }
            }
            if (count === 0) {
                const idle = parent.createDiv({ text: "System Idle.", cls: "sisy-empty-state" });
                const ctaBtn = idle.createEl("button", { text: "[DEPLOY QUEST]", cls: "sisy-btn mod-cta" });
                ctaBtn.style.marginTop = "10px";
                ctaBtn.onclick = () => new QuestModal(this.app, this.plugin).open();
            }
        });
    }
    renderChainSection(parent) {
        const chain = this.plugin.engine.getActiveChain();
        if (!chain) {
            parent.createDiv({ text: "No active chain.", cls: "sisy-empty-state" });
            return;
        }
        const chainDiv = parent.createDiv({ cls: "sisy-chain-container" });
        chainDiv.setAttribute("style", "border: 1px solid #4caf50; padding: 12px; border-radius: 4px; background: rgba(76, 175, 80, 0.05); margin-bottom: 10px;");
        const header = chainDiv.createEl("h3", { text: chain.name });
        header.setAttribute("style", "margin: 0 0 10px 0; color: #4caf50;");
        const progress = this.plugin.engine.getChainProgress();
        const progressText = chainDiv.createEl("p", { text: `Progress: ${progress.completed}/${progress.total}` });
        progressText.setAttribute("style", "margin: 5px 0; font-size: 0.9em;");
        const bar = chainDiv.createDiv();
        bar.setAttribute("style", "height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; margin: 8px 0; overflow: hidden;");
        const fill = bar.createDiv();
        fill.setAttribute("style", `width: ${progress.percent}%; height: 100%; background: #4caf50; transition: width 0.3s;`);
        const questList = chainDiv.createDiv({ cls: "sisy-chain-quests" });
        questList.setAttribute("style", "margin: 10px 0; font-size: 0.85em;");
        chain.quests.forEach((quest, idx) => {
            const item = questList.createEl("p");
            const icon = idx < progress.completed ? "OK" : idx === progress.completed ? ">>>" : "LOCK";
            const status = idx < progress.completed ? "DONE" : idx === progress.completed ? "ACTIVE" : "LOCKED";
            item.setText(`[${icon}] ${quest} (${status})`);
            item.setAttribute("style", `margin: 3px 0; padding: 3px; 
                ${idx < progress.completed ? "opacity: 0.6;" : idx === progress.completed ? "font-weight: bold; color: #4caf50;" : "opacity: 0.4;"}`);
        });
        const actions = chainDiv.createDiv();
        actions.setAttribute("style", "display: flex; gap: 5px; margin-top: 10px;");
        const breakBtn = actions.createEl("button", { text: "BREAK CHAIN" });
        breakBtn.setAttribute("style", "flex: 1; padding: 6px; background: rgba(255, 85, 85, 0.2); border: 1px solid #ff5555; color: #ff5555; border-radius: 3px; cursor: pointer; font-size: 0.8em;");
        breakBtn.onclick = () => __awaiter(this, void 0, void 0, function* () {
            yield this.plugin.engine.breakChain();
            this.refresh();
        });
    }
    renderFilterBar(parent) {
        const filters = this.plugin.settings.filterState;
        const filterDiv = parent.createDiv({ cls: "sisy-filter-bar" });
        filterDiv.setAttribute("style", "border: 1px solid #0088ff; padding: 10px; border-radius: 4px; background: rgba(0, 136, 255, 0.05); margin-bottom: 15px;");
        // Energy filter
        const energyDiv = filterDiv.createDiv();
        energyDiv.setAttribute("style", "margin-bottom: 8px;");
        energyDiv.createEl("span", { text: "Energy: " }).setAttribute("style", "font-weight: bold;");
        const energyOptions = ["any", "high", "medium", "low"];
        energyOptions.forEach(opt => {
            const btn = energyDiv.createEl("button", { text: opt.toUpperCase() });
            btn.setAttribute("style", `margin: 0 3px; padding: 4px 8px; border-radius: 3px; cursor: pointer; 
                ${filters.activeEnergy === opt ? "background: #0088ff; color: white;" : "background: rgba(0, 136, 255, 0.2);"}`);
            btn.onclick = () => {
                this.plugin.engine.setFilterState(opt, filters.activeContext, filters.activeTags);
                this.refresh();
            };
        });
        // Context filter
        const contextDiv = filterDiv.createDiv();
        contextDiv.setAttribute("style", "margin-bottom: 8px;");
        contextDiv.createEl("span", { text: "Context: " }).setAttribute("style", "font-weight: bold;");
        const contextOptions = ["any", "home", "office", "anywhere"];
        contextOptions.forEach(opt => {
            const btn = contextDiv.createEl("button", { text: opt.toUpperCase() });
            btn.setAttribute("style", `margin: 0 3px; padding: 4px 8px; border-radius: 3px; cursor: pointer; 
                ${filters.activeContext === opt ? "background: #0088ff; color: white;" : "background: rgba(0, 136, 255, 0.2);"}`);
            btn.onclick = () => {
                this.plugin.engine.setFilterState(filters.activeEnergy, opt, filters.activeTags);
                this.refresh();
            };
        });
        // Clear button
        const clearBtn = filterDiv.createEl("button", { text: "CLEAR FILTERS" });
        clearBtn.setAttribute("style", "width: 100%; padding: 6px; margin-top: 8px; background: rgba(255, 85, 85, 0.2); border: 1px solid #ff5555; color: #ff5555; border-radius: 3px; cursor: pointer; font-weight: bold;");
        clearBtn.onclick = () => {
            this.plugin.engine.clearFilters();
            this.refresh();
        };
    }
    renderAnalytics(parent) {
        const stats = this.plugin.engine.getGameStats();
        const analyticsDiv = parent.createDiv({ cls: "sisy-analytics" });
        analyticsDiv.setAttribute("style", "border: 1px solid #ffc107; padding: 12px; border-radius: 4px; background: rgba(255, 193, 7, 0.05); margin-bottom: 15px;");
        analyticsDiv.createEl("h3", { text: "ANALYTICS & PROGRESS" }).setAttribute("style", "margin: 0 0 10px 0; color: #ffc107;");
        // Stats grid
        const statsDiv = analyticsDiv.createDiv();
        statsDiv.setAttribute("style", "display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;");
        const stats_items = [
            { label: "Level", value: stats.level },
            { label: "Current Streak", value: stats.currentStreak },
            { label: "Longest Streak", value: stats.longestStreak },
            { label: "Total Quests", value: stats.totalQuests }
        ];
        stats_items.forEach(item => {
            const statBox = statsDiv.createDiv();
            statBox.setAttribute("style", "border: 1px solid #ffc107; padding: 8px; border-radius: 3px; background: rgba(255, 193, 7, 0.1);");
            statBox.createEl("p", { text: item.label }).setAttribute("style", "margin: 0; font-size: 0.8em; opacity: 0.7;");
            statBox.createEl("p", { text: String(item.value) }).setAttribute("style", "margin: 5px 0 0 0; font-size: 1.2em; font-weight: bold; color: #ffc107;");
        });
        // Boss progress
        analyticsDiv.createEl("h4", { text: "Boss Milestones" }).setAttribute("style", "margin: 12px 0 8px 0; color: #ffc107;");
        const bosses = this.plugin.settings.bossMilestones;
        if (bosses && bosses.length > 0) {
            bosses.forEach((boss) => {
                const bossItem = analyticsDiv.createDiv();
                bossItem.setAttribute("style", "margin: 6px 0; padding: 8px; background: rgba(0, 0, 0, 0.2); border-radius: 3px;");
                const icon = boss.defeated ? "OK" : boss.unlocked ? ">>" : "LOCK";
                const name = bossItem.createEl("span", { text: `[${icon}] Level ${boss.level}: ${boss.name}` });
                name.setAttribute("style", boss.defeated ? "color: #4caf50; font-weight: bold;" : boss.unlocked ? "color: #ffc107;" : "opacity: 0.5;");
            });
        }
        // Win condition
        if (stats.gameWon) {
            const winDiv = analyticsDiv.createDiv();
            winDiv.setAttribute("style", "margin-top: 12px; padding: 12px; background: rgba(76, 175, 80, 0.2); border: 2px solid #4caf50; border-radius: 4px; text-align: center;");
            winDiv.createEl("p", { text: "GAME WON!" }).setAttribute("style", "margin: 0; font-size: 1.2em; font-weight: bold; color: #4caf50;");
        }
    }
    stat(p, label, val, cls = "") {
        const b = p.createDiv({ cls: "sisy-stat-box" });
        if (cls)
            b.addClass(cls);
        b.createDiv({ text: label, cls: "sisy-stat-label" });
        b.createDiv({ text: val, cls: "sisy-stat-val" });
    }
}

const DEFAULT_SETTINGS = {
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
};
class SisyphusPlugin extends obsidian.Plugin {
    onload() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.loadSettings();
            this.loadStyles();
            this.audio = new AudioController(this.settings.muted);
            this.engine = new SisyphusEngine(this.app, this, this.audio);
            this.registerView(VIEW_TYPE_PANOPTICON, (leaf) => new PanopticonView(leaf, this));
            this.statusBarItem = this.addStatusBarItem();
            yield this.engine.checkDailyLogin();
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
                        new obsidian.Notice(`Active Chain: ${chain.name} (${this.engine.getChainProgress().completed}/${chain.quests.length})`);
                    }
                    else {
                        new obsidian.Notice("No active chain");
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
                    new obsidian.Notice(`Week ${report.week}: ${report.totalQuests} quests, ${report.successRate}% success`);
                }
            });
            this.addCommand({
                id: 'game-stats',
                name: 'Analytics: View Game Stats',
                callback: () => {
                    const stats = this.engine.getGameStats();
                    new obsidian.Notice(`Level: ${stats.level} | Streak: ${stats.currentStreak} | Quests: ${stats.totalQuests}`);
                }
            });
            this.addCommand({
                id: 'check-bosses',
                name: 'Endgame: Check Boss Milestones',
                callback: () => this.engine.checkBossMilestones()
            });
            this.addRibbonIcon('skull', 'Sisyphus Sidebar', () => this.activateView());
            this.registerInterval(window.setInterval(() => this.engine.checkDeadlines(), 60000));
        });
    }
    loadStyles() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const cssFile = this.app.vault.getAbstractFileByPath(this.manifest.dir + "/styles.css");
                if (cssFile instanceof obsidian.TFile) {
                    const css = yield this.app.vault.read(cssFile);
                    const style = document.createElement("style");
                    style.id = "sisyphus-styles";
                    style.innerHTML = css;
                    document.head.appendChild(style);
                }
            }
            catch (e) {
                console.error("Could not load styles.css", e);
            }
        });
    }
    onunload() {
        return __awaiter(this, void 0, void 0, function* () {
            this.app.workspace.detachLeavesOfType(VIEW_TYPE_PANOPTICON);
            if (this.audio.audioCtx)
                this.audio.audioCtx.close();
            const style = document.getElementById("sisyphus-styles");
            if (style)
                style.remove();
        });
    }
    activateView() {
        return __awaiter(this, void 0, void 0, function* () {
            const { workspace } = this.app;
            let leaf = null;
            const leaves = workspace.getLeavesOfType(VIEW_TYPE_PANOPTICON);
            if (leaves.length > 0) {
                leaf = leaves[0];
            }
            else {
                leaf = workspace.getRightLeaf(false);
                yield leaf.setViewState({ type: VIEW_TYPE_PANOPTICON, active: true });
            }
            workspace.revealLeaf(leaf);
        });
    }
    refreshUI() {
        this.updateStatusBar();
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_PANOPTICON);
        if (leaves.length > 0)
            leaves[0].view.refresh();
    }
    updateStatusBar() {
        let shield = (this.engine.isShielded() || this.engine.isResting()) ? (this.engine.isResting() ? "D" : "S") : "";
        const completedMissions = this.settings.dailyMissions.filter(m => m.completed).length;
        const totalMissions = this.settings.dailyMissions.length;
        const missionProgress = totalMissions > 0 ? `M${completedMissions}/${totalMissions}` : "";
        const statusText = `${this.settings.dailyModifier.icon} ${shield} HP${this.settings.hp}/${this.settings.maxHp} G${this.settings.gold} Lvl${this.settings.level} ${missionProgress}`;
        this.statusBarItem.setText(statusText);
        if (this.settings.hp < 30)
            this.statusBarItem.style.color = "red";
        else if (this.settings.gold < 0)
            this.statusBarItem.style.color = "orange";
        else
            this.statusBarItem.style.color = "";
    }
    loadSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            this.settings = Object.assign({}, DEFAULT_SETTINGS, yield this.loadData());
            if (!this.settings.legacy)
                this.settings.legacy = { souls: 0, perks: { startGold: 0, startSkillPoints: 0, rivalDelay: 0 }, relics: [], deathCount: 0 };
            if (this.settings.legacy.deathCount === undefined)
                this.settings.legacy.deathCount = 0;
            if (!this.settings.history)
                this.settings.history = [];
            if (!this.settings.dailyMissions)
                this.settings.dailyMissions = [];
            if (!this.settings.dailyMissionDate)
                this.settings.dailyMissionDate = "";
            if (this.settings.questsCompletedToday === undefined)
                this.settings.questsCompletedToday = 0;
            if (!this.settings.skillUsesToday)
                this.settings.skillUsesToday = {};
            if (!this.settings.researchQuests)
                this.settings.researchQuests = [];
            if (!this.settings.researchStats)
                this.settings.researchStats = {
                    totalResearch: 0,
                    totalCombat: 0,
                    researchCompleted: 0,
                    combatCompleted: 0
                };
            if (this.settings.lastResearchQuestId === undefined)
                this.settings.lastResearchQuestId = 0;
            if (this.settings.meditationCyclesCompleted === undefined)
                this.settings.meditationCyclesCompleted = 0;
            if (this.settings.questDeletionsToday === undefined)
                this.settings.questDeletionsToday = 0;
            if (!this.settings.lastDeletionReset)
                this.settings.lastDeletionReset = "";
            if (this.settings.isMeditating === undefined)
                this.settings.isMeditating = false;
            if (this.settings.meditationClicksThisLockdown === undefined)
                this.settings.meditationClicksThisLockdown = 0;
            if (!this.settings.activeChains)
                this.settings.activeChains = [];
            if (!this.settings.chainHistory)
                this.settings.chainHistory = [];
            if (!this.settings.currentChainId)
                this.settings.currentChainId = "";
            if (this.settings.chainQuestsCompleted === undefined)
                this.settings.chainQuestsCompleted = 0;
            if (!this.settings.questFilters)
                this.settings.questFilters = {};
            if (!this.settings.filterState)
                this.settings.filterState = { activeEnergy: "any", activeContext: "any", activeTags: [] };
            if (!this.settings.dayMetrics)
                this.settings.dayMetrics = [];
            if (!this.settings.weeklyReports)
                this.settings.weeklyReports = [];
            if (!this.settings.bossMilestones)
                this.settings.bossMilestones = [];
            if (!this.settings.streak)
                this.settings.streak = { current: 0, longest: 0, lastDate: "" };
            if (!this.settings.achievements)
                this.settings.achievements = [];
            if (this.settings.gameWon === undefined)
                this.settings.gameWon = false;
            this.settings.skills = this.settings.skills.map(s => (Object.assign(Object.assign({}, s), { rust: s.rust || 0, lastUsed: s.lastUsed || new Date().toISOString(), connections: s.connections || [] })));
        });
    }
    saveSettings() {
        return __awaiter(this, void 0, void 0, function* () { yield this.saveData(this.settings); });
    }
}

module.exports = SisyphusPlugin;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsibm9kZV9tb2R1bGVzL3RzbGliL3RzbGliLmVzNi5qcyIsInNyYy91aS9tb2RhbHMudHMiLCJzcmMvZW5naW5lcy9BbmFseXRpY3NFbmdpbmUudHMiLCJzcmMvZW5naW5lcy9NZWRpdGF0aW9uRW5naW5lLnRzIiwic3JjL2VuZ2luZXMvUmVzZWFyY2hFbmdpbmUudHMiLCJzcmMvZW5naW5lcy9DaGFpbnNFbmdpbmUudHMiLCJzcmMvZW5naW5lcy9GaWx0ZXJzRW5naW5lLnRzIiwic3JjL2VuZ2luZS50cyIsInNyYy91dGlscy50cyIsInNyYy91aS92aWV3LnRzIiwic3JjL21haW4udHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxyXG5Db3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi5cclxuXHJcblBlcm1pc3Npb24gdG8gdXNlLCBjb3B5LCBtb2RpZnksIGFuZC9vciBkaXN0cmlidXRlIHRoaXMgc29mdHdhcmUgZm9yIGFueVxyXG5wdXJwb3NlIHdpdGggb3Igd2l0aG91dCBmZWUgaXMgaGVyZWJ5IGdyYW50ZWQuXHJcblxyXG5USEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiIEFORCBUSEUgQVVUSE9SIERJU0NMQUlNUyBBTEwgV0FSUkFOVElFUyBXSVRIXHJcblJFR0FSRCBUTyBUSElTIFNPRlRXQVJFIElOQ0xVRElORyBBTEwgSU1QTElFRCBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWVxyXG5BTkQgRklUTkVTUy4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUiBCRSBMSUFCTEUgRk9SIEFOWSBTUEVDSUFMLCBESVJFQ1QsXHJcbklORElSRUNULCBPUiBDT05TRVFVRU5USUFMIERBTUFHRVMgT1IgQU5ZIERBTUFHRVMgV0hBVFNPRVZFUiBSRVNVTFRJTkcgRlJPTVxyXG5MT1NTIE9GIFVTRSwgREFUQSBPUiBQUk9GSVRTLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgTkVHTElHRU5DRSBPUlxyXG5PVEhFUiBUT1JUSU9VUyBBQ1RJT04sIEFSSVNJTkcgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgVVNFIE9SXHJcblBFUkZPUk1BTkNFIE9GIFRISVMgU09GVFdBUkUuXHJcbioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqICovXHJcbi8qIGdsb2JhbCBSZWZsZWN0LCBQcm9taXNlLCBTdXBwcmVzc2VkRXJyb3IsIFN5bWJvbCwgSXRlcmF0b3IgKi9cclxuXHJcbnZhciBleHRlbmRTdGF0aWNzID0gZnVuY3Rpb24oZCwgYikge1xyXG4gICAgZXh0ZW5kU3RhdGljcyA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fFxyXG4gICAgICAgICh7IF9fcHJvdG9fXzogW10gfSBpbnN0YW5jZW9mIEFycmF5ICYmIGZ1bmN0aW9uIChkLCBiKSB7IGQuX19wcm90b19fID0gYjsgfSkgfHxcclxuICAgICAgICBmdW5jdGlvbiAoZCwgYikgeyBmb3IgKHZhciBwIGluIGIpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYiwgcCkpIGRbcF0gPSBiW3BdOyB9O1xyXG4gICAgcmV0dXJuIGV4dGVuZFN0YXRpY3MoZCwgYik7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19leHRlbmRzKGQsIGIpIHtcclxuICAgIGlmICh0eXBlb2YgYiAhPT0gXCJmdW5jdGlvblwiICYmIGIgIT09IG51bGwpXHJcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNsYXNzIGV4dGVuZHMgdmFsdWUgXCIgKyBTdHJpbmcoYikgKyBcIiBpcyBub3QgYSBjb25zdHJ1Y3RvciBvciBudWxsXCIpO1xyXG4gICAgZXh0ZW5kU3RhdGljcyhkLCBiKTtcclxuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxyXG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xyXG59XHJcblxyXG5leHBvcnQgdmFyIF9fYXNzaWduID0gZnVuY3Rpb24oKSB7XHJcbiAgICBfX2Fzc2lnbiA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gX19hc3NpZ24odCkge1xyXG4gICAgICAgIGZvciAodmFyIHMsIGkgPSAxLCBuID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IG47IGkrKykge1xyXG4gICAgICAgICAgICBzID0gYXJndW1lbnRzW2ldO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkpIHRbcF0gPSBzW3BdO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdDtcclxuICAgIH1cclxuICAgIHJldHVybiBfX2Fzc2lnbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19yZXN0KHMsIGUpIHtcclxuICAgIHZhciB0ID0ge307XHJcbiAgICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkgJiYgZS5pbmRleE9mKHApIDwgMClcclxuICAgICAgICB0W3BdID0gc1twXTtcclxuICAgIGlmIChzICE9IG51bGwgJiYgdHlwZW9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMgPT09IFwiZnVuY3Rpb25cIilcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgcCA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMocyk7IGkgPCBwLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmIChlLmluZGV4T2YocFtpXSkgPCAwICYmIE9iamVjdC5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGUuY2FsbChzLCBwW2ldKSlcclxuICAgICAgICAgICAgICAgIHRbcFtpXV0gPSBzW3BbaV1dO1xyXG4gICAgICAgIH1cclxuICAgIHJldHVybiB0O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xyXG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLCByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYywgZDtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5kZWNvcmF0ZSA9PT0gXCJmdW5jdGlvblwiKSByID0gUmVmbGVjdC5kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYyk7XHJcbiAgICBlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xyXG4gICAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcGFyYW0ocGFyYW1JbmRleCwgZGVjb3JhdG9yKSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKHRhcmdldCwga2V5KSB7IGRlY29yYXRvcih0YXJnZXQsIGtleSwgcGFyYW1JbmRleCk7IH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZXNEZWNvcmF0ZShjdG9yLCBkZXNjcmlwdG9ySW4sIGRlY29yYXRvcnMsIGNvbnRleHRJbiwgaW5pdGlhbGl6ZXJzLCBleHRyYUluaXRpYWxpemVycykge1xyXG4gICAgZnVuY3Rpb24gYWNjZXB0KGYpIHsgaWYgKGYgIT09IHZvaWQgMCAmJiB0eXBlb2YgZiAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiRnVuY3Rpb24gZXhwZWN0ZWRcIik7IHJldHVybiBmOyB9XHJcbiAgICB2YXIga2luZCA9IGNvbnRleHRJbi5raW5kLCBrZXkgPSBraW5kID09PSBcImdldHRlclwiID8gXCJnZXRcIiA6IGtpbmQgPT09IFwic2V0dGVyXCIgPyBcInNldFwiIDogXCJ2YWx1ZVwiO1xyXG4gICAgdmFyIHRhcmdldCA9ICFkZXNjcmlwdG9ySW4gJiYgY3RvciA/IGNvbnRleHRJbltcInN0YXRpY1wiXSA/IGN0b3IgOiBjdG9yLnByb3RvdHlwZSA6IG51bGw7XHJcbiAgICB2YXIgZGVzY3JpcHRvciA9IGRlc2NyaXB0b3JJbiB8fCAodGFyZ2V0ID8gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGNvbnRleHRJbi5uYW1lKSA6IHt9KTtcclxuICAgIHZhciBfLCBkb25lID0gZmFsc2U7XHJcbiAgICBmb3IgKHZhciBpID0gZGVjb3JhdG9ycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xyXG4gICAgICAgIHZhciBjb250ZXh0ID0ge307XHJcbiAgICAgICAgZm9yICh2YXIgcCBpbiBjb250ZXh0SW4pIGNvbnRleHRbcF0gPSBwID09PSBcImFjY2Vzc1wiID8ge30gOiBjb250ZXh0SW5bcF07XHJcbiAgICAgICAgZm9yICh2YXIgcCBpbiBjb250ZXh0SW4uYWNjZXNzKSBjb250ZXh0LmFjY2Vzc1twXSA9IGNvbnRleHRJbi5hY2Nlc3NbcF07XHJcbiAgICAgICAgY29udGV4dC5hZGRJbml0aWFsaXplciA9IGZ1bmN0aW9uIChmKSB7IGlmIChkb25lKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGFkZCBpbml0aWFsaXplcnMgYWZ0ZXIgZGVjb3JhdGlvbiBoYXMgY29tcGxldGVkXCIpOyBleHRyYUluaXRpYWxpemVycy5wdXNoKGFjY2VwdChmIHx8IG51bGwpKTsgfTtcclxuICAgICAgICB2YXIgcmVzdWx0ID0gKDAsIGRlY29yYXRvcnNbaV0pKGtpbmQgPT09IFwiYWNjZXNzb3JcIiA/IHsgZ2V0OiBkZXNjcmlwdG9yLmdldCwgc2V0OiBkZXNjcmlwdG9yLnNldCB9IDogZGVzY3JpcHRvcltrZXldLCBjb250ZXh0KTtcclxuICAgICAgICBpZiAoa2luZCA9PT0gXCJhY2Nlc3NvclwiKSB7XHJcbiAgICAgICAgICAgIGlmIChyZXN1bHQgPT09IHZvaWQgMCkgY29udGludWU7XHJcbiAgICAgICAgICAgIGlmIChyZXN1bHQgPT09IG51bGwgfHwgdHlwZW9mIHJlc3VsdCAhPT0gXCJvYmplY3RcIikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdCBleHBlY3RlZFwiKTtcclxuICAgICAgICAgICAgaWYgKF8gPSBhY2NlcHQocmVzdWx0LmdldCkpIGRlc2NyaXB0b3IuZ2V0ID0gXztcclxuICAgICAgICAgICAgaWYgKF8gPSBhY2NlcHQocmVzdWx0LnNldCkpIGRlc2NyaXB0b3Iuc2V0ID0gXztcclxuICAgICAgICAgICAgaWYgKF8gPSBhY2NlcHQocmVzdWx0LmluaXQpKSBpbml0aWFsaXplcnMudW5zaGlmdChfKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoXyA9IGFjY2VwdChyZXN1bHQpKSB7XHJcbiAgICAgICAgICAgIGlmIChraW5kID09PSBcImZpZWxkXCIpIGluaXRpYWxpemVycy51bnNoaWZ0KF8pO1xyXG4gICAgICAgICAgICBlbHNlIGRlc2NyaXB0b3Jba2V5XSA9IF87XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKHRhcmdldCkgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgY29udGV4dEluLm5hbWUsIGRlc2NyaXB0b3IpO1xyXG4gICAgZG9uZSA9IHRydWU7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19ydW5Jbml0aWFsaXplcnModGhpc0FyZywgaW5pdGlhbGl6ZXJzLCB2YWx1ZSkge1xyXG4gICAgdmFyIHVzZVZhbHVlID0gYXJndW1lbnRzLmxlbmd0aCA+IDI7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGluaXRpYWxpemVycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHZhbHVlID0gdXNlVmFsdWUgPyBpbml0aWFsaXplcnNbaV0uY2FsbCh0aGlzQXJnLCB2YWx1ZSkgOiBpbml0aWFsaXplcnNbaV0uY2FsbCh0aGlzQXJnKTtcclxuICAgIH1cclxuICAgIHJldHVybiB1c2VWYWx1ZSA/IHZhbHVlIDogdm9pZCAwO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcHJvcEtleSh4KSB7XHJcbiAgICByZXR1cm4gdHlwZW9mIHggPT09IFwic3ltYm9sXCIgPyB4IDogXCJcIi5jb25jYXQoeCk7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19zZXRGdW5jdGlvbk5hbWUoZiwgbmFtZSwgcHJlZml4KSB7XHJcbiAgICBpZiAodHlwZW9mIG5hbWUgPT09IFwic3ltYm9sXCIpIG5hbWUgPSBuYW1lLmRlc2NyaXB0aW9uID8gXCJbXCIuY29uY2F0KG5hbWUuZGVzY3JpcHRpb24sIFwiXVwiKSA6IFwiXCI7XHJcbiAgICByZXR1cm4gT2JqZWN0LmRlZmluZVByb3BlcnR5KGYsIFwibmFtZVwiLCB7IGNvbmZpZ3VyYWJsZTogdHJ1ZSwgdmFsdWU6IHByZWZpeCA/IFwiXCIuY29uY2F0KHByZWZpeCwgXCIgXCIsIG5hbWUpIDogbmFtZSB9KTtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX21ldGFkYXRhKG1ldGFkYXRhS2V5LCBtZXRhZGF0YVZhbHVlKSB7XHJcbiAgICBpZiAodHlwZW9mIFJlZmxlY3QgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIFJlZmxlY3QubWV0YWRhdGEgPT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIFJlZmxlY3QubWV0YWRhdGEobWV0YWRhdGFLZXksIG1ldGFkYXRhVmFsdWUpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hd2FpdGVyKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xyXG4gICAgZnVuY3Rpb24gYWRvcHQodmFsdWUpIHsgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgUCA/IHZhbHVlIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZSh2YWx1ZSk7IH0pOyB9XHJcbiAgICByZXR1cm4gbmV3IChQIHx8IChQID0gUHJvbWlzZSkpKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcclxuICAgICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XHJcbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XHJcbiAgICAgICAgZnVuY3Rpb24gc3RlcChyZXN1bHQpIHsgcmVzdWx0LmRvbmUgPyByZXNvbHZlKHJlc3VsdC52YWx1ZSkgOiBhZG9wdChyZXN1bHQudmFsdWUpLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCk7IH1cclxuICAgICAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSkpLm5leHQoKSk7XHJcbiAgICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZ2VuZXJhdG9yKHRoaXNBcmcsIGJvZHkpIHtcclxuICAgIHZhciBfID0geyBsYWJlbDogMCwgc2VudDogZnVuY3Rpb24oKSB7IGlmICh0WzBdICYgMSkgdGhyb3cgdFsxXTsgcmV0dXJuIHRbMV07IH0sIHRyeXM6IFtdLCBvcHM6IFtdIH0sIGYsIHksIHQsIGcgPSBPYmplY3QuY3JlYXRlKCh0eXBlb2YgSXRlcmF0b3IgPT09IFwiZnVuY3Rpb25cIiA/IEl0ZXJhdG9yIDogT2JqZWN0KS5wcm90b3R5cGUpO1xyXG4gICAgcmV0dXJuIGcubmV4dCA9IHZlcmIoMCksIGdbXCJ0aHJvd1wiXSA9IHZlcmIoMSksIGdbXCJyZXR1cm5cIl0gPSB2ZXJiKDIpLCB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgKGdbU3ltYm9sLml0ZXJhdG9yXSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpczsgfSksIGc7XHJcbiAgICBmdW5jdGlvbiB2ZXJiKG4pIHsgcmV0dXJuIGZ1bmN0aW9uICh2KSB7IHJldHVybiBzdGVwKFtuLCB2XSk7IH07IH1cclxuICAgIGZ1bmN0aW9uIHN0ZXAob3ApIHtcclxuICAgICAgICBpZiAoZikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkdlbmVyYXRvciBpcyBhbHJlYWR5IGV4ZWN1dGluZy5cIik7XHJcbiAgICAgICAgd2hpbGUgKGcgJiYgKGcgPSAwLCBvcFswXSAmJiAoXyA9IDApKSwgXykgdHJ5IHtcclxuICAgICAgICAgICAgaWYgKGYgPSAxLCB5ICYmICh0ID0gb3BbMF0gJiAyID8geVtcInJldHVyblwiXSA6IG9wWzBdID8geVtcInRocm93XCJdIHx8ICgodCA9IHlbXCJyZXR1cm5cIl0pICYmIHQuY2FsbCh5KSwgMCkgOiB5Lm5leHQpICYmICEodCA9IHQuY2FsbCh5LCBvcFsxXSkpLmRvbmUpIHJldHVybiB0O1xyXG4gICAgICAgICAgICBpZiAoeSA9IDAsIHQpIG9wID0gW29wWzBdICYgMiwgdC52YWx1ZV07XHJcbiAgICAgICAgICAgIHN3aXRjaCAob3BbMF0pIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgMDogY2FzZSAxOiB0ID0gb3A7IGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA0OiBfLmxhYmVsKys7IHJldHVybiB7IHZhbHVlOiBvcFsxXSwgZG9uZTogZmFsc2UgfTtcclxuICAgICAgICAgICAgICAgIGNhc2UgNTogXy5sYWJlbCsrOyB5ID0gb3BbMV07IG9wID0gWzBdOyBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIGNhc2UgNzogb3AgPSBfLm9wcy5wb3AoKTsgXy50cnlzLnBvcCgpOyBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEodCA9IF8udHJ5cywgdCA9IHQubGVuZ3RoID4gMCAmJiB0W3QubGVuZ3RoIC0gMV0pICYmIChvcFswXSA9PT0gNiB8fCBvcFswXSA9PT0gMikpIHsgXyA9IDA7IGNvbnRpbnVlOyB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wWzBdID09PSAzICYmICghdCB8fCAob3BbMV0gPiB0WzBdICYmIG9wWzFdIDwgdFszXSkpKSB7IF8ubGFiZWwgPSBvcFsxXTsgYnJlYWs7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAob3BbMF0gPT09IDYgJiYgXy5sYWJlbCA8IHRbMV0pIHsgXy5sYWJlbCA9IHRbMV07IHQgPSBvcDsgYnJlYWs7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAodCAmJiBfLmxhYmVsIDwgdFsyXSkgeyBfLmxhYmVsID0gdFsyXTsgXy5vcHMucHVzaChvcCk7IGJyZWFrOyB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRbMl0pIF8ub3BzLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIF8udHJ5cy5wb3AoKTsgY29udGludWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgb3AgPSBib2R5LmNhbGwodGhpc0FyZywgXyk7XHJcbiAgICAgICAgfSBjYXRjaCAoZSkgeyBvcCA9IFs2LCBlXTsgeSA9IDA7IH0gZmluYWxseSB7IGYgPSB0ID0gMDsgfVxyXG4gICAgICAgIGlmIChvcFswXSAmIDUpIHRocm93IG9wWzFdOyByZXR1cm4geyB2YWx1ZTogb3BbMF0gPyBvcFsxXSA6IHZvaWQgMCwgZG9uZTogdHJ1ZSB9O1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgdmFyIF9fY3JlYXRlQmluZGluZyA9IE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcclxuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XHJcbiAgICB2YXIgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IobSwgayk7XHJcbiAgICBpZiAoIWRlc2MgfHwgKFwiZ2V0XCIgaW4gZGVzYyA/ICFtLl9fZXNNb2R1bGUgOiBkZXNjLndyaXRhYmxlIHx8IGRlc2MuY29uZmlndXJhYmxlKSkge1xyXG4gICAgICAgIGRlc2MgPSB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBtW2tdOyB9IH07XHJcbiAgICB9XHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgazIsIGRlc2MpO1xyXG59KSA6IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xyXG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcclxuICAgIG9bazJdID0gbVtrXTtcclxufSk7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19leHBvcnRTdGFyKG0sIG8pIHtcclxuICAgIGZvciAodmFyIHAgaW4gbSkgaWYgKHAgIT09IFwiZGVmYXVsdFwiICYmICFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwobywgcCkpIF9fY3JlYXRlQmluZGluZyhvLCBtLCBwKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fdmFsdWVzKG8pIHtcclxuICAgIHZhciBzID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIFN5bWJvbC5pdGVyYXRvciwgbSA9IHMgJiYgb1tzXSwgaSA9IDA7XHJcbiAgICBpZiAobSkgcmV0dXJuIG0uY2FsbChvKTtcclxuICAgIGlmIChvICYmIHR5cGVvZiBvLmxlbmd0aCA9PT0gXCJudW1iZXJcIikgcmV0dXJuIHtcclxuICAgICAgICBuZXh0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGlmIChvICYmIGkgPj0gby5sZW5ndGgpIG8gPSB2b2lkIDA7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHZhbHVlOiBvICYmIG9baSsrXSwgZG9uZTogIW8gfTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihzID8gXCJPYmplY3QgaXMgbm90IGl0ZXJhYmxlLlwiIDogXCJTeW1ib2wuaXRlcmF0b3IgaXMgbm90IGRlZmluZWQuXCIpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19yZWFkKG8sIG4pIHtcclxuICAgIHZhciBtID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9bU3ltYm9sLml0ZXJhdG9yXTtcclxuICAgIGlmICghbSkgcmV0dXJuIG87XHJcbiAgICB2YXIgaSA9IG0uY2FsbChvKSwgciwgYXIgPSBbXSwgZTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgd2hpbGUgKChuID09PSB2b2lkIDAgfHwgbi0tID4gMCkgJiYgIShyID0gaS5uZXh0KCkpLmRvbmUpIGFyLnB1c2goci52YWx1ZSk7XHJcbiAgICB9XHJcbiAgICBjYXRjaCAoZXJyb3IpIHsgZSA9IHsgZXJyb3I6IGVycm9yIH07IH1cclxuICAgIGZpbmFsbHkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGlmIChyICYmICFyLmRvbmUgJiYgKG0gPSBpW1wicmV0dXJuXCJdKSkgbS5jYWxsKGkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBmaW5hbGx5IHsgaWYgKGUpIHRocm93IGUuZXJyb3I7IH1cclxuICAgIH1cclxuICAgIHJldHVybiBhcjtcclxufVxyXG5cclxuLyoqIEBkZXByZWNhdGVkICovXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3NwcmVhZCgpIHtcclxuICAgIGZvciAodmFyIGFyID0gW10sIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKVxyXG4gICAgICAgIGFyID0gYXIuY29uY2F0KF9fcmVhZChhcmd1bWVudHNbaV0pKTtcclxuICAgIHJldHVybiBhcjtcclxufVxyXG5cclxuLyoqIEBkZXByZWNhdGVkICovXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3NwcmVhZEFycmF5cygpIHtcclxuICAgIGZvciAodmFyIHMgPSAwLCBpID0gMCwgaWwgPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgaWw7IGkrKykgcyArPSBhcmd1bWVudHNbaV0ubGVuZ3RoO1xyXG4gICAgZm9yICh2YXIgciA9IEFycmF5KHMpLCBrID0gMCwgaSA9IDA7IGkgPCBpbDsgaSsrKVxyXG4gICAgICAgIGZvciAodmFyIGEgPSBhcmd1bWVudHNbaV0sIGogPSAwLCBqbCA9IGEubGVuZ3RoOyBqIDwgamw7IGorKywgaysrKVxyXG4gICAgICAgICAgICByW2tdID0gYVtqXTtcclxuICAgIHJldHVybiByO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19zcHJlYWRBcnJheSh0bywgZnJvbSwgcGFjaykge1xyXG4gICAgaWYgKHBhY2sgfHwgYXJndW1lbnRzLmxlbmd0aCA9PT0gMikgZm9yICh2YXIgaSA9IDAsIGwgPSBmcm9tLmxlbmd0aCwgYXI7IGkgPCBsOyBpKyspIHtcclxuICAgICAgICBpZiAoYXIgfHwgIShpIGluIGZyb20pKSB7XHJcbiAgICAgICAgICAgIGlmICghYXIpIGFyID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZnJvbSwgMCwgaSk7XHJcbiAgICAgICAgICAgIGFyW2ldID0gZnJvbVtpXTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdG8uY29uY2F0KGFyIHx8IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGZyb20pKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXdhaXQodikge1xyXG4gICAgcmV0dXJuIHRoaXMgaW5zdGFuY2VvZiBfX2F3YWl0ID8gKHRoaXMudiA9IHYsIHRoaXMpIDogbmV3IF9fYXdhaXQodik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jR2VuZXJhdG9yKHRoaXNBcmcsIF9hcmd1bWVudHMsIGdlbmVyYXRvcikge1xyXG4gICAgaWYgKCFTeW1ib2wuYXN5bmNJdGVyYXRvcikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5hc3luY0l0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxuICAgIHZhciBnID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pLCBpLCBxID0gW107XHJcbiAgICByZXR1cm4gaSA9IE9iamVjdC5jcmVhdGUoKHR5cGVvZiBBc3luY0l0ZXJhdG9yID09PSBcImZ1bmN0aW9uXCIgPyBBc3luY0l0ZXJhdG9yIDogT2JqZWN0KS5wcm90b3R5cGUpLCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIpLCB2ZXJiKFwicmV0dXJuXCIsIGF3YWl0UmV0dXJuKSwgaVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzOyB9LCBpO1xyXG4gICAgZnVuY3Rpb24gYXdhaXRSZXR1cm4oZikgeyByZXR1cm4gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh2KS50aGVuKGYsIHJlamVjdCk7IH07IH1cclxuICAgIGZ1bmN0aW9uIHZlcmIobiwgZikgeyBpZiAoZ1tuXSkgeyBpW25dID0gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChhLCBiKSB7IHEucHVzaChbbiwgdiwgYSwgYl0pID4gMSB8fCByZXN1bWUobiwgdik7IH0pOyB9OyBpZiAoZikgaVtuXSA9IGYoaVtuXSk7IH0gfVxyXG4gICAgZnVuY3Rpb24gcmVzdW1lKG4sIHYpIHsgdHJ5IHsgc3RlcChnW25dKHYpKTsgfSBjYXRjaCAoZSkgeyBzZXR0bGUocVswXVszXSwgZSk7IH0gfVxyXG4gICAgZnVuY3Rpb24gc3RlcChyKSB7IHIudmFsdWUgaW5zdGFuY2VvZiBfX2F3YWl0ID8gUHJvbWlzZS5yZXNvbHZlKHIudmFsdWUudikudGhlbihmdWxmaWxsLCByZWplY3QpIDogc2V0dGxlKHFbMF1bMl0sIHIpOyB9XHJcbiAgICBmdW5jdGlvbiBmdWxmaWxsKHZhbHVlKSB7IHJlc3VtZShcIm5leHRcIiwgdmFsdWUpOyB9XHJcbiAgICBmdW5jdGlvbiByZWplY3QodmFsdWUpIHsgcmVzdW1lKFwidGhyb3dcIiwgdmFsdWUpOyB9XHJcbiAgICBmdW5jdGlvbiBzZXR0bGUoZiwgdikgeyBpZiAoZih2KSwgcS5zaGlmdCgpLCBxLmxlbmd0aCkgcmVzdW1lKHFbMF1bMF0sIHFbMF1bMV0pOyB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jRGVsZWdhdG9yKG8pIHtcclxuICAgIHZhciBpLCBwO1xyXG4gICAgcmV0dXJuIGkgPSB7fSwgdmVyYihcIm5leHRcIiksIHZlcmIoXCJ0aHJvd1wiLCBmdW5jdGlvbiAoZSkgeyB0aHJvdyBlOyB9KSwgdmVyYihcInJldHVyblwiKSwgaVtTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSwgaTtcclxuICAgIGZ1bmN0aW9uIHZlcmIobiwgZikgeyBpW25dID0gb1tuXSA/IGZ1bmN0aW9uICh2KSB7IHJldHVybiAocCA9ICFwKSA/IHsgdmFsdWU6IF9fYXdhaXQob1tuXSh2KSksIGRvbmU6IGZhbHNlIH0gOiBmID8gZih2KSA6IHY7IH0gOiBmOyB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jVmFsdWVzKG8pIHtcclxuICAgIGlmICghU3ltYm9sLmFzeW5jSXRlcmF0b3IpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJTeW1ib2wuYXN5bmNJdGVyYXRvciBpcyBub3QgZGVmaW5lZC5cIik7XHJcbiAgICB2YXIgbSA9IG9bU3ltYm9sLmFzeW5jSXRlcmF0b3JdLCBpO1xyXG4gICAgcmV0dXJuIG0gPyBtLmNhbGwobykgOiAobyA9IHR5cGVvZiBfX3ZhbHVlcyA9PT0gXCJmdW5jdGlvblwiID8gX192YWx1ZXMobykgOiBvW1N5bWJvbC5pdGVyYXRvcl0oKSwgaSA9IHt9LCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIpLCB2ZXJiKFwicmV0dXJuXCIpLCBpW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXM7IH0sIGkpO1xyXG4gICAgZnVuY3Rpb24gdmVyYihuKSB7IGlbbl0gPSBvW25dICYmIGZ1bmN0aW9uICh2KSB7IHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7IHYgPSBvW25dKHYpLCBzZXR0bGUocmVzb2x2ZSwgcmVqZWN0LCB2LmRvbmUsIHYudmFsdWUpOyB9KTsgfTsgfVxyXG4gICAgZnVuY3Rpb24gc2V0dGxlKHJlc29sdmUsIHJlamVjdCwgZCwgdikgeyBQcm9taXNlLnJlc29sdmUodikudGhlbihmdW5jdGlvbih2KSB7IHJlc29sdmUoeyB2YWx1ZTogdiwgZG9uZTogZCB9KTsgfSwgcmVqZWN0KTsgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19tYWtlVGVtcGxhdGVPYmplY3QoY29va2VkLCByYXcpIHtcclxuICAgIGlmIChPYmplY3QuZGVmaW5lUHJvcGVydHkpIHsgT2JqZWN0LmRlZmluZVByb3BlcnR5KGNvb2tlZCwgXCJyYXdcIiwgeyB2YWx1ZTogcmF3IH0pOyB9IGVsc2UgeyBjb29rZWQucmF3ID0gcmF3OyB9XHJcbiAgICByZXR1cm4gY29va2VkO1xyXG59O1xyXG5cclxudmFyIF9fc2V0TW9kdWxlRGVmYXVsdCA9IE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgdikge1xyXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIFwiZGVmYXVsdFwiLCB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiB2IH0pO1xyXG59KSA6IGZ1bmN0aW9uKG8sIHYpIHtcclxuICAgIG9bXCJkZWZhdWx0XCJdID0gdjtcclxufTtcclxuXHJcbnZhciBvd25LZXlzID0gZnVuY3Rpb24obykge1xyXG4gICAgb3duS2V5cyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzIHx8IGZ1bmN0aW9uIChvKSB7XHJcbiAgICAgICAgdmFyIGFyID0gW107XHJcbiAgICAgICAgZm9yICh2YXIgayBpbiBvKSBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG8sIGspKSBhclthci5sZW5ndGhdID0gaztcclxuICAgICAgICByZXR1cm4gYXI7XHJcbiAgICB9O1xyXG4gICAgcmV0dXJuIG93bktleXMobyk7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19pbXBvcnRTdGFyKG1vZCkge1xyXG4gICAgaWYgKG1vZCAmJiBtb2QuX19lc01vZHVsZSkgcmV0dXJuIG1vZDtcclxuICAgIHZhciByZXN1bHQgPSB7fTtcclxuICAgIGlmIChtb2QgIT0gbnVsbCkgZm9yICh2YXIgayA9IG93bktleXMobW9kKSwgaSA9IDA7IGkgPCBrLmxlbmd0aDsgaSsrKSBpZiAoa1tpXSAhPT0gXCJkZWZhdWx0XCIpIF9fY3JlYXRlQmluZGluZyhyZXN1bHQsIG1vZCwga1tpXSk7XHJcbiAgICBfX3NldE1vZHVsZURlZmF1bHQocmVzdWx0LCBtb2QpO1xyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9faW1wb3J0RGVmYXVsdChtb2QpIHtcclxuICAgIHJldHVybiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSA/IG1vZCA6IHsgZGVmYXVsdDogbW9kIH07XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2NsYXNzUHJpdmF0ZUZpZWxkR2V0KHJlY2VpdmVyLCBzdGF0ZSwga2luZCwgZikge1xyXG4gICAgaWYgKGtpbmQgPT09IFwiYVwiICYmICFmKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiUHJpdmF0ZSBhY2Nlc3NvciB3YXMgZGVmaW5lZCB3aXRob3V0IGEgZ2V0dGVyXCIpO1xyXG4gICAgaWYgKHR5cGVvZiBzdGF0ZSA9PT0gXCJmdW5jdGlvblwiID8gcmVjZWl2ZXIgIT09IHN0YXRlIHx8ICFmIDogIXN0YXRlLmhhcyhyZWNlaXZlcikpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgcmVhZCBwcml2YXRlIG1lbWJlciBmcm9tIGFuIG9iamVjdCB3aG9zZSBjbGFzcyBkaWQgbm90IGRlY2xhcmUgaXRcIik7XHJcbiAgICByZXR1cm4ga2luZCA9PT0gXCJtXCIgPyBmIDoga2luZCA9PT0gXCJhXCIgPyBmLmNhbGwocmVjZWl2ZXIpIDogZiA/IGYudmFsdWUgOiBzdGF0ZS5nZXQocmVjZWl2ZXIpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19jbGFzc1ByaXZhdGVGaWVsZFNldChyZWNlaXZlciwgc3RhdGUsIHZhbHVlLCBraW5kLCBmKSB7XHJcbiAgICBpZiAoa2luZCA9PT0gXCJtXCIpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJQcml2YXRlIG1ldGhvZCBpcyBub3Qgd3JpdGFibGVcIik7XHJcbiAgICBpZiAoa2luZCA9PT0gXCJhXCIgJiYgIWYpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJQcml2YXRlIGFjY2Vzc29yIHdhcyBkZWZpbmVkIHdpdGhvdXQgYSBzZXR0ZXJcIik7XHJcbiAgICBpZiAodHlwZW9mIHN0YXRlID09PSBcImZ1bmN0aW9uXCIgPyByZWNlaXZlciAhPT0gc3RhdGUgfHwgIWYgOiAhc3RhdGUuaGFzKHJlY2VpdmVyKSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCB3cml0ZSBwcml2YXRlIG1lbWJlciB0byBhbiBvYmplY3Qgd2hvc2UgY2xhc3MgZGlkIG5vdCBkZWNsYXJlIGl0XCIpO1xyXG4gICAgcmV0dXJuIChraW5kID09PSBcImFcIiA/IGYuY2FsbChyZWNlaXZlciwgdmFsdWUpIDogZiA/IGYudmFsdWUgPSB2YWx1ZSA6IHN0YXRlLnNldChyZWNlaXZlciwgdmFsdWUpKSwgdmFsdWU7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2NsYXNzUHJpdmF0ZUZpZWxkSW4oc3RhdGUsIHJlY2VpdmVyKSB7XHJcbiAgICBpZiAocmVjZWl2ZXIgPT09IG51bGwgfHwgKHR5cGVvZiByZWNlaXZlciAhPT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgcmVjZWl2ZXIgIT09IFwiZnVuY3Rpb25cIikpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgdXNlICdpbicgb3BlcmF0b3Igb24gbm9uLW9iamVjdFwiKTtcclxuICAgIHJldHVybiB0eXBlb2Ygc3RhdGUgPT09IFwiZnVuY3Rpb25cIiA/IHJlY2VpdmVyID09PSBzdGF0ZSA6IHN0YXRlLmhhcyhyZWNlaXZlcik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FkZERpc3Bvc2FibGVSZXNvdXJjZShlbnYsIHZhbHVlLCBhc3luYykge1xyXG4gICAgaWYgKHZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSB2b2lkIDApIHtcclxuICAgICAgICBpZiAodHlwZW9mIHZhbHVlICE9PSBcIm9iamVjdFwiICYmIHR5cGVvZiB2YWx1ZSAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiT2JqZWN0IGV4cGVjdGVkLlwiKTtcclxuICAgICAgICB2YXIgZGlzcG9zZSwgaW5uZXI7XHJcbiAgICAgICAgaWYgKGFzeW5jKSB7XHJcbiAgICAgICAgICAgIGlmICghU3ltYm9sLmFzeW5jRGlzcG9zZSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5hc3luY0Rpc3Bvc2UgaXMgbm90IGRlZmluZWQuXCIpO1xyXG4gICAgICAgICAgICBkaXNwb3NlID0gdmFsdWVbU3ltYm9sLmFzeW5jRGlzcG9zZV07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChkaXNwb3NlID09PSB2b2lkIDApIHtcclxuICAgICAgICAgICAgaWYgKCFTeW1ib2wuZGlzcG9zZSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5kaXNwb3NlIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxuICAgICAgICAgICAgZGlzcG9zZSA9IHZhbHVlW1N5bWJvbC5kaXNwb3NlXTtcclxuICAgICAgICAgICAgaWYgKGFzeW5jKSBpbm5lciA9IGRpc3Bvc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0eXBlb2YgZGlzcG9zZSAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiT2JqZWN0IG5vdCBkaXNwb3NhYmxlLlwiKTtcclxuICAgICAgICBpZiAoaW5uZXIpIGRpc3Bvc2UgPSBmdW5jdGlvbigpIHsgdHJ5IHsgaW5uZXIuY2FsbCh0aGlzKTsgfSBjYXRjaCAoZSkgeyByZXR1cm4gUHJvbWlzZS5yZWplY3QoZSk7IH0gfTtcclxuICAgICAgICBlbnYuc3RhY2sucHVzaCh7IHZhbHVlOiB2YWx1ZSwgZGlzcG9zZTogZGlzcG9zZSwgYXN5bmM6IGFzeW5jIH0pO1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAoYXN5bmMpIHtcclxuICAgICAgICBlbnYuc3RhY2sucHVzaCh7IGFzeW5jOiB0cnVlIH0pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHZhbHVlO1xyXG5cclxufVxyXG5cclxudmFyIF9TdXBwcmVzc2VkRXJyb3IgPSB0eXBlb2YgU3VwcHJlc3NlZEVycm9yID09PSBcImZ1bmN0aW9uXCIgPyBTdXBwcmVzc2VkRXJyb3IgOiBmdW5jdGlvbiAoZXJyb3IsIHN1cHByZXNzZWQsIG1lc3NhZ2UpIHtcclxuICAgIHZhciBlID0gbmV3IEVycm9yKG1lc3NhZ2UpO1xyXG4gICAgcmV0dXJuIGUubmFtZSA9IFwiU3VwcHJlc3NlZEVycm9yXCIsIGUuZXJyb3IgPSBlcnJvciwgZS5zdXBwcmVzc2VkID0gc3VwcHJlc3NlZCwgZTtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2Rpc3Bvc2VSZXNvdXJjZXMoZW52KSB7XHJcbiAgICBmdW5jdGlvbiBmYWlsKGUpIHtcclxuICAgICAgICBlbnYuZXJyb3IgPSBlbnYuaGFzRXJyb3IgPyBuZXcgX1N1cHByZXNzZWRFcnJvcihlLCBlbnYuZXJyb3IsIFwiQW4gZXJyb3Igd2FzIHN1cHByZXNzZWQgZHVyaW5nIGRpc3Bvc2FsLlwiKSA6IGU7XHJcbiAgICAgICAgZW52Lmhhc0Vycm9yID0gdHJ1ZTtcclxuICAgIH1cclxuICAgIHZhciByLCBzID0gMDtcclxuICAgIGZ1bmN0aW9uIG5leHQoKSB7XHJcbiAgICAgICAgd2hpbGUgKHIgPSBlbnYuc3RhY2sucG9wKCkpIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGlmICghci5hc3luYyAmJiBzID09PSAxKSByZXR1cm4gcyA9IDAsIGVudi5zdGFjay5wdXNoKHIpLCBQcm9taXNlLnJlc29sdmUoKS50aGVuKG5leHQpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHIuZGlzcG9zZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSByLmRpc3Bvc2UuY2FsbChyLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoci5hc3luYykgcmV0dXJuIHMgfD0gMiwgUHJvbWlzZS5yZXNvbHZlKHJlc3VsdCkudGhlbihuZXh0LCBmdW5jdGlvbihlKSB7IGZhaWwoZSk7IHJldHVybiBuZXh0KCk7IH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSBzIHw9IDE7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgIGZhaWwoZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHMgPT09IDEpIHJldHVybiBlbnYuaGFzRXJyb3IgPyBQcm9taXNlLnJlamVjdChlbnYuZXJyb3IpIDogUHJvbWlzZS5yZXNvbHZlKCk7XHJcbiAgICAgICAgaWYgKGVudi5oYXNFcnJvcikgdGhyb3cgZW52LmVycm9yO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIG5leHQoKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcmV3cml0ZVJlbGF0aXZlSW1wb3J0RXh0ZW5zaW9uKHBhdGgsIHByZXNlcnZlSnN4KSB7XHJcbiAgICBpZiAodHlwZW9mIHBhdGggPT09IFwic3RyaW5nXCIgJiYgL15cXC5cXC4/XFwvLy50ZXN0KHBhdGgpKSB7XHJcbiAgICAgICAgcmV0dXJuIHBhdGgucmVwbGFjZSgvXFwuKHRzeCkkfCgoPzpcXC5kKT8pKCg/OlxcLlteLi9dKz8pPylcXC4oW2NtXT8pdHMkL2ksIGZ1bmN0aW9uIChtLCB0c3gsIGQsIGV4dCwgY20pIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRzeCA/IHByZXNlcnZlSnN4ID8gXCIuanN4XCIgOiBcIi5qc1wiIDogZCAmJiAoIWV4dCB8fCAhY20pID8gbSA6IChkICsgZXh0ICsgXCIuXCIgKyBjbS50b0xvd2VyQ2FzZSgpICsgXCJqc1wiKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIHJldHVybiBwYXRoO1xyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCB7XHJcbiAgICBfX2V4dGVuZHM6IF9fZXh0ZW5kcyxcclxuICAgIF9fYXNzaWduOiBfX2Fzc2lnbixcclxuICAgIF9fcmVzdDogX19yZXN0LFxyXG4gICAgX19kZWNvcmF0ZTogX19kZWNvcmF0ZSxcclxuICAgIF9fcGFyYW06IF9fcGFyYW0sXHJcbiAgICBfX2VzRGVjb3JhdGU6IF9fZXNEZWNvcmF0ZSxcclxuICAgIF9fcnVuSW5pdGlhbGl6ZXJzOiBfX3J1bkluaXRpYWxpemVycyxcclxuICAgIF9fcHJvcEtleTogX19wcm9wS2V5LFxyXG4gICAgX19zZXRGdW5jdGlvbk5hbWU6IF9fc2V0RnVuY3Rpb25OYW1lLFxyXG4gICAgX19tZXRhZGF0YTogX19tZXRhZGF0YSxcclxuICAgIF9fYXdhaXRlcjogX19hd2FpdGVyLFxyXG4gICAgX19nZW5lcmF0b3I6IF9fZ2VuZXJhdG9yLFxyXG4gICAgX19jcmVhdGVCaW5kaW5nOiBfX2NyZWF0ZUJpbmRpbmcsXHJcbiAgICBfX2V4cG9ydFN0YXI6IF9fZXhwb3J0U3RhcixcclxuICAgIF9fdmFsdWVzOiBfX3ZhbHVlcyxcclxuICAgIF9fcmVhZDogX19yZWFkLFxyXG4gICAgX19zcHJlYWQ6IF9fc3ByZWFkLFxyXG4gICAgX19zcHJlYWRBcnJheXM6IF9fc3ByZWFkQXJyYXlzLFxyXG4gICAgX19zcHJlYWRBcnJheTogX19zcHJlYWRBcnJheSxcclxuICAgIF9fYXdhaXQ6IF9fYXdhaXQsXHJcbiAgICBfX2FzeW5jR2VuZXJhdG9yOiBfX2FzeW5jR2VuZXJhdG9yLFxyXG4gICAgX19hc3luY0RlbGVnYXRvcjogX19hc3luY0RlbGVnYXRvcixcclxuICAgIF9fYXN5bmNWYWx1ZXM6IF9fYXN5bmNWYWx1ZXMsXHJcbiAgICBfX21ha2VUZW1wbGF0ZU9iamVjdDogX19tYWtlVGVtcGxhdGVPYmplY3QsXHJcbiAgICBfX2ltcG9ydFN0YXI6IF9faW1wb3J0U3RhcixcclxuICAgIF9faW1wb3J0RGVmYXVsdDogX19pbXBvcnREZWZhdWx0LFxyXG4gICAgX19jbGFzc1ByaXZhdGVGaWVsZEdldDogX19jbGFzc1ByaXZhdGVGaWVsZEdldCxcclxuICAgIF9fY2xhc3NQcml2YXRlRmllbGRTZXQ6IF9fY2xhc3NQcml2YXRlRmllbGRTZXQsXHJcbiAgICBfX2NsYXNzUHJpdmF0ZUZpZWxkSW46IF9fY2xhc3NQcml2YXRlRmllbGRJbixcclxuICAgIF9fYWRkRGlzcG9zYWJsZVJlc291cmNlOiBfX2FkZERpc3Bvc2FibGVSZXNvdXJjZSxcclxuICAgIF9fZGlzcG9zZVJlc291cmNlczogX19kaXNwb3NlUmVzb3VyY2VzLFxyXG4gICAgX19yZXdyaXRlUmVsYXRpdmVJbXBvcnRFeHRlbnNpb246IF9fcmV3cml0ZVJlbGF0aXZlSW1wb3J0RXh0ZW5zaW9uLFxyXG59O1xyXG4iLCJpbXBvcnQgeyBBcHAsIE1vZGFsLCBTZXR0aW5nLCBOb3RpY2UsIG1vbWVudCwgVEZpbGUsIFRGb2xkZXIgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgU2lzeXBodXNQbHVnaW4gZnJvbSAnLi4vbWFpbic7IC8vIEZpeDogRGVmYXVsdCBJbXBvcnRcbmltcG9ydCB7IE1vZGlmaWVyIH0gZnJvbSAnLi4vdHlwZXMnO1xuXG5leHBvcnQgY2xhc3MgQ2hhb3NNb2RhbCBleHRlbmRzIE1vZGFsIHsgXG4gICAgbW9kaWZpZXI6IE1vZGlmaWVyOyBcbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgbTogTW9kaWZpZXIpIHsgc3VwZXIoYXBwKTsgdGhpcy5tb2RpZmllcj1tOyB9IFxuICAgIG9uT3BlbigpIHsgXG4gICAgICAgIGNvbnN0IGMgPSB0aGlzLmNvbnRlbnRFbDsgXG4gICAgICAgIGNvbnN0IGgxID0gYy5jcmVhdGVFbChcImgxXCIsIHsgdGV4dDogXCJUSEUgT01FTlwiIH0pOyBcbiAgICAgICAgaDEuc2V0QXR0cmlidXRlKFwic3R5bGVcIixcInRleHQtYWxpZ246Y2VudGVyOyBjb2xvcjojZjU1O1wiKTsgXG4gICAgICAgIGNvbnN0IGljID0gYy5jcmVhdGVFbChcImRpdlwiLCB7IHRleHQ6IHRoaXMubW9kaWZpZXIuaWNvbiB9KTsgXG4gICAgICAgIGljLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsXCJmb250LXNpemU6ODBweDsgdGV4dC1hbGlnbjpjZW50ZXI7XCIpOyBcbiAgICAgICAgY29uc3QgaDIgPSBjLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiB0aGlzLm1vZGlmaWVyLm5hbWUgfSk7IFxuICAgICAgICBoMi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLFwidGV4dC1hbGlnbjpjZW50ZXI7XCIpOyBcbiAgICAgICAgY29uc3QgcCA9IGMuY3JlYXRlRWwoXCJwXCIsIHt0ZXh0OiB0aGlzLm1vZGlmaWVyLmRlc2N9KTsgXG4gICAgICAgIHAuc2V0QXR0cmlidXRlKFwic3R5bGVcIixcInRleHQtYWxpZ246Y2VudGVyXCIpOyBcbiAgICAgICAgY29uc3QgYiA9IGMuY3JlYXRlRWwoXCJidXR0b25cIiwge3RleHQ6XCJBY2tub3dsZWRnZVwifSk7IFxuICAgICAgICBiLmFkZENsYXNzKFwibW9kLWN0YVwiKTsgXG4gICAgICAgIGIuc3R5bGUuZGlzcGxheT1cImJsb2NrXCI7IFxuICAgICAgICBiLnN0eWxlLm1hcmdpbj1cIjIwcHggYXV0b1wiOyBcbiAgICAgICAgYi5vbmNsaWNrPSgpPT50aGlzLmNsb3NlKCk7IFxuICAgIH0gXG4gICAgb25DbG9zZSgpIHsgdGhpcy5jb250ZW50RWwuZW1wdHkoKTsgfSBcbn1cblxuZXhwb3J0IGNsYXNzIFNob3BNb2RhbCBleHRlbmRzIE1vZGFsIHsgXG4gICAgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbjsgXG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogU2lzeXBodXNQbHVnaW4pIHsgc3VwZXIoYXBwKTsgdGhpcy5wbHVnaW4gPSBwbHVnaW47IH0gXG4gICAgb25PcGVuKCkgeyBcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7IFxuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwi8J+bkiBCTEFDSyBNQVJLRVRcIiB9KTsgXG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBgUHVyc2U6IPCfqpkgJHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5nb2xkfWAgfSk7IFxuICAgICAgICBcbiAgICAgICAgdGhpcy5pdGVtKGNvbnRlbnRFbCwgXCLwn5KJIFN0aW1wYWNrXCIsIFwiSGVhbCAyMCBIUFwiLCA1MCwgYXN5bmMgKCkgPT4geyBcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmhwID0gTWF0aC5taW4odGhpcy5wbHVnaW4uc2V0dGluZ3MubWF4SHAsIHRoaXMucGx1Z2luLnNldHRpbmdzLmhwICsgMjApOyBcbiAgICAgICAgfSk7IFxuICAgICAgICB0aGlzLml0ZW0oY29udGVudEVsLCBcIvCfkqMgU2Fib3RhZ2VcIiwgXCItNSBSaXZhbCBEbWdcIiwgMjAwLCBhc3luYyAoKSA9PiB7IFxuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Mucml2YWxEbWcgPSBNYXRoLm1heCg1LCB0aGlzLnBsdWdpbi5zZXR0aW5ncy5yaXZhbERtZyAtIDUpOyBcbiAgICAgICAgfSk7IFxuICAgICAgICB0aGlzLml0ZW0oY29udGVudEVsLCBcIvCfm6HvuI8gU2hpZWxkXCIsIFwiMjRoIFByb3RlY3Rpb25cIiwgMTUwLCBhc3luYyAoKSA9PiB7IFxuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Muc2hpZWxkZWRVbnRpbCA9IG1vbWVudCgpLmFkZCgyNCwgJ2hvdXJzJykudG9JU09TdHJpbmcoKTsgXG4gICAgICAgIH0pOyBcbiAgICAgICAgdGhpcy5pdGVtKGNvbnRlbnRFbCwgXCLwn5i0IFJlc3QgRGF5XCIsIFwiU2FmZSBmb3IgMjRoXCIsIDEwMCwgYXN5bmMgKCkgPT4geyBcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnJlc3REYXlVbnRpbCA9IG1vbWVudCgpLmFkZCgyNCwgJ2hvdXJzJykudG9JU09TdHJpbmcoKTsgXG4gICAgICAgIH0pOyBcbiAgICB9IFxuICAgIGl0ZW0oZWw6IEhUTUxFbGVtZW50LCBuYW1lOiBzdHJpbmcsIGRlc2M6IHN0cmluZywgY29zdDogbnVtYmVyLCBlZmZlY3Q6ICgpID0+IFByb21pc2U8dm9pZD4pIHsgXG4gICAgICAgIGNvbnN0IGMgPSBlbC5jcmVhdGVEaXYoKTsgXG4gICAgICAgIGMuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJkaXNwbGF5OmZsZXg7IGp1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuOyBwYWRkaW5nOjEwcHggMDsgYm9yZGVyLWJvdHRvbToxcHggc29saWQgIzMzMztcIik7IFxuICAgICAgICBjb25zdCBpID0gYy5jcmVhdGVEaXYoKTsgXG4gICAgICAgIGkuY3JlYXRlRWwoXCJiXCIsIHsgdGV4dDogbmFtZSB9KTsgXG4gICAgICAgIGkuY3JlYXRlRWwoXCJkaXZcIiwgeyB0ZXh0OiBkZXNjIH0pOyBcbiAgICAgICAgY29uc3QgYiA9IGMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBgJHtjb3N0fSBHYCB9KTsgXG4gICAgICAgIGlmKHRoaXMucGx1Z2luLnNldHRpbmdzLmdvbGQgPCBjb3N0KSB7IFxuICAgICAgICAgICAgYi5zZXRBdHRyaWJ1dGUoXCJkaXNhYmxlZFwiLFwidHJ1ZVwiKTsgYi5zdHlsZS5vcGFjaXR5PVwiMC41XCI7IFxuICAgICAgICB9IGVsc2UgeyBcbiAgICAgICAgICAgIGIuYWRkQ2xhc3MoXCJtb2QtY3RhXCIpOyBcbiAgICAgICAgICAgIGIub25jbGljayA9IGFzeW5jICgpID0+IHsgXG4gICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZ29sZCAtPSBjb3N0OyBcbiAgICAgICAgICAgICAgICBhd2FpdCBlZmZlY3QoKTsgXG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uZW5naW5lLnNhdmUoKTsgXG4gICAgICAgICAgICAgICAgbmV3IE5vdGljZShgQm91Z2h0ICR7bmFtZX1gKTsgXG4gICAgICAgICAgICAgICAgdGhpcy5jbG9zZSgpOyBcbiAgICAgICAgICAgICAgICBuZXcgU2hvcE1vZGFsKHRoaXMuYXBwLHRoaXMucGx1Z2luKS5vcGVuKCk7IFxuICAgICAgICAgICAgfVxuICAgICAgICB9IFxuICAgIH0gXG4gICAgb25DbG9zZSgpIHsgdGhpcy5jb250ZW50RWwuZW1wdHkoKTsgfSBcbn1cblxuZXhwb3J0IGNsYXNzIFF1ZXN0TW9kYWwgZXh0ZW5kcyBNb2RhbCB7IFxuICAgIHBsdWdpbjogU2lzeXBodXNQbHVnaW47IFxuICAgIG5hbWU6IHN0cmluZzsgZGlmZmljdWx0eTogbnVtYmVyID0gMzsgc2tpbGw6IHN0cmluZyA9IFwiTm9uZVwiOyBzZWNTa2lsbDogc3RyaW5nID0gXCJOb25lXCI7IGRlYWRsaW5lOiBzdHJpbmcgPSBcIlwiOyBoaWdoU3Rha2VzOiBib29sZWFuID0gZmFsc2U7IGlzQm9zczogYm9vbGVhbiA9IGZhbHNlOyBcbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbikgeyBzdXBlcihhcHApOyB0aGlzLnBsdWdpbiA9IHBsdWdpbjsgfSBcbiAgICBvbk9wZW4oKSB7IFxuICAgICAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpczsgXG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogXCLimpTvuI8gREVQTE9ZTUVOVFwiIH0pOyBcbiAgICAgICAgXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIk9iamVjdGl2ZVwiKS5hZGRUZXh0KHQgPT4geyBcbiAgICAgICAgICAgIHQub25DaGFuZ2UodiA9PiB0aGlzLm5hbWUgPSB2KTsgXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHQuaW5wdXRFbC5mb2N1cygpLCA1MCk7IFxuICAgICAgICB9KTtcblxuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpLnNldE5hbWUoXCJEaWZmaWN1bHR5XCIpLmFkZERyb3Bkb3duKGQgPT4gZC5hZGRPcHRpb24oXCIxXCIsXCJUcml2aWFsXCIpLmFkZE9wdGlvbihcIjJcIixcIkVhc3lcIikuYWRkT3B0aW9uKFwiM1wiLFwiTWVkaXVtXCIpLmFkZE9wdGlvbihcIjRcIixcIkhhcmRcIikuYWRkT3B0aW9uKFwiNVwiLFwiU1VJQ0lERVwiKS5zZXRWYWx1ZShcIjNcIikub25DaGFuZ2Uodj0+dGhpcy5kaWZmaWN1bHR5PXBhcnNlSW50KHYpKSk7IFxuICAgICAgICBcbiAgICAgICAgY29uc3Qgc2tpbGxzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0geyBcIk5vbmVcIjogXCJOb25lXCIgfTsgXG4gICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnNraWxscy5mb3JFYWNoKHMgPT4gc2tpbGxzW3MubmFtZV0gPSBzLm5hbWUpOyBcbiAgICAgICAgc2tpbGxzW1wiKyBOZXdcIl0gPSBcIisgTmV3XCI7IFxuICAgICAgICBcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiUHJpbWFyeSBOb2RlXCIpLmFkZERyb3Bkb3duKGQgPT4gZC5hZGRPcHRpb25zKHNraWxscykub25DaGFuZ2UodiA9PiB7IFxuICAgICAgICAgICAgaWYodj09PVwiKyBOZXdcIil7IHRoaXMuY2xvc2UoKTsgbmV3IFNraWxsTWFuYWdlck1vZGFsKHRoaXMuYXBwLHRoaXMucGx1Z2luKS5vcGVuKCk7IH0gZWxzZSB0aGlzLnNraWxsPXY7IFxuICAgICAgICB9KSk7IFxuICAgICAgICBcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiU3luZXJneSBOb2RlXCIpLmFkZERyb3Bkb3duKGQgPT4gZC5hZGRPcHRpb25zKHNraWxscykuc2V0VmFsdWUoXCJOb25lXCIpLm9uQ2hhbmdlKHYgPT4gdGhpcy5zZWNTa2lsbCA9IHYpKTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiRGVhZGxpbmVcIikuYWRkVGV4dCh0ID0+IHsgdC5pbnB1dEVsLnR5cGUgPSBcImRhdGV0aW1lLWxvY2FsXCI7IHQub25DaGFuZ2UodiA9PiB0aGlzLmRlYWRsaW5lID0gdik7IH0pO1xuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpLnNldE5hbWUoXCJIaWdoIFN0YWtlc1wiKS5zZXREZXNjKFwiRG91YmxlIEdvbGQgLyBEb3VibGUgRGFtYWdlXCIpLmFkZFRvZ2dsZSh0PT50LnNldFZhbHVlKGZhbHNlKS5vbkNoYW5nZSh2PT50aGlzLmhpZ2hTdGFrZXM9dikpOyBcbiAgICAgICAgXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuYWRkQnV0dG9uKGIgPT4gYi5zZXRCdXR0b25UZXh0KFwiRGVwbG95XCIpLnNldEN0YSgpLm9uQ2xpY2soKCkgPT4geyBcbiAgICAgICAgICAgIGlmKHRoaXMubmFtZSl7XG4gICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLmNyZWF0ZVF1ZXN0KHRoaXMubmFtZSx0aGlzLmRpZmZpY3VsdHksdGhpcy5za2lsbCx0aGlzLnNlY1NraWxsLHRoaXMuZGVhZGxpbmUsdGhpcy5oaWdoU3Rha2VzLCBcIk5vcm1hbFwiLCB0aGlzLmlzQm9zcyk7XG4gICAgICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgfSBcbiAgICAgICAgfSkpOyBcbiAgICB9IFxuICAgIG9uQ2xvc2UoKSB7IHRoaXMuY29udGVudEVsLmVtcHR5KCk7IH0gXG59XG5cbmV4cG9ydCBjbGFzcyBTa2lsbE1hbmFnZXJNb2RhbCBleHRlbmRzIE1vZGFsIHsgXG4gICAgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbjsgXG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogU2lzeXBodXNQbHVnaW4pIHsgc3VwZXIoYXBwKTsgdGhpcy5wbHVnaW4gPSBwbHVnaW47IH0gXG4gICAgb25PcGVuKCkgeyBcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7IFxuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwiQWRkIE5ldyBOb2RlXCIgfSk7IFxuICAgICAgICBsZXQgbj1cIlwiOyBcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiTm9kZSBOYW1lXCIpLmFkZFRleHQodD0+dC5vbkNoYW5nZSh2PT5uPXYpKS5hZGRCdXR0b24oYj0+Yi5zZXRCdXR0b25UZXh0KFwiQ3JlYXRlXCIpLnNldEN0YSgpLm9uQ2xpY2soYXN5bmMoKT0+e1xuICAgICAgICAgICAgaWYobil7XG4gICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Muc2tpbGxzLnB1c2goe25hbWU6bixsZXZlbDoxLHhwOjAseHBSZXE6NSxsYXN0VXNlZDpuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkscnVzdDowLGNvbm5lY3Rpb25zOltdfSk7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uZW5naW5lLnNhdmUoKTtcbiAgICAgICAgICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKTsgXG4gICAgfSBcbiAgICBvbkNsb3NlKCkgeyB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpOyB9IFxufVxuXG5leHBvcnQgY2xhc3MgU2tpbGxEZXRhaWxNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgICBwbHVnaW46IFNpc3lwaHVzUGx1Z2luOyBpbmRleDogbnVtYmVyO1xuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFNpc3lwaHVzUGx1Z2luLCBpbmRleDogbnVtYmVyKSB7IHN1cGVyKGFwcCk7IHRoaXMucGx1Z2luPXBsdWdpbjsgdGhpcy5pbmRleD1pbmRleDsgfVxuICAgIG9uT3BlbigpIHtcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7IGNvbnN0IHMgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5za2lsbHNbdGhpcy5pbmRleF07XG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogYE5vZGU6ICR7cy5uYW1lfWAgfSk7XG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIk5hbWVcIikuYWRkVGV4dCh0PT50LnNldFZhbHVlKHMubmFtZSkub25DaGFuZ2Uodj0+cy5uYW1lPXYpKTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiUnVzdCBTdGF0dXNcIikuc2V0RGVzYyhgU3RhY2tzOiAke3MucnVzdH1gKS5hZGRCdXR0b24oYj0+Yi5zZXRCdXR0b25UZXh0KFwiTWFudWFsIFBvbGlzaFwiKS5vbkNsaWNrKGFzeW5jKCk9PnsgXG4gICAgICAgICAgICBzLnJ1c3Q9MDsgcy54cFJlcT1NYXRoLmZsb29yKHMueHBSZXEvMS4xKTsgXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5lbmdpbmUuc2F2ZSgpOyBcbiAgICAgICAgICAgIHRoaXMuY2xvc2UoKTsgXG4gICAgICAgICAgICBuZXcgTm90aWNlKFwiUnVzdCBwb2xpc2hlZC5cIik7IFxuICAgICAgICB9KSk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBkaXYgPSBjb250ZW50RWwuY3JlYXRlRGl2KCk7IFxuICAgICAgICBkaXYuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJtYXJnaW4tdG9wOjIwcHg7IGRpc3BsYXk6ZmxleDsganVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47XCIpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgYlNhdmUgPSBkaXYuY3JlYXRlRWwoXCJidXR0b25cIiwge3RleHQ6XCJTYXZlXCJ9KTsgXG4gICAgICAgIGJTYXZlLmFkZENsYXNzKFwibW9kLWN0YVwiKTsgXG4gICAgICAgIGJTYXZlLm9uY2xpY2s9YXN5bmMoKT0+eyBhd2FpdCB0aGlzLnBsdWdpbi5lbmdpbmUuc2F2ZSgpOyB0aGlzLmNsb3NlKCk7IH07XG4gICAgICAgIFxuICAgICAgICBjb25zdCBiRGVsID0gZGl2LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHt0ZXh0OlwiRGVsZXRlIE5vZGVcIn0pOyBcbiAgICAgICAgYkRlbC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLFwiY29sb3I6cmVkO1wiKTsgXG4gICAgICAgIGJEZWwub25jbGljaz1hc3luYygpPT57IFxuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Muc2tpbGxzLnNwbGljZSh0aGlzLmluZGV4LCAxKTsgXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5lbmdpbmUuc2F2ZSgpOyBcbiAgICAgICAgICAgIHRoaXMuY2xvc2UoKTsgXG4gICAgICAgIH07XG4gICAgfVxuICAgIG9uQ2xvc2UoKSB7IHRoaXMuY29udGVudEVsLmVtcHR5KCk7IH1cbn1cblxuXG5cbmV4cG9ydCBjbGFzcyBSZXNlYXJjaFF1ZXN0TW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG4gICAgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbjtcbiAgICB0aXRsZTogc3RyaW5nID0gXCJcIjtcbiAgICB0eXBlOiBcInN1cnZleVwiIHwgXCJkZWVwX2RpdmVcIiA9IFwic3VydmV5XCI7XG4gICAgbGlua2VkU2tpbGw6IHN0cmluZyA9IFwiTm9uZVwiO1xuICAgIGxpbmtlZENvbWJhdFF1ZXN0OiBzdHJpbmcgPSBcIk5vbmVcIjtcblxuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFNpc3lwaHVzUGx1Z2luKSB7XG4gICAgICAgIHN1cGVyKGFwcCk7XG4gICAgICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xuICAgIH1cblxuICAgIG9uT3BlbigpIHtcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogXCJSRVNFQVJDSCBERVBMT1lNRU5UXCIgfSk7XG5cbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKVxuICAgICAgICAgICAgLnNldE5hbWUoXCJSZXNlYXJjaCBUaXRsZVwiKVxuICAgICAgICAgICAgLmFkZFRleHQodCA9PiB7XG4gICAgICAgICAgICAgICAgdC5vbkNoYW5nZSh2ID0+IHRoaXMudGl0bGUgPSB2KTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHQuaW5wdXRFbC5mb2N1cygpLCA1MCk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpXG4gICAgICAgICAgICAuc2V0TmFtZShcIlJlc2VhcmNoIFR5cGVcIilcbiAgICAgICAgICAgIC5hZGREcm9wZG93bihkID0+IGRcbiAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKFwic3VydmV5XCIsIFwiU3VydmV5ICgxMDAtMjAwIHdvcmRzKVwiKVxuICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oXCJkZWVwX2RpdmVcIiwgXCJEZWVwIERpdmUgKDIwMC00MDAgd29yZHMpXCIpXG4gICAgICAgICAgICAgICAgLnNldFZhbHVlKFwic3VydmV5XCIpXG4gICAgICAgICAgICAgICAgLm9uQ2hhbmdlKHYgPT4gdGhpcy50eXBlID0gdiBhcyBcInN1cnZleVwiIHwgXCJkZWVwX2RpdmVcIilcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgY29uc3Qgc2tpbGxzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0geyBcIk5vbmVcIjogXCJOb25lXCIgfTtcbiAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Muc2tpbGxzLmZvckVhY2gocyA9PiBza2lsbHNbcy5uYW1lXSA9IHMubmFtZSk7XG5cbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKVxuICAgICAgICAgICAgLnNldE5hbWUoXCJMaW5rZWQgU2tpbGxcIilcbiAgICAgICAgICAgIC5hZGREcm9wZG93bihkID0+IGRcbiAgICAgICAgICAgICAgICAuYWRkT3B0aW9ucyhza2lsbHMpXG4gICAgICAgICAgICAgICAgLnNldFZhbHVlKFwiTm9uZVwiKVxuICAgICAgICAgICAgICAgIC5vbkNoYW5nZSh2ID0+IHRoaXMubGlua2VkU2tpbGwgPSB2KVxuICAgICAgICAgICAgKTtcblxuICAgICAgICBjb25zdCBjb21iYXRRdWVzdHM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7IFwiTm9uZVwiOiBcIk5vbmVcIiB9O1xuICAgICAgICBjb25zdCBxdWVzdEZvbGRlciA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChcIkFjdGl2ZV9SdW4vUXVlc3RzXCIpO1xuICAgICAgICBpZiAocXVlc3RGb2xkZXIgaW5zdGFuY2VvZiBURm9sZGVyKSB7XG4gICAgICAgICAgICBxdWVzdEZvbGRlci5jaGlsZHJlbi5mb3JFYWNoKGYgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChmIGluc3RhbmNlb2YgVEZpbGUgJiYgZi5leHRlbnNpb24gPT09IFwibWRcIikge1xuICAgICAgICAgICAgICAgICAgICBjb21iYXRRdWVzdHNbZi5iYXNlbmFtZV0gPSBmLmJhc2VuYW1lO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKVxuICAgICAgICAgICAgLnNldE5hbWUoXCJMaW5rIENvbWJhdCBRdWVzdFwiKVxuICAgICAgICAgICAgLmFkZERyb3Bkb3duKGQgPT4gZFxuICAgICAgICAgICAgICAgIC5hZGRPcHRpb25zKGNvbWJhdFF1ZXN0cylcbiAgICAgICAgICAgICAgICAuc2V0VmFsdWUoXCJOb25lXCIpXG4gICAgICAgICAgICAgICAgLm9uQ2hhbmdlKHYgPT4gdGhpcy5saW5rZWRDb21iYXRRdWVzdCA9IHYpXG4gICAgICAgICAgICApO1xuXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcbiAgICAgICAgICAgIC5hZGRCdXR0b24oYiA9PiBiXG4gICAgICAgICAgICAgICAgLnNldEJ1dHRvblRleHQoXCJDUkVBVEUgUkVTRUFSQ0hcIilcbiAgICAgICAgICAgICAgICAuc2V0Q3RhKClcbiAgICAgICAgICAgICAgICAub25DbGljaygoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnRpdGxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5lbmdpbmUuY3JlYXRlUmVzZWFyY2hRdWVzdChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRpdGxlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudHlwZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxpbmtlZFNraWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubGlua2VkQ29tYmF0UXVlc3RcbiAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgKTtcbiAgICB9XG5cbiAgICBvbkNsb3NlKCkge1xuICAgICAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFJlc2VhcmNoTGlzdE1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICAgIHBsdWdpbjogU2lzeXBodXNQbHVnaW47XG5cbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbikge1xuICAgICAgICBzdXBlcihhcHApO1xuICAgICAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcbiAgICB9XG5cbiAgICBvbk9wZW4oKSB7XG4gICAgICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwiUkVTRUFSQ0ggTElCUkFSWVwiIH0pO1xuXG4gICAgICAgIGNvbnN0IHN0YXRzID0gdGhpcy5wbHVnaW4uZW5naW5lLmdldFJlc2VhcmNoUmF0aW8oKTtcbiAgICAgICAgY29uc3Qgc3RhdHNFbCA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1yZXNlYXJjaC1zdGF0c1wiIH0pO1xuICAgICAgICBzdGF0c0VsLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IGBDb21iYXQgUXVlc3RzOiAke3N0YXRzLmNvbWJhdH1gIH0pO1xuICAgICAgICBzdGF0c0VsLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IGBSZXNlYXJjaCBRdWVzdHM6ICR7c3RhdHMucmVzZWFyY2h9YCB9KTtcbiAgICAgICAgc3RhdHNFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBgUmF0aW86ICR7c3RhdHMucmF0aW99OjFgIH0pO1xuXG4gICAgICAgIGlmICghdGhpcy5wbHVnaW4uZW5naW5lLmNhbkNyZWF0ZVJlc2VhcmNoUXVlc3QoKSkge1xuICAgICAgICAgICAgY29uc3Qgd2FybmluZyA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoKTtcbiAgICAgICAgICAgIHdhcm5pbmcuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJjb2xvcjogb3JhbmdlOyBmb250LXdlaWdodDogYm9sZDsgbWFyZ2luOiAxMHB4IDA7XCIpO1xuICAgICAgICAgICAgd2FybmluZy5zZXRUZXh0KFwiUkVTRUFSQ0ggQkxPQ0tFRDogTmVlZCAyOjEgY29tYmF0IHRvIHJlc2VhcmNoIHJhdGlvXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIkFjdGl2ZSBSZXNlYXJjaFwiIH0pO1xuXG4gICAgICAgIGNvbnN0IHF1ZXN0cyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnJlc2VhcmNoUXVlc3RzLmZpbHRlcihxID0+ICFxLmNvbXBsZXRlZCk7XG4gICAgICAgIGlmIChxdWVzdHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogXCJObyBhY3RpdmUgcmVzZWFyY2ggcXVlc3RzLlwiIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcXVlc3RzLmZvckVhY2goKHE6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNhcmQgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktcmVzZWFyY2gtY2FyZFwiIH0pO1xuICAgICAgICAgICAgICAgIGNhcmQuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJib3JkZXI6IDFweCBzb2xpZCAjNDQ0OyBwYWRkaW5nOiAxMHB4OyBtYXJnaW46IDVweCAwOyBib3JkZXItcmFkaXVzOiA0cHg7XCIpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gY2FyZC5jcmVhdGVFbChcImg0XCIsIHsgdGV4dDogcS50aXRsZSB9KTtcbiAgICAgICAgICAgICAgICBoZWFkZXIuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJtYXJnaW46IDAgMCA1cHggMDtcIik7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBpbmZvID0gY2FyZC5jcmVhdGVFbChcImRpdlwiKTtcbiAgICAgICAgICAgICAgICBpbmZvLnNldFRleHQoYFR5cGU6ICR7cS50eXBlID09PSBcInN1cnZleVwiID8gXCJTdXJ2ZXlcIiA6IFwiRGVlcCBEaXZlXCJ9IHwgV29yZHM6ICR7cS53b3JkQ291bnR9LyR7cS53b3JkTGltaXR9YCk7XG4gICAgICAgICAgICAgICAgaW5mby5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImZvbnQtc2l6ZTogMC45ZW07IG9wYWNpdHk6IDAuODtcIik7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBhY3Rpb25zID0gY2FyZC5jcmVhdGVEaXYoKTtcbiAgICAgICAgICAgICAgICBhY3Rpb25zLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luLXRvcDogOHB4OyBkaXNwbGF5OiBmbGV4OyBnYXA6IDVweDtcIik7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBjb21wbGV0ZUJ0biA9IGFjdGlvbnMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkNPTVBMRVRFXCIgfSk7XG4gICAgICAgICAgICAgICAgY29tcGxldGVCdG4uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJmbGV4OiAxOyBwYWRkaW5nOiA1cHg7IGJhY2tncm91bmQ6IGdyZWVuOyBjb2xvcjogd2hpdGU7IGJvcmRlcjogbm9uZTsgYm9yZGVyLXJhZGl1czogM3B4OyBjdXJzb3I6IHBvaW50ZXI7XCIpO1xuICAgICAgICAgICAgICAgIGNvbXBsZXRlQnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLmVuZ2luZS5jb21wbGV0ZVJlc2VhcmNoUXVlc3QocS5pZCwgcS53b3JkQ291bnQpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGRlbGV0ZUJ0biA9IGFjdGlvbnMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkRFTEVURVwiIH0pO1xuICAgICAgICAgICAgICAgIGRlbGV0ZUJ0bi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImZsZXg6IDE7IHBhZGRpbmc6IDVweDsgYmFja2dyb3VuZDogcmVkOyBjb2xvcjogd2hpdGU7IGJvcmRlcjogbm9uZTsgYm9yZGVyLXJhZGl1czogM3B4OyBjdXJzb3I6IHBvaW50ZXI7XCIpO1xuICAgICAgICAgICAgICAgIGRlbGV0ZUJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5lbmdpbmUuZGVsZXRlUmVzZWFyY2hRdWVzdChxLmlkKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJDb21wbGV0ZWQgUmVzZWFyY2hcIiB9KTtcbiAgICAgICAgY29uc3QgY29tcGxldGVkID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucmVzZWFyY2hRdWVzdHMuZmlsdGVyKHEgPT4gcS5jb21wbGV0ZWQpO1xuICAgICAgICBpZiAoY29tcGxldGVkLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IFwiTm8gY29tcGxldGVkIHJlc2VhcmNoLlwiIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29tcGxldGVkLmZvckVhY2goKHE6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBjb250ZW50RWwuY3JlYXRlRWwoXCJwXCIpO1xuICAgICAgICAgICAgICAgIGl0ZW0uc2V0VGV4dChgKyAke3EudGl0bGV9ICgke3EudHlwZSA9PT0gXCJzdXJ2ZXlcIiA/IFwiU3VydmV5XCIgOiBcIkRlZXAgRGl2ZVwifSlgKTtcbiAgICAgICAgICAgICAgICBpdGVtLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwib3BhY2l0eTogMC42OyBmb250LXNpemU6IDAuOWVtO1wiKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgb25DbG9zZSgpIHtcbiAgICAgICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgICB9XG59XG5cblxuZXhwb3J0IGNsYXNzIENoYWluQnVpbGRlck1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICAgIHBsdWdpbjogU2lzeXBodXNQbHVnaW47XG4gICAgY2hhaW5OYW1lOiBzdHJpbmcgPSBcIlwiO1xuICAgIHNlbGVjdGVkUXVlc3RzOiBzdHJpbmdbXSA9IFtdO1xuXG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogU2lzeXBodXNQbHVnaW4pIHtcbiAgICAgICAgc3VwZXIoYXBwKTtcbiAgICAgICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XG4gICAgfVxuXG4gICAgb25PcGVuKCkge1xuICAgICAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBcIkNIQUlOIEJVSUxERVJcIiB9KTtcblxuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpXG4gICAgICAgICAgICAuc2V0TmFtZShcIkNoYWluIE5hbWVcIilcbiAgICAgICAgICAgIC5hZGRUZXh0KHQgPT4ge1xuICAgICAgICAgICAgICAgIHQub25DaGFuZ2UodiA9PiB0aGlzLmNoYWluTmFtZSA9IHYpO1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4gdC5pbnB1dEVsLmZvY3VzKCksIDUwKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJTZWxlY3QgUXVlc3RzXCIgfSk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBxdWVzdEZvbGRlciA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChcIkFjdGl2ZV9SdW4vUXVlc3RzXCIpO1xuICAgICAgICBjb25zdCBxdWVzdHM6IHN0cmluZ1tdID0gW107XG4gICAgICAgIFxuICAgICAgICBpZiAocXVlc3RGb2xkZXIgaW5zdGFuY2VvZiBURm9sZGVyKSB7XG4gICAgICAgICAgICBxdWVzdEZvbGRlci5jaGlsZHJlbi5mb3JFYWNoKGYgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChmIGluc3RhbmNlb2YgVEZpbGUgJiYgZi5leHRlbnNpb24gPT09IFwibWRcIikge1xuICAgICAgICAgICAgICAgICAgICBxdWVzdHMucHVzaChmLmJhc2VuYW1lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHF1ZXN0cy5mb3JFYWNoKChxdWVzdCwgaWR4KSA9PiB7XG4gICAgICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpXG4gICAgICAgICAgICAgICAgLnNldE5hbWUocXVlc3QpXG4gICAgICAgICAgICAgICAgLmFkZFRvZ2dsZSh0ID0+IHQub25DaGFuZ2UodiA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGVkUXVlc3RzLnB1c2gocXVlc3QpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZFF1ZXN0cyA9IHRoaXMuc2VsZWN0ZWRRdWVzdHMuZmlsdGVyKHEgPT4gcSAhPT0gcXVlc3QpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICB9KTtcblxuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpXG4gICAgICAgICAgICAuYWRkQnV0dG9uKGIgPT4gYlxuICAgICAgICAgICAgICAgIC5zZXRCdXR0b25UZXh0KFwiQ1JFQVRFIENIQUlOXCIpXG4gICAgICAgICAgICAgICAgLnNldEN0YSgpXG4gICAgICAgICAgICAgICAgLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jaGFpbk5hbWUgJiYgdGhpcy5zZWxlY3RlZFF1ZXN0cy5sZW5ndGggPj0gMikge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uZW5naW5lLmNyZWF0ZVF1ZXN0Q2hhaW4odGhpcy5jaGFpbk5hbWUsIHRoaXMuc2VsZWN0ZWRRdWVzdHMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3IE5vdGljZShcIkNoYWluIG5lZWRzIGEgbmFtZSBhbmQgYXQgbGVhc3QgMiBxdWVzdHNcIik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgKTtcbiAgICB9XG5cbiAgICBvbkNsb3NlKCkge1xuICAgICAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IG1vbWVudCB9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCB7IFNpc3lwaHVzU2V0dGluZ3MsIERheU1ldHJpY3MsIFdlZWtseVJlcG9ydCwgQm9zc01pbGVzdG9uZSwgU3RyZWFrLCBBY2hpZXZlbWVudCB9IGZyb20gJy4uL3R5cGVzJztcblxuLyoqXG4gKiBETEMgNjogQW5hbHl0aWNzICYgRW5kZ2FtZSBFbmdpbmVcbiAqIEhhbmRsZXMgYWxsIG1ldHJpY3MgdHJhY2tpbmcsIGJvc3MgbWlsZXN0b25lcywgYWNoaWV2ZW1lbnRzLCBhbmQgd2luIGNvbmRpdGlvblxuICogXG4gKiBJU09MQVRFRDogT25seSByZWFkcy93cml0ZXMgdG8gc2V0dGluZ3MuZGF5TWV0cmljcywgd2Vla2x5UmVwb3J0cywgYm9zc01pbGVzdG9uZXMsIHN0cmVhaywgYWNoaWV2ZW1lbnRzXG4gKiBERVBFTkRFTkNJRVM6IG1vbWVudCwgU2lzeXBodXNTZXR0aW5ncyB0eXBlc1xuICovXG5leHBvcnQgY2xhc3MgQW5hbHl0aWNzRW5naW5lIHtcbiAgICBzZXR0aW5nczogU2lzeXBodXNTZXR0aW5ncztcbiAgICBhdWRpb0NvbnRyb2xsZXI/OiBhbnk7IC8vIE9wdGlvbmFsIGF1ZGlvIGNhbGxiYWNrIGZvciBub3RpZmljYXRpb25zXG5cbiAgICBjb25zdHJ1Y3RvcihzZXR0aW5nczogU2lzeXBodXNTZXR0aW5ncywgYXVkaW9Db250cm9sbGVyPzogYW55KSB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MgPSBzZXR0aW5ncztcbiAgICAgICAgdGhpcy5hdWRpb0NvbnRyb2xsZXIgPSBhdWRpb0NvbnRyb2xsZXI7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVHJhY2sgZGFpbHkgbWV0cmljcyAtIGNhbGxlZCB3aGVuZXZlciBhIHF1ZXN0IGlzIGNvbXBsZXRlZC9mYWlsZWQvZXRjXG4gICAgICovXG4gICAgdHJhY2tEYWlseU1ldHJpY3ModHlwZTogJ3F1ZXN0X2NvbXBsZXRlJyB8ICdxdWVzdF9mYWlsJyB8ICd4cCcgfCAnZ29sZCcgfCAnZGFtYWdlJyB8ICdza2lsbF9sZXZlbCcgfCAnY2hhaW5fY29tcGxldGUnLCBhbW91bnQ6IG51bWJlciA9IDEpIHtcbiAgICAgICAgY29uc3QgdG9kYXkgPSBtb21lbnQoKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpO1xuICAgICAgICBcbiAgICAgICAgbGV0IG1ldHJpYyA9IHRoaXMuc2V0dGluZ3MuZGF5TWV0cmljcy5maW5kKG0gPT4gbS5kYXRlID09PSB0b2RheSk7XG4gICAgICAgIGlmICghbWV0cmljKSB7XG4gICAgICAgICAgICBtZXRyaWMgPSB7XG4gICAgICAgICAgICAgICAgZGF0ZTogdG9kYXksXG4gICAgICAgICAgICAgICAgcXVlc3RzQ29tcGxldGVkOiAwLFxuICAgICAgICAgICAgICAgIHF1ZXN0c0ZhaWxlZDogMCxcbiAgICAgICAgICAgICAgICB4cEVhcm5lZDogMCxcbiAgICAgICAgICAgICAgICBnb2xkRWFybmVkOiAwLFxuICAgICAgICAgICAgICAgIGRhbWFnZXNUYWtlbjogMCxcbiAgICAgICAgICAgICAgICBza2lsbHNMZXZlbGVkOiBbXSxcbiAgICAgICAgICAgICAgICBjaGFpbnNDb21wbGV0ZWQ6IDBcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmRheU1ldHJpY3MucHVzaChtZXRyaWMpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgXCJxdWVzdF9jb21wbGV0ZVwiOlxuICAgICAgICAgICAgICAgIG1ldHJpYy5xdWVzdHNDb21wbGV0ZWQgKz0gYW1vdW50O1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcInF1ZXN0X2ZhaWxcIjpcbiAgICAgICAgICAgICAgICBtZXRyaWMucXVlc3RzRmFpbGVkICs9IGFtb3VudDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJ4cFwiOlxuICAgICAgICAgICAgICAgIG1ldHJpYy54cEVhcm5lZCArPSBhbW91bnQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiZ29sZFwiOlxuICAgICAgICAgICAgICAgIG1ldHJpYy5nb2xkRWFybmVkICs9IGFtb3VudDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJkYW1hZ2VcIjpcbiAgICAgICAgICAgICAgICBtZXRyaWMuZGFtYWdlc1Rha2VuICs9IGFtb3VudDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJza2lsbF9sZXZlbFwiOlxuICAgICAgICAgICAgICAgIG1ldHJpYy5za2lsbHNMZXZlbGVkLnB1c2goXCJTa2lsbCBsZXZlbGVkXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcImNoYWluX2NvbXBsZXRlXCI6XG4gICAgICAgICAgICAgICAgbWV0cmljLmNoYWluc0NvbXBsZXRlZCArPSBhbW91bnQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgZGFpbHkgc3RyZWFrIC0gY2FsbGVkIG9uY2UgcGVyIGRheSBhdCBsb2dpblxuICAgICAqL1xuICAgIHVwZGF0ZVN0cmVhaygpIHtcbiAgICAgICAgY29uc3QgdG9kYXkgPSBtb21lbnQoKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpO1xuICAgICAgICBjb25zdCBsYXN0RGF0ZSA9IHRoaXMuc2V0dGluZ3Muc3RyZWFrLmxhc3REYXRlO1xuICAgICAgICBcbiAgICAgICAgaWYgKGxhc3REYXRlID09PSB0b2RheSkge1xuICAgICAgICAgICAgcmV0dXJuOyAvLyBBbHJlYWR5IGNvdW50ZWQgdG9kYXlcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgeWVzdGVyZGF5ID0gbW9tZW50KCkuc3VidHJhY3QoMSwgJ2RheScpLmZvcm1hdChcIllZWVktTU0tRERcIik7XG4gICAgICAgIFxuICAgICAgICBpZiAobGFzdERhdGUgPT09IHllc3RlcmRheSkge1xuICAgICAgICAgICAgLy8gQ29uc2VjdXRpdmUgZGF5XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLnN0cmVhay5jdXJyZW50Kys7XG4gICAgICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5zdHJlYWsuY3VycmVudCA+IHRoaXMuc2V0dGluZ3Muc3RyZWFrLmxvbmdlc3QpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLnN0cmVhay5sb25nZXN0ID0gdGhpcy5zZXR0aW5ncy5zdHJlYWsuY3VycmVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFN0cmVhayBicm9rZW4sIHN0YXJ0IG5ldyBvbmVcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3Muc3RyZWFrLmN1cnJlbnQgPSAxO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLnN0cmVhay5sYXN0RGF0ZSA9IHRvZGF5O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYm9zcyBtaWxlc3RvbmVzIG9uIGZpcnN0IHJ1blxuICAgICAqL1xuICAgIGluaXRpYWxpemVCb3NzTWlsZXN0b25lcygpIHtcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuYm9zc01pbGVzdG9uZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBjb25zdCBtaWxlc3RvbmVzID0gW1xuICAgICAgICAgICAgICAgIHsgbGV2ZWw6IDEwLCBuYW1lOiBcIlRoZSBGaXJzdCBUcmlhbFwiLCB1bmxvY2tlZDogZmFsc2UsIGRlZmVhdGVkOiBmYWxzZSwgeHBSZXdhcmQ6IDUwMCB9LFxuICAgICAgICAgICAgICAgIHsgbGV2ZWw6IDIwLCBuYW1lOiBcIlRoZSBOZW1lc2lzIFJldHVybnNcIiwgdW5sb2NrZWQ6IGZhbHNlLCBkZWZlYXRlZDogZmFsc2UsIHhwUmV3YXJkOiAxMDAwIH0sXG4gICAgICAgICAgICAgICAgeyBsZXZlbDogMzAsIG5hbWU6IFwiVGhlIFJlYXBlciBBd2FrZW5zXCIsIHVubG9ja2VkOiBmYWxzZSwgZGVmZWF0ZWQ6IGZhbHNlLCB4cFJld2FyZDogMTUwMCB9LFxuICAgICAgICAgICAgICAgIHsgbGV2ZWw6IDUwLCBuYW1lOiBcIlRoZSBGaW5hbCBBc2NlbnNpb25cIiwgdW5sb2NrZWQ6IGZhbHNlLCBkZWZlYXRlZDogZmFsc2UsIHhwUmV3YXJkOiA1MDAwIH1cbiAgICAgICAgICAgIF07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuYm9zc01pbGVzdG9uZXMgPSBtaWxlc3RvbmVzIGFzIGFueTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIGFueSBib3NzZXMgc2hvdWxkIGJlIHVubG9ja2VkIGJhc2VkIG9uIGN1cnJlbnQgbGV2ZWxcbiAgICAgKi9cbiAgICBjaGVja0Jvc3NNaWxlc3RvbmVzKCk6IHN0cmluZ1tdIHtcbiAgICAgICAgY29uc3QgbWVzc2FnZXM6IHN0cmluZ1tdID0gW107XG4gICAgICAgIFxuICAgICAgICBpZiAoIXRoaXMuc2V0dGluZ3MuYm9zc01pbGVzdG9uZXMgfHwgdGhpcy5zZXR0aW5ncy5ib3NzTWlsZXN0b25lcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZUJvc3NNaWxlc3RvbmVzKCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0dGluZ3MuYm9zc01pbGVzdG9uZXMuZm9yRWFjaCgoYm9zczogQm9zc01pbGVzdG9uZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MubGV2ZWwgPj0gYm9zcy5sZXZlbCAmJiAhYm9zcy51bmxvY2tlZCkge1xuICAgICAgICAgICAgICAgIGJvc3MudW5sb2NrZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2VzLnB1c2goYEJvc3MgVW5sb2NrZWQ6ICR7Ym9zcy5uYW1lfSAoTGV2ZWwgJHtib3NzLmxldmVsfSlgKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5hdWRpb0NvbnRyb2xsZXI/LnBsYXlTb3VuZCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmF1ZGlvQ29udHJvbGxlci5wbGF5U291bmQoXCJzdWNjZXNzXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gbWVzc2FnZXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTWFyayBib3NzIGFzIGRlZmVhdGVkIGFuZCBhd2FyZCBYUFxuICAgICAqL1xuICAgIGRlZmVhdEJvc3MobGV2ZWw6IG51bWJlcik6IHsgc3VjY2VzczogYm9vbGVhbjsgbWVzc2FnZTogc3RyaW5nOyB4cFJld2FyZDogbnVtYmVyIH0ge1xuICAgICAgICBjb25zdCBib3NzID0gdGhpcy5zZXR0aW5ncy5ib3NzTWlsZXN0b25lcy5maW5kKChiOiBCb3NzTWlsZXN0b25lKSA9PiBiLmxldmVsID09PSBsZXZlbCk7XG4gICAgICAgIGlmICghYm9zcykge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6IFwiQm9zcyBub3QgZm91bmRcIiwgeHBSZXdhcmQ6IDAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKGJvc3MuZGVmZWF0ZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlOiBcIkJvc3MgYWxyZWFkeSBkZWZlYXRlZFwiLCB4cFJld2FyZDogMCB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBib3NzLmRlZmVhdGVkID0gdHJ1ZTtcbiAgICAgICAgYm9zcy5kZWZlYXRlZEF0ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5zZXR0aW5ncy54cCArPSBib3NzLnhwUmV3YXJkO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuYXVkaW9Db250cm9sbGVyPy5wbGF5U291bmQpIHtcbiAgICAgICAgICAgIHRoaXMuYXVkaW9Db250cm9sbGVyLnBsYXlTb3VuZChcInN1Y2Nlc3NcIik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIHdpbiBjb25kaXRpb25cbiAgICAgICAgaWYgKGxldmVsID09PSA1MCkge1xuICAgICAgICAgICAgdGhpcy53aW5HYW1lKCk7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBgQm9zcyBEZWZlYXRlZDogJHtib3NzLm5hbWV9ISBWSUNUT1JZIWAsIHhwUmV3YXJkOiBib3NzLnhwUmV3YXJkIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBCb3NzIERlZmVhdGVkOiAke2Jvc3MubmFtZX0hICske2Jvc3MueHBSZXdhcmR9IFhQYCwgeHBSZXdhcmQ6IGJvc3MueHBSZXdhcmQgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUcmlnZ2VyIHdpbiBjb25kaXRpb25cbiAgICAgKi9cbiAgICBwcml2YXRlIHdpbkdhbWUoKSB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuZ2FtZVdvbiA9IHRydWU7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuZW5kR2FtZURhdGUgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5hdWRpb0NvbnRyb2xsZXI/LnBsYXlTb3VuZCkge1xuICAgICAgICAgICAgdGhpcy5hdWRpb0NvbnRyb2xsZXIucGxheVNvdW5kKFwic3VjY2Vzc1wiKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIHdlZWtseSByZXBvcnRcbiAgICAgKi9cbiAgICBnZW5lcmF0ZVdlZWtseVJlcG9ydCgpOiBXZWVrbHlSZXBvcnQge1xuICAgICAgICBjb25zdCB3ZWVrID0gbW9tZW50KCkud2VlaygpO1xuICAgICAgICBjb25zdCBzdGFydERhdGUgPSBtb21lbnQoKS5zdGFydE9mKCd3ZWVrJykuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcbiAgICAgICAgY29uc3QgZW5kRGF0ZSA9IG1vbWVudCgpLmVuZE9mKCd3ZWVrJykuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHdlZWtNZXRyaWNzID0gdGhpcy5zZXR0aW5ncy5kYXlNZXRyaWNzLmZpbHRlcigobTogRGF5TWV0cmljcykgPT4gXG4gICAgICAgICAgICBtb21lbnQobS5kYXRlKS5pc0JldHdlZW4obW9tZW50KHN0YXJ0RGF0ZSksIG1vbWVudChlbmREYXRlKSwgbnVsbCwgJ1tdJylcbiAgICAgICAgKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHRvdGFsUXVlc3RzID0gd2Vla01ldHJpY3MucmVkdWNlKChzdW06IG51bWJlciwgbTogRGF5TWV0cmljcykgPT4gc3VtICsgbS5xdWVzdHNDb21wbGV0ZWQsIDApO1xuICAgICAgICBjb25zdCB0b3RhbEZhaWxlZCA9IHdlZWtNZXRyaWNzLnJlZHVjZSgoc3VtOiBudW1iZXIsIG06IERheU1ldHJpY3MpID0+IHN1bSArIG0ucXVlc3RzRmFpbGVkLCAwKTtcbiAgICAgICAgY29uc3Qgc3VjY2Vzc1JhdGUgPSB0b3RhbFF1ZXN0cyArIHRvdGFsRmFpbGVkID4gMCA/IE1hdGgucm91bmQoKHRvdGFsUXVlc3RzIC8gKHRvdGFsUXVlc3RzICsgdG90YWxGYWlsZWQpKSAqIDEwMCkgOiAwO1xuICAgICAgICBjb25zdCB0b3RhbFhwID0gd2Vla01ldHJpY3MucmVkdWNlKChzdW06IG51bWJlciwgbTogRGF5TWV0cmljcykgPT4gc3VtICsgbS54cEVhcm5lZCwgMCk7XG4gICAgICAgIGNvbnN0IHRvdGFsR29sZCA9IHdlZWtNZXRyaWNzLnJlZHVjZSgoc3VtOiBudW1iZXIsIG06IERheU1ldHJpY3MpID0+IHN1bSArIG0uZ29sZEVhcm5lZCwgMCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCB0b3BTa2lsbHMgPSB0aGlzLnNldHRpbmdzLnNraWxsc1xuICAgICAgICAgICAgLnNvcnQoKGE6IGFueSwgYjogYW55KSA9PiAoYi5sZXZlbCAtIGEubGV2ZWwpKVxuICAgICAgICAgICAgLnNsaWNlKDAsIDMpXG4gICAgICAgICAgICAubWFwKChzOiBhbnkpID0+IHMubmFtZSk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBiZXN0RGF5ID0gd2Vla01ldHJpY3MubGVuZ3RoID4gMCBcbiAgICAgICAgICAgID8gd2Vla01ldHJpY3MucmVkdWNlKChtYXg6IERheU1ldHJpY3MsIG06IERheU1ldHJpY3MpID0+IG0ucXVlc3RzQ29tcGxldGVkID4gbWF4LnF1ZXN0c0NvbXBsZXRlZCA/IG0gOiBtYXgpLmRhdGVcbiAgICAgICAgICAgIDogc3RhcnREYXRlO1xuICAgICAgICBcbiAgICAgICAgY29uc3Qgd29yc3REYXkgPSB3ZWVrTWV0cmljcy5sZW5ndGggPiAwXG4gICAgICAgICAgICA/IHdlZWtNZXRyaWNzLnJlZHVjZSgobWluOiBEYXlNZXRyaWNzLCBtOiBEYXlNZXRyaWNzKSA9PiBtLnF1ZXN0c0ZhaWxlZCA+IG1pbi5xdWVzdHNGYWlsZWQgPyBtIDogbWluKS5kYXRlXG4gICAgICAgICAgICA6IHN0YXJ0RGF0ZTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHJlcG9ydDogV2Vla2x5UmVwb3J0ID0ge1xuICAgICAgICAgICAgd2Vlazogd2VlayxcbiAgICAgICAgICAgIHN0YXJ0RGF0ZTogc3RhcnREYXRlLFxuICAgICAgICAgICAgZW5kRGF0ZTogZW5kRGF0ZSxcbiAgICAgICAgICAgIHRvdGFsUXVlc3RzOiB0b3RhbFF1ZXN0cyxcbiAgICAgICAgICAgIHN1Y2Nlc3NSYXRlOiBzdWNjZXNzUmF0ZSxcbiAgICAgICAgICAgIHRvdGFsWHA6IHRvdGFsWHAsXG4gICAgICAgICAgICB0b3RhbEdvbGQ6IHRvdGFsR29sZCxcbiAgICAgICAgICAgIHRvcFNraWxsczogdG9wU2tpbGxzLFxuICAgICAgICAgICAgYmVzdERheTogYmVzdERheSxcbiAgICAgICAgICAgIHdvcnN0RGF5OiB3b3JzdERheVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgdGhpcy5zZXR0aW5ncy53ZWVrbHlSZXBvcnRzLnB1c2gocmVwb3J0KTtcbiAgICAgICAgcmV0dXJuIHJlcG9ydDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBVbmxvY2sgYW4gYWNoaWV2ZW1lbnRcbiAgICAgKi9cbiAgICB1bmxvY2tBY2hpZXZlbWVudChhY2hpZXZlbWVudElkOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgY29uc3QgYWNoaWV2ZW1lbnQgPSB0aGlzLnNldHRpbmdzLmFjaGlldmVtZW50cy5maW5kKChhOiBBY2hpZXZlbWVudCkgPT4gYS5pZCA9PT0gYWNoaWV2ZW1lbnRJZCk7XG4gICAgICAgIGlmICghYWNoaWV2ZW1lbnQgfHwgYWNoaWV2ZW1lbnQudW5sb2NrZWQpIHJldHVybiBmYWxzZTtcbiAgICAgICAgXG4gICAgICAgIGFjaGlldmVtZW50LnVubG9ja2VkID0gdHJ1ZTtcbiAgICAgICAgYWNoaWV2ZW1lbnQudW5sb2NrZWRBdCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLmF1ZGlvQ29udHJvbGxlcj8ucGxheVNvdW5kKSB7XG4gICAgICAgICAgICB0aGlzLmF1ZGlvQ29udHJvbGxlci5wbGF5U291bmQoXCJzdWNjZXNzXCIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgY3VycmVudCBnYW1lIHN0YXRzIHNuYXBzaG90XG4gICAgICovXG4gICAgZ2V0R2FtZVN0YXRzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbGV2ZWw6IHRoaXMuc2V0dGluZ3MubGV2ZWwsXG4gICAgICAgICAgICBjdXJyZW50U3RyZWFrOiB0aGlzLnNldHRpbmdzLnN0cmVhay5jdXJyZW50LFxuICAgICAgICAgICAgbG9uZ2VzdFN0cmVhazogdGhpcy5zZXR0aW5ncy5zdHJlYWsubG9uZ2VzdCxcbiAgICAgICAgICAgIHRvdGFsUXVlc3RzOiB0aGlzLnNldHRpbmdzLmRheU1ldHJpY3MucmVkdWNlKChzdW06IG51bWJlciwgbTogRGF5TWV0cmljcykgPT4gc3VtICsgbS5xdWVzdHNDb21wbGV0ZWQsIDApLFxuICAgICAgICAgICAgdG90YWxYcDogdGhpcy5zZXR0aW5ncy54cCArIHRoaXMuc2V0dGluZ3MuZGF5TWV0cmljcy5yZWR1Y2UoKHN1bTogbnVtYmVyLCBtOiBEYXlNZXRyaWNzKSA9PiBzdW0gKyBtLnhwRWFybmVkLCAwKSxcbiAgICAgICAgICAgIGdhbWVXb246IHRoaXMuc2V0dGluZ3MuZ2FtZVdvbixcbiAgICAgICAgICAgIGJvc3Nlc0RlZmVhdGVkOiB0aGlzLnNldHRpbmdzLmJvc3NNaWxlc3RvbmVzLmZpbHRlcigoYjogQm9zc01pbGVzdG9uZSkgPT4gYi5kZWZlYXRlZCkubGVuZ3RoLFxuICAgICAgICAgICAgdG90YWxCb3NzZXM6IHRoaXMuc2V0dGluZ3MuYm9zc01pbGVzdG9uZXMubGVuZ3RoXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHN1cnZpdmFsIGVzdGltYXRlIChyb3VnaCBjYWxjdWxhdGlvbilcbiAgICAgKi9cbiAgICBnZXRTdXJ2aXZhbEVzdGltYXRlKCk6IG51bWJlciB7XG4gICAgICAgIGNvbnN0IGRhbWFnZVBlckZhaWx1cmUgPSAxMCArIE1hdGguZmxvb3IodGhpcy5zZXR0aW5ncy5yaXZhbERtZyAvIDIpO1xuICAgICAgICBjb25zdCBhY3R1YWxEYW1hZ2UgPSB0aGlzLnNldHRpbmdzLmdvbGQgPCAwID8gZGFtYWdlUGVyRmFpbHVyZSAqIDIgOiBkYW1hZ2VQZXJGYWlsdXJlO1xuICAgICAgICByZXR1cm4gTWF0aC5mbG9vcih0aGlzLnNldHRpbmdzLmhwIC8gTWF0aC5tYXgoMSwgYWN0dWFsRGFtYWdlKSk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgbW9tZW50IH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IHsgU2lzeXBodXNTZXR0aW5ncyB9IGZyb20gJy4uL3R5cGVzJztcblxuLyoqXG4gKiBETEMgMzogTWVkaXRhdGlvbiAmIFJlY292ZXJ5IEVuZ2luZVxuICogSGFuZGxlcyBsb2NrZG93biBzdGF0ZSwgbWVkaXRhdGlvbiBoZWFsaW5nLCBhbmQgcXVlc3QgZGVsZXRpb24gcXVvdGFcbiAqIFxuICogSVNPTEFURUQ6IE9ubHkgcmVhZHMvd3JpdGVzIHRvIGxvY2tkb3duVW50aWwsIGlzTWVkaXRhdGluZywgbWVkaXRhdGlvbkNsaWNrc1RoaXNMb2NrZG93biwgXG4gKiAgICAgICAgICAgcXVlc3REZWxldGlvbnNUb2RheSwgbGFzdERlbGV0aW9uUmVzZXRcbiAqIERFUEVOREVOQ0lFUzogbW9tZW50LCBTaXN5cGh1c1NldHRpbmdzXG4gKiBTSURFIEVGRkVDVFM6IFBsYXlzIGF1ZGlvICg0MzIgSHogdG9uZSlcbiAqL1xuZXhwb3J0IGNsYXNzIE1lZGl0YXRpb25FbmdpbmUge1xuICAgIHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzO1xuICAgIGF1ZGlvQ29udHJvbGxlcj86IGFueTsgLy8gT3B0aW9uYWwgZm9yIDQzMiBIeiBzb3VuZFxuICAgIHByaXZhdGUgbWVkaXRhdGlvbkNvb2xkb3duTXMgPSAzMDAwMDsgLy8gMzAgc2Vjb25kc1xuXG4gICAgY29uc3RydWN0b3Ioc2V0dGluZ3M6IFNpc3lwaHVzU2V0dGluZ3MsIGF1ZGlvQ29udHJvbGxlcj86IGFueSkge1xuICAgICAgICB0aGlzLnNldHRpbmdzID0gc2V0dGluZ3M7XG4gICAgICAgIHRoaXMuYXVkaW9Db250cm9sbGVyID0gYXVkaW9Db250cm9sbGVyO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIGN1cnJlbnRseSBsb2NrZWQgZG93blxuICAgICAqL1xuICAgIGlzTG9ja2VkRG93bigpOiBib29sZWFuIHtcbiAgICAgICAgaWYgKCF0aGlzLnNldHRpbmdzLmxvY2tkb3duVW50aWwpIHJldHVybiBmYWxzZTtcbiAgICAgICAgcmV0dXJuIG1vbWVudCgpLmlzQmVmb3JlKG1vbWVudCh0aGlzLnNldHRpbmdzLmxvY2tkb3duVW50aWwpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgbG9ja2Rvd24gdGltZSByZW1haW5pbmcgaW4gbWludXRlc1xuICAgICAqL1xuICAgIGdldExvY2tkb3duVGltZVJlbWFpbmluZygpOiB7IGhvdXJzOiBudW1iZXI7IG1pbnV0ZXM6IG51bWJlcjsgdG90YWxNaW51dGVzOiBudW1iZXIgfSB7XG4gICAgICAgIGlmICghdGhpcy5pc0xvY2tlZERvd24oKSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgaG91cnM6IDAsIG1pbnV0ZXM6IDAsIHRvdGFsTWludXRlczogMCB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCB0b3RhbE1pbnV0ZXMgPSBtb21lbnQodGhpcy5zZXR0aW5ncy5sb2NrZG93blVudGlsKS5kaWZmKG1vbWVudCgpLCAnbWludXRlcycpO1xuICAgICAgICBjb25zdCBob3VycyA9IE1hdGguZmxvb3IodG90YWxNaW51dGVzIC8gNjApO1xuICAgICAgICBjb25zdCBtaW51dGVzID0gdG90YWxNaW51dGVzICUgNjA7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4geyBob3VycywgbWludXRlcywgdG90YWxNaW51dGVzIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVHJpZ2dlciBsb2NrZG93biBhZnRlciB0YWtpbmcgNTArIGRhbWFnZVxuICAgICAqL1xuICAgIHRyaWdnZXJMb2NrZG93bigpIHtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5sb2NrZG93blVudGlsID0gbW9tZW50KCkuYWRkKDYsICdob3VycycpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MubWVkaXRhdGlvbkNsaWNrc1RoaXNMb2NrZG93biA9IDA7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGVyZm9ybSBvbmUgbWVkaXRhdGlvbiBjeWNsZSAoY2xpY2spXG4gICAgICogUmV0dXJuczogeyBzdWNjZXNzLCBjeWNsZXNEb25lLCBjeWNsZXNSZW1haW5pbmcsIG1lc3NhZ2UgfVxuICAgICAqL1xuICAgIG1lZGl0YXRlKCk6IHsgc3VjY2VzczogYm9vbGVhbjsgY3ljbGVzRG9uZTogbnVtYmVyOyBjeWNsZXNSZW1haW5pbmc6IG51bWJlcjsgbWVzc2FnZTogc3RyaW5nOyBsb2NrZG93blJlZHVjZWQ6IGJvb2xlYW4gfSB7XG4gICAgICAgIGlmICghdGhpcy5pc0xvY2tlZERvd24oKSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBjeWNsZXNEb25lOiAwLFxuICAgICAgICAgICAgICAgIGN5Y2xlc1JlbWFpbmluZzogMCxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBcIk5vdCBpbiBsb2NrZG93bi4gTm8gbmVlZCB0byBtZWRpdGF0ZS5cIixcbiAgICAgICAgICAgICAgICBsb2NrZG93blJlZHVjZWQ6IGZhbHNlXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5pc01lZGl0YXRpbmcpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgY3ljbGVzRG9uZTogdGhpcy5zZXR0aW5ncy5tZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3duLFxuICAgICAgICAgICAgICAgIGN5Y2xlc1JlbWFpbmluZzogTWF0aC5tYXgoMCwgMTAgLSB0aGlzLnNldHRpbmdzLm1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd24pLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IFwiQWxyZWFkeSBtZWRpdGF0aW5nLiBXYWl0IDMwIHNlY29uZHMuXCIsXG4gICAgICAgICAgICAgICAgbG9ja2Rvd25SZWR1Y2VkOiBmYWxzZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5pc01lZGl0YXRpbmcgPSB0cnVlO1xuICAgICAgICB0aGlzLnNldHRpbmdzLm1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd24rKztcbiAgICAgICAgXG4gICAgICAgIC8vIFBsYXkgaGVhbGluZyBmcmVxdWVuY3lcbiAgICAgICAgdGhpcy5wbGF5TWVkaXRhdGlvblNvdW5kKCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCByZW1haW5pbmcgPSAxMCAtIHRoaXMuc2V0dGluZ3MubWVkaXRhdGlvbkNsaWNrc1RoaXNMb2NrZG93bjtcbiAgICAgICAgbGV0IGxvY2tkb3duUmVkdWNlZCA9IGZhbHNlO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgMTAgY3ljbGVzIGNvbXBsZXRlXG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLm1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd24gPj0gMTApIHtcbiAgICAgICAgICAgIGNvbnN0IHJlZHVjZWRUaW1lID0gbW9tZW50KHRoaXMuc2V0dGluZ3MubG9ja2Rvd25VbnRpbCkuc3VidHJhY3QoNSwgJ2hvdXJzJyk7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmxvY2tkb3duVW50aWwgPSByZWR1Y2VkVGltZS50b0lTT1N0cmluZygpO1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5tZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3duID0gMDtcbiAgICAgICAgICAgIGxvY2tkb3duUmVkdWNlZCA9IHRydWU7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICh0aGlzLmF1ZGlvQ29udHJvbGxlcj8ucGxheVNvdW5kKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hdWRpb0NvbnRyb2xsZXIucGxheVNvdW5kKFwic3VjY2Vzc1wiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQXV0by1yZXNldCBtZWRpdGF0aW9uIGZsYWcgYWZ0ZXIgY29vbGRvd25cbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuaXNNZWRpdGF0aW5nID0gZmFsc2U7XG4gICAgICAgICAgICB9LCB0aGlzLm1lZGl0YXRpb25Db29sZG93bk1zKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGN5Y2xlc0RvbmU6IDAsXG4gICAgICAgICAgICAgICAgY3ljbGVzUmVtYWluaW5nOiAwLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IFwiTWVkaXRhdGlvbiBjb21wbGV0ZS4gTG9ja2Rvd24gcmVkdWNlZCBieSA1IGhvdXJzLlwiLFxuICAgICAgICAgICAgICAgIGxvY2tkb3duUmVkdWNlZDogdHJ1ZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQXV0by1yZXNldCBtZWRpdGF0aW9uIGZsYWcgYWZ0ZXIgY29vbGRvd25cbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmlzTWVkaXRhdGluZyA9IGZhbHNlO1xuICAgICAgICB9LCB0aGlzLm1lZGl0YXRpb25Db29sZG93bk1zKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgY3ljbGVzRG9uZTogdGhpcy5zZXR0aW5ncy5tZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3duLFxuICAgICAgICAgICAgY3ljbGVzUmVtYWluaW5nOiByZW1haW5pbmcsXG4gICAgICAgICAgICBtZXNzYWdlOiBgTWVkaXRhdGlvbiAoJHt0aGlzLnNldHRpbmdzLm1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd259LzEwKSAtICR7cmVtYWluaW5nfSBjeWNsZXMgbGVmdGAsXG4gICAgICAgICAgICBsb2NrZG93blJlZHVjZWQ6IGZhbHNlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGxheSA0MzIgSHogaGVhbGluZyBmcmVxdWVuY3kgZm9yIDEgc2Vjb25kXG4gICAgICovXG4gICAgcHJpdmF0ZSBwbGF5TWVkaXRhdGlvblNvdW5kKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgYXVkaW9Db250ZXh0ID0gbmV3ICh3aW5kb3cuQXVkaW9Db250ZXh0IHx8ICh3aW5kb3cgYXMgYW55KS53ZWJraXRBdWRpb0NvbnRleHQpKCk7XG4gICAgICAgICAgICBjb25zdCBvc2NpbGxhdG9yID0gYXVkaW9Db250ZXh0LmNyZWF0ZU9zY2lsbGF0b3IoKTtcbiAgICAgICAgICAgIGNvbnN0IGdhaW5Ob2RlID0gYXVkaW9Db250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgb3NjaWxsYXRvci5mcmVxdWVuY3kudmFsdWUgPSA0MzI7XG4gICAgICAgICAgICBvc2NpbGxhdG9yLnR5cGUgPSBcInNpbmVcIjtcbiAgICAgICAgICAgIGdhaW5Ob2RlLmdhaW4uc2V0VmFsdWVBdFRpbWUoMC4zLCBhdWRpb0NvbnRleHQuY3VycmVudFRpbWUpO1xuICAgICAgICAgICAgZ2Fpbk5vZGUuZ2Fpbi5leHBvbmVudGlhbFJhbXBUb1ZhbHVlQXRUaW1lKDAuMDEsIGF1ZGlvQ29udGV4dC5jdXJyZW50VGltZSArIDEpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBvc2NpbGxhdG9yLmNvbm5lY3QoZ2Fpbk5vZGUpO1xuICAgICAgICAgICAgZ2Fpbk5vZGUuY29ubmVjdChhdWRpb0NvbnRleHQuZGVzdGluYXRpb24pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBvc2NpbGxhdG9yLnN0YXJ0KGF1ZGlvQ29udGV4dC5jdXJyZW50VGltZSk7XG4gICAgICAgICAgICBvc2NpbGxhdG9yLnN0b3AoYXVkaW9Db250ZXh0LmN1cnJlbnRUaW1lICsgMSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQXVkaW8gbm90IGF2YWlsYWJsZSBmb3IgbWVkaXRhdGlvblwiKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBtZWRpdGF0aW9uIHN0YXR1cyBmb3IgY3VycmVudCBsb2NrZG93blxuICAgICAqL1xuICAgIGdldE1lZGl0YXRpb25TdGF0dXMoKTogeyBjeWNsZXNEb25lOiBudW1iZXI7IGN5Y2xlc1JlbWFpbmluZzogbnVtYmVyOyB0aW1lUmVkdWNlZDogbnVtYmVyIH0ge1xuICAgICAgICBjb25zdCBjeWNsZXNEb25lID0gdGhpcy5zZXR0aW5ncy5tZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3duO1xuICAgICAgICBjb25zdCBjeWNsZXNSZW1haW5pbmcgPSBNYXRoLm1heCgwLCAxMCAtIGN5Y2xlc0RvbmUpO1xuICAgICAgICBjb25zdCB0aW1lUmVkdWNlZCA9ICgxMCAtIGN5Y2xlc1JlbWFpbmluZykgKiAzMDsgLy8gMzAgbWluIHBlciBjeWNsZVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGN5Y2xlc0RvbmUsXG4gICAgICAgICAgICBjeWNsZXNSZW1haW5pbmcsXG4gICAgICAgICAgICB0aW1lUmVkdWNlZFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlc2V0IGRlbGV0aW9uIHF1b3RhIGlmIG5ldyBkYXlcbiAgICAgKi9cbiAgICBwcml2YXRlIGVuc3VyZURlbGV0aW9uUXVvdGFSZXNldCgpIHtcbiAgICAgICAgY29uc3QgdG9kYXkgPSBtb21lbnQoKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MubGFzdERlbGV0aW9uUmVzZXQgIT09IHRvZGF5KSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmxhc3REZWxldGlvblJlc2V0ID0gdG9kYXk7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLnF1ZXN0RGVsZXRpb25zVG9kYXkgPSAwO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgdXNlciBoYXMgZnJlZSBkZWxldGlvbnMgbGVmdCB0b2RheVxuICAgICAqL1xuICAgIGNhbkRlbGV0ZVF1ZXN0RnJlZSgpOiBib29sZWFuIHtcbiAgICAgICAgdGhpcy5lbnN1cmVEZWxldGlvblF1b3RhUmVzZXQoKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0dGluZ3MucXVlc3REZWxldGlvbnNUb2RheSA8IDM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGRlbGV0aW9uIHF1b3RhIHN0YXR1c1xuICAgICAqL1xuICAgIGdldERlbGV0aW9uUXVvdGEoKTogeyBmcmVlOiBudW1iZXI7IHBhaWQ6IG51bWJlcjsgcmVtYWluaW5nOiBudW1iZXIgfSB7XG4gICAgICAgIHRoaXMuZW5zdXJlRGVsZXRpb25RdW90YVJlc2V0KCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCByZW1haW5pbmcgPSBNYXRoLm1heCgwLCAzIC0gdGhpcy5zZXR0aW5ncy5xdWVzdERlbGV0aW9uc1RvZGF5KTtcbiAgICAgICAgY29uc3QgcGFpZCA9IE1hdGgubWF4KDAsIHRoaXMuc2V0dGluZ3MucXVlc3REZWxldGlvbnNUb2RheSAtIDMpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGZyZWU6IHJlbWFpbmluZyxcbiAgICAgICAgICAgIHBhaWQ6IHBhaWQsXG4gICAgICAgICAgICByZW1haW5pbmc6IHJlbWFpbmluZ1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIERlbGV0ZSBhIHF1ZXN0IGFuZCBjaGFyZ2UgZ29sZCBpZiBuZWNlc3NhcnlcbiAgICAgKiBSZXR1cm5zOiB7IGNvc3QsIG1lc3NhZ2UgfVxuICAgICAqL1xuICAgIGFwcGx5RGVsZXRpb25Db3N0KCk6IHsgY29zdDogbnVtYmVyOyBtZXNzYWdlOiBzdHJpbmcgfSB7XG4gICAgICAgIHRoaXMuZW5zdXJlRGVsZXRpb25RdW90YVJlc2V0KCk7XG4gICAgICAgIFxuICAgICAgICBsZXQgY29zdCA9IDA7XG4gICAgICAgIGxldCBtZXNzYWdlID0gXCJcIjtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLnF1ZXN0RGVsZXRpb25zVG9kYXkgPj0gMykge1xuICAgICAgICAgICAgLy8gUGFpZCBkZWxldGlvblxuICAgICAgICAgICAgY29zdCA9IDEwO1xuICAgICAgICAgICAgbWVzc2FnZSA9IGBRdWVzdCBkZWxldGVkLiBDb3N0OiAtJHtjb3N0fWdgO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRnJlZSBkZWxldGlvblxuICAgICAgICAgICAgY29uc3QgcmVtYWluaW5nID0gMyAtIHRoaXMuc2V0dGluZ3MucXVlc3REZWxldGlvbnNUb2RheTtcbiAgICAgICAgICAgIG1lc3NhZ2UgPSBgUXVlc3QgZGVsZXRlZC4gKCR7cmVtYWluaW5nIC0gMX0gZnJlZSBkZWxldGlvbnMgcmVtYWluaW5nKWA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0dGluZ3MucXVlc3REZWxldGlvbnNUb2RheSsrO1xuICAgICAgICB0aGlzLnNldHRpbmdzLmdvbGQgLT0gY29zdDtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7IGNvc3QsIG1lc3NhZ2UgfTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBTaXN5cGh1c1NldHRpbmdzLCBSZXNlYXJjaFF1ZXN0IH0gZnJvbSAnLi4vdHlwZXMnO1xuXG4vKipcbiAqIERMQyAyOiBSZXNlYXJjaCBRdWVzdCBTeXN0ZW0gRW5naW5lXG4gKiBIYW5kbGVzIHJlc2VhcmNoIHF1ZXN0IGNyZWF0aW9uLCBjb21wbGV0aW9uLCB3b3JkIGNvdW50IHZhbGlkYXRpb24sIGFuZCBjb21iYXQ6cmVzZWFyY2ggcmF0aW9cbiAqIFxuICogSVNPTEFURUQ6IE9ubHkgcmVhZHMvd3JpdGVzIHRvIHJlc2VhcmNoUXVlc3RzLCByZXNlYXJjaFN0YXRzXG4gKiBERVBFTkRFTkNJRVM6IFNpc3lwaHVzU2V0dGluZ3MgdHlwZXNcbiAqIFJFUVVJUkVNRU5UUzogQXVkaW8gY2FsbGJhY2tzIGZyb20gcGFyZW50IGZvciBub3RpZmljYXRpb25zXG4gKi9cbmV4cG9ydCBjbGFzcyBSZXNlYXJjaEVuZ2luZSB7XG4gICAgc2V0dGluZ3M6IFNpc3lwaHVzU2V0dGluZ3M7XG4gICAgYXVkaW9Db250cm9sbGVyPzogYW55O1xuXG4gICAgY29uc3RydWN0b3Ioc2V0dGluZ3M6IFNpc3lwaHVzU2V0dGluZ3MsIGF1ZGlvQ29udHJvbGxlcj86IGFueSkge1xuICAgICAgICB0aGlzLnNldHRpbmdzID0gc2V0dGluZ3M7XG4gICAgICAgIHRoaXMuYXVkaW9Db250cm9sbGVyID0gYXVkaW9Db250cm9sbGVyO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBhIG5ldyByZXNlYXJjaCBxdWVzdFxuICAgICAqIENoZWNrcyAyOjEgY29tYmF0OnJlc2VhcmNoIHJhdGlvIGJlZm9yZSBhbGxvd2luZyBjcmVhdGlvblxuICAgICAqL1xuICAgIGFzeW5jIGNyZWF0ZVJlc2VhcmNoUXVlc3QodGl0bGU6IHN0cmluZywgdHlwZTogXCJzdXJ2ZXlcIiB8IFwiZGVlcF9kaXZlXCIsIGxpbmtlZFNraWxsOiBzdHJpbmcsIGxpbmtlZENvbWJhdFF1ZXN0OiBzdHJpbmcpOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgbWVzc2FnZTogc3RyaW5nOyBxdWVzdElkPzogc3RyaW5nIH0+IHtcbiAgICAgICAgLy8gQ2hlY2sgMjoxIGNvbWJhdDpyZXNlYXJjaCByYXRpb1xuICAgICAgICBpZiAoIXRoaXMuY2FuQ3JlYXRlUmVzZWFyY2hRdWVzdCgpKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IFwiUkVTRUFSQ0ggQkxPQ0tFRDogQ29tcGxldGUgMiBjb21iYXQgcXVlc3RzIHBlciByZXNlYXJjaCBxdWVzdFwiXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCB3b3JkTGltaXQgPSB0eXBlID09PSBcInN1cnZleVwiID8gMjAwIDogNDAwO1xuICAgICAgICBjb25zdCBxdWVzdElkID0gYHJlc2VhcmNoXyR7KHRoaXMuc2V0dGluZ3MubGFzdFJlc2VhcmNoUXVlc3RJZCB8fCAwKSArIDF9YDtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHJlc2VhcmNoUXVlc3Q6IFJlc2VhcmNoUXVlc3QgPSB7XG4gICAgICAgICAgICBpZDogcXVlc3RJZCxcbiAgICAgICAgICAgIHRpdGxlOiB0aXRsZSxcbiAgICAgICAgICAgIHR5cGU6IHR5cGUsXG4gICAgICAgICAgICBsaW5rZWRTa2lsbDogbGlua2VkU2tpbGwsXG4gICAgICAgICAgICB3b3JkTGltaXQ6IHdvcmRMaW1pdCxcbiAgICAgICAgICAgIHdvcmRDb3VudDogMCxcbiAgICAgICAgICAgIGxpbmtlZENvbWJhdFF1ZXN0OiBsaW5rZWRDb21iYXRRdWVzdCxcbiAgICAgICAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgY29tcGxldGVkOiBmYWxzZVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFF1ZXN0cy5wdXNoKHJlc2VhcmNoUXVlc3QpO1xuICAgICAgICB0aGlzLnNldHRpbmdzLmxhc3RSZXNlYXJjaFF1ZXN0SWQgPSBwYXJzZUludChxdWVzdElkLnNwbGl0KCdfJylbMV0pO1xuICAgICAgICB0aGlzLnNldHRpbmdzLnJlc2VhcmNoU3RhdHMudG90YWxSZXNlYXJjaCsrO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICBtZXNzYWdlOiBgUmVzZWFyY2ggUXVlc3QgQ3JlYXRlZDogJHt0eXBlID09PSBcInN1cnZleVwiID8gXCJTdXJ2ZXlcIiA6IFwiRGVlcCBEaXZlXCJ9ICgke3dvcmRMaW1pdH0gd29yZHMpYCxcbiAgICAgICAgICAgIHF1ZXN0SWQ6IHF1ZXN0SWRcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb21wbGV0ZSBhIHJlc2VhcmNoIHF1ZXN0XG4gICAgICogVmFsaWRhdGVzIHdvcmQgY291bnQgKDgwLTEyNSUpLCBhcHBsaWVzIHBlbmFsdGllcyBmb3Igb3ZlcmFnZSwgYXdhcmRzIFhQXG4gICAgICovXG4gICAgY29tcGxldGVSZXNlYXJjaFF1ZXN0KHF1ZXN0SWQ6IHN0cmluZywgZmluYWxXb3JkQ291bnQ6IG51bWJlcik6IHsgc3VjY2VzczogYm9vbGVhbjsgbWVzc2FnZTogc3RyaW5nOyB4cFJld2FyZDogbnVtYmVyOyBnb2xkUGVuYWx0eTogbnVtYmVyIH0ge1xuICAgICAgICBjb25zdCByZXNlYXJjaFF1ZXN0ID0gdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFF1ZXN0cy5maW5kKHEgPT4gcS5pZCA9PT0gcXVlc3RJZCk7XG4gICAgICAgIGlmICghcmVzZWFyY2hRdWVzdCkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6IFwiUmVzZWFyY2ggcXVlc3Qgbm90IGZvdW5kXCIsIHhwUmV3YXJkOiAwLCBnb2xkUGVuYWx0eTogMCB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAocmVzZWFyY2hRdWVzdC5jb21wbGV0ZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlOiBcIlF1ZXN0IGFscmVhZHkgY29tcGxldGVkXCIsIHhwUmV3YXJkOiAwLCBnb2xkUGVuYWx0eTogMCB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBtaW5pbXVtIHdvcmQgY291bnQgKDgwJSBvZiBsaW1pdClcbiAgICAgICAgY29uc3QgbWluV29yZHMgPSBNYXRoLmNlaWwocmVzZWFyY2hRdWVzdC53b3JkTGltaXQgKiAwLjgpO1xuICAgICAgICBpZiAoZmluYWxXb3JkQ291bnQgPCBtaW5Xb3Jkcykge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBgUXVlc3QgdG9vIHNob3J0ISBNaW5pbXVtICR7bWluV29yZHN9IHdvcmRzIHJlcXVpcmVkICh5b3UgaGF2ZSAke2ZpbmFsV29yZENvdW50fSlgLFxuICAgICAgICAgICAgICAgIHhwUmV3YXJkOiAwLFxuICAgICAgICAgICAgICAgIGdvbGRQZW5hbHR5OiAwXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBtYXhpbXVtIHdvcmQgY291bnQgKDEyNSUgaXMgbG9ja2VkKVxuICAgICAgICBpZiAoZmluYWxXb3JkQ291bnQgPiByZXNlYXJjaFF1ZXN0LndvcmRMaW1pdCAqIDEuMjUpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogYFdvcmQgY291bnQgdG9vIGhpZ2ghIE1heGltdW0gJHtNYXRoLmNlaWwocmVzZWFyY2hRdWVzdC53b3JkTGltaXQgKiAxLjI1KX0gd29yZHMgYWxsb3dlZGAsXG4gICAgICAgICAgICAgICAgeHBSZXdhcmQ6IDAsXG4gICAgICAgICAgICAgICAgZ29sZFBlbmFsdHk6IDBcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENhbGN1bGF0ZSBYUCByZXdhcmRcbiAgICAgICAgbGV0IHhwUmV3YXJkID0gcmVzZWFyY2hRdWVzdC50eXBlID09PSBcInN1cnZleVwiID8gNSA6IDIwO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2FsY3VsYXRlIGdvbGQgcGVuYWx0eSBmb3Igb3ZlcmFnZSAoMTAwLTEyNSUgcmFuZ2UpXG4gICAgICAgIGxldCBnb2xkUGVuYWx0eSA9IDA7XG4gICAgICAgIGlmIChmaW5hbFdvcmRDb3VudCA+IHJlc2VhcmNoUXVlc3Qud29yZExpbWl0KSB7XG4gICAgICAgICAgICBjb25zdCBvdmVyYWdlUGVyY2VudCA9ICgoZmluYWxXb3JkQ291bnQgLSByZXNlYXJjaFF1ZXN0LndvcmRMaW1pdCkgLyByZXNlYXJjaFF1ZXN0LndvcmRMaW1pdCkgKiAxMDA7XG4gICAgICAgICAgICBpZiAob3ZlcmFnZVBlcmNlbnQgPiAwKSB7XG4gICAgICAgICAgICAgICAgZ29sZFBlbmFsdHkgPSBNYXRoLmZsb29yKDIwICogKG92ZXJhZ2VQZXJjZW50IC8gMTAwKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEF3YXJkIFhQIHRvIGxpbmtlZCBza2lsbFxuICAgICAgICBjb25zdCBza2lsbCA9IHRoaXMuc2V0dGluZ3Muc2tpbGxzLmZpbmQocyA9PiBzLm5hbWUgPT09IHJlc2VhcmNoUXVlc3QubGlua2VkU2tpbGwpO1xuICAgICAgICBpZiAoc2tpbGwpIHtcbiAgICAgICAgICAgIHNraWxsLnhwICs9IHhwUmV3YXJkO1xuICAgICAgICAgICAgaWYgKHNraWxsLnhwID49IHNraWxsLnhwUmVxKSB7XG4gICAgICAgICAgICAgICAgc2tpbGwubGV2ZWwrKztcbiAgICAgICAgICAgICAgICBza2lsbC54cCA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFwcGx5IHBlbmFsdHkgYW5kIG1hcmsgY29tcGxldGVcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5nb2xkIC09IGdvbGRQZW5hbHR5O1xuICAgICAgICByZXNlYXJjaFF1ZXN0LmNvbXBsZXRlZCA9IHRydWU7XG4gICAgICAgIHJlc2VhcmNoUXVlc3QuY29tcGxldGVkQXQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hTdGF0cy5yZXNlYXJjaENvbXBsZXRlZCsrO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuYXVkaW9Db250cm9sbGVyPy5wbGF5U291bmQpIHtcbiAgICAgICAgICAgIHRoaXMuYXVkaW9Db250cm9sbGVyLnBsYXlTb3VuZChcInN1Y2Nlc3NcIik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGxldCBtZXNzYWdlID0gYFJlc2VhcmNoIENvbXBsZXRlOiAke3Jlc2VhcmNoUXVlc3QudGl0bGV9ISArJHt4cFJld2FyZH0gWFBgO1xuICAgICAgICBpZiAoZ29sZFBlbmFsdHkgPiAwKSB7XG4gICAgICAgICAgICBtZXNzYWdlICs9IGAgKC0ke2dvbGRQZW5hbHR5fWcgb3ZlcmFnZSBwZW5hbHR5KWA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2UsIHhwUmV3YXJkLCBnb2xkUGVuYWx0eSB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIERlbGV0ZSBhIHJlc2VhcmNoIHF1ZXN0XG4gICAgICovXG4gICAgZGVsZXRlUmVzZWFyY2hRdWVzdChxdWVzdElkOiBzdHJpbmcpOiB7IHN1Y2Nlc3M6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZyB9IHtcbiAgICAgICAgY29uc3QgaW5kZXggPSB0aGlzLnNldHRpbmdzLnJlc2VhcmNoUXVlc3RzLmZpbmRJbmRleChxID0+IHEuaWQgPT09IHF1ZXN0SWQpO1xuICAgICAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICAgICAgICBjb25zdCBxdWVzdCA9IHRoaXMuc2V0dGluZ3MucmVzZWFyY2hRdWVzdHNbaW5kZXhdO1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFF1ZXN0cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBEZWNyZW1lbnQgc3RhdHMgYXBwcm9wcmlhdGVseVxuICAgICAgICAgICAgaWYgKCFxdWVzdC5jb21wbGV0ZWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLnJlc2VhcmNoU3RhdHMudG90YWxSZXNlYXJjaCA9IE1hdGgubWF4KDAsIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hTdGF0cy50b3RhbFJlc2VhcmNoIC0gMSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hTdGF0cy5yZXNlYXJjaENvbXBsZXRlZCA9IE1hdGgubWF4KDAsIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hTdGF0cy5yZXNlYXJjaENvbXBsZXRlZCAtIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBcIlJlc2VhcmNoIHF1ZXN0IGRlbGV0ZWRcIiB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgbWVzc2FnZTogXCJSZXNlYXJjaCBxdWVzdCBub3QgZm91bmRcIiB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB3b3JkIGNvdW50IGZvciBhIHJlc2VhcmNoIHF1ZXN0IChhcyB1c2VyIHdyaXRlcylcbiAgICAgKi9cbiAgICB1cGRhdGVSZXNlYXJjaFdvcmRDb3VudChxdWVzdElkOiBzdHJpbmcsIG5ld1dvcmRDb3VudDogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IHJlc2VhcmNoUXVlc3QgPSB0aGlzLnNldHRpbmdzLnJlc2VhcmNoUXVlc3RzLmZpbmQocSA9PiBxLmlkID09PSBxdWVzdElkKTtcbiAgICAgICAgaWYgKHJlc2VhcmNoUXVlc3QpIHtcbiAgICAgICAgICAgIHJlc2VhcmNoUXVlc3Qud29yZENvdW50ID0gbmV3V29yZENvdW50O1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBjdXJyZW50IGNvbWJhdDpyZXNlYXJjaCByYXRpb1xuICAgICAqL1xuICAgIGdldFJlc2VhcmNoUmF0aW8oKTogeyBjb21iYXQ6IG51bWJlcjsgcmVzZWFyY2g6IG51bWJlcjsgcmF0aW86IHN0cmluZyB9IHtcbiAgICAgICAgY29uc3Qgc3RhdHMgPSB0aGlzLnNldHRpbmdzLnJlc2VhcmNoU3RhdHM7XG4gICAgICAgIGNvbnN0IHJhdGlvID0gc3RhdHMudG90YWxDb21iYXQgLyBNYXRoLm1heCgxLCBzdGF0cy50b3RhbFJlc2VhcmNoKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGNvbWJhdDogc3RhdHMudG90YWxDb21iYXQsXG4gICAgICAgICAgICByZXNlYXJjaDogc3RhdHMudG90YWxSZXNlYXJjaCxcbiAgICAgICAgICAgIHJhdGlvOiByYXRpby50b0ZpeGVkKDIpXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgdXNlciBjYW4gY3JlYXRlIG1vcmUgcmVzZWFyY2ggcXVlc3RzXG4gICAgICogUnVsZTogTXVzdCBoYXZlIDI6MSBjb21iYXQgdG8gcmVzZWFyY2ggcmF0aW9cbiAgICAgKi9cbiAgICBjYW5DcmVhdGVSZXNlYXJjaFF1ZXN0KCk6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCBzdGF0cyA9IHRoaXMuc2V0dGluZ3MucmVzZWFyY2hTdGF0cztcbiAgICAgICAgY29uc3QgcmF0aW8gPSBzdGF0cy50b3RhbENvbWJhdCAvIE1hdGgubWF4KDEsIHN0YXRzLnRvdGFsUmVzZWFyY2gpO1xuICAgICAgICByZXR1cm4gcmF0aW8gPj0gMjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgYWN0aXZlIChub3QgY29tcGxldGVkKSByZXNlYXJjaCBxdWVzdHNcbiAgICAgKi9cbiAgICBnZXRBY3RpdmVSZXNlYXJjaFF1ZXN0cygpOiBSZXNlYXJjaFF1ZXN0W10ge1xuICAgICAgICByZXR1cm4gdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFF1ZXN0cy5maWx0ZXIocSA9PiAhcS5jb21wbGV0ZWQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBjb21wbGV0ZWQgcmVzZWFyY2ggcXVlc3RzXG4gICAgICovXG4gICAgZ2V0Q29tcGxldGVkUmVzZWFyY2hRdWVzdHMoKTogUmVzZWFyY2hRdWVzdFtdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hRdWVzdHMuZmlsdGVyKHEgPT4gcS5jb21wbGV0ZWQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRlIHdvcmQgY291bnQgc3RhdHVzIGZvciBhIHF1ZXN0XG4gICAgICogUmV0dXJuczogeyBzdGF0dXM6ICd0b29fc2hvcnQnIHwgJ3BlcmZlY3QnIHwgJ292ZXJhZ2UnIHwgJ2xvY2tlZCcsIHBlcmNlbnQ6IG51bWJlciB9XG4gICAgICovXG4gICAgdmFsaWRhdGVXb3JkQ291bnQocXVlc3RJZDogc3RyaW5nLCB3b3JkQ291bnQ6IG51bWJlcik6IHsgc3RhdHVzOiAndG9vX3Nob3J0JyB8ICdwZXJmZWN0JyB8ICdvdmVyYWdlJyB8ICdsb2NrZWQnOyBwZXJjZW50OiBudW1iZXI7IG1lc3NhZ2U6IHN0cmluZyB9IHtcbiAgICAgICAgY29uc3QgcXVlc3QgPSB0aGlzLnNldHRpbmdzLnJlc2VhcmNoUXVlc3RzLmZpbmQocSA9PiBxLmlkID09PSBxdWVzdElkKTtcbiAgICAgICAgaWYgKCFxdWVzdCkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3RhdHVzOiAndG9vX3Nob3J0JywgcGVyY2VudDogMCwgbWVzc2FnZTogXCJRdWVzdCBub3QgZm91bmRcIiB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBwZXJjZW50ID0gKHdvcmRDb3VudCAvIHF1ZXN0LndvcmRMaW1pdCkgKiAxMDA7XG4gICAgICAgIFxuICAgICAgICBpZiAocGVyY2VudCA8IDgwKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdGF0dXM6ICd0b29fc2hvcnQnLCBwZXJjZW50LCBtZXNzYWdlOiBgVG9vIHNob3J0ICgke01hdGguY2VpbChwZXJjZW50KX0lKS4gTmVlZCA4MCUgbWluaW11bS5gIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChwZXJjZW50IDw9IDEwMCkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3RhdHVzOiAncGVyZmVjdCcsIHBlcmNlbnQsIG1lc3NhZ2U6IGBQZXJmZWN0IHJhbmdlICgke01hdGguY2VpbChwZXJjZW50KX0lKWAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKHBlcmNlbnQgPD0gMTI1KSB7XG4gICAgICAgICAgICBjb25zdCB0YXggPSBNYXRoLmZsb29yKDIwICogKChwZXJjZW50IC0gMTAwKSAvIDEwMCkpO1xuICAgICAgICAgICAgcmV0dXJuIHsgc3RhdHVzOiAnb3ZlcmFnZScsIHBlcmNlbnQsIG1lc3NhZ2U6IGBPdmVyYWdlIHdhcm5pbmc6IC0ke3RheH1nIHRheGAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHsgc3RhdHVzOiAnbG9ja2VkJywgcGVyY2VudCwgbWVzc2FnZTogYExvY2tlZCEgTWF4aW11bSAxMjUlIG9mIHdvcmQgbGltaXQuYCB9O1xuICAgIH1cbn1cbiIsImltcG9ydCB7IFNpc3lwaHVzU2V0dGluZ3MsIFF1ZXN0Q2hhaW4sIFF1ZXN0Q2hhaW5SZWNvcmQgfSBmcm9tICcuLi90eXBlcyc7XG5cbi8qKlxuICogRExDIDQ6IFF1ZXN0IENoYWlucyBFbmdpbmVcbiAqIEhhbmRsZXMgbXVsdGktcXVlc3Qgc2VxdWVuY2VzIHdpdGggb3JkZXJpbmcsIGxvY2tpbmcsIGFuZCBjb21wbGV0aW9uIHRyYWNraW5nXG4gKiBcbiAqIElTT0xBVEVEOiBPbmx5IHJlYWRzL3dyaXRlcyB0byBhY3RpdmVDaGFpbnMsIGNoYWluSGlzdG9yeSwgY3VycmVudENoYWluSWQsIGNoYWluUXVlc3RzQ29tcGxldGVkXG4gKiBERVBFTkRFTkNJRVM6IFNpc3lwaHVzU2V0dGluZ3MgdHlwZXNcbiAqIElOVEVHUkFUSU9OIFBPSU5UUzogTmVlZHMgdG8gaG9vayBpbnRvIGNvbXBsZXRlUXVlc3QoKSBpbiBtYWluIGVuZ2luZSBmb3IgY2hhaW4gcHJvZ3Jlc3Npb25cbiAqL1xuZXhwb3J0IGNsYXNzIENoYWluc0VuZ2luZSB7XG4gICAgc2V0dGluZ3M6IFNpc3lwaHVzU2V0dGluZ3M7XG4gICAgYXVkaW9Db250cm9sbGVyPzogYW55O1xuXG4gICAgY29uc3RydWN0b3Ioc2V0dGluZ3M6IFNpc3lwaHVzU2V0dGluZ3MsIGF1ZGlvQ29udHJvbGxlcj86IGFueSkge1xuICAgICAgICB0aGlzLnNldHRpbmdzID0gc2V0dGluZ3M7XG4gICAgICAgIHRoaXMuYXVkaW9Db250cm9sbGVyID0gYXVkaW9Db250cm9sbGVyO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBhIG5ldyBxdWVzdCBjaGFpblxuICAgICAqL1xuICAgIGFzeW5jIGNyZWF0ZVF1ZXN0Q2hhaW4obmFtZTogc3RyaW5nLCBxdWVzdE5hbWVzOiBzdHJpbmdbXSk6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyBtZXNzYWdlOiBzdHJpbmc7IGNoYWluSWQ/OiBzdHJpbmcgfT4ge1xuICAgICAgICBpZiAocXVlc3ROYW1lcy5sZW5ndGggPCAyKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IFwiQ2hhaW4gbXVzdCBoYXZlIGF0IGxlYXN0IDIgcXVlc3RzXCJcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGNoYWluSWQgPSBgY2hhaW5fJHtEYXRlLm5vdygpfWA7XG4gICAgICAgIGNvbnN0IGNoYWluOiBRdWVzdENoYWluID0ge1xuICAgICAgICAgICAgaWQ6IGNoYWluSWQsXG4gICAgICAgICAgICBuYW1lOiBuYW1lLFxuICAgICAgICAgICAgcXVlc3RzOiBxdWVzdE5hbWVzLFxuICAgICAgICAgICAgY3VycmVudEluZGV4OiAwLFxuICAgICAgICAgICAgY29tcGxldGVkOiBmYWxzZSxcbiAgICAgICAgICAgIHN0YXJ0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgaXNCb3NzOiBxdWVzdE5hbWVzW3F1ZXN0TmFtZXMubGVuZ3RoIC0gMV0udG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhcImJvc3NcIilcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0dGluZ3MuYWN0aXZlQ2hhaW5zLnB1c2goY2hhaW4pO1xuICAgICAgICB0aGlzLnNldHRpbmdzLmN1cnJlbnRDaGFpbklkID0gY2hhaW5JZDtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgbWVzc2FnZTogYENoYWluIGNyZWF0ZWQ6ICR7bmFtZX0gKCR7cXVlc3ROYW1lcy5sZW5ndGh9IHF1ZXN0cylgLFxuICAgICAgICAgICAgY2hhaW5JZDogY2hhaW5JZFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgY3VycmVudCBhY3RpdmUgY2hhaW5cbiAgICAgKi9cbiAgICBnZXRBY3RpdmVDaGFpbigpOiBRdWVzdENoYWluIHwgbnVsbCB7XG4gICAgICAgIGlmICghdGhpcy5zZXR0aW5ncy5jdXJyZW50Q2hhaW5JZCkgcmV0dXJuIG51bGw7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjaGFpbiA9IHRoaXMuc2V0dGluZ3MuYWN0aXZlQ2hhaW5zLmZpbmQoYyA9PiBjLmlkID09PSB0aGlzLnNldHRpbmdzLmN1cnJlbnRDaGFpbklkKTtcbiAgICAgICAgcmV0dXJuIChjaGFpbiAmJiAhY2hhaW4uY29tcGxldGVkKSA/IGNoYWluIDogbnVsbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdGhlIG5leHQgcXVlc3QgdGhhdCBzaG91bGQgYmUgY29tcGxldGVkIGluIHRoZSBhY3RpdmUgY2hhaW5cbiAgICAgKi9cbiAgICBnZXROZXh0UXVlc3RJbkNoYWluKCk6IHN0cmluZyB8IG51bGwge1xuICAgICAgICBjb25zdCBjaGFpbiA9IHRoaXMuZ2V0QWN0aXZlQ2hhaW4oKTtcbiAgICAgICAgaWYgKCFjaGFpbikgcmV0dXJuIG51bGw7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gY2hhaW4ucXVlc3RzW2NoYWluLmN1cnJlbnRJbmRleF0gfHwgbnVsbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBhIHF1ZXN0IGlzIHBhcnQgb2YgYW4gYWN0aXZlIChpbmNvbXBsZXRlKSBjaGFpblxuICAgICAqL1xuICAgIGlzUXVlc3RJbkNoYWluKHF1ZXN0TmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IGNoYWluID0gdGhpcy5zZXR0aW5ncy5hY3RpdmVDaGFpbnMuZmluZChjID0+ICFjLmNvbXBsZXRlZCk7XG4gICAgICAgIGlmICghY2hhaW4pIHJldHVybiBmYWxzZTtcbiAgICAgICAgcmV0dXJuIGNoYWluLnF1ZXN0cy5pbmNsdWRlcyhxdWVzdE5hbWUpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIGEgcXVlc3QgY2FuIGJlIHN0YXJ0ZWQgKGlzIGl0IHRoZSBuZXh0IHF1ZXN0IGluIHRoZSBjaGFpbj8pXG4gICAgICovXG4gICAgY2FuU3RhcnRRdWVzdChxdWVzdE5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCBjaGFpbiA9IHRoaXMuZ2V0QWN0aXZlQ2hhaW4oKTtcbiAgICAgICAgaWYgKCFjaGFpbikgcmV0dXJuIHRydWU7IC8vIE5vdCBpbiBhIGNoYWluLCBjYW4gc3RhcnQgYW55IHF1ZXN0XG4gICAgICAgIFxuICAgICAgICBjb25zdCBuZXh0UXVlc3QgPSB0aGlzLmdldE5leHRRdWVzdEluQ2hhaW4oKTtcbiAgICAgICAgcmV0dXJuIG5leHRRdWVzdCA9PT0gcXVlc3ROYW1lO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1hcmsgYSBxdWVzdCBhcyBjb21wbGV0ZWQgaW4gdGhlIGNoYWluXG4gICAgICogQWR2YW5jZXMgY2hhaW4gaWYgc3VjY2Vzc2Z1bCwgYXdhcmRzIGJvbnVzIFhQIGlmIGNoYWluIGNvbXBsZXRlc1xuICAgICAqL1xuICAgIGFzeW5jIGNvbXBsZXRlQ2hhaW5RdWVzdChxdWVzdE5hbWU6IHN0cmluZyk6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyBtZXNzYWdlOiBzdHJpbmc7IGNoYWluQ29tcGxldGU6IGJvb2xlYW47IGJvbnVzWHA6IG51bWJlciB9PiB7XG4gICAgICAgIGNvbnN0IGNoYWluID0gdGhpcy5nZXRBY3RpdmVDaGFpbigpO1xuICAgICAgICBpZiAoIWNoYWluKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgbWVzc2FnZTogXCJObyBhY3RpdmUgY2hhaW5cIiwgY2hhaW5Db21wbGV0ZTogZmFsc2UsIGJvbnVzWHA6IDAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgY3VycmVudFF1ZXN0ID0gY2hhaW4ucXVlc3RzW2NoYWluLmN1cnJlbnRJbmRleF07XG4gICAgICAgIGlmIChjdXJyZW50UXVlc3QgIT09IHF1ZXN0TmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBcIlF1ZXN0IGlzIG5vdCBuZXh0IGluIGNoYWluXCIsXG4gICAgICAgICAgICAgICAgY2hhaW5Db21wbGV0ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgYm9udXNYcDogMFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY2hhaW4uY3VycmVudEluZGV4Kys7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuY2hhaW5RdWVzdHNDb21wbGV0ZWQrKztcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIGNoYWluIGlzIGNvbXBsZXRlXG4gICAgICAgIGlmIChjaGFpbi5jdXJyZW50SW5kZXggPj0gY2hhaW4ucXVlc3RzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29tcGxldGVDaGFpbihjaGFpbik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHJlbWFpbmluZyA9IGNoYWluLnF1ZXN0cy5sZW5ndGggLSBjaGFpbi5jdXJyZW50SW5kZXg7XG4gICAgICAgIGNvbnN0IHBlcmNlbnQgPSBNYXRoLmZsb29yKChjaGFpbi5jdXJyZW50SW5kZXggLyBjaGFpbi5xdWVzdHMubGVuZ3RoKSAqIDEwMCk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGBDaGFpbiBwcm9ncmVzczogJHtjaGFpbi5jdXJyZW50SW5kZXh9LyR7Y2hhaW4ucXVlc3RzLmxlbmd0aH0gKCR7cmVtYWluaW5nfSByZW1haW5pbmcsICR7cGVyY2VudH0lIGNvbXBsZXRlKWAsXG4gICAgICAgICAgICBjaGFpbkNvbXBsZXRlOiBmYWxzZSxcbiAgICAgICAgICAgIGJvbnVzWHA6IDBcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb21wbGV0ZSB0aGUgZW50aXJlIGNoYWluXG4gICAgICovXG4gICAgcHJpdmF0ZSBhc3luYyBjb21wbGV0ZUNoYWluKGNoYWluOiBRdWVzdENoYWluKTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZzsgY2hhaW5Db21wbGV0ZTogYm9vbGVhbjsgYm9udXNYcDogbnVtYmVyIH0+IHtcbiAgICAgICAgY2hhaW4uY29tcGxldGVkID0gdHJ1ZTtcbiAgICAgICAgY2hhaW4uY29tcGxldGVkQXQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBib251c1hwID0gMTAwO1xuICAgICAgICB0aGlzLnNldHRpbmdzLnhwICs9IGJvbnVzWHA7XG4gICAgICAgIFxuICAgICAgICBjb25zdCByZWNvcmQ6IFF1ZXN0Q2hhaW5SZWNvcmQgPSB7XG4gICAgICAgICAgICBjaGFpbklkOiBjaGFpbi5pZCxcbiAgICAgICAgICAgIGNoYWluTmFtZTogY2hhaW4ubmFtZSxcbiAgICAgICAgICAgIHRvdGFsUXVlc3RzOiBjaGFpbi5xdWVzdHMubGVuZ3RoLFxuICAgICAgICAgICAgY29tcGxldGVkQXQ6IGNoYWluLmNvbXBsZXRlZEF0LFxuICAgICAgICAgICAgeHBFYXJuZWQ6IGJvbnVzWHBcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0dGluZ3MuY2hhaW5IaXN0b3J5LnB1c2gocmVjb3JkKTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLmF1ZGlvQ29udHJvbGxlcj8ucGxheVNvdW5kKSB7XG4gICAgICAgICAgICB0aGlzLmF1ZGlvQ29udHJvbGxlci5wbGF5U291bmQoXCJzdWNjZXNzXCIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGBDaGFpbiBjb21wbGV0ZTogJHtjaGFpbi5uYW1lfSEgKyR7Ym9udXNYcH0gWFAgQm9udXNgLFxuICAgICAgICAgICAgY2hhaW5Db21wbGV0ZTogdHJ1ZSxcbiAgICAgICAgICAgIGJvbnVzWHA6IGJvbnVzWHBcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBCcmVhayBhbiBhY3RpdmUgY2hhaW5cbiAgICAgKiBLZWVwcyBlYXJuZWQgWFAgZnJvbSBjb21wbGV0ZWQgcXVlc3RzXG4gICAgICovXG4gICAgYXN5bmMgYnJlYWtDaGFpbigpOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgbWVzc2FnZTogc3RyaW5nOyB4cEtlcHQ6IG51bWJlciB9PiB7XG4gICAgICAgIGNvbnN0IGNoYWluID0gdGhpcy5nZXRBY3RpdmVDaGFpbigpO1xuICAgICAgICBpZiAoIWNoYWluKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgbWVzc2FnZTogXCJObyBhY3RpdmUgY2hhaW4gdG8gYnJlYWtcIiwgeHBLZXB0OiAwIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGNvbXBsZXRlZCA9IGNoYWluLmN1cnJlbnRJbmRleDtcbiAgICAgICAgY29uc3QgeHBLZXB0ID0gY29tcGxldGVkICogMTA7IC8vIEFwcHJveGltYXRlIFhQIGZyb20gZWFjaCBxdWVzdFxuICAgICAgICBcbiAgICAgICAgLy8gU2F2ZSB0byBoaXN0b3J5IGFzIGJyb2tlblxuICAgICAgICBjb25zdCByZWNvcmQ6IFF1ZXN0Q2hhaW5SZWNvcmQgPSB7XG4gICAgICAgICAgICBjaGFpbklkOiBjaGFpbi5pZCxcbiAgICAgICAgICAgIGNoYWluTmFtZTogY2hhaW4ubmFtZSxcbiAgICAgICAgICAgIHRvdGFsUXVlc3RzOiBjaGFpbi5xdWVzdHMubGVuZ3RoLFxuICAgICAgICAgICAgY29tcGxldGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgIHhwRWFybmVkOiB4cEtlcHRcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0dGluZ3MuY2hhaW5IaXN0b3J5LnB1c2gocmVjb3JkKTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5hY3RpdmVDaGFpbnMgPSB0aGlzLnNldHRpbmdzLmFjdGl2ZUNoYWlucy5maWx0ZXIoYyA9PiBjLmlkICE9PSBjaGFpbi5pZCk7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuY3VycmVudENoYWluSWQgPSBcIlwiO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICBtZXNzYWdlOiBgQ2hhaW4gYnJva2VuOiAke2NoYWluLm5hbWV9LiBLZXB0ICR7Y29tcGxldGVkfSBxdWVzdCBjb21wbGV0aW9ucyAoJHt4cEtlcHR9IFhQKS5gLFxuICAgICAgICAgICAgeHBLZXB0OiB4cEtlcHRcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgcHJvZ3Jlc3Mgb2YgYWN0aXZlIGNoYWluXG4gICAgICovXG4gICAgZ2V0Q2hhaW5Qcm9ncmVzcygpOiB7IGNvbXBsZXRlZDogbnVtYmVyOyB0b3RhbDogbnVtYmVyOyBwZXJjZW50OiBudW1iZXIgfSB7XG4gICAgICAgIGNvbnN0IGNoYWluID0gdGhpcy5nZXRBY3RpdmVDaGFpbigpO1xuICAgICAgICBpZiAoIWNoYWluKSByZXR1cm4geyBjb21wbGV0ZWQ6IDAsIHRvdGFsOiAwLCBwZXJjZW50OiAwIH07XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgY29tcGxldGVkOiBjaGFpbi5jdXJyZW50SW5kZXgsXG4gICAgICAgICAgICB0b3RhbDogY2hhaW4ucXVlc3RzLmxlbmd0aCxcbiAgICAgICAgICAgIHBlcmNlbnQ6IE1hdGguZmxvb3IoKGNoYWluLmN1cnJlbnRJbmRleCAvIGNoYWluLnF1ZXN0cy5sZW5ndGgpICogMTAwKVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBhbGwgY29tcGxldGVkIGNoYWluIHJlY29yZHMgKGhpc3RvcnkpXG4gICAgICovXG4gICAgZ2V0Q2hhaW5IaXN0b3J5KCk6IFF1ZXN0Q2hhaW5SZWNvcmRbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldHRpbmdzLmNoYWluSGlzdG9yeTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgYWxsIGFjdGl2ZSBjaGFpbnMgKG5vdCBjb21wbGV0ZWQpXG4gICAgICovXG4gICAgZ2V0QWN0aXZlQ2hhaW5zKCk6IFF1ZXN0Q2hhaW5bXSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldHRpbmdzLmFjdGl2ZUNoYWlucy5maWx0ZXIoYyA9PiAhYy5jb21wbGV0ZWQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBkZXRhaWxlZCBzdGF0ZSBvZiBhY3RpdmUgY2hhaW4gKGZvciBVSSByZW5kZXJpbmcpXG4gICAgICovXG4gICAgZ2V0Q2hhaW5EZXRhaWxzKCk6IHtcbiAgICAgICAgY2hhaW46IFF1ZXN0Q2hhaW4gfCBudWxsO1xuICAgICAgICBwcm9ncmVzczogeyBjb21wbGV0ZWQ6IG51bWJlcjsgdG90YWw6IG51bWJlcjsgcGVyY2VudDogbnVtYmVyIH07XG4gICAgICAgIHF1ZXN0U3RhdGVzOiBBcnJheTx7IHF1ZXN0OiBzdHJpbmc7IHN0YXR1czogJ2NvbXBsZXRlZCcgfCAnYWN0aXZlJyB8ICdsb2NrZWQnIH0+O1xuICAgIH0ge1xuICAgICAgICBjb25zdCBjaGFpbiA9IHRoaXMuZ2V0QWN0aXZlQ2hhaW4oKTtcbiAgICAgICAgaWYgKCFjaGFpbikge1xuICAgICAgICAgICAgcmV0dXJuIHsgY2hhaW46IG51bGwsIHByb2dyZXNzOiB7IGNvbXBsZXRlZDogMCwgdG90YWw6IDAsIHBlcmNlbnQ6IDAgfSwgcXVlc3RTdGF0ZXM6IFtdIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHByb2dyZXNzID0gdGhpcy5nZXRDaGFpblByb2dyZXNzKCk7XG4gICAgICAgIGNvbnN0IHF1ZXN0U3RhdGVzID0gY2hhaW4ucXVlc3RzLm1hcCgocXVlc3QsIGlkeCkgPT4ge1xuICAgICAgICAgICAgaWYgKGlkeCA8IGNoYWluLmN1cnJlbnRJbmRleCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHF1ZXN0LCBzdGF0dXM6ICdjb21wbGV0ZWQnIGFzIGNvbnN0IH07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlkeCA9PT0gY2hhaW4uY3VycmVudEluZGV4KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgcXVlc3QsIHN0YXR1czogJ2FjdGl2ZScgYXMgY29uc3QgfTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgcXVlc3QsIHN0YXR1czogJ2xvY2tlZCcgYXMgY29uc3QgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4geyBjaGFpbiwgcHJvZ3Jlc3MsIHF1ZXN0U3RhdGVzIH07XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgVEZpbGUgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgeyBTaXN5cGh1c1NldHRpbmdzLCBDb250ZXh0RmlsdGVyLCBGaWx0ZXJTdGF0ZSwgRW5lcmd5TGV2ZWwsIFF1ZXN0Q29udGV4dCB9IGZyb20gJy4uL3R5cGVzJztcblxuLyoqXG4gKiBETEMgNTogQ29udGV4dCBGaWx0ZXJzIEVuZ2luZVxuICogSGFuZGxlcyBxdWVzdCBmaWx0ZXJpbmcgYnkgZW5lcmd5IGxldmVsLCBsb2NhdGlvbiBjb250ZXh0LCBhbmQgY3VzdG9tIHRhZ3NcbiAqIFxuICogSVNPTEFURUQ6IE9ubHkgcmVhZHMvd3JpdGVzIHRvIHF1ZXN0RmlsdGVycywgZmlsdGVyU3RhdGVcbiAqIERFUEVOREVOQ0lFUzogU2lzeXBodXNTZXR0aW5ncyB0eXBlcywgVEZpbGUgKGZvciBxdWVzdCBtZXRhZGF0YSlcbiAqIE5PVEU6IFRoaXMgaXMgcHJpbWFyaWx5IGEgVklFVyBMQVlFUiBjb25jZXJuLCBidXQga2VlcGluZyBsb2dpYyBpc29sYXRlZCBpcyBnb29kXG4gKi9cbmV4cG9ydCBjbGFzcyBGaWx0ZXJzRW5naW5lIHtcbiAgICBzZXR0aW5nczogU2lzeXBodXNTZXR0aW5ncztcblxuICAgIGNvbnN0cnVjdG9yKHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzKSB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MgPSBzZXR0aW5ncztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTZXQgZmlsdGVyIGZvciBhIHNwZWNpZmljIHF1ZXN0XG4gICAgICovXG4gICAgc2V0UXVlc3RGaWx0ZXIocXVlc3ROYW1lOiBzdHJpbmcsIGVuZXJneTogRW5lcmd5TGV2ZWwsIGNvbnRleHQ6IFF1ZXN0Q29udGV4dCwgdGFnczogc3RyaW5nW10pOiB2b2lkIHtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5xdWVzdEZpbHRlcnNbcXVlc3ROYW1lXSA9IHtcbiAgICAgICAgICAgIGVuZXJneUxldmVsOiBlbmVyZ3ksXG4gICAgICAgICAgICBjb250ZXh0OiBjb250ZXh0LFxuICAgICAgICAgICAgdGFnczogdGFnc1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBmaWx0ZXIgZm9yIGEgc3BlY2lmaWMgcXVlc3RcbiAgICAgKi9cbiAgICBnZXRRdWVzdEZpbHRlcihxdWVzdE5hbWU6IHN0cmluZyk6IENvbnRleHRGaWx0ZXIgfCBudWxsIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzW3F1ZXN0TmFtZV0gfHwgbnVsbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGhlIGFjdGl2ZSBmaWx0ZXIgc3RhdGVcbiAgICAgKi9cbiAgICBzZXRGaWx0ZXJTdGF0ZShlbmVyZ3k6IEVuZXJneUxldmVsIHwgXCJhbnlcIiwgY29udGV4dDogUXVlc3RDb250ZXh0IHwgXCJhbnlcIiwgdGFnczogc3RyaW5nW10pOiB2b2lkIHtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5maWx0ZXJTdGF0ZSA9IHtcbiAgICAgICAgICAgIGFjdGl2ZUVuZXJneTogZW5lcmd5IGFzIGFueSxcbiAgICAgICAgICAgIGFjdGl2ZUNvbnRleHQ6IGNvbnRleHQgYXMgYW55LFxuICAgICAgICAgICAgYWN0aXZlVGFnczogdGFnc1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBjdXJyZW50IGZpbHRlciBzdGF0ZVxuICAgICAqL1xuICAgIGdldEZpbHRlclN0YXRlKCk6IEZpbHRlclN0YXRlIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgYSBxdWVzdCBtYXRjaGVzIGN1cnJlbnQgZmlsdGVyIHN0YXRlXG4gICAgICovXG4gICAgcXVlc3RNYXRjaGVzRmlsdGVyKHF1ZXN0TmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IGZpbHRlcnMgPSB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlO1xuICAgICAgICBjb25zdCBxdWVzdEZpbHRlciA9IHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzW3F1ZXN0TmFtZV07XG4gICAgICAgIFxuICAgICAgICAvLyBJZiBubyBmaWx0ZXIgc2V0IGZvciB0aGlzIHF1ZXN0LCBhbHdheXMgc2hvd1xuICAgICAgICBpZiAoIXF1ZXN0RmlsdGVyKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgXG4gICAgICAgIC8vIEVuZXJneSBmaWx0ZXJcbiAgICAgICAgaWYgKGZpbHRlcnMuYWN0aXZlRW5lcmd5ICE9PSBcImFueVwiICYmIHF1ZXN0RmlsdGVyLmVuZXJneUxldmVsICE9PSBmaWx0ZXJzLmFjdGl2ZUVuZXJneSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDb250ZXh0IGZpbHRlclxuICAgICAgICBpZiAoZmlsdGVycy5hY3RpdmVDb250ZXh0ICE9PSBcImFueVwiICYmIHF1ZXN0RmlsdGVyLmNvbnRleHQgIT09IGZpbHRlcnMuYWN0aXZlQ29udGV4dCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBUYWdzIGZpbHRlciAocmVxdWlyZXMgQU5ZIG9mIHRoZSBhY3RpdmUgdGFncylcbiAgICAgICAgaWYgKGZpbHRlcnMuYWN0aXZlVGFncy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBoYXNUYWcgPSBmaWx0ZXJzLmFjdGl2ZVRhZ3Muc29tZSgodGFnOiBzdHJpbmcpID0+IHF1ZXN0RmlsdGVyLnRhZ3MuaW5jbHVkZXModGFnKSk7XG4gICAgICAgICAgICBpZiAoIWhhc1RhZykgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGaWx0ZXIgYSBsaXN0IG9mIHF1ZXN0cyBiYXNlZCBvbiBjdXJyZW50IGZpbHRlciBzdGF0ZVxuICAgICAqL1xuICAgIGZpbHRlclF1ZXN0cyhxdWVzdHM6IEFycmF5PHsgYmFzZW5hbWU/OiBzdHJpbmc7IG5hbWU/OiBzdHJpbmcgfT4pOiBBcnJheTx7IGJhc2VuYW1lPzogc3RyaW5nOyBuYW1lPzogc3RyaW5nIH0+IHtcbiAgICAgICAgcmV0dXJuIHF1ZXN0cy5maWx0ZXIocXVlc3QgPT4ge1xuICAgICAgICAgICAgY29uc3QgcXVlc3ROYW1lID0gcXVlc3QuYmFzZW5hbWUgfHwgcXVlc3QubmFtZTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnF1ZXN0TWF0Y2hlc0ZpbHRlcihxdWVzdE5hbWUpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgcXVlc3RzIGJ5IHNwZWNpZmljIGVuZXJneSBsZXZlbFxuICAgICAqL1xuICAgIGdldFF1ZXN0c0J5RW5lcmd5KGVuZXJneTogRW5lcmd5TGV2ZWwsIHF1ZXN0czogQXJyYXk8eyBiYXNlbmFtZT86IHN0cmluZzsgbmFtZT86IHN0cmluZyB9Pik6IEFycmF5PHsgYmFzZW5hbWU/OiBzdHJpbmc7IG5hbWU/OiBzdHJpbmcgfT4ge1xuICAgICAgICByZXR1cm4gcXVlc3RzLmZpbHRlcihxID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHF1ZXN0TmFtZSA9IHEuYmFzZW5hbWUgfHwgcS5uYW1lO1xuICAgICAgICAgICAgY29uc3QgZmlsdGVyID0gdGhpcy5zZXR0aW5ncy5xdWVzdEZpbHRlcnNbcXVlc3ROYW1lXTtcbiAgICAgICAgICAgIHJldHVybiBmaWx0ZXIgJiYgZmlsdGVyLmVuZXJneUxldmVsID09PSBlbmVyZ3k7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBxdWVzdHMgYnkgc3BlY2lmaWMgY29udGV4dFxuICAgICAqL1xuICAgIGdldFF1ZXN0c0J5Q29udGV4dChjb250ZXh0OiBRdWVzdENvbnRleHQsIHF1ZXN0czogQXJyYXk8eyBiYXNlbmFtZT86IHN0cmluZzsgbmFtZT86IHN0cmluZyB9Pik6IEFycmF5PHsgYmFzZW5hbWU/OiBzdHJpbmc7IG5hbWU/OiBzdHJpbmcgfT4ge1xuICAgICAgICByZXR1cm4gcXVlc3RzLmZpbHRlcihxID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHF1ZXN0TmFtZSA9IHEuYmFzZW5hbWUgfHwgcS5uYW1lO1xuICAgICAgICAgICAgY29uc3QgZmlsdGVyID0gdGhpcy5zZXR0aW5ncy5xdWVzdEZpbHRlcnNbcXVlc3ROYW1lXTtcbiAgICAgICAgICAgIHJldHVybiBmaWx0ZXIgJiYgZmlsdGVyLmNvbnRleHQgPT09IGNvbnRleHQ7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBxdWVzdHMgYnkgc3BlY2lmaWMgdGFnc1xuICAgICAqL1xuICAgIGdldFF1ZXN0c0J5VGFncyh0YWdzOiBzdHJpbmdbXSwgcXVlc3RzOiBBcnJheTx7IGJhc2VuYW1lPzogc3RyaW5nOyBuYW1lPzogc3RyaW5nIH0+KTogQXJyYXk8eyBiYXNlbmFtZT86IHN0cmluZzsgbmFtZT86IHN0cmluZyB9PiB7XG4gICAgICAgIHJldHVybiBxdWVzdHMuZmlsdGVyKHEgPT4ge1xuICAgICAgICAgICAgY29uc3QgcXVlc3ROYW1lID0gcS5iYXNlbmFtZSB8fCBxLm5hbWU7XG4gICAgICAgICAgICBjb25zdCBmaWx0ZXIgPSB0aGlzLnNldHRpbmdzLnF1ZXN0RmlsdGVyc1txdWVzdE5hbWVdO1xuICAgICAgICAgICAgaWYgKCFmaWx0ZXIpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIHJldHVybiB0YWdzLnNvbWUodGFnID0+IGZpbHRlci50YWdzLmluY2x1ZGVzKHRhZykpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDbGVhciBhbGwgYWN0aXZlIGZpbHRlcnNcbiAgICAgKi9cbiAgICBjbGVhckZpbHRlcnMoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUgPSB7XG4gICAgICAgICAgICBhY3RpdmVFbmVyZ3k6IFwiYW55XCIsXG4gICAgICAgICAgICBhY3RpdmVDb250ZXh0OiBcImFueVwiLFxuICAgICAgICAgICAgYWN0aXZlVGFnczogW11cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgYWxsIHVuaXF1ZSB0YWdzIHVzZWQgYWNyb3NzIGFsbCBxdWVzdHNcbiAgICAgKi9cbiAgICBnZXRBdmFpbGFibGVUYWdzKCk6IHN0cmluZ1tdIHtcbiAgICAgICAgY29uc3QgdGFncyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgICAgICBcbiAgICAgICAgZm9yIChjb25zdCBxdWVzdE5hbWUgaW4gdGhpcy5zZXR0aW5ncy5xdWVzdEZpbHRlcnMpIHtcbiAgICAgICAgICAgIGNvbnN0IGZpbHRlciA9IHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzW3F1ZXN0TmFtZV07XG4gICAgICAgICAgICBmaWx0ZXIudGFncy5mb3JFYWNoKCh0YWc6IHN0cmluZykgPT4gdGFncy5hZGQodGFnKSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBBcnJheS5mcm9tKHRhZ3MpLnNvcnQoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgc3VtbWFyeSBzdGF0cyBhYm91dCBmaWx0ZXJlZCBzdGF0ZVxuICAgICAqL1xuICAgIGdldEZpbHRlclN0YXRzKGFsbFF1ZXN0czogQXJyYXk8eyBiYXNlbmFtZT86IHN0cmluZzsgbmFtZT86IHN0cmluZyB9Pik6IHtcbiAgICAgICAgdG90YWw6IG51bWJlcjtcbiAgICAgICAgZmlsdGVyZWQ6IG51bWJlcjtcbiAgICAgICAgYWN0aXZlRmlsdGVyc0NvdW50OiBudW1iZXI7XG4gICAgfSB7XG4gICAgICAgIGNvbnN0IGZpbHRlcmVkID0gdGhpcy5maWx0ZXJRdWVzdHMoYWxsUXVlc3RzKTtcbiAgICAgICAgY29uc3QgYWN0aXZlRmlsdGVyc0NvdW50ID0gKHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlRW5lcmd5ICE9PSBcImFueVwiID8gMSA6IDApICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlQ29udGV4dCAhPT0gXCJhbnlcIiA/IDEgOiAwKSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICh0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZVRhZ3MubGVuZ3RoID4gMCA/IDEgOiAwKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0b3RhbDogYWxsUXVlc3RzLmxlbmd0aCxcbiAgICAgICAgICAgIGZpbHRlcmVkOiBmaWx0ZXJlZC5sZW5ndGgsXG4gICAgICAgICAgICBhY3RpdmVGaWx0ZXJzQ291bnQ6IGFjdGl2ZUZpbHRlcnNDb3VudFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZSBhIHNwZWNpZmljIGZpbHRlciB2YWx1ZVxuICAgICAqIFVzZWZ1bCBmb3IgVUkgdG9nZ2xlIGJ1dHRvbnNcbiAgICAgKi9cbiAgICB0b2dnbGVFbmVyZ3lGaWx0ZXIoZW5lcmd5OiBFbmVyZ3lMZXZlbCB8IFwiYW55XCIpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlRW5lcmd5ID09PSBlbmVyZ3kpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlRW5lcmd5ID0gXCJhbnlcIjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlRW5lcmd5ID0gZW5lcmd5IGFzIGFueTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZSBjb250ZXh0IGZpbHRlclxuICAgICAqL1xuICAgIHRvZ2dsZUNvbnRleHRGaWx0ZXIoY29udGV4dDogUXVlc3RDb250ZXh0IHwgXCJhbnlcIik6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5maWx0ZXJTdGF0ZS5hY3RpdmVDb250ZXh0ID09PSBjb250ZXh0KSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZUNvbnRleHQgPSBcImFueVwiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5maWx0ZXJTdGF0ZS5hY3RpdmVDb250ZXh0ID0gY29udGV4dCBhcyBhbnk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGUgYSB0YWcgaW4gdGhlIGFjdGl2ZSB0YWcgbGlzdFxuICAgICAqL1xuICAgIHRvZ2dsZVRhZyh0YWc6IHN0cmluZyk6IHZvaWQge1xuICAgICAgICBjb25zdCBpZHggPSB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZVRhZ3MuaW5kZXhPZih0YWcpO1xuICAgICAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlVGFncy5zcGxpY2UoaWR4LCAxKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlVGFncy5wdXNoKHRhZyk7XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCJpbXBvcnQgeyBBcHAsIFRGaWxlLCBURm9sZGVyLCBOb3RpY2UsIG1vbWVudCB9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCB7IFNpc3lwaHVzU2V0dGluZ3MsIFNraWxsLCBNb2RpZmllciwgRGFpbHlNaXNzaW9uIH0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgeyBBdWRpb0NvbnRyb2xsZXIgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IENoYW9zTW9kYWwgfSBmcm9tICcuL3VpL21vZGFscyc7XG5pbXBvcnQgeyBBbmFseXRpY3NFbmdpbmUgfSBmcm9tICcuL2VuZ2luZXMvQW5hbHl0aWNzRW5naW5lJztcbmltcG9ydCB7IE1lZGl0YXRpb25FbmdpbmUgfSBmcm9tICcuL2VuZ2luZXMvTWVkaXRhdGlvbkVuZ2luZSc7XG5pbXBvcnQgeyBSZXNlYXJjaEVuZ2luZSB9IGZyb20gJy4vZW5naW5lcy9SZXNlYXJjaEVuZ2luZSc7XG5pbXBvcnQgeyBDaGFpbnNFbmdpbmUgfSBmcm9tICcuL2VuZ2luZXMvQ2hhaW5zRW5naW5lJztcbmltcG9ydCB7IEZpbHRlcnNFbmdpbmUgfSBmcm9tICcuL2VuZ2luZXMvRmlsdGVyc0VuZ2luZSc7XG5cbi8vIERFRkFVTFQgQ09OU1RBTlRTXG5leHBvcnQgY29uc3QgREVGQVVMVF9NT0RJRklFUjogTW9kaWZpZXIgPSB7IG5hbWU6IFwiQ2xlYXIgU2tpZXNcIiwgZGVzYzogXCJObyBlZmZlY3RzLlwiLCB4cE11bHQ6IDEsIGdvbGRNdWx0OiAxLCBwcmljZU11bHQ6IDEsIGljb246IFwi4piA77iPXCIgfTtcbmV4cG9ydCBjb25zdCBDSEFPU19UQUJMRTogTW9kaWZpZXJbXSA9IFtcbiAgICB7IG5hbWU6IFwiQ2xlYXIgU2tpZXNcIiwgZGVzYzogXCJOb3JtYWwuXCIsIHhwTXVsdDogMSwgZ29sZE11bHQ6IDEsIHByaWNlTXVsdDogMSwgaWNvbjogXCLimIDvuI9cIiB9LFxuICAgIHsgbmFtZTogXCJGbG93IFN0YXRlXCIsIGRlc2M6IFwiKzUwJSBYUC5cIiwgeHBNdWx0OiAxLjUsIGdvbGRNdWx0OiAxLCBwcmljZU11bHQ6IDEsIGljb246IFwi8J+MilwiIH0sXG4gICAgeyBuYW1lOiBcIldpbmRmYWxsXCIsIGRlc2M6IFwiKzUwJSBHb2xkLlwiLCB4cE11bHQ6IDEsIGdvbGRNdWx0OiAxLjUsIHByaWNlTXVsdDogMSwgaWNvbjogXCLwn5KwXCIgfSxcbiAgICB7IG5hbWU6IFwiSW5mbGF0aW9uXCIsIGRlc2M6IFwiUHJpY2VzIDJ4LlwiLCB4cE11bHQ6IDEsIGdvbGRNdWx0OiAxLCBwcmljZU11bHQ6IDIsIGljb246IFwi8J+TiFwiIH0sXG4gICAgeyBuYW1lOiBcIkJyYWluIEZvZ1wiLCBkZXNjOiBcIlhQIDAuNXguXCIsIHhwTXVsdDogMC41LCBnb2xkTXVsdDogMSwgcHJpY2VNdWx0OiAxLCBpY29uOiBcIvCfjKvvuI9cIiB9LFxuICAgIHsgbmFtZTogXCJSaXZhbCBTYWJvdGFnZVwiLCBkZXNjOiBcIkdvbGQgMC41eC5cIiwgeHBNdWx0OiAxLCBnb2xkTXVsdDogMC41LCBwcmljZU11bHQ6IDEsIGljb246IFwi8J+Vte+4j1wiIH0sXG4gICAgeyBuYW1lOiBcIkFkcmVuYWxpbmVcIiwgZGVzYzogXCIyeCBYUCwgLTUgSFAvUS5cIiwgeHBNdWx0OiAyLCBnb2xkTXVsdDogMSwgcHJpY2VNdWx0OiAxLCBpY29uOiBcIvCfkolcIiB9XG5dO1xuXG4vLyBETEMgMTogTWlzc2lvbiBQb29sXG5jb25zdCBNSVNTSU9OX1BPT0wgPSBbXG4gICAgeyBpZDogXCJtb3JuaW5nX3dpblwiLCBuYW1lOiBcIuKYgO+4jyBNb3JuaW5nIFdpblwiLCBkZXNjOiBcIkNvbXBsZXRlIDEgVHJpdmlhbCBxdWVzdCBiZWZvcmUgMTAgQU1cIiwgdGFyZ2V0OiAxLCByZXdhcmQ6IHsgeHA6IDAsIGdvbGQ6IDE1IH0sIGNoZWNrOiBcIm1vcm5pbmdfdHJpdmlhbFwiIH0sXG4gICAgeyBpZDogXCJtb21lbnR1bVwiLCBuYW1lOiBcIvCflKUgTW9tZW50dW1cIiwgZGVzYzogXCJDb21wbGV0ZSAzIHF1ZXN0cyB0b2RheVwiLCB0YXJnZXQ6IDMsIHJld2FyZDogeyB4cDogMjAsIGdvbGQ6IDAgfSwgY2hlY2s6IFwicXVlc3RfY291bnRcIiB9LFxuICAgIHsgaWQ6IFwiemVyb19pbmJveFwiLCBuYW1lOiBcIvCfp5ggWmVybyBJbmJveFwiLCBkZXNjOiBcIlByb2Nlc3MgYWxsIHNjcmFwcyAoMCByZW1haW5pbmcpXCIsIHRhcmdldDogMSwgcmV3YXJkOiB7IHhwOiAwLCBnb2xkOiAxMCB9LCBjaGVjazogXCJ6ZXJvX3NjcmFwc1wiIH0sXG4gICAgeyBpZDogXCJzcGVjaWFsaXN0XCIsIG5hbWU6IFwi8J+OryBTcGVjaWFsaXN0XCIsIGRlc2M6IFwiVXNlIHRoZSBzYW1lIHNraWxsIDMgdGltZXNcIiwgdGFyZ2V0OiAzLCByZXdhcmQ6IHsgeHA6IDE1LCBnb2xkOiAwIH0sIGNoZWNrOiBcInNraWxsX3JlcGVhdFwiIH0sXG4gICAgeyBpZDogXCJoaWdoX3N0YWtlc1wiLCBuYW1lOiBcIvCfkqogSGlnaCBTdGFrZXNcIiwgZGVzYzogXCJDb21wbGV0ZSAxIEhpZ2ggU3Rha2VzIHF1ZXN0XCIsIHRhcmdldDogMSwgcmV3YXJkOiB7IHhwOiAwLCBnb2xkOiAzMCB9LCBjaGVjazogXCJoaWdoX3N0YWtlc1wiIH0sXG4gICAgeyBpZDogXCJzcGVlZF9kZW1vblwiLCBuYW1lOiBcIuKaoSBTcGVlZCBEZW1vblwiLCBkZXNjOiBcIkNvbXBsZXRlIHF1ZXN0IHdpdGhpbiAyaCBvZiBjcmVhdGlvblwiLCB0YXJnZXQ6IDEsIHJld2FyZDogeyB4cDogMjUsIGdvbGQ6IDAgfSwgY2hlY2s6IFwiZmFzdF9jb21wbGV0ZVwiIH0sXG4gICAgeyBpZDogXCJzeW5lcmdpc3RcIiwgbmFtZTogXCLwn5SXIFN5bmVyZ2lzdFwiLCBkZXNjOiBcIkNvbXBsZXRlIHF1ZXN0IHdpdGggUHJpbWFyeSArIFNlY29uZGFyeSBza2lsbFwiLCB0YXJnZXQ6IDEsIHJld2FyZDogeyB4cDogMCwgZ29sZDogMTAgfSwgY2hlY2s6IFwic3luZXJneVwiIH0sXG4gICAgeyBpZDogXCJzdXJ2aXZvclwiLCBuYW1lOiBcIvCfm6HvuI8gU3Vydml2b3JcIiwgZGVzYzogXCJEb24ndCB0YWtlIGFueSBkYW1hZ2UgdG9kYXlcIiwgdGFyZ2V0OiAxLCByZXdhcmQ6IHsgeHA6IDAsIGdvbGQ6IDIwIH0sIGNoZWNrOiBcIm5vX2RhbWFnZVwiIH0sXG4gICAgeyBpZDogXCJyaXNrX3Rha2VyXCIsIG5hbWU6IFwi8J+OsiBSaXNrIFRha2VyXCIsIGRlc2M6IFwiQ29tcGxldGUgRGlmZmljdWx0eSA0KyBxdWVzdFwiLCB0YXJnZXQ6IDEsIHJld2FyZDogeyB4cDogMTUsIGdvbGQ6IDAgfSwgY2hlY2s6IFwiaGFyZF9xdWVzdFwiIH1cbl07XG5cbmV4cG9ydCBjbGFzcyBTaXN5cGh1c0VuZ2luZSB7XG4gICAgYXBwOiBBcHA7XG4gICAgcGx1Z2luOiBhbnk7XG4gICAgYXVkaW86IEF1ZGlvQ29udHJvbGxlcjtcbiAgYW5hbHl0aWNzRW5naW5lOiBBbmFseXRpY3NFbmdpbmU7XG5tZWRpdGF0aW9uRW5naW5lOiBNZWRpdGF0aW9uRW5naW5lO1xucmVzZWFyY2hFbmdpbmU6IFJlc2VhcmNoRW5naW5lO1xuY2hhaW5zRW5naW5lOiBDaGFpbnNFbmdpbmU7XG5maWx0ZXJzRW5naW5lOiBGaWx0ZXJzRW5naW5lO1xuXG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogYW55LCBhdWRpbzogQXVkaW9Db250cm9sbGVyKSB7XG4gICAgICAgIHRoaXMuYXBwID0gYXBwO1xuICAgICAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcbiAgICAgICAgdGhpcy5hdWRpbyA9IGF1ZGlvO1xuICAgIHRoaXMuYW5hbHl0aWNzRW5naW5lID0gbmV3IEFuYWx5dGljc0VuZ2luZSh0aGlzLnNldHRpbmdzLCB0aGlzLmF1ZGlvKTtcbnRoaXMubWVkaXRhdGlvbkVuZ2luZSA9IG5ldyBNZWRpdGF0aW9uRW5naW5lKHRoaXMuc2V0dGluZ3MsIHRoaXMuYXVkaW8pO1xudGhpcy5yZXNlYXJjaEVuZ2luZSA9IG5ldyBSZXNlYXJjaEVuZ2luZSh0aGlzLnNldHRpbmdzLCB0aGlzLmF1ZGlvKTtcbnRoaXMuY2hhaW5zRW5naW5lID0gbmV3IENoYWluc0VuZ2luZSh0aGlzLnNldHRpbmdzLCB0aGlzLmF1ZGlvKTtcbnRoaXMuZmlsdGVyc0VuZ2luZSA9IG5ldyBGaWx0ZXJzRW5naW5lKHRoaXMuc2V0dGluZ3MpO1xuICAgIH1cblxuICAgIGdldCBzZXR0aW5ncygpOiBTaXN5cGh1c1NldHRpbmdzIHsgcmV0dXJuIHRoaXMucGx1Z2luLnNldHRpbmdzOyB9XG4gICAgc2V0IHNldHRpbmdzKHZhbDogU2lzeXBodXNTZXR0aW5ncykgeyB0aGlzLnBsdWdpbi5zZXR0aW5ncyA9IHZhbDsgfVxuXG4gICAgYXN5bmMgc2F2ZSgpIHsgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7IHRoaXMucGx1Z2luLnJlZnJlc2hVSSgpOyB9XG5cbiAgICAvLyBETEMgMTogRGFpbHkgTWlzc2lvbnNcbiAgICByb2xsRGFpbHlNaXNzaW9ucygpIHtcbiAgICAgICAgY29uc3QgYXZhaWxhYmxlID0gWy4uLk1JU1NJT05fUE9PTF07XG4gICAgICAgIGNvbnN0IHNlbGVjdGVkOiBEYWlseU1pc3Npb25bXSA9IFtdO1xuICAgICAgICBcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChhdmFpbGFibGUubGVuZ3RoID09PSAwKSBicmVhaztcbiAgICAgICAgICAgIGNvbnN0IGlkeCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGF2YWlsYWJsZS5sZW5ndGgpO1xuICAgICAgICAgICAgY29uc3QgbWlzc2lvbiA9IGF2YWlsYWJsZS5zcGxpY2UoaWR4LCAxKVswXTtcbiAgICAgICAgICAgIHNlbGVjdGVkLnB1c2goe1xuICAgICAgICAgICAgICAgIC4uLm1pc3Npb24sXG4gICAgICAgICAgICAgICAgY2hlY2tGdW5jOiBtaXNzaW9uLmNoZWNrLFxuICAgICAgICAgICAgICAgIHByb2dyZXNzOiAwLFxuICAgICAgICAgICAgICAgIGNvbXBsZXRlZDogZmFsc2VcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLmRhaWx5TWlzc2lvbnMgPSBzZWxlY3RlZDtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5kYWlseU1pc3Npb25EYXRlID0gbW9tZW50KCkuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5xdWVzdHNDb21wbGV0ZWRUb2RheSA9IDA7XG4gICAgICAgIHRoaXMuc2V0dGluZ3Muc2tpbGxVc2VzVG9kYXkgPSB7fTtcbiAgICB9XG5cbiAgICBjaGVja0RhaWx5TWlzc2lvbnMoY29udGV4dDogeyB0eXBlPzogc3RyaW5nOyBkaWZmaWN1bHR5PzogbnVtYmVyOyBza2lsbD86IHN0cmluZzsgc2Vjb25kYXJ5U2tpbGw/OiBzdHJpbmc7IGhpZ2hTdGFrZXM/OiBib29sZWFuOyBxdWVzdENyZWF0ZWQ/OiBudW1iZXIgfSkge1xuICAgICAgICBjb25zdCBub3cgPSBtb21lbnQoKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0dGluZ3MuZGFpbHlNaXNzaW9ucy5mb3JFYWNoKG1pc3Npb24gPT4ge1xuICAgICAgICAgICAgaWYgKG1pc3Npb24uY29tcGxldGVkKSByZXR1cm47XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHN3aXRjaCAobWlzc2lvbi5jaGVja0Z1bmMpIHtcbiAgICAgICAgICAgICAgICBjYXNlIFwibW9ybmluZ190cml2aWFsXCI6XG4gICAgICAgICAgICAgICAgICAgIGlmIChjb250ZXh0LnR5cGUgPT09IFwiY29tcGxldGVcIiAmJiBjb250ZXh0LmRpZmZpY3VsdHkgPT09IDEgJiYgbm93LmhvdXIoKSA8IDEwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtaXNzaW9uLnByb2dyZXNzKys7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcInF1ZXN0X2NvdW50XCI6XG4gICAgICAgICAgICAgICAgICAgIGlmIChjb250ZXh0LnR5cGUgPT09IFwiY29tcGxldGVcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWlzc2lvbi5wcm9ncmVzcyA9IHRoaXMuc2V0dGluZ3MucXVlc3RzQ29tcGxldGVkVG9kYXk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcImhpZ2hfc3Rha2VzXCI6XG4gICAgICAgICAgICAgICAgICAgIGlmIChjb250ZXh0LnR5cGUgPT09IFwiY29tcGxldGVcIiAmJiBjb250ZXh0LmhpZ2hTdGFrZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1pc3Npb24ucHJvZ3Jlc3MrKztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwiZmFzdF9jb21wbGV0ZVwiOlxuICAgICAgICAgICAgICAgICAgICBpZiAoY29udGV4dC50eXBlID09PSBcImNvbXBsZXRlXCIgJiYgY29udGV4dC5xdWVzdENyZWF0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGVsYXBzZWQgPSBtb21lbnQoKS5kaWZmKG1vbWVudChjb250ZXh0LnF1ZXN0Q3JlYXRlZCksICdob3VycycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVsYXBzZWQgPD0gMikgbWlzc2lvbi5wcm9ncmVzcysrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJzeW5lcmd5XCI6XG4gICAgICAgICAgICAgICAgICAgIGlmIChjb250ZXh0LnR5cGUgPT09IFwiY29tcGxldGVcIiAmJiBjb250ZXh0LnNraWxsICYmIGNvbnRleHQuc2Vjb25kYXJ5U2tpbGwgJiYgY29udGV4dC5zZWNvbmRhcnlTa2lsbCAhPT0gXCJOb25lXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1pc3Npb24ucHJvZ3Jlc3MrKztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwibm9fZGFtYWdlXCI6XG4gICAgICAgICAgICAgICAgICAgIGlmIChjb250ZXh0LnR5cGUgPT09IFwiZGFtYWdlXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1pc3Npb24ucHJvZ3Jlc3MgPSAwO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJoYXJkX3F1ZXN0XCI6XG4gICAgICAgICAgICAgICAgICAgIGlmIChjb250ZXh0LnR5cGUgPT09IFwiY29tcGxldGVcIiAmJiBjb250ZXh0LmRpZmZpY3VsdHkgJiYgY29udGV4dC5kaWZmaWN1bHR5ID49IDQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1pc3Npb24ucHJvZ3Jlc3MrKztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwic2tpbGxfcmVwZWF0XCI6XG4gICAgICAgICAgICAgICAgICAgIGlmIChjb250ZXh0LnR5cGUgPT09IFwiY29tcGxldGVcIiAmJiBjb250ZXh0LnNraWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLnNraWxsVXNlc1RvZGF5W2NvbnRleHQuc2tpbGxdID0gKHRoaXMuc2V0dGluZ3Muc2tpbGxVc2VzVG9kYXlbY29udGV4dC5za2lsbF0gfHwgMCkgKyAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2tpbGxVc2VWYWx1ZXM6IG51bWJlcltdID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiB0aGlzLnNldHRpbmdzLnNraWxsVXNlc1RvZGF5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2tpbGxVc2VWYWx1ZXMucHVzaCh0aGlzLnNldHRpbmdzLnNraWxsVXNlc1RvZGF5W2tleV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbWF4VXNlcyA9IHNraWxsVXNlVmFsdWVzLmxlbmd0aCA+IDAgPyBNYXRoLm1heCguLi5za2lsbFVzZVZhbHVlcykgOiAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgbWlzc2lvbi5wcm9ncmVzcyA9IG1heFVzZXM7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChtaXNzaW9uLnByb2dyZXNzID49IG1pc3Npb24udGFyZ2V0ICYmICFtaXNzaW9uLmNvbXBsZXRlZCkge1xuICAgICAgICAgICAgICAgIG1pc3Npb24uY29tcGxldGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLnhwICs9IG1pc3Npb24ucmV3YXJkLnhwO1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuZ29sZCArPSBtaXNzaW9uLnJld2FyZC5nb2xkO1xuICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoYOKchSBEYWlseSBNaXNzaW9uIENvbXBsZXRlOiAke21pc3Npb24ubmFtZX1gKTtcbiAgICAgICAgICAgICAgICB0aGlzLmF1ZGlvLnBsYXlTb3VuZChcInN1Y2Nlc3NcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5zYXZlKCk7XG4gICAgfVxuXG4gICAgZ2V0RGlmZmljdWx0eU51bWJlcihkaWZmTGFiZWw6IHN0cmluZyk6IG51bWJlciB7XG4gICAgICAgIGlmIChkaWZmTGFiZWwgPT09IFwiVHJpdmlhbFwiKSByZXR1cm4gMTtcbiAgICAgICAgaWYgKGRpZmZMYWJlbCA9PT0gXCJFYXN5XCIpIHJldHVybiAyO1xuICAgICAgICBpZiAoZGlmZkxhYmVsID09PSBcIk1lZGl1bVwiKSByZXR1cm4gMztcbiAgICAgICAgaWYgKGRpZmZMYWJlbCA9PT0gXCJIYXJkXCIpIHJldHVybiA0O1xuICAgICAgICBpZiAoZGlmZkxhYmVsID09PSBcIlNVSUNJREVcIikgcmV0dXJuIDU7XG4gICAgICAgIHJldHVybiAzO1xuICAgIH1cblxuICAgIGFzeW5jIGNoZWNrRGFpbHlMb2dpbigpIHtcbiAgICAgICAgY29uc3QgdG9kYXkgPSBtb21lbnQoKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MubGFzdExvZ2luKSB7XG4gICAgICAgICAgICBjb25zdCBsYXN0RGF0ZSA9IG1vbWVudCh0aGlzLnNldHRpbmdzLmxhc3RMb2dpbik7XG4gICAgICAgICAgICBjb25zdCB0b2RheU1vbWVudCA9IG1vbWVudCgpO1xuICAgICAgICAgICAgY29uc3QgZGF5c0RpZmYgPSB0b2RheU1vbWVudC5kaWZmKGxhc3REYXRlLCAnZGF5cycpO1xuXG4gICAgICAgICAgICBpZiAoZGF5c0RpZmYgPiAxKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgcm90RGFtYWdlID0gKGRheXNEaWZmIC0gMSkgKiAxMDtcbiAgICAgICAgICAgICAgICBpZiAocm90RGFtYWdlID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLmhwIC09IHJvdERhbWFnZTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5oaXN0b3J5LnB1c2goeyBkYXRlOiB0b2RheSwgc3RhdHVzOiBcInJvdFwiLCB4cEVhcm5lZDogLXJvdERhbWFnZSB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5sYXN0TG9naW4gIT09IHRvZGF5KSB7XG4gICAgICB0aGlzLmFuYWx5dGljc0VuZ2luZS51cGRhdGVTdHJlYWsoKTtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MubWF4SHAgPSAxMDAgKyAodGhpcy5zZXR0aW5ncy5sZXZlbCAqIDUpO1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5ocCA9IE1hdGgubWluKHRoaXMuc2V0dGluZ3MubWF4SHAsIHRoaXMuc2V0dGluZ3MuaHAgKyAyMCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuZGFtYWdlVGFrZW5Ub2RheSA9IDA7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmxvY2tkb3duVW50aWwgPSBcIlwiO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCB0b2RheU1vbWVudCA9IG1vbWVudCgpO1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5za2lsbHMuZm9yRWFjaChzID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocy5sYXN0VXNlZCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkaWZmID0gdG9kYXlNb21lbnQuZGlmZihtb21lbnQocy5sYXN0VXNlZCksICdkYXlzJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkaWZmID4gMykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLmlzUmVzdGluZygpKSB7IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMucnVzdCA9IE1hdGgubWluKDEwLCAocy5ydXN0IHx8IDApICsgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcy54cFJlcSA9IE1hdGguZmxvb3Iocy54cFJlcSAqIDEuMSk7IFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmICghdGhpcy5zZXR0aW5ncy5oaXN0b3J5LmZpbmQoaCA9PiBoLmRhdGUgPT09IHRoaXMuc2V0dGluZ3MubGFzdExvZ2luKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuaGlzdG9yeS5wdXNoKHsgZGF0ZTogdGhpcy5zZXR0aW5ncy5sYXN0TG9naW4sIHN0YXR1czogXCJza2lwXCIsIHhwRWFybmVkOiAwIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmxhc3RMb2dpbiA9IHRvZGF5O1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5oaXN0b3J5LnB1c2goeyBkYXRlOiB0b2RheSwgc3RhdHVzOiBcInN1Y2Nlc3NcIiwgeHBFYXJuZWQ6IDAgfSk7XG4gICAgICAgICAgICBpZih0aGlzLnNldHRpbmdzLmhpc3RvcnkubGVuZ3RoID4gMTQpIHRoaXMuc2V0dGluZ3MuaGlzdG9yeS5zaGlmdCgpO1xuXG4gICAgICAgICAgICAvLyBETEMgMTogUm9sbCBkYWlseSBtaXNzaW9uc1xuICAgICAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuZGFpbHlNaXNzaW9uRGF0ZSAhPT0gdG9kYXkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJvbGxEYWlseU1pc3Npb25zKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGF3YWl0IHRoaXMucm9sbENoYW9zKHRydWUpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zYXZlKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyBjb21wbGV0ZVF1ZXN0KGZpbGU6IFRGaWxlKSB7XG4gICAgdGhpcy5hbmFseXRpY3NFbmdpbmUudHJhY2tEYWlseU1ldHJpY3MoXCJxdWVzdF9jb21wbGV0ZVwiLCAxKTtcbiAgICB0aGlzLnNldHRpbmdzLnJlc2VhcmNoU3RhdHMudG90YWxDb21iYXQrKztcbiAgICBpZiAodGhpcy5pc0xvY2tlZERvd24oKSkgeyBuZXcgTm90aWNlKFwiTE9DS0RPV04gQUNUSVZFXCIpOyByZXR1cm47IH1cbiAgICBcbiAgICBjb25zdCBmbSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpPy5mcm9udG1hdHRlcjtcbiAgICBpZiAoIWZtKSByZXR1cm47XG4gICAgXG4gICAgLy8gRExDIDQ6IENoZWNrIGlmIHF1ZXN0IGlzIGluIGFjdGl2ZSBjaGFpbiBhbmQgYWxsb3dlZFxuICAgIGNvbnN0IHF1ZXN0TmFtZSA9IGZpbGUuYmFzZW5hbWU7XG4gICAgaWYgKHRoaXMuaXNRdWVzdEluQ2hhaW4ocXVlc3ROYW1lKSAmJiAhdGhpcy5jYW5TdGFydFF1ZXN0KHF1ZXN0TmFtZSkpIHtcbiAgICAgICAgbmV3IE5vdGljZShcIlF1ZXN0IGxvY2tlZCBpbiBjaGFpbi4gQ29tcGxldGUgdGhlIGFjdGl2ZSBxdWVzdCBmaXJzdC5cIik7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgICAgIGxldCB4cCA9IChmbS54cF9yZXdhcmQgfHwgMjApICogdGhpcy5zZXR0aW5ncy5kYWlseU1vZGlmaWVyLnhwTXVsdDtcbiAgICAgICAgbGV0IGdvbGQgPSAoZm0uZ29sZF9yZXdhcmQgfHwgMCkgKiB0aGlzLnNldHRpbmdzLmRhaWx5TW9kaWZpZXIuZ29sZE11bHQ7XG4gICAgICAgIGNvbnN0IHNraWxsTmFtZSA9IGZtLnNraWxsIHx8IFwiTm9uZVwiO1xuICAgICAgICBjb25zdCBzZWNvbmRhcnkgPSBmbS5zZWNvbmRhcnlfc2tpbGwgfHwgXCJOb25lXCI7IFxuXG4gICAgICAgIHRoaXMuYXVkaW8ucGxheVNvdW5kKFwic3VjY2Vzc1wiKTtcblxuICAgICAgICBjb25zdCBza2lsbCA9IHRoaXMuc2V0dGluZ3Muc2tpbGxzLmZpbmQocyA9PiBzLm5hbWUgPT09IHNraWxsTmFtZSk7XG4gICAgICAgIGlmIChza2lsbCkge1xuICAgICAgICAgICAgaWYgKHNraWxsLnJ1c3QgPiAwKSB7XG4gICAgICAgICAgICAgICAgc2tpbGwucnVzdCA9IDA7XG4gICAgICAgICAgICAgICAgc2tpbGwueHBSZXEgPSBNYXRoLmZsb29yKHNraWxsLnhwUmVxIC8gMS4yKTsgXG4gICAgICAgICAgICAgICAgbmV3IE5vdGljZShg4pyoICR7c2tpbGwubmFtZX06IFJ1c3QgQ2xlYXJlZCFgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNraWxsLmxhc3RVc2VkID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgICAgICAgICAgc2tpbGwueHAgKz0gMTtcbiAgICAgICAgICAgIGlmIChza2lsbC54cCA+PSBza2lsbC54cFJlcSkgeyBza2lsbC5sZXZlbCsrOyBza2lsbC54cCA9IDA7IG5ldyBOb3RpY2UoYPCfp6AgJHtza2lsbC5uYW1lfSBVcCFgKTsgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoc2Vjb25kYXJ5ICYmIHNlY29uZGFyeSAhPT0gXCJOb25lXCIpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzZWNTa2lsbCA9IHRoaXMuc2V0dGluZ3Muc2tpbGxzLmZpbmQocyA9PiBzLm5hbWUgPT09IHNlY29uZGFyeSk7XG4gICAgICAgICAgICAgICAgaWYgKHNlY1NraWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKCFza2lsbC5jb25uZWN0aW9ucykgc2tpbGwuY29ubmVjdGlvbnMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgaWYoIXNraWxsLmNvbm5lY3Rpb25zLmluY2x1ZGVzKHNlY29uZGFyeSkpIHsgc2tpbGwuY29ubmVjdGlvbnMucHVzaChzZWNvbmRhcnkpOyBuZXcgTm90aWNlKGDwn5SXIE5ldXJhbCBMaW5rIEVzdGFibGlzaGVkYCk7IH1cbiAgICAgICAgICAgICAgICAgICAgeHAgKz0gTWF0aC5mbG9vcihzZWNTa2lsbC5sZXZlbCAqIDAuNSk7IHNlY1NraWxsLnhwICs9IDAuNTsgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuZGFpbHlNb2RpZmllci5uYW1lID09PSBcIkFkcmVuYWxpbmVcIikgdGhpcy5zZXR0aW5ncy5ocCAtPSA1O1xuICAgICAgICB0aGlzLnNldHRpbmdzLnhwICs9IHhwOyB0aGlzLnNldHRpbmdzLmdvbGQgKz0gZ29sZDtcblxuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy54cCA+PSB0aGlzLnNldHRpbmdzLnhwUmVxKSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmxldmVsKys7IFxuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5yaXZhbERtZyArPSA1OyBcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MueHAgPSAwO1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy54cFJlcSA9IE1hdGguZmxvb3IodGhpcy5zZXR0aW5ncy54cFJlcSAqIDEuMSk7IFxuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5tYXhIcCA9IDEwMCArICh0aGlzLnNldHRpbmdzLmxldmVsICogNSk7IFxuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5ocCA9IHRoaXMuc2V0dGluZ3MubWF4SHA7XG4gICAgICAgICAgICB0aGlzLnRhdW50KFwibGV2ZWxfdXBcIik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBETEMgMTogVHJhY2sgZm9yIGRhaWx5IG1pc3Npb25zXG4gICAgICAgIHRoaXMuc2V0dGluZ3MucXVlc3RzQ29tcGxldGVkVG9kYXkrKztcbiAgICAgICAgY29uc3QgcXVlc3RDcmVhdGVkID0gZm0uY3JlYXRlZCA/IG5ldyBEYXRlKGZtLmNyZWF0ZWQpLmdldFRpbWUoKSA6IERhdGUubm93KCk7XG4gICAgICAgIGNvbnN0IGRpZmZpY3VsdHkgPSB0aGlzLmdldERpZmZpY3VsdHlOdW1iZXIoZm0uZGlmZmljdWx0eSk7XG4gICAgICAgIHRoaXMuY2hlY2tEYWlseU1pc3Npb25zKHtcbiAgICAgICAgICAgIHR5cGU6IFwiY29tcGxldGVcIixcbiAgICAgICAgICAgIGRpZmZpY3VsdHk6IGRpZmZpY3VsdHksXG4gICAgICAgICAgICBza2lsbDogc2tpbGxOYW1lLFxuICAgICAgICAgICAgc2Vjb25kYXJ5U2tpbGw6IHNlY29uZGFyeSxcbiAgICAgICAgICAgIGhpZ2hTdGFrZXM6IGZtLmhpZ2hfc3Rha2VzLFxuICAgICAgICAgICAgcXVlc3RDcmVhdGVkOiBxdWVzdENyZWF0ZWRcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc3QgYXJjaGl2ZVBhdGggPSBcIkFjdGl2ZV9SdW4vQXJjaGl2ZVwiO1xuICAgICAgICBpZiAoIXRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChhcmNoaXZlUGF0aCkpIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZUZvbGRlcihhcmNoaXZlUGF0aCk7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwLmZpbGVNYW5hZ2VyLnByb2Nlc3NGcm9udE1hdHRlcihmaWxlLCAoZikgPT4geyBmLnN0YXR1cyA9IFwiY29tcGxldGVkXCI7IGYuY29tcGxldGVkX2F0ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpOyB9KTtcbiAgICAgICAgYXdhaXQgdGhpcy5hcHAuZmlsZU1hbmFnZXIucmVuYW1lRmlsZShmaWxlLCBgJHthcmNoaXZlUGF0aH0vJHtmaWxlLm5hbWV9YCk7XG4gICAgICAgIGF3YWl0IHRoaXMuc2F2ZSgpO1xuICAgIH1cblxuICAgIGFzeW5jIGZhaWxRdWVzdChmaWxlOiBURmlsZSwgbWFudWFsQWJvcnQ6IGJvb2xlYW4gPSBmYWxzZSkge1xuICAgICAgICBpZiAodGhpcy5pc1Jlc3RpbmcoKSAmJiAhbWFudWFsQWJvcnQpIHtcbiAgICAgICAgICAgICBuZXcgTm90aWNlKFwi8J+YtCBSZXN0IERheSBhY3RpdmUuIE5vIGRhbWFnZS5cIik7XG4gICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuaXNTaGllbGRlZCgpICYmICFtYW51YWxBYm9ydCkge1xuICAgICAgICAgICAgbmV3IE5vdGljZShg8J+boe+4jyBTSElFTERFRCFgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBkYW1hZ2UgPSAxMCArIE1hdGguZmxvb3IodGhpcy5zZXR0aW5ncy5yaXZhbERtZyAvIDIpO1xuICAgICAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuZ29sZCA8IC0xMDApIGRhbWFnZSAqPSAyO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmhwIC09IGRhbWFnZTtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuZGFtYWdlVGFrZW5Ub2RheSArPSBkYW1hZ2U7XG4gICAgICAgICAgICBpZiAoIW1hbnVhbEFib3J0KSB0aGlzLnNldHRpbmdzLnJpdmFsRG1nICs9IDE7IFxuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLmF1ZGlvLnBsYXlTb3VuZChcImZhaWxcIik7XG4gICAgICAgICAgICB0aGlzLnRhdW50KFwiZmFpbFwiKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRExDIDE6IFRyYWNrIGRhbWFnZVxuICAgICAgICAgICAgdGhpcy5jaGVja0RhaWx5TWlzc2lvbnMoeyB0eXBlOiBcImRhbWFnZVwiIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5kYW1hZ2VUYWtlblRvZGF5ID4gNTApIHtcbiAgICAgICAgdGhpcy5tZWRpdGF0aW9uRW5naW5lLnRyaWdnZXJMb2NrZG93bigpO1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MubG9ja2Rvd25VbnRpbCA9IG1vbWVudCgpLmFkZCg2LCAnaG91cnMnKS50b0lTT1N0cmluZygpO1xuICAgICAgICAgICAgICAgIHRoaXMudGF1bnQoXCJsb2NrZG93blwiKTtcbiAgICAgICAgICAgICAgICB0aGlzLmF1ZGlvLnBsYXlTb3VuZChcImRlYXRoXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuaHAgPD0gMzApIHsgdGhpcy5hdWRpby5wbGF5U291bmQoXCJoZWFydGJlYXRcIik7IHRoaXMudGF1bnQoXCJsb3dfaHBcIik7IH1cbiAgICAgICAgfVxuICAgICAgICBjb25zdCBncmF2ZVBhdGggPSBcIkdyYXZleWFyZC9GYWlsdXJlc1wiO1xuICAgICAgICBpZiAoIXRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChncmF2ZVBhdGgpKSBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIoZ3JhdmVQYXRoKTtcbiAgICAgICAgYXdhaXQgdGhpcy5hcHAuZmlsZU1hbmFnZXIucmVuYW1lRmlsZShmaWxlLCBgJHtncmF2ZVBhdGh9L1tGQUlMRURdICR7ZmlsZS5uYW1lfWApO1xuICAgICAgICBhd2FpdCB0aGlzLnNhdmUoKTtcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuaHAgPD0gMCkgdGhpcy50cmlnZ2VyRGVhdGgoKTtcbiAgICB9XG5cbiAgICBhc3luYyBjcmVhdGVRdWVzdChuYW1lOiBzdHJpbmcsIGRpZmY6IG51bWJlciwgc2tpbGw6IHN0cmluZywgc2VjU2tpbGw6IHN0cmluZywgZGVhZGxpbmVJc286IHN0cmluZywgaGlnaFN0YWtlczogYm9vbGVhbiwgcHJpb3JpdHk6IHN0cmluZywgaXNCb3NzOiBib29sZWFuKSB7XG4gICAgICAgIGlmICh0aGlzLmlzTG9ja2VkRG93bigpKSB7IG5ldyBOb3RpY2UoXCLim5QgTE9DS0RPV04gQUNUSVZFXCIpOyByZXR1cm47IH1cbiAgICAgICAgaWYgKHRoaXMuaXNSZXN0aW5nKCkgJiYgaGlnaFN0YWtlcykgeyBuZXcgTm90aWNlKFwiQ2Fubm90IGRlcGxveSBIaWdoIFN0YWtlcyBvbiBSZXN0IERheS5cIik7IHJldHVybjsgfSBcblxuICAgICAgICBsZXQgeHBSZXdhcmQgPSAwOyBsZXQgZ29sZFJld2FyZCA9IDA7IGxldCBkaWZmTGFiZWwgPSBcIlwiO1xuICAgICAgICBcbiAgICAgICAgaWYgKGlzQm9zcykge1xuICAgICAgICAgICAgeHBSZXdhcmQgPSAxMDAwOyBnb2xkUmV3YXJkID0gMTAwMDsgZGlmZkxhYmVsID0gXCLimKDvuI8gQk9TU1wiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3dpdGNoKGRpZmYpIHtcbiAgICAgICAgICAgICAgICBjYXNlIDE6IHhwUmV3YXJkID0gTWF0aC5mbG9vcih0aGlzLnNldHRpbmdzLnhwUmVxICogMC4wNSk7IGdvbGRSZXdhcmQgPSAxMDsgZGlmZkxhYmVsID0gXCJUcml2aWFsXCI7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMjogeHBSZXdhcmQgPSBNYXRoLmZsb29yKHRoaXMuc2V0dGluZ3MueHBSZXEgKiAwLjEwKTsgZ29sZFJld2FyZCA9IDIwOyBkaWZmTGFiZWwgPSBcIkVhc3lcIjsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAzOiB4cFJld2FyZCA9IE1hdGguZmxvb3IodGhpcy5zZXR0aW5ncy54cFJlcSAqIDAuMjApOyBnb2xkUmV3YXJkID0gNDA7IGRpZmZMYWJlbCA9IFwiTWVkaXVtXCI7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgNDogeHBSZXdhcmQgPSBNYXRoLmZsb29yKHRoaXMuc2V0dGluZ3MueHBSZXEgKiAwLjQwKTsgZ29sZFJld2FyZCA9IDgwOyBkaWZmTGFiZWwgPSBcIkhhcmRcIjsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA1OiB4cFJld2FyZCA9IE1hdGguZmxvb3IodGhpcy5zZXR0aW5ncy54cFJlcSAqIDAuNjApOyBnb2xkUmV3YXJkID0gMTUwOyBkaWZmTGFiZWwgPSBcIlNVSUNJREVcIjsgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaGlnaFN0YWtlcyAmJiAhaXNCb3NzKSB7IGdvbGRSZXdhcmQgPSBNYXRoLmZsb29yKGdvbGRSZXdhcmQgKiAxLjUpOyB9XG5cbiAgICAgICAgbGV0IGRlYWRsaW5lU3RyID0gXCJOb25lXCI7IGxldCBkZWFkbGluZUZyb250bWF0dGVyID0gXCJcIjtcbiAgICAgICAgaWYgKGRlYWRsaW5lSXNvKSB7XG4gICAgICAgICAgICBkZWFkbGluZVN0ciA9IG1vbWVudChkZWFkbGluZUlzbykuZm9ybWF0KFwiWVlZWS1NTS1ERCBISDptbVwiKTtcbiAgICAgICAgICAgIGRlYWRsaW5lRnJvbnRtYXR0ZXIgPSBgZGVhZGxpbmU6ICR7ZGVhZGxpbmVJc299YDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHJvb3RQYXRoID0gXCJBY3RpdmVfUnVuXCI7XG4gICAgICAgIGNvbnN0IHF1ZXN0c1BhdGggPSBcIkFjdGl2ZV9SdW4vUXVlc3RzXCI7XG4gICAgICAgIGlmICghdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHJvb3RQYXRoKSkgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlRm9sZGVyKHJvb3RQYXRoKTtcbiAgICAgICAgaWYgKCF0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgocXVlc3RzUGF0aCkpIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZUZvbGRlcihxdWVzdHNQYXRoKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHNhZmVOYW1lID0gbmFtZS5yZXBsYWNlKC9bXmEtejAtOV0vZ2ksICdfJykudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgY29uc3QgZmlsZW5hbWUgPSBgJHtxdWVzdHNQYXRofS8ke3NhZmVOYW1lfS5tZGA7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjb250ZW50ID0gYC0tLVxudHlwZTogcXVlc3RcbnN0YXR1czogYWN0aXZlXG5kaWZmaWN1bHR5OiAke2RpZmZMYWJlbH1cbnByaW9yaXR5OiAke3ByaW9yaXR5fVxueHBfcmV3YXJkOiAke3hwUmV3YXJkfVxuZ29sZF9yZXdhcmQ6ICR7Z29sZFJld2FyZH1cbnNraWxsOiAke3NraWxsfVxuc2Vjb25kYXJ5X3NraWxsOiAke3NlY1NraWxsfVxuaGlnaF9zdGFrZXM6ICR7aGlnaFN0YWtlc31cbmlzX2Jvc3M6ICR7aXNCb3NzfVxuY3JlYXRlZDogJHtuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCl9XG4ke2RlYWRsaW5lRnJvbnRtYXR0ZXJ9XG4tLS1cbiMg4pqU77iPICR7bmFtZX1cbj4gWyFJTkZPXSBNaXNzaW9uXG4+ICoqUHJpOioqICR7cHJpb3JpdHl9IHwgKipEaWZmOioqICR7ZGlmZkxhYmVsfSB8ICoqRHVlOioqICR7ZGVhZGxpbmVTdHJ9XG4+ICoqUndkOioqICR7eHBSZXdhcmR9IFhQIHwgJHtnb2xkUmV3YXJkfSBHXG4+ICoqTmV1cmFsIExpbms6KiogJHtza2lsbH0gKyAke3NlY1NraWxsfVxuYDtcbiAgICAgICAgaWYgKHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChmaWxlbmFtZSkpIHsgbmV3IE5vdGljZShcIkV4aXN0cyFcIik7IHJldHVybjsgfVxuICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGUoZmlsZW5hbWUsIGNvbnRlbnQpO1xuICAgICAgICB0aGlzLmF1ZGlvLnBsYXlTb3VuZChcImNsaWNrXCIpOyBcbiAgICAgICAgXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gdGhpcy5wbHVnaW4ucmVmcmVzaFVJKCksIDIwMCk7XG4gICAgfVxuXG4gICAgYXN5bmMgZGVsZXRlUXVlc3QoZmlsZTogVEZpbGUpIHtcbiAgICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuZGVsZXRlKGZpbGUpO1xuICAgICAgICBuZXcgTm90aWNlKFwiRGVwbG95bWVudCBBYm9ydGVkIChEZWxldGVkKVwiKTtcbiAgICAgICAgdGhpcy5wbHVnaW4ucmVmcmVzaFVJKCk7XG4gICAgfVxuXG4gICAgYXN5bmMgY2hlY2tEZWFkbGluZXMoKSB7XG4gICAgICAgIGNvbnN0IGZvbGRlciA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChcIkFjdGl2ZV9SdW4vUXVlc3RzXCIpO1xuICAgICAgICBpZiAoIShmb2xkZXIgaW5zdGFuY2VvZiBURm9sZGVyKSkgcmV0dXJuO1xuICAgICAgICBmb3IgKGNvbnN0IGZpbGUgb2YgZm9sZGVyLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICBpZiAoZmlsZSBpbnN0YW5jZW9mIFRGaWxlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZm0gPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKT8uZnJvbnRtYXR0ZXI7XG4gICAgICAgICAgICAgICAgaWYgKGZtPy5kZWFkbGluZSAmJiBtb21lbnQoKS5pc0FmdGVyKG1vbWVudChmbS5kZWFkbGluZSkpKSBhd2FpdCB0aGlzLmZhaWxRdWVzdChmaWxlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLnBsdWdpbi5yZWZyZXNoVUkoKTtcbiAgICB9XG5cbiAgICBhc3luYyB0cmlnZ2VyRGVhdGgoKSB7XG4gICAgICAgIHRoaXMuYXVkaW8ucGxheVNvdW5kKFwiZGVhdGhcIik7XG4gICAgICAgIGNvbnN0IGVhcm5lZFNvdWxzID0gTWF0aC5mbG9vcih0aGlzLnNldHRpbmdzLmxldmVsICogMTAgKyB0aGlzLnNldHRpbmdzLmdvbGQgLyAxMCk7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MubGVnYWN5LnNvdWxzICs9IGVhcm5lZFNvdWxzO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5sZWdhY3kuZGVhdGhDb3VudCA9ICh0aGlzLnNldHRpbmdzLmxlZ2FjeS5kZWF0aENvdW50IHx8IDApICsgMTtcblxuICAgICAgICBjb25zdCBncmF2ZUZpbGUgPSBcIkdyYXZleWFyZC9DaHJvbmljbGVzLm1kXCI7XG4gICAgICAgIGlmICghdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKFwiR3JhdmV5YXJkXCIpKSBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIoXCJHcmF2ZXlhcmRcIik7XG4gICAgICAgIGNvbnN0IGRlYXRoTXNnID0gYFxcbiMjIFJ1biAjJHt0aGlzLnNldHRpbmdzLnJ1bkNvdW50fSAoJHtuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkuc3BsaXQoJ1QnKVswXX0pXFxuLSBMdmw6ICR7dGhpcy5zZXR0aW5ncy5sZXZlbH1cXG4tIFNvdWxzOiAke2Vhcm5lZFNvdWxzfVxcbi0gU2NhcnM6ICR7dGhpcy5zZXR0aW5ncy5sZWdhY3kuZGVhdGhDb3VudH1gO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgZiA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChncmF2ZUZpbGUpO1xuICAgICAgICBpZiAoZiBpbnN0YW5jZW9mIFRGaWxlKSBhd2FpdCB0aGlzLmFwcC52YXVsdC5hcHBlbmQoZiwgZGVhdGhNc2cpO1xuICAgICAgICBlbHNlIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZShncmF2ZUZpbGUsIFwiIyBDaHJvbmljbGVzXFxuXCIgKyBkZWF0aE1zZyk7XG5cbiAgICAgICAgbmV3IE5vdGljZShg8J+SgCBSVU4gRU5ERUQuYCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBhY3RpdmVQYXRoID0gXCJBY3RpdmVfUnVuXCI7IGNvbnN0IGdyYXZleWFyZFBhdGggPSBcIkdyYXZleWFyZFwiOyBjb25zdCBydW5OYW1lID0gYFJ1bl9GYWlsZWRfJHtEYXRlLm5vdygpfWA7XG4gICAgICAgIGlmICghdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGdyYXZleWFyZFBhdGgpKSBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIoZ3JhdmV5YXJkUGF0aCk7XG4gICAgICAgIGNvbnN0IGFjdGl2ZUZvbGRlciA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChhY3RpdmVQYXRoKTtcbiAgICAgICAgaWYgKGFjdGl2ZUZvbGRlciBpbnN0YW5jZW9mIFRGb2xkZXIpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZUZvbGRlcihgJHtncmF2ZXlhcmRQYXRofS8ke3J1bk5hbWV9YCk7XG4gICAgICAgICAgICBmb3IgKGxldCBjaGlsZCBvZiBhY3RpdmVGb2xkZXIuY2hpbGRyZW4pIHsgYXdhaXQgdGhpcy5hcHAuZmlsZU1hbmFnZXIucmVuYW1lRmlsZShjaGlsZCwgYCR7Z3JhdmV5YXJkUGF0aH0vJHtydW5OYW1lfS8ke2NoaWxkLm5hbWV9YCk7IH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgbGVnYWN5QmFja3VwID0gdGhpcy5zZXR0aW5ncy5sZWdhY3k7XG4gICAgICAgIGNvbnN0IHJ1bkNvdW50ID0gdGhpcy5zZXR0aW5ncy5ydW5Db3VudCArIDE7XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLmhwID0gMTAwOyB0aGlzLnNldHRpbmdzLm1heEhwID0gMTAwOyB0aGlzLnNldHRpbmdzLnhwID0gMDsgdGhpcy5zZXR0aW5ncy5nb2xkID0gMDtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy54cFJlcSA9IDEwMDsgdGhpcy5zZXR0aW5ncy5sZXZlbCA9IDE7IHRoaXMuc2V0dGluZ3Mucml2YWxEbWcgPSAxMDtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5za2lsbHMgPSBbXTsgdGhpcy5zZXR0aW5ncy5oaXN0b3J5ID0gW107IHRoaXMuc2V0dGluZ3MuZGFtYWdlVGFrZW5Ub2RheSA9IDA7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MubG9ja2Rvd25VbnRpbCA9IFwiXCI7IHRoaXMuc2V0dGluZ3Muc2hpZWxkZWRVbnRpbCA9IFwiXCI7IHRoaXMuc2V0dGluZ3MucmVzdERheVVudGlsID0gXCJcIjtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5kYWlseU1pc3Npb25zID0gW107IHRoaXMuc2V0dGluZ3MuZGFpbHlNaXNzaW9uRGF0ZSA9IFwiXCI7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MucXVlc3RzQ29tcGxldGVkVG9kYXkgPSAwOyB0aGlzLnNldHRpbmdzLnNraWxsVXNlc1RvZGF5ID0ge307XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLmxlZ2FjeSA9IGxlZ2FjeUJhY2t1cDtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGJhc2VTdGFydEdvbGQgPSB0aGlzLnNldHRpbmdzLmxlZ2FjeS5wZXJrcy5zdGFydEdvbGQgfHwgMDtcbiAgICAgICAgY29uc3Qgc2NhclBlbmFsdHkgPSBNYXRoLnBvdygwLjksIHRoaXMuc2V0dGluZ3MubGVnYWN5LmRlYXRoQ291bnQpO1xuICAgICAgICB0aGlzLnNldHRpbmdzLmdvbGQgPSBNYXRoLmZsb29yKGJhc2VTdGFydEdvbGQgKiBzY2FyUGVuYWx0eSk7XG5cbiAgICAgICAgdGhpcy5zZXR0aW5ncy5ydW5Db3VudCA9IHJ1bkNvdW50O1xuICAgICAgICBhd2FpdCB0aGlzLnNhdmUoKTtcbiAgICB9XG5cbiAgICBhc3luYyByb2xsQ2hhb3Moc2hvd01vZGFsOiBib29sZWFuID0gZmFsc2UpIHtcbiAgICAgICAgY29uc3Qgcm9sbCA9IE1hdGgucmFuZG9tKCk7XG4gICAgICAgIGlmIChyb2xsIDwgMC40KSB0aGlzLnNldHRpbmdzLmRhaWx5TW9kaWZpZXIgPSBERUZBVUxUX01PRElGSUVSO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGlkeCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChDSEFPU19UQUJMRS5sZW5ndGggLSAxKSkgKyAxO1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5kYWlseU1vZGlmaWVyID0gQ0hBT1NfVEFCTEVbaWR4XTtcbiAgICAgICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmRhaWx5TW9kaWZpZXIubmFtZSA9PT0gXCJSaXZhbCBTYWJvdGFnZVwiICYmIHRoaXMuc2V0dGluZ3MuZ29sZCA+IDEwKSB0aGlzLnNldHRpbmdzLmdvbGQgPSBNYXRoLmZsb29yKHRoaXMuc2V0dGluZ3MuZ29sZCAqIDAuOSk7XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgdGhpcy5zYXZlKCk7XG4gICAgICAgIGlmIChzaG93TW9kYWwpIG5ldyBDaGFvc01vZGFsKHRoaXMuYXBwLCB0aGlzLnNldHRpbmdzLmRhaWx5TW9kaWZpZXIpLm9wZW4oKTtcbiAgICB9XG5cbiAgICBhc3luYyBhdHRlbXB0UmVjb3ZlcnkoKSB7XG4gICAgICAgIGlmICghdGhpcy5pc0xvY2tlZERvd24oKSkgeyBuZXcgTm90aWNlKFwiTm90IGluIExvY2tkb3duLlwiKTsgcmV0dXJuOyB9XG4gICAgICAgIGNvbnN0IGRpZmYgPSBtb21lbnQodGhpcy5zZXR0aW5ncy5sb2NrZG93blVudGlsKS5kaWZmKG1vbWVudCgpLCAnbWludXRlcycpO1xuICAgICAgICBuZXcgTm90aWNlKGBSZWNvdmVyaW5nLi4uICR7TWF0aC5mbG9vcihkaWZmLzYwKX1oICR7ZGlmZiU2MH1tIHJlbWFpbmluZy5gKTtcbiAgICB9XG5cbiAgICBpc0xvY2tlZERvd24oKSB7XG4gICAgICAgIGlmICghdGhpcy5zZXR0aW5ncy5sb2NrZG93blVudGlsKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIHJldHVybiBtb21lbnQoKS5pc0JlZm9yZShtb21lbnQodGhpcy5zZXR0aW5ncy5sb2NrZG93blVudGlsKSk7XG4gICAgfVxuICAgIFxuICAgIGlzUmVzdGluZygpIHtcbiAgICAgICAgaWYgKCF0aGlzLnNldHRpbmdzLnJlc3REYXlVbnRpbCkgcmV0dXJuIGZhbHNlO1xuICAgICAgICByZXR1cm4gbW9tZW50KCkuaXNCZWZvcmUobW9tZW50KHRoaXMuc2V0dGluZ3MucmVzdERheVVudGlsKSk7XG4gICAgfVxuXG4gICAgaXNTaGllbGRlZCgpIHtcbiAgICAgICAgaWYgKCF0aGlzLnNldHRpbmdzLnNoaWVsZGVkVW50aWwpIHJldHVybiBmYWxzZTtcbiAgICAgICAgcmV0dXJuIG1vbWVudCgpLmlzQmVmb3JlKG1vbWVudCh0aGlzLnNldHRpbmdzLnNoaWVsZGVkVW50aWwpKTtcbiAgICB9XG5cbiAgICB0YXVudCh0cmlnZ2VyOiBcImZhaWxcInxcInNoaWVsZFwifFwibG93X2hwXCJ8XCJsZXZlbF91cFwifFwibG9ja2Rvd25cIikge1xuICAgICAgICBpZiAoTWF0aC5yYW5kb20oKSA8IDAuMikgcmV0dXJuOyBcbiAgICAgICAgY29uc3QgaW5zdWx0cyA9IHtcbiAgICAgICAgICAgIFwiZmFpbFwiOiBbXCJGb2N1cy5cIiwgXCJBZ2Fpbi5cIiwgXCJTdGF5IHNoYXJwLlwiXSxcbiAgICAgICAgICAgIFwic2hpZWxkXCI6IFtcIlNtYXJ0IG1vdmUuXCIsIFwiQm91Z2h0IHNvbWUgdGltZS5cIl0sXG4gICAgICAgICAgICBcImxvd19ocFwiOiBbXCJDcml0aWNhbCBjb25kaXRpb24uXCIsIFwiU3Vydml2ZS5cIl0sXG4gICAgICAgICAgICBcImxldmVsX3VwXCI6IFtcIlN0cm9uZ2VyLlwiLCBcIlNjYWxpbmcgdXAuXCJdLFxuICAgICAgICAgICAgXCJsb2NrZG93blwiOiBbXCJPdmVyaGVhdGVkLiBDb29saW5nIGRvd24uXCIsIFwiRm9yY2VkIHJlc3QuXCJdXG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IG1zZyA9IGluc3VsdHNbdHJpZ2dlcl1bTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogaW5zdWx0c1t0cmlnZ2VyXS5sZW5ndGgpXTtcbiAgICAgICAgbmV3IE5vdGljZShgU1lTVEVNOiBcIiR7bXNnfVwiYCwgNjAwMCk7XG4gICAgfVxuICAgIFxuICAgIHBhcnNlUXVpY2tJbnB1dCh0ZXh0OiBzdHJpbmcpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNMb2NrZWREb3duKCkpIHsgbmV3IE5vdGljZShcIuKblCBMT0NLRE9XTiBBQ1RJVkVcIik7IHJldHVybjsgfVxuICAgICAgICBsZXQgZGlmZiA9IDM7XG4gICAgICAgIGxldCBjbGVhblRleHQgPSB0ZXh0O1xuICAgICAgICBcbiAgICAgICAgaWYgKHRleHQubWF0Y2goL1xcLzEvKSkgeyBkaWZmID0gMTsgY2xlYW5UZXh0ID0gdGV4dC5yZXBsYWNlKC9cXC8xLywgXCJcIikudHJpbSgpOyB9XG4gICAgICAgIGVsc2UgaWYgKHRleHQubWF0Y2goL1xcLzIvKSkgeyBkaWZmID0gMjsgY2xlYW5UZXh0ID0gdGV4dC5yZXBsYWNlKC9cXC8yLywgXCJcIikudHJpbSgpOyB9XG4gICAgICAgIGVsc2UgaWYgKHRleHQubWF0Y2goL1xcLzMvKSkgeyBkaWZmID0gMzsgY2xlYW5UZXh0ID0gdGV4dC5yZXBsYWNlKC9cXC8zLywgXCJcIikudHJpbSgpOyB9XG4gICAgICAgIGVsc2UgaWYgKHRleHQubWF0Y2goL1xcLzQvKSkgeyBkaWZmID0gNDsgY2xlYW5UZXh0ID0gdGV4dC5yZXBsYWNlKC9cXC80LywgXCJcIikudHJpbSgpOyB9XG4gICAgICAgIGVsc2UgaWYgKHRleHQubWF0Y2goL1xcLzUvKSkgeyBkaWZmID0gNTsgY2xlYW5UZXh0ID0gdGV4dC5yZXBsYWNlKC9cXC81LywgXCJcIikudHJpbSgpOyB9XG5cbiAgICAgICAgY29uc3QgZGVhZGxpbmUgPSBtb21lbnQoKS5hZGQoMjQsICdob3VycycpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgIHRoaXMuY3JlYXRlUXVlc3QoY2xlYW5UZXh0LCBkaWZmLCBcIk5vbmVcIiwgXCJOb25lXCIsIGRlYWRsaW5lLCBmYWxzZSwgXCJOb3JtYWxcIiwgZmFsc2UpO1xuICAgIH1cblxuXG4gICAgLy8gPT09PT0gRExDIDI6IFJFU0VBUkNIIFFVRVNUIFNZU1RFTSA9PT09PVxuICAgIFxuICAgIGFzeW5jIGNyZWF0ZVJlc2VhcmNoUXVlc3QodGl0bGU6IHN0cmluZywgdHlwZTogXCJzdXJ2ZXlcIiB8IFwiZGVlcF9kaXZlXCIsIGxpbmtlZFNraWxsOiBzdHJpbmcsIGxpbmtlZENvbWJhdFF1ZXN0OiBzdHJpbmcpIHtcbiAgICBpZiAoIXRoaXMucmVzZWFyY2hFbmdpbmUuY2FuQ3JlYXRlUmVzZWFyY2hRdWVzdCgpKSB7IG5ldyBOb3RpY2UoXCJCTE9DS0VEXCIpOyByZXR1cm47IH1cbiAgICAgICAgaWYgKHRoaXMuaXNMb2NrZWREb3duKCkpIHsgXG4gICAgICAgICAgICBuZXcgTm90aWNlKFwiTE9DS0RPV04gQUNUSVZFXCIpOyBcbiAgICAgICAgICAgIHJldHVybjsgXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmICghdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFN0YXRzKSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLnJlc2VhcmNoU3RhdHMgPSB7IFxuICAgICAgICAgICAgICAgIHRvdGFsUmVzZWFyY2g6IDAsIFxuICAgICAgICAgICAgICAgIHRvdGFsQ29tYmF0OiAwLCBcbiAgICAgICAgICAgICAgICByZXNlYXJjaENvbXBsZXRlZDogMCwgXG4gICAgICAgICAgICAgICAgY29tYmF0Q29tcGxldGVkOiAwIFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgMjoxIGNvbWJhdDpyZXNlYXJjaCByYXRpbyBlbmZvcmNlclxuICAgICAgICBjb25zdCByYXRpbyA9IHRoaXMuc2V0dGluZ3MucmVzZWFyY2hTdGF0cy50b3RhbENvbWJhdCAvIE1hdGgubWF4KDEsIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hTdGF0cy50b3RhbFJlc2VhcmNoKTtcbiAgICAgICAgaWYgKHJhdGlvIDwgMikge1xuICAgICAgICAgICAgbmV3IE5vdGljZShcIlJFU0VBUkNIIEJMT0NLRUQ6IENvbXBsZXRlIDIgY29tYmF0IHF1ZXN0cyBwZXIgcmVzZWFyY2ggcXVlc3RcIik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHdvcmRMaW1pdCA9IHR5cGUgPT09IFwic3VydmV5XCIgPyAyMDAgOiA0MDA7XG4gICAgICAgIGNvbnN0IHF1ZXN0SWQgPSAodGhpcy5zZXR0aW5ncy5sYXN0UmVzZWFyY2hRdWVzdElkIHx8IDApICsgMTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHJlc2VhcmNoUXVlc3Q6IGFueSA9IHtcbiAgICAgICAgICAgIGlkOiBgcmVzZWFyY2hfJHtxdWVzdElkfWAsXG4gICAgICAgICAgICB0aXRsZTogdGl0bGUsXG4gICAgICAgICAgICB0eXBlOiB0eXBlLFxuICAgICAgICAgICAgbGlua2VkU2tpbGw6IGxpbmtlZFNraWxsLFxuICAgICAgICAgICAgd29yZExpbWl0OiB3b3JkTGltaXQsXG4gICAgICAgICAgICB3b3JkQ291bnQ6IDAsXG4gICAgICAgICAgICBsaW5rZWRDb21iYXRRdWVzdDogbGlua2VkQ29tYmF0UXVlc3QsXG4gICAgICAgICAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgIGNvbXBsZXRlZDogZmFsc2VcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hRdWVzdHMucHVzaChyZXNlYXJjaFF1ZXN0KTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5sYXN0UmVzZWFyY2hRdWVzdElkID0gcXVlc3RJZDtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFN0YXRzLnRvdGFsUmVzZWFyY2grKztcbiAgICAgICAgXG4gICAgICAgIG5ldyBOb3RpY2UoYFJlc2VhcmNoIFF1ZXN0IENyZWF0ZWQ6ICR7dHlwZSA9PT0gXCJzdXJ2ZXlcIiA/IFwiU3VydmV5XCIgOiBcIkRlZXAgRGl2ZVwifSAoJHt3b3JkTGltaXR9IHdvcmRzKWApO1xuICAgICAgICBhd2FpdCB0aGlzLnNhdmUoKTtcbiAgICB9XG5cbiAgICBhc3luYyBjb21wbGV0ZVJlc2VhcmNoUXVlc3QocXVlc3RJZDogc3RyaW5nLCBmaW5hbFdvcmRDb3VudDogbnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IHJlc2VhcmNoUXVlc3QgPSB0aGlzLnNldHRpbmdzLnJlc2VhcmNoUXVlc3RzLmZpbmQocSA9PiBxLmlkID09PSBxdWVzdElkKTtcbiAgICAgICAgaWYgKCFyZXNlYXJjaFF1ZXN0KSB7XG4gICAgICAgICAgICBuZXcgTm90aWNlKFwiUmVzZWFyY2ggcXVlc3Qgbm90IGZvdW5kXCIpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayB3b3JkIGNvdW50XG4gICAgICAgIGlmIChmaW5hbFdvcmRDb3VudCA8IHJlc2VhcmNoUXVlc3Qud29yZExpbWl0ICogMC44KSB7XG4gICAgICAgICAgICBuZXcgTm90aWNlKFwiUXVlc3QgdG9vIHNob3J0ISBNaW5pbXVtIDgwJSBvZiB3b3JkIGxpbWl0IHJlcXVpcmVkXCIpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDYWxjdWxhdGUgcGVuYWx0eSBpZiBvdmVyIGxpbWl0XG4gICAgICAgIGxldCB4cFJld2FyZCA9IHJlc2VhcmNoUXVlc3QudHlwZSA9PT0gXCJzdXJ2ZXlcIiA/IDUgOiAyMDtcbiAgICAgICAgbGV0IGdvbGRQZW5hbHR5ID0gMDtcbiAgICAgICAgICAgICAgICBpZiAoZmluYWxXb3JkQ291bnQgPiByZXNlYXJjaFF1ZXN0LndvcmRMaW1pdCkge1xuICAgICAgICAgICAgY29uc3Qgb3ZlcmFnZVBlcmNlbnQgPSAoKGZpbmFsV29yZENvdW50IC0gcmVzZWFyY2hRdWVzdC53b3JkTGltaXQpIC8gcmVzZWFyY2hRdWVzdC53b3JkTGltaXQpICogMTAwO1xuICAgICAgICAgICAgaWYgKG92ZXJhZ2VQZXJjZW50ID4gMjUpIHtcbiAgICAgICAgICAgICAgICBnb2xkUGVuYWx0eSA9IE1hdGguZmxvb3IoMjAgKiAob3ZlcmFnZVBlcmNlbnQgLyAxMDApKTtcbiAgICAgICAgICAgICAgICBuZXcgTm90aWNlKGBXb3JkIGNvdW50IHRheDogLSR7Z29sZFBlbmFsdHl9Z2ApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBd2FyZCBYUCB0byBsaW5rZWQgc2tpbGxcbiAgICAgICAgY29uc3Qgc2tpbGwgPSB0aGlzLnNldHRpbmdzLnNraWxscy5maW5kKHMgPT4gcy5uYW1lID09PSByZXNlYXJjaFF1ZXN0LmxpbmtlZFNraWxsKTtcbiAgICAgICAgaWYgKHNraWxsKSB7XG4gICAgICAgICAgICBza2lsbC54cCArPSB4cFJld2FyZDtcbiAgICAgICAgICAgIGlmIChza2lsbC54cCA+PSBza2lsbC54cFJlcSkge1xuICAgICAgICAgICAgICAgIHNraWxsLmxldmVsKys7XG4gICAgICAgICAgICAgICAgc2tpbGwueHAgPSAwO1xuICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoYFNraWxsIGxldmVsZWQ6ICR7c2tpbGwubmFtZX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5nb2xkIC09IGdvbGRQZW5hbHR5O1xuICAgICAgICByZXNlYXJjaFF1ZXN0LmNvbXBsZXRlZCA9IHRydWU7XG4gICAgICAgIHJlc2VhcmNoUXVlc3QuY29tcGxldGVkQXQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hTdGF0cy5yZXNlYXJjaENvbXBsZXRlZCsrO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5hdWRpby5wbGF5U291bmQoXCJzdWNjZXNzXCIpO1xuICAgICAgICBhd2FpdCB0aGlzLnNhdmUoKTtcbiAgICB9XG5cbiAgICBkZWxldGVSZXNlYXJjaFF1ZXN0KHF1ZXN0SWQ6IHN0cmluZykge1xuICAgICAgICBjb25zdCBpbmRleCA9IHRoaXMuc2V0dGluZ3MucmVzZWFyY2hRdWVzdHMuZmluZEluZGV4KHEgPT4gcS5pZCA9PT0gcXVlc3RJZCk7XG4gICAgICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hRdWVzdHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hTdGF0cy50b3RhbFJlc2VhcmNoID0gTWF0aC5tYXgoMCwgdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFN0YXRzLnRvdGFsUmVzZWFyY2ggLSAxKTtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoXCJSZXNlYXJjaCBxdWVzdCBkZWxldGVkXCIpO1xuICAgICAgICAgICAgdGhpcy5zYXZlKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB1cGRhdGVSZXNlYXJjaFdvcmRDb3VudChxdWVzdElkOiBzdHJpbmcsIG5ld1dvcmRDb3VudDogbnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IHJlc2VhcmNoUXVlc3QgPSB0aGlzLnNldHRpbmdzLnJlc2VhcmNoUXVlc3RzLmZpbmQocSA9PiBxLmlkID09PSBxdWVzdElkKTtcbiAgICAgICAgaWYgKHJlc2VhcmNoUXVlc3QpIHtcbiAgICAgICAgICAgIHJlc2VhcmNoUXVlc3Qud29yZENvdW50ID0gbmV3V29yZENvdW50O1xuICAgICAgICAgICAgdGhpcy5zYXZlKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBnZXRSZXNlYXJjaFJhdGlvKCk6IHsgY29tYmF0OiBudW1iZXI7IHJlc2VhcmNoOiBudW1iZXI7IHJhdGlvOiBzdHJpbmcgfSB7XG4gICAgICAgIGNvbnN0IHN0YXRzID0gdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFN0YXRzO1xuICAgICAgICBjb25zdCByYXRpbyA9IHN0YXRzLnRvdGFsQ29tYmF0IC8gTWF0aC5tYXgoMSwgc3RhdHMudG90YWxSZXNlYXJjaCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBjb21iYXQ6IHN0YXRzLnRvdGFsQ29tYmF0LFxuICAgICAgICAgICAgcmVzZWFyY2g6IHN0YXRzLnRvdGFsUmVzZWFyY2gsXG4gICAgICAgICAgICByYXRpbzogcmF0aW8udG9GaXhlZCgyKVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGNhbkNyZWF0ZVJlc2VhcmNoUXVlc3QoKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IHN0YXRzID0gdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFN0YXRzO1xuICAgICAgICBjb25zdCByYXRpbyA9IHN0YXRzLnRvdGFsQ29tYmF0IC8gTWF0aC5tYXgoMSwgc3RhdHMudG90YWxSZXNlYXJjaCk7XG4gICAgICAgIHJldHVybiByYXRpbyA+PSAyO1xuICAgIH1cbiAgICBcblxuICAgIC8vID09PT09IERMQyAzOiBNRURJVEFUSU9OICYgUkVDT1ZFUlkgPT09PT1cbiAgICBcbiAgICBhc3luYyBzdGFydE1lZGl0YXRpb24oKSB7XG4gICAgICAgIGlmICghdGhpcy5pc0xvY2tlZERvd24oKSkge1xuICAgICAgICAgICAgbmV3IE5vdGljZShcIk5vdCBpbiBsb2NrZG93bi4gTm8gbmVlZCB0byBtZWRpdGF0ZS5cIik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmlzTWVkaXRhdGluZykge1xuICAgICAgICAgICAgbmV3IE5vdGljZShcIkFscmVhZHkgbWVkaXRhdGluZy4gV2FpdCAzMCBzZWNvbmRzLlwiKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5pc01lZGl0YXRpbmcgPSB0cnVlO1xuICAgICAgICB0aGlzLnNldHRpbmdzLm1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd24rKztcbiAgICAgICAgXG4gICAgICAgIHRoaXMucGxheU1lZGl0YXRpb25Tb3VuZCgpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcmVtYWluaW5nID0gMTAgLSB0aGlzLnNldHRpbmdzLm1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd247XG4gICAgICAgIG5ldyBOb3RpY2UoYE1lZGl0YXRpb24gKCR7dGhpcy5zZXR0aW5ncy5tZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3dufS8xMCkgLSAke3JlbWFpbmluZ30gY3ljbGVzIGxlZnRgKTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLm1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd24gPj0gMTApIHtcbiAgICAgICAgICAgIGNvbnN0IHJlZHVjZWRUaW1lID0gbW9tZW50KHRoaXMuc2V0dGluZ3MubG9ja2Rvd25VbnRpbCkuc3VidHJhY3QoNSwgJ2hvdXJzJyk7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmxvY2tkb3duVW50aWwgPSByZWR1Y2VkVGltZS50b0lTT1N0cmluZygpO1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5tZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3duID0gMDtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoXCJNZWRpdGF0aW9uIGNvbXBsZXRlLiBMb2NrZG93biByZWR1Y2VkIGJ5IDUgaG91cnMuXCIpO1xuICAgICAgICAgICAgdGhpcy5hdWRpby5wbGF5U291bmQoXCJzdWNjZXNzXCIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyAzMCBzZWNvbmQgY29vbGRvd25cbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmlzTWVkaXRhdGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5zYXZlKCk7XG4gICAgICAgIH0sIDMwMDAwKTtcbiAgICAgICAgXG4gICAgICAgIGF3YWl0IHRoaXMuc2F2ZSgpO1xuICAgIH1cbiAgICBcbiAgICBwbGF5TWVkaXRhdGlvblNvdW5kKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgYXVkaW9Db250ZXh0ID0gbmV3ICh3aW5kb3cuQXVkaW9Db250ZXh0IHx8ICh3aW5kb3cgYXMgYW55KS53ZWJraXRBdWRpb0NvbnRleHQpKCk7XG4gICAgICAgICAgICBjb25zdCBvc2NpbGxhdG9yID0gYXVkaW9Db250ZXh0LmNyZWF0ZU9zY2lsbGF0b3IoKTtcbiAgICAgICAgICAgIGNvbnN0IGdhaW5Ob2RlID0gYXVkaW9Db250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgb3NjaWxsYXRvci5mcmVxdWVuY3kudmFsdWUgPSA0MzI7XG4gICAgICAgICAgICBvc2NpbGxhdG9yLnR5cGUgPSBcInNpbmVcIjtcbiAgICAgICAgICAgIGdhaW5Ob2RlLmdhaW4uc2V0VmFsdWVBdFRpbWUoMC4zLCBhdWRpb0NvbnRleHQuY3VycmVudFRpbWUpO1xuICAgICAgICAgICAgZ2Fpbk5vZGUuZ2Fpbi5leHBvbmVudGlhbFJhbXBUb1ZhbHVlQXRUaW1lKDAuMDEsIGF1ZGlvQ29udGV4dC5jdXJyZW50VGltZSArIDEpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBvc2NpbGxhdG9yLmNvbm5lY3QoZ2Fpbk5vZGUpO1xuICAgICAgICAgICAgZ2Fpbk5vZGUuY29ubmVjdChhdWRpb0NvbnRleHQuZGVzdGluYXRpb24pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBvc2NpbGxhdG9yLnN0YXJ0KGF1ZGlvQ29udGV4dC5jdXJyZW50VGltZSk7XG4gICAgICAgICAgICBvc2NpbGxhdG9yLnN0b3AoYXVkaW9Db250ZXh0LmN1cnJlbnRUaW1lICsgMSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQXVkaW8gbm90IGF2YWlsYWJsZVwiKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBjYW5EZWxldGVRdWVzdCgpOiBib29sZWFuIHtcbiAgICAgICAgY29uc3QgdG9kYXkgPSBtb21lbnQoKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MubGFzdERlbGV0aW9uUmVzZXQgIT09IHRvZGF5KSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmxhc3REZWxldGlvblJlc2V0ID0gdG9kYXk7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLnF1ZXN0RGVsZXRpb25zVG9kYXkgPSAwO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdGhpcy5zZXR0aW5ncy5xdWVzdERlbGV0aW9uc1RvZGF5IDwgMztcbiAgICB9XG4gICAgXG4gICAgYXN5bmMgZGVsZXRlUXVlc3RXaXRoQ29zdChmaWxlOiBURmlsZSkge1xuICAgICAgICBjb25zdCB0b2RheSA9IG1vbWVudCgpLmZvcm1hdChcIllZWVktTU0tRERcIik7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5sYXN0RGVsZXRpb25SZXNldCAhPT0gdG9kYXkpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MubGFzdERlbGV0aW9uUmVzZXQgPSB0b2RheTtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MucXVlc3REZWxldGlvbnNUb2RheSA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGxldCBjb3N0ID0gMDtcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MucXVlc3REZWxldGlvbnNUb2RheSA+PSAzKSB7XG4gICAgICAgICAgICBjb3N0ID0gMTA7XG4gICAgICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5nb2xkIDwgY29zdCkge1xuICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoXCJJbnN1ZmZpY2llbnQgZ29sZCB0byBkZWxldGUgdGhpcyBxdWVzdC5cIik7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLnF1ZXN0RGVsZXRpb25zVG9kYXkrKztcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5nb2xkIC09IGNvc3Q7XG4gICAgICAgIFxuICAgICAgICBpZiAoY29zdCA+IDApIHtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoYFF1ZXN0IGRlbGV0ZWQuIENvc3Q6IC0ke2Nvc3R9Z2ApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbmV3IE5vdGljZShgUXVlc3QgZGVsZXRlZC4gKCR7MyAtIHRoaXMuc2V0dGluZ3MucXVlc3REZWxldGlvbnNUb2RheX0gZnJlZSBkZWxldGlvbnMgcmVtYWluaW5nKWApO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5kZWxldGUoZmlsZSk7XG4gICAgICAgIGF3YWl0IHRoaXMuc2F2ZSgpO1xuICAgIH1cbiAgICBcbiAgICBnZXRNZWRpdGF0aW9uU3RhdHVzKCk6IHsgY3ljbGVzRG9uZTogbnVtYmVyOyBjeWNsZXNSZW1haW5pbmc6IG51bWJlcjsgdGltZVJlZHVjZWQ6IG51bWJlciB9IHtcbiAgICAgICAgY29uc3QgY3ljbGVzRG9uZSA9IHRoaXMuc2V0dGluZ3MubWVkaXRhdGlvbkNsaWNrc1RoaXNMb2NrZG93bjtcbiAgICAgICAgY29uc3QgY3ljbGVzUmVtYWluaW5nID0gTWF0aC5tYXgoMCwgMTAgLSBjeWNsZXNEb25lKTtcbiAgICAgICAgY29uc3QgdGltZVJlZHVjZWQgPSAoMTAgLSBjeWNsZXNSZW1haW5pbmcpICogMzA7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgY3ljbGVzRG9uZTogY3ljbGVzRG9uZSxcbiAgICAgICAgICAgIGN5Y2xlc1JlbWFpbmluZzogY3ljbGVzUmVtYWluaW5nLFxuICAgICAgICAgICAgdGltZVJlZHVjZWQ6IHRpbWVSZWR1Y2VkXG4gICAgICAgIH07XG4gICAgfVxuICAgIFxuICAgIGdldERlbGV0aW9uUXVvdGEoKTogeyBmcmVlOiBudW1iZXI7IHBhaWQ6IG51bWJlcjsgcmVtYWluaW5nOiBudW1iZXIgfSB7XG4gICAgICAgIGNvbnN0IHRvZGF5ID0gbW9tZW50KCkuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmxhc3REZWxldGlvblJlc2V0ICE9PSB0b2RheSkge1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5sYXN0RGVsZXRpb25SZXNldCA9IHRvZGF5O1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5xdWVzdERlbGV0aW9uc1RvZGF5ID0gMDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgcmVtYWluaW5nID0gTWF0aC5tYXgoMCwgMyAtIHRoaXMuc2V0dGluZ3MucXVlc3REZWxldGlvbnNUb2RheSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZnJlZTogTWF0aC5taW4oMywgMyAtIHRoaXMuc2V0dGluZ3MucXVlc3REZWxldGlvbnNUb2RheSksXG4gICAgICAgICAgICBwYWlkOiBNYXRoLm1heCgwLCB0aGlzLnNldHRpbmdzLnF1ZXN0RGVsZXRpb25zVG9kYXkgLSAzKSxcbiAgICAgICAgICAgIHJlbWFpbmluZzogcmVtYWluaW5nXG4gICAgICAgIH07XG4gICAgfVxuXG5cblxuICAgIC8vID09PT09IERMQyA0OiBRVUVTVCBDSEFJTlMgPT09PT1cbiAgICBcbiAgICBhc3luYyBjcmVhdGVRdWVzdENoYWluKG5hbWU6IHN0cmluZywgcXVlc3ROYW1lczogc3RyaW5nW10pOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICAgICAgaWYgKHF1ZXN0TmFtZXMubGVuZ3RoIDwgMikge1xuICAgICAgICAgICAgbmV3IE5vdGljZShcIkNoYWluIG11c3QgaGF2ZSBhdCBsZWFzdCAyIHF1ZXN0c1wiKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgY2hhaW5JZCA9IGBjaGFpbl8ke0RhdGUubm93KCl9YDtcbiAgICAgICAgY29uc3QgY2hhaW46IGFueSA9IHtcbiAgICAgICAgICAgIGlkOiBjaGFpbklkLFxuICAgICAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgICAgIHF1ZXN0czogcXVlc3ROYW1lcyxcbiAgICAgICAgICAgIGN1cnJlbnRJbmRleDogMCxcbiAgICAgICAgICAgIGNvbXBsZXRlZDogZmFsc2UsXG4gICAgICAgICAgICBzdGFydGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgIGlzQm9zczogcXVlc3ROYW1lc1txdWVzdE5hbWVzLmxlbmd0aCAtIDFdLmluY2x1ZGVzKFwiYm9zc1wiKVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5hY3RpdmVDaGFpbnMucHVzaChjaGFpbik7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuY3VycmVudENoYWluSWQgPSBjaGFpbklkO1xuICAgICAgICBcbiAgICAgICAgbmV3IE5vdGljZShgQ2hhaW4gY3JlYXRlZDogJHtuYW1lfSAoJHtxdWVzdE5hbWVzLmxlbmd0aH0gcXVlc3RzKWApO1xuICAgICAgICBhd2FpdCB0aGlzLnNhdmUoKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIFxuICAgIGdldE5leHRRdWVzdEluQ2hhaW4oKTogc3RyaW5nIHwgbnVsbCB7XG4gICAgICAgIGlmICghdGhpcy5zZXR0aW5ncy5jdXJyZW50Q2hhaW5JZCkgcmV0dXJuIG51bGw7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjaGFpbiA9IHRoaXMuc2V0dGluZ3MuYWN0aXZlQ2hhaW5zLmZpbmQoYyA9PiBjLmlkID09PSB0aGlzLnNldHRpbmdzLmN1cnJlbnRDaGFpbklkKTtcbiAgICAgICAgaWYgKCFjaGFpbiB8fCBjaGFpbi5jb21wbGV0ZWQpIHJldHVybiBudWxsO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGNoYWluLnF1ZXN0c1tjaGFpbi5jdXJyZW50SW5kZXhdIHx8IG51bGw7XG4gICAgfVxuICAgIFxuICAgIGlzUXVlc3RJbkNoYWluKHF1ZXN0TmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IGNoYWluID0gdGhpcy5zZXR0aW5ncy5hY3RpdmVDaGFpbnMuZmluZChjID0+ICFjLmNvbXBsZXRlZCk7XG4gICAgICAgIGlmICghY2hhaW4pIHJldHVybiBmYWxzZTtcbiAgICAgICAgcmV0dXJuIGNoYWluLnF1ZXN0cy5pbmNsdWRlcyhxdWVzdE5hbWUpO1xuICAgIH1cbiAgICBcbiAgICBjYW5TdGFydFF1ZXN0KHF1ZXN0TmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IGNoYWluID0gdGhpcy5zZXR0aW5ncy5hY3RpdmVDaGFpbnMuZmluZChjID0+ICFjLmNvbXBsZXRlZCk7XG4gICAgICAgIGlmICghY2hhaW4pIHJldHVybiB0cnVlO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgbmV4dFF1ZXN0ID0gdGhpcy5nZXROZXh0UXVlc3RJbkNoYWluKCk7XG4gICAgICAgIHJldHVybiBuZXh0UXVlc3QgPT09IHF1ZXN0TmFtZTtcbiAgICB9XG4gICAgXG4gICAgYXN5bmMgY29tcGxldGVDaGFpblF1ZXN0KHF1ZXN0TmFtZTogc3RyaW5nKSB7XG4gICAgICAgIGNvbnN0IGNoYWluID0gdGhpcy5zZXR0aW5ncy5hY3RpdmVDaGFpbnMuZmluZChjID0+ICFjLmNvbXBsZXRlZCAmJiBjLnF1ZXN0cy5pbmNsdWRlcyhxdWVzdE5hbWUpKTtcbiAgICAgICAgaWYgKCFjaGFpbikgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgY3VycmVudFF1ZXN0ID0gY2hhaW4ucXVlc3RzW2NoYWluLmN1cnJlbnRJbmRleF07XG4gICAgICAgIGlmIChjdXJyZW50UXVlc3QgIT09IHF1ZXN0TmFtZSkge1xuICAgICAgICAgICAgbmV3IE5vdGljZShcIlF1ZXN0IGlzIG5vdCBuZXh0IGluIGNoYWluXCIpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjaGFpbi5jdXJyZW50SW5kZXgrKztcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5jaGFpblF1ZXN0c0NvbXBsZXRlZCsrO1xuICAgICAgICBcbiAgICAgICAgaWYgKGNoYWluLmN1cnJlbnRJbmRleCA+PSBjaGFpbi5xdWVzdHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAvLyBDaGFpbiBjb21wbGV0ZVxuICAgICAgICAgICAgY2hhaW4uY29tcGxldGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIGNoYWluLmNvbXBsZXRlZEF0ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLnhwICs9IDEwMDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgcmVjb3JkOiBhbnkgPSB7XG4gICAgICAgICAgICAgICAgY2hhaW5JZDogY2hhaW4uaWQsXG4gICAgICAgICAgICAgICAgY2hhaW5OYW1lOiBjaGFpbi5uYW1lLFxuICAgICAgICAgICAgICAgIHRvdGFsUXVlc3RzOiBjaGFpbi5xdWVzdHMubGVuZ3RoLFxuICAgICAgICAgICAgICAgIGNvbXBsZXRlZEF0OiBjaGFpbi5jb21wbGV0ZWRBdCxcbiAgICAgICAgICAgICAgICB4cEVhcm5lZDogMTAwXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmNoYWluSGlzdG9yeS5wdXNoKHJlY29yZCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoYENoYWluIGNvbXBsZXRlOiAke2NoYWluLm5hbWV9ISArMTAwIFhQIEJvbnVzYCk7XG4gICAgICAgICAgICB0aGlzLmF1ZGlvLnBsYXlTb3VuZChcInN1Y2Nlc3NcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCByZW1haW5pbmcgPSBjaGFpbi5xdWVzdHMubGVuZ3RoIC0gY2hhaW4uY3VycmVudEluZGV4O1xuICAgICAgICAgICAgbmV3IE5vdGljZShgQ2hhaW4gcHJvZ3Jlc3M6ICR7Y2hhaW4uY3VycmVudEluZGV4ICsgMX0vJHtjaGFpbi5xdWVzdHMubGVuZ3RofSAoJHtyZW1haW5pbmd9IHJlbWFpbmluZylgKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgYXdhaXQgdGhpcy5zYXZlKCk7XG4gICAgfVxuICAgIFxuICAgIGFzeW5jIGJyZWFrQ2hhaW4oKSB7XG4gICAgICAgIGNvbnN0IGNoYWluID0gdGhpcy5zZXR0aW5ncy5hY3RpdmVDaGFpbnMuZmluZChjID0+IGMuaWQgPT09IHRoaXMuc2V0dGluZ3MuY3VycmVudENoYWluSWQpO1xuICAgICAgICBpZiAoIWNoYWluKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjb21wbGV0ZWQgPSBjaGFpbi5jdXJyZW50SW5kZXg7XG4gICAgICAgIGNvbnN0IHhwRWFybmVkID0gY29tcGxldGVkICogMTA7XG4gICAgICAgIFxuICAgICAgICAvLyBTYXZlIHRvIGhpc3RvcnkgZXZlbiB0aG91Z2ggYnJva2VuXG4gICAgICAgIGNvbnN0IHJlY29yZDogYW55ID0ge1xuICAgICAgICAgICAgY2hhaW5JZDogY2hhaW4uaWQsXG4gICAgICAgICAgICBjaGFpbk5hbWU6IGNoYWluLm5hbWUsXG4gICAgICAgICAgICB0b3RhbFF1ZXN0czogY2hhaW4ucXVlc3RzLmxlbmd0aCxcbiAgICAgICAgICAgIGNvbXBsZXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICB4cEVhcm5lZDogeHBFYXJuZWRcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0dGluZ3MuY2hhaW5IaXN0b3J5LnB1c2gocmVjb3JkKTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5hY3RpdmVDaGFpbnMgPSB0aGlzLnNldHRpbmdzLmFjdGl2ZUNoYWlucy5maWx0ZXIoYyA9PiBjLmlkICE9PSBjaGFpbi5pZCk7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuY3VycmVudENoYWluSWQgPSBcIlwiO1xuICAgICAgICBcbiAgICAgICAgbmV3IE5vdGljZShgQ2hhaW4gYnJva2VuOiAke2NoYWluLm5hbWV9LiBLZXB0ICR7Y29tcGxldGVkfSBxdWVzdCBjb21wbGV0aW9ucyAoJHt4cEVhcm5lZH0gWFApLmApO1xuICAgICAgICBhd2FpdCB0aGlzLnNhdmUoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0QWN0aXZlQ2hhaW4oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldHRpbmdzLmFjdGl2ZUNoYWlucy5maW5kKGMgPT4gIWMuY29tcGxldGVkICYmIGMuaWQgPT09IHRoaXMuc2V0dGluZ3MuY3VycmVudENoYWluSWQpIHx8IG51bGw7XG4gICAgfVxuICAgIFxuICAgIGdldENoYWluUHJvZ3Jlc3MoKTogeyBjb21wbGV0ZWQ6IG51bWJlcjsgdG90YWw6IG51bWJlcjsgcGVyY2VudDogbnVtYmVyIH0ge1xuICAgICAgICBjb25zdCBjaGFpbiA9IHRoaXMuZ2V0QWN0aXZlQ2hhaW4oKTtcbiAgICAgICAgaWYgKCFjaGFpbikgcmV0dXJuIHsgY29tcGxldGVkOiAwLCB0b3RhbDogMCwgcGVyY2VudDogMCB9O1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGNvbXBsZXRlZDogY2hhaW4uY3VycmVudEluZGV4LFxuICAgICAgICAgICAgdG90YWw6IGNoYWluLnF1ZXN0cy5sZW5ndGgsXG4gICAgICAgICAgICBwZXJjZW50OiBNYXRoLmZsb29yKChjaGFpbi5jdXJyZW50SW5kZXggLyBjaGFpbi5xdWVzdHMubGVuZ3RoKSAqIDEwMClcbiAgICAgICAgfTtcbiAgICB9XG5cblxuXG4gICAgLy8gPT09PT0gRExDIDU6IENPTlRFWFQgRklMVEVSUyA9PT09PVxuICAgIFxuICAgIHNldFF1ZXN0RmlsdGVyKHF1ZXN0RmlsZTogVEZpbGUsIGVuZXJneTogXCJoaWdoXCIgfCBcIm1lZGl1bVwiIHwgXCJsb3dcIiwgY29udGV4dDogXCJob21lXCIgfCBcIm9mZmljZVwiIHwgXCJhbnl3aGVyZVwiLCB0YWdzOiBzdHJpbmdbXSkge1xuICAgICAgICBjb25zdCBxdWVzdE5hbWUgPSBxdWVzdEZpbGUuYmFzZW5hbWU7XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLnF1ZXN0RmlsdGVyc1txdWVzdE5hbWVdID0ge1xuICAgICAgICAgICAgZW5lcmd5TGV2ZWw6IGVuZXJneSxcbiAgICAgICAgICAgIGNvbnRleHQ6IGNvbnRleHQsXG4gICAgICAgICAgICB0YWdzOiB0YWdzXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBuZXcgTm90aWNlKGBRdWVzdCB0YWdnZWQ6ICR7ZW5lcmd5fSBlbmVyZ3ksICR7Y29udGV4dH0gY29udGV4dGApO1xuICAgICAgICB0aGlzLnNhdmUoKTtcbiAgICB9XG4gICAgXG4gICAgc2V0RmlsdGVyU3RhdGUoZW5lcmd5OiBcImhpZ2hcIiB8IFwibWVkaXVtXCIgfCBcImxvd1wiIHwgXCJhbnlcIiwgY29udGV4dDogXCJob21lXCIgfCBcIm9mZmljZVwiIHwgXCJhbnl3aGVyZVwiIHwgXCJhbnlcIiwgdGFnczogc3RyaW5nW10pIHtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5maWx0ZXJTdGF0ZSA9IHtcbiAgICAgICAgICAgIGFjdGl2ZUVuZXJneTogZW5lcmd5LFxuICAgICAgICAgICAgYWN0aXZlQ29udGV4dDogY29udGV4dCxcbiAgICAgICAgICAgIGFjdGl2ZVRhZ3M6IHRhZ3NcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIG5ldyBOb3RpY2UoYEZpbHRlcnMgc2V0OiAke2VuZXJneX0gZW5lcmd5LCAke2NvbnRleHR9IGNvbnRleHRgKTtcbiAgICAgICAgdGhpcy5zYXZlKCk7XG4gICAgfVxuICAgIFxuICAgIGdldEZpbHRlcmVkUXVlc3RzKHF1ZXN0czogYW55W10pOiBhbnlbXSB7XG4gICAgICAgIGNvbnN0IGZpbHRlcnMgPSB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHF1ZXN0cy5maWx0ZXIocXVlc3QgPT4ge1xuICAgICAgICAgICAgY29uc3QgcXVlc3ROYW1lID0gcXVlc3QuYmFzZW5hbWUgfHwgcXVlc3QubmFtZTtcbiAgICAgICAgICAgIGNvbnN0IHF1ZXN0RmlsdGVyID0gdGhpcy5zZXR0aW5ncy5xdWVzdEZpbHRlcnNbcXVlc3ROYW1lXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSWYgbm8gZmlsdGVyIHNldCwgc2hvdyBhbGxcbiAgICAgICAgICAgIGlmICghcXVlc3RGaWx0ZXIpIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBFbmVyZ3kgZmlsdGVyXG4gICAgICAgICAgICBpZiAoZmlsdGVycy5hY3RpdmVFbmVyZ3kgIT09IFwiYW55XCIgJiYgcXVlc3RGaWx0ZXIuZW5lcmd5TGV2ZWwgIT09IGZpbHRlcnMuYWN0aXZlRW5lcmd5KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDb250ZXh0IGZpbHRlclxuICAgICAgICAgICAgaWYgKGZpbHRlcnMuYWN0aXZlQ29udGV4dCAhPT0gXCJhbnlcIiAmJiBxdWVzdEZpbHRlci5jb250ZXh0ICE9PSBmaWx0ZXJzLmFjdGl2ZUNvbnRleHQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFRhZ3MgZmlsdGVyXG4gICAgICAgICAgICBpZiAoZmlsdGVycy5hY3RpdmVUYWdzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBoYXNUYWcgPSBmaWx0ZXJzLmFjdGl2ZVRhZ3Muc29tZSgodGFnOiBzdHJpbmcpID0+IHF1ZXN0RmlsdGVyLnRhZ3MuaW5jbHVkZXModGFnKSk7XG4gICAgICAgICAgICAgICAgaWYgKCFoYXNUYWcpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICBnZXRRdWVzdHNCeUVuZXJneShlbmVyZ3k6IFwiaGlnaFwiIHwgXCJtZWRpdW1cIiB8IFwibG93XCIsIHF1ZXN0czogYW55W10pOiBhbnlbXSB7XG4gICAgICAgIHJldHVybiBxdWVzdHMuZmlsdGVyKHEgPT4ge1xuICAgICAgICAgICAgY29uc3QgcXVlc3ROYW1lID0gcS5iYXNlbmFtZSB8fCBxLm5hbWU7XG4gICAgICAgICAgICBjb25zdCBmaWx0ZXIgPSB0aGlzLnNldHRpbmdzLnF1ZXN0RmlsdGVyc1txdWVzdE5hbWVdO1xuICAgICAgICAgICAgcmV0dXJuIGZpbHRlciAmJiBmaWx0ZXIuZW5lcmd5TGV2ZWwgPT09IGVuZXJneTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIGdldFF1ZXN0c0J5Q29udGV4dChjb250ZXh0OiBcImhvbWVcIiB8IFwib2ZmaWNlXCIgfCBcImFueXdoZXJlXCIsIHF1ZXN0czogYW55W10pOiBhbnlbXSB7XG4gICAgICAgIHJldHVybiBxdWVzdHMuZmlsdGVyKHEgPT4ge1xuICAgICAgICAgICAgY29uc3QgcXVlc3ROYW1lID0gcS5iYXNlbmFtZSB8fCBxLm5hbWU7XG4gICAgICAgICAgICBjb25zdCBmaWx0ZXIgPSB0aGlzLnNldHRpbmdzLnF1ZXN0RmlsdGVyc1txdWVzdE5hbWVdO1xuICAgICAgICAgICAgcmV0dXJuIGZpbHRlciAmJiBmaWx0ZXIuY29udGV4dCA9PT0gY29udGV4dDtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIGdldFF1ZXN0c0J5VGFncyh0YWdzOiBzdHJpbmdbXSwgcXVlc3RzOiBhbnlbXSk6IGFueVtdIHtcbiAgICAgICAgcmV0dXJuIHF1ZXN0cy5maWx0ZXIocSA9PiB7XG4gICAgICAgICAgICBjb25zdCBxdWVzdE5hbWUgPSBxLmJhc2VuYW1lIHx8IHEubmFtZTtcbiAgICAgICAgICAgIGNvbnN0IGZpbHRlciA9IHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzW3F1ZXN0TmFtZV07XG4gICAgICAgICAgICBpZiAoIWZpbHRlcikgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgcmV0dXJuIHRhZ3Muc29tZSh0YWcgPT4gZmlsdGVyLnRhZ3MuaW5jbHVkZXModGFnKSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICBjbGVhckZpbHRlcnMoKSB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUgPSB7XG4gICAgICAgICAgICBhY3RpdmVFbmVyZ3k6IFwiYW55XCIsXG4gICAgICAgICAgICBhY3RpdmVDb250ZXh0OiBcImFueVwiLFxuICAgICAgICAgICAgYWN0aXZlVGFnczogW11cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIG5ldyBOb3RpY2UoXCJBbGwgZmlsdGVycyBjbGVhcmVkXCIpO1xuICAgICAgICB0aGlzLnNhdmUoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0QXZhaWxhYmxlVGFncygpOiBzdHJpbmdbXSB7XG4gICAgICAgIGNvbnN0IHRhZ3MgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICAgICAgXG4gICAgICAgIGZvciAoY29uc3QgcXVlc3ROYW1lIGluIHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzKSB7XG4gICAgICAgICAgICBjb25zdCBmaWx0ZXIgPSB0aGlzLnNldHRpbmdzLnF1ZXN0RmlsdGVyc1txdWVzdE5hbWVdO1xuICAgICAgICAgICAgZmlsdGVyLnRhZ3MuZm9yRWFjaCgodGFnOiBzdHJpbmcpID0+IHRhZ3MuYWRkKHRhZykpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gQXJyYXkuZnJvbSh0YWdzKS5zb3J0KCk7XG4gICAgfVxuXG5cblxuICAgIC8vID09PT09IERMQyA2OiBBTkFMWVRJQ1MgJiBFTkRHQU1FID09PT09XG4gICAgXG4gICAgdHJhY2tEYWlseU1ldHJpY3ModHlwZTogc3RyaW5nLCBhbW91bnQ6IG51bWJlciA9IDEpIHtcbiAgICAgICAgY29uc3QgdG9kYXkgPSBtb21lbnQoKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpO1xuICAgICAgICBcbiAgICAgICAgbGV0IG1ldHJpYyA9IHRoaXMuc2V0dGluZ3MuZGF5TWV0cmljcy5maW5kKG0gPT4gbS5kYXRlID09PSB0b2RheSk7XG4gICAgICAgIGlmICghbWV0cmljKSB7XG4gICAgICAgICAgICBtZXRyaWMgPSB7XG4gICAgICAgICAgICAgICAgZGF0ZTogdG9kYXksXG4gICAgICAgICAgICAgICAgcXVlc3RzQ29tcGxldGVkOiAwLFxuICAgICAgICAgICAgICAgIHF1ZXN0c0ZhaWxlZDogMCxcbiAgICAgICAgICAgICAgICB4cEVhcm5lZDogMCxcbiAgICAgICAgICAgICAgICBnb2xkRWFybmVkOiAwLFxuICAgICAgICAgICAgICAgIGRhbWFnZXNUYWtlbjogMCxcbiAgICAgICAgICAgICAgICBza2lsbHNMZXZlbGVkOiBbXSxcbiAgICAgICAgICAgICAgICBjaGFpbnNDb21wbGV0ZWQ6IDBcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmRheU1ldHJpY3MucHVzaChtZXRyaWMpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgXCJxdWVzdF9jb21wbGV0ZVwiOlxuICAgICAgICAgICAgICAgIG1ldHJpYy5xdWVzdHNDb21wbGV0ZWQgKz0gYW1vdW50O1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcInF1ZXN0X2ZhaWxcIjpcbiAgICAgICAgICAgICAgICBtZXRyaWMucXVlc3RzRmFpbGVkICs9IGFtb3VudDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJ4cFwiOlxuICAgICAgICAgICAgICAgIG1ldHJpYy54cEVhcm5lZCArPSBhbW91bnQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiZ29sZFwiOlxuICAgICAgICAgICAgICAgIG1ldHJpYy5nb2xkRWFybmVkICs9IGFtb3VudDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJkYW1hZ2VcIjpcbiAgICAgICAgICAgICAgICBtZXRyaWMuZGFtYWdlc1Rha2VuICs9IGFtb3VudDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJza2lsbF9sZXZlbFwiOlxuICAgICAgICAgICAgICAgIG1ldHJpYy5za2lsbHNMZXZlbGVkLnB1c2goXCJTa2lsbCBsZXZlbGVkXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcImNoYWluX2NvbXBsZXRlXCI6XG4gICAgICAgICAgICAgICAgbWV0cmljLmNoYWluc0NvbXBsZXRlZCArPSBhbW91bnQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2F2ZSgpO1xuICAgIH1cbiAgICBcbiAgICB1cGRhdGVTdHJlYWsoKSB7XG4gICAgICAgIGNvbnN0IHRvZGF5ID0gbW9tZW50KCkuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcbiAgICAgICAgY29uc3QgbGFzdERhdGUgPSB0aGlzLnNldHRpbmdzLnN0cmVhay5sYXN0RGF0ZTtcbiAgICAgICAgXG4gICAgICAgIGlmIChsYXN0RGF0ZSA9PT0gdG9kYXkpIHtcbiAgICAgICAgICAgIHJldHVybjsgLy8gQWxyZWFkeSBjb3VudGVkIHRvZGF5XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHllc3RlcmRheSA9IG1vbWVudCgpLnN1YnRyYWN0KDEsICdkYXknKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGxhc3REYXRlID09PSB5ZXN0ZXJkYXkpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3Muc3RyZWFrLmN1cnJlbnQrKztcbiAgICAgICAgICAgIGlmICh0aGlzLnNldHRpbmdzLnN0cmVhay5jdXJyZW50ID4gdGhpcy5zZXR0aW5ncy5zdHJlYWsubG9uZ2VzdCkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3Muc3RyZWFrLmxvbmdlc3QgPSB0aGlzLnNldHRpbmdzLnN0cmVhay5jdXJyZW50O1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5zdHJlYWsuY3VycmVudCA9IDE7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0dGluZ3Muc3RyZWFrLmxhc3REYXRlID0gdG9kYXk7XG4gICAgICAgIHRoaXMuc2F2ZSgpO1xuICAgIH1cbiAgICBcbiAgICBpbml0aWFsaXplQm9zc01pbGVzdG9uZXMoKSB7XG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmJvc3NNaWxlc3RvbmVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY29uc3QgbWlsZXN0b25lcyA9IFtcbiAgICAgICAgICAgICAgICB7IGxldmVsOiAxMCwgbmFtZTogXCJUaGUgRmlyc3QgVHJpYWxcIiwgdW5sb2NrZWQ6IGZhbHNlLCBkZWZlYXRlZDogZmFsc2UsIHhwUmV3YXJkOiA1MDAgfSxcbiAgICAgICAgICAgICAgICB7IGxldmVsOiAyMCwgbmFtZTogXCJUaGUgTmVtZXNpcyBSZXR1cm5zXCIsIHVubG9ja2VkOiBmYWxzZSwgZGVmZWF0ZWQ6IGZhbHNlLCB4cFJld2FyZDogMTAwMCB9LFxuICAgICAgICAgICAgICAgIHsgbGV2ZWw6IDMwLCBuYW1lOiBcIlRoZSBSZWFwZXIgQXdha2Vuc1wiLCB1bmxvY2tlZDogZmFsc2UsIGRlZmVhdGVkOiBmYWxzZSwgeHBSZXdhcmQ6IDE1MDAgfSxcbiAgICAgICAgICAgICAgICB7IGxldmVsOiA1MCwgbmFtZTogXCJUaGUgRmluYWwgQXNjZW5zaW9uXCIsIHVubG9ja2VkOiBmYWxzZSwgZGVmZWF0ZWQ6IGZhbHNlLCB4cFJld2FyZDogNTAwMCB9XG4gICAgICAgICAgICBdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmJvc3NNaWxlc3RvbmVzID0gbWlsZXN0b25lcyBhcyBhbnk7XG4gICAgICAgICAgICB0aGlzLnNhdmUoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBjaGVja0Jvc3NNaWxlc3RvbmVzKCkge1xuICAgICAgICBpZiAoIXRoaXMuc2V0dGluZ3MuYm9zc01pbGVzdG9uZXMgfHwgdGhpcy5zZXR0aW5ncy5ib3NzTWlsZXN0b25lcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZUJvc3NNaWxlc3RvbmVzKCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0dGluZ3MuYm9zc01pbGVzdG9uZXMuZm9yRWFjaCgoYm9zczogYW55KSA9PiB7XG4gICAgICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5sZXZlbCA+PSBib3NzLmxldmVsICYmICFib3NzLnVubG9ja2VkKSB7XG4gICAgICAgICAgICAgICAgYm9zcy51bmxvY2tlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgbmV3IE5vdGljZShgQm9zcyBVbmxvY2tlZDogJHtib3NzLm5hbWV9IChMZXZlbCAke2Jvc3MubGV2ZWx9KWApO1xuICAgICAgICAgICAgICAgIHRoaXMuYXVkaW8ucGxheVNvdW5kKFwic3VjY2Vzc1wiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNhdmUoKTtcbiAgICB9XG4gICAgXG4gICAgZGVmZWF0Qm9zcyhsZXZlbDogbnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IGJvc3MgPSB0aGlzLnNldHRpbmdzLmJvc3NNaWxlc3RvbmVzLmZpbmQoKGI6IGFueSkgPT4gYi5sZXZlbCA9PT0gbGV2ZWwpO1xuICAgICAgICBpZiAoIWJvc3MpIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIGJvc3MuZGVmZWF0ZWQgPSB0cnVlO1xuICAgICAgICBib3NzLmRlZmVhdGVkQXQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLnhwICs9IGJvc3MueHBSZXdhcmQ7XG4gICAgICAgIFxuICAgICAgICBuZXcgTm90aWNlKGBCb3NzIERlZmVhdGVkOiAke2Jvc3MubmFtZX0hICske2Jvc3MueHBSZXdhcmR9IFhQYCk7XG4gICAgICAgIHRoaXMuYXVkaW8ucGxheVNvdW5kKFwic3VjY2Vzc1wiKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIHdpbiBjb25kaXRpb25cbiAgICAgICAgaWYgKGxldmVsID09PSA1MCkge1xuICAgICAgICAgICAgdGhpcy53aW5HYW1lKCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2F2ZSgpO1xuICAgIH1cbiAgICBcbiAgICB3aW5HYW1lKCkge1xuICAgICAgICB0aGlzLnNldHRpbmdzLmdhbWVXb24gPSB0cnVlO1xuICAgICAgICB0aGlzLnNldHRpbmdzLmVuZEdhbWVEYXRlID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgdG90YWxUaW1lID0gbW9tZW50KHRoaXMuc2V0dGluZ3MuZW5kR2FtZURhdGUpLmRpZmYobW9tZW50KHRoaXMuc2V0dGluZ3MuaGlzdG9yeVswXT8uZGF0ZSksICdkYXlzJyk7XG4gICAgICAgIGNvbnN0IGZpbmFsTGV2ZWwgPSB0aGlzLnNldHRpbmdzLmxldmVsO1xuICAgICAgICBjb25zdCBmaW5hbEdvbGQgPSB0aGlzLnNldHRpbmdzLmdvbGQ7XG4gICAgICAgIFxuICAgICAgICBuZXcgTm90aWNlKGBWSUNUT1JZISBZb3UgcmVhY2hlZCBMZXZlbCA1MCBpbiAke3RvdGFsVGltZX0gZGF5cyFgKTtcbiAgICAgICAgdGhpcy5hdWRpby5wbGF5U291bmQoXCJzdWNjZXNzXCIpO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5zYXZlKCk7XG4gICAgfVxuICAgIFxuICAgIGdlbmVyYXRlV2Vla2x5UmVwb3J0KCkge1xuICAgICAgICBjb25zdCB3ZWVrID0gbW9tZW50KCkud2VlaygpO1xuICAgICAgICBjb25zdCBzdGFydERhdGUgPSBtb21lbnQoKS5zdGFydE9mKCd3ZWVrJykuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcbiAgICAgICAgY29uc3QgZW5kRGF0ZSA9IG1vbWVudCgpLmVuZE9mKCd3ZWVrJykuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHdlZWtNZXRyaWNzID0gdGhpcy5zZXR0aW5ncy5kYXlNZXRyaWNzLmZpbHRlcigobTogYW55KSA9PiBcbiAgICAgICAgICAgIG1vbWVudChtLmRhdGUpLmlzQmV0d2Vlbihtb21lbnQoc3RhcnREYXRlKSwgbW9tZW50KGVuZERhdGUpLCBudWxsLCAnW10nKVxuICAgICAgICApO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgdG90YWxRdWVzdHMgPSB3ZWVrTWV0cmljcy5yZWR1Y2UoKHN1bTogbnVtYmVyLCBtOiBhbnkpID0+IHN1bSArIG0ucXVlc3RzQ29tcGxldGVkLCAwKTtcbiAgICAgICAgY29uc3QgdG90YWxGYWlsZWQgPSB3ZWVrTWV0cmljcy5yZWR1Y2UoKHN1bTogbnVtYmVyLCBtOiBhbnkpID0+IHN1bSArIG0ucXVlc3RzRmFpbGVkLCAwKTtcbiAgICAgICAgY29uc3Qgc3VjY2Vzc1JhdGUgPSB0b3RhbFF1ZXN0cyArIHRvdGFsRmFpbGVkID4gMCA/IE1hdGgucm91bmQoKHRvdGFsUXVlc3RzIC8gKHRvdGFsUXVlc3RzICsgdG90YWxGYWlsZWQpKSAqIDEwMCkgOiAwO1xuICAgICAgICBjb25zdCB0b3RhbFhwID0gd2Vla01ldHJpY3MucmVkdWNlKChzdW06IG51bWJlciwgbTogYW55KSA9PiBzdW0gKyBtLnhwRWFybmVkLCAwKTtcbiAgICAgICAgY29uc3QgdG90YWxHb2xkID0gd2Vla01ldHJpY3MucmVkdWNlKChzdW06IG51bWJlciwgbTogYW55KSA9PiBzdW0gKyBtLmdvbGRFYXJuZWQsIDApO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgdG9wU2tpbGxzID0gdGhpcy5zZXR0aW5ncy5za2lsbHNcbiAgICAgICAgICAgIC5zb3J0KChhOiBhbnksIGI6IGFueSkgPT4gKGIubGV2ZWwgLSBhLmxldmVsKSlcbiAgICAgICAgICAgIC5zbGljZSgwLCAzKVxuICAgICAgICAgICAgLm1hcCgoczogYW55KSA9PiBzLm5hbWUpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgYmVzdERheSA9IHdlZWtNZXRyaWNzLmxlbmd0aCA+IDAgXG4gICAgICAgICAgICA/IHdlZWtNZXRyaWNzLnJlZHVjZSgobWF4OiBhbnksIG06IGFueSkgPT4gbS5xdWVzdHNDb21wbGV0ZWQgPiBtYXgucXVlc3RzQ29tcGxldGVkID8gbSA6IG1heCkuZGF0ZVxuICAgICAgICAgICAgOiBzdGFydERhdGU7XG4gICAgICAgIFxuICAgICAgICBjb25zdCB3b3JzdERheSA9IHdlZWtNZXRyaWNzLmxlbmd0aCA+IDBcbiAgICAgICAgICAgID8gd2Vla01ldHJpY3MucmVkdWNlKChtaW46IGFueSwgbTogYW55KSA9PiBtLnF1ZXN0c0ZhaWxlZCA+IG1pbi5xdWVzdHNGYWlsZWQgPyBtIDogbWluKS5kYXRlXG4gICAgICAgICAgICA6IHN0YXJ0RGF0ZTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHJlcG9ydDogYW55ID0ge1xuICAgICAgICAgICAgd2Vlazogd2VlayxcbiAgICAgICAgICAgIHN0YXJ0RGF0ZTogc3RhcnREYXRlLFxuICAgICAgICAgICAgZW5kRGF0ZTogZW5kRGF0ZSxcbiAgICAgICAgICAgIHRvdGFsUXVlc3RzOiB0b3RhbFF1ZXN0cyxcbiAgICAgICAgICAgIHN1Y2Nlc3NSYXRlOiBzdWNjZXNzUmF0ZSxcbiAgICAgICAgICAgIHRvdGFsWHA6IHRvdGFsWHAsXG4gICAgICAgICAgICB0b3RhbEdvbGQ6IHRvdGFsR29sZCxcbiAgICAgICAgICAgIHRvcFNraWxsczogdG9wU2tpbGxzLFxuICAgICAgICAgICAgYmVzdERheTogYmVzdERheSxcbiAgICAgICAgICAgIHdvcnN0RGF5OiB3b3JzdERheVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgdGhpcy5zZXR0aW5ncy53ZWVrbHlSZXBvcnRzLnB1c2gocmVwb3J0KTtcbiAgICAgICAgbmV3IE5vdGljZShgV2Vla2x5IFJlcG9ydCBHZW5lcmF0ZWQgKFdlZWsgJHt3ZWVrfSlgKTtcbiAgICAgICAgdGhpcy5zYXZlKCk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVwb3J0O1xuICAgIH1cbiAgICBcbiAgICB1bmxvY2tBY2hpZXZlbWVudChhY2hpZXZlbWVudElkOiBzdHJpbmcpIHtcbiAgICAgICAgY29uc3QgYWNoaWV2ZW1lbnQgPSB0aGlzLnNldHRpbmdzLmFjaGlldmVtZW50cy5maW5kKChhOiBhbnkpID0+IGEuaWQgPT09IGFjaGlldmVtZW50SWQpO1xuICAgICAgICBpZiAoIWFjaGlldmVtZW50IHx8IGFjaGlldmVtZW50LnVubG9ja2VkKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICBhY2hpZXZlbWVudC51bmxvY2tlZCA9IHRydWU7XG4gICAgICAgIGFjaGlldmVtZW50LnVubG9ja2VkQXQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgIFxuICAgICAgICBuZXcgTm90aWNlKGBBY2hpZXZlbWVudCBVbmxvY2tlZDogJHthY2hpZXZlbWVudC5uYW1lfWApO1xuICAgICAgICB0aGlzLmF1ZGlvLnBsYXlTb3VuZChcInN1Y2Nlc3NcIik7XG4gICAgICAgIHRoaXMuc2F2ZSgpO1xuICAgIH1cbiAgICBcbiAgICBnZXRHYW1lU3RhdHMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBsZXZlbDogdGhpcy5zZXR0aW5ncy5sZXZlbCxcbiAgICAgICAgICAgIGN1cnJlbnRTdHJlYWs6IHRoaXMuc2V0dGluZ3Muc3RyZWFrLmN1cnJlbnQsXG4gICAgICAgICAgICBsb25nZXN0U3RyZWFrOiB0aGlzLnNldHRpbmdzLnN0cmVhay5sb25nZXN0LFxuICAgICAgICAgICAgdG90YWxRdWVzdHM6IHRoaXMuc2V0dGluZ3MuZGF5TWV0cmljcy5yZWR1Y2UoKHN1bTogbnVtYmVyLCBtOiBhbnkpID0+IHN1bSArIG0ucXVlc3RzQ29tcGxldGVkLCAwKSxcbiAgICAgICAgICAgIHRvdGFsWHA6IHRoaXMuc2V0dGluZ3MueHAgKyB0aGlzLnNldHRpbmdzLmRheU1ldHJpY3MucmVkdWNlKChzdW06IG51bWJlciwgbTogYW55KSA9PiBzdW0gKyBtLnhwRWFybmVkLCAwKSxcbiAgICAgICAgICAgIGdhbWVXb246IHRoaXMuc2V0dGluZ3MuZ2FtZVdvbixcbiAgICAgICAgICAgIGJvc3Nlc0Zlc0RlYXRlZDogdGhpcy5zZXR0aW5ncy5ib3NzTWlsZXN0b25lcy5maWx0ZXIoKGI6IGFueSkgPT4gYi5kZWZlYXRlZCkubGVuZ3RoLFxuICAgICAgICAgICAgdG90YWxCb3NzZXM6IHRoaXMuc2V0dGluZ3MuYm9zc01pbGVzdG9uZXMubGVuZ3RoXG4gICAgICAgIH07XG4gICAgfVxuXG59XG4iLCJpbXBvcnQgeyBOb3RpY2UgfSBmcm9tICdvYnNpZGlhbic7XG5cbmV4cG9ydCBjbGFzcyBBdWRpb0NvbnRyb2xsZXIge1xuICAgIGF1ZGlvQ3R4OiBBdWRpb0NvbnRleHQgfCBudWxsID0gbnVsbDtcbiAgICBicm93bk5vaXNlTm9kZTogU2NyaXB0UHJvY2Vzc29yTm9kZSB8IG51bGwgPSBudWxsO1xuICAgIG11dGVkOiBib29sZWFuID0gZmFsc2U7XG5cbiAgICBjb25zdHJ1Y3RvcihtdXRlZDogYm9vbGVhbikgeyB0aGlzLm11dGVkID0gbXV0ZWQ7IH1cblxuICAgIHNldE11dGVkKG11dGVkOiBib29sZWFuKSB7IHRoaXMubXV0ZWQgPSBtdXRlZDsgfVxuXG4gICAgaW5pdEF1ZGlvKCkgeyBpZiAoIXRoaXMuYXVkaW9DdHgpIHRoaXMuYXVkaW9DdHggPSBuZXcgKHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgKHdpbmRvdyBhcyBhbnkpLndlYmtpdEF1ZGlvQ29udGV4dCkoKTsgfVxuXG4gICAgcGxheVRvbmUoZnJlcTogbnVtYmVyLCB0eXBlOiBPc2NpbGxhdG9yVHlwZSwgZHVyYXRpb246IG51bWJlciwgdm9sOiBudW1iZXIgPSAwLjEpIHtcbiAgICAgICAgaWYgKHRoaXMubXV0ZWQpIHJldHVybjtcbiAgICAgICAgdGhpcy5pbml0QXVkaW8oKTtcbiAgICAgICAgY29uc3Qgb3NjID0gdGhpcy5hdWRpb0N0eCEuY3JlYXRlT3NjaWxsYXRvcigpO1xuICAgICAgICBjb25zdCBnYWluID0gdGhpcy5hdWRpb0N0eCEuY3JlYXRlR2FpbigpO1xuICAgICAgICBvc2MudHlwZSA9IHR5cGU7XG4gICAgICAgIG9zYy5mcmVxdWVuY3kudmFsdWUgPSBmcmVxO1xuICAgICAgICBvc2MuY29ubmVjdChnYWluKTtcbiAgICAgICAgZ2Fpbi5jb25uZWN0KHRoaXMuYXVkaW9DdHghLmRlc3RpbmF0aW9uKTtcbiAgICAgICAgb3NjLnN0YXJ0KCk7XG4gICAgICAgIGdhaW4uZ2Fpbi5zZXRWYWx1ZUF0VGltZSh2b2wsIHRoaXMuYXVkaW9DdHghLmN1cnJlbnRUaW1lKTtcbiAgICAgICAgZ2Fpbi5nYWluLmV4cG9uZW50aWFsUmFtcFRvVmFsdWVBdFRpbWUoMC4wMDAwMSwgdGhpcy5hdWRpb0N0eCEuY3VycmVudFRpbWUgKyBkdXJhdGlvbik7XG4gICAgICAgIG9zYy5zdG9wKHRoaXMuYXVkaW9DdHghLmN1cnJlbnRUaW1lICsgZHVyYXRpb24pO1xuICAgIH1cblxuICAgIHBsYXlTb3VuZCh0eXBlOiBcInN1Y2Nlc3NcInxcImZhaWxcInxcImRlYXRoXCJ8XCJjbGlja1wifFwiaGVhcnRiZWF0XCJ8XCJtZWRpdGF0ZVwiKSB7XG4gICAgICAgIGlmICh0eXBlID09PSBcInN1Y2Nlc3NcIikgeyB0aGlzLnBsYXlUb25lKDYwMCwgXCJzaW5lXCIsIDAuMSk7IHNldFRpbWVvdXQoKCkgPT4gdGhpcy5wbGF5VG9uZSg4MDAsIFwic2luZVwiLCAwLjIpLCAxMDApOyB9XG4gICAgICAgIGVsc2UgaWYgKHR5cGUgPT09IFwiZmFpbFwiKSB7IHRoaXMucGxheVRvbmUoMTUwLCBcInNhd3Rvb3RoXCIsIDAuMyk7IHNldFRpbWVvdXQoKCkgPT4gdGhpcy5wbGF5VG9uZSgxMDAsIFwic2F3dG9vdGhcIiwgMC40KSwgMTUwKTsgfVxuICAgICAgICBlbHNlIGlmICh0eXBlID09PSBcImRlYXRoXCIpIHsgdGhpcy5wbGF5VG9uZSg1MCwgXCJzcXVhcmVcIiwgMS4wKTsgfVxuICAgICAgICBlbHNlIGlmICh0eXBlID09PSBcImNsaWNrXCIpIHsgdGhpcy5wbGF5VG9uZSg4MDAsIFwic2luZVwiLCAwLjA1KTsgfVxuICAgICAgICBlbHNlIGlmICh0eXBlID09PSBcImhlYXJ0YmVhdFwiKSB7IHRoaXMucGxheVRvbmUoNjAsIFwic2luZVwiLCAwLjEsIDAuNSk7IHNldFRpbWVvdXQoKCk9PnRoaXMucGxheVRvbmUoNTAsIFwic2luZVwiLCAwLjEsIDAuNCksIDE1MCk7IH1cbiAgICAgICAgZWxzZSBpZiAodHlwZSA9PT0gXCJtZWRpdGF0ZVwiKSB7IHRoaXMucGxheVRvbmUoNDMyLCBcInNpbmVcIiwgMi4wLCAwLjA1KTsgfVxuICAgIH1cblxuICAgIHRvZ2dsZUJyb3duTm9pc2UoKSB7XG4gICAgICAgIHRoaXMuaW5pdEF1ZGlvKCk7XG4gICAgICAgIGlmICh0aGlzLmJyb3duTm9pc2VOb2RlKSB7IFxuICAgICAgICAgICAgdGhpcy5icm93bk5vaXNlTm9kZS5kaXNjb25uZWN0KCk7IFxuICAgICAgICAgICAgdGhpcy5icm93bk5vaXNlTm9kZSA9IG51bGw7IFxuICAgICAgICAgICAgbmV3IE5vdGljZShcIkZvY3VzIEF1ZGlvOiBPRkZcIik7IFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgYnVmZmVyU2l6ZSA9IDQwOTY7IFxuICAgICAgICAgICAgdGhpcy5icm93bk5vaXNlTm9kZSA9IHRoaXMuYXVkaW9DdHghLmNyZWF0ZVNjcmlwdFByb2Nlc3NvcihidWZmZXJTaXplLCAxLCAxKTtcbiAgICAgICAgICAgIGxldCBsYXN0T3V0ID0gMDtcbiAgICAgICAgICAgIHRoaXMuYnJvd25Ob2lzZU5vZGUub25hdWRpb3Byb2Nlc3MgPSAoZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IG91dHB1dCA9IGUub3V0cHV0QnVmZmVyLmdldENoYW5uZWxEYXRhKDApO1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYnVmZmVyU2l6ZTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHdoaXRlID0gTWF0aC5yYW5kb20oKSAqIDIgLSAxOyBcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0W2ldID0gKGxhc3RPdXQgKyAoMC4wMiAqIHdoaXRlKSkgLyAxLjAyOyBcbiAgICAgICAgICAgICAgICAgICAgbGFzdE91dCA9IG91dHB1dFtpXTsgXG4gICAgICAgICAgICAgICAgICAgIG91dHB1dFtpXSAqPSAzLjU7IFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBjb25zdCBnYWluID0gdGhpcy5hdWRpb0N0eCEuY3JlYXRlR2FpbigpOyBcbiAgICAgICAgICAgIGdhaW4uZ2Fpbi52YWx1ZSA9IDAuMDU7IFxuICAgICAgICAgICAgdGhpcy5icm93bk5vaXNlTm9kZS5jb25uZWN0KGdhaW4pOyBcbiAgICAgICAgICAgIGdhaW4uY29ubmVjdCh0aGlzLmF1ZGlvQ3R4IS5kZXN0aW5hdGlvbik7XG4gICAgICAgICAgICBuZXcgTm90aWNlKFwiRm9jdXMgQXVkaW86IE9OXCIpO1xuICAgICAgICB9XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgSXRlbVZpZXcsIFdvcmtzcGFjZUxlYWYsIFRGaWxlLCBURm9sZGVyLCBtb21lbnQgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgU2lzeXBodXNQbHVnaW4gZnJvbSAnLi4vbWFpbic7XG5pbXBvcnQgeyBRdWVzdE1vZGFsLCBTaG9wTW9kYWwsIFNraWxsRGV0YWlsTW9kYWwsIFNraWxsTWFuYWdlck1vZGFsIH0gZnJvbSAnLi9tb2RhbHMnO1xuaW1wb3J0IHsgU2tpbGwsIERhaWx5TWlzc2lvbiB9IGZyb20gJy4uL3R5cGVzJztcblxuZXhwb3J0IGNvbnN0IFZJRVdfVFlQRV9QQU5PUFRJQ09OID0gXCJzaXN5cGh1cy1wYW5vcHRpY29uXCI7XG5cbmV4cG9ydCBjbGFzcyBQYW5vcHRpY29uVmlldyBleHRlbmRzIEl0ZW1WaWV3IHtcbiAgICBwbHVnaW46IFNpc3lwaHVzUGx1Z2luO1xuXG4gICAgY29uc3RydWN0b3IobGVhZjogV29ya3NwYWNlTGVhZiwgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbikge1xuICAgICAgICBzdXBlcihsZWFmKTtcbiAgICAgICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XG4gICAgfVxuXG4gICAgZ2V0Vmlld1R5cGUoKSB7IHJldHVybiBWSUVXX1RZUEVfUEFOT1BUSUNPTjsgfVxuICAgIGdldERpc3BsYXlUZXh0KCkgeyByZXR1cm4gXCJFeWUgU2lzeXBodXNcIjsgfVxuICAgIGdldEljb24oKSB7IHJldHVybiBcInNrdWxsXCI7IH1cblxuICAgIGFzeW5jIG9uT3BlbigpIHsgdGhpcy5yZWZyZXNoKCk7IH1cblxuICAgIGFzeW5jIHJlZnJlc2goKSB7XG4gICAgICAgIGNvbnN0IGMgPSB0aGlzLmNvbnRlbnRFbDsgYy5lbXB0eSgpO1xuICAgICAgICBjb25zdCBjb250YWluZXIgPSBjLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWNvbnRhaW5lclwiIH0pO1xuICAgICAgICBjb25zdCBzY3JvbGwgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktc2Nyb2xsLWFyZWFcIiB9KTtcblxuICAgICAgICAvLyAtLS0gMS4gSEVBREVSICYgQ1JJVElDQUwgQUxFUlRTIC0tLVxuICAgICAgICBzY3JvbGwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwiRXllIFNJU1lQSFVTIE9TXCIsIGNsczogXCJzaXN5LWhlYWRlclwiIH0pO1xuICAgICAgICBcbiAgICAgICAgaWYodGhpcy5wbHVnaW4uZW5naW5lLmlzTG9ja2VkRG93bigpKSB7XG4gICAgICAgICAgICBjb25zdCBsID0gc2Nyb2xsLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWFsZXJ0IHNpc3ktYWxlcnQtbG9ja2Rvd25cIiB9KTtcbiAgICAgICAgICAgIGwuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiTE9DS0RPV04gQUNUSVZFXCIgfSk7XG4gICAgICAgICAgICBjb25zdCB0aW1lUmVtYWluaW5nID0gbW9tZW50KHRoaXMucGx1Z2luLnNldHRpbmdzLmxvY2tkb3duVW50aWwpLmRpZmYobW9tZW50KCksICdtaW51dGVzJyk7XG4gICAgICAgICAgICBjb25zdCBob3VycyA9IE1hdGguZmxvb3IodGltZVJlbWFpbmluZyAvIDYwKTtcbiAgICAgICAgICAgIGNvbnN0IG1pbnMgPSB0aW1lUmVtYWluaW5nICUgNjA7XG4gICAgICAgICAgICBsLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IGBUaW1lIFJlbWFpbmluZzogJHtob3Vyc31oICR7bWluc31tYCB9KTtcbiAgICAgICAgICAgIGNvbnN0IGJ0biA9IGwuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkFUVEVNUFQgUkVDT1ZFUllcIiB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgbWVkU3RhdHVzID0gdGhpcy5wbHVnaW4uZW5naW5lLmdldE1lZGl0YXRpb25TdGF0dXMoKTtcbiAgICAgICAgICAgIGNvbnN0IG1lZERpdiA9IGwuY3JlYXRlRGl2KCk7XG4gICAgICAgICAgICBtZWREaXYuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJtYXJnaW4tdG9wOiAxMHB4OyBwYWRkaW5nOiAxMHB4OyBiYWNrZ3JvdW5kOiByZ2JhKDE3MCwgMTAwLCAyNTUsIDAuMSk7IGJvcmRlci1yYWRpdXM6IDRweDtcIik7XG4gICAgICAgICAgICBtZWREaXYuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYE1lZGl0YXRpb246ICR7bWVkU3RhdHVzLmN5Y2xlc0RvbmV9LzEwICgke21lZFN0YXR1cy5jeWNsZXNSZW1haW5pbmd9IGxlZnQpYCB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgbWVkQmFyID0gbWVkRGl2LmNyZWF0ZURpdigpO1xuICAgICAgICAgICAgbWVkQmFyLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiaGVpZ2h0OiA2cHg7IGJhY2tncm91bmQ6IHJnYmEoMjU1LDI1NSwyNTUsMC4xKTsgYm9yZGVyLXJhZGl1czogM3B4OyBtYXJnaW46IDVweCAwOyBvdmVyZmxvdzogaGlkZGVuO1wiKTtcbiAgICAgICAgICAgIGNvbnN0IG1lZEZpbGwgPSBtZWRCYXIuY3JlYXRlRGl2KCk7XG4gICAgICAgICAgICBjb25zdCBtZWRQZXJjZW50ID0gKG1lZFN0YXR1cy5jeWNsZXNEb25lIC8gMTApICogMTAwO1xuICAgICAgICAgICAgbWVkRmlsbC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBgd2lkdGg6ICR7bWVkUGVyY2VudH0lOyBoZWlnaHQ6IDEwMCU7IGJhY2tncm91bmQ6ICNhYTY0ZmY7IHRyYW5zaXRpb246IHdpZHRoIDAuM3M7YCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IG1lZEJ0biA9IG1lZERpdi5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiTUVESVRBVEVcIiB9KTtcbiAgICAgICAgICAgIG1lZEJ0bi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIndpZHRoOiAxMDAlOyBwYWRkaW5nOiA4cHg7IG1hcmdpbi10b3A6IDVweDsgYmFja2dyb3VuZDogcmdiYSgxNzAsIDEwMCwgMjU1LCAwLjMpOyBib3JkZXI6IDFweCBzb2xpZCAjYWE2NGZmOyBjb2xvcjogI2FhNjRmZjsgYm9yZGVyLXJhZGl1czogM3B4OyBjdXJzb3I6IHBvaW50ZXI7IGZvbnQtd2VpZ2h0OiBib2xkO1wiKTtcbiAgICAgICAgICAgIG1lZEJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLmVuZ2luZS5zdGFydE1lZGl0YXRpb24oKTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHRoaXMucmVmcmVzaCgpLCAxMDApO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGJ0bi5hZGRDbGFzcyhcInNpc3ktYnRuXCIpO1xuICAgICAgICAgICAgYnRuLm9uY2xpY2sgPSAoKSA9PiB0aGlzLnBsdWdpbi5lbmdpbmUuYXR0ZW1wdFJlY292ZXJ5KCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYodGhpcy5wbHVnaW4uZW5naW5lLmlzUmVzdGluZygpKSB7XG4gICAgICAgICAgICAgY29uc3QgciA9IHNjcm9sbC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1hbGVydCBzaXN5LWFsZXJ0LXJlc3RcIiB9KTtcbiAgICAgICAgICAgICByLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIlJFU1QgREFZIEFDVElWRVwiIH0pO1xuICAgICAgICAgICAgIGNvbnN0IHRpbWVSZW1haW5pbmcgPSBtb21lbnQodGhpcy5wbHVnaW4uc2V0dGluZ3MucmVzdERheVVudGlsKS5kaWZmKG1vbWVudCgpLCAnbWludXRlcycpO1xuICAgICAgICAgICAgIGNvbnN0IGhvdXJzID0gTWF0aC5mbG9vcih0aW1lUmVtYWluaW5nIC8gNjApO1xuICAgICAgICAgICAgIGNvbnN0IG1pbnMgPSB0aW1lUmVtYWluaW5nICUgNjA7XG4gICAgICAgICAgICAgci5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBgJHtob3Vyc31oICR7bWluc31tIHJlbWFpbmluZyB8IE5vIGRhbWFnZSwgUnVzdCBwYXVzZWRgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gLS0tIDIuIEhVRCBHUklEICgyeDIpIC0tLVxuICAgICAgICBjb25zdCBodWQgPSBzY3JvbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktaHVkXCIgfSk7XG4gICAgICAgIHRoaXMuc3RhdChodWQsIFwiSEVBTFRIXCIsIGAke3RoaXMucGx1Z2luLnNldHRpbmdzLmhwfS8ke3RoaXMucGx1Z2luLnNldHRpbmdzLm1heEhwfWAsIHRoaXMucGx1Z2luLnNldHRpbmdzLmhwIDwgMzAgPyBcInNpc3ktY3JpdGljYWxcIiA6IFwiXCIpO1xuICAgICAgICB0aGlzLnN0YXQoaHVkLCBcIkdPTERcIiwgYCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuZ29sZH1gLCB0aGlzLnBsdWdpbi5zZXR0aW5ncy5nb2xkIDwgMCA/IFwic2lzeS12YWwtZGVidFwiIDogXCJcIik7XG4gICAgICAgIHRoaXMuc3RhdChodWQsIFwiTEVWRUxcIiwgYCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MubGV2ZWx9YCk7XG4gICAgICAgIHRoaXMuc3RhdChodWQsIFwiUklWQUwgRE1HXCIsIGAke3RoaXMucGx1Z2luLnNldHRpbmdzLnJpdmFsRG1nfWApO1xuXG4gICAgICAgIC8vIC0tLSAzLiBUSEUgT1JBQ0xFIC0tLVxuICAgICAgICBjb25zdCBvcmFjbGUgPSBzY3JvbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktb3JhY2xlXCIgfSk7XG4gICAgICAgIG9yYWNsZS5jcmVhdGVFbChcImg0XCIsIHsgdGV4dDogXCJPUkFDTEUgUFJFRElDVElPTlwiIH0pO1xuICAgICAgICBjb25zdCBzdXJ2aXZhbCA9IE1hdGguZmxvb3IodGhpcy5wbHVnaW4uc2V0dGluZ3MuaHAgLyAodGhpcy5wbHVnaW4uc2V0dGluZ3Mucml2YWxEbWcgKiAodGhpcy5wbHVnaW4uc2V0dGluZ3MuZ29sZCA8IDAgPyAyIDogMSkpKTtcbiAgICAgICAgXG4gICAgICAgIGxldCBzdXJ2VGV4dCA9IGBTdXJ2aXZhbDogJHtzdXJ2aXZhbH0gZGF5c2A7XG4gICAgICAgIGNvbnN0IGlzQ3Jpc2lzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuaHAgPCAzMCB8fCB0aGlzLnBsdWdpbi5zZXR0aW5ncy5nb2xkIDwgMDtcbiAgICAgICAgXG4gICAgICAgIC8vIEdsaXRjaCBMb2dpY1xuICAgICAgICBpZiAoaXNDcmlzaXMgJiYgTWF0aC5yYW5kb20oKSA8IDAuMykge1xuICAgICAgICAgICAgY29uc3QgZ2xpdGNoZXMgPSBbXCJbQ09SUlVQVEVEXVwiLCBcIj8/PyBEQVlTIExFRlRcIiwgXCJOTyBGVVRVUkVcIiwgXCJSVU5cIl07XG4gICAgICAgICAgICBzdXJ2VGV4dCA9IGdsaXRjaGVzW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGdsaXRjaGVzLmxlbmd0aCldO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc3VydkVsID0gb3JhY2xlLmNyZWF0ZURpdih7IHRleHQ6IHN1cnZUZXh0IH0pO1xuICAgICAgICBpZiAoc3Vydml2YWwgPCAyIHx8IHN1cnZUZXh0LmluY2x1ZGVzKFwiPz8/XCIpIHx8IHN1cnZUZXh0LmluY2x1ZGVzKFwiQ09SUlVQVEVEXCIpKSB7XG4gICAgICAgICAgICAgc3VydkVsLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiY29sb3I6I2ZmNTU1NTsgZm9udC13ZWlnaHQ6Ym9sZDsgbGV0dGVyLXNwYWNpbmc6IDFweDtcIik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGxpZ2h0cyA9IG9yYWNsZS5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1zdGF0dXMtbGlnaHRzXCIgfSk7XG4gICAgICAgIGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5nb2xkIDwgMCkgbGlnaHRzLmNyZWF0ZURpdih7IHRleHQ6IFwiREVCVDogWUVTXCIsIGNsczogXCJzaXN5LWxpZ2h0LWFjdGl2ZVwiIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gRExDIDE6IFNjYXJzIGRpc3BsYXlcbiAgICAgICAgY29uc3Qgc2NhckNvdW50ID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MubGVnYWN5Py5kZWF0aENvdW50IHx8IDA7XG4gICAgICAgIGlmIChzY2FyQ291bnQgPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBzY2FyRWwgPSBvcmFjbGUuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktc2Nhci1kaXNwbGF5XCIgfSk7XG4gICAgICAgICAgICBzY2FyRWwuY3JlYXRlRWwoXCJzcGFuXCIsIHsgdGV4dDogYFNjYXJzOiAke3NjYXJDb3VudH1gIH0pO1xuICAgICAgICAgICAgY29uc3QgcGVuYWx0eSA9IE1hdGgucG93KDAuOSwgc2NhckNvdW50KTtcbiAgICAgICAgICAgIGNvbnN0IHBlcmNlbnRMb3N0ID0gTWF0aC5mbG9vcigoMSAtIHBlbmFsdHkpICogMTAwKTtcbiAgICAgICAgICAgIHNjYXJFbC5jcmVhdGVFbChcInNtYWxsXCIsIHsgdGV4dDogYCgtJHtwZXJjZW50TG9zdH0lIHN0YXJ0aW5nIGdvbGQpYCB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRExDIDE6IE5leHQgbWlsZXN0b25lXG4gICAgICAgIGNvbnN0IGxldmVsTWlsZXN0b25lcyA9IFsxMCwgMjAsIDMwLCA1MF07XG4gICAgICAgIGNvbnN0IG5leHRNaWxlc3RvbmUgPSBsZXZlbE1pbGVzdG9uZXMuZmluZChtID0+IG0gPiB0aGlzLnBsdWdpbi5zZXR0aW5ncy5sZXZlbCk7XG4gICAgICAgIGlmIChuZXh0TWlsZXN0b25lKSB7XG4gICAgICAgICAgICBjb25zdCBtaWxlc3RvbmVFbCA9IG9yYWNsZS5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1taWxlc3RvbmVcIiB9KTtcbiAgICAgICAgICAgIG1pbGVzdG9uZUVsLmNyZWF0ZUVsKFwic3BhblwiLCB7IHRleHQ6IGBOZXh0IE1pbGVzdG9uZTogTGV2ZWwgJHtuZXh0TWlsZXN0b25lfWAgfSk7XG4gICAgICAgICAgICBpZiAobmV4dE1pbGVzdG9uZSA9PT0gMTAgfHwgbmV4dE1pbGVzdG9uZSA9PT0gMjAgfHwgbmV4dE1pbGVzdG9uZSA9PT0gMzAgfHwgbmV4dE1pbGVzdG9uZSA9PT0gNTApIHtcbiAgICAgICAgICAgICAgICBtaWxlc3RvbmVFbC5jcmVhdGVFbChcInNtYWxsXCIsIHsgdGV4dDogXCIoQm9zcyBVbmxvY2spXCIgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyAtLS0gNC4gREFJTFkgTUlTU0lPTlMgKERMQyAxKSAtLS1cbiAgICAgICAgc2Nyb2xsLmNyZWF0ZURpdih7IHRleHQ6IFwiVE9EQVlTIE9CSkVDVElWRVNcIiwgY2xzOiBcInNpc3ktc2VjdGlvbi10aXRsZVwiIH0pO1xuICAgICAgICB0aGlzLnJlbmRlckRhaWx5TWlzc2lvbnMoc2Nyb2xsKTtcblxuICAgICAgICAvLyAtLS0gNS4gQ09OVFJPTFMgLS0tXG4gICAgICAgIGNvbnN0IGN0cmxzID0gc2Nyb2xsLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWNvbnRyb2xzXCIgfSk7XG4gICAgICAgIGN0cmxzLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJERVBMT1lcIiwgY2xzOiBcInNpc3ktYnRuIG1vZC1jdGFcIiB9KS5vbmNsaWNrID0gKCkgPT4gbmV3IFF1ZXN0TW9kYWwodGhpcy5hcHAsIHRoaXMucGx1Z2luKS5vcGVuKCk7XG4gICAgICAgIGN0cmxzLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJTSE9QXCIsIGNsczogXCJzaXN5LWJ0blwiIH0pLm9uY2xpY2sgPSAoKSA9PiBuZXcgU2hvcE1vZGFsKHRoaXMuYXBwLCB0aGlzLnBsdWdpbikub3BlbigpO1xuICAgICAgICBjdHJscy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiRk9DVVNcIiwgY2xzOiBcInNpc3ktYnRuXCIgfSkub25jbGljayA9ICgpID0+IHRoaXMucGx1Z2luLmF1ZGlvLnRvZ2dsZUJyb3duTm9pc2UoKTtcblxuICAgICAgICAvLyAtLS0gNi4gQUNUSVZFIFRIUkVBVFMgLS0tXG4gICAgICAgIC8vIC0tLSBETEMgNTogQ09OVEVYVCBGSUxURVJTIC0tLVxuICAgICAgICBzY3JvbGwuY3JlYXRlRGl2KHsgdGV4dDogXCJGSUxURVIgQ09OVFJPTFNcIiwgY2xzOiBcInNpc3ktc2VjdGlvbi10aXRsZVwiIH0pO1xuICAgICAgICB0aGlzLnJlbmRlckZpbHRlckJhcihzY3JvbGwpO1xuXG4gICAgICAgIC8vIC0tLSBETEMgNDogUVVFU1QgQ0hBSU5TIC0tLVxuICAgICAgICBjb25zdCBhY3RpdmVDaGFpbiA9IHRoaXMucGx1Z2luLmVuZ2luZS5nZXRBY3RpdmVDaGFpbigpO1xuICAgICAgICBpZiAoYWN0aXZlQ2hhaW4pIHtcbiAgICAgICAgICAgIHNjcm9sbC5jcmVhdGVEaXYoeyB0ZXh0OiBcIkFDVElWRSBDSEFJTlwiLCBjbHM6IFwic2lzeS1zZWN0aW9uLXRpdGxlXCIgfSk7XG4gICAgICAgICAgICB0aGlzLnJlbmRlckNoYWluU2VjdGlvbihzY3JvbGwpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gLS0tIERMQyAyOiBSRVNFQVJDSCBMSUJSQVJZIC0tLVxuICAgICAgICBzY3JvbGwuY3JlYXRlRGl2KHsgdGV4dDogXCJSRVNFQVJDSCBMSUJSQVJZXCIsIGNsczogXCJzaXN5LXNlY3Rpb24tdGl0bGVcIiB9KTtcbiAgICAgICAgdGhpcy5yZW5kZXJSZXNlYXJjaFNlY3Rpb24oc2Nyb2xsKTtcblxuICAgICAgICAvLyAtLS0gRExDIDY6IEFOQUxZVElDUyAmIEVOREdBTUUgLS0tXG4gICAgICAgIHNjcm9sbC5jcmVhdGVEaXYoeyB0ZXh0OiBcIkFOQUxZVElDUyAmIFBST0dSRVNTXCIsIGNsczogXCJzaXN5LXNlY3Rpb24tdGl0bGVcIiB9KTtcbiAgICAgICAgdGhpcy5yZW5kZXJBbmFseXRpY3Moc2Nyb2xsKTtcblxuICAgICAgICAvLyAtLS0gQUNUSVZFIFRIUkVBVFMgLS0tXG4gICAgICAgIHNjcm9sbC5jcmVhdGVEaXYoeyB0ZXh0OiBcIkFDVElWRSBUSFJFQVRTXCIsIGNsczogXCJzaXN5LXNlY3Rpb24tdGl0bGVcIiB9KTtcbiAgICAgICAgYXdhaXQgdGhpcy5yZW5kZXJRdWVzdHMoc2Nyb2xsKTtcblxuICAgICAgICAgICAgICAgIHNjcm9sbC5jcmVhdGVEaXYoeyB0ZXh0OiBcIk5FVVJBTCBIVUJcIiwgY2xzOiBcInNpc3ktc2VjdGlvbi10aXRsZVwiIH0pO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Muc2tpbGxzLmZvckVhY2goKHM6IFNraWxsLCBpZHg6IG51bWJlcikgPT4ge1xuICAgICAgICAgICAgY29uc3Qgcm93ID0gc2Nyb2xsLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXNraWxsLXJvd1wiIH0pO1xuICAgICAgICAgICAgcm93Lm9uY2xpY2sgPSAoKSA9PiBuZXcgU2tpbGxEZXRhaWxNb2RhbCh0aGlzLmFwcCwgdGhpcy5wbHVnaW4sIGlkeCkub3BlbigpO1xuICAgICAgICAgICAgY29uc3QgbWV0YSA9IHJvdy5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1za2lsbC1tZXRhXCIgfSk7XG4gICAgICAgICAgICBtZXRhLmNyZWF0ZVNwYW4oeyB0ZXh0OiBzLm5hbWUgfSk7XG4gICAgICAgICAgICBtZXRhLmNyZWF0ZVNwYW4oeyB0ZXh0OiBgTHZsICR7cy5sZXZlbH1gIH0pO1xuICAgICAgICAgICAgaWYgKHMucnVzdCA+IDApIHtcbiAgICAgICAgICAgICAgICBtZXRhLmNyZWF0ZVNwYW4oeyB0ZXh0OiBgUlVTVCAke3MucnVzdH1gLCBjbHM6IFwic2lzeS1ydXN0LWJhZGdlXCIgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBiYXIgPSByb3cuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktYmFyLWJnXCIgfSk7XG4gICAgICAgICAgICBjb25zdCBmaWxsID0gYmFyLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWJhci1maWxsXCIgfSk7XG4gICAgICAgICAgICBmaWxsLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIGB3aWR0aDogJHsocy54cC9zLnhwUmVxKSoxMDB9JTsgYmFja2dyb3VuZDogJHtzLnJ1c3QgPiAwID8gJyNkMzU0MDAnIDogJyMwMGIwZmYnfWApO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGFkZEJ0biA9IHNjcm9sbC5jcmVhdGVEaXYoeyB0ZXh0OiBcIisgQWRkIE5ldXJhbCBOb2RlXCIsIGNsczogXCJzaXN5LWFkZC1za2lsbFwiIH0pO1xuICAgICAgICBhZGRCdG4ub25jbGljayA9ICgpID0+IG5ldyBTa2lsbE1hbmFnZXJNb2RhbCh0aGlzLmFwcCwgdGhpcy5wbHVnaW4pLm9wZW4oKTtcblxuICAgICAgICAvLyAtLS0gOC4gUVVJQ0sgQ0FQVFVSRSAtLS1cbiAgICAgICAgY29uc3QgZm9vdGVyID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXF1aWNrLWNhcHR1cmVcIiB9KTtcbiAgICAgICAgY29uc3QgaW5wdXQgPSBmb290ZXIuY3JlYXRlRWwoXCJpbnB1dFwiLCB7IGNsczogXCJzaXN5LXF1aWNrLWlucHV0XCIsIHBsYWNlaG9sZGVyOiBcIk1pc3Npb24gLzEuLi41XCIgfSk7XG4gICAgICAgIGlucHV0Lm9ua2V5ZG93biA9IGFzeW5jIChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoZS5rZXkgPT09ICdFbnRlcicgJiYgaW5wdXQudmFsdWUudHJpbSgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLnBhcnNlUXVpY2tJbnB1dChpbnB1dC52YWx1ZS50cmltKCkpO1xuICAgICAgICAgICAgICAgIGlucHV0LnZhbHVlID0gXCJcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBETEMgMTogUmVuZGVyIERhaWx5IE1pc3Npb25zXG4gICAgcmVuZGVyRGFpbHlNaXNzaW9ucyhwYXJlbnQ6IEhUTUxFbGVtZW50KSB7XG4gICAgICAgIGNvbnN0IG1pc3Npb25zID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuZGFpbHlNaXNzaW9ucyB8fCBbXTtcbiAgICAgICAgXG4gICAgICAgIGlmIChtaXNzaW9ucy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGVtcHR5ID0gcGFyZW50LmNyZWF0ZURpdih7IHRleHQ6IFwiTm8gbWlzc2lvbnMgdG9kYXkuIENoZWNrIGJhY2sgdG9tb3Jyb3cuXCIsIGNsczogXCJzaXN5LWVtcHR5LXN0YXRlXCIgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBtaXNzaW9uc0RpdiA9IHBhcmVudC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1kYWlseS1taXNzaW9uc1wiIH0pO1xuICAgICAgICBcbiAgICAgICAgbWlzc2lvbnMuZm9yRWFjaCgobWlzc2lvbjogRGFpbHlNaXNzaW9uKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjYXJkID0gbWlzc2lvbnNEaXYuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktbWlzc2lvbi1jYXJkXCIgfSk7XG4gICAgICAgICAgICBpZiAobWlzc2lvbi5jb21wbGV0ZWQpIGNhcmQuYWRkQ2xhc3MoXCJzaXN5LW1pc3Npb24tY29tcGxldGVkXCIpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBoZWFkZXIgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LW1pc3Npb24taGVhZGVyXCIgfSk7XG4gICAgICAgICAgICBjb25zdCBzdGF0dXNJY29uID0gbWlzc2lvbi5jb21wbGV0ZWQgPyBcIllFU1wiIDogXCIuLlwiO1xuICAgICAgICAgICAgaGVhZGVyLmNyZWF0ZUVsKFwic3BhblwiLCB7IHRleHQ6IHN0YXR1c0ljb24sIGNsczogXCJzaXN5LW1pc3Npb24tc3RhdHVzXCIgfSk7XG4gICAgICAgICAgICBoZWFkZXIuY3JlYXRlRWwoXCJzcGFuXCIsIHsgdGV4dDogbWlzc2lvbi5uYW1lLCBjbHM6IFwic2lzeS1taXNzaW9uLW5hbWVcIiB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgZGVzYyA9IGNhcmQuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogbWlzc2lvbi5kZXNjLCBjbHM6IFwic2lzeS1taXNzaW9uLWRlc2NcIiB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgcHJvZ3Jlc3MgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LW1pc3Npb24tcHJvZ3Jlc3NcIiB9KTtcbiAgICAgICAgICAgIHByb2dyZXNzLmNyZWF0ZUVsKFwic3BhblwiLCB7IHRleHQ6IGAke21pc3Npb24ucHJvZ3Jlc3N9LyR7bWlzc2lvbi50YXJnZXR9YCwgY2xzOiBcInNpc3ktbWlzc2lvbi1jb3VudGVyXCIgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGJhciA9IHByb2dyZXNzLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWJhci1iZ1wiIH0pO1xuICAgICAgICAgICAgY29uc3QgZmlsbCA9IGJhci5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1iYXItZmlsbFwiIH0pO1xuICAgICAgICAgICAgY29uc3QgcGVyY2VudCA9IChtaXNzaW9uLnByb2dyZXNzIC8gbWlzc2lvbi50YXJnZXQpICogMTAwO1xuICAgICAgICAgICAgZmlsbC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBgd2lkdGg6ICR7TWF0aC5taW4ocGVyY2VudCwgMTAwKX0lYCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IHJld2FyZCA9IGNhcmQuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktbWlzc2lvbi1yZXdhcmRcIiB9KTtcbiAgICAgICAgICAgIGlmIChtaXNzaW9uLnJld2FyZC54cCA+IDApIHJld2FyZC5jcmVhdGVTcGFuKHsgdGV4dDogYCske21pc3Npb24ucmV3YXJkLnhwfSBYUGAsIGNsczogXCJzaXN5LXJld2FyZC14cFwiIH0pO1xuICAgICAgICAgICAgaWYgKG1pc3Npb24ucmV3YXJkLmdvbGQgPiAwKSByZXdhcmQuY3JlYXRlU3Bhbih7IHRleHQ6IGArJHttaXNzaW9uLnJld2FyZC5nb2xkfWdgLCBjbHM6IFwic2lzeS1yZXdhcmQtZ29sZFwiIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBjb25zdCBhbGxDb21wbGV0ZWQgPSBtaXNzaW9ucy5ldmVyeShtID0+IG0uY29tcGxldGVkKTtcbiAgICAgICAgaWYgKGFsbENvbXBsZXRlZCAmJiBtaXNzaW9ucy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBib251cyA9IG1pc3Npb25zRGl2LmNyZWF0ZURpdih7IHRleHQ6IFwiQWxsIE1pc3Npb25zIENvbXBsZXRlISArNTAgQm9udXMgR29sZFwiLCBjbHM6IFwic2lzeS1taXNzaW9uLWJvbnVzXCIgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cblxuXG4gICAgLy8gRExDIDI6IFJlbmRlciBSZXNlYXJjaCBRdWVzdHMgU2VjdGlvblxuICAgIHJlbmRlclJlc2VhcmNoU2VjdGlvbihwYXJlbnQ6IEhUTUxFbGVtZW50KSB7XG4gICAgICAgIGNvbnN0IHJlc2VhcmNoUXVlc3RzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucmVzZWFyY2hRdWVzdHMgfHwgW107XG4gICAgICAgIGNvbnN0IGFjdGl2ZVJlc2VhcmNoID0gcmVzZWFyY2hRdWVzdHMuZmlsdGVyKHEgPT4gIXEuY29tcGxldGVkKTtcbiAgICAgICAgY29uc3QgY29tcGxldGVkUmVzZWFyY2ggPSByZXNlYXJjaFF1ZXN0cy5maWx0ZXIocSA9PiBxLmNvbXBsZXRlZCk7XG5cbiAgICAgICAgLy8gU3RhdHMgYmFyXG4gICAgICAgIGNvbnN0IHN0YXRzID0gdGhpcy5wbHVnaW4uZW5naW5lLmdldFJlc2VhcmNoUmF0aW8oKTtcbiAgICAgICAgY29uc3Qgc3RhdHNEaXYgPSBwYXJlbnQuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktcmVzZWFyY2gtc3RhdHNcIiB9KTtcbiAgICAgICAgc3RhdHNEaXYuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJib3JkZXI6IDFweCBzb2xpZCAjNjY2OyBwYWRkaW5nOiAxMHB4OyBib3JkZXItcmFkaXVzOiA0cHg7IG1hcmdpbi1ib3R0b206IDEwcHg7IGJhY2tncm91bmQ6IHJnYmEoMTcwLCAxMDAsIDI1NSwgMC4wNSk7XCIpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcmF0aW9UZXh0ID0gc3RhdHNEaXYuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYFJlc2VhcmNoIFJhdGlvOiAke3N0YXRzLmNvbWJhdH06JHtzdGF0cy5yZXNlYXJjaH0gKCR7c3RhdHMucmF0aW99OjEpYCB9KTtcbiAgICAgICAgcmF0aW9UZXh0LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luOiA1cHggMDsgZm9udC1zaXplOiAwLjllbTtcIik7XG4gICAgICAgIFxuICAgICAgICBpZiAoIXRoaXMucGx1Z2luLmVuZ2luZS5jYW5DcmVhdGVSZXNlYXJjaFF1ZXN0KCkpIHtcbiAgICAgICAgICAgIGNvbnN0IHdhcm5pbmcgPSBzdGF0c0Rpdi5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBcIkJMT0NLRUQ6IE5lZWQgMiBjb21iYXQgcGVyIDEgcmVzZWFyY2hcIiB9KTtcbiAgICAgICAgICAgIHdhcm5pbmcuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJjb2xvcjogb3JhbmdlOyBmb250LXdlaWdodDogYm9sZDsgbWFyZ2luOiA1cHggMDtcIik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBY3RpdmUgUmVzZWFyY2hcbiAgICAgICAgcGFyZW50LmNyZWF0ZURpdih7IHRleHQ6IFwiQUNUSVZFIFJFU0VBUkNIXCIsIGNsczogXCJzaXN5LXNlY3Rpb24tdGl0bGVcIiB9KTtcbiAgICAgICAgXG4gICAgICAgIGlmIChhY3RpdmVSZXNlYXJjaC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHBhcmVudC5jcmVhdGVEaXYoeyB0ZXh0OiBcIk5vIGFjdGl2ZSByZXNlYXJjaC5cIiwgY2xzOiBcInNpc3ktZW1wdHktc3RhdGVcIiB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFjdGl2ZVJlc2VhcmNoLmZvckVhY2goKHF1ZXN0OiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBjYXJkID0gcGFyZW50LmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXJlc2VhcmNoLWNhcmRcIiB9KTtcbiAgICAgICAgICAgICAgICBjYXJkLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiYm9yZGVyOiAxcHggc29saWQgI2FhNjRmZjsgcGFkZGluZzogMTBweDsgbWFyZ2luLWJvdHRvbTogOHB4OyBib3JkZXItcmFkaXVzOiA0cHg7IGJhY2tncm91bmQ6IHJnYmEoMTcwLCAxMDAsIDI1NSwgMC4wNSk7XCIpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gY2FyZC5jcmVhdGVEaXYoKTtcbiAgICAgICAgICAgICAgICBoZWFkZXIuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJkaXNwbGF5OiBmbGV4OyBqdXN0aWZ5LWNvbnRlbnQ6IHNwYWNlLWJldHdlZW47IG1hcmdpbi1ib3R0b206IDZweDtcIik7XG5cbiAgICAgICAgICAgICAgICBjb25zdCB0aXRsZSA9IGhlYWRlci5jcmVhdGVFbChcInNwYW5cIiwgeyB0ZXh0OiBxdWVzdC50aXRsZSB9KTtcbiAgICAgICAgICAgICAgICB0aXRsZS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImZvbnQtd2VpZ2h0OiBib2xkOyBmbGV4OiAxO1wiKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHR5cGVMYWJlbCA9IGhlYWRlci5jcmVhdGVFbChcInNwYW5cIiwgeyB0ZXh0OiBxdWVzdC50eXBlID09PSBcInN1cnZleVwiID8gXCJTVVJWRVlcIiA6IFwiREVFUCBESVZFXCIgfSk7XG4gICAgICAgICAgICAgICAgdHlwZUxhYmVsLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZm9udC1zaXplOiAwLjc1ZW07IHBhZGRpbmc6IDJweCA2cHg7IGJhY2tncm91bmQ6IHJnYmEoMTcwLCAxMDAsIDI1NSwgMC4zKTsgYm9yZGVyLXJhZGl1czogMnB4O1wiKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHdvcmRDb3VudCA9IGNhcmQuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYFdvcmRzOiAke3F1ZXN0LndvcmRDb3VudH0vJHtxdWVzdC53b3JkTGltaXR9YCB9KTtcbiAgICAgICAgICAgICAgICB3b3JkQ291bnQuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJtYXJnaW46IDVweCAwOyBmb250LXNpemU6IDAuODVlbTtcIik7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBiYXIgPSBjYXJkLmNyZWF0ZURpdigpO1xuICAgICAgICAgICAgICAgIGJhci5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImhlaWdodDogNnB4OyBiYWNrZ3JvdW5kOiByZ2JhKDI1NSwyNTUsMjU1LDAuMSk7IGJvcmRlci1yYWRpdXM6IDNweDsgb3ZlcmZsb3c6IGhpZGRlbjsgbWFyZ2luOiA2cHggMDtcIik7XG4gICAgICAgICAgICAgICAgY29uc3QgZmlsbCA9IGJhci5jcmVhdGVEaXYoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBwZXJjZW50ID0gTWF0aC5taW4oMTAwLCAocXVlc3Qud29yZENvdW50IC8gcXVlc3Qud29yZExpbWl0KSAqIDEwMCk7XG4gICAgICAgICAgICAgICAgZmlsbC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBgd2lkdGg6ICR7cGVyY2VudH0lOyBoZWlnaHQ6IDEwMCU7IGJhY2tncm91bmQ6ICNhYTY0ZmY7IHRyYW5zaXRpb246IHdpZHRoIDAuM3M7YCk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBhY3Rpb25zID0gY2FyZC5jcmVhdGVEaXYoKTtcbiAgICAgICAgICAgICAgICBhY3Rpb25zLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZGlzcGxheTogZmxleDsgZ2FwOiA1cHg7IG1hcmdpbi10b3A6IDhweDtcIik7XG5cbiAgICAgICAgICAgICAgICBjb25zdCB2aWV3QnRuID0gYWN0aW9ucy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiQ09NUExFVEVcIiB9KTtcbiAgICAgICAgICAgICAgICB2aWV3QnRuLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZmxleDogMTsgcGFkZGluZzogNnB4OyBiYWNrZ3JvdW5kOiByZ2JhKDg1LCAyNTUsIDg1LCAwLjIpOyBib3JkZXI6IDFweCBzb2xpZCAjNTVmZjU1OyBjb2xvcjogIzU1ZmY1NTsgYm9yZGVyLXJhZGl1czogM3B4OyBjdXJzb3I6IHBvaW50ZXI7IGZvbnQtc2l6ZTogMC44NWVtO1wiKTtcbiAgICAgICAgICAgICAgICB2aWV3QnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLmVuZ2luZS5jb21wbGV0ZVJlc2VhcmNoUXVlc3QocXVlc3QuaWQsIHF1ZXN0LndvcmRDb3VudCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICBjb25zdCBkZWxldGVCdG4gPSBhY3Rpb25zLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJERUxFVEVcIiB9KTtcbiAgICAgICAgICAgICAgICBkZWxldGVCdG4uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJmbGV4OiAxOyBwYWRkaW5nOiA2cHg7IGJhY2tncm91bmQ6IHJnYmEoMjU1LCA4NSwgODUsIDAuMik7IGJvcmRlcjogMXB4IHNvbGlkICNmZjU1NTU7IGNvbG9yOiAjZmY1NTU1OyBib3JkZXItcmFkaXVzOiAzcHg7IGN1cnNvcjogcG9pbnRlcjsgZm9udC1zaXplOiAwLjg1ZW07XCIpO1xuICAgICAgICAgICAgICAgIGRlbGV0ZUJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5lbmdpbmUuZGVsZXRlUmVzZWFyY2hRdWVzdChxdWVzdC5pZCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENvbXBsZXRlZCBSZXNlYXJjaFxuICAgICAgICBwYXJlbnQuY3JlYXRlRGl2KHsgdGV4dDogXCJDT01QTEVURUQgUkVTRUFSQ0hcIiwgY2xzOiBcInNpc3ktc2VjdGlvbi10aXRsZVwiIH0pO1xuICAgICAgICBcbiAgICAgICAgaWYgKGNvbXBsZXRlZFJlc2VhcmNoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcGFyZW50LmNyZWF0ZURpdih7IHRleHQ6IFwiTm8gY29tcGxldGVkIHJlc2VhcmNoLlwiLCBjbHM6IFwic2lzeS1lbXB0eS1zdGF0ZVwiIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29tcGxldGVkUmVzZWFyY2guZm9yRWFjaCgocXVlc3Q6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBwYXJlbnQuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYCsgJHtxdWVzdC50aXRsZX0gKCR7cXVlc3QudHlwZSA9PT0gXCJzdXJ2ZXlcIiA/IFwiU3VydmV5XCIgOiBcIkRlZXAgRGl2ZVwifSlgIH0pO1xuICAgICAgICAgICAgICAgIGl0ZW0uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJvcGFjaXR5OiAwLjY7IGZvbnQtc2l6ZTogMC45ZW07IG1hcmdpbjogM3B4IDA7XCIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cblxuICAgICAgICAgICAgYXN5bmMgcmVuZGVyUXVlc3RzKHBhcmVudDogSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgY29uc3QgZm9sZGVyID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKFwiQWN0aXZlX1J1bi9RdWVzdHNcIik7XG4gICAgICAgIGxldCBjb3VudCA9IDA7XG4gICAgICAgIGlmIChmb2xkZXIgaW5zdGFuY2VvZiBURm9sZGVyKSB7XG4gICAgICAgICAgICBjb25zdCBmaWxlcyA9IGZvbGRlci5jaGlsZHJlbi5maWx0ZXIoZiA9PiBmIGluc3RhbmNlb2YgVEZpbGUpIGFzIFRGaWxlW107XG4gICAgICAgICAgICBmaWxlcy5zb3J0KChhLCBiKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgZm1BID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoYSk/LmZyb250bWF0dGVyO1xuICAgICAgICAgICAgICAgIGNvbnN0IGZtQiA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGIpPy5mcm9udG1hdHRlcjtcbiAgICAgICAgICAgICAgICBjb25zdCBkYXRlQSA9IGZtQT8uZGVhZGxpbmUgPyBtb21lbnQoZm1BLmRlYWRsaW5lKS52YWx1ZU9mKCkgOiA5OTk5OTk5OTk5OTk5O1xuICAgICAgICAgICAgICAgIGNvbnN0IGRhdGVCID0gZm1CPy5kZWFkbGluZSA/IG1vbWVudChmbUIuZGVhZGxpbmUpLnZhbHVlT2YoKSA6IDk5OTk5OTk5OTk5OTk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGVBIC0gZGF0ZUI7IFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGZvciAoY29uc3QgZmlsZSBvZiBmaWxlcykge1xuICAgICAgICAgICAgICAgIGNvdW50Kys7XG4gICAgICAgICAgICAgICAgY29uc3QgZm0gPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKT8uZnJvbnRtYXR0ZXI7XG4gICAgICAgICAgICAgICAgY29uc3QgY2FyZCA9IHBhcmVudC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1jYXJkXCIgfSk7XG4gICAgICAgICAgICAgICAgaWYgKGZtPy5pc19ib3NzKSBjYXJkLmFkZENsYXNzKFwic2lzeS1jYXJkLWJvc3NcIik7XG4gICAgICAgICAgICAgICAgY29uc3QgZCA9IFN0cmluZyhmbT8uZGlmZmljdWx0eSB8fCBcIlwiKS5tYXRjaCgvXFxkLyk7XG4gICAgICAgICAgICAgICAgaWYgKGQpIGNhcmQuYWRkQ2xhc3MoYHNpc3ktY2FyZC0ke2RbMF19YCk7XG5cbiAgICAgICAgICAgICAgICAvLyBUb3Agc2VjdGlvbiB3aXRoIHRpdGxlIGFuZCB0aW1lclxuICAgICAgICAgICAgICAgIGNvbnN0IHRvcCA9IGNhcmQuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktY2FyZC10b3BcIiB9KTtcbiAgICAgICAgICAgICAgICB0b3AuY3JlYXRlRGl2KHsgdGV4dDogZmlsZS5iYXNlbmFtZSwgY2xzOiBcInNpc3ktY2FyZC10aXRsZVwiIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFRpbWVyXG4gICAgICAgICAgICAgICAgaWYgKGZtPy5kZWFkbGluZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkaWZmID0gbW9tZW50KGZtLmRlYWRsaW5lKS5kaWZmKG1vbWVudCgpLCAnbWludXRlcycpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBob3VycyA9IE1hdGguZmxvb3IoZGlmZiAvIDYwKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbWlucyA9IGRpZmYgJSA2MDtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGltZXJUZXh0ID0gZGlmZiA8IDAgPyBcIkVYUElSRURcIiA6IGAke2hvdXJzfWggJHttaW5zfW1gO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0aW1lciA9IHRvcC5jcmVhdGVEaXYoeyB0ZXh0OiB0aW1lclRleHQsIGNsczogXCJzaXN5LXRpbWVyXCIgfSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkaWZmIDwgNjApIHRpbWVyLmFkZENsYXNzKFwic2lzeS10aW1lci1sYXRlXCIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFRyYXNoIGljb24gKGlubGluZSwgbm90IGFic29sdXRlKVxuICAgICAgICAgICAgICAgIGNvbnN0IHRyYXNoID0gdG9wLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXRyYXNoXCIsIHRleHQ6IFwiW1hdXCIgfSk7XG4gICAgICAgICAgICAgICAgdHJhc2guc3R5bGUuY3Vyc29yID0gXCJwb2ludGVyXCI7XG4gICAgICAgICAgICAgICAgdHJhc2guc3R5bGUuY29sb3IgPSBcIiNmZjU1NTVcIjtcbiAgICAgICAgICAgICAgICB0cmFzaC5vbmNsaWNrID0gKGUpID0+IHsgXG4gICAgICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7IFxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5lbmdpbmUuZGVsZXRlUXVlc3QoZmlsZSk7IFxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAvLyBBY3Rpb24gYnV0dG9uc1xuICAgICAgICAgICAgICAgIGNvbnN0IGFjdHMgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWFjdGlvbnNcIiB9KTtcbiAgICAgICAgICAgICAgICBjb25zdCBiRCA9IGFjdHMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIk9LXCIsIGNsczogXCJzaXN5LWFjdGlvbi1idG4gbW9kLWRvbmVcIiB9KTtcbiAgICAgICAgICAgICAgICBiRC5vbmNsaWNrID0gKCkgPT4gdGhpcy5wbHVnaW4uZW5naW5lLmNvbXBsZXRlUXVlc3QoZmlsZSk7XG4gICAgICAgICAgICAgICAgY29uc3QgYkYgPSBhY3RzLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJYWFwiLCBjbHM6IFwic2lzeS1hY3Rpb24tYnRuIG1vZC1mYWlsXCIgfSk7XG4gICAgICAgICAgICAgICAgYkYub25jbGljayA9ICgpID0+IHRoaXMucGx1Z2luLmVuZ2luZS5mYWlsUXVlc3QoZmlsZSwgdHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvdW50ID09PSAwKSB7XG4gICAgICAgICAgICBjb25zdCBpZGxlID0gcGFyZW50LmNyZWF0ZURpdih7IHRleHQ6IFwiU3lzdGVtIElkbGUuXCIsIGNsczogXCJzaXN5LWVtcHR5LXN0YXRlXCIgfSk7XG4gICAgICAgICAgICBjb25zdCBjdGFCdG4gPSBpZGxlLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJbREVQTE9ZIFFVRVNUXVwiLCBjbHM6IFwic2lzeS1idG4gbW9kLWN0YVwiIH0pO1xuICAgICAgICAgICAgY3RhQnRuLnN0eWxlLm1hcmdpblRvcCA9IFwiMTBweFwiO1xuICAgICAgICAgICAgY3RhQnRuLm9uY2xpY2sgPSAoKSA9PiBuZXcgUXVlc3RNb2RhbCh0aGlzLmFwcCwgdGhpcy5wbHVnaW4pLm9wZW4oKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIFxuXG4gICAgcmVuZGVyQ2hhaW5TZWN0aW9uKHBhcmVudDogSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgY29uc3QgY2hhaW4gPSB0aGlzLnBsdWdpbi5lbmdpbmUuZ2V0QWN0aXZlQ2hhaW4oKTtcbiAgICAgICAgXG4gICAgICAgIGlmICghY2hhaW4pIHtcbiAgICAgICAgICAgIHBhcmVudC5jcmVhdGVEaXYoeyB0ZXh0OiBcIk5vIGFjdGl2ZSBjaGFpbi5cIiwgY2xzOiBcInNpc3ktZW1wdHktc3RhdGVcIiB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgY2hhaW5EaXYgPSBwYXJlbnQuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktY2hhaW4tY29udGFpbmVyXCIgfSk7XG4gICAgICAgIGNoYWluRGl2LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiYm9yZGVyOiAxcHggc29saWQgIzRjYWY1MDsgcGFkZGluZzogMTJweDsgYm9yZGVyLXJhZGl1czogNHB4OyBiYWNrZ3JvdW5kOiByZ2JhKDc2LCAxNzUsIDgwLCAwLjA1KTsgbWFyZ2luLWJvdHRvbTogMTBweDtcIik7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBoZWFkZXIgPSBjaGFpbkRpdi5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogY2hhaW4ubmFtZSB9KTtcbiAgICAgICAgaGVhZGVyLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luOiAwIDAgMTBweCAwOyBjb2xvcjogIzRjYWY1MDtcIik7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBwcm9ncmVzcyA9IHRoaXMucGx1Z2luLmVuZ2luZS5nZXRDaGFpblByb2dyZXNzKCk7XG4gICAgICAgIGNvbnN0IHByb2dyZXNzVGV4dCA9IGNoYWluRGl2LmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IGBQcm9ncmVzczogJHtwcm9ncmVzcy5jb21wbGV0ZWR9LyR7cHJvZ3Jlc3MudG90YWx9YCB9KTtcbiAgICAgICAgcHJvZ3Jlc3NUZXh0LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luOiA1cHggMDsgZm9udC1zaXplOiAwLjllbTtcIik7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBiYXIgPSBjaGFpbkRpdi5jcmVhdGVEaXYoKTtcbiAgICAgICAgYmFyLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiaGVpZ2h0OiA2cHg7IGJhY2tncm91bmQ6IHJnYmEoMjU1LDI1NSwyNTUsMC4xKTsgYm9yZGVyLXJhZGl1czogM3B4OyBtYXJnaW46IDhweCAwOyBvdmVyZmxvdzogaGlkZGVuO1wiKTtcbiAgICAgICAgY29uc3QgZmlsbCA9IGJhci5jcmVhdGVEaXYoKTtcbiAgICAgICAgZmlsbC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBgd2lkdGg6ICR7cHJvZ3Jlc3MucGVyY2VudH0lOyBoZWlnaHQ6IDEwMCU7IGJhY2tncm91bmQ6ICM0Y2FmNTA7IHRyYW5zaXRpb246IHdpZHRoIDAuM3M7YCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBxdWVzdExpc3QgPSBjaGFpbkRpdi5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1jaGFpbi1xdWVzdHNcIiB9KTtcbiAgICAgICAgcXVlc3RMaXN0LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luOiAxMHB4IDA7IGZvbnQtc2l6ZTogMC44NWVtO1wiKTtcbiAgICAgICAgXG4gICAgICAgIGNoYWluLnF1ZXN0cy5mb3JFYWNoKChxdWVzdCwgaWR4KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpdGVtID0gcXVlc3RMaXN0LmNyZWF0ZUVsKFwicFwiKTtcbiAgICAgICAgICAgIGNvbnN0IGljb24gPSBpZHggPCBwcm9ncmVzcy5jb21wbGV0ZWQgPyBcIk9LXCIgOiBpZHggPT09IHByb2dyZXNzLmNvbXBsZXRlZCA/IFwiPj4+XCIgOiBcIkxPQ0tcIjtcbiAgICAgICAgICAgIGNvbnN0IHN0YXR1cyA9IGlkeCA8IHByb2dyZXNzLmNvbXBsZXRlZCA/IFwiRE9ORVwiIDogaWR4ID09PSBwcm9ncmVzcy5jb21wbGV0ZWQgPyBcIkFDVElWRVwiIDogXCJMT0NLRURcIjtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaXRlbS5zZXRUZXh0KGBbJHtpY29ufV0gJHtxdWVzdH0gKCR7c3RhdHVzfSlgKTtcbiAgICAgICAgICAgIGl0ZW0uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgYG1hcmdpbjogM3B4IDA7IHBhZGRpbmc6IDNweDsgXG4gICAgICAgICAgICAgICAgJHtpZHggPCBwcm9ncmVzcy5jb21wbGV0ZWQgPyBcIm9wYWNpdHk6IDAuNjtcIiA6IGlkeCA9PT0gcHJvZ3Jlc3MuY29tcGxldGVkID8gXCJmb250LXdlaWdodDogYm9sZDsgY29sb3I6ICM0Y2FmNTA7XCIgOiBcIm9wYWNpdHk6IDAuNDtcIn1gKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBhY3Rpb25zID0gY2hhaW5EaXYuY3JlYXRlRGl2KCk7XG4gICAgICAgIGFjdGlvbnMuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJkaXNwbGF5OiBmbGV4OyBnYXA6IDVweDsgbWFyZ2luLXRvcDogMTBweDtcIik7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBicmVha0J0biA9IGFjdGlvbnMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkJSRUFLIENIQUlOXCIgfSk7XG4gICAgICAgIGJyZWFrQnRuLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZmxleDogMTsgcGFkZGluZzogNnB4OyBiYWNrZ3JvdW5kOiByZ2JhKDI1NSwgODUsIDg1LCAwLjIpOyBib3JkZXI6IDFweCBzb2xpZCAjZmY1NTU1OyBjb2xvcjogI2ZmNTU1NTsgYm9yZGVyLXJhZGl1czogM3B4OyBjdXJzb3I6IHBvaW50ZXI7IGZvbnQtc2l6ZTogMC44ZW07XCIpO1xuICAgICAgICBicmVha0J0bi5vbmNsaWNrID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uZW5naW5lLmJyZWFrQ2hhaW4oKTtcbiAgICAgICAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgICAgICB9O1xuICAgIH1cblxuXG4gICAgcmVuZGVyRmlsdGVyQmFyKHBhcmVudDogSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgY29uc3QgZmlsdGVycyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmZpbHRlclN0YXRlO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgZmlsdGVyRGl2ID0gcGFyZW50LmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWZpbHRlci1iYXJcIiB9KTtcbiAgICAgICAgZmlsdGVyRGl2LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiYm9yZGVyOiAxcHggc29saWQgIzAwODhmZjsgcGFkZGluZzogMTBweDsgYm9yZGVyLXJhZGl1czogNHB4OyBiYWNrZ3JvdW5kOiByZ2JhKDAsIDEzNiwgMjU1LCAwLjA1KTsgbWFyZ2luLWJvdHRvbTogMTVweDtcIik7XG4gICAgICAgIFxuICAgICAgICAvLyBFbmVyZ3kgZmlsdGVyXG4gICAgICAgIGNvbnN0IGVuZXJneURpdiA9IGZpbHRlckRpdi5jcmVhdGVEaXYoKTtcbiAgICAgICAgZW5lcmd5RGl2LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luLWJvdHRvbTogOHB4O1wiKTtcbiAgICAgICAgZW5lcmd5RGl2LmNyZWF0ZUVsKFwic3BhblwiLCB7IHRleHQ6IFwiRW5lcmd5OiBcIiB9KS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImZvbnQtd2VpZ2h0OiBib2xkO1wiKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGVuZXJneU9wdGlvbnMgPSBbXCJhbnlcIiwgXCJoaWdoXCIsIFwibWVkaXVtXCIsIFwibG93XCJdO1xuICAgICAgICBlbmVyZ3lPcHRpb25zLmZvckVhY2gob3B0ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGJ0biA9IGVuZXJneURpdi5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IG9wdC50b1VwcGVyQ2FzZSgpIH0pO1xuICAgICAgICAgICAgYnRuLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIGBtYXJnaW46IDAgM3B4OyBwYWRkaW5nOiA0cHggOHB4OyBib3JkZXItcmFkaXVzOiAzcHg7IGN1cnNvcjogcG9pbnRlcjsgXG4gICAgICAgICAgICAgICAgJHtmaWx0ZXJzLmFjdGl2ZUVuZXJneSA9PT0gb3B0ID8gXCJiYWNrZ3JvdW5kOiAjMDA4OGZmOyBjb2xvcjogd2hpdGU7XCIgOiBcImJhY2tncm91bmQ6IHJnYmEoMCwgMTM2LCAyNTUsIDAuMik7XCJ9YCk7XG4gICAgICAgICAgICBidG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5lbmdpbmUuc2V0RmlsdGVyU3RhdGUob3B0IGFzIGFueSwgZmlsdGVycy5hY3RpdmVDb250ZXh0LCBmaWx0ZXJzLmFjdGl2ZVRhZ3MpO1xuICAgICAgICAgICAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDb250ZXh0IGZpbHRlclxuICAgICAgICBjb25zdCBjb250ZXh0RGl2ID0gZmlsdGVyRGl2LmNyZWF0ZURpdigpO1xuICAgICAgICBjb250ZXh0RGl2LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luLWJvdHRvbTogOHB4O1wiKTtcbiAgICAgICAgY29udGV4dERpdi5jcmVhdGVFbChcInNwYW5cIiwgeyB0ZXh0OiBcIkNvbnRleHQ6IFwiIH0pLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZm9udC13ZWlnaHQ6IGJvbGQ7XCIpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgY29udGV4dE9wdGlvbnMgPSBbXCJhbnlcIiwgXCJob21lXCIsIFwib2ZmaWNlXCIsIFwiYW55d2hlcmVcIl07XG4gICAgICAgIGNvbnRleHRPcHRpb25zLmZvckVhY2gob3B0ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGJ0biA9IGNvbnRleHREaXYuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBvcHQudG9VcHBlckNhc2UoKSB9KTtcbiAgICAgICAgICAgIGJ0bi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBgbWFyZ2luOiAwIDNweDsgcGFkZGluZzogNHB4IDhweDsgYm9yZGVyLXJhZGl1czogM3B4OyBjdXJzb3I6IHBvaW50ZXI7IFxuICAgICAgICAgICAgICAgICR7ZmlsdGVycy5hY3RpdmVDb250ZXh0ID09PSBvcHQgPyBcImJhY2tncm91bmQ6ICMwMDg4ZmY7IGNvbG9yOiB3aGl0ZTtcIiA6IFwiYmFja2dyb3VuZDogcmdiYSgwLCAxMzYsIDI1NSwgMC4yKTtcIn1gKTtcbiAgICAgICAgICAgIGJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLmVuZ2luZS5zZXRGaWx0ZXJTdGF0ZShmaWx0ZXJzLmFjdGl2ZUVuZXJneSwgb3B0IGFzIGFueSwgZmlsdGVycy5hY3RpdmVUYWdzKTtcbiAgICAgICAgICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYXIgYnV0dG9uXG4gICAgICAgIGNvbnN0IGNsZWFyQnRuID0gZmlsdGVyRGl2LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJDTEVBUiBGSUxURVJTXCIgfSk7XG4gICAgICAgIGNsZWFyQnRuLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwid2lkdGg6IDEwMCU7IHBhZGRpbmc6IDZweDsgbWFyZ2luLXRvcDogOHB4OyBiYWNrZ3JvdW5kOiByZ2JhKDI1NSwgODUsIDg1LCAwLjIpOyBib3JkZXI6IDFweCBzb2xpZCAjZmY1NTU1OyBjb2xvcjogI2ZmNTU1NTsgYm9yZGVyLXJhZGl1czogM3B4OyBjdXJzb3I6IHBvaW50ZXI7IGZvbnQtd2VpZ2h0OiBib2xkO1wiKTtcbiAgICAgICAgY2xlYXJCdG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLmVuZ2luZS5jbGVhckZpbHRlcnMoKTtcbiAgICAgICAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgICAgICB9O1xuICAgIH1cblxuXG4gICAgcmVuZGVyQW5hbHl0aWNzKHBhcmVudDogSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgY29uc3Qgc3RhdHMgPSB0aGlzLnBsdWdpbi5lbmdpbmUuZ2V0R2FtZVN0YXRzKCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBhbmFseXRpY3NEaXYgPSBwYXJlbnQuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktYW5hbHl0aWNzXCIgfSk7XG4gICAgICAgIGFuYWx5dGljc0Rpdi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImJvcmRlcjogMXB4IHNvbGlkICNmZmMxMDc7IHBhZGRpbmc6IDEycHg7IGJvcmRlci1yYWRpdXM6IDRweDsgYmFja2dyb3VuZDogcmdiYSgyNTUsIDE5MywgNywgMC4wNSk7IG1hcmdpbi1ib3R0b206IDE1cHg7XCIpO1xuICAgICAgICBcbiAgICAgICAgYW5hbHl0aWNzRGl2LmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIkFOQUxZVElDUyAmIFBST0dSRVNTXCIgfSkuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJtYXJnaW46IDAgMCAxMHB4IDA7IGNvbG9yOiAjZmZjMTA3O1wiKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFN0YXRzIGdyaWRcbiAgICAgICAgY29uc3Qgc3RhdHNEaXYgPSBhbmFseXRpY3NEaXYuY3JlYXRlRGl2KCk7XG4gICAgICAgIHN0YXRzRGl2LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZGlzcGxheTogZ3JpZDsgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiAxZnIgMWZyOyBnYXA6IDEwcHg7IG1hcmdpbi1ib3R0b206IDEwcHg7XCIpO1xuICAgICAgICBcbiAgICAgICAgY29uc3Qgc3RhdHNfaXRlbXMgPSBbXG4gICAgICAgICAgICB7IGxhYmVsOiBcIkxldmVsXCIsIHZhbHVlOiBzdGF0cy5sZXZlbCB9LFxuICAgICAgICAgICAgeyBsYWJlbDogXCJDdXJyZW50IFN0cmVha1wiLCB2YWx1ZTogc3RhdHMuY3VycmVudFN0cmVhayB9LFxuICAgICAgICAgICAgeyBsYWJlbDogXCJMb25nZXN0IFN0cmVha1wiLCB2YWx1ZTogc3RhdHMubG9uZ2VzdFN0cmVhayB9LFxuICAgICAgICAgICAgeyBsYWJlbDogXCJUb3RhbCBRdWVzdHNcIiwgdmFsdWU6IHN0YXRzLnRvdGFsUXVlc3RzIH1cbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIHN0YXRzX2l0ZW1zLmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgICBjb25zdCBzdGF0Qm94ID0gc3RhdHNEaXYuY3JlYXRlRGl2KCk7XG4gICAgICAgICAgICBzdGF0Qm94LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiYm9yZGVyOiAxcHggc29saWQgI2ZmYzEwNzsgcGFkZGluZzogOHB4OyBib3JkZXItcmFkaXVzOiAzcHg7IGJhY2tncm91bmQ6IHJnYmEoMjU1LCAxOTMsIDcsIDAuMSk7XCIpO1xuICAgICAgICAgICAgc3RhdEJveC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBpdGVtLmxhYmVsIH0pLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luOiAwOyBmb250LXNpemU6IDAuOGVtOyBvcGFjaXR5OiAwLjc7XCIpO1xuICAgICAgICAgICAgc3RhdEJveC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBTdHJpbmcoaXRlbS52YWx1ZSkgfSkuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJtYXJnaW46IDVweCAwIDAgMDsgZm9udC1zaXplOiAxLjJlbTsgZm9udC13ZWlnaHQ6IGJvbGQ7IGNvbG9yOiAjZmZjMTA3O1wiKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBCb3NzIHByb2dyZXNzXG4gICAgICAgIGFuYWx5dGljc0Rpdi5jcmVhdGVFbChcImg0XCIsIHsgdGV4dDogXCJCb3NzIE1pbGVzdG9uZXNcIiB9KS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbjogMTJweCAwIDhweCAwOyBjb2xvcjogI2ZmYzEwNztcIik7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBib3NzZXMgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ib3NzTWlsZXN0b25lcztcbiAgICAgICAgaWYgKGJvc3NlcyAmJiBib3NzZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgYm9zc2VzLmZvckVhY2goKGJvc3M6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGJvc3NJdGVtID0gYW5hbHl0aWNzRGl2LmNyZWF0ZURpdigpO1xuICAgICAgICAgICAgICAgIGJvc3NJdGVtLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luOiA2cHggMDsgcGFkZGluZzogOHB4OyBiYWNrZ3JvdW5kOiByZ2JhKDAsIDAsIDAsIDAuMik7IGJvcmRlci1yYWRpdXM6IDNweDtcIik7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgaWNvbiA9IGJvc3MuZGVmZWF0ZWQgPyBcIk9LXCIgOiBib3NzLnVubG9ja2VkID8gXCI+PlwiIDogXCJMT0NLXCI7XG4gICAgICAgICAgICAgICAgY29uc3QgbmFtZSA9IGJvc3NJdGVtLmNyZWF0ZUVsKFwic3BhblwiLCB7IHRleHQ6IGBbJHtpY29ufV0gTGV2ZWwgJHtib3NzLmxldmVsfTogJHtib3NzLm5hbWV9YCB9KTtcbiAgICAgICAgICAgICAgICBuYW1lLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIGJvc3MuZGVmZWF0ZWQgPyBcImNvbG9yOiAjNGNhZjUwOyBmb250LXdlaWdodDogYm9sZDtcIiA6IGJvc3MudW5sb2NrZWQgPyBcImNvbG9yOiAjZmZjMTA3O1wiIDogXCJvcGFjaXR5OiAwLjU7XCIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFdpbiBjb25kaXRpb25cbiAgICAgICAgaWYgKHN0YXRzLmdhbWVXb24pIHtcbiAgICAgICAgICAgIGNvbnN0IHdpbkRpdiA9IGFuYWx5dGljc0Rpdi5jcmVhdGVEaXYoKTtcbiAgICAgICAgICAgIHdpbkRpdi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbi10b3A6IDEycHg7IHBhZGRpbmc6IDEycHg7IGJhY2tncm91bmQ6IHJnYmEoNzYsIDE3NSwgODAsIDAuMik7IGJvcmRlcjogMnB4IHNvbGlkICM0Y2FmNTA7IGJvcmRlci1yYWRpdXM6IDRweDsgdGV4dC1hbGlnbjogY2VudGVyO1wiKTtcbiAgICAgICAgICAgIHdpbkRpdi5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBcIkdBTUUgV09OIVwiIH0pLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luOiAwOyBmb250LXNpemU6IDEuMmVtOyBmb250LXdlaWdodDogYm9sZDsgY29sb3I6ICM0Y2FmNTA7XCIpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHN0YXQocDogSFRNTEVsZW1lbnQsIGxhYmVsOiBzdHJpbmcsIHZhbDogc3RyaW5nLCBjbHM6IHN0cmluZyA9IFwiXCIpIHtcbiAgICAgICAgY29uc3QgYiA9IHAuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktc3RhdC1ib3hcIiB9KTsgXG4gICAgICAgIGlmIChjbHMpIGIuYWRkQ2xhc3MoY2xzKTtcbiAgICAgICAgYi5jcmVhdGVEaXYoeyB0ZXh0OiBsYWJlbCwgY2xzOiBcInNpc3ktc3RhdC1sYWJlbFwiIH0pO1xuICAgICAgICBiLmNyZWF0ZURpdih7IHRleHQ6IHZhbCwgY2xzOiBcInNpc3ktc3RhdC12YWxcIiB9KTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBOb3RpY2UsIFBsdWdpbiwgVEZpbGUsIFdvcmtzcGFjZUxlYWYgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgeyBTaXN5cGh1c1NldHRpbmdzLCBTa2lsbCwgTW9kaWZpZXIsIERhaWx5TWlzc2lvbiB9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHsgU2lzeXBodXNFbmdpbmUsIERFRkFVTFRfTU9ESUZJRVIgfSBmcm9tICcuL2VuZ2luZSc7XG5pbXBvcnQgeyBBdWRpb0NvbnRyb2xsZXIgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IFJlc2VhcmNoUXVlc3RNb2RhbCwgQ2hhaW5CdWlsZGVyTW9kYWwsIFJlc2VhcmNoTGlzdE1vZGFsIH0gZnJvbSBcIi4vdWkvbW9kYWxzXCI7XG5pbXBvcnQgeyBQYW5vcHRpY29uVmlldywgVklFV19UWVBFX1BBTk9QVElDT04gfSBmcm9tIFwiLi91aS92aWV3XCI7XG5cbmNvbnN0IERFRkFVTFRfU0VUVElOR1M6IFNpc3lwaHVzU2V0dGluZ3MgPSB7XG4gICAgaHA6IDEwMCwgbWF4SHA6IDEwMCwgeHA6IDAsIGdvbGQ6IDAsIHhwUmVxOiAxMDAsIGxldmVsOiAxLCByaXZhbERtZzogMTAsXG4gICAgbGFzdExvZ2luOiBcIlwiLCBzaGllbGRlZFVudGlsOiBcIlwiLCByZXN0RGF5VW50aWw6IFwiXCIsIHNraWxsczogW10sXG4gICAgZGFpbHlNb2RpZmllcjogREVGQVVMVF9NT0RJRklFUiwgXG4gICAgbGVnYWN5OiB7IHNvdWxzOiAwLCBwZXJrczogeyBzdGFydEdvbGQ6IDAsIHN0YXJ0U2tpbGxQb2ludHM6IDAsIHJpdmFsRGVsYXk6IDAgfSwgcmVsaWNzOiBbXSwgZGVhdGhDb3VudDogMCB9LCBcbiAgICBtdXRlZDogZmFsc2UsIGhpc3Rvcnk6IFtdLCBydW5Db3VudDogMSwgbG9ja2Rvd25VbnRpbDogXCJcIiwgZGFtYWdlVGFrZW5Ub2RheTogMCxcbiAgICBkYWlseU1pc3Npb25zOiBbXSwgXG4gICAgZGFpbHlNaXNzaW9uRGF0ZTogXCJcIiwgXG4gICAgcXVlc3RzQ29tcGxldGVkVG9kYXk6IDAsIFxuICAgIHNraWxsVXNlc1RvZGF5OiB7fSxcbiAgICByZXNlYXJjaFF1ZXN0czogW10sXG4gICAgcmVzZWFyY2hTdGF0czogeyB0b3RhbFJlc2VhcmNoOiAwLCB0b3RhbENvbWJhdDogMCwgcmVzZWFyY2hDb21wbGV0ZWQ6IDAsIGNvbWJhdENvbXBsZXRlZDogMCB9LFxuICAgIGxhc3RSZXNlYXJjaFF1ZXN0SWQ6IDAsXG4gICAgbWVkaXRhdGlvbkN5Y2xlc0NvbXBsZXRlZDogMCxcbiAgICBxdWVzdERlbGV0aW9uc1RvZGF5OiAwLFxuICAgIGxhc3REZWxldGlvblJlc2V0OiBcIlwiLFxuICAgIGlzTWVkaXRhdGluZzogZmFsc2UsXG4gICAgbWVkaXRhdGlvbkNsaWNrc1RoaXNMb2NrZG93bjogMCxcbiAgICBhY3RpdmVDaGFpbnM6IFtdLFxuICAgIGNoYWluSGlzdG9yeTogW10sXG4gICAgY3VycmVudENoYWluSWQ6IFwiXCIsXG4gICAgY2hhaW5RdWVzdHNDb21wbGV0ZWQ6IDAsXG4gICAgcXVlc3RGaWx0ZXJzOiB7fSxcbiAgICBmaWx0ZXJTdGF0ZTogeyBhY3RpdmVFbmVyZ3k6IFwiYW55XCIsIGFjdGl2ZUNvbnRleHQ6IFwiYW55XCIsIGFjdGl2ZVRhZ3M6IFtdIH0sXG4gICAgZGF5TWV0cmljczogW10sXG4gICAgd2Vla2x5UmVwb3J0czogW10sXG4gICAgYm9zc01pbGVzdG9uZXM6IFtdLFxuICAgIHN0cmVhazogeyBjdXJyZW50OiAwLCBsb25nZXN0OiAwLCBsYXN0RGF0ZTogXCJcIiB9LFxuICAgIGFjaGlldmVtZW50czogW10sXG4gICAgZ2FtZVdvbjogZmFsc2Vcbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU2lzeXBodXNQbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xuICAgIHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzO1xuICAgIHN0YXR1c0Jhckl0ZW06IEhUTUxFbGVtZW50O1xuICAgIGVuZ2luZTogU2lzeXBodXNFbmdpbmU7XG4gICAgYXVkaW86IEF1ZGlvQ29udHJvbGxlcjtcblxuICAgIGFzeW5jIG9ubG9hZCgpIHtcbiAgICAgICAgYXdhaXQgdGhpcy5sb2FkU2V0dGluZ3MoKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMubG9hZFN0eWxlcygpO1xuICAgICAgICB0aGlzLmF1ZGlvID0gbmV3IEF1ZGlvQ29udHJvbGxlcih0aGlzLnNldHRpbmdzLm11dGVkKTtcbiAgICAgICAgdGhpcy5lbmdpbmUgPSBuZXcgU2lzeXBodXNFbmdpbmUodGhpcy5hcHAsIHRoaXMsIHRoaXMuYXVkaW8pO1xuXG4gICAgICAgIHRoaXMucmVnaXN0ZXJWaWV3KFZJRVdfVFlQRV9QQU5PUFRJQ09OLCAobGVhZikgPT4gbmV3IFBhbm9wdGljb25WaWV3KGxlYWYsIHRoaXMpKTtcblxuICAgICAgICB0aGlzLnN0YXR1c0Jhckl0ZW0gPSB0aGlzLmFkZFN0YXR1c0Jhckl0ZW0oKTtcbiAgICAgICAgYXdhaXQgdGhpcy5lbmdpbmUuY2hlY2tEYWlseUxvZ2luKCk7XG4gICAgICAgIHRoaXMudXBkYXRlU3RhdHVzQmFyKCk7XG5cbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHsgaWQ6ICdvcGVuLXBhbm9wdGljb24nLCBuYW1lOiAnT3BlbiBQYW5vcHRpY29uIChTaWRlYmFyKScsIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmFjdGl2YXRlVmlldygpIH0pO1xuICAgICAgICB0aGlzLmFkZENvbW1hbmQoeyBpZDogJ3RvZ2dsZS1mb2N1cycsIG5hbWU6ICdUb2dnbGUgRm9jdXMgTm9pc2UnLCBjYWxsYmFjazogKCkgPT4gdGhpcy5hdWRpby50b2dnbGVCcm93bk5vaXNlKCkgfSk7XG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7IGlkOiAncmVyb2xsLWNoYW9zJywgbmFtZTogJ1Jlcm9sbCBDaGFvcycsIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmVuZ2luZS5yb2xsQ2hhb3ModHJ1ZSkgfSk7XG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7IGlkOiAnYWNjZXB0LWRlYXRoJywgbmFtZTogJ0FDQ0VQVCBERUFUSCcsIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmVuZ2luZS50cmlnZ2VyRGVhdGgoKSB9KTtcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHsgaWQ6ICdyZWNvdmVyJywgbmFtZTogJ1JlY292ZXIgKExvY2tkb3duKScsIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmVuZ2luZS5hdHRlbXB0UmVjb3ZlcnkoKSB9KTtcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgICAgIGlkOiAnY3JlYXRlLXJlc2VhcmNoJyxcbiAgICAgICAgICAgIG5hbWU6ICdSZXNlYXJjaDogQ3JlYXRlIFJlc2VhcmNoIFF1ZXN0JyxcbiAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiBuZXcgUmVzZWFyY2hRdWVzdE1vZGFsKHRoaXMuYXBwLCB0aGlzKS5vcGVuKClcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgICAgIGlkOiAndmlldy1yZXNlYXJjaCcsXG4gICAgICAgICAgICBuYW1lOiAnUmVzZWFyY2g6IFZpZXcgUmVzZWFyY2ggTGlicmFyeScsXG4gICAgICAgICAgICBjYWxsYmFjazogKCkgPT4gbmV3IFJlc2VhcmNoTGlzdE1vZGFsKHRoaXMuYXBwLCB0aGlzKS5vcGVuKClcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgICAgIGlkOiAnbWVkaXRhdGUnLFxuICAgICAgICAgICAgbmFtZTogJ01lZGl0YXRpb246IFN0YXJ0IE1lZGl0YXRpb24nLFxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuZW5naW5lLnN0YXJ0TWVkaXRhdGlvbigpXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgICAgICBpZDogJ2NyZWF0ZS1jaGFpbicsXG4gICAgICAgICAgICBuYW1lOiAnQ2hhaW5zOiBDcmVhdGUgUXVlc3QgQ2hhaW4nLFxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBuZXcgQ2hhaW5CdWlsZGVyTW9kYWwodGhpcy5hcHAsIHRoaXMpLm9wZW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgICAgIGlkOiAndmlldy1jaGFpbnMnLFxuICAgICAgICAgICAgbmFtZTogJ0NoYWluczogVmlldyBBY3RpdmUgQ2hhaW4nLFxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBjaGFpbiA9IHRoaXMuZW5naW5lLmdldEFjdGl2ZUNoYWluKCk7XG4gICAgICAgICAgICAgICAgaWYgKGNoYWluKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoYEFjdGl2ZSBDaGFpbjogJHtjaGFpbi5uYW1lfSAoJHt0aGlzLmVuZ2luZS5nZXRDaGFpblByb2dyZXNzKCkuY29tcGxldGVkfS8ke2NoYWluLnF1ZXN0cy5sZW5ndGh9KWApO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoXCJObyBhY3RpdmUgY2hhaW5cIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICAgICAgaWQ6ICdmaWx0ZXItaGlnaC1lbmVyZ3knLFxuICAgICAgICAgICAgbmFtZTogJ0ZpbHRlcnM6IFNob3cgSGlnaCBFbmVyZ3kgUXVlc3RzJyxcbiAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmVuZ2luZS5zZXRGaWx0ZXJTdGF0ZShcImhpZ2hcIiwgXCJhbnlcIiwgW10pXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgICAgICBpZDogJ2ZpbHRlci1tZWRpdW0tZW5lcmd5JyxcbiAgICAgICAgICAgIG5hbWU6ICdGaWx0ZXJzOiBTaG93IE1lZGl1bSBFbmVyZ3kgUXVlc3RzJyxcbiAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmVuZ2luZS5zZXRGaWx0ZXJTdGF0ZShcIm1lZGl1bVwiLCBcImFueVwiLCBbXSlcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgICAgIGlkOiAnZmlsdGVyLWxvdy1lbmVyZ3knLFxuICAgICAgICAgICAgbmFtZTogJ0ZpbHRlcnM6IFNob3cgTG93IEVuZXJneSBRdWVzdHMnLFxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuZW5naW5lLnNldEZpbHRlclN0YXRlKFwibG93XCIsIFwiYW55XCIsIFtdKVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICAgICAgaWQ6ICdjbGVhci1maWx0ZXJzJyxcbiAgICAgICAgICAgIG5hbWU6ICdGaWx0ZXJzOiBDbGVhciBBbGwgRmlsdGVycycsXG4gICAgICAgICAgICBjYWxsYmFjazogKCkgPT4gdGhpcy5lbmdpbmUuY2xlYXJGaWx0ZXJzKClcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgICAgIGlkOiAnd2Vla2x5LXJlcG9ydCcsXG4gICAgICAgICAgICBuYW1lOiAnQW5hbHl0aWNzOiBHZW5lcmF0ZSBXZWVrbHkgUmVwb3J0JyxcbiAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVwb3J0ID0gdGhpcy5lbmdpbmUuZ2VuZXJhdGVXZWVrbHlSZXBvcnQoKTtcbiAgICAgICAgICAgICAgICBuZXcgTm90aWNlKGBXZWVrICR7cmVwb3J0LndlZWt9OiAke3JlcG9ydC50b3RhbFF1ZXN0c30gcXVlc3RzLCAke3JlcG9ydC5zdWNjZXNzUmF0ZX0lIHN1Y2Nlc3NgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgICAgIGlkOiAnZ2FtZS1zdGF0cycsXG4gICAgICAgICAgICBuYW1lOiAnQW5hbHl0aWNzOiBWaWV3IEdhbWUgU3RhdHMnLFxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBzdGF0cyA9IHRoaXMuZW5naW5lLmdldEdhbWVTdGF0cygpO1xuICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoYExldmVsOiAke3N0YXRzLmxldmVsfSB8IFN0cmVhazogJHtzdGF0cy5jdXJyZW50U3RyZWFrfSB8IFF1ZXN0czogJHtzdGF0cy50b3RhbFF1ZXN0c31gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgICAgIGlkOiAnY2hlY2stYm9zc2VzJyxcbiAgICAgICAgICAgIG5hbWU6ICdFbmRnYW1lOiBDaGVjayBCb3NzIE1pbGVzdG9uZXMnLFxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuZW5naW5lLmNoZWNrQm9zc01pbGVzdG9uZXMoKVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmFkZFJpYmJvbkljb24oJ3NrdWxsJywgJ1Npc3lwaHVzIFNpZGViYXInLCAoKSA9PiB0aGlzLmFjdGl2YXRlVmlldygpKTtcbiAgICAgICAgdGhpcy5yZWdpc3RlckludGVydmFsKHdpbmRvdy5zZXRJbnRlcnZhbCgoKSA9PiB0aGlzLmVuZ2luZS5jaGVja0RlYWRsaW5lcygpLCA2MDAwMCkpO1xuICAgIH1cblxuICAgIGFzeW5jIGxvYWRTdHlsZXMoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBjc3NGaWxlID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHRoaXMubWFuaWZlc3QuZGlyICsgXCIvc3R5bGVzLmNzc1wiKTtcbiAgICAgICAgICAgIGlmIChjc3NGaWxlIGluc3RhbmNlb2YgVEZpbGUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjc3MgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5yZWFkKGNzc0ZpbGUpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInN0eWxlXCIpO1xuICAgICAgICAgICAgICAgIHN0eWxlLmlkID0gXCJzaXN5cGh1cy1zdHlsZXNcIjtcbiAgICAgICAgICAgICAgICBzdHlsZS5pbm5lckhUTUwgPSBjc3M7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChzdHlsZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHsgY29uc29sZS5lcnJvcihcIkNvdWxkIG5vdCBsb2FkIHN0eWxlcy5jc3NcIiwgZSk7IH1cbiAgICB9XG5cbiAgICBhc3luYyBvbnVubG9hZCgpIHtcbiAgICAgICAgdGhpcy5hcHAud29ya3NwYWNlLmRldGFjaExlYXZlc09mVHlwZShWSUVXX1RZUEVfUEFOT1BUSUNPTik7XG4gICAgICAgIGlmKHRoaXMuYXVkaW8uYXVkaW9DdHgpIHRoaXMuYXVkaW8uYXVkaW9DdHguY2xvc2UoKTtcbiAgICAgICAgY29uc3Qgc3R5bGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInNpc3lwaHVzLXN0eWxlc1wiKTtcbiAgICAgICAgaWYgKHN0eWxlKSBzdHlsZS5yZW1vdmUoKTtcbiAgICB9XG5cbiAgICBhc3luYyBhY3RpdmF0ZVZpZXcoKSB7XG4gICAgICAgIGNvbnN0IHsgd29ya3NwYWNlIH0gPSB0aGlzLmFwcDtcbiAgICAgICAgbGV0IGxlYWY6IFdvcmtzcGFjZUxlYWYgfCBudWxsID0gbnVsbDtcbiAgICAgICAgY29uc3QgbGVhdmVzID0gd29ya3NwYWNlLmdldExlYXZlc09mVHlwZShWSUVXX1RZUEVfUEFOT1BUSUNPTik7XG4gICAgICAgIGlmIChsZWF2ZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgbGVhZiA9IGxlYXZlc1swXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxlYWYgPSB3b3Jrc3BhY2UuZ2V0UmlnaHRMZWFmKGZhbHNlKTtcbiAgICAgICAgICAgIGF3YWl0IGxlYWYuc2V0Vmlld1N0YXRlKHsgdHlwZTogVklFV19UWVBFX1BBTk9QVElDT04sIGFjdGl2ZTogdHJ1ZSB9KTtcbiAgICAgICAgfVxuICAgICAgICB3b3Jrc3BhY2UucmV2ZWFsTGVhZihsZWFmKTtcbiAgICB9XG5cbiAgICByZWZyZXNoVUkoKSB7XG4gICAgICAgIHRoaXMudXBkYXRlU3RhdHVzQmFyKCk7XG4gICAgICAgIGNvbnN0IGxlYXZlcyA9IHRoaXMuYXBwLndvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoVklFV19UWVBFX1BBTk9QVElDT04pO1xuICAgICAgICBpZiAobGVhdmVzLmxlbmd0aCA+IDApIChsZWF2ZXNbMF0udmlldyBhcyBQYW5vcHRpY29uVmlldykucmVmcmVzaCgpO1xuICAgIH1cblxuICAgIHVwZGF0ZVN0YXR1c0JhcigpIHtcbiAgICAgICAgbGV0IHNoaWVsZCA9ICh0aGlzLmVuZ2luZS5pc1NoaWVsZGVkKCkgfHwgdGhpcy5lbmdpbmUuaXNSZXN0aW5nKCkpID8gKHRoaXMuZW5naW5lLmlzUmVzdGluZygpID8gXCJEXCIgOiBcIlNcIikgOiBcIlwiO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgY29tcGxldGVkTWlzc2lvbnMgPSB0aGlzLnNldHRpbmdzLmRhaWx5TWlzc2lvbnMuZmlsdGVyKG0gPT4gbS5jb21wbGV0ZWQpLmxlbmd0aDtcbiAgICAgICAgY29uc3QgdG90YWxNaXNzaW9ucyA9IHRoaXMuc2V0dGluZ3MuZGFpbHlNaXNzaW9ucy5sZW5ndGg7XG4gICAgICAgIGNvbnN0IG1pc3Npb25Qcm9ncmVzcyA9IHRvdGFsTWlzc2lvbnMgPiAwID8gYE0ke2NvbXBsZXRlZE1pc3Npb25zfS8ke3RvdGFsTWlzc2lvbnN9YCA6IFwiXCI7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBzdGF0dXNUZXh0ID0gYCR7dGhpcy5zZXR0aW5ncy5kYWlseU1vZGlmaWVyLmljb259ICR7c2hpZWxkfSBIUCR7dGhpcy5zZXR0aW5ncy5ocH0vJHt0aGlzLnNldHRpbmdzLm1heEhwfSBHJHt0aGlzLnNldHRpbmdzLmdvbGR9IEx2bCR7dGhpcy5zZXR0aW5ncy5sZXZlbH0gJHttaXNzaW9uUHJvZ3Jlc3N9YDtcbiAgICAgICAgdGhpcy5zdGF0dXNCYXJJdGVtLnNldFRleHQoc3RhdHVzVGV4dCk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5ocCA8IDMwKSB0aGlzLnN0YXR1c0Jhckl0ZW0uc3R5bGUuY29sb3IgPSBcInJlZFwiOyBcbiAgICAgICAgZWxzZSBpZiAodGhpcy5zZXR0aW5ncy5nb2xkIDwgMCkgdGhpcy5zdGF0dXNCYXJJdGVtLnN0eWxlLmNvbG9yID0gXCJvcmFuZ2VcIjtcbiAgICAgICAgZWxzZSB0aGlzLnN0YXR1c0Jhckl0ZW0uc3R5bGUuY29sb3IgPSBcIlwiO1xuICAgIH1cbiAgICBcbiAgICBhc3luYyBsb2FkU2V0dGluZ3MoKSB7IFxuICAgICAgICB0aGlzLnNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgREVGQVVMVF9TRVRUSU5HUywgYXdhaXQgdGhpcy5sb2FkRGF0YSgpKTtcbiAgICAgICAgaWYgKCF0aGlzLnNldHRpbmdzLmxlZ2FjeSkgdGhpcy5zZXR0aW5ncy5sZWdhY3kgPSB7IHNvdWxzOiAwLCBwZXJrczogeyBzdGFydEdvbGQ6IDAsIHN0YXJ0U2tpbGxQb2ludHM6IDAsIHJpdmFsRGVsYXk6IDAgfSwgcmVsaWNzOiBbXSwgZGVhdGhDb3VudDogMCB9O1xuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5sZWdhY3kuZGVhdGhDb3VudCA9PT0gdW5kZWZpbmVkKSB0aGlzLnNldHRpbmdzLmxlZ2FjeS5kZWF0aENvdW50ID0gMDsgXG4gICAgICAgIGlmICghdGhpcy5zZXR0aW5ncy5oaXN0b3J5KSB0aGlzLnNldHRpbmdzLmhpc3RvcnkgPSBbXTtcbiAgICAgICAgXG4gICAgICAgIGlmICghdGhpcy5zZXR0aW5ncy5kYWlseU1pc3Npb25zKSB0aGlzLnNldHRpbmdzLmRhaWx5TWlzc2lvbnMgPSBbXTtcbiAgICAgICAgaWYgKCF0aGlzLnNldHRpbmdzLmRhaWx5TWlzc2lvbkRhdGUpIHRoaXMuc2V0dGluZ3MuZGFpbHlNaXNzaW9uRGF0ZSA9IFwiXCI7XG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLnF1ZXN0c0NvbXBsZXRlZFRvZGF5ID09PSB1bmRlZmluZWQpIHRoaXMuc2V0dGluZ3MucXVlc3RzQ29tcGxldGVkVG9kYXkgPSAwO1xuICAgICAgICBpZiAoIXRoaXMuc2V0dGluZ3Muc2tpbGxVc2VzVG9kYXkpIHRoaXMuc2V0dGluZ3Muc2tpbGxVc2VzVG9kYXkgPSB7fTtcbiAgICAgICAgaWYgKCF0aGlzLnNldHRpbmdzLnJlc2VhcmNoUXVlc3RzKSB0aGlzLnNldHRpbmdzLnJlc2VhcmNoUXVlc3RzID0gW107XG4gICAgICAgIGlmICghdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFN0YXRzKSB0aGlzLnNldHRpbmdzLnJlc2VhcmNoU3RhdHMgPSB7IFxuICAgICAgICAgICAgdG90YWxSZXNlYXJjaDogMCwgXG4gICAgICAgICAgICB0b3RhbENvbWJhdDogMCwgXG4gICAgICAgICAgICByZXNlYXJjaENvbXBsZXRlZDogMCwgXG4gICAgICAgICAgICBjb21iYXRDb21wbGV0ZWQ6IDAgXG4gICAgICAgIH07XG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmxhc3RSZXNlYXJjaFF1ZXN0SWQgPT09IHVuZGVmaW5lZCkgdGhpcy5zZXR0aW5ncy5sYXN0UmVzZWFyY2hRdWVzdElkID0gMDtcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MubWVkaXRhdGlvbkN5Y2xlc0NvbXBsZXRlZCA9PT0gdW5kZWZpbmVkKSB0aGlzLnNldHRpbmdzLm1lZGl0YXRpb25DeWNsZXNDb21wbGV0ZWQgPSAwO1xuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5xdWVzdERlbGV0aW9uc1RvZGF5ID09PSB1bmRlZmluZWQpIHRoaXMuc2V0dGluZ3MucXVlc3REZWxldGlvbnNUb2RheSA9IDA7XG4gICAgICAgIGlmICghdGhpcy5zZXR0aW5ncy5sYXN0RGVsZXRpb25SZXNldCkgdGhpcy5zZXR0aW5ncy5sYXN0RGVsZXRpb25SZXNldCA9IFwiXCI7XG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmlzTWVkaXRhdGluZyA9PT0gdW5kZWZpbmVkKSB0aGlzLnNldHRpbmdzLmlzTWVkaXRhdGluZyA9IGZhbHNlO1xuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5tZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3duID09PSB1bmRlZmluZWQpIHRoaXMuc2V0dGluZ3MubWVkaXRhdGlvbkNsaWNrc1RoaXNMb2NrZG93biA9IDA7XG4gICAgICAgIFxuICAgICAgICBpZiAoIXRoaXMuc2V0dGluZ3MuYWN0aXZlQ2hhaW5zKSB0aGlzLnNldHRpbmdzLmFjdGl2ZUNoYWlucyA9IFtdO1xuICAgICAgICBpZiAoIXRoaXMuc2V0dGluZ3MuY2hhaW5IaXN0b3J5KSB0aGlzLnNldHRpbmdzLmNoYWluSGlzdG9yeSA9IFtdO1xuICAgICAgICBpZiAoIXRoaXMuc2V0dGluZ3MuY3VycmVudENoYWluSWQpIHRoaXMuc2V0dGluZ3MuY3VycmVudENoYWluSWQgPSBcIlwiO1xuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5jaGFpblF1ZXN0c0NvbXBsZXRlZCA9PT0gdW5kZWZpbmVkKSB0aGlzLnNldHRpbmdzLmNoYWluUXVlc3RzQ29tcGxldGVkID0gMDtcbiAgICAgICAgXG4gICAgICAgIGlmICghdGhpcy5zZXR0aW5ncy5xdWVzdEZpbHRlcnMpIHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzID0ge307XG4gICAgICAgIGlmICghdGhpcy5zZXR0aW5ncy5maWx0ZXJTdGF0ZSkgdGhpcy5zZXR0aW5ncy5maWx0ZXJTdGF0ZSA9IHsgYWN0aXZlRW5lcmd5OiBcImFueVwiLCBhY3RpdmVDb250ZXh0OiBcImFueVwiLCBhY3RpdmVUYWdzOiBbXSB9O1xuICAgICAgICBcbiAgICAgICAgaWYgKCF0aGlzLnNldHRpbmdzLmRheU1ldHJpY3MpIHRoaXMuc2V0dGluZ3MuZGF5TWV0cmljcyA9IFtdO1xuICAgICAgICBpZiAoIXRoaXMuc2V0dGluZ3Mud2Vla2x5UmVwb3J0cykgdGhpcy5zZXR0aW5ncy53ZWVrbHlSZXBvcnRzID0gW107XG4gICAgICAgIGlmICghdGhpcy5zZXR0aW5ncy5ib3NzTWlsZXN0b25lcykgdGhpcy5zZXR0aW5ncy5ib3NzTWlsZXN0b25lcyA9IFtdO1xuICAgICAgICBpZiAoIXRoaXMuc2V0dGluZ3Muc3RyZWFrKSB0aGlzLnNldHRpbmdzLnN0cmVhayA9IHsgY3VycmVudDogMCwgbG9uZ2VzdDogMCwgbGFzdERhdGU6IFwiXCIgfTtcbiAgICAgICAgaWYgKCF0aGlzLnNldHRpbmdzLmFjaGlldmVtZW50cykgdGhpcy5zZXR0aW5ncy5hY2hpZXZlbWVudHMgPSBbXTtcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuZ2FtZVdvbiA9PT0gdW5kZWZpbmVkKSB0aGlzLnNldHRpbmdzLmdhbWVXb24gPSBmYWxzZTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0dGluZ3Muc2tpbGxzID0gdGhpcy5zZXR0aW5ncy5za2lsbHMubWFwKHMgPT4gKHtcbiAgICAgICAgICAgIC4uLnMsXG4gICAgICAgICAgICBydXN0OiAocyBhcyBhbnkpLnJ1c3QgfHwgMCxcbiAgICAgICAgICAgIGxhc3RVc2VkOiAocyBhcyBhbnkpLmxhc3RVc2VkIHx8IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgIGNvbm5lY3Rpb25zOiAocyBhcyBhbnkpLmNvbm5lY3Rpb25zIHx8IFtdXG4gICAgICAgIH0pKTtcbiAgICB9XG4gICAgYXN5bmMgc2F2ZVNldHRpbmdzKCkgeyBhd2FpdCB0aGlzLnNhdmVEYXRhKHRoaXMuc2V0dGluZ3MpOyB9XG59XG4iXSwibmFtZXMiOlsiTW9kYWwiLCJtb21lbnQiLCJOb3RpY2UiLCJTZXR0aW5nIiwiVEZvbGRlciIsIlRGaWxlIiwiSXRlbVZpZXciLCJQbHVnaW4iXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQWtHQTtBQUNPLFNBQVMsU0FBUyxDQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRTtBQUM3RCxJQUFJLFNBQVMsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLE9BQU8sS0FBSyxZQUFZLENBQUMsR0FBRyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsVUFBVSxPQUFPLEVBQUUsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRTtBQUNoSCxJQUFJLE9BQU8sS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLE9BQU8sQ0FBQyxFQUFFLFVBQVUsT0FBTyxFQUFFLE1BQU0sRUFBRTtBQUMvRCxRQUFRLFNBQVMsU0FBUyxDQUFDLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFL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QyxDQUFDLElBQUc7QUFDcEQsWUFBQSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQy9CLFlBQUEsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUM1QyxTQUFDLENBQUMsQ0FBQztBQUVILFFBQUEsSUFBSUEsZ0JBQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBQyxTQUFTLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFDLE1BQU0sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBQyxNQUFNLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFDLFNBQVMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFFLElBQUksQ0FBQyxVQUFVLEdBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUU5TyxRQUFBLE1BQU0sTUFBTSxHQUEyQixFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsQ0FBQztRQUMxRCxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNsRSxRQUFBLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxPQUFPLENBQUM7UUFFMUIsSUFBSUEsZ0JBQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxD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O2dCQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7YUFDN0Q7aUJBQU07Z0JBQ0gsUUFBTyxJQUFJO0FBQ1Asb0JBQUEsS0FBSyxDQUFDO0FBQUUsd0JBQUEsUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUM7d0JBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQzt3QkFBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO3dCQUFDLE1BQU07QUFDekcsb0JBQUEsS0FBSyxDQUFDO0FBQUUsd0JBQUEsUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUM7d0JBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQzt3QkFBQyxTQUFTLEdBQUcsTUFBTSxDQUFDO3dCQUFDLE1BQU07QUFDdEcsb0JBQUEsS0FBSyxDQUFDO0FBQUUsd0JBQUEsUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUM7d0JBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQzt3QkFBQyxTQUFTLEdBQUcsUUFBUSxDQUFDO3dCQUFDLE1BQU07QUFDeEcsb0JBQUEsS0FBSyxDQUFDO0FBQUUsd0JBQUEsUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUM7d0JBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQzt3QkFBQyxTQUFTLEdBQUcsTUFBTSxDQUFDO3dCQUFDLE1BQU07QUFDdEcsb0JBQUEsS0FBSyxDQUFDO0FBQUUsd0JBQUEsUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUM7d0JBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQzt3QkFBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO3dC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ZUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7QUFDN0IsUUFBQSxNQUFNLFNBQVMsR0FBR0EsZUFBTSxFQUFFLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUNoRSxRQUFBLE1BQU0sT0FBTyxHQUFHQSxlQUFNLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBRTVELFFBQUEsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBTSxLQUN2REEsZUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUNBLGVBQU0sQ0FBQyxTQUFTLENBQUMsRUFBRUEsZUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FDM0UsQ0FBQztRQUVGLE1BQU0sV0FBVyxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFXLEVBQUUsQ0FBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzVGLE1BQU0sV0FBVyxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFXLEVBQUUsQ0FBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3pGLFFBQUEsTUFBTSxXQUFXLEdBQUcsV0FBVyxHQUFHLFdBQVcsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLFdBQVcsSUFBSSxXQUFXLEdBQUcsV0FBVyxDQUFDLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3RILE1BQU0sT0FBTyxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFXLEVBQUUsQ0FBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FB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
